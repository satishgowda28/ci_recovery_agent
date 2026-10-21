import { ToolCall, ToolDefinition } from '@agent/shared';
import { RegisteredTool } from './defineTools';
import { getGitDiffTool } from './getGitDiff';
import { listFilesTool } from './listFiles';
import { readFileTool } from './readFile';
import { searchCodeTool } from './searchCode';

const tools = [listFilesTool, readFileTool, searchCodeTool, getGitDiffTool];

export function getToolDefinitions(): ToolDefinition[] {
  return tools.map(({ definition }) => ({ ...definition }));
}

function getTool(toolName: string): RegisteredTool | undefined {
  const tool = tools.find((t) => t.definition.name === toolName);
  return tool;
}

export async function runTool(root: string, call: ToolCall): Promise<string> {
  const tool = getTool(call.name);
  if (!tool) {
    return `Error: Unknown tool call ${call.name}`;
  }
  try {
    const toolResponse = await tool.execute(root, call.arguments);
    return toolResponse;
  } catch (err) {
    const e = err as Error;
    return `Error: ${e.message}`;
  }
}
