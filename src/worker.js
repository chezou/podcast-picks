import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

let wasmInitialized = false;

// ─── Decode the shared state from ?d= param ──────────────────
function decodeState(encoded) {
  try {
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

// ─── Fetch Google Font for Satori ────────────────────────────
async function loadGoogleFont(family, weight) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssRes = await fetch(url);
  const css = await cssRes.text();
  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/);
  if (!match) throw new Error(`Font not found: ${family}@${weight}`);
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

// ─── Generate OGP image (1200x630) ──────────────────────────
async function generateOgImage(data) {
  if (!wasmInitialized) {
    await initWasm(resvgWasm);
    wasmInitialized = true;
  }

  const [sora400, sora700] = await Promise.all([
    loadGoogleFont("Sora", 400),
    loadGoogleFont("Sora", 700),
  ]);

  const accent = "#c9a0ff";
  const bg = "#120c18";
  const card = "#1e1428";
  const text = "#f0eef5";
  const sub = "#c0b0d0";
  const nums = ["①", "②", "③"];

  const jsx = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg, ${bg} 0%, #0a0a1a 100%)`,
        padding: "60px 70px",
        fontFamily: "Sora",
      },
      children: [
        // Header
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", marginBottom: 40 },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 18,
                    color: accent,
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: 12,
                  },
                  children: "🎧 MY TOP 3 PODCASTS",
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 42, fontWeight: 700, color: text },
                  children: [
                    { type: "span", props: { children: data.name } },
                    {
                      type: "span",
                      props: {
                        style: { color: sub, fontWeight: 400, marginLeft: 8 },
                        children: "'s Picks",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Picks
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: 16, flex: 1 },
            children: data.picks.slice(0, 3).map((pick, i) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: card,
                  borderRadius: 16,
                  padding: "20px 28px",
                  border: `1px solid ${accent}22`,
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: { fontSize: 28, color: accent, opacity: 0.6, flexShrink: 0 },
                      children: nums[i] || "",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        flex: 1,
                        minWidth: 0,
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: 26,
                              fontWeight: 700,
                              color: text,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                            children: pick.title,
                          },
                        },
                        pick.reason
                          ? {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: 16,
                                  color: sub,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                },
                                children: pick.reason,
                              },
                            }
                          : null,
                      ].filter(Boolean),
                    },
                  },
                ],
              },
            })),
          },
        },
        // Footer
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 24,
              fontSize: 16,
              color: sub,
              opacity: 0.5,
            },
            children: "podcast-picks",
          },
        },
      ],
    },
  };

  const svg = await satori(jsx, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Sora", data: sora400, weight: 400, style: "normal" },
      { name: "Sora", data: sora700, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

// ─── Inject OGP meta tags into index.html ────────────────────
function injectOgTags(html, data, url) {
  const title = `${data.name}'s Top 3 Podcasts`;
  const description = data.picks
    .slice(0, 3)
    .map((p, i) => `${i + 1}. ${p.title}`)
    .join(" / ");
  const parsed = new URL(url);
  const ogImageUrl = `${parsed.origin}/og?d=${encodeURIComponent(parsed.searchParams.get("d"))}`;

  const ogTags = `
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:image" content="${escapeAttr(ogImageUrl)}" />
    <meta property="og:url" content="${escapeAttr(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${escapeAttr(ogImageUrl)}" />
    <title>${escapeHtml(title)} | podcast-picks</title>`;

  return html.replace("</head>", `${ogTags}\n  </head>`);
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Worker entry ────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // OGP image endpoint
    if (url.pathname === "/og") {
      const encoded = url.searchParams.get("d");
      if (!encoded) {
        return new Response("Missing ?d= parameter", { status: 400 });
      }
      const data = decodeState(encoded);
      if (!data || data.picks.length === 0) {
        return new Response("Invalid data", { status: 400 });
      }
      try {
        const png = await generateOgImage(data);
        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (e) {
        return new Response(`OG image generation failed: ${e.message}`, { status: 500 });
      }
    }

    // For ?d= requests on the root, inject OGP tags
    const param = url.searchParams.get("d");
    if (url.pathname === "/" && param) {
      const data = decodeState(param);
      if (data && data.picks.length > 0) {
        const assetRes = await env.ASSETS.fetch(new URL("/", url.origin));
        const html = await assetRes.text();
        const injected = injectOgTags(html, data, url.toString());
        return new Response(injected, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
};
