import { useState, useEffect, useRef } from 'react';
import { emitChatMessage, onChatMessage, offChatMessage, onSystemMessage, offSystemMessage } from '../socket';

export default function Chat({ roomId, userName, chatHistory = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // ✅ Load chat history when joining room
  useEffect(() => {
    if (chatHistory.length > 0) {
      setMessages(chatHistory.map(msg => ({ ...msg, type: 'chat' })));
    }
  }, [chatHistory]);

  useEffect(() => {
    onChatMessage(msg => setMessages(p => [...p, { ...msg, type: 'chat' }]));
    onSystemMessage(msg => setMessages(p => [...p, { ...msg, type: 'system' }]));
    return () => { offChatMessage(); offSystemMessage(); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // ✅ Add locally for sender only
    setMessages(p => [...p, { user: userName, text, time, type: 'chat', isOwn: true }]);
    emitChatMessage(roomId, userName, text);
    setInput('');
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', alignItems:'center', gap:'8px'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span style={{fontSize:'12px', fontWeight:600, color:'#6b6a84', letterSpacing:'0.05em', textTransform:'uppercase'}}>Chat</span>
      </div>

      {/* Messages */}
      <div style={{flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'8px', minHeight:0}}>
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