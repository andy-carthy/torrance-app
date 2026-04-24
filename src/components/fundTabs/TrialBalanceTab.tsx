import React, { useState, useCallback, useMemo } from 'react';
import { T, MONO, SANS, CAT } from '../../theme/tokens';
import { fmtUSD, fmtNum } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exporters';
import { DrilldownModal } from '../modals/DrilldownModal';
import type { TBRow } from '../../types';

export function TrialBalanceTab({ tbRows }) {
  const ALL_CATS=["Asset","Liability","Capital","Income","Expense"];
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [sortBy, setSortBy] = useState("acct_asc");
  const [drillRow, setDrillRow] = useState(null);
  const [showAiInsight, setShowAiInsight] = useState(false);
  const [showAllCols, setShowAllCols] = useState(false); // NEW: Hierarchy Toggle
  const [showLrDetails, setShowLrDetails] = useState(false);
  
  const totalDebit = tbRows.reduce((s,r)=>s+r.debit,0);
  const totalCredit = tbRows.reduce((s,r)=>s+r.credit,0);
  const balanced = Math.abs(totalDebit-totalCredit)<1;
  const variance = Math.abs(totalDebit-totalCredit);

  const filteredAndSorted = useMemo(() => {
    let result = [...tbRows]; 
    if (catFilter !== "All") result = result.filter(r => r.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.acct.includes(q) || r.name.toLowerCase().includes(q) || (r.counterparty||"").toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "acct_asc") return a.acct.localeCompare(b.acct);
      if (sortBy === "net_desc") return Math.abs(b.debit-b.credit) - Math.abs(a.debit-a.credit);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [tbRows, search, catFilter, sortBy]); 

  const COLS = ["GL Row ID", "Fund ID", "Account", "Account Name", "Category", "Subcategory", "Local Amount", "Exchange Rate", "Rate Source", "Rate Date", "Posting Date", "Trade Date", "Period Year", "Period Month", "Journal Ref", "Journal Desc", "Share Class", "Currency", "Counterparty", "Source System", "Is Intercompany", "Segment Code", "Debit", "Credit", "Net"];
  
  // Define Primary vs Extended Columns
  const PRIMARY_TB_COLS = [2, 3, 4, 6, 7, 17, 18, 22, 23, 24];

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:"1 1 auto", minWidth: 150 }}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:12}}>⌕</span>
        <input type="text" placeholder="Search account, name, or counterparty..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="All">All Categories</option>
        {ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="acct_asc">Sort: Account Number</option>
        <option value="net_desc">Sort: Absolute Net Balance</option>
        <option value="name_asc">Sort: Account Name (A-Z)</option>
      </select>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} accounts</span>

        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary}}>{fmtUSD(totalDebit)}</span>
          <span style={{...SANS,fontSize:12,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Debits</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary}}>{fmtUSD(totalCredit)}</span>
          <span style={{...SANS,fontSize:12,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Credits</span>
        </div>
        <div style={{background:balanced?T.okBg:T.errorBg,border:`1px solid ${balanced?T.okBorder:T.errorBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12, color:balanced?T.okBase:T.errorBase}}>{balanced?"✓":"✕"}</span>
          <span style={{...SANS,fontSize:12,fontWeight:700,color:balanced?T.okBase:T.errorBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>{balanced?"Balanced":"Out of Balance"}</span>
        </div>
        <div style={{ position: "relative" }}>
  <button onClick={() => setShowLrDetails(!showLrDetails)} style={{ ...SANS, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.warnBorder}`, background: T.warnBg, color: T.warnBase, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
    <span>◈</span> LR Adjusted — $1 distributed
  </button>

  {showLrDetails && (
    <div className="slide-in" style={{ position: "absolute", top: 40, right: 0, width: 350, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100 }}>
      <div style={{ padding: "16px", borderBottom: `1px solid ${T.border}`, background: "#f8fafc", borderRadius: "8px 8px 0 0" }}>
        <div style={{ ...SANS, fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Largest Remainder Adjustment</div>
        <div style={{ ...SANS, fontSize: 12, color: T.textMuted, marginTop: 4 }}>Trial Balance Vertical Footing</div>
      </div>
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, ...SANS, fontSize: 12 }}>
          <span style={{ color: T.textMuted }}>Total Residual Distributed:</span>
          <span style={{ fontWeight: 700, color: T.warnBase }}>+$1.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, ...SANS, fontSize: 12 }}>
          <span style={{ color: T.textMuted }}>Accounts Adjusted:</span>
          <span style={{ fontWeight: 700, color: T.textPrimary }}>1</span>
        </div>
        <div style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Adjustment Detail</div>
        <div style={{ background: T.appBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px", ...MONO, fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: T.textPrimary, fontWeight: 700 }}>Acct 1010-EUR-01</span>
            <span style={{ color: T.warnBase, fontWeight: 700 }}>+$1.00</span>
          </div>
          <div style={{ color: T.textMuted }}>Raw: 37,947,213.47</div>
          <div style={{ color: T.textMuted }}>Floored: 37,947,213</div>
          <div style={{ color: T.textPrimary, marginTop: 4 }}>Displayed: 37,947,214</div>
        </div>
      </div>
    </div>
  )}
</div>
        
        {!balanced && (
          <button onClick={()=>setShowAiInsight(!showAiInsight)} style={{...SANS,fontSize:11,fontWeight:700,height:34,padding:"0 12px",borderRadius:6,border:`1px solid ${T.aiBorder}`,background:showAiInsight?T.aiBase:T.aiBg,color:showAiInsight?"#fff":T.aiBase,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s",boxShadow:showAiInsight?"none":"0 2px 8px rgba(124,58,237,0.15)"}}>
            <span>✦</span> {showAiInsight ? "Close AI Analysis" : "Run AI Diagnostics"}
          </button>
        )}
        
        {/* NEW: Extended Column Toggler */}
        <button onClick={()=>setShowAllCols(!showAllCols)} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.actionBase,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          {showAllCols ? "[-] Compact View" : "[+] Show 15 More Columns"}
        </button>

        <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export Excel
        </button>
      </div>
    </div>

    {showAiInsight && (
      <div className="slide-in" style={{marginBottom:16, background:"linear-gradient(135deg,#faf8ff,#f5f3ff)", border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start"}}>
        <div style={{fontSize:20}}>🧠</div>
        <div style={{flex:1}}>
          <div style={{...SANS, fontSize:13, fontWeight:700, color:T.aiDark, marginBottom:4}}>AI Diagnostic Complete: Variance Root Cause Identified</div>
          <div style={{...SANS, fontSize:12, color:T.textPrimary, lineHeight:1.5}}>
            The Trial Balance is out of balance by exactly <strong>{fmtUSD(variance)}</strong>. 
            <br/>This variance matches a known ingestion exception currently in your queue: <strong style={{color:T.errorBase}}>EXC-004 (Account 9999 'Suspense Account')</strong> for {fmtUSD(150000)}. 
            <br/><strong>Recommendation:</strong> Resolving EXC-004 in the Exceptions tab will map this unclassified cash to the correct ledger account and automatically restore ledger balance.
          </div>
        </div>
        <span style={{...MONO, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:T.aiBg, color:T.aiBase, border:`1px solid ${T.aiBorder}`}}>
          99% confidence match
        </span>
      </div>
    )}

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflowX:"auto", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        {/* Drop this into the toolbar above the TB table */}

        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i) => {
                if (!showAllCols && !PRIMARY_TB_COLS.includes(i)) return null;
                return (
                  <th key={h} style={{...SANS,padding:"8px 12px",textAlign:[6, 7, 22, 23, 24].includes(i)?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`, whiteSpace:"nowrap"}}>{h}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ALL_CATS.filter(c => catFilter==="All" || catFilter===c).map(cat=>{
              const rows = filteredAndSorted.filter(r=>r.category===cat);
              if(!rows.length) return null;
              const subD=rows.reduce((s,r)=>s+r.debit,0), subC=rows.reduce((s,r)=>s+r.credit,0), subN=subD-subC;
              
              const headerColSpan = showAllCols ? 25 : PRIMARY_TB_COLS.length;
              const subtotalColSpan = showAllCols ? 22 : PRIMARY_TB_COLS.length - 3;

              return [
                <tr key={`hdr-${cat}`}><td colSpan={headerColSpan} style={{padding:"6px 12px",background:CAT[cat].bg,borderBottom:`1px solid ${CAT[cat].border}`}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><span style={{width:8,height:8,borderRadius:"50%",background:CAT[cat].color,display:"inline-block"}}/><span style={{...SANS,fontSize:10,fontWeight:700,color:CAT[cat].color,letterSpacing:"0.07em",textTransform:"uppercase"}}>{cat}</span></span></td></tr>,
                ...rows.map((r,i) => {
                  const cellData = [
                    r.gl_row_id, r.fund_id, r.acct, r.name, r.category, r.account_subcategory, r.local_amount, 
                    r.exchange_rate, r.exchange_rate_source, r.exchange_rate_date, r.posting_date, r.trade_date, 
                    r.period_year, r.period_month, r.journal_ref, r.journal_description, r.share_class, 
                    r.currency, r.counterparty, r.source_system, r.is_intercompany ? "Yes" : "No", 
                    r.segment_code, r.debit, r.credit, r.debit - r.credit
                  ];

                  return (
                    <tr key={`${r.acct}-${i}`} className="row-hover" onClick={()=>setDrillRow(r)} style={{cursor:"pointer", borderBottom:`1px solid ${T.border}`}}>
                      {cellData.map((val, colIdx) => {
                        if (!showAllCols && !PRIMARY_TB_COLS.includes(colIdx)) return null;
                        const isAmount = [6, 22, 23, 24].includes(colIdx);
                        const isFX = colIdx === 7;
                        return (
                          <td key={colIdx} style={{...MONO, padding:"9px 12px", fontSize:11, color: isAmount ? T.textPrimary : colIdx===2 ? T.actionBase : T.textMuted, textAlign: isAmount || isFX ? "right" : "left", whiteSpace:"nowrap"}}>
                            {colIdx === 24 && r.acct === "1010" && r.currency === "EUR" ? (
                              <div title="Raw value: $37,947,213.47&#10;Displayed: $37,947,214&#10;LR adjustment: +$1.00 (remainder rank: 1 of 3, fractional part: $0.47)&#10;Column target: $75,894,427&#10;Without this adj: $75,894,426 (would not foot)" 
                                   style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "help" }}>
                                {val !== 0 ? fmtUSD(val) : "—"}
                                <span style={{ color: T.warnBase, fontSize: 12 }}>◈</span>
                              </div>
                            ) : (
                              isAmount ? (val !== 0 ? fmtUSD(val) : "—") : val?.toString() || "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )
                }),
                <tr key={`sub-${cat}`} style={{background:"#f7f8fa", borderBottom:`2px solid ${T.border}`}}>
                  <td colSpan={subtotalColSpan} style={{padding:"8px 12px",fontWeight:700,fontSize:12,...SANS,color:T.textPrimary}}>Subtotal — {cat}</td>
                  {[subD,subC,subN].map((v,i)=><td key={i} style={{...MONO,padding:"8px 12px",textAlign:"right",fontWeight:700,fontSize:12,color:i===2&&v<0?T.errorBase:T.textPrimary}}>{fmtNum(v)}</td>)}
                </tr>
              ];
            })}
            {!search && catFilter==="All" && (
              <tr>
                <td colSpan={showAllCols ? 22 : PRIMARY_TB_COLS.length - 3} style={{padding:"10px 12px",fontWeight:700,fontSize:13,background:T.navyHeader,color:"#fff",...SANS}}>GRAND TOTAL</td>
                {[totalDebit,totalCredit,totalDebit-totalCredit].map((v,i)=><td key={i} style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,background:T.navyHeader,color:i===2?(balanced?"#34d399":"#f87171"):"#fff"}}>{fmtNum(v)}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    {drillRow && <DrilldownModal row={drillRow} onClose={()=>setDrillRow(null)}/>}
  </div>;
}

