/** Parse tool arguments — handles JSON string, plain object, or undefined. */
function parseArguments(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (typeof raw === "object") return raw as Record<string, string>;
  return {};
}

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
    const params = parseArguments(fn.arguments ?? fn.parameters ?? fn.args);
    return { toolCallId, params };
  }

  // ── v1: legacy single functionCall object ─────────────────────────────────
  const legacyCall: Record<string, unknown> | undefined =
    (msg?.functionCall ?? body?.functionCall) as Record<string, unknown> | undefined;

  if (legacyCall) {
    const toolCallId: string = (legacyCall.id as string) ?? "unknown";
    const params = parseArguments(legacyCall.parameters ?? legacyCall.arguments ?? legacyCall.args);
    return { toolCallId, params };
  }

  // ── Fallback: nothing found ───────────────────────────────────────────────
  return { toolCallId: "unknown", params: {} as Record<string, string> };
}

// ── Date / time normalisation ─────────────────────────────────────────────────

const TURKISH_MONTHS: Record<string, string> = {
  ocak: "01", şubat: "02", mart: "03", nisan: "04",
  mayıs: "05", haziran: "06", temmuz: "07", ağustos: "08",
  eylül: "09", ekim: "10", kasım: "11", aralık: "12",
};

/**
 * Normalise a date string to YYYY-MM-DD.
 * Handles ISO, DD/MM/YYYY, DD.MM.YYYY, Turkish month names, etc.
 * Returns null if the input cannot be parsed.
 */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // Already ISO: 2026-07-19
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // Turkish: "19 Temmuz" or "19 Temmuz 2026"
  const normalized = s.toLowerCase().replace(/i̇/g, "i");
  const trk = normalized.match(
    /(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)(?:\s+(\d{4}))?/
  );
  if (trk) {
    const year = trk[3] ?? String(new Date().getFullYear());
    const month = TURKISH_MONTHS[trk[2]];
    return `${year}-${month}-${trk[1].padStart(2, "0")}`;
  }

  // Native Date parse as last resort (handles "July 19 2026", "2026/07/19", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

/**
 * Normalise a time string to HH:MM.
 * Handles "11:00", "11:00:00", "11.00", "11" (hour only), etc.
 * Returns null if the input cannot be parsed.
 */
export function parseTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // HH:MM or HH:MM:SS
  const colon = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colon) return `${colon[1].padStart(2, "0")}:${colon[2]}`;

  // HH.MM
  const dot = s.match(/^(\d{1,2})\.(\d{2})$/);
  if (dot) return `${dot[1].padStart(2, "0")}:${dot[2]}`;

  // Just hour: "11" → "11:00"
  if (/^\d{1,2}$/.test(s)) return `${s.padStart(2, "0")}:00`;

  return null;
}
