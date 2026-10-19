FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY bin/ ./bin/
COPY README.md LICENSE ./

RUN npm link

ENTRYPOINT ["sovereign-mcp-server"]
