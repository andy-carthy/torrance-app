import React, { useState, useMemo } from 'react';
import { T, MONO, SANS, CAT } from '../../theme/tokens';
import { TB_ROWS } from '../../data/feeds/gl';
import { fmtUSD, fmtNum } from '../../utils/formatters';

export function RawGLGrid() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [sortBy, setSortBy] = useState("acct_asc");

  const totalD = TB_ROWS.reduce((s,r)=>s+r.debit,0);
  const totalC = TB_ROWS.reduce((s,r)=>s+r.credit,0);
  const ALL_CATS=["Asset","Liability","Capital","Income","Expense"];

  const filteredAndSorted = useMemo(() => {
    let result = [...TB_ROWS];
    if (catFilter !== "All") result = result.filter(r => r.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.acct.includes(q) || r.name.toLowerCase().includes(q) || (r.counterparty||"").toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "acct_asc") return a.acct.localeCompare(b.acct);
      if (sortBy === "amount_desc") return Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit);
      return 0;
    });
    return result;
  }, [search, catFilter, sortBy]);

  const COLS = ["GL Row ID", "Fund ID", "Account", "Account Name", "Category", "Subcategory", "Local Amount", "Exchange Rate", "Rate Source", "Rate Date", "Posting Date", "Trade Date", "Period Year", "Period Month", "Journal Ref", "Journal Desc", "Share Class", "Currency", "Counterparty", "Source System", "Is Intercompany", "Segment Code", "Debit", "Credit", "Net"];

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{...SANS,fontWeight:700,fontSize:16,color:T.textPrimary}}>Raw GL Feed</div>
        <div style={{...SANS,fontSize:12,color:T.textMuted,marginTop:3}}>Parsed from source integration</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.textPrimary}}>{TB_ROWS.length}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Rows</span>
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
        <input type="text" placeholder="Search account, name, or counterparty..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="All">All Categories</option>
        {ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="acct_asc">Sort: Account Number</option>
        <option value="amount_desc">Sort: Gross Amount</option>
      </select>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} rows</span>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i)=><th key={h} style={{...SANS,padding:"8px 12px",textAlign:i>=5?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((r,i) => {
              const net = r.debit-r.credit;
              return (
                <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{...MONO,padding:"8px 12px",fontSize:11,color:T.actionBase}}>{r.acct}</td>
                  <td style={{padding:"8px 12px",fontSize:12,color:T.textPrimary,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.name}>{r.name}</td>
                  <td style={{padding:"8px 12px"}}>
                    <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:CAT[r.category]?.bg||T.appBg,color:CAT[r.category]?.color||T.textMuted,border:`1px solid ${CAT[r.category]?.border||T.border}`}}>{r.category}</span>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11,color:(r.currency!=="USD"&&r.currency!=="Multi")?T.warnBase:T.textMuted,fontWeight:(r.currency!=="USD"&&r.currency!=="Multi")?700:400}}>{r.currency}</td>
                  <td style={{padding:"8px 12px",fontSize:11,color:T.textMuted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.counterparty||"—"}</td>
                  <td style={{...MONO,padding:"8px 12px",textAlign:"right",fontSize:11,color:T.textPrimary}}>{r.debit>0?fmtNum(r.debit):"—"}</td>
                  <td style={{...MONO,padding:"8px 12px",textAlign:"right",fontSize:11,color:T.textPrimary}}>{r.credit>0?fmtNum(r.credit):"—"}</td>
                  <td style={{...MONO,padding:"8px 12px",textAlign:"right",fontSize:11,fontWeight:600,color:net<0?T.errorBase:T.textPrimary}}>{fmtNum(net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}


