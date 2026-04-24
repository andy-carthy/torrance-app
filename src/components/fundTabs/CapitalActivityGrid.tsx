import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { fmtUSD, fmtShares, fmtCompact } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exporters';
import type { CapitalActivityRow } from '../../types';

export function CapitalActivityGrid({ activity }) { // <-- ADDED PROP
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date_desc");

  // REPLACED CAPITAL_ACTIVITY with activity
  const totalSubs  = activity.filter(r=>r.type==="Subscription").reduce((s,r)=>s+r.grossAmount,0);
  const totalReds  = activity.filter(r=>r.type==="Redemption").reduce((s,r)=>s+r.grossAmount,0);
  const totalReinv = activity.filter(r=>r.type==="Reinvestment").reduce((s,r)=>s+r.grossAmount,0);
  const totalDivs  = activity.filter(r=>r.type==="Dividend").reduce((s,r)=>s+r.grossAmount,0);
  const netCap     = totalSubs - totalReds + totalReinv - totalDivs;

  const CLASSES = ["All", "Class A", "Institutional", "R6"];
  const TYPES = ["All", "Subscription", "Redemption", "Reinvestment", "Dividend"];
  const TYPE_CFG = { Subscription:{color:T.okBase,bg:T.okBg,bd:T.okBorder}, Redemption:{color:T.errorBase,bg:T.errorBg,bd:T.errorBorder}, Reinvestment:{color:T.actionBase,bg:T.actionBg,bd:"#bfdbfe"}, Dividend:{color:T.warnBase,bg:T.warnBg,bd:T.warnBorder} };

  const filteredAndSorted = useMemo(() => {
    let result = [...activity]; // REPLACED CAPITAL_ACTIVITY with activity
    if (classFilter!=="All") result = result.filter(r=>r.shareClass===classFilter);
    if (typeFilter!=="All") result = result.filter(r=>r.type===typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.id.toLowerCase().includes(q) || r.investor.toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "date_desc") return +new Date(b.tradeDate) - +new Date(a.tradeDate);
      if (sortBy === "date_asc") return +new Date(a.tradeDate) - +new Date(b.tradeDate);
      if (sortBy === "amt_desc") return b.grossAmount - a.grossAmount;
      return 0;
    });
    return result;
  }, [activity, search, classFilter, typeFilter, sortBy]);

  const COLS = ["Transaction ID", "Fund ID", "Trade Date", "Settlement Date", "Type", "Share Class", "Investor / Account", "Investor Type", "Shares", "NAV / Share", "Gross Amount", "Net Amount", "Dist. Character", "Is In-Kind", "Withholding Tax", "Currency", "Capital Call Ref", "Dist. Notice Ref", "Is Reinvestment"];

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{...SANS,fontWeight:700,fontSize:16,color:T.textPrimary}}>Capital Activity</div>
        <div style={{...SANS,fontSize:12,color:T.textMuted,marginTop:3}}>Statement of Changes in Net Assets</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.okBase}}>{fmtCompact(totalSubs)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Subs</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.errorBase}}>{fmtCompact(totalReds)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Reds</span>
        </div>
        <div style={{background:netCap>=0?T.okBg:T.errorBg,border:`1px solid ${netCap>=0?T.okBorder:T.errorBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:netCap>=0?T.okBase:T.errorBase}}>{fmtCompact(netCap)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:netCap>=0?T.okBase:T.errorBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Net Flow</span>
        </div>
        <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
        <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export CSV
        </button>
      </div>
    </div>

    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:1, minWidth: 200, maxWidth: 320}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
        <input type="text" placeholder="Search investor or ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        {TYPES.map(t=><option key={t} value={t}>{t==="All"?"All Types":t}</option>)}
      </select>
      <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        {CLASSES.map(c=><option key={c} value={c}>{c==="All"?"All Classes":c}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="date_desc">Sort: Date (Newest)</option>
        <option value="date_asc">Sort: Date (Oldest)</option>
        <option value="amt_desc">Sort: Amount (Highest)</option>
      </select>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} records</span>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i)=><th key={h} style={{...SANS,padding:"8px 12px",textAlign:i>=4?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
          {filteredAndSorted.map(r => {
              const cfg = TYPE_CFG[r.type]||TYPE_CFG.Dividend;
              const cellData = [
                r.transaction_id, r.fund_id, r.tradeDate, r.settlement_date, r.type, r.shareClass, 
                r.investor, r.investor_type, r.shares, r.navPerShare, r.grossAmount, r.net_amount, 
                r.distribution_character, r.is_in_kind ? "Yes" : "No", r.withholding_tax, r.currency, 
                r.capital_call_notice_ref, r.distribution_notice_ref, r.is_reinvestment ? "Yes" : "No"
              ];

              return (
                <tr key={r.id} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                  {cellData.map((val, colIdx) => (
                    <td key={colIdx} style={{...MONO, padding:"8px 12px", fontSize:11, color:T.textPrimary, whiteSpace:"nowrap", textAlign: [8,9,10,11,14].includes(colIdx) ? "right" : "left"}}>
                       {colIdx === 4 ? <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.bd}`}}>{val}</span> :
                        [10,11,14].includes(colIdx) ? fmtUSD(val) : 
                        val == null ? "—" : val.toString()}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!search && typeFilter==="All" && classFilter==="All" && (
              <tr style={{background:T.navyHeader}}>
                <td colSpan={16} style={{padding:"10px 12px",...SANS,fontWeight:700,fontSize:13,color:"#fff"}}>NET CAPITAL ACTIVITY</td>
                <td colSpan={2}/>
                <td style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,color:netCap>=0?"#34d399":"#f87171"}}>{fmtUSD(netCap)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

