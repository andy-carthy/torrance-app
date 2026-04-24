import React, { useState } from 'react';
import { T, SANS } from '../../theme/tokens';
import type { FundSeed, Exception, ApprovalRecord, TeamMember } from '../../types';

export function BulkFundActionBar({selectedFunds, approvalState, fundState, currentUser, onClear, onBulkApprove, onSubmitForReview}) {
  const [actionState, setActionState] = useState<string | null>(null);
  const [showGenMenu, setShowGenMenu] = useState(false);
  const [genOpts, setGenOpts] = useState({ pdf: true, excel: true, xml: false });

  const selectedArr: string[] = Array.from(selectedFunds as Set<string>);

  const eligibleForReview = selectedArr.filter(fid => {
    const excs = fundState[fid] || [];
    const openErrors = excs.filter(e => e.severity === "error" && e.status === "open").length;
    const currentStatus = approvalState[fid]?.status || "open";
    return openErrors === 0 && currentStatus === "open";
  });

  const eligibleForSignOff = selectedArr.filter(fid => {
    const excs = fundState[fid] || [];
    const openErrors = excs.filter(e => e.severity === "error" && e.status === "open").length;
    return openErrors === 0 && approvalState[fid]?.status === "review_pending";
  });

  const isPreparer = !currentUser?.isController;
  const canSubmit = isPreparer && eligibleForReview.length > 0;
  const canApprove = !isPreparer && eligibleForSignOff.length > 0;
  const canGenerate = genOpts.pdf || genOpts.excel || genOpts.xml;

  const handleAction = (type: string, callback?: () => void) => {
    setShowGenMenu(false);
    setActionState(type);
    setTimeout(() => {
      if (callback) callback();
      setActionState("done");
      setTimeout(() => { setActionState(null); onClear(); }, 2500);
    }, 1500);
  };

  if(selectedArr.length === 0) return null;
  return (
    <div className="slide-in" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,background:T.navyHeader,borderTop:`2px solid ${T.actionBase}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:16, boxShadow:"0 -4px 12px rgba(0,0,0,0.15)"}}>
      <div style={{...SANS,fontSize:13,fontWeight:700,color:"#fff",background:"#253547",padding:"6px 12px",borderRadius:6,display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:T.actionBase,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{selectedArr.length}</span>
        funds selected
      </div>

      {actionState === "done" ? (
        <div style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",color:"#34d399",display:"flex",alignItems:"center",gap:6}}>
          <span>✓</span> Batch update complete.
        </div>
      ) : (
        <>
          {isPreparer && (
            <button
              onClick={() => handleAction('submitting', () => onSubmitForReview(eligibleForReview))}
              disabled={!canSubmit || !!actionState}
              style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 16px",borderRadius:6,border:"none",background:canSubmit?T.actionBase:T.border,color:"#fff",cursor:canSubmit?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:6}}
            >
              {actionState === "submitting" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>↑</span>}
              Submit {eligibleForReview.length} Funds for Review
            </button>
          )}

          {!isPreparer && (
            <button
              onClick={() => handleAction('approving', () => onBulkApprove(eligibleForSignOff))}
              disabled={!canApprove || !!actionState}
              style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 16px",borderRadius:6,border:`1px solid ${canApprove?T.okBorder:"#374151"}`,background:T.okBg,color:T.okBase,cursor:canApprove?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:6}}
            >
              {actionState === "approving" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>✓</span>}
              Sign-off {eligibleForSignOff.length} Funds
            </button>
          )}

          <div style={{position:"relative"}}>
            <button onClick={()=>setShowGenMenu(!showGenMenu)} disabled={!!actionState} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:"none",background:actionState==="generating"?"#374151":T.okBase,color:actionState==="generating"?"#9ca3af":"#fff",cursor:actionState?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
              {actionState==="generating" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>📄</span>} Batch Generate...
            </button>
            {showGenMenu && (
              <div className="slide-in" style={{position:"absolute", bottom:"100%", left:0, marginBottom:8, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, padding:16, width:240, boxShadow:"0 -4px 12px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column", gap:10}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase"}}>Select Outputs</div>
                <label style={{...SANS, fontSize:13, display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.textPrimary}}>
                  <input type="checkbox" checked={genOpts.pdf} onChange={e=>setGenOpts({...genOpts, pdf:e.target.checked})} style={{accentColor:T.actionBase, width:16, height:16}} /> 📄 PDF Financials
                </label>
                <label style={{...SANS, fontSize:13, display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.textPrimary}}>
                  <input type="checkbox" checked={genOpts.excel} onChange={e=>setGenOpts({...genOpts, excel:e.target.checked})} style={{accentColor:T.actionBase, width:16, height:16}} /> 📊 Excel Workpapers
                </label>
                <label style={{...SANS, fontSize:13, display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.textPrimary}}>
                  <input type="checkbox" checked={genOpts.xml} onChange={e=>setGenOpts({...genOpts, xml:e.target.checked})} style={{accentColor:T.actionBase, width:16, height:16}} /> 🏛 SEC N-PORT XML
                </label>
                <button disabled={!canGenerate} onClick={()=>handleAction('generating')} style={{...SANS, marginTop:8, fontSize:12, fontWeight:700, padding:"8px", borderRadius:6, border:"none", background:canGenerate?T.actionBase:T.border, color:canGenerate?"#fff":T.textMuted, cursor:canGenerate?"pointer":"not-allowed"}}>
                  Run Batch Job
                </button>
              </div>
            )}
          </div>
          <button onClick={()=>handleAction('downloading')} disabled={!!actionState} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid #374151`,background:actionState==="downloading"?"#374151":"transparent",color:actionState==="downloading"?"#9ca3af":"#e2e6ed",cursor:actionState?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {actionState==="downloading" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>↓</span>} Batch Download
          </button>
        </>
      )}
      <button onClick={onClear} disabled={!!actionState} style={{marginLeft:"auto",...SANS,fontSize:13,color:"#8898aa",background:"transparent",border:"none",cursor:actionState?"not-allowed":"pointer"}}>✕ Clear</button>
    </div>
  );
}
