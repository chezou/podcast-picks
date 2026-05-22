import { useState, useEffect } from "react";

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600;700&display=swap";

// ─── State encoding ─────────────────────────────────────────
function encodeState(name, picks) {
  const data = {
    n: name,
    p: picks.map(p => ({ t: p.title, r: p.reason || "", u: p.url || "" })),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeState(hash) {
  try {
    const json = JSON.parse(decodeURIComponent(escape(atob(hash))));
    return {
      name: json.n || "",
      picks: (json.p || []).map((p, i) => ({
        id: i, title: p.t || "", reason: p.r || "", url: p.u || "",
      })),
    };
  } catch { return null; }
}

// ─── Fetch artwork by title from iTunes Search ──────────────
async function fetchArtworkByTitle(title) {
  if (!title) return null;
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=podcast&limit=3&lang=ja_jp`
    );
    const data = await res.json();
    const results = data.results || [];
    // Try exact-ish match first, then fall back to first result
    const normalize = s => s.toLowerCase().replace(/[\s\-_.:!?]+/g, "");
    const norm = normalize(title);
    const exact = results.find(r =>
      normalize(r.collectionName || "") === norm || normalize(r.trackName || "") === norm
    );
    const best = exact || results[0];
    if (!best) return null;
    return (best.artworkUrl600 || best.artworkUrl100 || "").replace("100x100", "600x600");
  } catch { return null; }
}

// ─── Palette ────────────────────────────────────────────────
const PALETTES = [
  { bg: "#0c0c1d", card: "#141430", accent: "#ff6b6b", text: "#f0f0f0", sub: "#8888aa", glow: "rgba(255,107,107,0.08)" },
  { bg: "#0a0f1a", card: "#111b2e", accent: "#64dfdf", text: "#eef", sub: "#7799aa", glow: "rgba(100,223,223,0.08)" },
  { bg: "#120c18", card: "#1e1428", accent: "#c9a0ff", text: "#f0eef5", sub: "#9988aa", glow: "rgba(201,160,255,0.08)" },
  { bg: "#0f1410", card: "#182018", accent: "#95e77e", text: "#eef0ee", sub: "#88aa88", glow: "rgba(149,231,126,0.08)" },
];
function getPalette(name) {
  return PALETTES[[...(name || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTES.length];
}

// ─── Artwork (viewer-side: fetches by title) ────────────────
function ArtworkImg({ title, size, radius, accentColor }) {
  const [src, setSrc] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done

  useEffect(() => {
    if (!title) { setSrc(null); setStatus("done"); return; }
    let cancelled = false;
    setStatus("loading");
    fetchArtworkByTitle(title).then(art => {
      if (!cancelled) { setSrc(art); setStatus("done"); }
    });
    return () => { cancelled = true; };
  }, [title]);

  const fallback = (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: `${accentColor || "#ff6b6b"}12`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontSize: size * 0.38,
    }}>🎙️</div>
  );

  if (status === "loading") {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: "#1a1a36", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35,
      }}>
        <style>{`@keyframes ppulse { 0%,100% { opacity:0.3 } 50% { opacity:0.7 } }`}</style>
        <span style={{ animation: "ppulse 1.4s ease-in-out infinite" }}>🎙️</span>
      </div>
    );
  }

  if (!src) return fallback;

  return (
    <img src={src} alt="" style={{
      width: size, height: size, borderRadius: radius,
      objectFit: "cover", flexShrink: 0,
      boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
    }} />
  );
}

// ─── CardView ───────────────────────────────────────────────
function CardView({ name, picks }) {
  const p = getPalette(name);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 30% 0%, ${p.glow} 0%, transparent 60%), linear-gradient(170deg, ${p.bg} 0%, #050510 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "36px 16px", fontFamily: "'Sora', sans-serif",
    }}>
      <div style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.7s cubic-bezier(.22,1,.36,1)",
        width: "100%", maxWidth: 440,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <p style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11,
            color: p.accent, letterSpacing: 4, textTransform: "uppercase",
            margin: "0 0 10px", fontWeight: 700,
          }}>MY TOP 3 PODCASTS</p>
          <h1 style={{ fontSize: 26, color: p.text, margin: 0, fontWeight: 600, letterSpacing: -0.5 }}>
            {name}<span style={{ color: p.sub, fontWeight: 300 }}>'s Picks</span>
          </h1>
        </div>

        {/* Cards */}
        {picks.map((pick, i) => {
          const hasLink = !!pick.url;
          const inner = (
            <>
              {/* Number */}
              <div style={{
                position: "absolute", top: 14, right: 16,
                fontFamily: "'Space Mono', monospace", fontSize: 11,
                color: p.accent, opacity: 0.5, fontWeight: 700,
              }}>#{i + 1}</div>

              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
                <ArtworkImg title={pick.title} size={64} radius={14} accentColor={p.accent} />
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <h2 style={{
                    fontSize: 17, color: p.text, margin: 0, fontWeight: 600,
                    lineHeight: 1.35, wordBreak: "break-word", letterSpacing: -0.2,
                  }}>{pick.title}</h2>
                  {pick.reason && (
                    <p style={{
                      fontSize: 13, color: p.sub, margin: "8px 0 0",
                      lineHeight: 1.55, fontWeight: 300, wordBreak: "break-word",
                    }}>{pick.reason}</p>
                  )}
                  {hasLink && (
                    <span style={{
                      fontSize: 10, color: p.accent, opacity: 0.6,
                      fontFamily: "'Space Mono', monospace",
                      marginTop: 6, display: "inline-block",
                    }}>聴く ↗</span>
                  )}
                </div>
              </div>
            </>
          );

          const cardStyle = {
            display: "block", textDecoration: "none", color: "inherit",
            background: p.card, borderRadius: 18, padding: 20,
            marginBottom: i < picks.length - 1 ? 14 : 0,
            position: "relative", overflow: "hidden",
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
            transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${0.15 + i * 0.12}s`,
            border: `1px solid ${p.accent}12`,
            cursor: hasLink ? "pointer" : "default",
          };

          return hasLink ? (
            <a key={i} href={pick.url} target="_blank" rel="noopener noreferrer" style={cardStyle}>
              {inner}
            </a>
          ) : (
            <div key={i} style={cardStyle}>{inner}</div>
          );
        })}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={() => { window.location.hash = ""; window.location.reload(); }}
            style={{
              fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 500,
              color: p.accent, background: `${p.accent}10`,
              border: `1px solid ${p.accent}30`, borderRadius: 999,
              padding: "10px 28px", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.target.style.background = `${p.accent}25`}
            onMouseLeave={e => e.target.style.background = `${p.accent}10`}
          >✨ 自分のも作る</button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────
function Editor() {
  const [name, setName] = useState("");
  const [picks, setPicks] = useState([
    { id: 0, title: "", reason: "", url: "" },
    { id: 1, title: "", reason: "", url: "" },
    { id: 2, title: "", reason: "", url: "" },
  ]);
  const [copied, setCopied] = useState(false);

  const updatePick = (id, field, value) => {
    setPicks(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const filledPicks = picks.filter(p => p.title.trim());
  const isValid = name.trim() && filledPicks.length >= 1;

  const shareUrl = (() => {
    if (!isValid) return "";
    return `${window.location.origin}${window.location.pathname}#${encodeState(name.trim(), filledPicks)}`;
  })();

  const handleCopy = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const NUM = ["①", "②", "③"];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(170deg, #0c0c1d 0%, #050510 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 16px 60px", fontFamily: "'Sora', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36, maxWidth: 440, width: "100%" }}>
        <p style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11,
          color: "#ff6b6b", letterSpacing: 4, textTransform: "uppercase",
          margin: "0 0 10px", fontWeight: 700,
        }}>🎧 PODCAST PICKS</p>
        <h1 style={{ fontSize: 24, color: "#f0f0f0", margin: 0, fontWeight: 600, letterSpacing: -0.5 }}>
          お気に入りPodcast 3選
        </h1>
        <p style={{ fontSize: 13, color: "#667", margin: "10px 0 0", fontWeight: 300, lineHeight: 1.6 }}>
          タイトルを入力するだけでOK<br />
          アートワークは自動で取得されます
        </p>
      </div>

      <div style={{ maxWidth: 440, width: "100%" }}>
        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: "block", fontSize: 11, color: "#667", letterSpacing: 2,
            textTransform: "uppercase", marginBottom: 8,
            fontFamily: "'Space Mono', monospace",
          }}>表示名</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="your name" maxLength={30}
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: "'Sora', sans-serif", fontSize: 16,
              padding: "12px 16px", background: "#141430",
              border: "1px solid #ffffff10", borderRadius: 10,
              color: "#eee", outline: "none",
            }}
          />
        </div>

        {/* Picks */}
        {picks.map((pick, i) => (
          <div key={pick.id} style={{
            background: "#141430", borderRadius: 16, padding: 20,
            marginBottom: 14, border: "1px solid #ffffff08",
          }}>
            <div style={{
              fontSize: 13, color: "#ff6b6b",
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700, marginBottom: 14, letterSpacing: 1,
            }}>{NUM[i]} PICK</div>

            <input
              type="text" value={pick.title}
              onChange={e => updatePick(pick.id, "title", e.target.value)}
              placeholder="ポッドキャスト名"
              maxLength={80}
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "'Sora', sans-serif", fontSize: 15,
                padding: "10px 14px", background: "#0d0d20",
                border: "1px solid #ffffff10", borderRadius: 8,
                color: "#eee", outline: "none", marginBottom: 8,
              }}
            />

            <input
              type="url" value={pick.url}
              onChange={e => updatePick(pick.id, "url", e.target.value)}
              placeholder="リンク（任意 / Spotify, Apple, 番組サイト等）"
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "'Space Mono', monospace", fontSize: 12,
                padding: "10px 14px", background: "#0d0d20",
                border: "1px solid #ffffff10", borderRadius: 8,
                color: "#778", outline: "none", marginBottom: 8,
              }}
            />

            <textarea
              value={pick.reason}
              onChange={e => updatePick(pick.id, "reason", e.target.value)}
              placeholder="おすすめの理由（任意）"
              maxLength={140} rows={2}
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "'Sora', sans-serif", fontSize: 13,
                padding: "10px 14px", background: "#0d0d20",
                border: "1px solid #ffffff10", borderRadius: 8,
                color: "#99a", outline: "none", resize: "none",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: "#445", marginTop: 2 }}>
              {pick.reason.length}/140
            </div>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <button
            disabled={!isValid}
            onClick={() => {
              if (!isValid) return;
              window.location.hash = encodeState(name.trim(), filledPicks);
            }}
            style={{
              flex: 1, minWidth: 130,
              fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600,
              color: isValid ? "#fff" : "#445",
              background: isValid ? "linear-gradient(135deg, #ff6b6b, #d94555)" : "#1a1a2e",
              border: "none", borderRadius: 10, padding: "14px 16px",
              cursor: isValid ? "pointer" : "not-allowed", transition: "all 0.2s",
            }}
          >👀 プレビュー</button>

          <button
            disabled={!isValid} onClick={handleCopy}
            style={{
              flex: 1, minWidth: 130,
              fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600,
              color: isValid ? "#ff6b6b" : "#445",
              background: isValid ? "#ff6b6b10" : "#1a1a2e",
              border: isValid ? "1px solid #ff6b6b30" : "1px solid #ffffff08",
              borderRadius: 10, padding: "14px 16px",
              cursor: isValid ? "pointer" : "not-allowed", transition: "all 0.2s",
            }}
          >{copied ? "✅ コピー完了！" : "🔗 リンクをコピー"}</button>
        </div>

        {shareUrl && (
          <div style={{
            marginTop: 14, padding: "10px 14px",
            background: "#0a0a18", borderRadius: 8,
            fontSize: 10, color: "#445", wordBreak: "break-all",
            lineHeight: 1.7, border: "1px solid #ffffff06",
            fontFamily: "'Space Mono', monospace",
          }}>{shareUrl}</div>
        )}

        <p style={{
          fontSize: 11, color: "#334", textAlign: "center",
          marginTop: 20, lineHeight: 1.7,
          fontFamily: "'Space Mono', monospace",
        }}>
          データはURLに含まれるのでサーバー不要<br />
          アートワークはタイトルから自動取得
        </p>
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────
export default function App() {
  const [viewData, setViewData] = useState(null);
  const [mode, setMode] = useState("loading");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);

    const checkHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const data = decodeState(hash);
        if (data && data.picks.length > 0) {
          setViewData(data);
          setMode("view");
          return;
        }
      }
      setMode("edit");
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  if (mode === "loading") return null;
  if (mode === "view" && viewData) return <CardView name={viewData.name} picks={viewData.picks} />;
  return <Editor />;
}
