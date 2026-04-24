import React, { useState, useEffect, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { JOURNALS } from '../../data/feeds/gl';
import { TEAM } from '../../data/team';
import { fmtUSD } from '../../utils/formatters';
import { FieldLabel } from '../primitives/Card';
import type { FundSeed, TeamMember } from '../../types';

export function JournalEntriesTab({ fund, fundSeeds, masterFeeds, currentUser, onPostJE }) {
  const [entries, setEntries] = useState<any[]>([
    { id: "je-1", date: "2024-12-31", ref: "ACCR-101", desc: "Global Audit Fee True-up", status: "draft", lines: [
      { fundId: fund.fund_id, acct: "5060", name: "Professional Fees", debit: 15000, credit: 0 },
      { fundId: fund.fund_id, acct: "2050", name: "Audit & Tax Fee Payable", debit: 0, credit: 15000 }
    ], createdBy: "u1", mode: "standard" }
  ]);
  
  const [activeJe, setActiveJe] = useState<any>(null);

  const [newLines, setNewLines] = useState([
    { id: 1, fundId: fund.fund_id, acct: "", name: "", debit: "", credit: "", ending: "", current: 0 },
    { id: 2, fundId: fund.fund_id, acct: "", name: "", debit: "", credit: "", ending: "", current: 0 },
  ]);
  const [jeDesc, setJeDesc] = useState("");
  const [jeRef, setJeRef] = useState("");
  const [jeUnbalancedMemo, setJeUnbalancedMemo] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (!fund || e.detail.fundId !== fund.fund_id) return;
      setEntries(prev => [e.detail.je, ...prev]);
    };
    window.addEventListener("je-auto-posted", handler);
    return () => window.removeEventListener("je-auto-posted", handler);
  }, [fund]);

  // Extract unique accounts from the GL for the combobox
  const availableAccounts = useMemo(() => {
    const accts = new Map();
    masterFeeds.gl_001.forEach(r => {
      if (!accts.has(r.acct)) accts.set(r.acct, { acct: r.acct, name: r.name, bal: r.debit - r.credit });
    });
    return Array.from(accts.values()).sort((a,b) => a.acct.localeCompare(b.acct));
  }, [masterFeeds]);

  const totalDebit  = newLines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
  const totalCredit = newLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced  = (totalDebit > 0 || totalCredit > 0) && Math.abs(totalDebit - totalCredit) < 0.01;
  const hasLines    = newLines.some(l => l.acct);
  const canSubmit   = hasLines && (isBalanced || jeUnbalancedMemo.trim() !== "");
  const isPreparer  = !currentUser.isController;

  const handleAddLine = () => setNewLines(prev => [
    ...prev,
    { id: Date.now(), fundId: fund.fund_id, acct: "", name: "", debit: "", credit: "", ending: "", current: 0 },
  ]);

  const updateLine = (lineId, field, val) => {
    setNewLines(prev => prev.map(l => {
      if (l.id !== lineId) return l;
      let u = { ...l, [field]: val };

      if (field === "acct") {
        const found = availableAccounts.find(a => a.acct === val);
        u.name    = found ? found.name : "";
        u.current = found ? found.bal  : 0;
        const dr = Number(u.debit) || 0;
        const cr = Number(u.credit) || 0;
        if (dr || cr) u.ending = String((u.current + dr - cr).toFixed(2));
      }

      if (field === "debit" || field === "credit") {
        const dr = Number(field === "debit"   ? val : u.debit)  || 0;
        const cr = Number(field === "credit"  ? val : u.credit) || 0;
        u.ending = String(((Number(u.current) || 0) + dr - cr).toFixed(2));
      }

      if (field === "ending") {
        const endVal = Number(val);
        if (!isNaN(endVal) && val !== "") {
          const diff = endVal - (Number(u.current) || 0);
          if (diff > 0)       { u.debit = String(diff.toFixed(2));            u.credit = ""; }
          else if (diff < 0)  { u.credit = String(Math.abs(diff).toFixed(2)); u.debit  = ""; }
          else                { u.debit  = ""; u.credit = ""; }
        }
      }

      return u;
    }));
  };

  const handleApproveJE = (id: string) => { setEntries(prev => prev.map((e: any) => e.id === id ? { ...e, status: "approved" } : e)); };

  const handleSubmitJE = () => {
    if (!canSubmit) return;
    const newJe = {
      id: `je-${Date.now()}`, date: "2024-12-31",
      ref: jeRef || `JE-${Math.floor(Math.random()*1000)}`,
      desc: jeDesc, status: "pending_review", mode: "standard",
      lines: newLines.filter(l => l.acct).map(l => ({
        fundId: l.fundId, acct: l.acct, name: l.name,
        debit: Number(l.debit) || 0, credit: Number(l.credit) || 0,
        current: Number(l.current) || 0,
      })),
      createdBy: currentUser.id,
      unbalancedMemo: isBalanced ? "" : jeUnbalancedMemo.trim(),
    };
    setEntries([newJe, ...entries]);
    setNewLines([
      { id: 1, fundId: fund.fund_id, acct: "", name: "", debit: "", credit: "", ending: "", current: 0 },
      { id: 2, fundId: fund.fund_id, acct: "", name: "", debit: "", credit: "", ending: "", current: 0 },
    ]);
    setJeDesc(""); setJeRef(""); setJeUnbalancedMemo("");
  };

  return (
    <div style={{display:"flex", height:"100%", overflow:"hidden", background:T.appBg}}>
      {/* Left Sidebar: JE Ledger */}
      <div style={{width: 340, background:T.cardBg, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", height:"100%"}}>
        <div style={{padding:"16px", borderBottom:`1px solid ${T.border}`}}>
          <div style={{...SANS, fontWeight:700, fontSize:15, color:T.textPrimary}}>Ledger Adjustments</div>
          <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:2}}>Maker / Checker Workflow</div>
        </div>
        <div style={{overflowY:"auto", flex:1, padding:16}}>
          {entries.map(je => (
            <div key={je.id} onClick={() => setActiveJe(je)} style={{padding:"14px", border:`1px solid ${activeJe?.id === je.id ? T.actionBase : T.border}`, borderRadius:8, marginBottom:12, background:activeJe?.id === je.id ? "#eff6ff" : T.cardBg, cursor:"pointer", transition:"all 0.15s", boxShadow: activeJe?.id === je.id ? "0 2px 8px rgba(79,70,229,0.1)" : "none"}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                <span style={{...MONO, fontSize:12, fontWeight:700, color:T.textPrimary}}>{je.ref}</span>
                <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, background: je.status==="posted"?T.okBg:je.status==="pending_review"?T.warnBg:T.appBg, color:je.status==="posted"?T.okBase:je.status==="pending_review"?T.warnBase:T.textMuted}}>{je.status === "pending_review" ? "Review" : je.status}</span>
              </div>
              <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary, marginBottom:8, lineHeight:1.4}}>{je.desc}</div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{...SANS, fontSize:11, color:T.textMuted}}>By: {TEAM.find(m=>m.id===je.createdBy)?.name}</span>
                {je.mode === "target_balance" && <span style={{...MONO, fontSize:9, fontWeight:700, background:T.aiBg, color:T.aiBase, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.aiBorder}`}}>TARGET BAL</span>}
                {je.mode === "exception_auto" && (
                  <span style={{
                    ...MONO, fontSize: 8, fontWeight: 700, padding: "1px 5px",
                    borderRadius: 3, background: T.aiBg, color: T.aiBase,
                    border: `1px solid ${T.aiBorder}`,
                  }}>
                    AUTO · EXC
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Drafting & Review */}
      <div style={{flex:1, padding:"24px 32px", overflowY:"auto", height:"100%"}}>
        {activeJe ? (
          /* ── JE Detail View ── */
          <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 4px 12px rgba(0,0,0,0.03)", width:"100%"}}>
            <div style={{background:T.navyHeader, padding:"16px 24px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{display:"flex", alignItems:"center", gap:14}}>
                <button onClick={()=>setActiveJe(null)} style={{...SANS, fontSize:11, fontWeight:600, padding:"4px 12px", border:"1px solid rgba(255,255,255,0.3)", borderRadius:5, background:"rgba(255,255,255,0.1)", color:"#fff", cursor:"pointer"}}>← New Entry</button>
                <span style={{...MONO, fontSize:15, fontWeight:700}}>{activeJe.ref}</span>
                {activeJe.mode === "exception_auto" && <span style={{...MONO, fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:3, background:T.aiBg, color:T.aiBase, border:`1px solid ${T.aiBorder}`}}>AUTO · EXC</span>}
              </div>
              <span style={{...SANS, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:4, background:activeJe.status==="posted"?T.okBg:activeJe.status==="pending_review"?T.warnBg:T.appBg, color:activeJe.status==="posted"?T.okBase:activeJe.status==="pending_review"?T.warnBase:T.textMuted}}>
                {activeJe.status === "pending_review" ? "PENDING REVIEW" : activeJe.status.toUpperCase()}
              </span>
            </div>
            <div style={{padding:24}}>
              <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, marginBottom:16}}>{activeJe.desc}</div>
              <div style={{display:"flex", gap:32, marginBottom:24, paddingBottom:16, borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4}}>Date</div>
                  <div style={{...MONO, fontSize:13, color:T.textPrimary}}>{activeJe.date}</div>
                </div>
                <div>
                  <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4}}>Created By</div>
                  <div style={{...SANS, fontSize:13, color:T.textPrimary}}>{TEAM.find(m=>m.id===activeJe.createdBy)?.name || "System"}</div>
                </div>
                <div>
                  <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:4}}>Mode</div>
                  <div style={{...SANS, fontSize:13, color:T.textPrimary}}>{activeJe.mode === "exception_auto" ? "Exception Auto-Post" : activeJe.mode === "target_balance" ? "Target Balance" : "Standard"}</div>
                </div>
              </div>

              {activeJe.mode === "exception_auto" && activeJe.currentValue && (
                <div style={{background:T.warnBg, border:`1px solid ${T.warnBorder}`, borderRadius:8, padding:16, marginBottom:24}}>
                  <div style={{...SANS, fontSize:11, fontWeight:700, color:T.warnBase, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12}}>
                    Account Impact — {activeJe.account_name || activeJe.lines[0]?.acct}
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:12}}>
                    <div style={{flex:1, background:T.errorBg, border:`1px solid ${T.errorBorder}`, borderRadius:6, padding:"10px 14px"}}>
                      <div style={{...SANS, fontSize:10, fontWeight:700, color:T.errorBase, marginBottom:4}}>BEFORE</div>
                      <div style={{...MONO, fontSize:15, fontWeight:700, color:T.errorBase}}>{activeJe.currentValue}</div>
                    </div>
                    <div style={{...SANS, fontSize:20, color:T.textMuted, flexShrink:0}}>→</div>
                    <div style={{flex:1, background:T.okBg, border:`1px solid ${T.okBorder}`, borderRadius:6, padding:"10px 14px"}}>
                      <div style={{...SANS, fontSize:10, fontWeight:700, color:T.okBase, marginBottom:4}}>AFTER</div>
                      <div style={{...MONO, fontSize:15, fontWeight:700, color:T.okBase}}>{activeJe.expectedValue}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10}}>Journal Lines</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:`2px solid ${T.border}`}}>
                      <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"left",  paddingBottom:8, textTransform:"uppercase", width:"16%"}}>Fund</th>
                      <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"left",  paddingBottom:8, textTransform:"uppercase"}}>Account</th>
                      <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:8, textTransform:"uppercase", width:"14%"}}>Current Bal</th>
                      <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:8, textTransform:"uppercase", width:"13%"}}>Debit</th>
                      <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:8, textTransform:"uppercase", width:"13%"}}>Credit</th>
                      <th style={{...SANS, fontSize:11, fontWeight:700, color:T.actionBase, textAlign:"right", paddingBottom:8, textTransform:"uppercase", width:"14%"}}>Ending Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeJe.lines.map((line, i) => {
                      const cur = Number(line.current) || null;
                      const ending = cur != null ? cur + (Number(line.debit)||0) - (Number(line.credit)||0) : null;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${T.appBg}`}}>
                          <td style={{...MONO, fontSize:12, padding:"10px 8px 10px 0", color:T.textPrimary}}>{line.fundId}</td>
                          <td style={{...MONO, fontSize:12, padding:"10px 8px", color:T.textPrimary}}>{line.acct}{line.name ? ` — ${line.name}` : ""}</td>
                          <td style={{...MONO, fontSize:12, padding:"10px 8px", textAlign:"right", color:T.textMuted}}>{cur != null ? fmtUSD(cur) : "—"}</td>
                          <td style={{...MONO, fontSize:12, padding:"10px 8px", textAlign:"right", color:line.debit>0?T.textPrimary:T.textMuted}}>{line.debit>0?fmtUSD(line.debit):"—"}</td>
                          <td style={{...MONO, fontSize:12, padding:"10px 8px", textAlign:"right", color:line.credit>0?T.textPrimary:T.textMuted}}>{line.credit>0?fmtUSD(line.credit):"—"}</td>
                          <td style={{...MONO, fontSize:12, padding:"10px 0 10px 8px", textAlign:"right", fontWeight:700, color:ending==null?T.textMuted:ending<0?T.errorBase:T.okBase}}>{ending!=null?fmtUSD(ending):"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {activeJe.unbalancedMemo && (
                <div style={{marginTop:16, padding:"12px 16px", background:T.warnBg, border:`1px solid ${T.warnBorder}`, borderRadius:6}}>
                  <div style={{...SANS, fontSize:10, fontWeight:700, color:T.warnBase, textTransform:"uppercase", marginBottom:4}}>Unbalanced Entry — Reason</div>
                  <div style={{...SANS, fontSize:13, color:T.warnBase}}>{activeJe.unbalancedMemo}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Draft New JE Form ── */
          <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 4px 12px rgba(0,0,0,0.03)", width:"100%"}}>
          <div style={{background:T.navyHeader, padding:"16px 24px", color:"#fff"}}>
            <div style={{...SANS, fontWeight:700, fontSize:16}}>New Journal Entry</div>
            <div style={{...SANS, fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:3}}>Enter DR/CR or type an ending balance — the other side fills automatically</div>
          </div>

          <div style={{padding:24}}>
            <div style={{display:"flex", gap:20, marginBottom:24}}>
              <div style={{flex:2}}>
                <FieldLabel>Description</FieldLabel>
                <input type="text" value={jeDesc} onChange={e=>setJeDesc(e.target.value)} placeholder="e.g., Cross-fund year-end fee true-up" style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}} />
              </div>
              <div style={{flex:1}}>
                <FieldLabel>Reference (Optional)</FieldLabel>
                <input type="text" value={jeRef} onChange={e=>setJeRef(e.target.value)} placeholder="JE-XXX" style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}} />
              </div>
            </div>

            <div style={{overflowX:"auto", width:"100%"}}>
              <table style={{width:"100%", borderCollapse:"collapse", marginBottom:8, minWidth:900}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${T.border}`}}>
                    <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"left",  paddingBottom:10, textTransform:"uppercase", width:"15%"}}>Fund</th>
                    <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"left",  paddingBottom:10, textTransform:"uppercase", width:"28%"}}>Account</th>
                    <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:"13%"}}>Current Bal</th>
                    <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:"13%"}}>Debit</th>
                    <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:"13%"}}>Credit</th>
                    <th style={{...SANS, fontSize:11, fontWeight:700, color:T.actionBase, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:"13%"}}>Ending Bal</th>
                    <th style={{width:"5%"}}></th>
                  </tr>
                </thead>
                <tbody>
                  {newLines.map(line => {
                    const endingNum = Number(line.ending);
                    const endingColor = line.ending === "" ? T.textMuted : endingNum < 0 ? T.errorBase : T.okBase;
                    return (
                      <tr key={line.id} style={{borderBottom:`1px solid ${T.appBg}`}}>
                        <td style={{padding:"6px 4px 6px 0"}}>
                          <select value={line.fundId} onChange={e=>updateLine(line.id,"fundId",e.target.value)} style={{...SANS, width:"100%", padding:"7px 6px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, background:"#fff"}}>
                            {fundSeeds.map(f => <option key={f.fund_id} value={f.fund_id}>{f.fund_id}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"6px 4px"}}>
                          <select value={line.acct} onChange={e=>updateLine(line.id,"acct",e.target.value)} style={{...MONO, width:"100%", padding:"7px 6px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:11, background:"#fff"}}>
                            <option value="">-- Select Account --</option>
                            {availableAccounts.map(a => <option key={a.acct} value={a.acct}>{a.acct} — {a.name}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"6px 4px", textAlign:"right"}}>
                          <span style={{...MONO, fontSize:12, color:T.textMuted}}>{line.acct ? fmtUSD(line.current) : "—"}</span>
                        </td>
                        <td style={{padding:"6px 4px"}}>
                          <input type="number" value={line.debit} onChange={e=>updateLine(line.id,"debit",e.target.value)} placeholder="0.00" style={{...MONO, width:"100%", padding:"7px 6px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, textAlign:"right", background:"#fff"}} />
                        </td>
                        <td style={{padding:"6px 4px"}}>
                          <input type="number" value={line.credit} onChange={e=>updateLine(line.id,"credit",e.target.value)} placeholder="0.00" style={{...MONO, width:"100%", padding:"7px 6px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, textAlign:"right", background:"#fff"}} />
                        </td>
                        <td style={{padding:"6px 4px"}}>
                          <input type="number" value={line.ending} onChange={e=>updateLine(line.id,"ending",e.target.value)} placeholder="—" style={{...MONO, width:"100%", padding:"7px 6px", border:`1px solid ${T.actionBase}`, borderRadius:4, fontSize:12, textAlign:"right", background:T.actionBg, color:endingColor, fontWeight:line.ending !== "" ? 700 : 400}} />
                        </td>
                        <td style={{padding:"6px 0 6px 4px", textAlign:"center"}}>
                          {newLines.length > 2 && (
                            <button onClick={()=>setNewLines(p=>p.filter(x=>x.id!==line.id))} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:16, lineHeight:1, padding:"2px 4px"}} title="Remove line">×</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button onClick={handleAddLine} style={{...SANS, fontSize:12, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer", marginBottom:20, padding:"4px 8px", borderRadius:4}} onMouseEnter={e=>e.currentTarget.style.background=T.actionBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              + Add Line
            </button>

            {hasLines && !isBalanced && (
              <div style={{marginBottom:16}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.warnBase, marginBottom:6}}>
                  OUT OF BALANCE BY {fmtUSD(Math.abs(totalDebit - totalCredit))} — provide a reason to post anyway
                </div>
                <textarea value={jeUnbalancedMemo} onChange={e=>setJeUnbalancedMemo(e.target.value)} placeholder="Reason for posting an unbalanced entry…" rows={2} style={{...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.warnBorder}`, background:T.warnBg, fontSize:13, color:T.warnBase, resize:"vertical", boxSizing:"border-box"}} />
              </div>
            )}

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:isBalanced?T.okBg:canSubmit?T.warnBg:T.appBg, border:`1px solid ${isBalanced?T.okBorder:canSubmit?T.warnBorder:T.border}`, borderRadius:8, transition:"all 0.3s"}}>
              <div style={{display:"flex", gap:32}}>
                <div style={{...MONO, fontSize:16, fontWeight:700, color:T.textPrimary}}>DR: {fmtUSD(totalDebit)}</div>
                <div style={{...MONO, fontSize:16, fontWeight:700, color:T.textPrimary}}>CR: {fmtUSD(totalCredit)}</div>
              </div>
              <button disabled={!canSubmit} onClick={handleSubmitJE} style={{...SANS, fontSize:14, fontWeight:700, padding:"12px 24px", borderRadius:6, border:"none", background:canSubmit?(isBalanced?T.actionBase:T.warnBase):T.border, color:canSubmit?"#fff":T.textMuted, cursor:canSubmit?"pointer":"not-allowed", transition:"all 0.2s", boxShadow:canSubmit?"0 4px 12px rgba(79,70,229,0.2)":"none"}}>
                {isBalanced ? "Submit for Review" : "Post Unbalanced Entry"}
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Checker Review View */}
        {activeJe && activeJe.status === "pending_review" && !isPreparer && (
          <div className="slide-in" style={{marginTop:24, background:T.warnBg, border:`1px solid ${T.warnBorder}`, borderRadius:10, padding:"20px", maxWidth:1000, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={{...SANS, fontSize:15, fontWeight:700, color:T.warnBase, marginBottom:4}}>Controller Review Required</div>
              <div style={{...SANS, fontSize:12, color:T.warnBase, opacity:0.8}}>This journal entry balances and has passed schema validation.</div>
            </div>
            <button onClick={() => handleApproveJE(activeJe.id)} style={{...SANS, fontSize:14, fontWeight:700, padding:"12px 24px", borderRadius:6, border:"none", background:T.okBase, color:"#fff", cursor:"pointer", boxShadow:"0 2px 8px rgba(15,118,110,0.2)"}}>
              ✓ Approve & Post to Ledger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

