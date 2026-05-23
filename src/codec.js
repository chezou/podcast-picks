// ─── Shared state encoding/decoding (v1 + v2) ──────────────
// Used by both App.jsx (browser) and worker.js (Cloudflare Worker)

/**
 * Encode state as deflate-raw compressed array JSON (v2 format).
 * Returns the base64 string (caller adds ?v=2&d= to URL).
 */
export async function encodeState(name, picks) {
  const arr = [name, picks.map(p => [p.title, p.reason || "", p.url || ""])];
  const json = new TextEncoder().encode(JSON.stringify(arr));
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(json);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Decode state from URL param. Supports both formats:
 *   v2: deflate-raw compressed array  [name, [[t,r,u], ...]]
 *   v1: base64 JSON  {n, p: [{t,r,u}, ...]}  (legacy, no version param)
 * Returns { name, picks: [{ title, reason, url }] } or null.
 */
export async function decodeState(encoded, version) {
  try {
    if (version === "2") {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const arr = JSON.parse(await new Response(ds.readable).text());
      return {
        name: arr[0] || "",
        picks: (arr[1] || []).map((p) => ({
          title: p[0] || "",
          reason: p[1] || "",
          url: p[2] || "",
        })),
      };
    }
    // v1: legacy JSON format
    const json = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    return {
      name: json.n || "",
      picks: (json.p || []).map((p) => ({
        title: p.t || "",
        reason: p.r || "",
        url: p.u || "",
      })),
    };
  } catch {
    return null;
  }
}
