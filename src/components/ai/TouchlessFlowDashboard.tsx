import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { T, SANS, MONO } from '../../theme/tokens';
import { TOUCHLESS_STATS, INITIAL_APPROVAL_STATE } from '../../data/funds';
import { TEAM } from '../../data/team';
import { AI_DECISION_LOG } from '../../data/aiData';
import { INGESTION_FEEDS } from '../../data/feeds/gl';
import { BEVERLEY_FILINGS } from '../../data/filings';
import { Avatar } from '../primitives/Avatar';
import type { FundSeed, Exception } from '../../types';

export function TouchlessFlowDashboard({ fundSeeds, onReassign, fundState, onRunDemo, isDemoRunning, demoKey }) {
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
  const [reassignments, setReassignments] = useState({});

  // ── Instructions 1-2: Live animation state ───────────────────────────────
  const [liveIngestedCount, setLiveIngestedCount] = useState(0);
  const [feedLog, setFeedLog] = useState<string[]>([]);
  const [liveAiCount, setLiveAiCount] = useState(0);
  const [aiLog, setAiLog] = useState<string[]>([]);
  const [ingestFlash, setIngestFlash] = useState(false);
  const [aiFlash, setAiFlash] = useState(false);
  const feedLogRef = useRef<HTMLDivElement | null>(null);
  const aiLogRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<{ ingestTimer: ReturnType<typeof setInterval> | null; aiTimer: ReturnType<typeof setInterval> | null; aiTimeout: ReturnType<typeof setTimeout> | null }>({ ingestTimer: null, aiTimer: null, aiTimeout: null });

  const startAnimation = useCallback(() => {
    clearInterval(animRef.current.ingestTimer ?? undefined);
    clearInterval(animRef.current.aiTimer ?? undefined);
    clearTimeout(animRef.current.aiTimeout ?? undefined);
    setLiveIngestedCount(0); setFeedLog([]); setLiveAiCount(0); setAiLog([]);
    setIngestFlash(false); setAiFlash(false);

    let ingestIdx = 0;
    const autoLogs = AI_DECISION_LOG.filter(l => l.type === 'autonomous');

    animRef.current.ingestTimer = setInterval(() => {
      if (ingestIdx >= INGESTION_FEEDS.length) {
        clearInterval(animRef.current.ingestTimer ?? undefined);
        animRef.current.aiTimeout = setTimeout(() => {
          let aiIdx = 0;
          animRef.current.aiTimer = setInterval(() => {
            if (aiIdx >= autoLogs.length) { clearInterval(animRef.current.aiTimer ?? undefined); return; }
            const log = autoLogs[aiIdx];
            setLiveAiCount(aiIdx + 1);
            setAiFlash(true); setTimeout(() => setAiFlash(false), 700);
            setAiLog(prev => [...prev, `[${log.timestamp}] ✦ ${log.exceptionId} — ${log.rule} — Auto-Resolved (${log.confidence}%)`]);
            aiIdx++;
          }, 600);
        }, 1000);
        return;
      }
      const feed = INGESTION_FEEDS[ingestIdx];
      const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLiveIngestedCount(ingestIdx + 1);
      setIngestFlash(true); setTimeout(() => setIngestFlash(false), 700);
      setFeedLog(prev => [...prev, `[${ts}] ✓ ${feed.payload} — ${feed.rows.toLocaleString()} rows ingested`]);
      ingestIdx++;
    }, 800);
  }, []);

  useEffect(() => {
    startAnimation();
    return () => {
      clearInterval(animRef.current.ingestTimer ?? undefined);
      clearInterval(animRef.current.aiTimer ?? undefined);
      clearTimeout(animRef.current.aiTimeout ?? undefined);
    };
  }, [demoKey]); // restarts when demo key changes

  useEffect(() => { feedLogRef.current?.scrollTo(0, feedLogRef.current.scrollHeight); }, [feedLog.length]);
  useEffect(() => { aiLogRef.current?.scrollTo(0, aiLogRef.current.scrollHeight); }, [aiLog.length]);

  // ── Instruction 3: Live data from fundState ──────────────────────────────
  const liveAllExcs = useMemo<any[]>(() => (Object.values(fundState || {}) as any[][]).flat(), [fundState]);
  const liveOpenErrors = useMemo(() => liveAllExcs.filter((e: any) => e.severity === 'error' && e.status === 'open'), [liveAllExcs]);
  const liveResidualCount = liveOpenErrors.length;
  const liveResolved = useMemo(() => liveAllExcs.filter((e: any) => e.status === 'resolved'), [liveAllExcs]);

  const prevResidualRef = useRef(liveResidualCount);
  const [residualFlash, setResidualFlash] = useState(false);
  useEffect(() => {
    if (prevResidualRef.current !== null && liveResidualCount < prevResidualRef.current) {
      setResidualFlash(true);
      setTimeout(() => setResidualFlash(false), 600);
    }
    prevResidualRef.current = liveResidualCount;
  }, [liveResidualCount]);

  // ── Instruction 9: STP Rate ──────────────────────────────────────────────
  const stpRate = useMemo(() => {
    const excs = liveAllExcs as any[];
    if (!excs.length) return 0;
    const touchless = excs.filter(e => e.status === 'resolved' && (e.resolvedBy === 'u_ai' || e.resolution === 'acknowledge')).length;
    return Math.round(touchless / excs.length * 100);
  }, [liveAllExcs]);
  const circumference = 251; // 2π × 40
  const stpOffset = circumference - (stpRate / 100) * circumference;
  const stpColor = stpRate >= 80 ? T.okBase : stpRate >= 60 ? T.warnBase : T.errorBase;

  // ── Static aggregates ────────────────────────────────────────────────────
  const totalFeeds = INGESTION_FEEDS.length;
  const autoResolvedCount = AI_DECISION_LOG.filter(l => l.type === 'autonomous').length;
  const approvedFunds = Object.values(INITIAL_APPROVAL_STATE).filter((a: any) => a.status === "approved").length;
  const filingsDue = BEVERLEY_FILINGS.filter(f => f.status !== "filed").length;

  const ingestionDone = liveIngestedCount === totalFeeds && totalFeeds > 0;
  const aiDone = liveAiCount === autoResolvedCount && autoResolvedCount > 0;
  const queueClear = liveResidualCount === 0;

  const stages = [
    { id: "ingest", title: "Data Ingestion", metric: `${liveIngestedCount} / ${totalFeeds}`, desc: "Feeds received & parsed", icon: "⛁", color: ingestionDone ? T.okBase : T.actionBase, bg: ingestionDone ? T.okBg : T.actionBg },
    { id: "auto",   title: "Touchless AI",   metric: `${liveAiCount} / ${autoResolvedCount}`, desc: "Exceptions auto-resolved", icon: "✦", color: aiDone ? T.okBase : T.aiBase, bg: aiDone ? T.okBg : T.aiBg },
    { id: "review", title: "Judgment Queue", metric: liveResidualCount, desc: "Pending preparer review", icon: queueClear ? "🎉" : "👤", color: queueClear ? T.okBase : T.warnBase, bg: queueClear ? T.okBg : T.warnBg },
    { id: "approve", title: "Controller Sign-Off", metric: approvedFunds, desc: "Funds certified", icon: "✓", color: T.okBase, bg: T.okBg },
    { id: "file",   title: "Regulatory Filings", metric: filingsDue, desc: "Filings due in 30 days", icon: "🏛", color: "#64748b", bg: "#f1f5f9" }
  ];

  // 2. Map Capacity Data (Supporting multiple users per fund)
  const liveOpenExcs = liveAllExcs.filter(e => e.status === 'open');
  const capacityData = TEAM.map(user => {
    const userExcs = liveOpenExcs.filter(e => e.assignee === user.id);
    
    // Safely handle if assignedTo is an array (multiple users) or a string (single user)
    const userFunds = fundSeeds.filter(f => {
      const assigned = Array.isArray(f.assignedTo) ? f.assignedTo : [f.assignedTo];
      return assigned.includes(user.id);
    });
    
    const userFilings = BEVERLEY_FILINGS.filter(f => f.assignedTo === user.id && f.status !== "filed");
    
    // Weighted scoring algorithm for workload
    let workloadScore = 0;
    if (user.isController) {
      workloadScore = (userFunds.length * 15) + (userFilings.length * 5);
    } else {
      workloadScore = (userExcs.length * 12) + (userFunds.length * 8) + (userFilings.length * 2);
    }
    
    let capacityPct = Math.min(100, workloadScore);
    if (capacityPct === 0) capacityPct = Math.floor(Math.random() * 30) + 15; // Visual baseline for demo

    return {
      ...user,
      activeTasks: user.isController ? userFunds.length : userExcs.length,
      taskLabel: user.isController ? "Funds to Review" : "Assigned Exceptions",
      capacityPct,
      filings: userFilings.length,
      assignedFunds: userFunds // Passing full fund objects for rendering
    };
  }).sort((a, b) => b.capacityPct - a.capacityPct);

  return (
    <div className="fade-in" style={{background: T.navyHeader, borderRadius: 12, marginBottom: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column"}}>

      {/* ─── TOP PANE: Global Pipeline Flow ─── */}
      <div style={{padding: "24px 32px", position: "relative"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36}}>
          <div>
            <h2 style={{...SANS, fontSize: 18, fontWeight: 700, color: "#fff", margin: 0}}>Autonomous Operations</h2>
            <p style={{...SANS, fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4}}>Live view of global STP flow and process bottlenecks.</p>
          </div>
          {/* Instruction 9: STP Rate Gauge + Demo button 
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                <circle cx="48" cy="48" r="40" fill="none" stroke={stpColor} strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={stpOffset}
                  strokeLinecap="round" transform="rotate(-90 48 48)"
                  style={{transition:"stroke-dashoffset 0.8s ease, stroke 0.5s ease"}} />
                <text x="48" y="44" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold" fontFamily="monospace">{stpRate}%</text>
                <text x="48" y="58" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8" fontFamily="sans-serif">STP Rate</text>
              </svg>
            </div>
            {onRunDemo && (
              <button onClick={onRunDemo} style={{...SANS, fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 6, border: `1px solid ${isDemoRunning ? T.errorBorder : T.okBorder}`, background: isDemoRunning ? T.errorBg : T.okBg, color: isDemoRunning ? T.errorBase : T.okBase, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s"}}>
                {isDemoRunning ? "⏹ Stop Demo" : "▶ Run Touchless Demo"}
              </button>
            )}
          </div>*/}
        </div>

        <div style={{display: "flex", alignItems: "flex-start", position: "relative"}}>
          <div style={{position: "absolute", top: 26, left: "10%", right: "10%", height: 2, background: "rgba(255,255,255,0.15)", zIndex: 0}} />

          {stages.map((stage) => {
            const flashCls = stage.id === "ingest" && ingestFlash ? "flash-green"
              : stage.id === "auto" && aiFlash ? "flash-purple"
              : stage.id === "review" && residualFlash ? "count-down"
              : "";
            const badge = stage.id === "ingest" && ingestionDone ? "✓ Ingestion Complete"
              : stage.id === "auto" && aiDone ? "100% Autonomous"
              : stage.id === "review" && queueClear ? "🎉 Queue Clear"
              : null;
            return (
              <div key={stage.id} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1}}>
                <div style={{width: 52, height: 52, borderRadius: "50%", background: stage.bg, border: `2px solid ${stage.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: stage.color, marginBottom: 12, boxShadow: `0 0 0 6px ${T.navyHeader}`, transition: "border-color 0.4s, background 0.4s"}}>
                  {stage.icon}
                </div>
                <div style={{textAlign: "center"}}>
                  <div className={flashCls} style={{...SANS, fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.1, borderRadius: 6, padding: "2px 6px"}}>{stage.metric}</div>
                  <div style={{...SANS, fontSize: 12, fontWeight: 700, color: stage.color, marginTop: 4, transition: "color 0.4s"}}>{stage.title}</div>
                  <div style={{...SANS, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, maxWidth: 130, margin: "4px auto 0", lineHeight: 1.4}}>{stage.desc}</div>
                  {badge && <div style={{...MONO, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: T.okBg, color: T.okBase, border: `1px solid ${T.okBorder}`, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3}}>{badge}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feed log + AI log rows 
        {(feedLog.length > 0 || aiLog.length > 0) && (
          <div style={{display: "flex", gap: 12, marginTop: 20}}>
            {feedLog.length > 0 && (
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{...MONO, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4}}>Ingestion Log</div>
                <div ref={feedLogRef} style={{height: 80, overflowY: "auto", ...MONO, fontSize: 10, background: "#0d1117", color: "#34d399", padding: 8, borderRadius: 6}}>
                  {feedLog.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            )}
            {aiLog.length > 0 && (
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{...MONO, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4}}>AI Resolution Log</div>
                <div ref={aiLogRef} style={{height: 80, overflowY: "auto", ...MONO, fontSize: 10, background: "#0d1117", color: "#a78bfa", padding: 8, borderRadius: 6}}>
                  {aiLog.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            )}
          </div>
        )}*/}
      </div>

      {/* ─── BOTTOM PANE: Human-in-the-Loop Capacity Grid ─── */}
      <div style={{background: T.appBg, borderTop: `1px solid rgba(255,255,255,0.1)`, padding: "20px 32px"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20}}>
           <h3 style={{...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0}}>Team Capacity & Bottlenecks</h3>
           <button onClick={() => setRebalanceModalOpen(true)} style={{...SANS, fontSize: 11, fontWeight: 700, padding: "8px 14px", borderRadius: 6, background: T.actionBase, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="#3b82f6"} onMouseLeave={e=>e.currentTarget.style.background=T.actionBase}>
             <span>⚖</span> Rebalance Workload
           </button>
        </div>
        
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16}}>
          {capacityData.map(user => {
            const isCritical = user.capacityPct > 85;
            const isWarn = user.capacityPct > 60 && !isCritical;
            const barColor = isCritical ? T.errorBase : isWarn ? T.warnBase : T.okBase;
            
            return (
              <div key={user.id} className="fte-card" style={{background: T.cardBg, borderRadius: 8, padding: "16px", border: `1px solid ${isCritical ? T.errorBorder : T.border}`, display: "flex", flexDirection: "column", gap: 12, position: "relative"}}>
                
                {isCritical && <div style={{position: "absolute", top: -5, right: -5, width: 12, height: 12, borderRadius: "50%", background: T.errorBase, border: "2px solid #fff"}} title="Critical Capacity Limit" />}

                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                  <div style={{display: "flex", alignItems: "center", gap: 10}}>
                    <Avatar user={user} size={32} />
                    <div>
                      <div style={{...SANS, fontSize: 14, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2}}>{user.name}</div>
                      <div style={{...SANS, fontSize: 11, color: T.textMuted, marginTop: 2}}>{user.role}</div>
                    </div>
                  </div>
                  <div style={{textAlign: "right"}}>
                    <div style={{...MONO, fontSize: 16, fontWeight: 700, color: barColor}}>{user.capacityPct}%</div>
                  </div>
                </div>

                <div style={{width: "100%", height: 6, background: T.appBg, borderRadius: 3, overflow: "hidden", border: `1px solid ${T.border}`}}>
                  <div style={{ width: `${user.capacityPct}%`, height: "100%", background: barColor, transition: "width 0.5s ease" }} />
                </div>

                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 2}}>
                  <div style={{display: "flex", flexDirection: "column", flex: 1}}>
                    <span style={{...MONO, fontSize: 14, fontWeight: 700, color: T.textPrimary}}>{user.activeTasks}</span>
                    <span style={{...SANS, fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.02em"}}>{user.taskLabel}</span>
                  </div>
                  <div style={{width: 1, height: 28, background: T.border}} />
                  <div style={{display: "flex", flexDirection: "column", flex: 1, alignItems: "flex-end"}}>
                    <span style={{...MONO, fontSize: 14, fontWeight: 700, color: T.textPrimary}}>{user.filings}</span>
                    <span style={{...SANS, fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.02em"}}>Filings Due</span>
                  </div>
                </div>

                {/* VISUALIZING ASSIGNED FUNDS */}
                {user.assignedFunds.length > 0 && (
                  <div style={{marginTop: 4, paddingTop: 12, borderTop: `1px dashed ${T.border}`}}>
                    <div style={{...SANS, fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", marginBottom: 8}}>Assigned Coverage</div>
                    <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                      {user.assignedFunds.slice(0, 3).map(f => (
                        <span key={f.id} title={f.name} style={{...SANS, fontSize: 10, padding: "3px 8px", background: T.appBg, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100}}>
                          {f.name}
                        </span>
                      ))}
                      {user.assignedFunds.length > 3 && (
                        <span style={{...SANS, fontSize: 10, padding: "3px 8px", background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 12, color: T.textMuted}}>
                          +{user.assignedFunds.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* ─── WORKLOAD REBALANCE MODAL ─── */}
      {rebalanceModalOpen && (
        <div className="modal-overlay" style={{position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center"}} onClick={() => { setRebalanceModalOpen(false); setReassignments({}); }}>
          <div onClick={e => e.stopPropagation()} className="slide-in" style={{background: T.cardBg, borderRadius: 12, width: 600, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden"}}>
            <div style={{background: T.navyHeader, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div>
                <div style={{...SANS, fontWeight: 700, fontSize: 15, color: "#fff"}}>Workload Rebalancing</div>
                <div style={{...SANS, fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2}}>Shift fund assignments to relieve capacity bottlenecks.</div>
              </div>
              <button onClick={() => { setRebalanceModalOpen(false); setReassignments({}); }} style={{background: "none", border: "none", color: "#8898aa", cursor: "pointer", fontSize: 18}}>✕</button>
            </div>
            
            <div style={{padding: "24px", maxHeight: "60vh", overflowY: "auto"}}>
              <div style={{...SANS, fontSize: 12, fontWeight: 700, color: T.textPrimary, marginBottom: 12}}>Reassign Fund Coverage</div>

              {(() => {
                const usersWithFunds = capacityData.filter(u => u.assignedFunds.length > 0);
                if (usersWithFunds.length === 0) {
                  return <div style={{...SANS, fontSize: 13, color: T.textMuted, textAlign: "center", padding: "24px 0"}}>No fund assignments found.</div>;
                }
                return usersWithFunds.map(u => (
                  <div key={u.id} style={{background: T.appBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16}}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12}}>
                      <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        <Avatar user={u} size={28} />
                        <span style={{...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary}}>{u.name}</span>
                        <span style={{...MONO, fontSize: 12, fontWeight: 700, color: u.capacityPct > 40 ? T.errorBase : T.textMuted}}>{u.capacityPct}% capacity</span>
                        <span style={{...SANS, fontSize: 11, color: T.textMuted}}>· {u.assignedFunds.length} fund{u.assignedFunds.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    {u.assignedFunds.map(f => {
                      const targets = capacityData.filter(m => m.id !== u.id);
                      return (
                        <div key={f.fund_id} style={{display: "flex", alignItems: "center", justifyContent: "space-between", background: T.cardBg, border: `1px solid ${reassignments[f.fund_id] ? T.actionBase : T.border}`, padding: "8px 12px", borderRadius: 6, marginBottom: 8}}>
                          <div style={{...SANS, fontSize: 12, color: T.textPrimary, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 8}}>{f.name}</div>
                          <div style={{display: "flex", alignItems: "center", gap: 8, flexShrink: 0}}>
                            <span style={{...SANS, fontSize: 11, color: T.textMuted}}>→</span>
                            <select
                              value={reassignments[f.fund_id] || ""}
                              onChange={e => setReassignments(prev => ({...prev, [f.fund_id]: e.target.value}))}
                              style={{...SANS, fontSize: 11, padding: "4px 8px", borderRadius: 4, border: `1px solid ${reassignments[f.fund_id] ? T.actionBase : T.border}`, background: "#fff", cursor: "pointer"}}
                            >
                              <option value="">Keep current</option>
                              {targets.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.capacityPct}%)</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              <div style={{...SANS, fontSize: 12, color: T.textMuted, textAlign: "center", marginTop: 16}}>
                Reassignments will update fund coverage and route future exceptions to the new owner.
              </div>
            </div>

            <div style={{padding: "16px 24px", background: T.appBg, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 12}}>
              <button onClick={() => { setRebalanceModalOpen(false); setReassignments({}); }} style={{...SANS, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textPrimary, cursor: "pointer"}}>Cancel</button>
              <button
                disabled={!Object.values(reassignments).some(v => v)}
                onClick={() => {
                  Object.entries(reassignments).forEach(([fid, uid]) => { if (uid) onReassign(fid, uid); });
                  setRebalanceModalOpen(false);
                  setReassignments({});
                }}
                style={{...SANS, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 6, border: "none", background: Object.values(reassignments).some(v => v) ? T.actionBase : T.border, color: Object.values(reassignments).some(v => v) ? "#fff" : T.textMuted, cursor: Object.values(reassignments).some(v => v) ? "pointer" : "not-allowed"}}
              >Apply Assignments</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

