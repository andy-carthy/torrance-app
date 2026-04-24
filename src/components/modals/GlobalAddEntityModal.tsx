import React, { useState } from 'react';
import { T, SANS } from '../../theme/tokens';
import { FUNDS_SEED } from '../../data/funds';
import { TEAM } from '../../data/team';
import { FieldLabel } from '../primitives/Card';

export function GlobalAddEntityModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "", type: "Master Fund", currency: "USD - US Dollar",
    jurisdiction: "", gaapFormat: "Mutual Fund (Retail)", filings: [] as string[],
  });
  return (
    <div className="modal-overlay" role="dialog" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:600,overflow:"hidden",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff"}}>Fund Setup: New Entity</div>
            <div style={{...SANS,fontSize:12,color:"#9ca3af",marginTop:2}}>Define reporting structure, GAAP format, and regulatory filings.</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"24px", display:"flex", flexDirection:"column", gap:16}}>
          <div>
            <FieldLabel required>Legal Entity Name</FieldLabel>
            <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g., Red Balloon Offshore Feeder Ltd." style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}/>
          </div>
          <div style={{display:"flex", gap:16}}>
            <div style={{flex:1}}>
              <FieldLabel required>Entity Type</FieldLabel>
              <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                <option>Master Fund</option>
                <option>Feeder Fund</option>
                <option>SPV / Blocker</option>
                <option>Management Co</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <FieldLabel required>GAAP Reporting Format</FieldLabel>
              <select value={form.gaapFormat} onChange={e => setForm(p => ({...p, gaapFormat: e.target.value}))} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                <option>Mutual Fund (Retail)</option>
                <option>Hedge Fund (Alt)</option>
                <option>Private Equity (Alt)</option>
                <option>Real Estate Fund (Alt)</option>
                <option>Money Market (Retail)</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex", gap:16}}>
            <div style={{flex:1}}>
              <FieldLabel required>Base Currency</FieldLabel>
              <select value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                <option>USD - US Dollar</option>
                <option>EUR - Euro</option>
                <option>GBP - British Pound</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <FieldLabel required>Jurisdiction</FieldLabel>
              <input type="text" value={form.jurisdiction} onChange={e => setForm(p => ({...p, jurisdiction: e.target.value}))} placeholder="e.g., Cayman Islands" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}/>
            </div>
          </div>

          <div style={{borderTop:`1px solid ${T.border}`, paddingTop:16}}>
            <FieldLabel>Required Regulatory Filings</FieldLabel>
            <div style={{display:"flex", gap:16, marginTop:8}}>
              {["N-PORT", "N-CEN", "N-MFP", "PF", "ADV"].map(f => (
                <label key={f} style={{...SANS, fontSize:12, display:"flex", alignItems:"center", gap:6, cursor:"pointer"}}>
                  <input type="checkbox" checked={form.filings.includes(f)} onChange={e => setForm(p => ({...p, filings: e.target.checked ? [...p.filings, f] : p.filings.filter(x => x !== f)}))} style={{accentColor:T.actionBase}} /> {f}
                </label>
              ))}
            </div>
          </div>

        </div>
        <div style={{padding:"16px 24px",background:"#f8fafc",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:12}}>
          <button onClick={onClose} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:"#fff",color:T.textPrimary,cursor:"pointer"}}>Cancel</button>
          <button
            disabled={!form.name.trim()}
            onClick={() => {
              if (!form.name.trim()) return;
              if (onSave) onSave({
                id: `FND-NEW-${Date.now()}`,
                name: form.name,
                type: form.type,
                client: "New Client",
                jurisdiction: form.jurisdiction || "Delaware, USA",
                nav: 0,
                fundType: form.gaapFormat,
                parent: "—",
                filings: form.filings,
              });
              onClose();
            }}
            style={{ ...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none",
              background: form.name.trim() ? T.actionBase : T.border,
              color: form.name.trim() ? "#fff" : T.textMuted,
              cursor: form.name.trim() ? "pointer" : "not-allowed" }}
          >
            Initialize Entity
          </button>
        </div>
      </div>
    </div>
  );
}

