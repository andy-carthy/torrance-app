import React, { useState } from 'react';
import { T, SANS, MONO } from '../../theme/tokens';
import { AI_PARAM_DEFAULTS } from '../../data/aiData';

export function AiParameterTuning({onClose}) {
  const [params, setParams] = useState(AI_PARAM_DEFAULTS);
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => { setParams(p=>({...p,[key]:val})); setSaved(false); };
  const toggleCode = (code) => {
    setParams(p=>({...p, eligibleCodes: p.eligibleCodes.includes(code) ? p.eligibleCodes.filter(c=>c!==code) : [...p.eligibleCodes, code]}));
    setSaved(false);
  };
  const handleSave = () => { setSaving(true); setTimeout(()=>{ setSaving(false); setSaved(true); },900); };

  const SliderRow = ({label, paramKey, min, max, step=1, unit, description}) => (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <div style={{...SANS,fontWeight:600,fontSize:13,color:T.textPrimary}}>{label}</div>
        <div style={{...MONO,fontSize:14,fontWeight:700,color:T.actionBase}}>{params[paramKey]}{unit}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={params[paramKey]}
        onChange={e=>update(paramKey, Number(e.target.value))}
        style={{width:"100%",accentColor:T.actionBase,cursor:"pointer"}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{...SANS,fontSize:10,color:T.textMuted}}>{min}{unit}</span>
        <span style={{...SANS,fontSize:10,color:T.textMuted,maxWidth:"70%",textAlign:"center"}}>{description}</span>
        <span style={{...SANS,fontSize:10,color:T.textMuted}}>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true"
      style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.7)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.cardBg,borderRadius:12,width:580,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>

        <div style={{background:T.navyHeader,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:T.aiBase}}>✦</span>AI Parameter Tuning
            </div>
            <div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Controller access only · Changes apply to the next close cycle</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"22px 24px"}}>
          <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:16}}>Confidence Thresholds</div>
          <SliderRow label="Suggestion Visibility Threshold" paramKey="confidenceThreshold" min={50} max={99} unit="%" description="Minimum AI confidence to surface a suggestion in the exception pane"/>
          <SliderRow label="Auto-Accept Threshold" paramKey="autoAcceptThreshold" min={85} max={100} unit="%" description="AI suggestions above this confidence are automatically accepted without human action"/>

          <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:16,marginTop:8}}>Tolerance Bands</div>
          <SliderRow label="FX Variance Auto-Acknowledge" paramKey="fxVarianceTolerance" min={0} max={5000} step={50} unit=" USD" description="FX rate variances below this dollar amount are automatically acknowledged"/>
          <SliderRow label="Prior Period Lookback Window" paramKey="priorPeriodLookback" min={1} max={12} unit=" months" description="How many prior closes the AI references when classifying exception patterns"/>

          <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12,marginTop:8}}>Exception Code Eligibility</div>
          <div style={{...SANS,fontSize:11,color:T.textMuted,marginBottom:14,lineHeight:1.5}}>
            Toggle which exception codes receive AI treatment. Codes that are disabled will not show suggestions or root cause analysis.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {params.allCodes.map(code=>{
              const isOn = params.eligibleCodes.includes(code);
              return (
                <div key={code} onClick={()=>toggleCode(code)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:7,border:`1px solid ${isOn?T.actionBase:T.border}`,background:isOn?T.actionBg:T.appBg,cursor:"pointer",transition:"all 0.12s"}}>
                  <span style={{...MONO,fontSize:11,fontWeight:600,color:isOn?T.actionBase:T.textMuted}}>{code}</span>
                  <div style={{width:36,height:20,borderRadius:10,background:isOn?T.actionBase:T.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:isOn?18:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:10}}>
          {saved&&<span style={{...SANS,fontSize:12,color:T.okBase,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><span>✓</span>Settings saved</span>}
          <button onClick={onClose} style={{...SANS,fontSize:12,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textMuted,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 18px",borderRadius:6,border:"none",background:saving?"#374151":T.aiBase,color:saving?"#6b7280":"#fff",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving?<><span style={{animation:"pulse 0.8s infinite"}}>✦</span>Saving…</>:<><span>✦</span>Save Parameters</>}
          </button>
        </div>
      </div>
    </div>
  );
}

