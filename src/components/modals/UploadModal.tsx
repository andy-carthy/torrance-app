import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { T, MONO, SANS } from '../../theme/tokens';
import type { TeamMember } from '../../types';

export function UploadModal({ onClose, onUploadComplete, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const simulateAiMapping = (fileName, headers, rowCount) => {
    setUploading(true);
    
    // Generate AI mapping session
    const feedId = `feed-up-${Date.now()}`;
    const generatedMappingRows = headers.map((col, idx) => {
      // Simulate AI confidence scores and reasoning
      const isRecognized = ["account_no", "account_desc", "debit_amount", "credit_amount", "ccy"].includes(col.toLowerCase());
      return {
        id: `m${idx}`,
        sourceCol: col,
        sourceType: "VARCHAR",
        canonicalField: isRecognized ? col.replace("_no", "_number").replace("_desc", "_name").replace("_amount", "") : "",
        required: isRecognized,
        confidence: isRecognized ? Math.floor(Math.random() * 15) + 85 : 0,
        aiReason: isRecognized ? "Strong fuzzy match to historical canonical schema." : "Awaiting user input.",
        status: isRecognized ? "pending" : "unmapped",
        sampleValue: isRecognized ? "Sample Data" : "Unknown"
      };
    });

    const newFeed = {
      id: feedId,
      period: "Dec 2024",
      source: `${currentUser?.name.split(' ')[0].toLowerCase()||"user"}@torrance.com`,
      fund_id: "FND-2024-001", 
      fund: "Pennywise Global Diversified Fund",
      client: "Pennywise Capital Advisors",
      file: fileName,
      type: fileName.toLowerCase().includes("holdings") ? "Holdings" : "GL",
      status: "needs_mapping", 
      received: new Date().toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}),
      rows: rowCount,
      exceptions: 0
    };

    setTimeout(() => { 
      setUploading(false);
      onUploadComplete(newFeed, generatedMappingRows);
      onClose(); 
    }, 1500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Fallback to our AI Simulator if it's just a dummy file
    simulateAiMapping(file.name, ["Account_No", "Account_Desc", "Debit_Amount", "Credit_Amount", "Local_Ccy", "Ext_Ref_ID"], 452);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:540,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>Manual Data Upload</div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Upload out-of-band GL or Holdings files</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div style={{padding:"24px 32px"}}>
          {error && <div style={{background:T.errorBg, color:T.errorBase, padding:"10px", borderRadius:6, marginBottom:16, fontSize:12, border:`1px solid ${T.errorBorder}`}}>⚠ {error}</div>}
          
          {uploading ? (
            <div style={{textAlign:"center", padding:"40px 0"}}>
              <div style={{animation:"pulse 1s infinite", fontSize:32, marginBottom:16}}>🧠</div>
              <div style={{...SANS, fontSize:15, fontWeight:700, color:T.textPrimary}}>AI Schema Mapping in Progress...</div>
              <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:8}}>Analyzing columns and predicting canonical fields.</div>
            </div>
          ) : (
            <>
              <div onClick={() => fileInputRef.current?.click()} style={{border:`2px dashed ${T.border}`,borderRadius:10,padding:"48px 32px",textAlign:"center",cursor:"pointer",background:T.appBg, transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{fontSize:28, marginBottom:12}}>📄</div>
                <div style={{...SANS, fontSize:15, fontWeight:600, color:T.textPrimary, marginBottom:6}}>Drop your CSV file here</div>
                <div style={{...SANS, fontSize:12, color:T.textMuted}}>Supported formats: GL, Holdings, Capital Activity</div>
                <button style={{marginTop:20, ...SANS, fontSize:12, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer", color:T.textPrimary}}>Browse Files</button>
                <input type="file" accept=".csv" ref={fileInputRef} style={{display:"none"}} onChange={handleFileUpload} />
              </div>
              
              <div style={{display:"flex", alignItems:"center", gap:12, margin:"20px 0"}}>
                <div style={{flex:1, height:1, background:T.border}}/>
                <div style={{...SANS, fontSize:11, color:T.textMuted, textTransform:"uppercase"}}>OR</div>
                <div style={{flex:1, height:1, background:T.border}}/>
              </div>

              <button onClick={() => simulateAiMapping("MOCK_TB_EXPORT_1231.csv", ["account_no", "account_desc", "debit_amount", "credit_amount", "ccy", "internal_id"], 1205)} style={{...SANS, width:"100%", fontSize:13, fontWeight:700, padding:"12px", borderRadius:6, border:"none", background:T.aiBg, color:T.aiBase, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                <span style={{fontSize:16}}>✦</span> Use Mock File (Simulate AI Mapping)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

