import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRoomId } from '../roomManager';
import { showToast } from '../components/Toast';

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    setCreatedRoom(roomId);
    showToast('Room created! Share the code.', 'success');
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) { showToast('Please enter a room code', 'warning'); return; }
    if (code.length !== 6) { showToast('Room codes are 6 characters', 'warning'); return; }
    navigate(`/room/${code}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdRoom);
      setCopied(true);
      showToast('Copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy manually', 'error');
    }
  };

  return (
    <div style={{minHeight:'100vh', background:'#0d0d14', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden', fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      {/* Ambient orbs */}
      <div style={{position:'absolute', top:'15%', left:'20%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents:'none'}} />
      <div style={{position:'absolute', bottom:'15%', right:'20%', width:'350px', height:'350px', borderRadius:'50%', background:'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)', pointerEvents:'none'}} />

      <div style={{width:'100%', maxWidth:'420px', position:'relative', zIndex:1}}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'60px', height:'60px', borderRadius:'18px',
            background:'linear-gradient(135deg, #7c3aed, #db2777)',
            boxShadow:'0 0 40px rgba(124,58,237,0.4)',
            marginBottom:'16px'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <h1 style={{fontFamily:"'Syne',system-ui,sans-serif", fontSize:'32px', fontWeight:800, color:'white', letterSpacing:'-0.5px', lineHeight:1.1}}>
            Sync<span style={{background:'linear-gradient(135deg,#a78bfa,#f472b6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>Tune</span>
          </h1>
          <p style={{color:'#6b6a84', fontSize:'14px', marginTop:'6px'}}>Listen together, in perfect sync</p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,0.025)', borderRadius:'20px',
          border:'1px solid rgba(255,255,255,0.07)',
          padding:'28px', backdropFilter:'blur(20px)'
        }}>
          {!createdRoom ? (
            <div>
              <button
                onClick={handleCreateRoom}
                style={{
                  width:'100%', padding:'14px', borderRadius:'12px', border:'none',
                  background:'linear-gradient(135deg, #7c3aed, #db2777)',
                  color:'white', fontWeight:600, fontSize:'15px', cursor:'pointer',
                  boxShadow:'0 4px 24px rgba(124,58,237,0.4)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                  transition:'transform 0.15s, box-shadow 0.15s', marginBottom:'20px'
                }}
                onMouseEnter={e => { e.target.style.transform='translateY(-1px)'; e.target.style.boxShadow='0 6px 32px rgba(124,58,237,0.5)'; }}
                onMouseLeave={e => { e.target.style.transform='none'; e.target.style.boxShadow='0 4px 24px rgba(124,58,237,0.4)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4"/></svg>
                Create a Room
              </button>

              <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px'}}>
                <div style={{flex:1, height:'1px', background:'rgba(255,255,255,0.06)'}}/>
                <span style={{color:'#55546a', fontSize:'12px', fontWeight:500, letterSpacing:'0.05em'}}>OR</span>
                <div style={{flex:1, height:'1px', background:'rgba(255,255,255,0.06)'}}/>
              </div>

              <form onSubmit={handleJoinRoom}>
                <label style={{display:'block', fontSize:'11px', fontWeight:600, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px'}}>Room Code</label>
                <input
                  type="text"
                  placeholder="AB3X7K"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0,6))}
                  maxLength={6}
                  style={{
                    width:'100%', padding:'14px', background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px',
                    color:'white', fontSize:'22px', fontFamily:'monospace', letterSpacing:'0.3em',
                    textAlign:'center', outline:'none', marginBottom:'12px',
                    transition:'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={e => { e.target.style.borderColor='rgba(167,139,250,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(167,139,250,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.08)'; e.target.style.boxShadow='none'; }}
                />
                <button
                  type="submit"
                  style={{
                    width:'100%', padding:'13px', borderRadius:'12px',
                    border:'1px solid rgba(255,255,255,0.1)',
                    background:'rgba(255,255,255,0.05)',
                    color:'#c4c3de', fontWeight:600, fontSize:'14px', cursor:'pointer',
                    transition:'background 0.2s, color 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(167,139,250,0.12)'; e.currentTarget.style.color='#a78bfa'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#c4c3de'; }}
                >
                  Join Room
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p style={{fontSize:'11px', fontWeight:600, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', textAlign:'center', marginBottom:'16px'}}>Room Created</p>
              <div
                onClick={handleCopy}
                style={{
                  background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.25)',
                  borderRadius:'14px', padding:'20px', textAlign:'center', cursor:'pointer',
                  marginBottom:'12px', transition:'border-color 0.2s, background 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(167,139,250,0.5)'; e.currentTarget.style.background='rgba(167,139,250,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(167,139,250,0.25)'; e.currentTarget.style.background='rgba(167,139,250,0.08)'; }}
              >
                <p style={{fontSize:'34px', fontWeight:800, fontFamily:'monospace', letterSpacing:'0.25em', color:'white', marginBottom:'8px'}}>{createdRoom}</p>
                <p style={{fontSize:'12px', color: copied ? '#a78bfa' : '#55546a'}}>{copied ? '✓ Copied to clipboard' : 'Click to copy'}</p>
              </div>
              <p style={{fontSize:'12px', color:'#55546a', textAlign:'center', marginBottom:'20px'}}>Share this code with friends</p>
              <button
                onClick={() => navigate(`/room/${createdRoom}`)}
                style={{
                  width:'100%', padding:'14px', borderRadius:'12px', border:'none',
                  background:'linear-gradient(135deg, #7c3aed, #db2777)',
                  color:'white', fontWeight:600, fontSize:'15px', cursor:'pointer',
                  boxShadow:'0 4px 24px rgba(124,58,237,0.4)', marginBottom:'10px'
                }}
              >
                Enter Room →
              </button>
              <button
                onClick={() => setCreatedRoom(null)}
                style={{
                  width:'100%', padding:'12px', borderRadius:'12px',
                  border:'1px solid rgba(255,255,255,0.08)', background:'transparent',
                  color:'#6b6a84', fontSize:'14px', fontWeight:500, cursor:'pointer'
                }}
              >
                Create New Room
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px', marginTop:'16px'}}>
          {[{icon:'🔍',label:'Search'},{icon:'🔄',label:'Sync'},{icon:'💬',label:'Chat'},{icon:'🎵',label:'320kbps'}].map(f => (
            <div key={f.label} style={{textAlign:'center', padding:'12px 8px', borderRadius:'12px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{fontSize:'18px', marginBottom:'4px'}}>{f.icon}</div>
              <div style={{fontSize:'11px', color:'#55546a', fontWeight:500}}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}