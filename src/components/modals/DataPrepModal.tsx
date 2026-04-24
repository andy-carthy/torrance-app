import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { T, MONO, SANS } from '../../theme/tokens';

export function DataPrepModal({ row, columns, onClose, onApply }) {
  const [action, setAction] = useState("normalise");
  const [config, setConfig] = useState({ param1: "", param2: "" });
  const [previewComputing, setPreviewComputing] = useState(false);

  const ACTIONS = [
    { id: "normalise", icon: "✨", label: "Normalise", desc: "Format dates, casing, or strip characters." },
    { id: "enhance",   icon: "🪄", label: "Enhance",   desc: "AI extraction, VLOOKUPs, or appending text." },
    { id: "merge",     icon: "🔗", label: "Merge",     desc: "Combine multiple columns together." },
    { id: "split",     icon: "✂️", label: "Split",     desc: "Split into new columns via delimiter." },
    { id: "aggregate", icon: "∑",  label: "Aggregate", desc: "Sum, count, or average grouped data." },
  ];

  // Helper for the field labels
  const Label = ({children}) => <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6, marginTop:16}}>{children}</div>;

  // Simulate preview generation when config changes
  useEffect(() => {
    setPreviewComputing(true);
    const t = setTimeout(() => setPreviewComputing(false), 400);
    return () => clearTimeout(t);
  }, [action, config]);

  const handleApply = () => {
    const actionLabel = ACTIONS.find(a=>a.id===action)!.label;
    let desc = `${actionLabel} applied`;
    if (action === "split" && config.param1) desc = `Split on '${config.param1}'`;
    if (action === "normalise" && config.param1) desc = `Normalised to ${config.param1}`;
    if (action === "enhance") desc = `Enhanced via AI prompt`;
    
    onApply({ type: actionLabel, desc });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:800,boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh"}}>
        
        {/* Header */}
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span>🛠</span> Data Prep Engine
            </div>
            <div style={{...SANS,fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4}}>
              Configuring transformation for column: <span style={{color:"#fff",fontWeight:600}}>{row.sourceCol}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20,transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#9ca3af"}>✕</button>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Left Sidebar: Actions */}
          <div style={{width:240,background:"#f8fafc",borderRight:`1px solid ${T.border}`,padding:"16px",overflowY:"auto"}}>
            <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Select Action</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {ACTIONS.map(a => (
                <button key={a.id} onClick={()=>{setAction(a.id); setConfig({param1:"",param2:""});}} 
                  style={{...SANS,textAlign:"left",padding:"12px 14px",borderRadius:8,border:`1px solid ${action===a.id?T.actionBase:T.border}`,background:action===a.id?"#eff6ff":"#fff",cursor:"pointer",boxShadow:action===a.id?"0 1px 3px rgba(59,130,246,0.1)":"none",transition:"all 0.15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:16}}>{a.icon}</span>
                    <span style={{fontWeight:700,fontSize:13,color:action===a.id?T.actionBase:T.textPrimary}}>{a.label}</span>
                  </div>
                  <div style={{fontSize:11,color:T.textMuted,lineHeight:1.4,paddingLeft:24}}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Config & Preview */}
          <div style={{flex:1,padding:"24px",display:"flex",flexDirection:"column",overflowY:"auto",background:"#fff"}}>
            
            <div style={{flex:1}}>
              <div style={{...SANS,fontSize:14,fontWeight:700,color:T.textPrimary,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{ACTIONS.find(a=>a.id===action)?.icon}</span> Configure {ACTIONS.find(a=>a.id===action)?.label}
              </div>

              {action === "normalise" && (
                <div className="fade-in">
                  <Label>Operation</Label>
                  <select value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}}>
                    <option value="">Select operation...</option>
                    <option value="UPPERCASE">Convert to UPPERCASE</option>
                    <option value="lowercase">Convert to lowercase</option>
                    <option value="Strip Non-Numeric">Strip Non-Numeric Characters</option>
                    <option value="Format Date (YYYY-MM-DD)">Format Date to YYYY-MM-DD</option>
                  </select>
                </div>
              )}

              {action === "enhance" && (
                <div className="fade-in">
                  <div style={{padding:"12px 16px",background:T.aiBg,border:`1px solid ${T.aiBorder}`,borderRadius:8,marginBottom:16}}>
                    <div style={{...SANS,fontSize:12,fontWeight:700,color:T.aiBase,marginBottom:4}}>✦ AI Enhancement Prompt</div>
                    <div style={{...SANS,fontSize:11,color:T.textMuted}}>Instruct the Torrance AI on how to extract or enrich this data.</div>
                  </div>
                  <Label>Prompt</Label>
                  <textarea rows={3} value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} placeholder="e.g., 'Extract only the company name, ignoring legal suffixes like LLC or Inc.'" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,resize:"vertical"}} />
                </div>
              )}

              {action === "split" && (
                <div className="fade-in">
                  <Label>Delimiter</Label>
                  <input type="text" value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} placeholder="e.g., '-', ' ', or ','" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}} />
                  <div style={{display:"flex",gap:12}}>
                    <label style={{...SANS,fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="radio" name="splitType" defaultChecked/> Keep First Part</label>
                    <label style={{...SANS,fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="radio" name="splitType"/> Keep Last Part</label>
                    <label style={{...SANS,fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="radio" name="splitType"/> Create New Columns</label>
                  </div>
                </div>
              )}

              {action === "merge" && (
                <div className="fade-in">
                  <Label>Column to Merge With</Label>
                  <select value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}}>
                    <option value="">Select column...</option>
                    {columns.filter(c=>c!==row.sourceCol).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <Label>Separator String</Label>
                  <input type="text" value={config.param2} onChange={e=>setConfig({...config, param2:e.target.value})} placeholder="e.g., ' - '" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}} />
                </div>
              )}

              {action === "aggregate" && (
                <div className="fade-in">
                  <Label>Aggregation Function</Label>
                  <select value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}}>
                    <option value="">Select function...</option>
                    <option value="SUM">SUM</option>
                    <option value="AVG">AVERAGE</option>
                    <option value="COUNT">COUNT</option>
                  </select>
                  <Label>Group By Column (Optional)</Label>
                  <select style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                    <option value="">No grouping...</option>
                    {columns.filter(c=>c!==row.sourceCol).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Live Data Preview */}
            <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
              <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Live Output Preview</div>
              <div style={{background:"#1e293b",borderRadius:8,padding:"16px",position:"relative",minHeight:90}}>
                {previewComputing ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#94a3b8",fontSize:13,...SANS}}>
                    <span style={{animation:"pulse 1s infinite"}}>Computing preview...</span>
                  </div>
                ) : (
                  <div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:16,alignItems:"center"}}>
                    <div>
                      <div style={{...SANS,fontSize:10,color:"#64748b",marginBottom:4}}>Original Input ({row.sourceCol})</div>
                      <div style={{...MONO,fontSize:13,color:"#cbd5e1",wordBreak:"break-all"}}>{row.sampleValue}</div>
                    </div>
                    <div style={{color:"#475569",fontSize:18,textAlign:"center"}}>→</div>
                    <div>
                      <div style={{...SANS,fontSize:10,color:"#64748b",marginBottom:4}}>Transformed Output</div>
                      <div style={{...MONO,fontSize:13,color:"#34d399",fontWeight:700,wordBreak:"break-all",display:"flex",alignItems:"center",gap:6}}>
                        {action==="normalise" && config.param1==="UPPERCASE" ? row.sampleValue.toUpperCase() :
                         action==="split" && config.param1 ? row.sampleValue.split(config.param1)[0] :
                         action==="enhance" && config.param1 ? "✦ [AI Extracted Result]" :
                         action==="merge" && config.param1 ? `${row.sampleValue}${config.param2 || ""}[${config.param1}]` :
                         row.sampleValue}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div style={{padding:"16px 24px",background:"#f8fafc",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:12}}>
          <button onClick={onClose} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:"#fff",color:T.textPrimary,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleApply} style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 20px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer",boxShadow:"0 2px 4px rgba(74,124,255,0.2)"}}>Apply Rule</button>
        </div>
      </div>
    </div>
  );
}

