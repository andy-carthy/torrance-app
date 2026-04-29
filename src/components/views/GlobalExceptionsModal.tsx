import React, { useState, useEffect, useRef, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { RESOLUTIONS } from '../../data/exceptions';
import { AI_SUGGESTIONS } from '../../data/aiData';
import { Badge } from '../primitives/Badge';
import { Avatar } from '../primitives/Avatar';
import { SlaPill } from '../primitives/Pills';
import { fmtUSD, fmtCompact } from '../../utils/formatters';
import type { FundSeed, Exception } from '../../types';

export function FundExceptionDetailPane({ fundDetail, activeFundRow, onClose, onSingleResolve, onSelectFundFromGlobal }) {
  const { fund, exc } = fundDetail;
  const resOptions = RESOLUTIONS[exc.severity] || RESOLUTIONS.error;
  const aiSugg = AI_SUGGESTIONS[exc.id];
  const [localRes, setLocalRes] = useState("");
  const [localOv, setLocalOv] = useState("");
  const [localResolving, setLocalResolving] = useState(false);
  const [localResolved, setLocalResolved] = useState(exc.status === "resolved");

  useEffect(() => {
    setLocalRes("");
    setLocalOv("");
    setLocalResolving(false);
    setLocalResolved(exc.status === "resolved");
  }, [exc.id, exc.status]);

  const handleLocalResolve = () => {
    if (!localRes) return;
    setLocalResolving(true);
    setTimeout(() => {
      if (onSingleResolve) onSingleResolve(activeFundRow.fid, activeFundRow.excId, localRes, localOv);
      setLocalResolving(false);
      setLocalResolved(true);
    }, 700);
  };

  const isResolved = exc.status === "resolved" || localResolved;

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%", overflow:"hidden"}}>
      {/* Pane header */}
      <div style={{padding:"12px 16px", background:T.appBg, borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
          <div style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {fund?.name}
          </div>
          <button onClick={onClose} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:16, flexShrink:0}}>✕</button>
        </div>
        <div style={{...MONO, fontSize:10, color:T.textMuted}}>{fund?.fund_id} · {fund?.client}</div>
        <div style={{display:"flex", gap:8, marginTop:8, flexWrap:"wrap"}}>
          <SlaPill daysLeft={fund?.sla_days ?? 3}/>
          <span style={{
            ...SANS, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
            background: isResolved ? T.okBg : exc.severity === "error" ? T.errorBg : T.warnBg,
            color: isResolved ? T.okBase : exc.severity === "error" ? T.errorBase : T.warnBase,
            border: `1px solid ${isResolved ? T.okBorder : exc.severity === "error" ? T.errorBorder : T.warnBorder}`,
          }}>
            {isResolved ? "✓ Resolved" : exc.severity === "error" ? "ERROR" : "WARN"}
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{flex:1, overflowY:"auto", padding:"16px"}}>

        {/* AI suggestion banner */}
        {aiSugg && !isResolved && (
          <div style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"12px 14px", marginBottom:14}}>
            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.aiBase, marginBottom:6, display:"flex", alignItems:"center", gap:6}}>
              <span>✦</span> AI Suggestion · {aiSugg.confidence}% confidence
            </div>
            <div style={{...SANS, fontSize:12, color:T.aiDark, lineHeight:1.5, marginBottom:10}}>
              {aiSugg.summary}
            </div>
            <button
              onClick={() => { setLocalRes(aiSugg.resolution); setLocalOv(aiSugg.overrideValue || ""); }}
              style={{...SANS, fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:5, border:"none", background:T.aiBase, color:"#fff", cursor:"pointer"}}
            >
              ✦ Apply AI Suggestion
            </button>
          </div>
        )}

        {/* Exception context grid */}
        <div style={{background:T.appBg, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", marginBottom:14}}>
          <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10}}>Exception Context</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            {[
              ["Current Value", exc.currentValue, "error"],
              ["Expected Value", exc.expectedValue, "ok"],
              ["Account #", exc.account_number, null],
              ["Account Name", exc.account_name, null],
              ["Share Class", exc.class, null],
              ["Row", exc.row > 0 ? `Row ${exc.row}` : "Global", null],
            ].map(([label, val, type]) => (
              <div key={label}>
                <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:3}}>{label}</div>
                <span style={{
                  ...MONO, fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:4,
                  background: type === "error" ? T.errorBg : type === "ok" ? T.okBg : T.cardBg,
                  color: type === "error" ? T.errorBase : type === "ok" ? T.okBase : T.textPrimary,
                  border: `1px solid ${type === "error" ? T.errorBorder : type === "ok" ? T.okBorder : T.border}`,
                  display:"inline-block",
                }}>{val || "—"}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:10, ...SANS, fontSize:12, color:T.textMuted, lineHeight:1.5, paddingTop:10, borderTop:`1px solid ${T.border}`}}>
            {exc.message}
          </div>
          <div style={{marginTop:8, ...MONO, fontSize:11, fontWeight:700, color:T.errorBase}}>
            {fmtUSD(exc.amount)}
          </div>
        </div>

        {/* Inline resolution */}
        {!isResolved ? (
          <div>
            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:8}}>Resolve This Fund</div>
            <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:12}}>
              {resOptions.map(opt => {
                const sel = localRes === opt.value;
                return (
                  <label key={opt.value} style={{
                    display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px",
                    borderRadius:6, border:`1px solid ${sel ? T.actionBase : T.border}`,
                    background: sel ? T.actionBg : T.cardBg, cursor:"pointer",
                  }}>
                    <input type="radio" name={`local-res-${exc.id}`} value={opt.value} checked={sel} onChange={() => setLocalRes(opt.value)} style={{marginTop:2}}/>
                    <div>
                      <div style={{...SANS, fontSize:12, fontWeight:600, color: sel ? T.actionBase : T.textPrimary}}>
                        {opt.icon} {opt.label}
                      </div>
                      <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:2}}>{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {localRes === "override_value" && (
              <input
                type="text" value={localOv} onChange={e => setLocalOv(e.target.value)}
                placeholder="Override value..."
                style={{...SANS, width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${T.warnBorder}`, fontSize:12, marginBottom:10, boxSizing:"border-box"}}
              />
            )}
            <button
              onClick={handleLocalResolve}
              disabled={!localRes || localResolving}
              style={{
                ...SANS, width:"100%", padding:"10px", borderRadius:6, border:"none",
                background: !localRes ? T.border : T.okBase,
                color: !localRes ? T.textMuted : "#fff",
                fontSize:13, fontWeight:700, cursor: !localRes ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}
            >
              {localResolving ? "Resolving..." : localRes ? "✓ Resolve This Fund" : "Select a resolution"}
            </button>
          </div>
        ) : (
          <div style={{padding:"14px", background:T.okBg, border:`1px solid ${T.okBorder}`, borderRadius:8, textAlign:"center"}}>
            <div style={{...SANS, fontSize:13, fontWeight:700, color:T.okBase}}>✓ Exception Resolved</div>
            <div style={{...SANS, fontSize:11, color:T.okBase, marginTop:4}}>{exc.resolution}</div>
          </div>
        )}

        {/* Open in Fund View */}
        <div style={{marginTop:16, paddingTop:14, borderTop:`1px solid ${T.border}`}}>
          <button
            onClick={() => { if (onSelectFundFromGlobal) onSelectFundFromGlobal(fund); }}
            style={{
              ...SANS, width:"100%", fontSize:12, fontWeight:600,
              padding:"9px 14px", borderRadius:6,
              border:`1px solid ${T.border}`, background:T.appBg,
              color:T.textPrimary, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"border-color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = T.actionBase)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
          >
            <span>↗</span> Open Full Fund View
            <span style={{...SANS, fontSize:10, color:T.textMuted}}>(← Back button will return here)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GlobalExceptionsModal({ fundState, fundSeeds, onClose, onGlobalResolve, onSelectFund, onSingleResolve, onSelectFundFromGlobal }) {
  const [resolving, setResolving] = useState(null);
  const [aiReleasing, setAiReleasing] = useState(false);
  const [aiReleasedCount, setAiReleasedCount] = useState(0);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [activeClusterCode, setActiveClusterCode] = useState(null);
  const [activeFundRow, setActiveFundRow] = useState<{fid: any; excId: any} | null>(null);
  const fundDetailRef = useRef(null);

  const clusters = useMemo(() => {
    const groups = {};
    Object.entries(fundState).forEach(([fid, excs]) => {
      const fund = fundSeeds.find(f => f.fund_id === fid) || { sla_days: 3 };
      (excs as any[]).forEach(e => {
        if (e.status !== "open") return;
        if (!groups[e.code]) groups[e.code] = {
          code: e.code, title: e.title, severity: e.severity,
          funds: new Set(), instances: 0, amount: 0, score: 0,
          hasAi: !!AI_SUGGESTIONS[e.id], sample: e,
        };
        groups[e.code].funds.add(fid);
        groups[e.code].instances++;
        groups[e.code].amount += e.amount;
        const slaFactor = (fund as any).sla_days <= 1 ? 2.5 : (fund as any).sla_days <= 3 ? 1.5 : 1.0;
        const sevFactor = e.severity === "error" ? 2.0 : 1.0;
        groups[e.code].score += (e.amount * slaFactor * sevFactor);
      });
    });
    return Object.values(groups).sort((a: any, b: any) => b.score - a.score);
  }, [fundState, fundSeeds]);

  useEffect(() => {
    if (clusters.length > 0 && !activeClusterCode) {
      setActiveClusterCode((clusters[0] as any).code);
    }
  }, [clusters, activeClusterCode]);

  const activeCluster: any = clusters.find((c: any) => c.code === activeClusterCode);

  const fundRows = useMemo(() => {
    if (!activeCluster) return [];
    const rows: any[] = [];
    Array.from(activeCluster.funds).forEach(fid => {
      const fund = fundSeeds.find(f => f.fund_id === fid);
      const excs = (fundState[fid as string] || []).filter((e: any) => e.code === activeCluster.code && e.status === "open");
      excs.forEach((exc: any) => rows.push({ fund, exc, fid }));
    });
    return rows.sort((a: any, b: any) => b.exc.amount - a.exc.amount);
  }, [activeCluster, fundState, fundSeeds]);

  const activeFundDetail = useMemo(() => {
    if (!activeFundRow) return null;
    const fund = fundSeeds.find(f => f.fund_id === (activeFundRow as any).fid);
    const exc = (fundState[(activeFundRow as any).fid] || []).find((e: any) => e.id === (activeFundRow as any).excId);
    return fund && exc ? { fund, exc } : null;
  }, [activeFundRow, fundState, fundSeeds]);

  const handleBulkResolve = () => {
    if (!bulkAction || !activeCluster) return;
    setResolving(activeCluster.code);
    setTimeout(() => {
      onGlobalResolve(activeCluster.code, bulkAction);
      setResolving(null);
      setBulkAction("");
      setBulkNote("");
      setActiveFundRow(null);
    }, 900);
  };

  const handleReleaseAi = () => {
    const eligible = clusters.filter((c: any) => c.hasAi);
    if (eligible.length === 0) return;
    setAiReleasing(true);
    setAiReleasedCount(0);
    let count = 0;
    const interval = setInterval(() => {
      if (count >= eligible.length) { clearInterval(interval); setAiReleasing(false); return; }
      const cluster: any = eligible[count];
      const suggestion = AI_SUGGESTIONS[cluster.sample.id];
      if (suggestion) onGlobalResolve(cluster.code, suggestion.resolution);
      count++;
      setAiReleasedCount(count);
    }, 500);
  };

  const aiEligibleCount = clusters.filter((c: any) => c.hasAi).length;

  return (
    <div className="modal-overlay" style={{
      position:"fixed", inset:0, background:"rgba(15,23,42,0.85)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="slide-in" style={{
        background:T.appBg, borderRadius:12, width:"min(2000px, 95vw)",
        height:"88vh", display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)",
      }}>

        {/* Header */}
        <div style={{
          background:T.navyHeader, padding:"14px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0,
        }}>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:16, color:"#fff", display:"flex", alignItems:"center", gap:8}}>
              <span>🌍</span> Global Exception Inbox
            </div>
            <div style={{...SANS, fontSize:12, color:"#9ca3af", marginTop:2}}>
              {clusters.length} exception types · {clusters.reduce((s: number, c: any) => s + c.instances, 0)} total instances · sorted by materiality score
            </div>
          </div>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
            <button
              onClick={handleReleaseAi}
              disabled={aiReleasing || aiEligibleCount === 0}
              style={{
                ...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none",
                background: aiEligibleCount === 0 ? "#374151" : T.aiBase,
                color: aiEligibleCount === 0 ? "#6b7280" : "#fff",
                cursor: aiEligibleCount === 0 ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", gap:6, transition:"all 0.2s",
              }}
            >
              {aiReleasing
                ? <><span style={{animation:"pulse 0.8s infinite"}}>✦</span> Releasing {aiReleasedCount}/{aiEligibleCount}...</>
                : aiEligibleCount === 0
                  ? <><span>✦</span> No AI Queue</>
                  : <><span>✦</span> Release AI Queue ({aiEligibleCount} eligible)</>
              }
            </button>
            <button onClick={onClose} style={{background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20}}>✕</button>
          </div>
        </div>

        {/* Three-pane body */}
        <div style={{display:"flex", flex:1, overflow:"hidden"}}>

          {/* PANE 1: Cluster list */}
          <div style={{
            width:280, background:T.cardBg, borderRight:`1px solid ${T.border}`,
            display:"flex", flexDirection:"column", flexShrink:0,
          }}>
            <div style={{
              padding:"10px 16px", background:"#f8fafc", borderBottom:`1px solid ${T.border}`,
              ...SANS, fontSize:10, fontWeight:700, color:T.textMuted,
              textTransform:"uppercase", letterSpacing:"0.05em",
            }}>
              Exception Types ({clusters.length})
            </div>
            <div style={{overflowY:"auto", flex:1}}>
              {clusters.map((c: any) => {
                const isSel = activeClusterCode === c.code;
                const resolvedCount = Object.values(fundState).flat()
                  .filter((e: any) => e.code === c.code && e.status === "resolved").length;
                return (
                  <div
                    key={c.code}
                    onClick={() => { setActiveClusterCode(c.code); setActiveFundRow(null); setBulkAction(""); }}
                    style={{
                      padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
                      background: isSel ? "#eff6ff" : T.cardBg, cursor:"pointer",
                      borderLeft:`4px solid ${isSel ? T.actionBase : "transparent"}`,
                      transition:"background 0.15s",
                    }}
                  >
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4}}>
                      <span style={{...MONO, fontSize:10, fontWeight:700, color:T.textMuted}}>{c.code}</span>
                      <div style={{display:"flex", gap:4, alignItems:"center"}}>
                        {c.hasAi && <span style={{...MONO, fontSize:9, fontWeight:700, color:T.aiBase, background:T.aiBg, padding:"1px 5px", borderRadius:3, border:`1px solid ${T.aiBorder}`}}>✦ AI</span>}
                        {c.instances > 1 && <span style={{...MONO, fontSize:9, fontWeight:700, color:T.actionBase, background:T.actionBg, padding:"1px 5px", borderRadius:3}}>SYSTEMIC</span>}
                      </div>
                    </div>
                    <div style={{...SANS, fontSize:12, fontWeight:600, color: isSel ? T.actionBase : T.textPrimary, marginBottom:6, lineHeight:1.3}}>
                      {c.title}
                    </div>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div style={{display:"flex", gap:10, ...SANS, fontSize:11, color:T.textMuted}}>
                        <span><strong style={{color:T.textPrimary}}>{c.instances}</strong> funds</span>
                        <span><strong style={{color:T.okBase}}>{resolvedCount}</strong> resolved</span>
                      </div>
                      <Badge severity={c.severity} size="sm"/>
                    </div>
                    {c.instances > 0 && (
                      <div style={{height:3, background:T.border, borderRadius:2, marginTop:8, overflow:"hidden"}}>
                        <div style={{
                          height:"100%", borderRadius:2, background:T.okBase,
                          width:`${(resolvedCount / c.instances) * 100}%`,
                          transition:"width 0.4s",
                        }}/>
                      </div>
                    )}
                  </div>
                );
              })}
              {clusters.length === 0 && (
                <div style={{padding:"40px 20px", textAlign:"center", ...SANS, fontSize:13, color:T.textMuted}}>
                  <div style={{fontSize:32, marginBottom:12}}>🎉</div>
                  No open global exceptions
                </div>
              )}
            </div>
          </div>

          {/* PANE 2: Fund-level rows */}
          <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:`1px solid ${T.border}`, minWidth:0}}>
            {activeCluster ? (<>
              <div style={{padding:"12px 20px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10}}>
                  <div>
                    <div style={{...SANS, fontSize:15, fontWeight:700, color:T.textPrimary}}>{activeCluster.title}</div>
                    <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2, lineHeight:1.5, maxWidth:500}}>
                      {activeCluster.sample.message}
                    </div>
                  </div>
                  <div style={{textAlign:"right", flexShrink:0, paddingLeft:16}}>
                    <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:2}}>Materiality Score</div>
                    <div style={{...MONO, fontSize:18, fontWeight:700, color:T.errorBase}}>{fmtCompact(activeCluster.score)}</div>
                  </div>
                </div>
                <div style={{display:"flex", gap:12, alignItems:"center", padding:"10px 14px", background:T.appBg, borderRadius:7, border:`1px solid ${T.border}`}}>
                  <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, whiteSpace:"nowrap"}}>BULK ACTION</div>
                  <select
                    value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                    style={{...SANS, flex:1, padding:"7px 10px", borderRadius:5, border:`1px solid ${T.border}`, fontSize:12, background:"#fff", cursor:"pointer"}}
                  >
                    <option value="">Select resolution for all {activeCluster.instances} funds...</option>
                    <option value="corrected_source">Corrected in Source</option>
                    <option value="override_value">Override with Value</option>
                    <option value="accept_as_is">Accept As Is</option>
                    <option value="acknowledged">Acknowledge</option>
                  </select>
                  <input
                    type="text" value={bulkNote} onChange={e => setBulkNote(e.target.value)}
                    placeholder="Shared justification (optional)..."
                    style={{...SANS, flex:1, padding:"7px 10px", borderRadius:5, border:`1px solid ${T.border}`, fontSize:12}}
                  />
                  <button
                    onClick={handleBulkResolve}
                    disabled={!bulkAction || resolving === activeCluster.code}
                    style={{
                      ...SANS, fontSize:12, fontWeight:700, padding:"7px 16px", borderRadius:5, border:"none",
                      background: !bulkAction ? T.border : T.actionBase,
                      color: !bulkAction ? T.textMuted : "#fff",
                      cursor: !bulkAction ? "not-allowed" : "pointer",
                      whiteSpace:"nowrap", transition:"background 0.2s",
                    }}
                  >
                    {resolving === activeCluster.code ? "Resolving..." : `Apply to All ${activeCluster.instances}`}
                  </button>
                </div>
              </div>

              <div style={{flex:1, overflowY:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                  <thead style={{position:"sticky", top:0, zIndex:10}}>
                    <tr style={{background:"#f8fafc", borderBottom:`2px solid ${T.border}`}}>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 16px", width:"22%"}}>Fund</th>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 12px", width:"10%"}}>Client</th>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 12px", width:"30%"}}>Exception Detail</th>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 12px", textAlign:"right", width:"12%"}}>Amount</th>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 12px", width:"8%"}}>SLA</th>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 12px", width:"10%"}}>Status</th>
                      <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"9px 12px", width:"8%"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundRows.map(({ fund, exc, fid }: any) => {
                      const isActive = (activeFundRow as any)?.excId === exc.id;
                      const isRowResolved = exc.status === "resolved";
                      const hasAi = !!AI_SUGGESTIONS[exc.id];
                      const statusBg = isRowResolved ? T.okBg : exc.severity === "error" ? T.errorBg : T.warnBg;
                      const statusColor = isRowResolved ? T.okBase : exc.severity === "error" ? T.errorBase : T.warnBase;
                      const statusBorder = isRowResolved ? T.okBorder : exc.severity === "error" ? T.errorBorder : T.warnBorder;
                      const statusLabel = isRowResolved ? "✓ Resolved" : exc.severity === "error" ? "ERROR" : "WARN";
                      return (
                        <tr
                          key={`${fid}-${exc.id}`}
                          onClick={() => setActiveFundRow({ fid, excId: exc.id })}
                          style={{
                            borderBottom:`1px solid ${T.border}`,
                            background: isActive ? "#eff6ff" : isRowResolved ? "#f9fffe" : T.cardBg,
                            cursor:"pointer",
                            borderLeft:`3px solid ${isActive ? T.actionBase : isRowResolved ? T.okBase : "transparent"}`,
                            transition:"background 0.1s",
                            opacity: isRowResolved ? 0.7 : 1,
                          }}
                        >
                          <td style={{padding:"10px 16px"}}>
                            <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary}}>{(fund as any)?.name || fid}</div>
                            <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:2}}>{(fund as any)?.fund_id}</div>
                          </td>
                          <td style={{...SANS, fontSize:11, color:T.textMuted, padding:"10px 12px"}}>{(fund as any)?.client}</td>
                          <td style={{padding:"10px 12px"}}>
                            <div style={{...SANS, fontSize:12, color:T.textPrimary, lineHeight:1.4, marginBottom:4}}>{exc.message}</div>
                            <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
                              <span style={{...MONO, fontSize:10, color:T.textMuted}}>{exc.account_number} — {exc.account_name}</span>
                              {hasAi && <span style={{...MONO, fontSize:9, fontWeight:700, color:T.aiBase, background:T.aiBg, padding:"1px 5px", borderRadius:3, border:`1px solid ${T.aiBorder}`}}>✦ AI Suggestion</span>}
                            </div>
                          </td>
                          <td style={{...MONO, fontSize:12, fontWeight:700, color:T.textPrimary, padding:"10px 12px", textAlign:"right"}}>{fmtUSD(exc.amount)}</td>
                          <td style={{padding:"10px 12px"}}><SlaPill daysLeft={(fund as any)?.sla_days ?? 3}/></td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:statusBg, color:statusColor, border:`1px solid ${statusBorder}`}}>
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{padding:"10px 12px", textAlign:"center"}}>
                            <span style={{color: isActive ? T.actionBase : T.textMuted, fontSize:16, fontWeight:700}}>{isActive ? "▶" : "›"}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {fundRows.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{padding:"40px", textAlign:"center", color:T.textMuted, ...SANS, fontSize:13}}>
                          No open exceptions in this cluster.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>) : (
              <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:T.textMuted, ...SANS, fontSize:13}}>
                Select an exception type on the left to review affected funds
              </div>
            )}
          </div>

          {/* PANE 3: Fund detail sliding pane */}
          <div ref={fundDetailRef} style={{
            width: activeFundRow ? 420 : 0,
            flexShrink:0,
            background:T.cardBg,
            borderLeft: activeFundRow ? `1px solid ${T.border}` : "none",
            display:"flex", flexDirection:"column",
            overflow:"hidden",
            transition:"width 0.25s ease",
          }}>
            {activeFundDetail && activeFundDetail.exc && (
              <FundExceptionDetailPane
                fundDetail={activeFundDetail}
                activeFundRow={activeFundRow}
                onClose={() => setActiveFundRow(null)}
                onSingleResolve={onSingleResolve}
                onSelectFundFromGlobal={onSelectFundFromGlobal}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
