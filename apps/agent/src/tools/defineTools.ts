import { ToolDefinition } from '@agent/shared';
import z from 'zod';

export interface RegisteredTool {
  definition: ToolDefinition;
  execute: (root: string, args: Record<string, unknown>) => Promise<string>;
}

export function defineTool<T extends z.ZodType>(tool: {
  name: string;
  description: string;
  schema: T;
  func: (root: string, args: z.infer<T>) => Promise<string>;
}): RegisteredTool {
  return {
    definition: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema.toJSONSchema(),
    },
    execute: async (root, args) => {
      const parsedArgs = tool.schema.safeParse(args);
      if (!parsedArgs.success) {
        return `Error: Invalid arguments: ${parsedArgs.error.message}`;
      }
      return tool.func(root, parsedArgs.data);
    },
  };
}
