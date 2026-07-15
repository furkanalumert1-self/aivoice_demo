/**
 * Extract tool call data from a VAPI webhook payload.
 * VAPI has used different field names across versions:
 *   - message.toolCallList  (older)
 *   - message.toolCalls     (newer)
 * We check both so all routes work regardless of VAPI version.
 */
export function extractToolCall(body: Record<string, unknown>) {
  const msg = (body?.message ?? body) as Record<string, unknown>;
  const toolCall =
    (msg?.toolCallList as unknown[])?.[0] ??
    (msg?.toolCalls as unknown[])?.[0] ??
    (body?.toolCallList as unknown[])?.[0] ??
    (body?.toolCalls as unknown[])?.[0];

  const tc = toolCall as Record<string, unknown> | undefined;
  const toolCallId: string = (tc?.id as string) ?? "unknown";

  let params: Record<string, string> = {};
  try {
    params = JSON.parse((tc?.function as Record<string, unknown>)?.arguments as string ?? "{}");
  } catch {
    params = ((tc?.function as Record<string, unknown>)?.parameters as Record<string, string>) ?? {};
  }

  return { toolCallId, params, toolCall: tc };
}
