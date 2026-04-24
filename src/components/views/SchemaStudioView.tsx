import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { DataPrepModal } from '../modals/DataPrepModal';

export function SchemaStudioView({ schemaId, onBack }) {
  // Convert static mappings to state so we can apply Prep Rules
  const [mappings, setMappings] = useState<any[]>([
    { id:"m1", source:"account_no", target:"account_number", type:"VARCHAR", req:true, conf:99, status:"accepted", sample:"1010", prepRule: null },
    { id:"m2", source:"account_desc", target:"account_name", type:"VARCHAR", req:true, conf:99, status:"accepted", sample:"Investments in Securities", prepRule: null },
    { id:"m3", source:"debit_amount", target:"debit", type:"DECIMAL", req:true, conf:99, status:"accepted", sample:"125000000.00", prepRule: null },
    { id:"m4", source:"credit_amount", target:"credit", type:"DECIMAL", req:true, conf:99, status:"accepted", sample:"0.00", prepRule: null },
    { id:"m5", source:"ccy", target:"currency", type:"CHAR(3)", req:true, conf:96, status:"accepted", sample:"USD", prepRule: null },
    { id:"m6", source:"fund_code", target:"fund_id", type:"VARCHAR", req:true, conf:88, status:"pending", sample:"FND-2024-001", prepRule: null },
    { id:"m7", source:"post_date", target:"posting_date", type:"DATE", req:true, conf:99, status:"accepted", sample:"2024-12-31", prepRule: null },
    { id:"m8", source:"trade_ccy_amount", target:"local_amount", type:"DECIMAL", req:false, conf:72, status:"review", sample:"92357.12", prepRule: null },
  ]);

  const [prepRow, setPrepRow] = useState<any>(null);

  const handleApplyPrep = (rule) => {
    setMappings(prev => prev.map(m => m.id === prepRow.id ? { ...m, prepRule: rule } : m));
    setPrepRow(null);
  };

  const columns = mappings.map(m => m.source);

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", height:"100vh", background:T.appBg}}>
      
      {/* ─── STUDIO HEADER ─── */}
      <div style={{padding:"16px 32px", background:T.navyHeader, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:20}}>
          <button onClick={onBack} style={{...SANS, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:6, padding:"8px 14px", fontSize:12, cursor:"pointer", fontWeight:600, color:"#fff"}}>← Registry</button>
          <div>
            <h2 style={{...SANS, fontWeight:700, fontSize:18, color:"#fff", margin:0}}>Schema Studio: {schemaId || 'Global Custodian'}</h2>
            <div style={{...SANS, fontSize:12, color:"rgba(255,255,255,0.6)", marginTop:2}}>Editing global master canonical mappings.</div>
          </div>
        </div>
        <div style={{display:"flex", gap:12}}>
          <button style={{...SANS, fontSize:12, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid rgba(255,255,255,0.2)`, background:"transparent", color:"#fff", cursor:"pointer"}}>Re-Run AI Inference</button>
          <button onClick={onBack} style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer"}}>Commit to Global Registry</button>
        </div>
      </div>

      {/* ─── SPLIT PANE WORKSPACE ─── */}
      <div style={{display:"flex", flex:1, overflow:"hidden"}}>
        
        {/* LEFT PANE: Source Payload Stream */}
        <div style={{flex:"0 0 30%", borderRight:`1px solid ${T.border}`, background:T.cardBg, display:"flex", flexDirection:"column"}}>
          <div style={{padding:"12px 20px", borderBottom:`1px solid ${T.border}`, background:T.appBg, ...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em"}}>
            Incoming Source Payload
          </div>
          <div style={{flex:1, overflowY:"auto", padding:"20px", ...MONO, fontSize:11, color:T.textPrimary, whiteSpace:"pre-wrap"}}>
            {`{\n  "metadata": {\n    "custodian": "${schemaId || 'Custodian'}",\n    "type": "GL_Trial_Balance",\n    "extract_date": "2024-12-31T23:59:59Z"\n  },\n  "data": [\n    {\n      "account_no": "1010",\n      "account_desc": "Investments in Securities",\n      "debit_amount": "125000000.00",\n      "credit_amount": "0.00",\n      "ccy": "USD",\n      "fund_code": "FND-2024-001",\n      "post_date": "2024-12-31"\n    }\n  ]\n}`}
          </div>
        </div>

        {/* RIGHT PANE: Target Canonical Mappings */}
        <div style={{flex:1, background:T.appBg, display:"flex", flexDirection:"column"}}>
          <div style={{padding:"12px 20px", borderBottom:`1px solid ${T.border}`, background:T.cardBg, ...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", justifyContent:"space-between"}}>
            <span>Canonical Target Mapping</span>
            <span style={{color:T.aiBase}}>✦ AI Auto-Mapped 142/142 Fields</span>
          </div>
          <div style={{flex:1, overflowY:"auto", padding:"24px"}}>
            <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", boxShadow:"0 2px 4px rgba(0,0,0,0.02)"}}>
              <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                <thead>
                  <tr style={{background:T.appBg}}>
                    {["Source Field", "Sample Value", "Type", "AI Confidence", "Canonical Target", "Data Prep", "Status"].map((h,i)=><th key={i} style={{...SANS, padding:"10px 16px", color:T.textMuted, fontWeight:700, fontSize:10, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(m => (
                    <tr key={m.id} style={{borderBottom:`1px solid ${T.border}`, transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"12px 16px", ...MONO, fontSize:11, color:T.textPrimary, fontWeight:700}}>{m.source}</td>
                      <td style={{padding:"12px 16px", ...MONO, fontSize:10, color:T.textMuted}}>{m.sample}</td>
                      <td style={{padding:"12px 16px", ...SANS, fontSize:10, color:T.textMuted}}>{m.type}</td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{...MONO, fontSize:11, fontWeight:700, color:m.conf>90?T.okBase:T.warnBase}}>{m.conf}%</span>
                      </td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{...MONO, fontSize:11, fontWeight:700, background:T.actionBg, color:T.actionBase, border:`1px solid #bfdbfe`, padding:"2px 6px", borderRadius:4}}>{m.target}</span>
                      </td>
                      
                      {/* NEW DATA PREP COLUMN */}
                      <td style={{padding:"12px 16px"}}>
                        {m.prepRule ? (
                          <span style={{...SANS, fontSize:10, fontWeight:700, background:"#f1f5f9", color:T.textPrimary, border:`1px solid ${T.border}`, padding:"4px 8px", borderRadius:4, display:"inline-block"}} title={m.prepRule.desc}>
                            {m.prepRule.type === "Enhance" ? "🪄" : "🛠"} {m.prepRule.type}
                          </span>
                        ) : (
                          <button onClick={() => setPrepRow(m)} style={{...SANS, fontSize:10, fontWeight:600, padding:"4px 8px", borderRadius:4, border:`1px dashed ${T.border}`, background:"transparent", color:T.textMuted, cursor:"pointer", transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color=T.actionBase} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>
                            + Add Rule
                          </button>
                        )}
                      </td>

                      <td style={{padding:"12px 16px"}}>
                        {m.status === 'accepted' ? <span style={{...SANS, fontSize:10, fontWeight:700, color:T.okBase}}>✓ Accepted</span> : <button style={{...SANS, fontSize:10, fontWeight:700, background:T.warnBg, color:T.warnBase, border:`1px solid ${T.warnBorder}`, padding:"2px 8px", borderRadius:4, cursor:"pointer"}}>⚠ Review</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>

      {/* Render the Prep Modal when a row is selected */}
      {prepRow && (
        <DataPrepModal 
          row={{ sourceCol: prepRow.source, sampleValue: prepRow.sample }} 
          columns={columns} 
          onClose={() => setPrepRow(null)} 
          onApply={handleApplyPrep} 
        />
      )}
    </div>
  );
}
