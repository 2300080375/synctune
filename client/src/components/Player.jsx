import { useEffect, useState, useRef, useCallback } from 'react';

const fmt = (t) => {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const REACTIONS = [
  { emoji: '🔥', label: 'fire' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '😭', label: 'cry' },
  { emoji: '🎉', label: 'party' },
  { emoji: '💀', label: 'skull' },
];

const BAR_COUNT = 60;

// Generate stable random bar heights once per song
function generateBars() {
  return Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.75);
}

export default function Player({
  currentSong,
  isPlaying,
  isLoading,
  onPlay,
  sound,
  onNext,
  hasNext,
  // NEW: pass these from Room.jsx
  onReaction,       // fn(emoji) — emits reaction to room via socket
  incomingReaction, // { emoji, userName, id } — latest reaction received from socket
}) {
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const [volume, setVolume]         = useState(1);
  const [isSeeking, setIsSeeking]   = useState(false);
  const [floaters, setFloaters]     = useState([]);  // floating emoji elements
  const [pulseLevel, setPulseLevel] = useState(0);   // 0–1 waveform pulse intensity

  const progressUpdateRef = useRef(null);
  const canvasRef         = useRef(null);
  const barsRef           = useRef(generateBars());
  const pulseRef          = useRef(0);
  const animFrameRef      = useRef(null);
  const floaterIdRef      = useRef(0);

  // Regenerate bars on new song
  useEffect(() => {
    barsRef.current = generateBars();
  }, [currentSong?.id]);

  // Progress tracking
  useEffect(() => {
    if (!sound) return;
    const update = () => {
      try {
        if (sound && !isSeeking) {
          setProgress(sound.seek() || 0);
          setDuration(sound.duration() || 0);
        }
      } catch (_) {}
    };
    if (isPlaying) {
      progressUpdateRef.current = setInterval(update, 100);
    }
    return () => { if (progressUpdateRef.current) clearInterval(progressUpdateRef.current); };
  }, [sound, isPlaying, isSeeking]);

  useEffect(() => {
    if (!sound) return;
    try { const d = sound.duration() || 0; if (d > 0) setDuration(d); } catch (_) {}
  }, [sound, currentSong]);

  // Waveform canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let running = true;

    const draw = () => {
      if (!running) return;

      const W = canvas.offsetWidth * (window.devicePixelRatio || 1);
      const H = canvas.offsetHeight * (window.devicePixelRatio || 1);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);

      const pulse    = pulseRef.current;
      const gap      = 2 * (window.devicePixelRatio || 1);
      const barW     = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const midY     = H / 2;
      const pct      = duration > 0 ? progress / duration : 0;
      const now      = Date.now();

      for (let i = 0; i < BAR_COUNT; i++) {
        const played = i / BAR_COUNT < pct;
        const wave   = pulse > 0.05
          ? Math.sin(i * 0.35 + now * 0.008) * pulse * 0.5
          : 0;
        const h      = barsRef.current[i] * (H * 0.82) * (1 + wave);
        const x      = i * (barW + gap);
        const top    = midY - h / 2;
        const rx     = Math.min(barW / 2, 2 * (window.devicePixelRatio || 1));

        if (played) {
          // Played: purple; pulse shifts toward bright pink
          const r = Math.round(124 + pulse * 80);
          const g = Math.round(58  - pulse * 20);
          const b = Math.round(237 - pulse * 60);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
        }

        ctx.beginPath();
        ctx.roundRect(x, top, barW, h, rx);
        ctx.fill();
      }

      // Decay pulse
      if (pulseRef.current > 0) {
        pulseRef.current = Math.max(0, pulseRef.current - 0.025);
        setPulseLevel(pulseRef.current);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [progress, duration]);

  // Trigger pulse + floater on incoming reaction from ANY room member
  useEffect(() => {
    if (!incomingReaction) return;
    triggerReactionEffect(incomingReaction.emoji, incomingReaction.userName);
  }, [incomingReaction]);

  const triggerReactionEffect = useCallback((emoji, fromName) => {
    // Spike the pulse
    pulseRef.current = 1;

    // Add a floating emoji
    const id = floaterIdRef.current++;
    const left = 5 + Math.random() * 80; // % across the waveform
    const label = fromName ? `${fromName}` : '';
    setFloaters(prev => [...prev, { id, emoji, left, label }]);

    // Remove after animation
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== id));
    }, 1600);
  }, []);

  const handleLocalReaction = (emoji) => {
    // Trigger visual immediately for self
    triggerReactionEffect(emoji, 'You');
    // Broadcast to room
    if (onReaction) onReaction(emoji);
  };

  const handleSeek = (e) => {
    const t = Number(e.target.value);
    if (sound && !isLoading) { try { sound.seek(t); setProgress(t); } catch (_) {} }
  };
  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekEnd   = (e) => { setIsSeeking(false); handleSeek(e); };
  const handleVolume    = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (sound) { try { sound.volume(v); } catch (_) {} }
  };

  const img = currentSong?.image?.[2]?.url || currentSong?.image?.[1]?.url;

  return (
    <div style={{ background: 'rgba(13,13,20,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', padding: '10px 20px 14px', flexShrink: 0 }}>

      {/* ── Waveform progress bar ── */}
      <div style={{ position: 'relative', height: '48px', marginBottom: '4px', cursor: 'pointer' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '48px', display: 'block', borderRadius: '6px' }}
        />

        {/* Pulse ring overlay */}
        {pulseRef.current > 0.1 && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '6px', pointerEvents: 'none',
            boxShadow: `0 0 0 ${Math.round(pulseRef.current * 8)}px rgba(167,139,250,${(pulseRef.current * 0.3).toFixed(2)})`,
            transition: 'box-shadow 0.05s',
          }} />
        )}

        {/* Floating emoji reactions */}
        {floaters.map(f => (
          <div key={f.id} style={{
            position: 'absolute',
            bottom: '0',
            left: `${f.left}%`,
            pointerEvents: 'none',
            animation: 'floatUp 1.5s ease-out forwards',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{f.emoji}</span>
            {f.label && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '1px 4px', whiteSpace: 'nowrap' }}>
                {f.label}
              </span>
            )}
          </div>
        ))}

        {/* Invisible seek input over the canvas */}
        <input
          type="range" min="0" max={duration || 0} step="0.1" value={progress}
          onChange={handleSeek} onMouseDown={handleSeekStart} onMouseUp={handleSeekEnd}
          onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd}
          disabled={isLoading || !sound}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
        />
      </div>

      {/* Time row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#55546a', fontFamily: 'monospace' }}>{fmt(progress)}</span>
        <span style={{ fontSize: '10px', color: '#55546a', fontFamily: 'monospace' }}>{fmt(duration)}</span>
      </div>

      {/* ── Reaction buttons ── */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px' }}>
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={label}
            onClick={() => handleLocalReaction(emoji)}
            disabled={!currentSong}
            title={label}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '99px',
              padding: '4px 10px',
              fontSize: '16px',
              cursor: currentSong ? 'pointer' : 'not-allowed',
              opacity: currentSong ? 1 : 0.4,
              transition: 'transform 0.1s, background 0.15s',
              lineHeight: 1.4,
            }}
            onMouseEnter={e => { if (currentSong) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── Controls row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Song info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {img
              ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#f1f0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSong?.name || 'No song selected'}
            </p>
            <p style={{ fontSize: '11px', color: '#55546a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
              {currentSong?.primaryArtists || 'Select a song'}
            </p>
          </div>
        </div>

        {/* Playback controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'not-allowed', padding: '6px', opacity: 0.2, color: '#8b8aa8' }} disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" x2="5" y1="19" y2="5" />
            </svg>
          </button>

          <button
            onClick={onPlay}
            disabled={isLoading || !currentSong}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: '42px', height: '42px', borderRadius: '50%', border: 'none',
              cursor: (isLoading || !currentSong) ? 'not-allowed' : 'pointer',
              background: (isLoading || !currentSong) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (isLoading || !currentSong) ? 'none' : '0 0 20px rgba(124,58,237,0.5)',
              transition: 'transform 0.15s, box-shadow 0.15s', color: 'white',
            }}
            onMouseEnter={e => { if (!isLoading && currentSong) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(124,58,237,0.65)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = (isLoading || !currentSong) ? 'none' : '0 0 20px rgba(124,58,237,0.5)'; }}
          >
            {isLoading
              ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : isPlaying
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
            }
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            title={hasNext ? 'Next track' : 'Queue is empty'}
            style={{
              background: 'none', border: 'none', padding: '6px',
              cursor: hasNext ? 'pointer' : 'not-allowed',
              opacity: hasNext ? 1 : 0.2,
              color: hasNext ? '#a78bfa' : '#8b8aa8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { if (hasNext) e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" />
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
            {volume > 0  && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
          </svg>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', width: '100%', transform: 'translateY(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, height: '3px', borderRadius: '99px', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', width: `${volume * 100}%`, transform: 'translateY(-50%)' }} />
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume}
              style={{ position: 'relative', zIndex: 1, opacity: 0, cursor: 'pointer', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Float-up keyframe */}
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-72px) scale(1.25); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}