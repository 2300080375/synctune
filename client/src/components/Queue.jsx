export default function Queue({ queue = [], currentSong, onRemove, onPlayNext }) {
  if (queue.length === 0) {
    return (
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:'10px', color:'#55546a', padding:'20px'}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}>
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <p style={{fontSize:'12px', textAlign:'center'}}>Queue is empty</p>
        <p style={{fontSize:'11px', color:'#3d3c52', textAlign:'center'}}>Right click a song to add</p>
      </div>
    );
  }

  return (
    <div style={{flex:1, overflowY:'auto', padding:'8px'}}>
      <p style={{fontSize:'11px', color:'#3d3c52', padding:'0 4px 8px', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600}}>
        Up Next ({queue.length})
      </p>
      {queue.map((song, i) => {
        const img = song.image?.[1]?.url || song.image?.[0]?.url;
        const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown';
        return (
          <div
            key={`${song.id}-${i}`}
            onClick={() => onPlayNext(i)} // ✅ click anywhere to play
            style={{
              display:'flex', alignItems:'center', gap:'8px', padding:'7px 8px',
              borderRadius:'8px', marginBottom:'2px', cursor:'pointer',
              background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)',
              transition:'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
          >
            {/* Index */}
            <span style={{fontSize:'11px', color:'#3d3c52', width:'16px', textAlign:'center', flexShrink:0}}>{i + 1}</span>

            {/* Art */}
            <div style={{width:'32px', height:'32px', borderRadius:'6px', overflow:'hidden', background:'rgba(255,255,255,0.05)', flexShrink:0}}>
              {img ? <img src={img} alt={song.name} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : (
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#55546a'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:'12px', color:'#f1f0ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500}}>{song.name}</p>
              <p style={{fontSize:'11px', color:'#55546a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{artist}</p>
            </div>

            {/* Remove */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }} // ✅ stopPropagation so row click doesn't fire
              title="Remove"
              style={{background:'none', border:'none', cursor:'pointer', color:'#55546a', padding:'4px', borderRadius:'4px', display:'flex', alignItems:'center', flexShrink:0, transition:'color 0.15s'}}
              onMouseEnter={e => e.currentTarget.style.color='#ff6b6b'}
              onMouseLeave={e => e.currentTarget.style.color='#55546a'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}