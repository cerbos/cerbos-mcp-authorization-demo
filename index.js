import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { GRPC } from "@cerbos/grpc";
import { randomUUID } from "node:crypto";

const cerbos = new GRPC("localhost:3593", { tls: false });

async function getServer({ user, sessionId }) {
  const server = new McpServer({ name: "CerbFinance MCP Server" });

  // Example tools - actual implementation is out of scope
  const tools = {
    list_expenses: server.tool(
      "list_expenses",
      "Lists expenses.",
      {},
      { title: "List Expenses" },
      async () => ({ content: [{ type: "text", text: "..." }] })
    ),
    add_expense: server.tool(
      "add_expense",
      "Adds an expense.",
      {},
      { title: "Add Expense" },
      async () => ({ content: [{ type: "text", text: "..." }] })
    ),
    approve_expense: server.tool(
      "approve_expense",
      "Approves an expense.",
      {},
      { title: "Approve Expense" },
      async () => ({ content: [{ type: "text", text: "..." }] })
    ),
    reject_expense: server.tool(
      "reject_expense",
      "Rejects an expense.",
      {},
      { title: "Reject Expense" },
      async () => ({ content: [{ type: "text", text: "..." }] })
    ),
    delete_expense: server.tool(
      "delete_expense",
      "Deletes an expense.",
      {},
      { title: "Delete Expense" },
      async () => ({ content: [{ type: "text", text: "..." }] })
    ),
    superpower_tool: server.tool(
      "superpower_tool",
      "Grants superpowers.",
      {},
      { title: "Superpower Tool" },
      async () => ({ content: [{ type: "text", text: "..." }] })
    ),
  };

  const toolNames = Object.keys(tools);

  // Central Authorization Check
  const authorizedTools = await cerbos.checkResource({
    principal: { id: user.id, roles: user.roles },
    resource: { kind: "mcp::expenses", id: sessionId },
    actions: toolNames,
  });

  for (const toolName of toolNames) {
    if (authorizedTools.isAllowed(toolName)) {
      tools[toolName].enable();
    } else {
      tools[toolName].disable();
    }
  }

  server.sendToolListChanged();
  return server;
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.user = { id: "user-123", roles: ["admin"] }; // Test different roles here
  next();
});

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = await getServer({
    user: req.user,
    sessionId: req.sessionId || randomUUID(),
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
app.listen(3000, () => console.log("MCP Server running on port 3000"));
