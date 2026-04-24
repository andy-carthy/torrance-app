import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { FUNDS_SEED } from '../../data/funds';

export function NaturalLanguageQuery() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      
      {/* Pop-out Panel */}
      {isOpen && (
        <div className="fade-in" style={{ background: T.cardBg, border: `1px solid ${T.aiBorder}`, borderRadius: 12, padding: "20px", marginBottom: 16, width: 380, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", animation: "slideUp 0.2s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: T.aiBase, color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
              <h3 style={{ ...SANS, fontSize: 16, fontWeight: 700, margin: 0, color: T.textPrimary }}>Ask Torrance</h3>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18, transition: "color 0.2s" }} onMouseEnter={e=>e.currentTarget.style.color=T.textPrimary} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>✕</button>
          </div>
          
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input 
              type="text" 
              placeholder="Ask anything about the close..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...SANS, width: "100%", padding: "12px 14px", paddingRight: 60, fontSize: 13, borderRadius: 8, border: `1px solid ${T.border}`, outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)" }}
            />
            <button style={{ position: "absolute", right: 4, top: 4, bottom: 4, background: T.actionBase, color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", ...SANS, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Run</button>
          </div>
          
          <div style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>Suggested Queries</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Which funds have > 2 residual exceptions?", "What is the most common exception type today?", "Show me funds where AI confidence < 85%"].map(q => (
              <button key={q} onClick={() => setQuery(q)} style={{ ...SANS, fontSize: 12, padding: "8px 12px", background: T.appBg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.textPrimary, cursor: "pointer", textAlign: "left", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = T.appBg}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: 56, height: 56, borderRadius: "50%", background: isOpen ? T.cardBg : T.aiBase, border: isOpen ? `1px solid ${T.border}` : "none", 
          boxShadow: isOpen ? "0 4px 12px rgba(0,0,0,0.05)" : "0 4px 12px rgba(99,102,241,0.3)", cursor: "pointer", 
          display: "flex", alignItems: "center", justifyContent: "center", color: isOpen ? T.textMuted : "#fff", fontSize: 24,
          transition: "transform 0.2s, background 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        title="Ask Torrance"
      >
        {isOpen ? "✕" : "✦"}
      </button>
    </div>
  );
}
