import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';

const BACKEND = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const VIBES = [
  { id: 'dreamy',   label: '🌙 Dreamy',   gradient: 'linear-gradient(135deg,#1a1a3e,#2d1b69)' },
  { id: 'warm',     label: '💜 Warm',     gradient: 'linear-gradient(135deg,#2d1b69,#831843)' },
  { id: 'intense',  label: '🔥 Intense',  gradient: 'linear-gradient(135deg,#450a0a,#7c2d12)' },
  { id: 'sweet',    label: '🌸 Sweet',    gradient: 'linear-gradient(135deg,#500724,#831843)' },
];

export default function ForYouCreate() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [message, setMessage] = useState('');
  const [from, setFrom] = useState('');
  const [vibe, setVibe] = useState('dreamy');
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState(null);
  const [urlCopied, setUrlCopied] = useState(false);

  const copyCreatedUrl = () => {
    navigator.clipboard.writeText(createdUrl).then(() => {
      setUrlCopied(true);
      showToast('Link copied! 🔗', 'success');
      setTimeout(() => setUrlCopied(false), 2500);
    });
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPhoto(ev.target.result); setPhotoName(file.name); };
    reader.readAsDataURL(file);
  };

  const searchSongs = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSongs([]);
    try {
      const res = await fetch(`${BACKEND}/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSongs(data?.data?.results || []);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const decode = (str) => {
    if (!str) return '';
    const t = document.createElement('textarea');
    t.innerHTML = str;
    return t.value;
  };

  const handleCreate = async () => {
    if (!photo) { showToast('Please upload a photo', 'error'); return; }
    if (!selectedSong) { showToast('Please select a song', 'error'); return; }
    if (!message.trim()) { showToast('Please write a message', 'error'); return; }
    if (!from.trim()) { showToast('Please enter your name', 'error'); return; }

    setCreating(true);
    try {
      const audioUrl = selectedSong.downloadUrl?.find(d => d.quality === '320kbps')?.url
        || selectedSong.downloadUrl?.find(d => d.quality === '160kbps')?.url
        || selectedSong.downloadUrl?.[0]?.url;

      const payload = {
        photo,
        song: {
          id: selectedSong.id,
          name: decode(selectedSong.name),
          artist: decode(selectedSong.primaryArtists || selectedSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown'),
          image: selectedSong.image?.[2]?.url || selectedSong.image?.[1]?.url || selectedSong.image?.[0]?.url,
          audioUrl,
          downloadUrl: selectedSong.downloadUrl,
        },
        message: message.trim(),
        from: from.trim(),
        vibe,
      };

      const res = await fetch(`${BACKEND}/api/gift/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.giftId) {
        showToast('Gift created! 🎉', 'success');
        const giftUrl = `${window.location.origin}/for-you/${data.giftId}`;
        setCreatedUrl(giftUrl);
      } else {
        throw new Error('No giftId');
      }
    } catch {
      showToast('Failed to create gift', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#0d0d14', fontFamily: "'DM Sans',system-ui,sans-serif", padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💝</div>
            <h1 style={{ fontFamily: "'Syne',system-ui,sans-serif", fontSize: '28px', fontWeight: 800, color: 'white', margin: 0 }}>
              Create a <span style={{ background: 'linear-gradient(135deg,#a78bfa,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>For You</span>
            </h1>
            <p style={{ color: '#6b6a84', fontSize: '14px', marginTop: '8px' }}>A personal gift with a song, photo & message</p>
          </div>

          {/* Step 1 — Photo */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b6a84', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>📸 Photo</p>
            {photo ? (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <img src={photo} alt="preview" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(167,139,250,0.3)' }} />
                <button onClick={() => { setPhoto(null); setPhotoName(''); }}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed rgba(167,139,250,0.3)', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                <p style={{ color: '#a78bfa', fontWeight: 600, margin: '0 0 4px' }}>Upload Photo</p>
                <p style={{ color: '#55546a', fontSize: '12px', margin: 0 }}>JPG, PNG — max 5MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          {/* Step 2 — Song */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b6a84', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>🎵 Song</p>
            {selectedSong ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '12px' }}>
                <img src={selectedSong.image?.[1]?.url} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#a78bfa', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>{decode(selectedSong.name)}</p>
                  <p style={{ color: '#55546a', fontSize: '12px', margin: 0 }}>{decode(selectedSong.primaryArtists)}</p>
                </div>
                <button onClick={() => { setSelectedSong(null); setSongs([]); setQuery(''); }}
                  style={{ background: 'none', border: 'none', color: '#55546a', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}>✕</button>
              </div>
            ) : (
              <>
                <form onSubmit={searchSongs} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search a song..."
                    style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f1f0ff', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button type="submit" disabled={searching}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>
                    {searching ? '...' : 'Search'}
                  </button>
                </form>
                {songs.length > 0 && (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {songs.slice(0, 8).map((song) => (
                      <div key={song.id} onClick={() => { setSelectedSong(song); setSongs([]); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <img src={song.image?.[0]?.url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#f1f0ff', fontSize: '13px', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decode(song.name)}</p>
                          <p style={{ color: '#55546a', fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{decode(song.primaryArtists)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3 — Message */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b6a84', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>💌 Message</p>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write something special... 'This song reminded me of you...'"
              maxLength={300} rows={4}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f1f0ff', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
            <p style={{ color: '#3d3c52', fontSize: '11px', textAlign: 'right', margin: '4px 0 0' }}>{message.length}/300</p>
          </div>

          {/* Step 4 — From */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b6a84', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>👤 From</p>
            <input
              value={from} onChange={e => setFrom(e.target.value)}
              placeholder="Your name"
              maxLength={30}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f1f0ff', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Step 5 — Vibe */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b6a84', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>🎨 Vibe</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
              {VIBES.map(v => (
                <button key={v.id} onClick={() => setVibe(v.id)}
                  style={{ padding: '12px', borderRadius: '10px', border: vibe === v.id ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)', background: vibe === v.id ? 'rgba(167,139,250,0.12)' : 'transparent', color: vibe === v.id ? '#a78bfa' : '#6b6a84', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button onClick={handleCreate} disabled={creating}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: creating ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg,#7c3aed,#db2777)', color: 'white', fontWeight: 700, fontSize: '16px', cursor: creating ? 'not-allowed' : 'pointer', boxShadow: creating ? 'none' : '0 4px 24px rgba(124,58,237,0.4)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
            {creating ? (
              <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Creating...</>
            ) : (
              <> ✨ Create & Share</>
            )}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        </div>
      </div>

      {/* ── SHARE MODAL (shown after creation) ── */}
      {createdUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: '#1a1a2e', border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ color: '#fff', fontFamily: "'Syne',system-ui,sans-serif", fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
                Gift Created!
              </h2>
              <p style={{ color: '#6b6a84', fontSize: '14px', margin: 0 }}>
                Share this link with the special person 💝
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                flex: 1, padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: 'rgba(255,255,255,0.6)',
                fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {createdUrl}
              </div>
              <button
                onClick={copyCreatedUrl}
                style={{
                  padding: '12px 20px', borderRadius: '12px', border: 'none', flexShrink: 0,
                  background: urlCopied ? 'rgba(52,211,153,0.25)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
                  color: urlCopied ? '#34d399' : 'white',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {urlCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate(createdUrl.replace(window.location.origin, ''))}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(167,139,250,0.3)',
                  background: 'transparent', color: '#a78bfa',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Preview Gift 👁
              </button>
              <button
                onClick={() => { setCreatedUrl(null); setPhoto(null); setPhotoName(''); setSelectedSong(null); setMessage(''); setFrom(''); setVibe('dreamy'); setQuery(''); setSongs([]); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                  color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Make Another 💝
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}