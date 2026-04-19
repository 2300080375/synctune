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

// ─── Sticker Packs ────────────────────────────────────────────────────────────
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

// ─── Tenor GIF API ────────────────────────────────────────────────────────────
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPmasa5gSpV4bJj8';

const parseGifs = (results) =>
  (results || []).map(r => ({
    id: r.id,
    url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    preview: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url || r.media_formats?.gif?.url,
    title: r.content_description,
  })).filter(g => g.url);

async function fetchGifs(query) {
  const params = new URLSearchParams({
    key: TENOR_KEY,
    limit: '24',
    media_filter: 'tinygif,gif',
    contentfilter: 'medium',
    ...(query ? { q: query } : {}),
  });
  const base = 'https://tenor.googleapis.com/v2';
  const url = query ? `${base}/search?${params}` : `${base}/featured?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  const data = await res.json();
  return parseGifs(data.results);
}

// ─── Message Content Renderer ─────────────────────────────────────────────────
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
    return <img src={msg.gifUrl} alt={msg.gifTitle || 'GIF'} style={{ maxWidth: '180px', borderRadius: '12px', display: 'block' }} loading="lazy" />;
  }
  if (msg.msgType === 'upload-image') {
    return <img src={msg.uploadData} alt={msg.uploadName || 'image'} style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '12px', display: 'block', objectFit: 'cover' }} loading="lazy" />;
  }
  if (msg.msgType === 'upload-gif') {
    return <img src={msg.uploadData} alt={msg.uploadName || 'GIF'} style={{ maxWidth: '200px', borderRadius: '12px', display: 'block' }} loading="lazy" />;
  }
  if (msg.msgType === 'upload-video') {
    return <video src={msg.uploadData} autoPlay loop muted playsInline style={{ maxWidth: '200px', maxHeight: '160px', borderRadius: '12px', display: 'block', objectFit: 'cover' }} />;
  }
  return <span>{msg.text}</span>;
}

// ─── Main Chat Component ──────────────────────────────────────────────────────
export default function Chat({ roomId, userName, messages = [], onNewMessage }) {
  const [input, setInput]             = useState('');
  // panel: null | 'emoji' | 'attach'
  const [panel, setPanel]             = useState(null);
  // attachTab: 'sticker' | 'gif' | 'image' | 'video'
  const [attachTab, setAttachTab]     = useState('sticker');
  const [emojiCat, setEmojiCat]       = useState(0);
  const [stickerPack, setStickerPack] = useState(0);
  const [gifQuery, setGifQuery]       = useState('');
  const [gifs, setGifs]               = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [gifError, setGifError]       = useState('');
  const [uploadError, setUploadError] = useState('');

  const bottomRef   = useRef(null);
  const msgBoxRef   = useRef(null);
  const inputRef    = useRef(null);
  const sheetRef    = useRef(null);
  const fileInputRef = useRef(null);

  const [thumbH, setThumbH]     = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragY   = useRef(0);
  const dragTop = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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

  // Close sheet on outside click
  useEffect(() => {
    const h = (e) => { if (sheetRef.current && !sheetRef.current.contains(e.target)) setPanel(null); };
    if (panel) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [panel]);

  // Auto-load GIFs when GIF tab opens
  useEffect(() => {
    if (panel === 'attach' && attachTab === 'gif' && gifs.length === 0 && !gifsLoading) {
      loadGifs('');
    }
  }, [panel, attachTab]);

  const loadGifs = async (q) => {
    setGifsLoading(true); setGifError('');
    try {
      const g = await fetchGifs(q);
      setGifs(g);
      if (g.length === 0) setGifError('No GIFs found. Try a different search.');
    } catch {
      setGifError('Could not load GIFs. Check your connection and try again.');
    } finally {
      setGifsLoading(false);
    }
  };

  const handleGifSearch = (e) => { e?.preventDefault(); loadGifs(gifQuery); };

  const openAttach = () => { setPanel(p => p === 'attach' ? null : 'attach'); setAttachTab('sticker'); };
  const openEmoji  = () => { setPanel(p => p === 'emoji'  ? null : 'emoji'); };

  const buildMsg = (extra) => ({
    user: userName,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'chat', isOwn: true, ...extra,
  });

  const sendText = (e) => {
    e?.preventDefault();
    const text = input.trim(); if (!text) return;
    onNewMessage(buildMsg({ text, msgType: 'text' }));
    emitChatMessage(roomId, userName, text, 'text');
    setInput(''); setPanel(null);
  };

  const sendEmoji   = (em) => { setInput(p => p + em); inputRef.current?.focus(); };

  const sendSticker = (sticker) => {
    onNewMessage(buildMsg({ text: '', msgType: 'sticker', stickerId: sticker.id }));
    emitChatMessage(roomId, userName, '', 'sticker', { stickerId: sticker.id });
    setPanel(null);
  };

  const sendGif = (gif) => {
    onNewMessage(buildMsg({ text: '', msgType: 'gif', gifUrl: gif.url, gifTitle: gif.title }));
    emitChatMessage(roomId, userName, '', 'gif', { gifUrl: gif.url, gifTitle: gif.title });
    setPanel(null);
  };

  const showErr = (msg) => { setUploadError(msg); setTimeout(() => setUploadError(''), 3500); };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/') && file.type !== 'image/gif';
    const isGif   = file.type === 'image/gif';
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isGif && !isVideo) { showErr('Unsupported file type.'); return; }
    if (file.size > 5 * 1024 * 1024) { showErr('File too large (max 5MB).'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const msgType = isGif ? 'upload-gif' : isVideo ? 'upload-video' : 'upload-image';
      const uploadData = ev.target.result;
      const uploadName = file.name;
      onNewMessage(buildMsg({ text: '', msgType, uploadData, uploadName }));
      emitChatMessage(roomId, userName, '', msgType, { uploadData, uploadName });
      setPanel(null);
    };
    reader.readAsDataURL(file);
  };

  const showThumb = thumbH < (msgBoxRef.current?.clientHeight || 0);
  const sheetH = (panel === 'attach' && attachTab === 'gif') ? '330px' : '280px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .cs::-webkit-scrollbar{display:none}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes stickerPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .at-tab{padding:9px 12px;border:none;background:transparent;font-size:11px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:color .15s,border-color .15s;letter-spacing:.3px}
        .at-tab.on{color:#a78bfa;border-bottom-color:#a78bfa}
        .at-tab:not(.on){color:#55546a}
        .gif-card{border-radius:8px;overflow:hidden;margin-bottom:6px;cursor:pointer;break-inside:avoid;border:2px solid transparent;transition:border-color .15s}
        .gif-card:active{border-color:#a78bfa}
        .s-btn{border:none;border-radius:14px;aspect-ratio:1;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:transform .15s,box-shadow .15s}
        .s-btn:active{transform:scale(.92)}
        .e-btn{background:none;border:none;cursor:pointer;font-size:22px;padding:5px;border-radius:8px;line-height:1}
        .e-btn:active{background:rgba(255,255,255,.1)}
      `}</style>

      {/* ── MESSAGES ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex' }}>
        <div ref={msgBoxRef} className="cs"
          style={{ flex: 1, overflowY: 'scroll', padding: '12px 6px 12px 12px', display: 'flex', flexDirection: 'column', gap: '6px', scrollbarWidth: 'none' }}>

          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#55546a' }}>
              <div style={{ fontSize: '30px' }}>💬</div>
              <p style={{ fontSize: '13px', margin: 0 }}>Start the conversation!</p>
              <p style={{ fontSize: '11px', color: '#3d3c52', margin: 0 }}>Stickers • GIFs • Images • Videos</p>
            </div>
          ) : messages.map((msg, i) => {
            if (msg.type === 'system') return (
              <div key={i} style={{ textAlign: 'center', margin: '4px 0' }}>
                <span style={{ fontSize: '11px', color: '#55546a', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: '99px' }}>{msg.text}</span>
              </div>
            );
            const isOwn  = msg.isOwn || msg.user === userName;
            const isMedia = ['sticker','gif','upload-image','upload-gif','upload-video'].includes(msg.msgType);
            return (
              <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: isOwn ? 'flex-end' : 'flex-start', animation: 'msgIn 0.18s ease' }}>
                {!isOwn && (
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `hsl(${(msg.user?.charCodeAt(0)||0)*42%360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0, alignSelf: 'flex-end' }}>
                    {msg.user?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {!isOwn && <p style={{ fontSize: '10px', color: '#55546a', paddingLeft: '4px', margin: 0 }}>{msg.user}</p>}
                  <div style={{ animation: msg.msgType === 'sticker' ? 'stickerPop 0.35s cubic-bezier(.175,.885,.32,1.275)' : 'none' }}>
                    {isMedia ? (
                      <MessageContent msg={msg} />
                    ) : (
                      <div style={{ padding: '8px 12px', borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isOwn ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.05)', border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: isOwn ? 'white' : '#c4c3de', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        <MessageContent msg={msg} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '10px', color: '#3d3c52', paddingLeft: '4px', paddingRight: '4px', margin: 0 }}>{msg.time}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Scrollbar */}
        <div style={{ width: '16px', position: 'relative', flexShrink: 0, margin: '6px 2px', cursor: 'pointer', userSelect: 'none' }}
          onClick={(e) => {
            const el = msgBoxRef.current; if (!el) return;
            const rect = e.currentTarget.getBoundingClientRect();
            el.scrollTop = ((e.clientY - rect.top) / rect.height) * (el.scrollHeight - el.clientHeight);
          }}>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.04)' }} />
          {showThumb && (
            <div
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); dragY.current = e.clientY; dragTop.current = msgBoxRef.current?.scrollTop || 0; }}
              style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: `${thumbTop}px`, height: `${thumbH}px`, width: dragging ? '10px' : '8px', borderRadius: '99px', background: dragging ? 'linear-gradient(180deg,#c4b5fd,#7c3aed)' : 'rgba(167,139,250,0.6)', cursor: dragging ? 'grabbing' : 'grab', transition: dragging ? 'none' : 'width 0.15s', userSelect: 'none' }}
            />
          )}
        </div>
      </div>

      {/* ── BOTTOM SHEET ── */}
      {panel && (
        <div ref={sheetRef} style={{ position: 'absolute', bottom: '58px', left: 0, right: 0, background: '#0e0e1a', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px 18px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.65)', zIndex: 50, height: sheetH, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'sheetUp 0.22s cubic-bezier(.32,1,.4,1)' }}>

          {/* ── EMOJI ── */}
          {panel === 'emoji' && <>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {EMOJI_CATEGORIES.map((cat, ci) => (
                <button key={ci} onClick={() => setEmojiCat(ci)} title={cat.name}
                  style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'transparent', fontSize: '17px', cursor: 'pointer', borderBottom: emojiCat === ci ? '2px solid #a78bfa' : '2px solid transparent', opacity: emojiCat === ci ? 1 : 0.4, transition: 'opacity 0.15s' }}>
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="cs" style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start' }}>
              {EMOJI_CATEGORIES[emojiCat].emojis.map((em, ei) => (
                <button key={ei} className="e-btn" onClick={() => sendEmoji(em)}>{em}</button>
              ))}
            </div>
          </>}

          {/* ── ATTACH ── */}
          {panel === 'attach' && <>
            {/* Tab bar: Stickers | GIFs | Image | Video */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, padding: '0 4px', overflowX: 'auto' }}>
              {[
                { id: 'sticker', label: '🎭 Stickers' },
                { id: 'gif',     label: '🎞 GIFs' },
                { id: 'image',   label: '🖼 Image' },
                { id: 'video',   label: '🎬 Video' },
              ].map(t => (
                <button key={t.id} className={`at-tab${attachTab === t.id ? ' on' : ''}`} onClick={() => setAttachTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Stickers */}
            {attachTab === 'sticker' && <>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, padding: '0 8px' }}>
                {STICKER_PACKS.map((pack, pi) => (
                  <button key={pi} onClick={() => setStickerPack(pi)}
                    style={{ padding: '8px 12px', border: 'none', background: 'transparent', color: stickerPack === pi ? '#a78bfa' : '#55546a', fontSize: '11px', fontWeight: 600, cursor: 'pointer', borderBottom: stickerPack === pi ? '2px solid #a78bfa' : '2px solid transparent', transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
                    {pack.name}
                  </button>
                ))}
              </div>
              <div className="cs" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {STICKER_PACKS[stickerPack].stickers.map(s => (
                  <button key={s.id} className="s-btn" onClick={() => sendSticker(s)} title={s.label} style={{ background: s.bg }}>{s.emoji}</button>
                ))}
              </div>
            </>}

            {/* GIFs */}
            {attachTab === 'gif' && <>
              <div style={{ display: 'flex', gap: '8px', padding: '8px 10px', flexShrink: 0 }}>
                <input
                  value={gifQuery} onChange={e => setGifQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGifSearch()}
                  placeholder="Search GIFs..."
                  style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f0ff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={handleGifSearch}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  🔍
                </button>
              </div>
              <div className="cs" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 8px' }}>
                {gifsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: '#55546a', gap: '10px', fontSize: '13px' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    Loading GIFs...
                  </div>
                ) : gifError ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: '#f87171', fontSize: '12px', textAlign: 'center', padding: '0 16px' }}>{gifError}</div>
                ) : (
                  <>
                    <div style={{ columns: '2', columnGap: '6px' }}>
                      {gifs.map(gif => (
                        <div key={gif.id} className="gif-card" onClick={() => sendGif(gif)}>
                          <img src={gif.preview} alt={gif.title || 'gif'} style={{ width: '100%', display: 'block', borderRadius: '6px' }} loading="lazy" />
                        </div>
                      ))}
                    </div>
                    {gifs.length > 0 && <div style={{ textAlign: 'center', padding: '6px 0 2px', fontSize: '10px', color: '#3d3c52' }}>Powered by Tenor</div>}
                  </>
                )}
              </div>
            </>}

            {/* Image upload */}
            {attachTab === 'image' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px' }}>
                <div style={{ fontSize: '44px' }}>🖼️</div>
                <p style={{ color: '#c4c3de', fontSize: '14px', fontWeight: 600, margin: 0, textAlign: 'center' }}>Send a photo</p>
                <p style={{ color: '#55546a', fontSize: '12px', margin: 0, textAlign: 'center' }}>JPG, PNG, WEBP — max 5MB</p>
                <button
                  onClick={() => { fileInputRef.current.accept = 'image/jpeg,image/png,image/webp'; fileInputRef.current.click(); }}
                  style={{ padding: '11px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.4)' }}>
                  Choose Image
                </button>
              </div>
            )}

            {/* Video upload */}
            {attachTab === 'video' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px' }}>
                <div style={{ fontSize: '44px' }}>🎬</div>
                <p style={{ color: '#c4c3de', fontSize: '14px', fontWeight: 600, margin: 0, textAlign: 'center' }}>Send a short video</p>
                <p style={{ color: '#55546a', fontSize: '12px', margin: 0, textAlign: 'center' }}>MP4, WEBM, MOV — max 5MB{'\n'}Plays as a looping sticker</p>
                <button
                  onClick={() => { fileInputRef.current.accept = 'video/mp4,video/webm,video/quicktime'; fileInputRef.current.click(); }}
                  style={{ padding: '11px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 18px rgba(236,72,153,0.35)' }}>
                  Choose Video
                </button>
              </div>
            )}
          </>}
        </div>
      )}

      {/* ── INPUT BAR — WhatsApp style ── */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: '#0c0c18' }}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />

        {/* Error toast */}
        {uploadError && (
          <div style={{ marginBottom: '6px', padding: '6px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#fca5a5', fontSize: '11px', textAlign: 'center' }}>
            {uploadError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

          {/* + button */}
          <button onClick={openAttach} title="Attachments"
            style={{ width: '38px', height: '38px', minWidth: '38px', borderRadius: '50%', border: 'none', background: panel === 'attach' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s, transform 0.2s', transform: panel === 'attach' ? 'rotate(45deg)' : 'rotate(0deg)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          {/* Input pill */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '22px', padding: '0 6px 0 14px', gap: '2px', minWidth: 0 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
              maxLength={300}
              onFocus={() => setPanel(null)}
              style={{ flex: 1, minWidth: 0, padding: '10px 0', background: 'transparent', border: 'none', color: '#f1f0ff', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
            />
            {/* Emoji trigger inside pill */}
            <button onClick={openEmoji} title="Emoji"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: panel === 'emoji' ? '#a78bfa' : '#55546a', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>😊</span>
            </button>
          </div>

          {/* Send button */}
          <button onClick={sendText} disabled={!input.trim()}
            style={{ width: '38px', height: '38px', minWidth: '38px', borderRadius: '50%', border: 'none', background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.07)', color: 'white', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() ? '0 2px 14px rgba(124,58,237,0.45)' : 'none', transition: 'background 0.2s, box-shadow 0.2s' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}