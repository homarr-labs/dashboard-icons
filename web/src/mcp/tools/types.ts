import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/server"
import type { z } from "zod"
import type { McpCaller, McpSession } from "@/mcp/caller"

export type ToolCategory = "discovery" | "details" | "account"

type ToolDefinition<Input extends z.ZodObject, Output extends z.ZodObject> = {
	name: string
	config: {
		title: string
		description: string
		inputSchema: Input
		outputSchema: Output
		annotations: ToolAnnotations
		_meta?: { category: ToolCategory }
	}
}

export type PublicTool<Input extends z.ZodObject = z.ZodObject, Output extends z.ZodObject = z.ZodObject> = ToolDefinition<
	Input,
	Output
> & {
	access: "public"
	handler(args: z.output<Input>, context: { caller: McpCaller | null }): Promise<CallToolResult>
}

export type AccountTool<Input extends z.ZodObject = z.ZodObject, Output extends z.ZodObject = z.ZodObject> = ToolDefinition<
	Input,
	Output
> & {
	access: "account"
	handler(args: z.output<Input>, context: McpSession): Promise<CallToolResult>
}

export type DashboardIconsTool = PublicTool | AccountTool

export const READ_ONLY_ANNOTATIONS: ToolAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
}

export function structuredResult(data: Record<string, unknown>, text: string = JSON.stringify(data)): CallToolResult {
	return { content: [{ type: "text", text }], structuredContent: data }
}
