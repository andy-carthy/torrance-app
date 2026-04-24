import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { AI_PARAM_DEFAULTS } from '../../data/aiData';

export function AddRuleModal({ onClose }) {
  const [form, setForm] = useState({ condition:"", action:"", active:true });
  const [saved, setSaved] = useState(false);

  const conditionTemplates = [
    "IF Exception Code == 'NAV_MISMATCH'",
    "IF Dollar Variance > $500,000",
    "IF Fund Type == 'Private Equity'",
    "IF SLA Days Remaining <= 1",
    "IF Exception Severity == 'error'",
  ];

  const actionTemplates = [
    "ASSIGN TO James Okafor (Controller)",
    "ASSIGN TO Sarah Chen (Senior)",
    "ASSIGN TO Marcus Reid (Accountant)",
    "SEND ALERT to ops-alerts@torrance.com",
    "AUTO-ACKNOWLEDGE if prior period match >= 3",
  ];

  const handleSave = () => {
    if (!form.condition || !form.action) return;
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:12, width:540, overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.4)" }}>
        <div style={{ background:T.navyHeader, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ ...SANS, fontWeight:700, fontSize:15, color:"#fff" }}>Build Assignment Rule</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Condition</div>
            <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
              style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
              <option value="">Select condition…</option>
              {conditionTemplates.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Action</div>
            <select value={form.action} onChange={e => setForm(p => ({ ...p, action: e.target.value }))}
              style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
              <option value="">Select action…</option>
              {actionTemplates.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          {form.condition && form.action && (
            <div style={{ background:T.okBg, border:`1px solid ${T.okBorder}`, borderRadius:6, padding:"10px 14px", ...MONO, fontSize:11, color:T.okBase }}>
              {form.condition} → {form.action}
            </div>
          )}
        </div>
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"flex-end", gap:12 }}>
          <button onClick={onClose}
            style={{ ...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave}
            disabled={!form.condition || !form.action}
            style={{ ...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none",
              background: saved ? T.okBase : (!form.condition ? T.border : T.actionBase),
              color: !form.condition ? T.textMuted : "#fff",
              cursor: !form.condition ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", gap:7 }}>
            {saved ? <><span>✓</span> Rule Saved!</> : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

