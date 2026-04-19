import { useState, useEffect, useRef } from 'react';
import { emitChatMessage } from '../socket';

export default function Chat({ roomId, userName, messages = [], onNewMessage }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);

  // Scrollbar state
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update scrollbar thumb on scroll/resize
  const updateThumb = () => {
    const el = messagesRef.current;
    if (!el) return;
    const ratio = el.clientHeight / el.scrollHeight;
    const tHeight = Math.max(ratio * el.clientHeight, 30);
    const tTop = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (el.clientHeight - tHeight);
    setThumbHeight(tHeight);
    setThumbTop(isNaN(tTop) ? 0 : tTop);
  };

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateThumb);
    updateThumb();
    return () => el.removeEventListener('scroll', updateThumb);
  }, [messages]);

  // Drag handlers
  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = messagesRef.current?.scrollTop || 0;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !messagesRef.current) return;
      const el = messagesRef.current;
      const deltaY = e.clientY - dragStartY.current;
      const scrollRatio = el.scrollHeight / el.clientHeight;
      el.scrollTop = dragStartScrollTop.current + deltaY * scrollRatio;
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', (e) => handleMouseMove(e.touches[0]));
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = { user: userName, text, time, type: 'chat', isOwn: true };
    onNewMessage(msg);
    emitChatMessage(roomId, userName, text);
    setInput('');
  };

  const showThumb = thumbHeight < (messagesRef.current?.clientHeight || 0);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', alignItems:'center', gap:'8px'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span style={{fontSize:'12px', fontWeight:600, color:'#6b6a84', letterSpacing:'0.05em', textTransform:'uppercase'}}>Chat</span>
      </div>

      {/* Messages + Custom Scrollbar */}
      <div style={{flex:1, position:'relative', minHeight:0, display:'flex'}}>
        {/* Messages area */}
        <div
          ref={messagesRef}
          style={{
            flex:1, overflowY:'scroll', padding:'12px 6px 12px 12px',
            display:'flex', flexDirection:'column', gap:'8px',
            scrollbarWidth:'none', msOverflowStyle:'none'
          }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>

          {messages.length === 0 ? (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'10px', color:'#55546a'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.5}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p style={{fontSize:'13px'}}>Start the conversation!</p>
            </div>
          ) : messages.map((msg, i) => {
            if (msg.type === 'system') return (
              <div key={i} style={{textAlign:'center'}}>
                <span style={{fontSize:'11px', color:'#55546a', background:'rgba(255,255,255,0.04)', padding:'3px 10px', borderRadius:'99px'}}>{msg.text}</span>
              </div>
            );
            const isOwn = msg.isOwn || msg.user === userName;
            return (
              <div key={i} style={{display:'flex', gap:'8px', justifyContent: isOwn ? 'flex-end' : 'flex-start'}}>
                {!isOwn && (
                  <div style={{width:'26px', height:'26px', borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#db2777)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', flexShrink:0, alignSelf:'flex-end'}}>
                    {msg.user?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{maxWidth:'78%', display:'flex', flexDirection:'column', gap:'3px', alignItems: isOwn ? 'flex-end' : 'flex-start'}}>
                  <p style={{fontSize:'11px', color:'#55546a', paddingLeft:'4px', paddingRight:'4px'}}>{msg.user}</p>
                  <div style={{
                    padding:'8px 12px', borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isOwn ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.05)',
                    border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    fontSize:'13px', color: isOwn ? 'white' : '#c4c3de', lineHeight:1.4, wordBreak:'break-word'
                  }}>
                    {msg.text}
                  </div>
                  <p style={{fontSize:'10px', color:'#3d3c52', paddingLeft:'4px', paddingRight:'4px'}}>{msg.time}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Custom Draggable Scrollbar */}
        {showThumb && (
          <div style={{width:'6px', position:'relative', flexShrink:0, margin:'4px 2px'}}>
            <div style={{position:'absolute', inset:0, borderRadius:'99px', background:'rgba(255,255,255,0.04)'}} />
            <div
              onMouseDown={handleThumbMouseDown}
              onTouchStart={(e) => {
                setIsDragging(true);
                dragStartY.current = e.touches[0].clientY;
                dragStartScrollTop.current = messagesRef.current?.scrollTop || 0;
              }}
              style={{
                position:'absolute',
                top:`${thumbTop}px`,
                height:`${thumbHeight}px`,
                width:'6px',
                borderRadius:'99px',
                background: isDragging ? '#a78bfa' : 'rgba(167,139,250,0.5)',
                cursor:'grab',
                transition: isDragging ? 'none' : 'background 0.2s',
                userSelect:'none',
              }}
              onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background='rgba(167,139,250,0.8)'; }}
              onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background='rgba(167,139,250,0.5)'; }}
            />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{padding:'10px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0}}>
        <form onSubmit={send} style={{display:'flex', gap:'8px', alignItems:'center'}}>
          <input
            type="text" placeholder="Message..." value={input}
            onChange={e => setInput(e.target.value)} maxLength={300}
            style={{
              flex:1, padding:'9px 12px', background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px',
              color:'#f1f0ff', fontSize:'13px', outline:'none', fontFamily:'inherit',
              transition:'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor='rgba(167,139,250,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.07)'}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              width:'34px', height:'34px', borderRadius:'10px', border:'none',
              background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)',
              color:'white', cursor: input.trim() ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              transition:'background 0.2s, box-shadow 0.2s',
              boxShadow: input.trim() ? '0 2px 12px rgba(124,58,237,0.4)' : 'none'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}