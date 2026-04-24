import React from 'react';
import { T, SANS } from '../../theme/tokens';

export function WorkflowProgress({ stats, approval }) {
  const steps = [
    { label: "Data",       done: true, error: false },
    { label: "Exceptions", done: stats.errors === 0, error: stats.errors > 0 },
    { label: "Checks",     done: approval.status === "review_pending" || approval.status === "approved", error: false },
    { label: "Approved",   done: approval.status === "approved", error: false }
  ];

  return (
    <div style={{display:"flex", alignItems:"center", gap:4}}>
      {steps.map((s, i) => {
        const bg = s.error ? T.errorBase : s.done ? T.okBase : T.border;
        return (
          <div key={i} title={s.label} style={{display:"flex", alignItems:"center", gap:4}}>
            <div style={{width: 18, height: 6, borderRadius: 3, background: bg, opacity: (!s.done && !s.error) ? 0.5 : 1}} />
          </div>
        );
      })}
      <span style={{...SANS, fontSize:10, color:T.textMuted, marginLeft:4, width: 60}}>
        {approval.status==="approved" ? "Approved" : stats.errors > 0 ? "Exceptions" : "In Review"}
      </span>
    </div>
  );
}
