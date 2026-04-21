import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Howl } from 'howler';
import { io } from 'socket.io-client';

const BACKEND = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

/* ─── Vibe palettes ─── */
const VIBES = {
  dreamy:  { bg:'linear-gradient(160deg,#0b0820 0%,#1e1456 50%,#0f0c29 100%)', accent:'#c4b5fd', glow:'#7c3aed', stamp:'🌙', particle:'✦', paperBg:'#faf8ff', paperBg2:'#f0ecff', ink:'#2d1b6b', ruled:'rgba(124,58,237,0.09)' },
  warm:    { bg:'linear-gradient(160deg,#1a0030 0%,#4a0060 50%,#200040 100%)', accent:'#f9a8d4', glow:'#db2777', stamp:'💜', particle:'❤', paperBg:'#fff8fc', paperBg2:'#ffeef8', ink:'#6b0040', ruled:'rgba(219,39,119,0.09)' },
  intense: { bg:'linear-gradient(160deg,#0c0002 0%,#3d0a00 50%,#1a0500 100%)', accent:'#fdba74', glow:'#ea580c', stamp:'🔥', particle:'✦', paperBg:'#fffaf5', paperBg2:'#fff0e0', ink:'#7c2d12', ruled:'rgba(234,88,12,0.09)' },
  sweet:   { bg:'linear-gradient(160deg,#1a0015 0%,#4a0030 50%,#200020 100%)', accent:'#fda4af', glow:'#e11d48', stamp:'🌸', particle:'🌸', paperBg:'#fff8f9', paperBg2:'#ffecee', ink:'#7a0030', ruled:'rgba(225,29,72,0.09)' },
};

/* ─── Animated waveform for player ─── */
function PlayerWaveform({ count = 48, accent, glow, progress, duration, cropStart, cropEnd, onSeek, isPlaying }) {
  const barRef = useRef(null);

  const bars = Array.from({ length: count }, (_, i) => {
    const pct        = i / count;
    const songPct    = duration > 0 ? pct * duration : pct;
    const cropStartPct = duration > 0 ? cropStart / duration : 0;
    const cropEndPct   = duration > 0 ? cropEnd   / duration : 1;
    const inCrop   = pct >= cropStartPct && pct <= cropEndPct;
    const isPlayed = duration > 0 && songPct <= progress;

    const seed = Math.sin(i * 7.3 + i * 0.4) * 0.5 + 0.5;
    const h = 8 + seed * 20;

    let color;
    if (inCrop && isPlayed) color = accent;
    else if (inCrop)        color = `${accent}66`;
    else                    color = 'rgba(0,0,0,0.12)';

    const playPct  = duration > 0 ? progress / duration : 0;
    const nearPlay = isPlaying && Math.abs(pct - playPct) < 0.06;
    const animDelay = nearPlay ? `${(i % 5) * 0.08}s` : '0s';
    const animName  = nearPlay ? `wb${i % 5}` : 'none';

    return { h, color, animName, animDelay, inCrop };
  });

  const handleClick = (e) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t    = pct * duration;
    const clamped = Math.max(cropStart, Math.min(t, cropEnd));
    onSeek(clamped);
  };

  return (
    <>
      <style>{`
        @keyframes wb0 { 0%,100%{transform:scaleY(1)}   50%{transform:scaleY(2.2)} }
        @keyframes wb1 { 0%,100%{transform:scaleY(1.5)} 50%{transform:scaleY(0.6)} }
        @keyframes wb2 { 0%,100%{transform:scaleY(0.8)} 50%{transform:scaleY(2.5)} }
        @keyframes wb3 { 0%,100%{transform:scaleY(2)}   50%{transform:scaleY(0.7)} }
        @keyframes wb4 { 0%,100%{transform:scaleY(1.2)} 50%{transform:scaleY(1.9)} }
      `}</style>
      <div
        ref={barRef}
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          height: '32px', width: '100%',
          cursor: 'pointer',
          padding: '2px 0',
        }}
      >
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${b.h}px`,
              borderRadius: '2px',
              background: b.color,
              transition: 'background 0.2s',
              animation: b.animName !== 'none'
                ? `${b.animName} ${0.35 + (i % 5) * 0.07}s ${b.animDelay} ease-in-out infinite`
                : 'none',
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ─── Ambient particle system ─── */
function Particles({ vibe }) {
  const v = VIBES[vibe] || VIBES.dreamy;
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:2 }}>
      {Array.from({ length: 22 }, (_, i) => (
        <div key={i} style={{
          position:'absolute',
          left:`${4+(i*4.3)%92}%`,
          bottom:'-30px',
          fontSize:`${6+(i*2.5)%14}px`,
          filter:`drop-shadow(0 0 ${3+i%4}px ${v.accent})`,
          animation:`floatDrift ${8+(i*1.1)%9}s ${(i*0.7)%6}s ease-in-out infinite`,
          opacity:0,
        }}>{v.particle}</div>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={`orb${i}`} style={{
          position:'absolute',
          left:`${10+i*18}%`,
          top:`${15+(i*14)%60}%`,
          width:`${60+i*20}px`, height:`${60+i*20}px`,
          borderRadius:'50%',
          background:`radial-gradient(circle, ${v.accent}18 0%, transparent 70%)`,
          animation:`shimmerOrb ${4+i*0.8}s ${i*0.5}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Confetti burst ─── */
function Confetti({ active, accent }) {
  if (!active) return null;
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:100, overflow:'hidden' }}>
      {Array.from({ length: 36 }, (_, i) => {
        const colors = [accent,'#fff','#ffd700','#ff69b4','#00ffcc'];
        return (
          <div key={i} style={{
            position:'absolute',
            left:`${Math.random()*100}%`,
            top:'-10px',
            width:`${5+Math.random()*9}px`,
            height:`${5+Math.random()*9}px`,
            background:colors[i%colors.length],
            borderRadius: i%3===0?'50%':i%3===1?'0':'2px',
            '--rot':`${Math.random()*720}deg`,
            animation:`confettiFall ${0.9+Math.random()*0.8}s ${Math.random()*0.6}s ease-in forwards`,
          }} />
        );
      })}
    </div>
  );
}

/* ─── Typewriter ─── */
function useTypewriter(text, started, speed = 20) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!started || !text) return;
    setOut(''); let i = 0;
    const iv = setInterval(() => {
      setOut(text.slice(0, ++i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, started]);
  return out;
}

const fmt = t => (!t || isNaN(t)) ? '0:00' : `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

/* ══════════════════════════════════════ */
export default function ForYouView() {
  const { giftId } = useParams();
  const navigate   = useNavigate();

  const [gift,       setGift]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [revealed,   setRevealed]   = useState(false);
  const [confetti,   setConfetti]   = useState(false);
  const [cardIn,     setCardIn]     = useState(false);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);

  /* ── Gift chat state ── */
  const [chatOpen,      setChatOpen]      = useState(false);
  const [chatName,      setChatName]      = useState('');
  const [chatJoined,    setChatJoined]    = useState(false);
  const [chatInput,     setChatInput]     = useState('');
  const [chatMessages,  setChatMessages]  = useState([]);
  const [chatNameInput, setChatNameInput] = useState('');

  const soundRef   = useRef(null);
  const progRef    = useRef(null);
  const chatEndRef = useRef(null);
  const chatSockRef = useRef(null);
  // Track resolved endSec inside the sound closure
  const endSecRef  = useRef(null);

  const displayMsg = useTypewriter(gift?.message, revealed, 20);
  const v          = VIBES[gift?.vibe] || VIBES.dreamy;

  const effectiveStart = gift?.song?.cropStart ?? 0;
  const effectiveEnd   = (gift?.song?.cropEnd && gift.song.cropEnd > 0)
    ? gift.song.cropEnd
    : duration;
  const cropLen = effectiveEnd - effectiveStart;

  /* ── Fetch gift ── */
  useEffect(() => {
    fetch(`${BACKEND}/api/gift/${giftId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError('Gift not found 💔'); else setGift(d); })
      .catch(() => setError('Could not load gift'))
      .finally(() => setLoading(false));
  }, [giftId]);

  /* ── Poll every 8s ── */
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND}/api/gift/${giftId}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setGift(d); })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [giftId]);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    soundRef.current?.stop();
    soundRef.current?.unload();
    clearInterval(progRef.current);
    chatSockRef.current?.disconnect();
  }, []);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /* ── Gift chat ── */
  const joinGiftChat = useCallback((name) => {
    const sock = io(BACKEND, { transports: ['websocket', 'polling'], autoConnect: true });
    chatSockRef.current = sock;

    sock.on('connect', () => {
      sock.emit('gift-chat-join', { giftId, userName: name });
    });
    sock.on('gift-chat-history', (history) => {
      setChatMessages(history.map(m => ({ ...m, type: 'chat' })));
    });
    sock.on('gift-chat-message', (msg) => {
      setChatMessages(prev => [...prev, { ...msg, type: 'chat' }]);
    });
    sock.on('gift-chat-system', (msg) => {
      setChatMessages(prev => [...prev, { id: Date.now(), type: 'system', text: msg.text }]);
    });

    setChatName(name);
    setChatJoined(true);
  }, [giftId]);

  const sendChatMessage = () => {
    if (!chatInput.trim() || !chatSockRef.current) return;
    chatSockRef.current.emit('gift-chat-message', {
      giftId,
      userName: chatName,
      text: chatInput.trim(),
    });
    setChatInput('');
  };

  /* ══════════════════════════════════════
     BUILD SOUND — fixed crop + loop
  ══════════════════════════════════════ */
  const buildSound = useCallback((giftData) => {
    if (!giftData?.song?.audioUrl) return;

    // Tear down any existing sound cleanly
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
      soundRef.current = null;
    }
    clearInterval(progRef.current);

    const proxy    = `${BACKEND}/api/audio?url=${encodeURIComponent(giftData.song.audioUrl)}`;
    const startSec = giftData.song.cropStart ?? 0;

    // endSec is resolved after load when we know real duration
    // We store in a ref so the interval closure always sees the latest value
    endSecRef.current = (giftData.song.cropEnd && giftData.song.cropEnd > 0)
      ? giftData.song.cropEnd
      : null;

    const snd = new Howl({
      src:     [proxy],
      html5:   true,   // streaming — required for long audio
      preload: true,   // fetch metadata eagerly
      volume:  0.9,
      format:  ['mp3'], // hint the decoder for quality

      /* ── FIX 1: seek to cropStart BEFORE first play ── */
      onload: () => {
        const dur = snd.duration();
        setDuration(dur);

        // Resolve endSec now that we have real duration
        if (!endSecRef.current || endSecRef.current <= 0) {
          endSecRef.current = dur;
        }

        // Clamp cropEnd to actual duration (safety)
        if (endSecRef.current > dur) endSecRef.current = dur;

        // Seek to crop start FIRST, then play — prevents 0-second bleed
        snd.seek(startSec);
        snd.play();
      },

      onplay: () => {
        setIsPlaying(true);
        clearInterval(progRef.current);

        /* ── FIX 2: 50ms polling + immediate seek on overshoot ── */
        progRef.current = setInterval(() => {
          if (!snd.playing()) return;

          const cur   = typeof snd.seek() === 'number' ? snd.seek() : 0;
          const start = giftData.song.cropStart ?? 0;
          const end   = endSecRef.current ?? snd.duration();

          setProgress(cur);

          // If we've reached or passed cropEnd, loop immediately
          if (end > 0 && cur >= end - 0.05) {
            snd.seek(start);
          }
        }, 50); // 50ms — tight enough to catch the crop boundary cleanly
      },

      onpause: () => {
        setIsPlaying(false);
        clearInterval(progRef.current);
      },

      onstop: () => {
        setIsPlaying(false);
        clearInterval(progRef.current);
      },

      /* ── FIX 3: onend safety net (fires if full-song plays through) ── */
      onend: () => {
        const start = giftData.song.cropStart ?? 0;
        snd.seek(start);
        snd.play();
      },

      onloaderror: (id, err) => {
        console.error('Howl load error:', err);
      },

      onplayerror: (id, err) => {
        console.error('Howl play error:', err);
        // Retry once on play error (common on iOS)
        snd.once('unlock', () => snd.play());
      },
    });

    soundRef.current = snd;
  }, []);

  /* ── Reveal handler ── */
  const handleReveal = () => {
    setRevealed(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2200);
    setTimeout(() => setCardIn(true), 80);
    if (gift) buildSound(gift);
  };

  /* ── Play / Pause toggle ── */
  const togglePlay = () => {
    if (!soundRef.current) {
      if (gift) buildSound(gift);
      return;
    }
    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  /* ── Seek ── */
  const handleSeek = (time) => {
    if (!soundRef.current || !duration) return;
    const start   = gift?.song?.cropStart ?? 0;
    const end     = endSecRef.current ?? duration;
    const clamped = Math.max(start, Math.min(time, end));
    soundRef.current.seek(clamped);
    setProgress(clamped);
  };

  /* ── Share ── */
  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'For You 💝', url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  /* ══════════════════════════════════════
     LOADING
  ══════════════════════════════════════ */
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#08060f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'20px', fontFamily:'DM Sans,sans-serif' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse2  { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>
      <div style={{ position:'relative', width:'56px', height:'56px' }}>
        <div style={{ position:'absolute', inset:0, border:'3px solid rgba(196,181,253,0.15)', borderTopColor:'#c4b5fd', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
        <div style={{ position:'absolute', inset:'8px', border:'3px solid rgba(196,181,253,0.08)', borderBottomColor:'#7c3aed', borderRadius:'50%', animation:'spin 1.4s linear infinite reverse' }} />
      </div>
      <p style={{ color:'rgba(196,181,253,0.4)', fontSize:'12px', letterSpacing:'0.14em', textTransform:'uppercase', animation:'pulse2 2s ease infinite' }}>Opening your gift...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#08060f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ fontSize:'56px' }}>💔</div>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'16px' }}>{error}</p>
    </div>
  );

  /* ══════════════════════════════════════
     ENVELOPE SCREEN
  ══════════════════════════════════════ */
  if (!revealed) return (
    <div style={{ minHeight:'100vh', background:v.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes floatDrift { 0%{transform:translateY(105vh) rotate(0deg);opacity:0} 8%{opacity:0.5} 92%{opacity:0.15} 100%{transform:translateY(-8vh) rotate(360deg);opacity:0} }
        @keyframes shimmerOrb { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.4)} }
        @keyframes floatEnv   { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(1deg)} }
        @keyframes glowPulse  { 0%,100%{box-shadow:0 0 40px ${v.accent}44,0 0 80px ${v.glow}22} 50%{box-shadow:0 0 70px ${v.accent}77,0 0 130px ${v.glow}44} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(var(--rot));opacity:0} }
      `}</style>
      <Particles vibe={gift.vibe} />

      {gift.photo && (
        <>
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${gift.photo})`, backgroundSize:'cover', backgroundPosition:'center top', filter:'blur(40px) brightness(0.18) saturate(1.8)', transform:'scale(1.1)', zIndex:0 }} />
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 50%, ${v.glow}44 0%, transparent 65%)`, zIndex:1 }} />
        </>
      )}

      <div style={{ position:'relative', zIndex:3, textAlign:'center', padding:'40px 28px', maxWidth:'400px' }}>
        <div style={{ animation:'floatEnv 3.2s ease-in-out infinite', marginBottom:'32px' }}>
          <div style={{
            width:'110px', height:'110px', margin:'0 auto',
            borderRadius:'28px',
            background:`linear-gradient(135deg,${v.accent}22,${v.glow}33)`,
            border:`1.5px solid ${v.accent}55`,
            backdropFilter:'blur(12px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'58px',
            animation:'glowPulse 2.5s ease-in-out infinite',
          }}>💌</div>
        </div>

        <p style={{ color:`${v.accent}88`, fontSize:'11px', letterSpacing:'0.2em', textTransform:'uppercase', fontWeight:700, margin:'0 0 10px', animation:'fadeUp 0.6s 0.1s ease both' }}>A gift from</p>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(30px,8vw,44px)', fontWeight:900, color:'white', margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1, animation:'fadeUp 0.6s 0.2s ease both' }}>
          {gift.from}
        </h1>
        <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'14px', margin:'0 0 40px', lineHeight:1.7, animation:'fadeUp 0.6s 0.3s ease both' }}>
          has made something<br/>just for you ✨
        </p>

        <button
          onClick={handleReveal}
          style={{
            padding:'18px 56px', borderRadius:'99px', border:'none',
            background:`linear-gradient(135deg,${v.accent},${v.glow})`,
            color:'white', fontWeight:800, fontSize:'16px', cursor:'pointer',
            fontFamily:'inherit', letterSpacing:'0.03em',
            boxShadow:`0 0 0 1px ${v.accent}44, 0 8px 48px ${v.glow}66`,
            animation:'fadeUp 0.6s 0.4s ease both',
            transition:'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05) translateY(-2px)'; e.currentTarget.style.boxShadow=`0 0 0 1px ${v.accent}66, 0 16px 64px ${v.glow}88`; }}
          onMouseLeave={e => { e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow=`0 0 0 1px ${v.accent}44, 0 8px 48px ${v.glow}66`; }}
        >
          ✨ Open Your Gift
        </button>

        {gift.song?.name && (
          <p style={{ color:'rgba(255,255,255,0.18)', fontSize:'11px', marginTop:'22px', letterSpacing:'0.06em', animation:'fadeUp 0.6s 0.6s ease both' }}>
            🎵 includes a song just for you
          </p>
        )}
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     REVEALED POSTCARD
  ══════════════════════════════════════ */
  return (
    <div style={{
      minHeight:'100vh',
      background:'#08060f',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'DM Sans',sans-serif",
      position:'relative', overflow:'hidden',
      padding:'20px 16px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap');
        @keyframes floatDrift   { 0%{transform:translateY(105vh) rotate(0deg);opacity:0} 8%{opacity:0.5} 92%{opacity:0.15} 100%{transform:translateY(-8vh) rotate(360deg);opacity:0} }
        @keyframes shimmerOrb   { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.4)} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(var(--rot));opacity:0} }
        @keyframes cardReveal   { 0%{opacity:0;transform:translateY(48px) scale(0.9) rotateX(10deg)} 60%{transform:translateY(-6px) scale(1.015) rotateX(-1deg)} 100%{opacity:1;transform:translateY(0) scale(1) rotateX(0)} }
        @keyframes blink        { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin         { to{transform:rotate(360deg)} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes pulseGlow    { 0%,100%{box-shadow:0 0 16px ${v.accent}44} 50%{box-shadow:0 0 36px ${v.accent}88} }
        @keyframes stampWiggle  { 0%,100%{transform:rotate(-1.5deg) scale(1)} 50%{transform:rotate(1.5deg) scale(1.03)} }
        @keyframes photoSheen   { 0%{left:-100%} 100%{left:200%} }
        @keyframes wb0 { 0%,100%{transform:scaleY(1)}   50%{transform:scaleY(2.4)} }
        @keyframes wb1 { 0%,100%{transform:scaleY(1.6)} 50%{transform:scaleY(0.5)} }
        @keyframes wb2 { 0%,100%{transform:scaleY(0.7)} 50%{transform:scaleY(2.6)} }
        @keyframes wb3 { 0%,100%{transform:scaleY(2.1)} 50%{transform:scaleY(0.6)} }
        @keyframes wb4 { 0%,100%{transform:scaleY(1.3)} 50%{transform:scaleY(2.0)} }
        .postcard-shadow { filter: drop-shadow(0 24px 48px rgba(0,0,0,0.7)) drop-shadow(0 4px 12px rgba(0,0,0,0.4)); }
      `}</style>

      <Particles vibe={gift.vibe} />
      <Confetti active={confetti} accent={v.accent} />

      {gift.photo && (
        <>
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${gift.photo})`, backgroundSize:'cover', backgroundPosition:'center top', filter:'blur(24px) brightness(0.25) saturate(2)', transform:'scale(1.1)', zIndex:0 }} />
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%, ${v.glow}50 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.85) 0%, transparent 55%)`, zIndex:1 }} />
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)', zIndex:1 }} />
        </>
      )}

      {/* ══ POSTCARD ══ */}
      <div
        className="postcard-shadow"
        style={{
          position:'relative', zIndex:3,
          width:'min(500px, calc(100vw - 32px))',
          borderRadius:'24px', overflow:'visible',
          animation: cardIn ? 'cardReveal 0.75s cubic-bezier(.22,1.2,.36,1) both' : 'none',
          perspective:'1000px',
        }}
      >
        <div style={{
          borderRadius:'24px',
          overflow:'hidden',
          background:`linear-gradient(160deg, ${v.paperBg} 0%, ${v.paperBg2} 100%)`,
          boxShadow:`0 0 0 1px rgba(255,255,255,0.85), 0 2px 0 1px ${v.accent}44, inset 0 1px 0 rgba(255,255,255,0.95)`,
        }}>

          {/* ── PHOTO ── */}
          <div style={{ position:'relative', width:'100%', overflow:'hidden', maxHeight:'min(58vh,370px)', minHeight:'200px' }}>
            {gift.photo ? (
              <>
                <img
                  src={gift.photo}
                  alt="gift"
                  style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', display:'block', minHeight:'200px', maxHeight:'min(58vh,370px)' }}
                />
                <div style={{ position:'absolute', top:0, bottom:0, width:'40%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', animation:'photoSheen 2.5s 0.8s ease forwards', pointerEvents:'none' }} />
              </>
            ) : (
              <div style={{ width:'100%', height:'260px', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px' }}>📸</div>
            )}

            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'90px', background:`linear-gradient(to bottom, transparent, ${v.paperBg})`, pointerEvents:'none' }} />

            <button
              onClick={() => navigate('/')}
              style={{ position:'absolute', top:'12px', right:'12px', width:'32px', height:'32px', borderRadius:'50%', background:'rgba(0,0,0,0.45)', border:'none', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', zIndex:2, transition:'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.75)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.45)'}
            >✕</button>

            {/* Now playing badge */}
            {isPlaying && (
              <div style={{ position:'absolute', bottom:'18px', left:'16px', display:'flex', alignItems:'center', gap:'8px', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(12px)', borderRadius:'99px', padding:'6px 14px 6px 10px', border:`1px solid ${v.accent}44` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'14px' }}>
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} style={{ width:'3px', background:v.accent, borderRadius:'2px', animation:`wb${i} ${0.35+(i*0.07)}s ${i*0.06}s ease-in-out infinite` }} />
                  ))}
                </div>
                <span style={{ color:'white', fontSize:'10px', fontWeight:600 }}>
                  {gift.song?.name?.length > 22 ? gift.song.name.slice(0,22)+'…' : gift.song?.name}
                </span>
              </div>
            )}
          </div>

          {/* ── BODY ── */}
          <div style={{ padding:'18px 20px 0', position:'relative' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(transparent,transparent 30px,${v.ruled} 30px,${v.ruled} 31px)`, backgroundPosition:'0 46px', pointerEvents:'none' }} />

            <div style={{ display:'flex', gap:'14px', position:'relative', zIndex:1 }}>

              {/* LEFT */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'13px', flexWrap:'wrap' }}>
                  <span style={{ background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'9.5px', padding:'4px 10px', borderRadius:'6px', letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:`0 2px 10px ${v.glow}44`, flexShrink:0 }}>
                    💝 For You
                  </span>
                  <span style={{ fontSize:'12px', color:`${v.ink}77`, fontStyle:'italic' }}>
                    — from <strong style={{ color:v.ink }}>{gift.from}</strong>
                  </span>
                </div>

                <p style={{
                  fontFamily:"'Caveat', 'Georgia', cursive",
                  fontSize:'clamp(17px,4vw,22px)',
                  lineHeight:'30px',
                  color:v.ink,
                  margin:'0 0 16px',
                  minHeight:'60px',
                  wordBreak:'break-word',
                  letterSpacing:'0.01em',
                }}>
                  "{displayMsg}<span style={{ animation:'blink 1s step-end infinite', color:v.accent }}>|</span>"
                </p>
              </div>

              {/* RIGHT: stamp */}
              <div style={{ flexShrink:0, width:'66px', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'2px', position:'relative' }}>
                <div style={{ position:'absolute', left:'-7px', top:0, bottom:0, borderLeft:`2px dashed ${v.ruled}` }} />
                <div style={{
                  width:'60px', height:'74px',
                  background:`linear-gradient(160deg,${v.accent}28,${v.accent}50)`,
                  border:`2px solid ${v.accent}88`,
                  borderRadius:'5px',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px',
                  outline:`3px dotted ${v.accent}55`, outlineOffset:'3px',
                  animation:'stampWiggle 4.5s ease-in-out infinite',
                  boxShadow:`0 3px 14px ${v.glow}33, inset 0 1px 0 rgba(255,255,255,0.6)`,
                }}>
                  <div style={{ fontSize:'26px', filter:`drop-shadow(0 0 8px ${v.accent})` }}>{v.stamp}</div>
                  <div style={{ fontSize:'6.5px', fontFamily:"'Syne',sans-serif", fontWeight:800, color:v.glow, letterSpacing:'0.08em', textAlign:'center', lineHeight:1.3 }}>FOR<br/>YOU</div>
                </div>
                <div style={{ marginTop:'9px', width:'54px', height:'54px', border:`1.5px solid ${v.accent}44`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', opacity:0.55 }}>
                  <div style={{ position:'absolute', inset:0, border:`1px dashed ${v.accent}33`, borderRadius:'50%' }} />
                  <span style={{ fontSize:'8px', fontFamily:'monospace', color:v.ink, textAlign:'center', lineHeight:1.4, fontWeight:700, letterSpacing:'0.04em' }}>
                    {new Date().toLocaleDateString('en',{month:'short',day:'numeric'})}
                  </span>
                </div>
              </div>
            </div>

            {/* ── SONG PLAYER ── */}
            <div style={{
              marginBottom:'16px', position:'relative', zIndex:1,
              background:'rgba(255,255,255,0.55)',
              backdropFilter:'blur(8px)',
              borderRadius:'18px',
              padding:'12px 14px',
              border:`1.5px solid ${v.accent}33`,
              boxShadow:`inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 12px rgba(0,0,0,0.06)`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>

                {/* Album art */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  {gift.song?.image
                    ? <img src={gift.song.image} alt="" style={{ width:'42px', height:'42px', borderRadius:'11px', objectFit:'cover', display:'block', boxShadow:`0 0 0 2px ${v.accent}55, 0 4px 14px rgba(0,0,0,0.15)` }} />
                    : <div style={{ width:'42px', height:'42px', borderRadius:'11px', background:`${v.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🎵</div>
                  }
                  {isPlaying && <div style={{ position:'absolute', inset:0, borderRadius:'11px', animation:'pulseGlow 1.5s ease-in-out infinite' }} />}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:v.ink, fontWeight:700, fontSize:'12.5px', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{gift.song?.name}</p>
                  <p style={{ color:`${v.ink}66`, fontSize:'10px', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{gift.song?.artist}</p>
                  {cropLen > 0 && cropLen < (duration - 1) && (
                    <span style={{ fontSize:'9px', color:v.glow, background:`${v.accent}22`, borderRadius:'4px', padding:'1px 5px', fontWeight:700 }}>
                      ✂ {fmt(effectiveStart)}–{fmt(effectiveEnd)}
                    </span>
                  )}
                </div>

                {/* Play/pause */}
                <button
                  onClick={togglePlay}
                  style={{ width:'40px', height:'40px', borderRadius:'50%', border:'none', flexShrink:0, background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 0 3px ${v.accent}33, 0 4px 18px ${v.glow}55`, transition:'transform 0.15s', animation: isPlaying ? 'pulseGlow 1.5s ease-in-out infinite' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
                >
                  {isPlaying
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:'2px'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  }
                </button>
              </div>

              {/* Animated Waveform Seekbar */}
              <PlayerWaveform
                count={48}
                accent={v.accent}
                glow={v.glow}
                progress={progress}
                duration={duration}
                cropStart={effectiveStart}
                cropEnd={effectiveEnd}
                onSeek={handleSeek}
                isPlaying={isPlaying}
              />

              {/* Time labels */}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                <span style={{ fontSize:'9px', color:`${v.ink}55`, fontFamily:'monospace' }}>{fmt(effectiveStart)}</span>
                <span style={{ fontSize:'9px', color:`${v.ink}88`, fontFamily:'monospace' }}>{fmt(progress)}</span>
                <span style={{ fontSize:'9px', color:`${v.ink}55`, fontFamily:'monospace' }}>{fmt(effectiveEnd)}</span>
              </div>
            </div>
          </div>

          {/* ── Action bar ── */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'8px', padding:'0 20px 22px', position:'relative', zIndex:1 }}>
            <button
              onClick={() => navigate('/')}
              style={{ padding:'12px 8px', borderRadius:'99px', border:'none', background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', fontWeight:700, fontSize:'11.5px', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.02em', boxShadow:`0 4px 22px ${v.glow}55`, transition:'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 32px ${v.glow}77`; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=`0 4px 22px ${v.glow}55`; }}
            >🎵 Listen Together</button>

            <button
              onClick={() => setChatOpen(o => !o)}
              style={{ padding:'12px 8px', borderRadius:'99px', border:`2px solid ${v.accent}66`, background: chatOpen ? `${v.accent}28` : `${v.accent}14`, color:v.glow, fontSize:'11.5px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}
            >{chatOpen ? '✕ Close' : '💬 Reply'}</button>

            <button
              onClick={handleShare}
              style={{ padding:'12px 8px', borderRadius:'99px', border:`2px solid ${v.ruled}`, background:'rgba(0,0,0,0.04)', color:`${v.ink}88`, fontSize:'11.5px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}
            >🔗 Share</button>
          </div>

          {/* ── Gift Chat Panel ── */}
          <div style={{ maxHeight: chatOpen ? '420px' : '0px', overflow:'hidden', transition:'max-height 0.4s cubic-bezier(.22,1.2,.36,1)' }}>
            <div style={{ borderTop:`1.5px solid ${v.accent}33`, background:`linear-gradient(160deg, ${v.paperBg} 0%, ${v.paperBg2} 100%)`, borderRadius:'0 0 24px 24px' }}>
              {!chatJoined ? (
                <div style={{ padding:'20px 20px 24px' }}>
                  <p style={{ margin:'0 0 4px', fontSize:'13px', fontWeight:700, color:v.ink }}>💬 Join the chat</p>
                  <p style={{ margin:'0 0 14px', fontSize:'11px', color:`${v.ink}66` }}>Both you and {gift.from} can chat here using the same link</p>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input
                      autoFocus type="text" placeholder="Your name..."
                      value={chatNameInput}
                      onChange={e => setChatNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && chatNameInput.trim()) joinGiftChat(chatNameInput.trim()); }}
                      maxLength={24}
                      style={{ flex:1, padding:'10px 14px', borderRadius:'10px', border:`1.5px solid ${v.accent}44`, background:'rgba(255,255,255,0.7)', color:v.ink, fontSize:'14px', outline:'none', fontFamily:'inherit' }}
                    />
                    <button
                      disabled={!chatNameInput.trim()}
                      onClick={() => { if (chatNameInput.trim()) joinGiftChat(chatNameInput.trim()); }}
                      style={{ padding:'10px 18px', borderRadius:'10px', border:'none', background: chatNameInput.trim() ? `linear-gradient(135deg,${v.accent},${v.glow})` : `${v.accent}22`, color: chatNameInput.trim() ? 'white' : `${v.ink}44`, fontWeight:700, fontSize:'13px', cursor: chatNameInput.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit', flexShrink:0 }}
                    >Join →</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ height:'240px', overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign:'center', color:`${v.ink}44`, fontSize:'12px', marginTop:'80px' }}>Say hi! 👋</div>
                    )}
                    {chatMessages.map((msg, i) => (
                      msg.type === 'system' ? (
                        <div key={msg.id||i} style={{ textAlign:'center', fontSize:'11px', color:`${v.ink}44`, padding:'2px 0' }}>{msg.text}</div>
                      ) : (
                        <div key={msg.id||i} style={{ display:'flex', flexDirection:'column', alignItems: msg.from===chatName ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontSize:'10px', color:`${v.ink}55`, marginBottom:'2px', paddingLeft:'6px', paddingRight:'6px' }}>{msg.from} · {msg.time}</span>
                          <div style={{
                            maxWidth:'78%', padding:'8px 13px',
                            borderRadius: msg.from===chatName ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: msg.from===chatName ? `linear-gradient(135deg,${v.accent},${v.glow})` : 'rgba(255,255,255,0.65)',
                            color: msg.from===chatName ? 'white' : v.ink,
                            fontSize:'13.5px', wordBreak:'break-word', lineHeight:1.5,
                            boxShadow: msg.from===chatName ? `0 2px 12px ${v.glow}33` : '0 1px 4px rgba(0,0,0,0.08)',
                          }}>{msg.text}</div>
                        </div>
                      )
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ borderTop:`1px solid ${v.ruled}`, padding:'10px 12px 16px', display:'flex', gap:'8px', alignItems:'center' }}>
                    <input
                      type="text" placeholder="Type a message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                      maxLength={300}
                      style={{ flex:1, padding:'9px 14px', borderRadius:'99px', border:`1.5px solid ${v.accent}33`, background:'rgba(255,255,255,0.7)', color:v.ink, fontSize:'13px', outline:'none', fontFamily:'inherit' }}
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim()}
                      style={{ width:'36px', height:'36px', borderRadius:'50%', border:'none', background: chatInput.trim() ? `linear-gradient(135deg,${v.accent},${v.glow})` : `${v.accent}22`, color: chatInput.trim() ? 'white' : `${v.ink}44`, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}