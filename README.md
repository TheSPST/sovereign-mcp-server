# Sovereign Cloud Model Context Protocol (MCP) Server

[![npm version](https://img.shields.io/npm/v/@sovereignbyte/mcp-server.svg)](https://www.npmjs.com/package/@sovereignbyte/mcp-server)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Protocol](https://img.shields.io/badge/MCP-2024--11--05-emerald.svg)](https://modelcontextprotocol.io)

The official **Sovereign Cloud MCP Server** for **Claude Desktop, Cursor, Antigravity, Windsurf, and VS Code**.

Connects AI coding assistants and agents directly to your Sovereign Cloud Vault:
- **Zero Live Database Risk**: Query cold backups, historical databases, and archives without putting any load on production OLTP systems.
- **Sub-Second Cold SQL Pushdown**: Powered by server-side DuckDB execution across multi-gigabyte files.
- **Schema & Table Introspection**: Ask your AI assistant to browse tables across CSV, TSV, JSON, Parquet, SQLite, and SQL dumps.
- **Cryptographic Merkle Proofs**: Verify zero bit-rot receipts and SHA-256 data attestation.
- **Zero Local Dependencies**: Pure Node.js stdio implementation with zero external npm dependencies.

---

## ⚡ 1-Click Quickstart

### 1. Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sovereign-byte": {
      "command": "npx",
      "args": ["-y", "@sovereignbyte/mcp-server"],
      "env": {
        "SOV_API_KEY": "sov_live_your_api_key_here"
      }
    }
  }
}
```

### 2. Cursor
Open **Cursor Settings** → **Features** → **MCP Servers** → **Add New MCP Server**:
- **Name**: `sovereign-byte`
- **Type**: `command`
- **Command**: `npx -y @sovereignbyte/mcp-server`

Or add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "sovereign-byte": {
      "command": "npx",
      "args": ["-y", "@sovereignbyte/mcp-server"],
      "env": {
        "SOV_API_KEY": "sov_live_your_api_key_here"
      }
    }
  }
}
```

---

## 🛠️ Available MCP Tools

| Tool | Description |
| :--- | :--- |
| `sovereign_list_vault_files` | List all files in your vault, formats, sizes, and Merkle root hashes. |
| `sovereign_query_vault` | Execute high-speed read-only DuckDB SQL pushdown queries. |
| `sovereign_list_tables` | Inspect schemas and table names inside any vault file. |
| `sovereign_preview_table` | Preview the first 50 rows of data from any table. |
| `sovereign_get_integrity_receipt` | Fetch cryptographic SHA-256 Merkle root verification receipts. |
| `sovereign_get_quota` | Inspect storage usage, queries executed, and monthly quota limits. |

---

## 💬 Prompts to Try with Your AI Assistant

- *"Query the 2022 orders table in my Sovereign Vault to find our highest-grossing customers."*
- *"Show me the schema of `customers.parquet` stored in my vault."*
- *"Verify the cryptographic SHA-256 Merkle receipt for `q4_financials.sql`."*
- *"Check how much of my 1 GB vault storage quota is currently used."*

---

## 📜 License
Apache-2.0 © Sovereign Byte Technologies
