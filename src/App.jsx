import { useState, useEffect } from "react";
import { encodeState, decodeState as decodeStateRaw } from "./codec.js";

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

// ─── Decode with id (App needs id for React keys) ──────────
async function decodeState(encoded, version) {
  const data = await decodeStateRaw(encoded, version);
  if (!data) return null;
  return {
    ...data,
    picks: data.picks.map((p, i) => ({ id: i, ...p })),
  };
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
  if (!title) return { artwork: null, appleUrl: null, name: null, candidates: [] };
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=podcast&limit=5&lang=ja_jp`
    );
    const data = await res.json();
    const results = data.results || [];
    const candidates = results.map(r => ({
      name: r.collectionName || r.trackName || "",
      artwork: (r.artworkUrl600 || r.artworkUrl100 || "").replace("100x100", "600x600"),
      appleUrl: r.collectionViewUrl || r.trackViewUrl || null,
    }));
    const normalize = s => s.toLowerCase().replace(/[\s\-_.:!?]+/g, "");
    const norm = normalize(title);
    const exact = results.find(r =>
      normalize(r.collectionName || "") === norm || normalize(r.trackName || "") === norm
    );
    const best = exact || results[0];
    if (!best) return { artwork: null, appleUrl: null, name: null, candidates };
    const artwork = (best.artworkUrl600 || best.artworkUrl100 || "").replace("100x100", "600x600");
    const appleUrl = best.collectionViewUrl || best.trackViewUrl || null;
    const name = best.collectionName || best.trackName || null;
    return { artwork, appleUrl, name, candidates };
  } catch { return { artwork: null, appleUrl: null, name: null, candidates: [] }; }
}

function usePodcastInfo(title, debounceMs = 0) {
  const [info, setInfo] = useState({ artwork: null, appleUrl: null, name: null, candidates: [], loading: false });
  const [debounced, setDebounced] = useState(title);

  useEffect(() => {
    if (debounceMs <= 0) { setDebounced(title); return; }
    const timer = setTimeout(() => setDebounced(title), debounceMs);
    return () => clearTimeout(timer);
  }, [title, debounceMs]);

  useEffect(() => {
    if (!debounced) { setInfo({ artwork: null, appleUrl: null, name: null, candidates: [], loading: false }); return; }
    let cancelled = false;
    setInfo(prev => ({ ...prev, loading: true }));
    fetchPodcastInfo(debounced).then(result => {
      if (!cancelled) setInfo({ ...result, loading: false });
    });
    return () => { cancelled = true; };
  }, [debounced]);

  return info;
}

// ─── Palette (light / dark) ────────────────────────────────
const PALETTES = {
  dark: [
    { bg: "#0c0c1d", card: "#141430", accent: "#ff6b6b", text: "#f0f0f0", sub: "#b8b8d0", glow: "rgba(255,107,107,0.08)", shadow: "rgba(0,0,0,0.5)" },
    { bg: "#0a0f1a", card: "#111b2e", accent: "#64dfdf", text: "#eef",    sub: "#a8c8d0", glow: "rgba(100,223,223,0.08)", shadow: "rgba(0,0,0,0.5)" },
    { bg: "#120c18", card: "#1e1428", accent: "#c9a0ff", text: "#f0eef5", sub: "#c0b0d0", glow: "rgba(201,160,255,0.08)", shadow: "rgba(0,0,0,0.5)" },
    { bg: "#0f1410", card: "#182018", accent: "#95e77e", text: "#eef0ee", sub: "#b0d0b0", glow: "rgba(149,231,126,0.08)", shadow: "rgba(0,0,0,0.5)" },
  ],
  light: [
    { bg: "#faf7f7", card: "#ffffff", accent: "#d94555", text: "#1a1a2e", sub: "#555568", glow: "rgba(217,69,85,0.06)",  shadow: "rgba(0,0,0,0.08)" },
    { bg: "#f4fafa", card: "#ffffff", accent: "#1a9e9e", text: "#102028", sub: "#3a5a62", glow: "rgba(26,158,158,0.06)", shadow: "rgba(0,0,0,0.08)" },
    { bg: "#f8f4fc", card: "#ffffff", accent: "#7b4cb8", text: "#1e1428", sub: "#5a4a6a", glow: "rgba(123,76,184,0.06)", shadow: "rgba(0,0,0,0.08)" },
    { bg: "#f3f8f2", card: "#ffffff", accent: "#3a8a2a", text: "#141e14", sub: "#4a6a4a", glow: "rgba(58,138,42,0.06)", shadow: "rgba(0,0,0,0.08)" },
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
  const { artwork, appleUrl, loading, name: matchedName } = usePodcastInfo(pick.title);

  // Only show artwork when iTunes name matches the title exactly (normalized)
  const norm = s => s.toLowerCase().replace(/[\s\-_.:!?]+/g, "");
  const isExactMatch = matchedName && norm(matchedName) === norm(pick.title);
  const displayArtwork = isExactMatch ? artwork : null;

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
          src={displayArtwork} loading={loading} size={64} radius={14}
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
              lineHeight: 1.55, fontWeight: 400, wordBreak: "break-word",
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
function CardView({ name, picks, scheme, onToggleScheme, isOwnPreview, onBackToEdit, onCreateOwn }) {
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
            onClick={isOwnPreview ? onBackToEdit : onCreateOwn}
            style={{
              fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 500,
              color: p.accent, background: `${p.accent}10`,
              border: `1px solid ${p.accent}30`, borderRadius: 999,
              padding: "10px 24px", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${p.accent}25`}
            onMouseLeave={e => e.currentTarget.style.background = `${p.accent}10`}
          >{isOwnPreview ? "✏️ 編集に戻る" : "✨ 自分のも作る"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor pick card (with artwork preview) ───────────────
function EditorPick({ pick, index, theme: t, updatePick, NUM }) {
  const { artwork, loading, name: suggestedName, candidates } = usePodcastInfo(pick.title, 500);
  const isDark = t === EDITOR_THEMES.dark;
  const [artworkDismissed, setArtworkDismissed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Reset dismissed when search result changes
  useEffect(() => { setArtworkDismissed(false); }, [artwork]);

  const showArtwork = pick.title.trim() && !artworkDismissed;

  // Dropdown candidates (exclude exact match)
  const dropdownCandidates = (dropdownOpen && pick.title.trim())
    ? candidates.filter(c => c.name !== pick.title)
    : [];

  const handleSelect = (candidate) => {
    updatePick(pick.id, "title", candidate.name);
    setDropdownOpen(false);
  };

  // Ghost autocomplete
  const completionText = (() => {
    if (!suggestedName || !pick.title.trim()) return null;
    if (suggestedName.toLowerCase().startsWith(pick.title.toLowerCase()) && suggestedName !== pick.title) {
      return suggestedName.slice(pick.title.length);
    }
    return null;
  })();

  const handleKeyDown = (e) => {
    if (e.key === "Tab" && completionText) {
      e.preventDefault();
      updatePick(pick.id, "title", pick.title + completionText);
      setDropdownOpen(false);
    }
    if (e.key === "Escape") setDropdownOpen(false);
  };

  const titleInputStyle = {
    fontFamily: "'Sora', sans-serif", fontSize: 15,
    padding: "10px 14px", lineHeight: "1.5",
  };

  return (
    <div style={{
      background: t.card, borderRadius: 16, padding: 20,
      marginBottom: 14, border: `1px solid ${t.borderLight}`,
    }}>
      <div style={{
        fontSize: 13, color: t.accent,
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700, marginBottom: 14, letterSpacing: 1,
      }}>{NUM[index]} PICK</div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Artwork preview */}
        {showArtwork && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ArtworkImg
              src={artwork} loading={loading} size={48} radius={10}
              accentColor={t.accent}
              loadingBg={isDark ? "#1a1a36" : "#e0dee4"}
              fallbackBg={`${t.accent}${isDark ? "12" : "0c"}`}
              shadowColor={isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.08)"}
            />
            {artwork && !loading && (
              <button
                onClick={() => setArtworkDismissed(true)}
                aria-label="アートワークを非表示"
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 18, height: 18, borderRadius: "50%",
                  background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)",
                  color: "#fff", border: "none", fontSize: 11,
                  cursor: "pointer", padding: 0, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title input with ghost autocomplete + dropdown */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type="text" value={pick.title}
              onChange={e => { updatePick(pick.id, "title", e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setDropdownOpen(false)}
              onKeyDown={handleKeyDown}
              placeholder="ポッドキャスト名"
              maxLength={80}
              autoComplete="off"
              style={{
                width: "100%", boxSizing: "border-box",
                ...titleInputStyle,
                background: t.input,
                border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.textInput, outline: "none",
              }}
            />
            {/* Ghost completion text */}
            {completionText && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  ...titleInputStyle,
                  pointerEvents: "none",
                  whiteSpace: "nowrap", overflow: "hidden",
                  borderRadius: 8,
                  border: "1px solid transparent",
                }}
              >
                <span style={{ visibility: "hidden" }}>{pick.title}</span>
                <span style={{ color: t.sub, opacity: 0.4 }}>{completionText}</span>
              </div>
            )}
            {/* Dropdown candidates */}
            {dropdownCandidates.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: t.card,
                border: `1px solid ${isDark ? "#ffffff15" : "#00000012"}`,
                borderRadius: 10, marginTop: 4, zIndex: 20,
                boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}>
                {dropdownCandidates.map((c, i) => (
                  <div
                    key={i}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelect(c)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", cursor: "pointer",
                      borderBottom: i < dropdownCandidates.length - 1 ? `1px solid ${t.borderLight}` : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? "#ffffff08" : "#00000004"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {c.artwork && (
                      <img src={c.artwork} alt="" style={{
                        width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0,
                      }} />
                    )}
                    <span style={{
                      fontSize: 13, color: t.textInput,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        </div>
      </div>

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
  );
}

// ─── Editor ─────────────────────────────────────────────────
function Editor({ name, setName, picks, setPicks, scheme, onToggleScheme, onPreview }) {
  const t = EDITOR_THEMES[scheme] || EDITOR_THEMES.dark;
  const [copied, setCopied] = useState(false);

  const updatePick = (id, field, value) => {
    setPicks(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const filledPicks = picks.filter(p => p.title.trim());
  const isValid = name.trim() && filledPicks.length >= 1;

  const [shareUrl, setShareUrl] = useState("");
  const picksKey = JSON.stringify(picks.map(p => [p.title, p.reason, p.url]));
  useEffect(() => {
    const filled = picks.filter(p => p.title.trim());
    const valid = name.trim() && filled.length >= 1;
    if (!valid) { setShareUrl(""); return; }
    let cancelled = false;
    encodeState(name.trim(), filled).then(encoded => {
      if (!cancelled) {
        setShareUrl(`${window.location.origin}${window.location.pathname}?v=2&d=${encodeURIComponent(encoded)}`);
      }
    });
    return () => { cancelled = true; };
  }, [name, picksKey]);

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
          <EditorPick key={pick.id} pick={pick} index={i} theme={t} updatePick={updatePick} NUM={NUM} />
        ))}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <button
            disabled={!isValid}
            onClick={onPreview}
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
const EMPTY_PICKS = () => [
  { id: 0, title: "", reason: "", url: "" },
  { id: 1, title: "", reason: "", url: "" },
  { id: 2, title: "", reason: "", url: "" },
];

export default function App() {
  const { scheme, toggleScheme } = useColorScheme();
  const [mode, setMode] = useState("loading");
  const [isOwnPreview, setIsOwnPreview] = useState(false);

  // Editor state (lifted up so it survives preview ↔ edit toggle)
  const [name, setName] = useState("");
  const [picks, setPicks] = useState(EMPTY_PICKS);

  // View data (from URL or preview)
  const [viewData, setViewData] = useState(null);

  // Initial load
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);

    (async () => {
      // Migrate old #hash URLs to ?d= (v2 compressed) and redirect
      const hash = window.location.hash.slice(1);
      if (hash) {
        const data = await decodeState(hash, null);
        if (data && data.picks.length > 0) {
          const encoded = await encodeState(data.name, data.picks);
          const url = new URL(window.location);
          url.searchParams.set("v", "2");
          url.searchParams.set("d", encoded);
          url.hash = "";
          window.location.replace(url.toString());
          return;
        }
      }

      const params = new URLSearchParams(window.location.search);
      const param = params.get("d");
      const version = params.get("v");
      if (param) {
        const data = await decodeState(param, version);
        if (data && data.picks.length > 0) {
          setViewData(data);
          setIsOwnPreview(false);
          setMode("view");
          return;
        }
      }
      setMode("edit");
    })();
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = async () => {
      const params = new URLSearchParams(window.location.search);
      const param = params.get("d");
      if (param) {
        const data = await decodeState(param, params.get("v"));
        if (data && data.picks.length > 0) {
          setViewData(data);
          setMode("view");
          return;
        }
      }
      setMode("edit");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Preview: switch to card view without page reload
  const handlePreview = async () => {
    const filled = picks.filter(p => p.title.trim());
    if (!name.trim() || filled.length === 0) return;
    const encoded = await encodeState(name.trim(), filled);
    const url = new URL(window.location);
    url.searchParams.set("v", "2");
    url.searchParams.set("d", encoded);
    history.pushState(null, "", url.toString());
    setViewData({ name: name.trim(), picks: filled });
    setIsOwnPreview(true);
    setMode("view");
  };

  // Back to editor (preserves state)
  const handleBackToEdit = () => {
    history.pushState(null, "", window.location.pathname);
    setMode("edit");
  };

  // Create your own (resets state)
  const handleCreateOwn = () => {
    setName("");
    setPicks(EMPTY_PICKS);
    history.pushState(null, "", window.location.pathname);
    setMode("edit");
  };

  if (mode === "loading") return null;
  if (mode === "view" && viewData) {
    return (
      <CardView
        name={viewData.name} picks={viewData.picks}
        scheme={scheme} onToggleScheme={toggleScheme}
        isOwnPreview={isOwnPreview}
        onBackToEdit={handleBackToEdit}
        onCreateOwn={handleCreateOwn}
      />
    );
  }
  return (
    <Editor
      name={name} setName={setName}
      picks={picks} setPicks={setPicks}
      scheme={scheme} onToggleScheme={toggleScheme}
      onPreview={handlePreview}
    />
  );
}
