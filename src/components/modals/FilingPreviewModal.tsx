import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { Filing } from '../../types';

export function FilingPreviewModal({ filing, onClose, onFile }) {
  const [validating, setValidating] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("xml"); // 'summary' or 'xml'

  const runAiValidation = () => {
    setValidating(true);
    setTimeout(() => { setValidating(false); setAiChecked(true); }, 2000);
  };

  const handleFiling = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onFile(filing.id); onClose(); }, 1500);
  };

  // Dynamic AI Checks based on Filing Type
  const getValidationChecks = (form) => {
    if (form.includes("PF")) return [
      {label: "Gross/Net Asset Value tied to TB", pass: true},
      {label: "Counterparty Exposure Limits Validated", pass: true},
      {label: "Derivative Notional Values Reconciled", pass: true}
    ];
    if (form.includes("N-PORT") || form.includes("N-CEN") || form.includes("N-MFP")) return [
      {label: "CUSIP/LEI Identifiers Verified", pass: true},
      {label: "Fair Value Hierarchy (L1/L2/L3) Matches TB", pass: true},
      {label: "Liquidity Buckets (ASC 820) Validated", pass: true}
    ];
    if (form.includes("ADV")) return [
      {label: "Regulatory AUM matches aggregate TBs", pass: true},
      {label: "Private Fund Reporting (Section 7.B) Complete", pass: true},
      {label: "Client Count & Types Verified", pass: true}
    ];
    return [{label: "Required Schema Tags Present", pass: true}];
  };

  // Mock XML payload generation
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<edgarSubmission>
  <schemaVersion>X0101</schemaVersion>
  <submissionType>${filing.form}</submissionType>
  <filerInfo>
    <liveTestFlag>LIVE</liveTestFlag>
    <filer>
      <credentials>
        <cik>0001234567</cik>
        <ccc>XXXXXXXX</ccc>
      </credentials>
    </filer>
    <periodOfReport>${filing.period}</periodOfReport>
  </filerInfo>
  <formData>
    <fundName>${filing.fund}</fundName>
    <clientEntity>${filing.client}</clientEntity>
    <dataPoints>
      <totalAssets>486356965</totalAssets>
      <netAssets>480860965</netAssets>
      <recordCount>284</recordCount>
    </dataPoints>
  </formData>
</edgarSubmission>`;

  return (
    <div className="modal-overlay" role="dialog" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:1000,height:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
        
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff",display:"flex",alignItems:"center",gap:8}}>📄 Beverley Engine: {filing.form}</div>
            <div style={{...SANS,fontSize:12,color:"#9ca3af",marginTop:4}}>{filing.fund} · Deadline: {filing.dueDate}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20}}>✕</button>
        </div>

        <div style={{display:"flex", flex:1, overflow:"hidden"}}>
          
          {/* Document Preview Area (Left) */}
          <div style={{flex:1, display:"flex", flexDirection:"column", borderRight:`1px solid ${T.border}`}}>
            <div style={{display:"flex", background:T.appBg, borderBottom:`1px solid ${T.border}`}}>
              <button onClick={()=>setActiveTab("xml")} style={{flex:1, padding:"12px", border:"none", background:activeTab==="xml"?T.cardBg:"transparent", borderBottom:`2px solid ${activeTab==="xml"?T.actionBase:"transparent"}`, ...SANS, fontSize:12, fontWeight:600, cursor:"pointer", color:activeTab==="xml"?T.actionBase:T.textMuted}}>Raw XML Payload</button>
              <button onClick={()=>setActiveTab("summary")} style={{flex:1, padding:"12px", border:"none", background:activeTab==="summary"?T.cardBg:"transparent", borderBottom:`2px solid ${activeTab==="summary"?T.actionBase:"transparent"}`, ...SANS, fontSize:12, fontWeight:600, cursor:"pointer", color:activeTab==="summary"?T.actionBase:T.textMuted}}>Human-Readable Summary</button>
            </div>
            
            <div style={{flex:1, overflowY:"auto", background: activeTab==="xml"?"#0f172a":"#e2e8f0", padding:activeTab==="xml"?0:24}}>
              {activeTab === "xml" ? (
                <div style={{padding:20, ...MONO, fontSize:11, color:"#a7f3d0", whiteSpace:"pre-wrap", wordBreak:"break-all"}}>
                  {mockXml}
                </div>
              ) : (
                <div style={{background:"#fff", width:"100%", maxWidth:600, margin:"0 auto", padding:"40px", boxShadow:"0 4px 6px rgba(0,0,0,0.05)", fontFamily:"serif", color:"#000"}}>
                  <h1 style={{fontSize:20, textAlign:"center", borderBottom:"1px solid #000", paddingBottom:10, marginBottom:20}}>FORM {filing.form} SUMMARY</h1>
                  <p style={{fontSize:12, lineHeight:1.5}}><strong>Entity:</strong> {filing.fund}</p>
                  <p style={{fontSize:12, lineHeight:1.5}}><strong>Reporting Period:</strong> {filing.period}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Validation & Filing Sidebar (Right) */}
          <div style={{width:340, background:"#fff", padding:"20px", display:"flex", flexDirection:"column"}}>
            <div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16}}>Beverley Validation</div>
            
            {!aiChecked ? (
              <div style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"16px", textAlign:"center"}}>
                <div style={{fontSize:24, marginBottom:8}}>🧠</div>
                <div style={{...SANS, fontSize:13, fontWeight:600, color:T.aiDark, marginBottom:8}}>AI Cross-Check</div>
                <div style={{...SANS, fontSize:11, color:T.textPrimary, marginBottom:16}}>Validate XML schema and reconcile data points against the final Trial Balance.</div>
                <button onClick={runAiValidation} disabled={validating} style={{...SANS,width:"100%",padding:"8px",borderRadius:6,border:"none",background:T.aiBase,color:"#fff",fontWeight:600,cursor:validating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {validating ? <><span style={{animation:"pulse 0.8s infinite"}}>✦</span> Scanning XML...</> : <><span>✦</span> Run AI Validation</>}
                </button>
              </div>
            ) : (
              <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:12}}>
                {getValidationChecks(filing.form).map((c, i) => (
                  <div key={i} style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"10px", background:T.okBg, border:`1px solid ${T.okBorder}`, borderRadius:6}}>
                    <span style={{...SANS, fontSize:11, color:T.textPrimary, lineHeight:1.4, paddingRight:8}}>{c.label}</span>
                    <span style={{color:T.okBase, fontSize:14, flexShrink:0}}>✓</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:"auto", paddingTop:20}}>
              <button onClick={handleFiling} disabled={!aiChecked || submitting} style={{...SANS,width:"100%",padding:"12px",borderRadius:6,border:"none",background:!aiChecked || submitting?"#94a3b8":T.okBase,color:"#fff",fontWeight:700,fontSize:14,cursor:!aiChecked || submitting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8, transition:"background 0.2s"}}>
                 {submitting ? <span style={{animation:"pulse 0.8s infinite"}}>Transmitting to SEC...</span> : <><span>📤</span> Transmit to SEC EDGAR</>}
              </button>
              {!aiChecked && <div style={{...SANS, fontSize:10, color:T.textMuted, textAlign:"center", marginTop:8}}>Validation required before transmission.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

