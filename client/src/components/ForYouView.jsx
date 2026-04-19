import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { showToast } from '../components/Toast';

const BACKEND = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const VIBE_OVERLAYS = {
  dreamy:  'linear-gradient(160deg, rgba(124,58,237,0.55) 0%, rgba(45,27,105,0.7) 100%)',
  warm:    'linear-gradient(160deg, rgba(219,39,119,0.5) 0%, rgba(124,58,237,0.6) 100%)',
  intense: 'linear-gradient(160deg, rgba(220,38,38,0.6) 0%, rgba(124,45,18,0.75) 100%)',
  sweet:   'linear-gradient(160deg, rgba(244,114,182,0.5) 0%, rgba(131,24,67,0.7) 100%)',
};

export default function ForYouView() {
  const { giftId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const [gift, setGift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const shareUrl = window.location.href;

  useEffect(() => {
    async function fetchGift() {
      try {
        const res = await fetch(`${BACKEND}/api/gift/${giftId}`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        setGift(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchGift();
  }, [giftId]);

  // Auto-play immediately when gift is revealed
  const handleOpen = () => {
    setRevealed(true);
    // Small delay to let audio element mount
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
    }, 300);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      showToast('Link copied! 🔗', 'success');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0d0d14', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎁</div>
        <div style={{ color:'#a78bfa', fontSize:'16px' }}>Unwrapping your gift…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight:'100vh', background:'#0d0d14', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ fontSize:'52px' }}>💔</div>
      <div style={{ color:'#f1f0ff', fontSize:'20px', fontWeight:700 }}>Gift not found</div>
      <div style={{ color:'#6b6a84', fontSize:'14px', textAlign:'center', maxWidth:'280px' }}>This gift may have expired or the link is broken.</div>
      <button onClick={() => navigate('/')} style={{ marginTop:'8px', padding:'13px 32px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#7c3aed,#db2777)', color:'white', fontWeight:700, fontSize:'15px', cursor:'pointer', fontFamily:'inherit' }}>
        Go Home
      </button>
    </div>
  );

  const song = gift.song;
  const vibeOverlay = VIBE_OVERLAYS[gift.vibe] || VIBE_OVERLAYS.dreamy;
  const rawAudioUrl = song?.audioUrl
    || song?.downloadUrl?.find(d => d.quality === '320kbps')?.url
    || song?.downloadUrl?.find(d => d.quality === '160kbps')?.url
    || song?.downloadUrl?.[0]?.url;

  const audioSrc = rawAudioUrl
    ? `${BACKEND}/api/audio?url=${encodeURIComponent(rawAudioUrl)}`
    : null;

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      fontFamily: "'DM Sans',system-ui,sans-serif",
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>

      {/* ── BLURRED PHOTO BACKGROUND ── */}
      {gift.photo ? (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `url(${gift.photo})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(28px) brightness(0.45) saturate(1.4)',
          transform: 'scale(1.12)',
        }} />
      ) : (
        <div style={{ position:'fixed', inset:0, zIndex:0, background:'linear-gradient(135deg,#0d0d14,#1a0a2e)' }} />
      )}

      {/* Vibe colour overlay */}
      <div style={{ position:'fixed', inset:0, zIndex:1, background: vibeOverlay, opacity:0.6 }} />

      {/* ── ✕ CLOSE BUTTON ── */}
      <button
        onClick={() => navigate('/')}
        title="Back to Home"
        style={{
          position:'fixed', top:'18px', right:'18px', zIndex:200,
          width:'38px', height:'38px', borderRadius:'50%',
          background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.18)',
          color:'#fff', fontSize:'16px', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(12px)', transition:'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.4)'}
      >✕</button>

      {/* ── CONTENT ── */}
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'420px', padding:'24px 16px', boxSizing:'border-box' }}>

        {!revealed ? (
          /* ── ENVELOPE / OPEN SCREEN ── */
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'72px', marginBottom:'8px', filter:'drop-shadow(0 4px 24px rgba(244,114,182,0.6))' }}>🎁</div>
            <h2 style={{ margin:'0 0 6px', color:'#fff', fontSize:'24px', fontWeight:800, textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>
              You have a gift!
            </h2>
            <p style={{ margin:'0 0 32px', color:'rgba(255,255,255,0.7)', fontSize:'15px' }}>
              from <span style={{ color:'#f9a8d4', fontWeight:700 }}>{gift.from}</span>
            </p>
            <button
              onClick={handleOpen}
              style={{
                padding:'16px 44px', borderRadius:'100px', border:'none',
                background:'linear-gradient(135deg,#7c3aed,#db2777)',
                color:'white', fontWeight:700, fontSize:'17px', cursor:'pointer',
                boxShadow:'0 8px 40px rgba(124,58,237,0.55)',
                fontFamily:'inherit', transition:'transform 0.15s, box-shadow 0.15s',
                letterSpacing:'-0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow='0 12px 50px rgba(124,58,237,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 8px 40px rgba(124,58,237,0.55)'; }}
            >
              Open Gift 💌
            </button>
          </div>

        ) : (
          /* ── FROSTED GLASS CARD (Instagram story style) ── */
          <>
            {/* Audio element — hidden */}
            {audioSrc && (
              <audio
                ref={audioRef}
                src={audioSrc}
                onEnded={() => setPlaying(false)}
                onError={() => setPlaying(false)}
              />
            )}

            <div style={{
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '28px',
              padding: '0',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}>

              {/* ── TOP: PHOTO + CONTENT ROW ── */}
              <div style={{ display:'flex', gap:'0', padding:'22px 22px 18px' }}>

                {/* Left: square photo */}
                {gift.photo && (
                  <div style={{
                    width:'90px', flexShrink:0, marginRight:'16px',
                    borderRadius:'16px', overflow:'hidden',
                    border:'2px solid rgba(255,255,255,0.2)',
                    boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
                    alignSelf:'flex-start',
                  }}>
                    <img
                      src={gift.photo}
                      alt=""
                      style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}
                    />
                  </div>
                )}

                {/* Right: all text */}
                <div style={{ flex:1, minWidth:0 }}>

                  {/* "For You" badge */}
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
                    <span style={{ fontSize:'16px' }}>💝</span>
                    <span style={{ color:'#fff', fontWeight:800, fontSize:'16px', letterSpacing:'-0.02em' }}>For You</span>
                  </div>

                  {/* Message */}
                  <div style={{
                    color:'rgba(255,255,255,0.88)',
                    fontSize:'13.5px',
                    lineHeight: 1.65,
                    marginBottom:'14px',
                    fontStyle:'italic',
                    display:'-webkit-box',
                    WebkitLineClamp:4,
                    WebkitBoxOrient:'vertical',
                    overflow:'hidden',
                  }}>
                    "{gift.message}"
                  </div>

                  {/* Song row */}
                  {song && (
                    <div style={{ marginBottom:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                        <span style={{ fontSize:'13px' }}>🎵</span>
                        <span style={{ color:'#e9d5ff', fontWeight:700, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{song.name}</span>
                      </div>
                      <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'12px', paddingLeft:'19px', marginBottom:'8px' }}>{song.artist}</div>

                      {/* Play/Pause button */}
                      {audioSrc && (
                        <button
                          onClick={togglePlay}
                          style={{
                            display:'flex', alignItems:'center', gap:'6px',
                            padding:'7px 14px', borderRadius:'100px', border:'none',
                            background: playing ? 'rgba(255,255,255,0.15)' : 'rgba(167,139,250,0.8)',
                            color:'white', fontWeight:700, fontSize:'12px', cursor:'pointer',
                            fontFamily:'inherit', transition:'all 0.2s',
                            backdropFilter:'blur(8px)',
                          }}
                        >
                          {playing ? '⏸ Pause' : '▶ Play'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* From signature */}
                  <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px' }}>
                    — From <span style={{ color:'#f9a8d4', fontWeight:700 }}>{gift.from}</span> 💗
                  </div>
                </div>
              </div>

              {/* ── DIVIDER ── */}
              <div style={{ height:'1px', background:'rgba(255,255,255,0.1)', margin:'0 22px' }} />

              {/* ── BOTTOM: LISTEN TOGETHER BUTTON ── */}
              <div style={{ padding:'14px 22px' }}>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    width:'100%', padding:'13px', borderRadius:'14px', border:'none',
                    background:'rgba(167,139,250,0.2)',
                    color:'#e9d5ff', fontWeight:700, fontSize:'14px', cursor:'pointer',
                    fontFamily:'inherit', transition:'background 0.2s',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    backdropFilter:'blur(8px)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.32)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(167,139,250,0.2)'}
                >
                  🎵 Listen Together on SyncTune
                </button>
              </div>
            </div>

            {/* ── SHARE SECTION (below card) ── */}
            <div style={{ marginTop:'20px' }}>
              {!showShare ? (
                <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                  <button
                    onClick={() => setShowShare(true)}
                    style={{
                      padding:'10px 22px', borderRadius:'100px', border:'1px solid rgba(255,255,255,0.2)',
                      background:'rgba(0,0,0,0.3)', color:'rgba(255,255,255,0.8)', fontSize:'13px',
                      fontWeight:600, cursor:'pointer', fontFamily:'inherit', backdropFilter:'blur(8px)',
                      display:'flex', alignItems:'center', gap:'6px'
                    }}
                  >
                    🔗 Share this gift
                  </button>
                  <button
                    onClick={() => navigate('/for-you/create')}
                    style={{
                      padding:'10px 22px', borderRadius:'100px', border:'1px solid rgba(255,255,255,0.2)',
                      background:'rgba(0,0,0,0.3)', color:'rgba(255,255,255,0.8)', fontSize:'13px',
                      fontWeight:600, cursor:'pointer', fontFamily:'inherit', backdropFilter:'blur(8px)',
                    }}
                  >
                    💝 Make your own
                  </button>
                </div>
              ) : (
                <div style={{
                  background:'rgba(0,0,0,0.35)', backdropFilter:'blur(20px)',
                  border:'1px solid rgba(255,255,255,0.15)', borderRadius:'18px', padding:'16px'
                }}>
                  <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px', fontWeight:600, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Share link
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <div style={{
                      flex:1, padding:'10px 12px', background:'rgba(255,255,255,0.07)',
                      border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px',
                      color:'rgba(255,255,255,0.5)', fontSize:'12px',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                    }}>
                      {shareUrl}
                    </div>
                    <button
                      onClick={copyLink}
                      style={{
                        padding:'10px 16px', borderRadius:'10px', border:'none', flexShrink:0,
                        background: copied ? 'rgba(52,211,153,0.25)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
                        color: copied ? '#34d399' : 'white',
                        fontWeight:700, fontSize:'12px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s'
                      }}
                    >
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowShare(false)}
                    style={{ marginTop:'10px', background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}