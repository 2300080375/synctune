import { useState, useEffect, useRef } from 'react';
import { emitChatMessage } from '../socket';

// ─── Emoji Data ───────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    label: '😀', name: 'Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🥴','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥳','🤠','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    label: '👍', name: 'Gestures',
    emojis: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','👂','🦻','👃','👀','👁️','👅','👄'],
  },
  {
    label: '❤️', name: 'Hearts',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','❤️‍🔥','❤️‍🩹','💋','💌','💍','💎'],
  },
  {
    label: '🎵', name: 'Music',
    emojis: ['🎵','🎶','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🪗','🎙️','📻','🔊','🔉','🔈','🔇','🎚️','🎛️','📯','🪘'],
  },
  {
    label: '🔥', name: 'Popular',
    emojis: ['🔥','✨','⭐','🌟','💫','⚡','🎉','🎊','🎈','🎁','🏆','🥇','🎯','🚀','💯','‼️','❗','❓','💢','💥','💦','💨','🌈','☀️','🌙','⛄','🌊','🍕','🍔','🎂','🍰','🥂','🍻','☕','🧃','🌺','🌸','🌹','🌻'],
  },
];

// ─── Sticker Data ─────────────────────────────────────────────────────────────
const STICKER_PACKS = [
  {
    name: 'Vibes',
    stickers: [
      { id: 's1',  emoji: '🎵', label: 'Music Vibes', bg: 'linear-gradient(135deg,#7c3aed,#db2777)' },
      { id: 's2',  emoji: '🔥', label: 'Fire',        bg: 'linear-gradient(135deg,#f97316,#ef4444)' },
      { id: 's3',  emoji: '💯', label: 'Perfect',     bg: 'linear-gradient(135deg,#10b981,#059669)' },
      { id: 's4',  emoji: '🚀', label: 'Rocket',      bg: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' },
      { id: 's5',  emoji: '🎉', label: 'Party',       bg: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
      { id: 's6',  emoji: '👑', label: 'King',        bg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
      { id: 's7',  emoji: '💎', label: 'Diamond',     bg: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
      { id: 's8',  emoji: '🎯', label: 'On Point',    bg: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
    ],
  },
  {
    name: 'Moods',
    stickers: [
      { id: 's9',  emoji: '😭', label: 'Crying',      bg: 'linear-gradient(135deg,#60a5fa,#3b82f6)' },
      { id: 's10', emoji: '😂', label: 'Dead',        bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
      { id: 's11', emoji: '🥺', label: 'Pleading',    bg: 'linear-gradient(135deg,#f472b6,#ec4899)' },
      { id: 's12', emoji: '😤', label: 'Annoyed',     bg: 'linear-gradient(135deg,#f87171,#ef4444)' },
      { id: 's13', emoji: '🤩', label: 'Starstruck',  bg: 'linear-gradient(135deg,#fbbf24,#ec4899)' },
      { id: 's14', emoji: '🥳', label: 'Party Mode',  bg: 'linear-gradient(135deg,#a78bfa,#ec4899)' },
      { id: 's15', emoji: '😎', label: 'Cool',        bg: 'linear-gradient(135deg,#34d399,#059669)' },
      { id: 's16', emoji: '🤯', label: 'Mind Blown',  bg: 'linear-gradient(135deg,#f97316,#dc2626)' },
    ],
  },
  {
    name: 'Music',
    stickers: [
      { id: 's17', emoji: '🎸', label: 'Guitar',      bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)' },
      { id: 's18', emoji: '🥁', label: 'Drums',       bg: 'linear-gradient(135deg,#dc2626,#b91c1c)' },
      { id: 's19', emoji: '🎹', label: 'Piano',       bg: 'linear-gradient(135deg,#374151,#1f2937)' },
      { id: 's20', emoji: '🎤', label: 'Mic Drop',    bg: 'linear-gradient(135deg,#ec4899,#db2777)' },
      { id: 's21', emoji: '🎧', label: 'Headphones',  bg: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
      { id: 's22', emoji: '🎷', label: 'Sax',         bg: 'linear-gradient(135deg,#d97706,#b45309)' },
      { id: 's23', emoji: '🎺', label: 'Trumpet',     bg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
      { id: 's24', emoji: '🎻', label: 'Violin',      bg: 'linear-gradient(135deg,#92400e,#78350f)' },
    ],
  },
];

// ─── GIF via Tenor ────────────────────────────────────────────────────────────
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPmasa5gSpV4bJj8';

const parseGifs = (results) =>
  (results || []).map(r => ({
    id: r.id,
    url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
    title: r.content_description,
  })).filter(g => g.url);

async function fetchGifs(query) {
  const endpoint = query
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=20&media_filter=gif`
    : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=gif`;
  const res = await fetch(endpoint);
  const data = await res.json();
  return parseGifs(data.results);
}

// ─── Message bubble content ───────────────────────────────────────────────────
function MessageContent({ msg }) {
  if (msg.msgType === 'sticker') {
    const sticker = STICKER_PACKS.flatMap(p => p.stickers).find(s => s.id === msg.stickerId);
    return (
      <div style={{
        width: '80px', height: '80px', borderRadius: '16px',
        background: sticker?.bg || 'linear-gradient(135deg,#7c3aed,#db2777)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '38px', boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}>
        {sticker?.emoji || '🎵'}
      </div>
    );
  }
  if (msg.msgType === 'gif') {
    return (
      <img
        src={msg.gifUrl}
        alt={msg.gifTitle || 'GIF'}
        style={{ maxWidth: '180px', borderRadius: '12px', display: 'block' }}
        loading="lazy"
      />
    );
  }
  return <span>{msg.text}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Chat({ roomId, userName, messages = [], onNewMessage }) {
  const [input, setInput]             = useState('');
  const [panel, setPanel]             = useState(null); // null | 'emoji' | 'sticker' | 'gif'
  const [emojiCat, setEmojiCat]       = useState(0);
  const [stickerPack, setStickerPack] = useState(0);
  const [gifQuery, setGifQuery]       = useState('');
  const [gifs, setGifs]               = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);

  const bottomRef   = useRef(null);
  const msgBoxRef   = useRef(null);
  const inputRef    = useRef(null);
  const panelRef    = useRef(null);

  // scrollbar
  const [thumbH, setThumbH]     = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragY    = useRef(0);
  const dragTop  = useRef(0);

  // ── auto scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── scrollbar
  const updateThumb = () => {
    const el = msgBoxRef.current; if (!el) return;
    const ratio = el.clientHeight / el.scrollHeight;
    const h = Math.max(ratio * el.clientHeight, 30);
    const t = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (el.clientHeight - h);
    setThumbH(h); setThumbTop(isNaN(t) ? 0 : t);
  };
  useEffect(() => {
    const el = msgBoxRef.current; if (!el) return;
    el.addEventListener('scroll', updateThumb); updateThumb();
    return () => el.removeEventListener('scroll', updateThumb);
  }, [messages]);

  useEffect(() => {
    const move = (e) => {
      if (!dragging || !msgBoxRef.current) return;
      const el = msgBoxRef.current;
      el.scrollTop = dragTop.current + (e.clientY - dragY.current) * (el.scrollHeight / el.clientHeight);
    };
    const up = () => setDragging(false);
    if (dragging) { window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); }
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging]);

  // ── close panel on outside click
  useEffect(() => {
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setPanel(null); };
    if (panel) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [panel]);

  // ── load GIFs when panel opens
  useEffect(() => {
    if (panel === 'gif' && gifs.length === 0) {
      setGifsLoading(true);
      fetchGifs('').then(g => { setGifs(g); setGifsLoading(false); }).catch(() => setGifsLoading(false));
    }
  }, [panel]);

  const togglePanel = (name) => { setPanel(p => p === name ? null : name); };

  // ── senders
  const buildMsg = (extra) => ({
    user: userName,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'chat', isOwn: true, ...extra,
  });

  const sendText = (e) => {
    e?.preventDefault();
    const text = input.trim(); if (!text) return;
    const msg = buildMsg({ text, msgType: 'text' });
    onNewMessage(msg);
    emitChatMessage(roomId, userName, text, 'text');
    setInput(''); setPanel(null);
  };

  const sendEmoji = (em) => { setInput(p => p + em); inputRef.current?.focus(); };

  const sendSticker = (sticker) => {
    const msg = buildMsg({ text: '', msgType: 'sticker', stickerId: sticker.id });
    onNewMessage(msg);
    emitChatMessage(roomId, userName, '', 'sticker', { stickerId: sticker.id });
    setPanel(null);
  };

  const sendGif = (gif) => {
    const msg = buildMsg({ text: '', msgType: 'gif', gifUrl: gif.url, gifTitle: gif.title });
    onNewMessage(msg);
    emitChatMessage(roomId, userName, '', 'gif', { gifUrl: gif.url, gifTitle: gif.title });
    setPanel(null);
  };

  const handleGifSearch = async (e) => {
    e?.preventDefault(); setGifsLoading(true);
    const g = await fetchGifs(gifQuery).catch(() => []);
    setGifs(g); setGifsLoading(false);
  };

  const showThumb = thumbH < (msgBoxRef.current?.clientHeight || 0);

  // ── shared icon btn style
  const iconBtn = (active) => ({
    background: active ? 'rgba(167,139,250,0.12)' : 'transparent',
    border: 'none', cursor: 'pointer', padding: '5px', borderRadius: '8px',
    color: active ? '#a78bfa' : '#55546a', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'color 0.15s, background 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* ── MESSAGES ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex' }}>
        <div ref={msgBoxRef} style={{ flex: 1, overflowY: 'scroll', padding: '12px 6px 12px 12px', display: 'flex', flexDirection: 'column', gap: '6px', scrollbarWidth: 'none' }}>
          <style>{`
            div::-webkit-scrollbar{display:none}
            @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
            @keyframes stickerPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
          `}</style>

          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#55546a' }}>
              <div style={{ fontSize: '30px' }}>💬</div>
              <p style={{ fontSize: '13px' }}>Start the conversation!</p>
              <p style={{ fontSize: '11px', color: '#3d3c52' }}>Emojis • Stickers • GIFs</p>
            </div>
          ) : messages.map((msg, i) => {
            if (msg.type === 'system') return (
              <div key={i} style={{ textAlign: 'center', margin: '4px 0' }}>
                <span style={{ fontSize: '11px', color: '#55546a', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: '99px' }}>{msg.text}</span>
              </div>
            );

            const isOwn  = msg.isOwn || msg.user === userName;
            const isMedia = msg.msgType === 'sticker' || msg.msgType === 'gif';

            return (
              <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: isOwn ? 'flex-end' : 'flex-start', animation: 'msgIn 0.18s ease' }}>
                {!isOwn && (
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `hsl(${(msg.user?.charCodeAt(0)||0)*42%360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0, alignSelf: 'flex-end' }}>
                    {msg.user?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {!isOwn && <p style={{ fontSize: '10px', color: '#55546a', paddingLeft: '4px' }}>{msg.user}</p>}

                  <div style={{ animation: msg.msgType === 'sticker' ? 'stickerPop 0.35s cubic-bezier(.175,.885,.32,1.275)' : 'none' }}>
                    {isMedia ? (
                      <MessageContent msg={msg} />
                    ) : (
                      <div style={{ padding: '8px 12px', borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isOwn ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.05)', border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: isOwn ? 'white' : '#c4c3de', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        <MessageContent msg={msg} />
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: '10px', color: '#3d3c52', paddingLeft: '4px', paddingRight: '4px' }}>{msg.time}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Scrollbar track (always visible, click to jump) ── */}
        <div
          style={{ width: '16px', position: 'relative', flexShrink: 0, margin: '6px 2px', cursor: 'pointer', userSelect: 'none' }}
          onClick={(e) => {
            const el = msgBoxRef.current; if (!el) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientY - rect.top) / rect.height;
            el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
          }}
        >
          {/* Track groove */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.04)' }} />

          {/* Draggable thumb */}
          {showThumb && (
            <div
              onMouseDown={(e) => {
                e.preventDefault(); e.stopPropagation();
                setDragging(true);
                dragY.current = e.clientY;
                dragTop.current = msgBoxRef.current?.scrollTop || 0;
              }}
              onMouseEnter={e => {
                if (!dragging) {
                  e.currentTarget.style.width = '10px';
                  e.currentTarget.style.background = 'linear-gradient(180deg,#c4b5fd,#7c3aed)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(167,139,250,0.6)';
                }
              }}
              onMouseLeave={e => {
                if (!dragging) {
                  e.currentTarget.style.width = '8px';
                  e.currentTarget.style.background = 'rgba(167,139,250,0.6)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              style={{
                position: 'absolute',
                left: '50%', transform: 'translateX(-50%)',
                top: `${thumbTop}px`,
                height: `${thumbH}px`,
                width: dragging ? '10px' : '8px',
                borderRadius: '99px',
                background: dragging ? 'linear-gradient(180deg,#c4b5fd,#7c3aed)' : 'rgba(167,139,250,0.6)',
                cursor: dragging ? 'grabbing' : 'grab',
                boxShadow: dragging ? '0 0 12px rgba(167,139,250,0.8)' : 'none',
                transition: dragging ? 'none' : 'width 0.15s, background 0.15s, box-shadow 0.15s',
                userSelect: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* ── FLOATING PANEL ── */}
      {panel && (
        <div ref={panelRef} style={{ position: 'absolute', bottom: '58px', left: '8px', right: '8px', background: 'rgba(16,16,26,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 -8px 32px rgba(0,0,0,0.55)', backdropFilter: 'blur(24px)', zIndex: 50, height: '260px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── EMOJI ── */}
          {panel === 'emoji' && (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                {EMOJI_CATEGORIES.map((cat, ci) => (
                  <button key={ci} onClick={() => setEmojiCat(ci)} title={cat.name}
                    style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'transparent', fontSize: '16px', cursor: 'pointer', borderBottom: emojiCat === ci ? '2px solid #a78bfa' : '2px solid transparent', opacity: emojiCat === ci ? 1 : 0.45, transition: 'opacity 0.15s' }}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '1px', alignContent: 'flex-start' }}>
                {EMOJI_CATEGORIES[emojiCat].emojis.map((em, ei) => (
                  <button key={ei} onClick={() => sendEmoji(em)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', padding: '4px', borderRadius: '8px', lineHeight: 1, transition: 'transform 0.1s, background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}>
                    {em}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STICKERS ── */}
          {panel === 'sticker' && (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: '0 8px' }}>
                {STICKER_PACKS.map((pack, pi) => (
                  <button key={pi} onClick={() => setStickerPack(pi)}
                    style={{ padding: '9px 12px', border: 'none', background: 'transparent', color: stickerPack === pi ? '#a78bfa' : '#55546a', fontSize: '11px', fontWeight: 600, cursor: 'pointer', borderBottom: stickerPack === pi ? '2px solid #a78bfa' : '2px solid transparent', transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
                    {pack.name}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {STICKER_PACKS[stickerPack].stickers.map(s => (
                  <button key={s.id} onClick={() => sendSticker(s)} title={s.label}
                    style={{ background: s.bg, border: 'none', borderRadius: '14px', aspectRatio: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'; }}>
                    {s.emoji}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── GIFs ── */}
          {panel === 'gif' && (
            <>
              <form onSubmit={handleGifSearch} style={{ display: 'flex', gap: '8px', padding: '8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  value={gifQuery} onChange={e => setGifQuery(e.target.value)}
                  placeholder="Search GIFs..."
                  style={{ flex: 1, padding: '7px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f0ff', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="submit" style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>🔍</button>
              </form>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {gifsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#55546a', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Loading GIFs...
                  </div>
                ) : gifs.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#55546a', fontSize: '13px' }}>No GIFs found</div>
                ) : (
                  <>
                    <div style={{ columns: '2', columnGap: '6px' }}>
                      {gifs.map(gif => (
                        <div key={gif.id} onClick={() => sendGif(gif)}
                          style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '6px', cursor: 'pointer', breakInside: 'avoid', border: '2px solid transparent', transition: 'border-color 0.15s, transform 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}>
                          <img src={gif.preview} alt={gif.title} style={{ width: '100%', display: 'block', borderRadius: '6px' }} loading="lazy" />
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px 0 2px', fontSize: '10px', color: '#3d3c52' }}>Powered by Tenor</div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', minWidth: 0 }}>

          {/* Emoji 😊 */}
          <button onClick={() => togglePanel('emoji')} title="Emoji" style={iconBtn(panel === 'emoji')}
            onMouseEnter={e => { if (panel !== 'emoji') e.currentTarget.style.color = '#a78bfa'; }}
            onMouseLeave={e => { if (panel !== 'emoji') e.currentTarget.style.color = '#55546a'; }}>
            <span style={{ fontSize: '19px', lineHeight: 1 }}>😊</span>
          </button>

          {/* Sticker 🎭 */}
          <button onClick={() => togglePanel('sticker')} title="Stickers" style={iconBtn(panel === 'sticker')}
            onMouseEnter={e => { if (panel !== 'sticker') e.currentTarget.style.color = '#a78bfa'; }}
            onMouseLeave={e => { if (panel !== 'sticker') e.currentTarget.style.color = '#55546a'; }}>
            <span style={{ fontSize: '19px', lineHeight: 1 }}>🎭</span>
          </button>

          {/* GIF badge */}
          <button onClick={() => togglePanel('gif')} title="GIFs"
            style={{ background: panel === 'gif' ? 'rgba(167,139,250,0.12)' : 'transparent', border: `1.5px solid ${panel === 'gif' ? '#a78bfa' : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', padding: '3px 5px', borderRadius: '6px', color: panel === 'gif' ? '#a78bfa' : '#55546a', fontSize: '10px', fontWeight: 800, letterSpacing: '-0.3px', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { if (panel !== 'gif') { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = '#a78bfa'; }}}
            onMouseLeave={e => { if (panel !== 'gif') { e.currentTarget.style.color = '#55546a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}}>
            GIF
          </button>

          {/* Text input + send — flex:1 with minWidth:0 so it shrinks but send btn stays */}
          <form onSubmit={sendText} style={{ flex: 1, minWidth: 0, display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text" placeholder="Message..." value={input}
              onChange={e => setInput(e.target.value)} maxLength={300}
              style={{ flex: 1, minWidth: 0, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#f1f0ff', fontSize: '13px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.4)'; setPanel(null); }}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
            {/* Send button — flexShrink:0 so it NEVER disappears */}
            <button type="submit" disabled={!input.trim()}
              style={{ width: '34px', height: '34px', minWidth: '34px', borderRadius: '10px', border: 'none', background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)', color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() ? '0 2px 12px rgba(124,58,237,0.4)' : 'none', transition: 'background 0.2s, box-shadow 0.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}