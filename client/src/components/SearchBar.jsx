import { useState } from 'react';

export default function SearchBar({ onResultsFound }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) { setError('Enter a song name'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/api/search?query=` + encodeURIComponent(q));
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid JSON'); }
      if (data?.data?.results?.length > 0) {
        onResultsFound(data.data.results);
      } else { setError('No songs found'); }
    } catch (err) {
      setError('Search failed. Backend not reachable.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{marginBottom:'16px'}}>
      <form onSubmit={handleSearch} style={{display:'flex', gap:'10px', alignItems:'center'}}>
        <div style={{flex:1, position:'relative'}}>
          <svg style={{position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#55546a', pointerEvents:'none'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search songs, artists..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width:'100%', paddingLeft:'42px', paddingRight:'16px', paddingTop:'11px', paddingBottom:'11px',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:'12px', color:'#f1f0ff', fontSize:'14px', outline:'none',
              transition:'border-color 0.2s, box-shadow 0.2s', fontFamily:'inherit'
            }}
            onFocus={e => { e.target.style.borderColor='rgba(167,139,250,0.4)'; e.target.style.boxShadow='0 0 0 3px rgba(167,139,250,0.08)'; }}
            onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.07)'; e.target.style.boxShadow='none'; }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding:'11px 20px', borderRadius:'12px', border:'none',
            background: loading ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color:'white', fontWeight:600, fontSize:'14px', cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'6px',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
            fontFamily:'inherit', transition:'transform 0.15s, box-shadow 0.15s'
          }}
        >
          {loading ? (
            <div style={{width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite'}} />
          ) : (
            'Search'
          )}
        </button>
      </form>
      {error && (
        <div style={{marginTop:'8px', fontSize:'13px', color:'#f87171', display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          {error}
        </div>
      )}
    </div>
  );
}