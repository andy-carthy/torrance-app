import React, { useEffect } from 'react';
import { T, SANS } from '../../theme/tokens';

export function AILearningToast({ onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="slide-in" style={{position:"fixed", top: 70, right: 24, background: T.navyHeader, border:`1px solid ${T.aiBase}`, color: "#fff", padding: "16px 20px", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 9999, display:"flex", gap: 14, maxWidth: 400, alignItems:"flex-start"}}>
      <span style={{fontSize: 22, marginTop: 0}}>✨</span>
      <div style={{flex:1}}>
        <div style={{...SANS, fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#c7d2fe"}}>AI Learning Applied</div>
        <div style={{...SANS, fontSize: 12, lineHeight: 1.5, color: "#e2e8f0"}}>
          Welcome back! Your manual mapping of <strong>Suspense Account (9999)</strong> last period automatically resolved <strong>42 exceptions</strong> across 18 funds today.
        </div>
        <div style={{background:"rgba(99,102,241,0.2)", color:"#c7d2fe", padding:"4px 8px", borderRadius:4, marginTop:10, display:"inline-block", fontSize:11, fontWeight:700, letterSpacing:"0.03em", ...SANS}}>
          ⏳ TIME SAVED: ~1.5 HOURS
        </div>
      </div>
      <button onClick={onClose} style={{background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:18, marginTop:-4}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#94a3b8"}>✕</button>
    </div>
  );
}
