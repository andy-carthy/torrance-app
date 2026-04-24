import React from 'react';
import { T, SANS, MONO } from '../../theme/tokens';

export function FieldLabel({children, required=false}) {
  return <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6,display:"flex",gap:4,alignItems:"center"}}>{children}{required&&<span style={{color:T.errorBase,fontSize:11}}>*</span>}</div>;
}
export function Card({title, accessory=null, children, flush=false, accent=null}: {title?: any; accessory?: React.ReactNode; children?: React.ReactNode; flush?: boolean; accent?: string | null}) {
  return <div style={{background:T.cardBg,border:`1px solid ${accent||T.border}`,borderRadius:9,marginBottom:14,overflow:"hidden"}}>
    <div style={{padding:"11px 16px",borderBottom:`1px solid ${accent||T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:accent?"linear-gradient(135deg,#f5f3ff,#ede9fe)":undefined}}>
      <span style={{...SANS,fontWeight:700,fontSize:13,color:accent?T.aiBase:T.textPrimary}}>{title}</span>
      {accessory}
    </div>
    <div style={flush?{}:{padding:"14px 16px"}}>{children}</div>
  </div>;
}
export function SectionDivider({label, count, color, bg, border}) {
  return <div style={{padding:"5px 14px",background:bg,borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",gap:6}}>
    <span style={{...SANS,fontSize:10,fontWeight:700,color,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
    <span style={{...MONO,fontSize:10,color,fontWeight:700}}>({count})</span>
  </div>;
}
