import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function Badge({severity,size="sm"}) {
  const cfg=severity==="error"?{color:T.errorBase, icon:"●", label:"ERROR"} : {color:T.warnBase, icon:"●", label:"WARN"};
  const p=size==="sm"?"2px 6px":"4px 8px",f=size==="sm"?10:11;
  // Ghost style: white background, gray border, colored dot/text
  return <span style={{...MONO,fontSize:f,fontWeight:600,padding:p,borderRadius:4,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:4,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}><span style={{color:cfg.color, fontSize:12, marginTop:-1}}>{cfg.icon}</span>{cfg.label}</span>;
}
