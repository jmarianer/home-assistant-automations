/**
 * Pretty-print a JSON payload with a marker prefixed on every line.
 *
 * Accepts either an already-parsed value or a JSON string; a string that
 * doesn't parse as JSON is logged as-is rather than throwing.
 */
export function formatWithMarker(marker: string, payload: unknown): string {
  let pretty: string;
  if (typeof payload === 'string') {
    try {
      pretty = JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      pretty = payload;
    }
  } else {
    pretty = JSON.stringify(payload, null, 2);
  }

  return pretty
    .split('\n')
    .map((line) => `${marker} ${line}`)
    .join('\n');
}
