import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { Avatar } from '../primitives/Avatar';
import { fmtUSD, fmtPct } from '../../utils/formatters';
import type { TeamMember } from '../../types';

const CROSS_CHECKS_DATA_EXPANDED = [
  // ─── Balance Sheet ───
  { id: "BS-01", category: "Balance Sheet", description: "Net assets tie between balance sheet and statement of changes", status: "Pass", value: "$0.00 variance", formula: "SOA.NetAssets - SCNA.EndingNetAssets = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "BS-02", category: "Balance Sheet", description: "Net asset components foot to total net assets", status: "Fail", value: "$150,000 variance", formula: "SUM(SOA.CapComponents) - SOA.TotalNetAssets = 0", source1: 687250000, source2: 687400000, aiFlag: "pop_fail", aiNote: "Failed in 4 consecutive periods due to unmapped suspense.", resolvedBy: null },
  { id: "BS-03", category: "Balance Sheet", description: "Total Assets = Total Liabilities + Net Assets", status: "Pass", value: "$0.00 variance", formula: "SOA.TotalAssets - (SOA.TotalLiabilities + SOA.NetAssets) = 0", source1: 691011000, source2: 691011000, aiFlag: null, resolvedBy: null },
  { id: "BS-04", category: "Balance Sheet", description: "Cash balance matches bank reconciliation", status: "Fail", value: "-$42,105 variance", formula: "GL.1100 + GL.1110 - BankRec.EndingBalance = 0", source1: 20088465, source2: 20130570, aiFlag: "multi_fund", aiNote: "Timing difference on sweeping account across 3 funds.", resolvedBy: null },
  
  // ─── Schedule of Investments ───
  { id: "SOI-X01", category: "Schedule of Investments", description: "SOI total fair value agrees to balance sheet investment line", status: "Fail", value: "$120,000 variance", formula: "SUM(SOI.FairValue) - SOA.InvestmentsAtValue = 0", source1: 462578500, source2: 462698500, aiFlag: "multi_fund", aiNote: "MTM price missing for asset ID 88732J202.", resolvedBy: null },
  { id: "SOI-02", category: "Schedule of Investments", description: "Level 3 investments match Rollforward ending balance", status: "Pass", value: "$0.00 variance", formula: "SUM(SOI.Level3) - L3_Rollforward.EndingBalance = 0", source1: 45000000, source2: 45000000, aiFlag: null, resolvedBy: null },
  { id: "SOI-03", category: "Schedule of Investments", description: "Unrealized G/L on SOI matches Trial Balance", status: "Pass", value: "$0.00 variance", formula: "SUM(SOI.UnrealizedGL) - TB.4200 = 0", source1: 9250000, source2: 9250000, aiFlag: null, resolvedBy: null },
  { id: "SOI-04", category: "Schedule of Investments", description: "Foreign currency positions use consistent FX rates", status: "Accepted", value: "$8,420 variance", formula: "SOI.FXRate - Master.FXRate = 0", source1: 1.0798, source2: 1.0842, aiFlag: null, resolvedBy: "u4", resolvedAt: "Dec 31, 2024 10:15 AM", overrideNote: "Client approved stale ECB rate for this specific legacy sleeve." },

  // ─── Fees & Accruals ───
  { id: "FE-01", category: "Fees & Accruals", description: "Independent AI recalculation of advisory fee vs. GL reported amount", status: "Fail", value: "$1,800 variance", formula: "AI.AdvisoryFee - GL.AdvisoryFee = 0", source1: 6401800, source2: 6400000, aiFlag: "pop_fail", aiNote: "Pattern suggests a timing difference in fee accrual calculation (calendar month vs. business days).", resolvedBy: null },
  { id: "FE-02", category: "Fees & Accruals", description: "Performance fee consistency against high-water mark", status: "Pass", value: "Verified", formula: "GL.PerfFee - HWM.PerfFee = 0", source1: 0, source2: 0, aiFlag: null, resolvedBy: null },
  { id: "FE-03", category: "Fees & Accruals", description: "Expense ratio vs. prospectus cap limits", status: "Pass", value: "Within 1.50% cap", formula: "SOO.ExpenseRatio <= Prospectus.Cap", source1: 0.0148, source2: 0.015, aiFlag: null, resolvedBy: null },

  // ─── Income Statement ───
  { id: "IS-01", category: "Income Statement", description: "Total investment income agrees to note detail", status: "Pass", value: "$0.00 variance", formula: "SOO.TotalIncome - Notes.IncomeDetail = 0", source1: 6458420, source2: 6458420, aiFlag: null, resolvedBy: null },
  { id: "IS-02", category: "Income Statement", description: "Advisory fee expense matches prospectus rate (0.75%)", status: "Pass", value: "-$12 variance", formula: "SOO.AdvisoryFee - (AvgNetAssets * 0.0075) = 0", source1: 6400000, source2: 6400012, aiFlag: null, resolvedBy: null },
  { id: "IS-03", category: "Income Statement", description: "Expense ratios within prospectus caps (net of waivers)", status: "Fail", value: "Exceeds cap by 2 bps", formula: "SOO.NetExpenseRatio <= Prospectus.ExpenseCap", source1: 0.0077, source2: 0.0075, aiFlag: "pop_fail", aiNote: "Cap exceeded for 2 consecutive periods.", resolvedBy: null },

  // ─── Form N-PORT (SEC Regulatory) ───
  { id: "NPORT-01", category: "Form N-PORT", description: "Part B: Fund Net Assets matches GAAP SOA", status: "Pass", value: "$0.00 variance", formula: "NPORT.Item19 - SOA.NetAssets = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "NPORT-02", category: "Form N-PORT", description: "Part C: Sum of position values equals Total Investments", status: "Fail", value: "$120,000 variance", formula: "SUM(NPORT.Item14.Value) - NPORT.Item18 = 0", source1: 462578500, source2: 462698500, aiFlag: null, resolvedBy: null },
  { id: "NPORT-03", category: "Form N-PORT", description: "Part C: All non-exempt counterparties have LEI", status: "Fail", value: "2 Missing LEIs", formula: "COUNT(NPORT.Item11.LEI IS NULL) = 0", source1: 2, source2: 0, aiFlag: "multi_fund", aiNote: "Deutsche Bank AG LEI missing across all Derry funds.", resolvedBy: null },
  { id: "NPORT-04", category: "Form N-PORT", description: "Part D: Liquidity buckets sum to 100% of Net Assets", status: "Pass", value: "0.00% variance", formula: "SUM(NPORT.LiquidityPct) - 100.0 = 0", source1: 100.0, source2: 100.0, aiFlag: null, resolvedBy: null },

  // ─── Form PF (Alt Regulatory) ───
  { id: "PF-01", category: "Form PF", description: "Gross Asset Value (GAV) reconciliation", status: "Pass", value: "$0.00 variance", formula: "PF.Q8 - (TotalAssets + GrossDerivatives) = 0", source1: 715011000, source2: 715011000, aiFlag: null, resolvedBy: null },
  { id: "PF-02", category: "Form PF", description: "Net Asset Value (NAV) ties to Partners Capital", status: "Pass", value: "$0.00 variance", formula: "PF.Q9 - SOA.NetAssets = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "PF-03", category: "Form PF", description: "Largest Counterparty Exposure > 5% NAV reported", status: "Fail", value: "Exposure Missing", formula: "PF.Q22.Exposure >= (0.05 * PF.Q9)", source1: 0, source2: 35000000, aiFlag: null, resolvedBy: null },
  { id: "PF-04", category: "Form PF", description: "Beneficial Owner breakdown sums to 100%", status: "Pass", value: "0.00% variance", formula: "SUM(PF.Q16.Pct) - 100.0 = 0", source1: 100.0, source2: 100.0, aiFlag: null, resolvedBy: null },

  // ─── Tax & K-1 ───
  { id: "TAX-01", category: "Tax Compliance", description: "Book to Tax Net Income reconciliation", status: "Pass", value: "$0.00 variance", formula: "Tax.NetIncome - (Book.NetIncome + M-1_Adjustments) = 0", source1: 29150420, source2: 29150420, aiFlag: null, resolvedBy: null },
  { id: "TAX-02", category: "Tax Compliance", description: "Sum of LP K-1 Allocations equals Fund Taxable Income", status: "Pass", value: "$0.00 variance", formula: "SUM(K1.OrdinaryIncome) - Tax.OrdinaryIncome = 0", source1: 29150420, source2: 29150420, aiFlag: null, resolvedBy: null },
  { id: "TAX-03", category: "Tax Compliance", description: "Section 988 FX gain/loss character classification", status: "Fail", value: "Character Mismatch", formula: "Tax.Sec988.Character = 'Ordinary'", source1: "Capital", source2: "Ordinary", aiFlag: "multi_fund", aiNote: "Systemic issue: Failing across 3 funds for this client.", resolvedBy: null },
  
  // ─── Form N-MFP (Money Market) ───
  { id: "NMFP-01", category: "Form N-MFP", description: "Shadow NAV deviation within 25bps limit", status: "Accepted", value: "31 bps deviation", formula: "ABS(1.0000 - ShadowNAV) <= 0.0025", source1: 0.0031, source2: 0.0025, aiFlag: null, resolvedBy: "u4", resolvedAt: "Dec 31, 2024 11:30 AM", overrideNote: "Board notified of deviation per Rule 2a-7. Accept flag." },
  { id: "NMFP-02", category: "Form N-MFP", description: "Weighted Average Maturity (WAM) <= 60 days", status: "Pass", value: "42 days", formula: "NMFP.WAM <= 60", source1: 42, source2: 60, aiFlag: null, resolvedBy: null },
  
  // ─── Capital & Cash Flow ───
  { id: "CAP-01", category: "Partners' Capital", description: "Ending Capital = Beginning + Contributions - Withdrawals + P&L", status: "Pass", value: "$0.00 variance", formula: "SCNA.Ending - (SCNA.Beg + NetCap + NetOps) = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "CF-01", category: "Cash Flow", description: "Net increase in cash ties to balance sheet cash accounts", status: "Pass", value: "$0.00 variance", formula: "CFS.NetChange - (SOA.EndingCash - SOA.BeginningCash) = 0", source1: 3948356, source2: 3948356, aiFlag: null, resolvedBy: null },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: CROSS CHECKS TAB (Dashboard Grouping + Focus Mode + Bulk Overrides)
// ═══════════════════════════════════════════════════════════════════════════════
export function CrossChecksTab({ currentUser }) {
  const [checks, setChecks] = useState<any[]>(CROSS_CHECKS_DATA_EXPANDED);
  const [search, setSearch] = useState("");
  
  // High-performance filtering states
  const [hidePassing, setHidePassing] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selected, setSelected] = useState(new Set());
  
  // Drilldown state
  const [activeCheckId, setActiveCheckId] = useState(null);

  // 1. Core Actions
  const toggleSel = (e, id) => { 
    e.stopPropagation(); 
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); 
  };
  
  const handleAccept = (id, note = "Accepted manually by user.") => { 
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status: "Accepted", resolvedBy: currentUser?.id, resolvedAt: new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}), overrideNote: note } : c)); 
  };
  
  const handleBulkAccept = () => { 
    setChecks(prev => prev.map(c => selected.has(c.id) && c.status === "Fail" ? { ...c, status: "Accepted", resolvedBy: currentUser?.id, resolvedAt: new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}), overrideNote: "Bulk accepted by user." } : c)); 
    setSelected(new Set()); 
  };

  // 2. Data Filtering & Grouping
  const filteredChecks = useMemo(() => {
    let res = [...checks];
    if (hidePassing) res = res.filter(c => c.status === "Fail" || c.status === "Accepted");
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(c => c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    return res;
  }, [checks, search, hidePassing]);

  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredChecks.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    // Sort groups so those with failures are at the top
    return Object.entries(groups).sort((a,b) => {
      const failsA = a[1].filter(x => x.status === "Fail").length;
      const failsB = b[1].filter(x => x.status === "Fail").length;
      return failsB - failsA;
    });
  }, [filteredChecks]);

  // 3. Stats Calculation
  const STATS = {
    total: checks.length,
    passed: checks.filter(c=>c.status==="Pass").length,
    failed: checks.filter(c=>c.status==="Fail").length,
    accepted: checks.filter(c=>c.status==="Accepted").length
  };

  // Active check for drilldown pane
  const activeCheck = checks.find(c => c.id === activeCheckId);

  return (
    <div style={{display:"flex", height:"100%", background:T.appBg, overflow:"hidden"}}>
      
      {/* LEFT PANE: Main Board */}
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight: activeCheck ? `1px solid ${T.border}` : "none"}}>
        
        {/* Header & Toolbar */}
        <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
          
          <div style={{display:"flex", gap:12, alignItems:"center", flex:1, minWidth:400}}>
            <div style={{position:"relative", flex:1, maxWidth: 300}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
              <input type="text" placeholder="Search statements, forms, or IDs..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
            </div>
            
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer", background: hidePassing ? T.errorBg : T.appBg, border:`1px solid ${hidePassing ? T.errorBorder : T.border}`, padding:"6px 12px", borderRadius:6, transition:"all 0.2s"}}>
              <input type="checkbox" checked={hidePassing} onChange={e=>setHidePassing(e.target.checked)} style={{accentColor:T.errorBase, cursor:"pointer"}}/>
              <span style={{...SANS,fontSize:12,color:hidePassing ? T.errorBase : T.textPrimary,fontWeight:700}}>Focus Mode (Hide Passed)</span>
            </label>
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
              <span style={{...MONO,fontSize:14,fontWeight:700,color:T.errorBase}}>{STATS.failed}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:T.errorBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Failed</span>
            </div>
            <div style={{background:T.warnBg,border:`1px solid ${T.warnBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
              <span style={{...MONO,fontSize:14,fontWeight:700,color:T.warnBase}}>{STATS.accepted}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:T.warnBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Overrides</span>
            </div>
            <div style={{background:T.okBg,border:`1px solid ${T.okBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
              <span style={{...MONO,fontSize:14,fontWeight:700,color:T.okBase}}>{STATS.passed}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:T.okBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Passed</span>
            </div>
            <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
            <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span>↓</span> Export Matrix
            </button>
          </div>
        </div>

        {/* Scrollable Groups */}
        <div style={{flex:1, overflowY:"auto", padding:"20px 24px", paddingBottom: selected.size > 0 ? 80 : 24}}>
          {groupedData.length === 0 ? (
            <div style={{textAlign:"center", padding:"60px", color:T.textMuted, ...SANS, fontSize:14}}>No checks match your current filters.</div>
          ) : (
            groupedData.map(([category, catChecks]) => {
              const isOpen = !collapsedGroups[category];
              const fails = catChecks.filter(c => c.status === "Fail").length;
              const isError = fails > 0;

              return (
                <div key={category} style={{border:`1px solid ${isError ? T.errorBorder : T.border}`, borderRadius:10, marginBottom:16, background:T.cardBg, overflow:"hidden", boxShadow: isError ? "0 2px 8px rgba(185,28,28,0.05)" : "none"}}>
                  
                  {/* Category Header */}
                  <div onClick={()=>setCollapsedGroups(p=>({...p,[category]:!p[category]}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:isError ? T.errorBg : T.appBg,borderBottom:isOpen?`1px solid ${isError ? T.errorBorder : T.border}`:"none",cursor:"pointer"}}>
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      <span style={{color:isError ? T.errorBase : T.textMuted, fontSize:12, width:16, textAlign:"center"}}>{isOpen?"▼":"▶"}</span>
                      <div style={{...SANS,fontWeight:700,fontSize:14,color:isError ? T.errorBase : T.textPrimary}}>{category}</div>
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      {fails > 0 && <span style={{...SANS, fontSize:10, fontWeight:700, background:T.errorBase, color:"#fff", padding:"2px 8px", borderRadius:4}}> {fails} FAILURES </span>}
                      <span style={{...SANS,fontSize:11,color:T.textMuted}}>{catChecks.length} rules run</span>
                    </div>
                  </div>

                  {/* Expanded Table */}
                  {isOpen && (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                        <thead>
                          <tr style={{background:"#f8fafc", borderBottom:`1px solid ${T.border}`}}>
                            <th style={{width:40, padding:"8px 12px"}}></th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"12%"}}>Check ID</th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"45%"}}>Rule Description</th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"15%"}}>Variance</th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"15%"}}>Status</th>
                            <th style={{padding:"8px 12px", width:"8%"}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {catChecks.map(c => {
                            const isSel = selected.has(c.id);
                            const isActive = activeCheckId === c.id;
                            const statColor = c.status === "Pass" ? T.okBase : c.status === "Fail" ? T.errorBase : T.warnBase;
                            const statBg = c.status === "Pass" ? T.okBg : c.status === "Fail" ? T.errorBg : T.warnBg;
                            const statBd = c.status === "Pass" ? T.okBorder : c.status === "Fail" ? T.errorBorder : T.warnBorder;

                            return (
                              <tr key={`${c.id}-${c.category}`} onClick={()=>setActiveCheckId(c.id)} className="row-hover" style={{borderBottom:`1px solid ${T.border}`, background: isActive ? "#eff6ff" : isSel ? "#f8fafc" : "transparent", cursor:"pointer"}}>
                                <td style={{padding:"10px 12px"}} onClick={(e)=>toggleSel(e, c.id)}>
                                  <input type="checkbox" checked={isSel} onChange={()=>{}} style={{cursor:"pointer", width:15, height:15, accentColor:T.actionBase}} />
                                </td>
                                <td style={{padding:"10px 12px", ...MONO, fontWeight:700, color:T.textPrimary, fontSize:12}}>{c.id}</td>
                                <td style={{padding:"10px 12px"}}>
                                  <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary, marginBottom:4}}>{c.description}</div>
                                  {c.aiFlag && (
                                    <div style={{display:"inline-flex", alignItems:"center", gap:4, background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:4, padding:"2px 6px"}}>
                                      <span style={{...MONO, fontSize:9, fontWeight:700, color:T.aiBase}}>✦ AI</span>
                                      <span style={{...SANS, fontSize:10, color:T.aiDark}}>{c.aiNote}</span>
                                    </div>
                                  )}
                                </td>
                                <td style={{padding:"10px 12px"}}>
                                  <span style={{...MONO, fontSize:11, color: c.status==="Pass" ? T.textMuted : T.textPrimary, background: c.status==="Fail" ? T.errorBg : T.appBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${c.status==="Fail" ? T.errorBorder : T.border}`}}>{c.value}</span>
                                </td>
                                <td style={{padding:"10px 12px"}}>
                                  <span style={{...SANS, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:4, background:statBg, color:statColor, border:`1px solid ${statBd}`, display:"inline-flex", alignItems:"center", gap:4}}>
                                    {c.status==="Pass"?"✓":c.status==="Fail"?"✕":"👁"} {c.status}
                                  </span>
                                </td>
                                <td style={{padding:"10px 12px", textAlign:"right"}}>
                                  <span style={{color:T.actionBase, fontSize:16}}>›</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Floating Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="slide-in" style={{position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:500,background:T.navyHeader,borderRadius:8,padding:"10px 16px",display:"flex",alignItems:"center",gap:16, boxShadow:"0 10px 25px rgba(0,0,0,0.3)"}}>
            <div style={{...SANS,fontSize:13,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span style={{background:T.actionBase,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{selected.size}</span>
              checks selected
            </div>
            <div style={{width:1,height:20,background:"#374151"}}/>
            <button onClick={handleBulkAccept} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:5,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer"}}>Accept All Overrides</button>
            <button onClick={()=>setSelected(new Set())} style={{marginLeft:8,background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:18}}>✕</button>
          </div>
        )}
      </div>

      {/* RIGHT PANE: Drilldown Detail */}
      {activeCheck && (
        <div className="slide-in" style={{width:420, background:T.cardBg, display:"flex", flexDirection:"column", flexShrink:0, boxShadow:"-4px 0 15px rgba(0,0,0,0.03)"}}>
          <div style={{padding:"16px 20px", background:T.appBg, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
                <span style={{...MONO, fontSize:12, fontWeight:700, color:T.textMuted}}>{activeCheck.id}</span>
                <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:activeCheck.status==="Pass"?T.okBg:activeCheck.status==="Fail"?T.errorBg:T.warnBg, color:activeCheck.status==="Pass"?T.okBase:activeCheck.status==="Fail"?T.errorBase:T.warnBase, border:`1px solid ${activeCheck.status==="Pass"?T.okBorder:activeCheck.status==="Fail"?T.errorBorder:T.warnBorder}`}}>
                  {activeCheck.status}
                </span>
              </div>
              <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, lineHeight:1.3}}>{activeCheck.description}</div>
            </div>
            <button onClick={()=>setActiveCheckId(null)} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20}}>✕</button>
          </div>
          
          <div style={{padding:"20px", overflowY:"auto", flex:1}}>
            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>Validation Formula</div>
            <div style={{background:T.navyHeader, color:"#a5f3fc", padding:"12px 16px", borderRadius:8, ...MONO, fontSize:12, lineHeight:1.5, marginBottom:24, boxShadow:"inset 0 2px 4px rgba(0,0,0,0.2)"}}>
              {activeCheck.formula}
            </div>

            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>Values at Runtime</div>
            <div style={{background:T.appBg, border:`1px solid ${T.border}`, borderRadius:8, padding:"16px", marginBottom:24}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:12, borderBottom:`1px dotted ${T.border}`, paddingBottom:8}}>
                <span style={{...SANS, fontSize:13, color:T.textMuted}}>Source 1 Calculated</span>
                <span style={{...MONO, fontSize:13, fontWeight:600, color:T.textPrimary}}>{typeof activeCheck.source1 === 'number' ? fmtUSD(activeCheck.source1) : activeCheck.source1}</span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:12, borderBottom:`1px dotted ${T.border}`, paddingBottom:8}}>
                <span style={{...SANS, fontSize:13, color:T.textMuted}}>Source 2 Calculated</span>
                <span style={{...MONO, fontSize:13, fontWeight:600, color:T.textPrimary}}>{typeof activeCheck.source2 === 'number' ? fmtUSD(activeCheck.source2) : activeCheck.source2}</span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary}}>Total Variance</span>
                <span style={{...MONO, fontSize:14, fontWeight:700, color:activeCheck.status === "Fail" ? T.errorBase : T.textPrimary}}>{activeCheck.value}</span>
              </div>
            </div>

            {/* AI Context Block */}
            {activeCheck.aiFlag && (
              <div style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"16px", marginBottom:24}}>
                <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:8}}>
                  <span style={{...MONO, fontSize:10, fontWeight:700, color:T.aiBase}}>✦ AI ROOT CAUSE ANALYSIS</span>
                </div>
                <div style={{...SANS, fontSize:12, color:T.aiDark, lineHeight:1.5}}>
                  {activeCheck.aiNote}
                </div>
              </div>
            )}

            {/* Audit Trail / Resolution Block */}
            {activeCheck.status === "Accepted" ? (
              <div style={{border:`1px solid ${T.warnBorder}`, borderRadius:8, overflow:"hidden"}}>
                <div style={{background:T.warnBg, padding:"10px 16px", borderBottom:`1px solid ${T.warnBorder}`, display:"flex", alignItems:"center", gap:8}}>
                  <span>👁</span>
                  <span style={{...SANS, fontSize:12, fontWeight:700, color:T.warnBase}}>Accepted Override Active</span>
                </div>
                <div style={{padding:"16px", background:T.cardBg}}>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:4}}>Resolved By</div>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16}}>
                    {/* Render the actual user if they match the DB, else generic */}
                    <Avatar user={TEAM.find(m => m.id === activeCheck.resolvedBy) || TEAM[0]} size={24} />
                    <div style={{...SANS, fontSize:13, fontWeight:600}}>{TEAM.find(m => m.id === activeCheck.resolvedBy)?.name || "System User"}</div>
                  </div>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:4}}>Timestamp</div>
                  <div style={{...MONO, fontSize:12, color:T.textPrimary, marginBottom:16}}>{activeCheck.resolvedAt}</div>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:4}}>Justification</div>
                  <div style={{...SANS, fontSize:13, color:T.textPrimary, background:T.appBg, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`}}>{activeCheck.overrideNote}</div>
                </div>
              </div>
            ) : activeCheck.status === "Fail" ? (
              <div>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>Resolution Required</div>
                <textarea placeholder="Enter justification for overriding this check..." style={{...SANS, width:"100%", padding:"12px", borderRadius:8, border:`1px solid ${T.border}`, fontSize:13, minHeight:100, resize:"vertical", marginBottom:12}} id={`note-${activeCheck.id}`}></textarea>
                <button onClick={() => {
                  const note = (document.getElementById(`note-${activeCheck.id}`) as HTMLTextAreaElement)?.value || "Accepted manually.";
                  handleAccept(activeCheck.id, note);
                }} style={{...SANS, width:"100%", padding:"12px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                  <span>✓</span> Accept as is (Override)
                </button>
              </div>
            ) : null}

          </div>
        </div>
      )}
    </div>
  );
}

