/**
 * Extract tool call data from a VAPI webhook payload.
 *
 * VAPI has used several different payload shapes across versions:
 *
 *  v1 – legacy single function call (flat under message):
 *    { message: { type: "function-call", functionCall: { name, parameters: {} } } }
 *
 *  v2 – tool call list (array, older array field name):
 *    { message: { type: "tool-calls", toolCallList: [{ id, function: { name, arguments: "..." } }] } }
 *
 *  v3 – tool calls (array, current field name):
 *    { message: { type: "tool-calls", toolCalls: [{ id, function: { name, arguments: "..." } }] } }
 *
 *  Some versions also send the payload at the root level (no message wrapper).
 */
export function extractToolCall(body: Record<string, unknown>) {
  const msg = (body?.message ?? body) as Record<string, unknown>;

  // ── v3 / v2: array formats ────────────────────────────────────────────────
  const arrayToolCall: Record<string, unknown> | undefined =
    ((msg?.toolCalls    as unknown[])?.[0] ??
     (msg?.toolCallList as unknown[])?.[0] ??
     (body?.toolCalls    as unknown[])?.[0] ??
     (body?.toolCallList as unknown[])?.[0]) as Record<string, unknown> | undefined;

  if (arrayToolCall) {
    const toolCallId: string = (arrayToolCall.id as string) ?? "unknown";
    const fn = (arrayToolCall.function ?? arrayToolCall) as Record<string, unknown>;
    let params: Record<string, string> = {};
    try {
      params = JSON.parse((fn.arguments as string) ?? "{}");
    } catch {
      params = ((fn.parameters ?? fn.args) as Record<string, string>) ?? {};
    }
    return { toolCallId, params };
  }

  // ── v1: legacy single functionCall object ─────────────────────────────────
  const legacyCall: Record<string, unknown> | undefined =
    (msg?.functionCall ?? body?.functionCall) as Record<string, unknown> | undefined;

  if (legacyCall) {
    const toolCallId: string = (legacyCall.id as string) ?? "unknown";
    let params: Record<string, string> = {};
    // v1 sends parameters as an object (not a JSON string)
    const rawParams = legacyCall.parameters ?? legacyCall.arguments ?? legacyCall.args;
    if (typeof rawParams === "string") {
      try { params = JSON.parse(rawParams); } catch { /* ignore */ }
    } else if (rawParams && typeof rawParams === "object") {
      params = rawParams as Record<string, string>;
    }
    return { toolCallId, params };
  }

  // ── Fallback: nothing found ───────────────────────────────────────────────
  return { toolCallId: "unknown", params: {} as Record<string, string> };
}
