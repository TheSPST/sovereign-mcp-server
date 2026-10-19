#!/usr/bin/env node

/**
 * @sovereignbyte/mcp-server — Sovereign Cloud Enterprise Model Context Protocol (MCP) Server.
 *
 * Implements JSON-RPC 2.0 stdio transport with zero external dependencies.
 * Compatible with Claude Desktop, Cursor, Antigravity, VS Code, and Windsurf.
 *
 * Allows AI agents to:
 * 1. Query cold vault files with sub-second DuckDB SQL pushdown.
 * 2. Inspect schemas, tables, and partitions across CSV, Parquet, JSON, SQLite, and SQL dumps.
 * 3. Verify cryptographic SHA-256 Merkle root integrity receipts.
 * 4. Monitor storage and query quotas without touching production databases.
 */

const readline = require("node:readline");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_API_BASE = "https://api.sovereignbyte.tech";

function getApiBase() {
  return (process.env.SOVEREIGN_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
}

function getApiKey(passedKey) {
  return (
    passedKey ||
    process.env.SOV_API_KEY ||
    process.env.SOVEREIGN_API_KEY ||
    process.env.SOV_KEY ||
    ""
  ).trim();
}

async function httpRequest(endpoint, options = {}) {
  const { method = "GET", data = null, apiKey = null, timeoutMs = 30000 } = options;
  const key = getApiKey(apiKey);

  if (!key) {
    return {
      status: "error",
      message:
        "Missing Sovereign Cloud API key. Provide 'api_key' argument or set SOV_API_KEY / SOVEREIGN_API_KEY environment variable.",
    };
  }

  const base = getApiBase();
  const url = `${base}${endpoint}`;

  const headers = {
    "User-Agent": "Sovereign-MCP-Node/1.0",
    "x-api-key": key,
  };

  let body = undefined;
  if (data && (method === "POST" || method === "PUT")) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) {
        params.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
    }
    body = params.toString();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (!res.ok) {
        return {
          status: "error",
          http_code: res.status,
          message: parsed.detail || parsed.message || `HTTP ${res.status}: ${text.slice(0, 300)}`,
        };
      }
      return parsed;
    } catch {
      if (!res.ok) {
        return {
          status: "error",
          http_code: res.status,
          message: `HTTP ${res.status}: ${text.slice(0, 300)}`,
        };
      }
      return { status: "success", raw: text };
    }
  } catch (err) {
    clearTimeout(timer);
    return {
      status: "error",
      message: err.name === "AbortError" ? "Request timed out" : `Network error: ${err.message}`,
    };
  }
}

// ── MCP Tool Implementations ──────────────────────────────────────────────────

const TOOLS = [
  {
    name: "sovereign_list_vault_files",
    description:
      "List all files stored in the Sovereign Cloud Vault, including their sizes, formats, timestamps, and Merkle cryptographic integrity receipts.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: {
          type: "string",
          description: "Optional API key (falls back to SOV_API_KEY env var).",
        },
      },
    },
    handler: async (args) => {
      return await httpRequest("/v1/vault/files", { method: "GET", apiKey: args.api_key });
    },
  },
  {
    name: "sovereign_query_vault",
    description:
      "Execute high-speed read-only DuckDB SQL pushdown queries against any file in the Sovereign Cloud Vault (CSV, Parquet, JSON, SQLite, or SQL Dump) with sub-second execution.",
    inputSchema: {
      type: "object",
      properties: {
        file_id: {
          type: "string",
          description: "Unique identifier of the vault file to query (e.g. 'orders-2026', 'customers').",
        },
        sql_query: {
          type: "string",
          description: "Read-only SQL query (e.g. 'SELECT status, count(*) FROM data GROUP BY status').",
        },
        api_key: {
          type: "string",
          description: "Optional API key.",
        },
      },
      required: ["file_id", "sql_query"],
    },
    handler: async (args) => {
      if (!args.file_id || !args.sql_query) {
        return { status: "error", message: "'file_id' and 'sql_query' are required." };
      }
      return await httpRequest("/v1/vault/pushdown-query", {
        method: "POST",
        data: { file_id: args.file_id, sql_query: args.sql_query },
        apiKey: args.api_key,
        timeoutMs: 45000,
      });
    },
  },
  {
    name: "sovereign_list_tables",
    description: "Inspect table names and schema metadata available for a file in the Sovereign Cloud Vault.",
    inputSchema: {
      type: "object",
      properties: {
        file_id: {
          type: "string",
          description: "Optional file_id to filter tables for a specific vault file, or empty to list all.",
        },
        api_key: {
          type: "string",
          description: "Optional API key.",
        },
      },
    },
    handler: async (args) => {
      const endpoint = args.file_id
        ? `/v1/vault/tables?vault_file_id=${encodeURIComponent(args.file_id)}`
        : "/v1/vault/tables";
      return await httpRequest(endpoint, { method: "GET", apiKey: args.api_key });
    },
  },
  {
    name: "sovereign_preview_table",
    description: "Preview schema and the first 50 rows of data from a specific table inside a vault file.",
    inputSchema: {
      type: "object",
      properties: {
        file_id: {
          type: "string",
          description: "The unique ID of the vault file.",
        },
        table: {
          type: "string",
          description: "Name of the table to inspect.",
        },
        api_key: {
          type: "string",
          description: "Optional API key.",
        },
      },
      required: ["file_id", "table"],
    },
    handler: async (args) => {
      if (!args.file_id || !args.table) {
        return { status: "error", message: "'file_id' and 'table' are required." };
      }
      const endpoint = `/v1/vault/files/${encodeURIComponent(args.file_id)}/tables/${encodeURIComponent(args.table)}/preview`;
      return await httpRequest(endpoint, { method: "GET", apiKey: args.api_key });
    },
  },
  {
    name: "sovereign_get_integrity_receipt",
    description:
      "Fetch cryptographic SHA-256 Merkle attestation receipt for a vault file to mathematically prove zero bit rot or tampering.",
    inputSchema: {
      type: "object",
      properties: {
        file_id: {
          type: "string",
          description: "The unique ID of the vault file.",
        },
        api_key: {
          type: "string",
          description: "Optional API key.",
        },
      },
      required: ["file_id"],
    },
    handler: async (args) => {
      if (!args.file_id) {
        return { status: "error", message: "'file_id' is required." };
      }
      const endpoint = `/v1/vault/files/${encodeURIComponent(args.file_id)}/receipt`;
      return await httpRequest(endpoint, { method: "GET", apiKey: args.api_key });
    },
  },
  {
    name: "sovereign_get_quota",
    description: "Inspect current storage usage, query count, and monthly plan limits.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: {
          type: "string",
          description: "Optional API key.",
        },
      },
    },
    handler: async (args) => {
      return await httpRequest("/v1/vault/quota", { method: "GET", apiKey: args.api_key });
    },
  },
];

// ── JSON-RPC 2.0 stdio loop ──────────────────────────────────────────────────

function sendResponse(id, result = null, error = null) {
  const response = {
    jsonrpc: "2.0",
    id,
  };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + "\n");
}

async function handleMessage(msg) {
  if (!msg || typeof msg !== "object") return;

  const { id, method, params } = msg;

  // Notifications (no id)
  if (id === undefined || id === null) {
    if (method === "notifications/initialized") {
      // Client ready
    }
    return;
  }

  switch (method) {
    case "initialize":
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "@sovereignbyte/mcp-server",
          version: "1.0.0",
        },
      });
      break;

    case "ping":
      sendResponse(id, {});
      break;

    case "tools/list":
      sendResponse(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
      break;

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find((t) => t.name === toolName);

      if (!tool) {
        sendResponse(id, null, {
          code: -32601,
          message: `Tool '${toolName}' not found. Available tools: ${TOOLS.map((t) => t.name).join(", ")}`,
        });
        return;
      }

      try {
        const output = await tool.handler(toolArgs);
        sendResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(output, null, 2),
            },
          ],
        });
      } catch (err) {
        sendResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "error", error: err.message }, null, 2),
            },
          ],
          isError: true,
        });
      }
      break;
    }

    default:
      sendResponse(id, null, {
        code: -32601,
        message: `Method '${method}' not implemented.`,
      });
      break;
  }
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      handleMessage(parsed);
    } catch (err) {
      sendResponse(null, null, {
        code: -32700,
        message: `Parse error: Invalid JSON (${err.message})`,
      });
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}
