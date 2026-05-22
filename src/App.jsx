import { useState, useEffect } from "react";

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600;700&display=swap";

// ─── Color-scheme detection + manual toggle ────────────────
const SCHEME_KEY = "podcast-picks-scheme";

function useColorScheme() {
  const osScheme = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";

  const [override, setOverride] = useState(() => {
    try { return localStorage.getItem(SCHEME_KEY); } catch { return null; }
  });

  // Follow OS changes only when no manual override
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => setOverride(prev => prev === null ? null : prev); // force re-render
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const scheme = override || osScheme;

  const toggleScheme = () => {
    const next = scheme === "dark" ? "light" : "dark";
    setOverride(next);
    try { localStorage.setItem(SCHEME_KEY, next); } catch {}
  };

  const resetScheme = () => {
    setOverride(null);
    try { localStorage.removeItem(SCHEME_KEY); } catch {}
  };

  return { scheme, toggleScheme, resetScheme, isManual: override !== null };
}

// ─── Theme toggle button ───────────────────────────────────
function ThemeToggle({ scheme, onToggle, accentColor }) {
  const isDark = scheme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? "ライトモードに切替" : "ダークモードに切替"}
      style={{
        position: "fixed", top: 16, right: 16, zIndex: 100,
        width: 40, height: 40, borderRadius: "50%",
        background: isDark ? "#ffffff14" : "#00000008",
        border: `1px solid ${isDark ? "#ffffff20" : "#00000012"}`,
        color: accentColor || (isDark ? "#f0f0f0" : "#1a1a2e"),
        fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.25s ease",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >{isDark ? "☀️" : "🌙"}</button>
  );
}

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

// ─── URL helpers ───────────────────────────────────────────
function normalizeUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ─── Fetch podcast info from iTunes Search ──────────────────
async function fetchPodcastInfo(title) {
  if (!title) return { artwork: null, appleUrl: null };
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=podcast&limit=3&lang=ja_jp`
    );
    const data = await res.json();
    const results = data.results || [];
    const normalize = s => s.toLowerCase().replace(/[\s\-_.:!?]+/g, "");
    const norm = normalize(title);
    const exact = results.find(r =>
      normalize(r.collectionName || "") === norm || normalize(r.trackName || "") === norm
    );
    const best = exact || results[0];
    if (!best) return { artwork: null, appleUrl: null };
    const artwork = (best.artworkUrl600 || best.artworkUrl100 || "").replace("100x100", "600x600");
    const appleUrl = best.collectionViewUrl || best.trackViewUrl || null;
    return { artwork, appleUrl };
  } catch { return { artwork: null, appleUrl: null }; }
}

function usePodcastInfo(title) {
  const [info, setInfo] = useState({ artwork: null, appleUrl: null, loading: false });

  useEffect(() => {
    if (!title) { setInfo({ artwork: null, appleUrl: null, loading: false }); return; }
    let cancelled = false;
    setInfo(prev => ({ ...prev, loading: true }));
    fetchPodcastInfo(title).then(result => {
      if (!cancelled) setInfo({ ...result, loading: false });
    });
    return () => { cancelled = true; };
  }, [title]);

  return info;
}

// ─── Palette (light / dark) ────────────────────────────────
const PALETTES = {
  dark: [
    { bg: "#0c0c1d", card: "#141430", accent: "#ff6b6b", text: "#f0f0f0", sub: "#8888aa", glow: "rgba(255,107,107,0.08)", shadow: "rgba(0,0,0,0.5)" },
    { bg: "#0a0f1a", card: "#111b2e", accent: "#64dfdf", text: "#eef",    sub: "#7799aa", glow: "rgba(100,223,223,0.08)", shadow: "rgba(0,0,0,0.5)" },
    { bg: "#120c18", card: "#1e1428", accent: "#c9a0ff", text: "#f0eef5", sub: "#9988aa", glow: "rgba(201,160,255,0.08)", shadow: "rgba(0,0,0,0.5)" },
    { bg: "#0f1410", card: "#182018", accent: "#95e77e", text: "#eef0ee", sub: "#88aa88", glow: "rgba(149,231,126,0.08)", shadow: "rgba(0,0,0,0.5)" },
  ],
  light: [
    { bg: "#faf7f7", card: "#ffffff", accent: "#d94555", text: "#1a1a2e", sub: "#7a7a90", glow: "rgba(217,69,85,0.06)",  shadow: "rgba(0,0,0,0.08)" },
    { bg: "#f4fafa", card: "#ffffff", accent: "#1a9e9e", text: "#102028", sub: "#5a7a80", glow: "rgba(26,158,158,0.06)", shadow: "rgba(0,0,0,0.08)" },
    { bg: "#f8f4fc", card: "#ffffff", accent: "#7b4cb8", text: "#1e1428", sub: "#7a6a8a", glow: "rgba(123,76,184,0.06)", shadow: "rgba(0,0,0,0.08)" },
    { bg: "#f3f8f2", card: "#ffffff", accent: "#3a8a2a", text: "#141e14", sub: "#6a8a6a", glow: "rgba(58,138,42,0.06)", shadow: "rgba(0,0,0,0.08)" },
  ],
};
function getPalette(name, scheme) {
  const list = PALETTES[scheme] || PALETTES.dark;
  return list[[...(name || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % list.length];
}

// ─── Editor theme (light / dark) ───────────────────────────
const EDITOR_THEMES = {
  dark: {
    bg: "#0c0c1d", bgEnd: "#050510",
    card: "#141430", input: "#0d0d20",
    text: "#f0f0f0", textInput: "#eee",
    sub: "#667", accent: "#ff6b6b",
    border: "#ffffff10", borderLight: "#ffffff08", borderFaint: "#ffffff06",
    urlText: "#778", reasonText: "#99a", counter: "#445", note: "#334",
    shareUrlBg: "#0a0a18",
    disabledBg: "#1a1a2e", disabledText: "#445",
    loadingBg: "#1a1a36", fallbackBg: (a) => `${a}12`,
    gradientBtn: "linear-gradient(135deg, #ff6b6b, #d94555)",
  },
  light: {
    bg: "#f8f6f9", bgEnd: "#eceaf0",
    card: "#ffffff", input: "#f0eef4",
    text: "#1a1a2e", textInput: "#222",
    sub: "#888", accent: "#d94555",
    border: "#00000010", borderLight: "#00000008", borderFaint: "#00000006",
    urlText: "#667", reasonText: "#778", counter: "#aab", note: "#99a",
    shareUrlBg: "#f0eff4",
    disabledBg: "#e0dee4", disabledText: "#aab",
    loadingBg: "#e0dee4", fallbackBg: (a) => `${a}0c`,
    gradientBtn: "linear-gradient(135deg, #d94555, #c03040)",
  },
};

// ─── Artwork (pure display) ─────────────────────────────────
function ArtworkImg({ src, loading, size, radius, accentColor, loadingBg, fallbackBg, shadowColor }) {
  const fallback = (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: fallbackBg || `${accentColor || "#ff6b6b"}12`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontSize: size * 0.38,
    }}>🎙️</div>
  );

  if (loading) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: loadingBg || "#1a1a36", flexShrink: 0,
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
      boxShadow: `0 6px 24px ${shadowColor || "rgba(0,0,0,0.5)"}`,
    }} />
  );
}

// ─── Spotify search URL (no API key needed) ────────────────
function spotifySearchUrl(title) {
  if (!title) return null;
  return `https://open.spotify.com/search/${encodeURIComponent(title)}/podcasts`;
}

// ─── Link pill component ────────────────────────────────────
function LinkPill({ href, icon, label, accentColor, isDark }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 11, fontFamily: "'Space Mono', monospace",
        color: accentColor, opacity: 0.75,
        background: isDark ? `${accentColor}10` : `${accentColor}08`,
        border: `1px solid ${isDark ? `${accentColor}20` : `${accentColor}15`}`,
        borderRadius: 999, padding: "5px 10px",
        textDecoration: "none", whiteSpace: "nowrap",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = `${accentColor}20`; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.background = isDark ? `${accentColor}10` : `${accentColor}08`; }}
    ><span style={{ fontSize: 13 }}>{icon}</span> {label}</a>
  );
}

// ─── Single podcast card (uses hook for fetch) ─────────────
function PodcastCard({ pick, index, total, palette: p, isDark, revealed }) {
  const { artwork, appleUrl, loading } = usePodcastInfo(pick.title);

  const userUrl = pick.url ? normalizeUrl(pick.url) : null;
  const spotifyUrl = spotifySearchUrl(pick.title);

  // Build links array: user URL, Apple, Spotify
  const links = [];
  if (userUrl)  links.push({ href: userUrl,    icon: "🔗", label: "サイト" });
  if (appleUrl) links.push({ href: appleUrl,   icon: "🍎", label: "Apple" });
  if (spotifyUrl) links.push({ href: spotifyUrl, icon: "🟢", label: "Spotify" });

  return (
    <div style={{
      background: p.card, borderRadius: 18, padding: 20,
      marginBottom: index < total - 1 ? 14 : 0,
      position: "relative", overflow: "hidden",
      opacity: revealed ? 1 : 0,
      transform: revealed ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
      transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${0.15 + index * 0.12}s`,
      border: isDark ? `1px solid ${p.accent}12` : `1px solid ${p.accent}18`,
      boxShadow: isDark ? "none" : `0 2px 12px ${p.shadow}`,
    }}>
      {/* Number */}
      <div style={{
        position: "absolute", top: 14, right: 16,
        fontFamily: "'Space Mono', monospace", fontSize: 11,
        color: p.accent, opacity: 0.5, fontWeight: 700,
      }}>#{index + 1}</div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <ArtworkImg
          src={artwork} loading={loading} size={64} radius={14}
          accentColor={p.accent}
          loadingBg={isDark ? "#1a1a36" : "#e0dee4"}
          fallbackBg={`${p.accent}${isDark ? "12" : "0c"}`}
          shadowColor={p.shadow}
        />
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
        </div>
      </div>

      {/* Link pills */}
      {links.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {links.map((l, i) => (
            <LinkPill key={i} href={l.href} icon={l.icon} label={l.label} accentColor={p.accent} isDark={isDark} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CardView ───────────────────────────────────────────────
function CardView({ name, picks, scheme, onToggleScheme }) {
  const p = getPalette(name, scheme);
  const isDark = scheme === "dark";
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const bgEnd = isDark ? "#050510" : "#eceaf0";

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 30% 0%, ${p.glow} 0%, transparent 60%), linear-gradient(170deg, ${p.bg} 0%, ${bgEnd} 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "36px 16px", fontFamily: "'Sora', sans-serif",
      transition: "background 0.3s",
    }}>
      <ThemeToggle scheme={scheme} onToggle={onToggleScheme} accentColor={p.accent} />
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
        {picks.map((pick, i) => (
          <PodcastCard
            key={i} pick={pick} index={i} total={picks.length}
            palette={p} isDark={isDark} revealed={revealed}
          />
        ))}

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <button
            onClick={handleCopy}
            style={{
              fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 500,
              color: isDark ? "#fff" : "#fff",
              background: `linear-gradient(135deg, ${p.accent}, ${p.accent}cc)`,
              border: "none", borderRadius: 999,
              padding: "10px 24px", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >{copied ? "✅ コピー完了！" : "🔗 シェアする"}</button>
          <button
            onClick={() => { window.location.hash = ""; window.location.reload(); }}
            style={{
              fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 500,
              color: p.accent, background: `${p.accent}10`,
              border: `1px solid ${p.accent}30`, borderRadius: 999,
              padding: "10px 24px", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${p.accent}25`}
            onMouseLeave={e => e.currentTarget.style.background = `${p.accent}10`}
          >✨ 自分のも作る</button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────
function Editor({ scheme, onToggleScheme }) {
  const t = EDITOR_THEMES[scheme] || EDITOR_THEMES.dark;

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
      background: `linear-gradient(170deg, ${t.bg} 0%, ${t.bgEnd} 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 16px 60px", fontFamily: "'Sora', sans-serif",
      transition: "background 0.3s",
    }}>
      <ThemeToggle scheme={scheme} onToggle={onToggleScheme} accentColor={t.accent} />
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36, maxWidth: 440, width: "100%" }}>
        <p style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11,
          color: t.accent, letterSpacing: 4, textTransform: "uppercase",
          margin: "0 0 10px", fontWeight: 700,
        }}>🎧 PODCAST PICKS</p>
        <h1 style={{ fontSize: 24, color: t.text, margin: 0, fontWeight: 600, letterSpacing: -0.5 }}>
          お気に入りPodcast 3選
        </h1>
        <p style={{ fontSize: 13, color: t.sub, margin: "10px 0 0", fontWeight: 300, lineHeight: 1.6 }}>
          タイトルを入力するだけでOK<br />
          アートワーク・Apple・Spotifyリンクは自動取得
        </p>
      </div>

      <div style={{ maxWidth: 440, width: "100%" }}>
        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: "block", fontSize: 11, color: t.sub, letterSpacing: 2,
            textTransform: "uppercase", marginBottom: 8,
            fontFamily: "'Space Mono', monospace",
          }}>表示名</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="your name" maxLength={30}
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: "'Sora', sans-serif", fontSize: 16,
              padding: "12px 16px", background: t.card,
              border: `1px solid ${t.border}`, borderRadius: 10,
              color: t.textInput, outline: "none",
            }}
          />
        </div>

        {/* Picks */}
        {picks.map((pick, i) => (
          <div key={pick.id} style={{
            background: t.card, borderRadius: 16, padding: 20,
            marginBottom: 14, border: `1px solid ${t.borderLight}`,
          }}>
            <div style={{
              fontSize: 13, color: t.accent,
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
                padding: "10px 14px", background: t.input,
                border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.textInput, outline: "none", marginBottom: 8,
              }}
            />

            <input
              type="url" value={pick.url}
              onChange={e => updatePick(pick.id, "url", e.target.value)}
              placeholder="リンク（任意 / 番組サイト等。Apple・Spotifyは自動）"
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "'Space Mono', monospace", fontSize: 12,
                padding: "10px 14px", background: t.input,
                border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.urlText, outline: "none", marginBottom: 8,
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
                padding: "10px 14px", background: t.input,
                border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.reasonText, outline: "none", resize: "none",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: t.counter, marginTop: 2 }}>
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
              color: isValid ? "#fff" : t.disabledText,
              background: isValid ? t.gradientBtn : t.disabledBg,
              border: "none", borderRadius: 10, padding: "14px 16px",
              cursor: isValid ? "pointer" : "not-allowed", transition: "all 0.2s",
            }}
          >👀 プレビュー</button>

          <button
            disabled={!isValid} onClick={handleCopy}
            style={{
              flex: 1, minWidth: 130,
              fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600,
              color: isValid ? t.accent : t.disabledText,
              background: isValid ? `${t.accent}10` : t.disabledBg,
              border: isValid ? `1px solid ${t.accent}30` : `1px solid ${t.borderLight}`,
              borderRadius: 10, padding: "14px 16px",
              cursor: isValid ? "pointer" : "not-allowed", transition: "all 0.2s",
            }}
          >{copied ? "✅ コピー完了！" : "🔗 リンクをコピー"}</button>
        </div>

        {shareUrl && (
          <div style={{
            marginTop: 14, padding: "10px 14px",
            background: t.shareUrlBg, borderRadius: 8,
            fontSize: 10, color: t.counter, wordBreak: "break-all",
            lineHeight: 1.7, border: `1px solid ${t.borderFaint}`,
            fontFamily: "'Space Mono', monospace",
          }}>{shareUrl}</div>
        )}

      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────
export default function App() {
  const { scheme, toggleScheme } = useColorScheme();
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
  if (mode === "view" && viewData) {
    return <CardView name={viewData.name} picks={viewData.picks} scheme={scheme} onToggleScheme={toggleScheme} />;
  }
  return <Editor scheme={scheme} onToggleScheme={toggleScheme} />;
}
