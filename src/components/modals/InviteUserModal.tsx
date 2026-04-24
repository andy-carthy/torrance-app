import React, { useState } from 'react';
import { T, SANS } from '../../theme/tokens';

export function InviteUserModal({ onClose }) {
  const [form, setForm] = useState({ name:"", email:"", role:"Preparer", funds:"All Funds" });
  const [saved, setSaved] = useState(false);

  const roles = ["Preparer", "Controller", "Auditor (Read-Only)", "Client / LP"];

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaved(true);
    setTimeout(onClose, 1000);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:12, width:500, overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.4)" }}>
        <div style={{ background:T.navyHeader, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ ...SANS, fontWeight:700, fontSize:15, color:"#fff" }}>Invite User</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { label:"Full Name", field:"name", placeholder:"e.g., Jane Smith" },
            { label:"Email Address", field:"email", placeholder:"jane@firm.com" },
          ].map(f => (
            <div key={f.field}>
              <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>{f.label} *</div>
              <input type={f.field === "email" ? "email" : "text"} value={form[f.field]}
                onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, boxSizing:"border-box" }} />
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Access Role</div>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Fund Assignment</div>
              <select value={form.funds} onChange={e => setForm(p => ({ ...p, funds: e.target.value }))}
                style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                <option>All Funds</option>
                <option>Pennywise Capital (All)</option>
                <option>Bowers Asset Management (All)</option>
                <option>Derry Capital Partners (All)</option>
                <option>Custom Selection…</option>
              </select>
            </div>
          </div>
          <div style={{ background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:6, padding:"10px 14px", ...SANS, fontSize:12, color:T.aiDark }}>
            An invitation email with MFA setup instructions will be sent to <strong>{form.email || "the user's email"}</strong>. Access is provisioned immediately upon acceptance.
          </div>
        </div>
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"flex-end", gap:12 }}>
          <button onClick={onClose}
            style={{ ...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave}
            disabled={!form.name.trim() || !form.email.trim()}
            style={{ ...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none",
              background: saved ? T.okBase : (!form.name.trim() ? T.border : T.actionBase),
              color: !form.name.trim() ? T.textMuted : "#fff",
              cursor: !form.name.trim() ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", gap:7 }}>
            {saved ? <><span>✓</span> Invited!</> : "Send Invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

