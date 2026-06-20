export const errorResponseJsonSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
  },
} as const;

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>[];
  };
};

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>[],
): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}
