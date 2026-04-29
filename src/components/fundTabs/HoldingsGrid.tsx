import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { FS } from '../../data/financials';
import { fmtUSD, fmtNum, fmtShares, fmtPct, fmtCompact } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exporters';
import type { HoldingRow } from '../../types';

export function FvBadge({ level }) {
  const cfg = level===1?{color:"#3b82f6",bg:"#eff6ff",border:"#bfdbfe"}
             :level===2?{color:"#d97706",bg:"#fffbeb",border:"#fde68a"}
             :           {color:"#dc3545",bg:"#fef2f2",border:"#fecaca"};
  return <span style={{ ...MONO, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
    background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>L{level}</span>;
}



export function HoldingsGrid({ holdings, onUpdateFeedRecord }) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [groupBy, setGroupBy] = useState(true);
  const [sortBy, setSortBy] = useState("mv_desc");
  const [showAllCols, setShowAllCols] = useState(false); // NEW: Hierarchy Toggle
  const [holdingsData, setHoldingsData] = useState(holdings);
  const [editingCell, setEditingCell] = useState<{positionId: string; field: string} | null>(null);
  const [editValue, setEditValue] = useState("");

  const totalMV = holdingsData.reduce((s,h) => s+h.mv, 0);
  const l1MV    = holdingsData.filter(h=>h.fvLevel===1).reduce((s,h)=>s+h.mv,0);
  const l2MV    = holdingsData.filter(h=>h.fvLevel===2).reduce((s,h)=>s+h.mv,0);
  const l3MV    = holdingsData.filter(h=>h.fvLevel===3).reduce((s,h)=>s+h.mv,0);
  const assetClasses: string[] = [...new Set<string>(holdingsData.map(h=>(h as any).assetClass))];

  const filteredAndSorted = useMemo(() => {
    let result = [...holdingsData];
    if (levelFilter !== "All") result = result.filter(h => h.fvLevel.toString() === levelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(h => h.cusip.toLowerCase().includes(q) || h.name.toLowerCase().includes(q) || h.assetClass.toLowerCase().includes(q) || h.sector.toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "mv_desc") return b.mv - a.mv;
      if (sortBy === "mv_asc") return a.mv - b.mv;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [holdingsData, search, levelFilter, sortBy]);

  const COLS = ["Position ID", "Fund ID", "As Of Date", "CUSIP / ISIN", "SEDOL", "LEI", "Ticker", "Security Name", "Asset Class", "Asset Subclass", "Sector", "Country of Risk", "Country of Issuer", "Currency", "Shares / Par", "Cost Basis", "Market Value Local", "Market Value", "Price", "Price Date", "Price Source", "FV Technique", "Maturity Date", "Coupon Rate", "Coupon Type", "Notional Amount", "Is Restricted", "Restriction Note", "Is On Loan", "Share Class", "Liquidity Category", "Is Illiquid", "Unrealized G/L", "FV Level", "% of NAV"];
  
  // Define Primary vs Extended Columns
  const PRIMARY_HD_COLS = [1, 3, 6, 7, 8, 13, 14, 15, 17, 18, 33, 34];
  
  const RIGHT_COLS = [14, 15, 16, 17, 18, 23, 25, 32, 34];
  const CENTER_COLS = [33];

  const renderRow = (h, i) => {
    const gl = h.mv - h.cost;
    const pctNav = (h.mv / FS.net_assets) * 100;
    
    const cellData = [
      h.position_id, h.fund_id, h.as_of_date, h.cusip, h.sedol, h.lei, h.ticker, 
      h.name, h.assetClass, h.asset_subclass, h.sector, h.country_of_risk, h.country_of_issuer, 
      h.currency, h.shares, h.cost, h.market_value_local, h.mv, h.price, h.price_date, 
      h.price_source, h.fv_technique, h.maturity_date, h.coupon_rate, h.coupon_type, 
      h.notional_amount, h.is_restricted ? "Yes" : "No", h.restriction_note, 
      h.is_on_loan ? "Yes" : "No", h.class, h.liquidity_category, h.is_illiquid_investment ? "Yes" : "No", 
      gl, h.fvLevel, pctNav
    ];

    return (
      <tr key={h.position_id || i} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
        {cellData.map((val, colIdx) => {
          if (!showAllCols && !PRIMARY_HD_COLS.includes(colIdx)) return null;

          const isUSD = [15, 16, 17, 18, 25, 32].includes(colIdx);
          const isPct = colIdx === 34;
          const isFvLevel = colIdx === 33;
          const align = RIGHT_COLS.includes(colIdx) ? "right" : CENTER_COLS.includes(colIdx) ? "center" : "left";
          const isEditable = EDITABLE_COL_INDICES.has(colIdx);
          const field = EDITABLE_COL_FIELDS[colIdx];
          const isEditing = isEditable && editingCell?.positionId === h.position_id && editingCell?.field === field;

          return (
            <td key={colIdx}
              onDoubleClick={() => isEditable && handleHdDoubleClick(h.position_id, field)}
              style={{ ...MONO, padding:"6px 12px", fontSize:11, color:T.textPrimary, whiteSpace:"nowrap", textAlign: align, background: isEditing ? T.actionBg : isEditable ? "#fafffe" : "transparent", borderLeft: isEditable ? "1px solid #e2e8f0" : "none", borderRight: isEditable ? "1px solid #e2e8f0" : "none", cursor: isEditable ? "cell" : "default" }}>
              {isEditing ? (
                field === "fvLevel" ? (
                  <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitHdEdit(h.position_id, "fvLevel")}
                    style={{ ...MONO, fontSize:11, width:"100%", padding:"2px 6px", border:`1px solid ${T.actionBase}`, borderRadius:3 }}>
                    {FV_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : field === "assetClass" ? (
                  <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitHdEdit(h.position_id, "assetClass")}
                    style={{ ...MONO, fontSize:11, width:"100%", padding:"2px 6px", border:`1px solid ${T.actionBase}`, borderRadius:3 }}>
                    {ASSET_CLASS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitHdEdit(h.position_id, field)} onKeyDown={e => handleHdKeyDown(e, h.position_id, field)}
                    style={{ ...MONO, fontSize:11, width:"100%", padding:"2px 6px", border:`1px solid ${T.actionBase}`, borderRadius:3, outline:"none" }} />
                )
              ) : (
                isFvLevel ? <FvBadge level={val}/> :
                isUSD ? fmtUSD(val) :
                isPct ? fmtPct(val) :
                val == null ? "—" : val.toString()
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderSubtotalRow = (cls) => {
    const rows    = holdingsData.filter(h=>h.assetClass===cls);
    const clsMV   = rows.reduce((s,h)=>s+h.mv,0);
    const clsPct  = (clsMV/FS.net_assets)*100;

    // Dynamic colspan calculation based on visibility
    const visibleCols = showAllCols ? COLS : COLS.filter((_, i) => PRIMARY_HD_COLS.includes(i));
    const mvIdx = visibleCols.findIndex(c => c === "Market Value");
    const pctIdx = visibleCols.findIndex(c => c === "% of NAV");

    return (
      <tr key={`sub-${cls}`} style={{ background:"#f7f8fa" }}>
        <td colSpan={mvIdx} style={{ padding:"5px 8px", ...SANS, fontWeight:700, fontSize:12, borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>
          Subtotal — {cls}
        </td>
        <td style={{ ...MONO, padding:"5px 8px", textAlign:"right", fontWeight:700, fontSize:12, borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>{fmtUSD(clsMV)}</td>
        <td colSpan={pctIdx - mvIdx - 1} style={{ borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}/>
        <td style={{ ...MONO, padding:"5px 8px", textAlign:"right", fontWeight:700, fontSize:12, borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>{fmtPct(clsPct)}</td>
      </tr>
    );
  };

  const EDITABLE_COL_FIELDS = { 8: "assetClass", 14: "shares", 15: "cost", 17: "mv", 18: "price", 33: "fvLevel" };
  const EDITABLE_COL_INDICES = new Set([8, 14, 15, 17, 18, 33]);
  const FV_LEVEL_OPTIONS = [
    { value: 1, label: "Level 1 — Quoted Price" },
    { value: 2, label: "Level 2 — Observable Inputs" },
    { value: 3, label: "Level 3 — Unobservable Inputs" },
  ];
  const ASSET_CLASS_OPTIONS = [
    "Common Stock", "Government Bond", "Corporate Bond", "Municipal Bond",
    "Private Debt", "Future", "Interest Rate Swap", "FX Forward", "Call Option",
    "Put Option", "ETF", "Preferred Stock",
  ];

  const handleHdDoubleClick = (posId, field) => {
    const row = holdingsData.find(h => h.position_id === posId);
    if (!row) return;
    setEditingCell({ positionId: posId, field });
    setEditValue(String(row[field] ?? ""));
  };

  const commitHdEdit = (posId, field) => {
    let v: string | number = editValue;
    if (field !== "fvLevel" && field !== "assetClass") {
      v = editValue !== "" && !isNaN(Number(editValue)) ? Number(editValue) : editValue;
    } else if (field === "fvLevel") {
      v = Number(editValue);
    }
    
    // 1. Update local state for immediate visual feedback
    setHoldingsData(prev => prev.map(h => {
      if (h.position_id !== posId) return h;
      return { ...h, [field]: v };
    }));

    // 2. NEW: Fire the global STP engine callback
    if (onUpdateFeedRecord) {
      onUpdateFeedRecord("hd_001", posId, field, v);
    }

    setEditingCell(null);
  };

  const handleHdKeyDown = (e, posId, field) => {
    if (e.key === "Enter") commitHdEdit(posId, field);
    if (e.key === "Escape") setEditingCell(null);
  };

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:1, minWidth: 200, maxWidth: 320}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
        <input type="text" placeholder="Search CUSIP, name, sector..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="All">All FV Levels</option>
        <option value="1">Level 1 Only</option>
        <option value="2">Level 2 Only</option>
        <option value="3">Level 3 Only</option>
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="mv_desc">Sort: Market Value (High-Low)</option>
        <option value="mv_asc">Sort: Market Value (Low-High)</option>
        <option value="name_asc">Sort: Name (A-Z)</option>
      </select>
      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer", marginLeft:10}}>
        <input type="checkbox" checked={groupBy} onChange={e=>setGroupBy(e.target.checked)} style={{accentColor:T.actionBase}}/>
        <span style={{...SANS,fontSize:12,color:T.textPrimary,fontWeight:600}}>Group by Asset Class</span>
      </label>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} holdings</span>

        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.textPrimary}}>{fmtCompact(totalMV)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Total MV</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:"#3b82f6"}}>{fmtCompact(l1MV)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Level 1</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.warnBase}}>{fmtCompact(l2MV)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Level 2</span>
        </div>

        {/* NEW: Extended Column Toggler */}
        <button onClick={()=>setShowAllCols(!showAllCols)} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.actionBase,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          {showAllCols ? "[-] Compact View" : "[+] Show 23 More Columns"}
        </button>

        <button onClick={() => exportToExcel(filteredAndSorted, COLS, "Holdings_Export")} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export Excel
        </button>
      </div>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i) => {
                if (!showAllCols && !PRIMARY_HD_COLS.includes(i)) return null;
                const align = RIGHT_COLS.includes(i) ? "right" : CENTER_COLS.includes(i) ? "center" : "left";
                const isEditableCol = EDITABLE_COL_INDICES.has(i);
                return (
                  <th key={h} style={{...SANS, padding:"8px 12px", textAlign:align, color: isEditableCol ? T.actionBase : T.textMuted, fontWeight:700, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderBottom:`2px solid ${T.border}`, background: isEditableCol ? "#eff6ff" : T.appBg, borderLeft: isEditableCol ? "1px solid #bfdbfe" : "none", borderRight: isEditableCol ? "1px solid #bfdbfe" : "none", whiteSpace:"nowrap"}}>{h}{isEditableCol ? " ✎" : ""}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groupBy
              ? assetClasses.map(cls => {
                  const rows = filteredAndSorted.filter(h=>h.assetClass===cls);
                  if(!rows.length) return null;
                  
                  const headerColSpan = showAllCols ? 35 : PRIMARY_HD_COLS.length;

                  return [
                    <tr key={`hdr-${cls}`}>
                      <td colSpan={headerColSpan} style={{padding:"6px 12px",background:T.actionBg,borderBottom:`1px solid #bfdbfe`}}>
                        <span style={{...SANS,fontSize:10,fontWeight:700,color:T.actionBase,letterSpacing:"0.06em",textTransform:"uppercase"}}>{cls}</span>
                      </td>
                    </tr>,
                    ...rows.map((h,i)=>renderRow(h,i)),
                    renderSubtotalRow(cls)
                  ];
                })
              : filteredAndSorted.map((h,i)=>renderRow(h,i))
            }
            {!search && levelFilter==="All" && (
              <tr style={{background:T.navyHeader}}>
                {(() => {
                  const visibleCols = showAllCols ? COLS : COLS.filter((_, i) => PRIMARY_HD_COLS.includes(i));
                  const mvIdx = visibleCols.findIndex(c => c === "Market Value");
                  const pctIdx = visibleCols.findIndex(c => c === "% of NAV");

                  return (
                    <>
                      <td colSpan={mvIdx} style={{padding:"10px 12px",...SANS,fontWeight:700,fontSize:13,color:"#fff"}}>TOTAL HOLDINGS</td>
                      <td style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,color:"#fff"}}>{fmtUSD(totalMV)}</td>
                      <td colSpan={pctIdx - mvIdx - 1}/>
                      <td style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,color:"#fff"}}>{fmtPct((totalMV/FS.net_assets)*100)}</td>
                    </>
                  );
                })()}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
