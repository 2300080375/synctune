import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Howl } from 'howler';

const BACKEND = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

/* ─── Vibe palettes — full emotional system ─── */
const VIBES = {
  dreamy:  { bg:'linear-gradient(160deg,#0b0820 0%,#1e1456 50%,#0f0c29 100%)', accent:'#c4b5fd', glow:'#7c3aed', stamp:'🌙', particle:'✦', paperBg:'#faf8ff', paperBg2:'#f0ecff', ink:'#2d1b6b', ruled:'rgba(124,58,237,0.09)' },
  warm:    { bg:'linear-gradient(160deg,#1a0030 0%,#4a0060 50%,#200040 100%)', accent:'#f9a8d4', glow:'#db2777', stamp:'💜', particle:'❤', paperBg:'#fff8fc', paperBg2:'#ffeef8', ink:'#6b0040', ruled:'rgba(219,39,119,0.09)' },
  intense: { bg:'linear-gradient(160deg,#0c0002 0%,#3d0a00 50%,#1a0500 100%)', accent:'#fdba74', glow:'#ea580c', stamp:'🔥', particle:'✦', paperBg:'#fffaf5', paperBg2:'#fff0e0', ink:'#7c2d12', ruled:'rgba(234,88,12,0.09)' },
  sweet:   { bg:'linear-gradient(160deg,#1a0015 0%,#4a0030 50%,#200020 100%)', accent:'#fda4af', glow:'#e11d48', stamp:'🌸', particle:'🌸', paperBg:'#fff8f9', paperBg2:'#ffecee', ink:'#7a0030', ruled:'rgba(225,29,72,0.09)' },
};

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
    const iv = setInterval(() => { setOut(text.slice(0,++i)); if (i>=text.length) clearInterval(iv); }, speed);
    return () => clearInterval(iv);
  }, [text, started]);
  return out;
}

const fmt = t => (!t||isNaN(t)) ? '0:00' : `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

/* ══════════════════════════════════════ */
export default function ForYouView() {
  const { giftId } = useParams();
  const navigate   = useNavigate();

  const [gift,         setGift]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [revealed,     setRevealed]     = useState(false);
  const [confetti,     setConfetti]     = useState(false);
  const [cardIn,       setCardIn]       = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [seekHover,    setSeekHover]    = useState(false);
  const [replyOpen,    setReplyOpen]    = useState(false);
  const [replyText,    setReplyText]    = useState('');
  const [replyFrom,    setReplyFrom]    = useState('');
  const [replySent,    setReplySent]    = useState(false);
  const [replySaving,  setReplySaving]  = useState(false);
  const [replyShared,  setReplyShared]  = useState(false);

  const soundRef = useRef(null);
  const progRef  = useRef(null);
  const seekRef  = useRef(null);

  const displayMsg = useTypewriter(gift?.message, revealed, 20);
  const v          = VIBES[gift?.vibe] || VIBES.dreamy;

  useEffect(() => {
    fetch(`${BACKEND}/api/gift/${giftId}`)
      .then(r=>r.json())
      .then(d=>{ if(d.error) setError('Gift not found 💔'); else setGift(d); })
      .catch(()=>setError('Could not load gift'))
      .finally(()=>setLoading(false));
  }, [giftId]);

  // Poll every 8 seconds so sender sees reply when it arrives
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND}/api/gift/${giftId}`)
        .then(r=>r.json())
        .then(d=>{ if (!d.error) setGift(d); })
        .catch(()=>{});
    }, 8000);
    return () => clearInterval(interval);
  }, [giftId]);

  useEffect(() => () => {
    soundRef.current?.stop(); soundRef.current?.unload(); clearInterval(progRef.current);
  }, []);

  const startSound = () => {
    if (!gift?.song?.audioUrl || soundRef.current) return;
    const proxy = `${BACKEND}/api/audio?url=${encodeURIComponent(gift.song.audioUrl)}`;
    const snd = new Howl({
      src:[proxy], html5:true, volume:0.9,
      onplay:  ()=>{ setIsPlaying(true); setDuration(snd.duration()); progRef.current=setInterval(()=>setProgress(snd.seek()||0),150); },
      onpause: ()=>{ setIsPlaying(false); clearInterval(progRef.current); },
      onend:   ()=>{ setIsPlaying(false); setProgress(0); clearInterval(progRef.current); },
    });
    soundRef.current = snd; snd.play();
  };

  const handleReveal = () => {
    setRevealed(true);
    setConfetti(true); setTimeout(()=>setConfetti(false),2200);
    setTimeout(()=>setCardIn(true),80);
    startSound();
  };

  const togglePlay = () => {
    if (!soundRef.current) { startSound(); return; }
    isPlaying ? soundRef.current.pause() : soundRef.current.play();
  };

  const seekTo = (e) => {
    if (!seekRef.current||!soundRef.current||!duration) return;
    const r = seekRef.current.getBoundingClientRect();
    const p = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    soundRef.current.seek(p*duration); setProgress(p*duration);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title:'For You 💝', url:window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  const pct = duration>0 ? (progress/duration)*100 : 0;

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#08060f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'20px', fontFamily:'DM Sans,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse2{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
      <div style={{ position:'relative', width:'56px', height:'56px' }}>
        <div style={{ position:'absolute', inset:0, border:'3px solid rgba(196,181,253,0.15)', borderTopColor:'#c4b5fd', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
        <div style={{ position:'absolute', inset:'8px', border:'3px solid rgba(196,181,253,0.08)', borderBottomColor:'#7c3aed', borderRadius:'50%', animation:'spin 1.4s linear infinite reverse' }} />
      </div>
      <p style={{ color:'rgba(196,181,253,0.4)', fontSize:'12px', letterSpacing:'0.14em', textTransform:'uppercase', animation:'pulse2 2s ease infinite' }}>Opening your gift...</p>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{ minHeight:'100vh', background:'#08060f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ fontSize:'56px' }}>💔</div>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'16px' }}>{error}</p>
    </div>
  );

  /* ════════════════════════════════
     ENVELOPE / SURPRISE SCREEN
  ════════════════════════════════ */
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

        {/* Floating envelope */}
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
          }}>
            💌
          </div>
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
          onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05) translateY(-2px)'; e.currentTarget.style.boxShadow=`0 0 0 1px ${v.accent}66, 0 16px 64px ${v.glow}88`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow=`0 0 0 1px ${v.accent}44, 0 8px 48px ${v.glow}66`;}}
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

  /* ════════════════════════════════
     REVEALED POSTCARD
  ════════════════════════════════ */
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
        @keyframes floatDrift    { 0%{transform:translateY(105vh) rotate(0deg);opacity:0} 8%{opacity:0.5} 92%{opacity:0.15} 100%{transform:translateY(-8vh) rotate(360deg);opacity:0} }
        @keyframes shimmerOrb    { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.4)} }
        @keyframes confettiFall  { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(var(--rot));opacity:0} }
        @keyframes cardReveal    { 0%{opacity:0;transform:translateY(48px) scale(0.9) rotateX(10deg)} 60%{transform:translateY(-6px) scale(1.015) rotateX(-1deg)} 100%{opacity:1;transform:translateY(0) scale(1) rotateX(0)} }
        @keyframes blink         { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin          { to{transform:rotate(360deg)} }
        @keyframes fadeIn        { from{opacity:0} to{opacity:1} }
        @keyframes slideUp       { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulseGlow     { 0%,100%{box-shadow:0 0 16px ${v.accent}44} 50%{box-shadow:0 0 36px ${v.accent}88} }
        @keyframes stampWiggle   { 0%,100%{transform:rotate(-1.5deg) scale(1)} 50%{transform:rotate(1.5deg) scale(1.03)} }
        @keyframes waveBar1      { 0%,100%{height:4px} 50%{height:14px} }
        @keyframes waveBar2      { 0%,100%{height:8px} 50%{height:4px} }
        @keyframes waveBar3      { 0%,100%{height:12px} 50%{height:6px} }
        @keyframes waveBar4      { 0%,100%{height:6px} 50%{height:12px} }
        @keyframes waveBar5      { 0%,100%{height:10px} 50%{height:4px} }
        @keyframes photoSheen    { 0%{left:-100%} 100%{left:200%} }
        .postcard-shadow {
          filter: drop-shadow(0 24px 48px rgba(0,0,0,0.7)) drop-shadow(0 4px 12px rgba(0,0,0,0.4));
        }
      `}</style>

      <Particles vibe={gift.vibe} />
      <Confetti active={confetti} accent={v.accent} />

      {/* Deep cinematic background */}
      {gift.photo && (
        <>
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${gift.photo})`, backgroundSize:'cover', backgroundPosition:'center top', filter:'blur(24px) brightness(0.25) saturate(2)', transform:'scale(1.1)', zIndex:0 }} />
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%, ${v.glow}50 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.85) 0%, transparent 55%)`, zIndex:1 }} />
          {/* Vignette */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)', zIndex:1 }} />
        </>
      )}

      {/* ══════════ THE POSTCARD ══════════ */}
      <div
        className="postcard-shadow"
        style={{
          position:'relative', zIndex:3,
          width:'min(500px, calc(100vw - 32px))',
          borderRadius:'24px', overflow:'visible',
          animation: cardIn ? 'cardReveal 0.75s cubic-bezier(.22,1.2,.36,1) both' : 'none',
          perspective:'1000px',
        }}>

        {/* Card itself */}
        <div style={{
          borderRadius:'24px',
          overflow:'hidden',
          background:`linear-gradient(160deg, ${v.paperBg} 0%, ${v.paperBg2} 100%)`,
          boxShadow:`
            0 0 0 1px rgba(255,255,255,0.85),
            0 2px 0 1px ${v.accent}44,
            inset 0 1px 0 rgba(255,255,255,0.95)
          `,
        }}>

          {/* ── PHOTO ── */}
          <div style={{ position:'relative', width:'100%', overflow:'hidden', maxHeight:'min(58vh,370px)', minHeight:'200px' }}>
            {gift.photo ? (
              <>
                <img src={gift.photo} alt="gift" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', display:'block', minHeight:'200px', maxHeight:'min(58vh,370px)' }} />
                {/* Sheen effect */}
                <div style={{ position:'absolute', top:0, bottom:0, width:'40%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', animation:'photoSheen 2.5s 0.8s ease forwards', pointerEvents:'none' }} />
              </>
            ) : (
              <div style={{ width:'100%', height:'260px', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px' }}>📸</div>
            )}

            {/* Paper fade */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'90px', background:`linear-gradient(to bottom, transparent, ${v.paperBg})`, pointerEvents:'none' }} />

            {/* Close */}
            <button onClick={()=>navigate('/')}
              style={{ position:'absolute', top:'12px', right:'12px', width:'32px', height:'32px', borderRadius:'50%', background:'rgba(0,0,0,0.45)', border:'none', color:'white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', zIndex:2, transition:'background 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.75)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.45)'}
            >✕</button>

            {/* Now playing waveform badge */}
            {isPlaying && (
              <div style={{ position:'absolute', bottom:'18px', left:'16px', display:'flex', alignItems:'center', gap:'8px', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(12px)', borderRadius:'99px', padding:'6px 14px 6px 10px', border:`1px solid ${v.accent}44` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'14px' }}>
                  {['waveBar1','waveBar2','waveBar3','waveBar4','waveBar5'].map((a,i)=>(
                    <div key={i} style={{ width:'3px', background:v.accent, borderRadius:'2px', animation:`${a} ${0.4+i*0.07}s ${i*0.06}s ease-in-out infinite` }} />
                  ))}
                </div>
                <span style={{ color:'white', fontSize:'10px', fontWeight:600 }}>
                  {gift.song?.name?.length>22 ? gift.song.name.slice(0,22)+'…' : gift.song?.name}
                </span>
              </div>
            )}
          </div>

          {/* ── BODY ── */}
          <div style={{ padding:'18px 20px 0', position:'relative' }}>

            {/* Ruled lines */}
            <div style={{ position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(transparent,transparent 30px,${v.ruled} 30px,${v.ruled} 31px)`, backgroundPosition:'0 46px', pointerEvents:'none' }} />

            <div style={{ display:'flex', gap:'14px', position:'relative', zIndex:1 }}>

              {/* LEFT */}
              <div style={{ flex:1, minWidth:0 }}>

                {/* For You + from */}
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'13px', flexWrap:'wrap' }}>
                  <span style={{ background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'9.5px', padding:'4px 10px', borderRadius:'6px', letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:`0 2px 10px ${v.glow}44`, flexShrink:0 }}>
                    💝 For You
                  </span>
                  <span style={{ fontSize:'12px', color:`${v.ink}77`, fontStyle:'italic' }}>
                    — from <strong style={{ color:v.ink }}>{gift.from}</strong>
                  </span>
                </div>

                {/* Message in Caveat cursive */}
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

              {/* RIGHT: stamp column */}
              <div style={{ flexShrink:0, width:'66px', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'2px', position:'relative' }}>
                {/* Dashed divider */}
                <div style={{ position:'absolute', left:'-7px', top:0, bottom:0, borderLeft:`2px dashed ${v.ruled}` }} />

                {/* Stamp */}
                <div style={{
                  width:'60px', height:'74px',
                  background:`linear-gradient(160deg,${v.accent}28,${v.accent}50)`,
                  border:`2px solid ${v.accent}88`,
                  borderRadius:'5px',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px',
                  outline:`3px dotted ${v.accent}55`, outlineOffset:'3px',
                  animation:'stampWiggle 4.5s ease-in-out infinite',
                  boxShadow:`0 3px 14px ${v.glow}33, inset 0 1px 0 rgba(255,255,255,0.6)`,
                  cursor:'default',
                }}>
                  <div style={{ fontSize:'26px', filter:`drop-shadow(0 0 8px ${v.accent})` }}>{v.stamp}</div>
                  <div style={{ fontSize:'6.5px', fontFamily:"'Syne',sans-serif", fontWeight:800, color:v.glow, letterSpacing:'0.08em', textAlign:'center', lineHeight:1.3 }}>
                    FOR<br/>YOU
                  </div>
                </div>

                {/* Postmark */}
                <div style={{ marginTop:'9px', width:'54px', height:'54px', border:`1.5px solid ${v.accent}44`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', opacity:0.55 }}>
                  <div style={{ position:'absolute', inset:0, border:`1px dashed ${v.accent}33`, borderRadius:'50%' }} />
                  <span style={{ fontSize:'8px', fontFamily:'monospace', color:v.ink, textAlign:'center', lineHeight:1.4, fontWeight:700, letterSpacing:'0.04em' }}>
                    {new Date().toLocaleDateString('en',{month:'short',day:'numeric'})}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Song player ── */}
            <div style={{
              marginBottom:'16px', position:'relative', zIndex:1,
              background:'rgba(255,255,255,0.55)',
              backdropFilter:'blur(8px)',
              borderRadius:'18px',
              padding:'12px 14px',
              border:`1.5px solid ${v.accent}33`,
              boxShadow:`inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 12px rgba(0,0,0,0.06), 0 0 0 0px ${v.accent}22`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
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
                  <p style={{ color:`${v.ink}66`, fontSize:'10px', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{gift.song?.artist}</p>
                </div>

                {/* Play/pause */}
                <button onClick={togglePlay}
                  style={{ width:'40px', height:'40px', borderRadius:'50%', border:'none', flexShrink:0, background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 0 3px ${v.accent}33, 0 4px 18px ${v.glow}55`, transition:'transform 0.15s', animation: isPlaying?'pulseGlow 1.5s ease-in-out infinite':'none' }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                >
                  {isPlaying
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:'2px'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  }
                </button>
              </div>

              {/* Seek */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px' }}>
                <span style={{ fontSize:'9px', color:`${v.ink}55`, fontFamily:'monospace', width:'28px', flexShrink:0 }}>{fmt(progress)}</span>
                <div ref={seekRef} onClick={seekTo}
                  onMouseEnter={()=>setSeekHover(true)} onMouseLeave={()=>setSeekHover(false)}
                  style={{ flex:1, height:seekHover?'7px':'4px', borderRadius:'99px', background:`${v.accent}22`, cursor:'pointer', transition:'height 0.15s', overflow:'hidden' }}
                >
                  <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${v.accent},${v.glow})`, borderRadius:'99px', transition:'width 0.15s linear', boxShadow:`0 0 8px ${v.accent}88` }} />
                </div>
                <span style={{ fontSize:'9px', color:`${v.ink}55`, fontFamily:'monospace', width:'28px', textAlign:'right', flexShrink:0 }}>{fmt(duration)}</span>
              </div>
            </div>

          </div>{/* end body padding */}

          {/* ── Action bar ── */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'8px', padding:'0 20px 22px', position:'relative', zIndex:1 }}>
            <button onClick={()=>navigate('/')}
              style={{ padding:'12px 8px', borderRadius:'99px', border:'none', background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', fontWeight:700, fontSize:'11.5px', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.02em', boxShadow:`0 4px 22px ${v.glow}55`, transition:'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 32px ${v.glow}77`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=`0 4px 22px ${v.glow}55`;}}
            >🎵 Listen Together</button>

            {gift?.reply ? (
              /* ── Sender sees the reply ── */
              <div style={{ padding:'12px 16px', borderRadius:'14px', background:`${v.accent}18`, border:`1.5px solid ${v.accent}44`, textAlign:'left' }}>
                <p style={{ margin:'0 0 4px', fontSize:'10px', fontWeight:700, color:`${v.ink}66`, textTransform:'uppercase', letterSpacing:'0.1em' }}>💌 Reply from {gift.reply.from}</p>
                <p style={{ margin:0, fontFamily:"'Caveat',cursive", fontSize:'17px', color:v.ink, lineHeight:1.5, fontStyle:'italic' }}>"{gift.reply.text}"</p>
              </div>
            ) : (
              <button onClick={()=>setReplyOpen(true)}
                style={{ padding:'12px 8px', borderRadius:'99px', border:`2px solid ${v.accent}66`, background:`${v.accent}14`, color:v.glow, fontSize:'11.5px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${v.accent}28`; e.currentTarget.style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${v.accent}14`; e.currentTarget.style.transform='translateY(0)';}}
              >✍️ Reply</button>
            )}

            <button onClick={handleShare}
              style={{ padding:'12px 8px', borderRadius:'99px', border:`2px solid ${v.ruled}`, background:'rgba(0,0,0,0.04)', color:`${v.ink}88`, fontSize:'11.5px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.08)'; e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.04)'; e.currentTarget.style.transform='translateY(0)';}}
            >🔗 Share</button>
          </div>

        </div>{/* end card inner */}
      </div>{/* end postcard wrapper */}

      {/* ════════════════════════
          REPLY BOTTOM SHEET
      ════════════════════════ */}
      {replyOpen && (
        <div
          style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(14px)', display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'fadeIn 0.2s ease' }}
          onClick={e=>{ if(e.target===e.currentTarget){ setReplyOpen(false); setReplySent(false); setReplyText(''); } }}
        >
          <div style={{ background:`linear-gradient(160deg,${v.paperBg},${v.paperBg2})`, borderRadius:'28px 28px 0 0', padding:'12px 24px 44px', width:'100%', maxWidth:'540px', boxShadow:`0 -2px 0 ${v.accent}55, 0 -16px 60px rgba(0,0,0,0.5)`, animation:'slideUp 0.38s cubic-bezier(.22,1.2,.36,1)' }}>

            <div style={{ width:'36px', height:'4px', borderRadius:'99px', background:`${v.accent}55`, margin:'0 auto 24px' }} />

            {replySent ? (
              <div style={{ textAlign:'center', paddingBottom:'8px' }}>
                <div style={{ fontSize:'60px', marginBottom:'16px', filter:`drop-shadow(0 0 20px ${v.accent})` }}>💌</div>
                <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'24px', color:v.ink, margin:'0 0 10px' }}>Reply Ready!</h3>
                <div style={{ background:`${v.accent}18`, border:`1.5px solid ${v.accent}44`, borderRadius:'16px', padding:'16px 20px', margin:'0 0 24px' }}>
                  <p style={{ fontFamily:"'Caveat',cursive", fontSize:'20px', color:v.ink, margin:0, lineHeight:1.5, fontStyle:'italic' }}>"{replyText}"</p>
                </div>
                <button
                  onClick={async()=>{
                    const txt=`💌 Reply to ${gift.from}'s gift:\n"${replyText}"\n\nSee the original: ${window.location.href}`;
                    try {
                      if(navigator.share) await navigator.share({title:`Reply to ${gift.from} 💌`,text:txt,url:window.location.href});
                      else { await navigator.clipboard.writeText(txt); setReplyShared(true); setTimeout(()=>setReplyShared(false),2500); }
                    } catch {}
                  }}
                  style={{ width:'100%', padding:'16px', borderRadius:'99px', border:'none', background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', fontWeight:800, fontSize:'15px', cursor:'pointer', fontFamily:'inherit', marginBottom:'10px', boxShadow:`0 6px 28px ${v.glow}55`, letterSpacing:'0.02em' }}>
                  {replyShared ? '✓ Copied to clipboard!' : '📤 Share My Reply'}
                </button>
                <button onClick={()=>{ setReplyOpen(false); setReplySent(false); setReplyText(''); }}
                  style={{ width:'100%', padding:'13px', borderRadius:'99px', border:`1.5px solid ${v.ruled}`, background:'transparent', color:`${v.ink}66`, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
                  <span style={{ background:`linear-gradient(135deg,${v.accent},${v.glow})`, color:'white', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'10px', padding:'4px 10px', borderRadius:'6px', letterSpacing:'0.08em', textTransform:'uppercase' }}>✍️ Reply</span>
                  <span style={{ fontSize:'13px', color:`${v.ink}77`, fontStyle:'italic' }}>to <strong style={{color:v.ink}}>{gift.from}</strong></span>
                </div>

                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={replyFrom}
                  onChange={e=>setReplyFrom(e.target.value)}
                  maxLength={30}
                  style={{ width:'100%', padding:'12px 16px', borderRadius:'12px', border:`1.5px solid ${v.ruled}`, background:`${v.paperBg2}`, color:v.ink, fontSize:'13px', outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', marginBottom:'10px' }}
                />
                <textarea
                  autoFocus
                  value={replyText}
                  onChange={e=>setReplyText(e.target.value)}
                  placeholder={`Write back to ${gift.from}... ✨`}
                  maxLength={300} rows={5}
                  style={{
                    width:'100%', padding:'14px 16px', boxSizing:'border-box',
                    background:'rgba(255,255,255,0.75)',
                    border:`2px solid ${v.accent}44`, borderRadius:'16px',
                    color:v.ink, fontSize:'18px',
                    fontFamily:"'Caveat','Georgia',cursive",
                    resize:'none', outline:'none', lineHeight:'30px',
                    backgroundImage:`repeating-linear-gradient(transparent,transparent 29px,${v.ruled} 29px,${v.ruled} 30px)`,
                    backgroundPosition:'0 11px',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e=>{e.target.style.borderColor=v.accent; e.target.style.boxShadow=`0 0 0 4px ${v.accent}22`;}}
                  onBlur={e=>{e.target.style.borderColor=`${v.accent}44`; e.target.style.boxShadow='none';}}
                />
                <p style={{ color:`${v.ink}44`, fontSize:'10px', textAlign:'right', margin:'4px 0 16px' }}>{replyText.length}/300</p>

                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={()=>{ setReplyOpen(false); setReplyText(''); setReplyFrom(''); }}
                    style={{ flex:1, padding:'13px', borderRadius:'99px', border:`1.5px solid ${v.ruled}`, background:'transparent', color:`${v.ink}66`, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    Cancel
                  </button>
                  <button
                    disabled={!replyText.trim() || replySaving}
                    onClick={async ()=>{
                      if (!replyText.trim()) return;
                      setReplySaving(true);
                      try {
                        const res = await fetch(`${BACKEND}/api/gift/${giftId}/reply`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ replyText: replyText.trim(), replyFrom: replyFrom.trim() || 'them' }),
                        });
                        if (res.ok) { setReplySent(true); setGift(g => ({...g, reply: {text: replyText.trim(), from: replyFrom.trim()||'them'}})); }
                        else alert('Reply save fail aindi, try again!');
                      } catch { alert('Network error, try again!'); }
                      finally { setReplySaving(false); }
                    }}
                    style={{
                      flex:2, padding:'13px', borderRadius:'99px', border:'none',
                      background: replyText.trim()?`linear-gradient(135deg,${v.accent},${v.glow})`:`${v.accent}22`,
                      color: replyText.trim()?'white':`${v.ink}44`,
                      fontWeight:800, fontSize:'14px',
                      cursor: replyText.trim()?'pointer':'not-allowed',
                      fontFamily:'inherit', letterSpacing:'0.02em',
                      boxShadow: replyText.trim()?`0 6px 24px ${v.glow}44`:'none',
                      transition:'all 0.2s',
                    }}>
                    {replySaving ? '💌 Sending...' : '✨ Send Reply'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}