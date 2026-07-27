import type * as z from 'zod';

declare module 'langchain' {
  export { HumanMessage } from '@langchain/core/messages';

  export interface ReactAgent {
    invoke(input: { messages: unknown[] }): Promise<{
      structuredResponse?: unknown;
      messages?: unknown[];
    }>;
  }

  export function createAgent(params: {
    model: unknown;
    systemPrompt?: unknown;
    tools?: unknown[];
    responseFormat?: unknown;
  }): ReactAgent;

  export function tool<TSchema extends z.ZodTypeAny, TOutput>(
    handler: (input: z.infer<TSchema>) => TOutput | Promise<TOutput>,
    config: {
      name: string;
      description: string;
      schema: TSchema;
    },
  ): unknown;

  export function toolStrategy<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
  ): unknown;
}
