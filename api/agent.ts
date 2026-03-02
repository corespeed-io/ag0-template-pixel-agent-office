import { Hono } from "hono";
// Zypher Agent SDK
// Documentation: https://docs.corespeed.io/zypher
// API reference:
//   @zypher/agent — https://jsr.io/@zypher/agent/doc
//   @zypher/http  — https://jsr.io/@zypher/http/doc
//   Or run: `deno doc jsr:@zypher/agent` / `deno doc jsr:@zypher/http`
import { cloudflareGateway, createZypherAgent, getSystemPrompt } from "@zypher/agent";
import { getRequiredEnv } from "@zypher/utils/env";
import { createZypherHandler } from "@zypher/http";
import { buildAgentInfo } from "@ag0/agent-info";

// =============================================================================
// TOOL IMPORTS
// =============================================================================
// Custom tools: Define your own tools in tools/ and import them here
// import { GetWeatherTool } from "./tools/weather.ts";

// Built-in tools: Zypher provides common tools for file system and terminal access
// - createFileSystemTools(): Returns tools for read_file, list_dir, edit_file,
//   undo_file, grep_search, file_search, copy_file, delete_file
// - RunTerminalCmdTool: Execute shell commands
// import { createFileSystemTools, RunTerminalCmdTool } from "@zypher/agent/tools";
import { RunTerminalCmdTool } from "@zypher/agent/tools";

export async function createZypherAgentRouter(): Promise<Hono> {
  const agent = await createZypherAgent({
    // Base directory for file operations (e.g., ReadTool, WriteTool)
    workingDirectory: "./",

    // Model provider — uses Cloudflare AI Gateway (supports OpenAI, Anthropic,
    // and other providers via a unified compatibility API).
    // Environment variables provided automatically in the sandbox:
    //   AI_GATEWAY_BASE_URL – Cloudflare AI Gateway endpoint
    //   AI_GATEWAY_API_TOKEN – Authentication token for the gateway
    // Model ID must be in "provider/model-name" format, e.g.:
    //   "anthropic/claude-sonnet-4-5-20250929"
    //   "openai/gpt-4o"
    model: cloudflareGateway("anthropic/claude-sonnet-4-5-20250929", {
      gatewayBaseUrl: getRequiredEnv("AI_GATEWAY_BASE_URL"),
      apiToken: getRequiredEnv("AI_GATEWAY_API_TOKEN"),
      headers: {
        "User-Agent": "AG0-ZypherAgent/1.0",
      },
    }),

    // Initial messages to restore conversation context
    // initialMessages: [],

    // Agent configuration
    config: {
      skills: {
        projectSkillsDir: "skills",
      },
    },

    // Override default behaviors with custom implementations
    overrides: {
      // Custom system prompt loader - called before each task.
      // IMPORTANT: Always use getSystemPrompt() from @zypher/agent — it
      // includes the base Zypher system prompt required for advanced agent
      // capabilities (e.g., agent skills, programmatic tool calling).
      // Put your own instructions in customInstructions; do NOT replace
      // the entire system prompt or these capabilities will be lost.
      systemPromptLoader: async () => {
        return await getSystemPrompt(Deno.cwd(), {
          customInstructions: `You are Star, a friendly and helpful Personal Assistant working in the Agent0 Star Office.

Your personality:
- Warm, professional, and approachable
- You speak concisely but clearly
- You use occasional emoji to keep things friendly ✨
- You're proactive — suggest next steps when appropriate

Your capabilities:
- Answer questions on any topic
- Help with writing, brainstorming, and planning
- Run terminal commands when needed
- Assist with coding and technical tasks

Always introduce yourself as "Star" when greeting users for the first time.`,
        });
      },
    },

    // Tools give the agent capabilities to perform actions
    // You can use built-in tools, or define custom tools in tools/
    tools: [
      // Example: Custom tool defined in tools/weather.ts
      // GetWeatherTool,

      // Example: Built-in file system tools
      // ...createFileSystemTools(),

      // Built-in terminal command execution
      RunTerminalCmdTool,
    ],

    // MCP (Model Context Protocol) servers provide external integrations
    // You can connect to any MCP-compatible server using "command" or "remote" type
    mcpServers: [
      // Example: Command-based MCP server (spawns a local process)
      // {
      //   id: "sequential-thinking",
      //   type: "command",
      //   command: {
      //     command: "npx",
      //     args: [
      //       "-y",
      //       "@modelcontextprotocol/server-sequential-thinking",
      //     ],
      //   },
      // },

      // Example: Remote MCP server (connects to an HTTP endpoint)
      // {
      //   id: "linear",
      //   type: "remote",
      //   remote: {
      //     url: "https://mcp.linear.app/mcp",
      //   },
      // },
    ],
  });

  return createZypherHandler({
    agent,
  })
    // AG0 Dashboard contract: the dashboard shows the agent canvas tab
    // only when GET /api/agent/info returns an AgentInfo object.
    // Update the name and description to match your agent.
    .get("/info", async (c) => {
      const info = await buildAgentInfo(agent, {
        name: "Star",
        description: "Your Personal Assistant in Agent0 Star Office",
      });
      return c.json(info);
    });
}
