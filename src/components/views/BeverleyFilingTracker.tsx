import React, { useState, useEffect, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { FilingPreviewModal } from '../modals/FilingPreviewModal';
import type { Filing } from '../../types';

const VALIDATION_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ready:       { label: "PASS", bg: T.okBg,    color: T.okBase,    border: T.okBorder    },
  filed:       { label: "PASS", bg: T.okBg,    color: T.okBase,    border: T.okBorder    },
  not_started: { label: "WARN", bg: T.warnBg,  color: T.warnBase,  border: T.warnBorder  },
  blocked:     { label: "FAIL", bg: T.errorBg, color: T.errorBase, border: T.errorBorder },
};

function aiConf(f: Filing): number {
  const seed = parseInt(f.id.replace(/\D/g, '')) || 1;
  if (f.status === 'filed')        return 99;
  if (f.status === 'ready')        return 94 + (seed % 5);
  if (f.status === 'not_started')  return 78 + (seed % 12);
  return 62 + (seed % 14);
}

function blockerCount(f: Filing): number {
  return (parseInt(f.id.replace(/\D/g, '')) % 3) + 1;
}

const COL_HEADERS = ["ID", "FUND", "CLIENT", "DUE", "VALIDATION", "AI CONF.", "STATUS", "Action"];

export function BeverleyFilingTracker({ filings, onGoToDashboard }) {
  const [search, setSearch]           = useState("");
  const [sortBy, setSortBy]           = useState("due_asc");
  const [hideFiled, setHideFiled]     = useState(true);
  const [period, setPeriod]           = useState("Dec 31, 2024");
  const [localFilings, setLocalFilings] = useState(filings);
  const [activeFiling, setActiveFiling] = useState(null);
  const [collapsedForms, setCollapsedForms] = useState({});
  const [batchState, setBatchState]   = useState(null);

  useEffect(() => { setLocalFilings(filings); }, [filings]);

  const PERIODS = ["Dec 31, 2024", "Nov 30, 2024"];

  const periodFilings = localFilings.filter(f => f.period === period);
  const readyCount     = periodFilings.filter(f => f.status === "ready").length;
  const blockedCount   = periodFilings.filter(f => f.status === "blocked").length;
  const inReviewCount  = periodFilings.filter(f => f.status === "not_started").length;
  const submittedCount = periodFilings.filter(f => f.status === "filed").length;
  const total          = periodFilings.length;
  const activeCount    = total - submittedCount;

  const groupedData = useMemo(() => {
    let rows = localFilings.filter(f => f.period === period);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(f =>
        f.fund.toLowerCase().includes(q) ||
        f.client.toLowerCase().includes(q) ||
        f.form.toLowerCase().includes(q)
      );
    }
    if (hideFiled) rows = rows.filter(f => f.status !== "filed");
    rows.sort((a, b) => {
      if (sortBy === "due_asc")  return a.daysLeft - b.daysLeft;
      if (sortBy === "fund_asc") return a.fund.localeCompare(b.fund);
      return 0;
    });
    const groups: Record<string, Filing[]> = {};
    rows.forEach(f => {
      if (!groups[f.form]) groups[f.form] = [];
      groups[f.form].push(f);
    });
    return groups;
  }, [localFilings, search, period, sortBy, hideFiled]);

  const handleMarkFiled = (id: string) => {
    setLocalFilings(prev => prev.map(f =>
      f.id === id ? { ...f, status: "filed", notes: "SEC EDGAR Confirmed." } : f
    ));
  };

  const handleBatchAction = (action: string) => {
    setBatchState(action);
    setTimeout(() => {
      if (action === "transmit") {
        setLocalFilings(prev => prev.map(f =>
          f.status === "ready" ? { ...f, status: "filed", notes: "Batch SEC Transmit Success" } : f
        ));
      }
      setBatchState(null);
    }, 2000);
  };

  if (total > 0 && activeCount === 0 && !search && hideFiled) {
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 52px)", background: T.appBg }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🏆</div>
        <div style={{ ...SANS, fontSize: 26, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>All Filings Transmitted!</div>
        <div style={{ ...SANS, fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 450, textAlign: "center", lineHeight: 1.5 }}>
          Outstanding work. All <strong>{total}</strong> regulatory filings for {period} have been successfully validated and transmitted to the SEC.
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onGoToDashboard} className="glow-btn" style={{ ...SANS, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 6, border: "none", background: T.actionBase, color: "#fff", cursor: "pointer" }}>
            ← Return to Dashboard
          </button>
          <button onClick={() => setHideFiled(false)} style={{ ...SANS, fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textPrimary, cursor: "pointer" }}>
            Review Filed Returns
          </button>
        </div>
      </div>
    );
  }

  const SUMMARY_STATS = [
    { label: "READY",     count: readyCount,     color: T.okBase    },
    { label: "BLOCKED",   count: blockedCount,   color: T.errorBase },
    { label: "IN REVIEW", count: inReviewCount,  color: T.textMuted },
    { label: "SUBMITTED", count: submittedCount, color: T.actionBase },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", background: T.appBg, height: "calc(100vh - 52px)", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding: "12px 24px", background: T.cardBg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>

        {/* Row 1: title + summary bar + action buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ ...SANS, fontWeight: 700, fontSize: 18, color: T.textPrimary, display: "flex", alignItems: "center", gap: 10 }}>
            Beverley Filing Workflow
            <span style={{ color: T.textMuted, fontSize: 16, fontWeight: 400 }}>|</span>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...SANS, fontSize: 16, fontWeight: 700, color: T.actionBase, background: "transparent", border: "none", outline: "none", cursor: "pointer", appearance: "none", paddingRight: 16, backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=%22%234f46e5%22 height%3D%2224%22 viewBox%3D%220 0 24 24%22 width%3D%2224%22 xmlns%3D%22http://www.w3.org/2000/svg%22><path d%3D%22M7 10l5 5 5-5z%22/></svg>')", backgroundRepeat: "no-repeat", backgroundPosition: "right center" }}>
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Summary stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {SUMMARY_STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                <span style={{ ...MONO, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.label}:</span>
                  <span style={{ color: T.textPrimary, marginLeft: 4 }}>{s.count}</span>
                </span>
                {i < SUMMARY_STATS.length - 1 && (
                  <span style={{ color: T.border, fontSize: 14 }}>|</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => handleBatchAction("validate")}
              disabled={!!batchState}
              style={{ ...SANS, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.aiBorder}`, background: T.aiBg, color: T.aiBase, cursor: "pointer" }}
            >
              {batchState === "validate" ? "Scanning..." : "✦ Re-validate all"}
            </button>
            <button
              onClick={() => handleBatchAction("transmit")}
              disabled={!!batchState || readyCount === 0}
              style={{ ...SANS, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 6, border: "none", background: readyCount > 0 ? T.actionBase : T.border, color: "#fff", cursor: readyCount > 0 ? "pointer" : "not-allowed" }}
            >
              {batchState === "transmit" ? "Submitting..." : `Submit ready (${readyCount})`}
            </button>
          </div>
        </div>

        {/* Regulatory Change Detector */}
        <div className="slide-in" style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "16px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ fontSize: 24 }}>🏛</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...SANS, fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>SEC EDGAR Change Detected: Form N-PORT</div>
            <div style={{ ...SANS, fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
              SEC amended Part C reporting for derivatives — effective March 31, 2025.<br />
              <strong>Impact:</strong> 3 of your filing templates require mapping updates. Torrance AI has generated draft mapping proposals.
            </div>
          </div>
          <button style={{ ...SANS, fontSize: 12, fontWeight: 600, background: T.warnBg, color: T.warnBase, border: `1px solid ${T.warnBorder}`, padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>
            Review AI Proposals
          </button>
        </div>

        {/* Search / sort / hide-completed */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted, fontSize: 14 }}>⌕</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search forms, funds, or clients..."
              style={{ ...SANS, width: "100%", padding: "8px 12px 8px 32px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, outline: "none" }}
            />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...SANS, padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, color: T.textPrimary, background: "#fff", outline: "none", cursor: "pointer" }}>
            <option value="due_asc">Sort: Urgent (Due Soon)</option>
            <option value="fund_asc">Sort: Fund Name (A-Z)</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginLeft: 4 }}>
            <input type="checkbox" checked={hideFiled} onChange={e => setHideFiled(e.target.checked)} style={{ accentColor: T.actionBase }} />
            <span style={{ ...SANS, fontSize: 12, color: T.textPrimary, fontWeight: 600 }}>Hide Completed</span>
          </label>
        </div>
      </div>

      {/* ── Table body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {Object.entries(groupedData).map(([form, formFilings]) => (
          <div key={form} style={{ marginBottom: 24, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>

            {/* Group header */}
            <div
              onClick={() => setCollapsedForms(p => ({ ...p, [form]: !p[form] }))}
              style={{ background: T.navyHeader, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#fff", ...SANS, fontWeight: 700 }}
            >
              <span style={{ fontSize: 12 }}>{collapsedForms[form] ? "▶" : "▼"}</span>
              {form} Filings
              <span style={{ ...MONO, fontSize: 12, color: "rgba(255,255,255,0.55)", marginLeft: "auto" }}>
                {formFilings.length} filing{formFilings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {!collapsedForms[form] && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: T.appBg, borderBottom: `1px solid ${T.border}` }}>
                    {COL_HEADERS.map(col => (
                      <th key={col} style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, padding: "8px 12px", textAlign: "left", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formFilings.map(f => {
                    const vb   = VALIDATION_BADGE[f.status] ?? VALIDATION_BADGE.not_started;
                    const conf = aiConf(f);
                    const bc   = blockerCount(f);
                    return (
                      <tr key={f.id} className="tbl-row" style={{ borderBottom: `1px solid ${T.border}` }}>

                        {/* ID */}
                        <td style={{ ...MONO, fontSize: 11, color: T.textMuted, padding: "10px 12px", whiteSpace: "nowrap" }}>{f.id}</td>

                        {/* FUND */}
                        <td style={{ padding: "10px 12px", maxWidth: 200 }}>
                          <div style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.fund}</div>
                        </td>

                        {/* CLIENT */}
                        <td style={{ ...SANS, fontSize: 12, color: T.textMuted, padding: "10px 12px", whiteSpace: "nowrap" }}>{f.client}</td>

                        {/* DUE */}
                        <td style={{ ...MONO, fontSize: 11, color: T.textPrimary, padding: "10px 12px", whiteSpace: "nowrap" }}>{f.dueDate}</td>

                        {/* VALIDATION */}
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ ...MONO, fontSize: 11, fontWeight: 700, background: vb.bg, color: vb.color, border: `1px solid ${vb.border}`, padding: "2px 8px", borderRadius: 12, whiteSpace: "nowrap" }}>
                            {vb.label}
                          </span>
                        </td>

                        {/* AI CONF. */}
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ ...MONO, fontSize: 11, fontWeight: 700, background: T.aiBg, color: T.aiBase, border: `1px solid ${T.aiBorder}`, padding: "2px 8px", borderRadius: 12, whiteSpace: "nowrap" }}>
                            ✦ {conf}%
                          </span>
                        </td>

                        {/* STATUS */}
                        <td style={{ padding: "10px 12px" }}>
                          {f.status === "ready" && (
                            <span style={{ ...SANS, fontSize: 11, fontWeight: 600, color: T.okBase, border: `1px solid ${T.okBase}`, padding: "3px 10px", borderRadius: 12, whiteSpace: "nowrap" }}>
                              Ready to file
                            </span>
                          )}
                          {f.status === "blocked" && (
                            <span style={{ ...SANS, fontSize: 11, fontWeight: 700, background: T.errorBase, color: "#fff", padding: "3px 10px", borderRadius: 12, whiteSpace: "nowrap" }}>
                              Blocked
                            </span>
                          )}
                          {f.status === "not_started" && (
                            <span style={{ ...SANS, fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>In review</span>
                          )}
                          {f.status === "filed" && (
                            <span style={{ ...SANS, fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>Submitted to EDGAR</span>
                          )}
                        </td>

                        {/* ACTION */}
                        <td style={{ padding: "10px 12px" }}>
                          {f.status === "ready" && (
                            <button
                              onClick={() => setActiveFiling(f)}
                              style={{ ...SANS, fontSize: 12, fontWeight: 700, background: T.actionBase, color: "#fff", border: "none", padding: "5px 14px", borderRadius: 6, cursor: "pointer" }}
                            >
                              Submit
                            </button>
                          )}
                          {f.status === "blocked" && (
                            <span style={{ ...MONO, fontSize: 11, fontWeight: 700, background: T.errorBase, color: "#fff", padding: "3px 10px", borderRadius: 12, whiteSpace: "nowrap" }}>
                              {bc} blocker{bc > 1 ? "s" : ""}
                            </span>
                          )}
                          {f.status === "not_started" && (
                            <button
                              onClick={() => setActiveFiling(f)}
                              style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.actionBase, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              Open
                            </button>
                          )}
                          {f.status === "filed" && (
                            <button
                              onClick={() => setActiveFiling(f)}
                              style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.actionBase, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                            >
                              View receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {activeFiling && (
        <FilingPreviewModal filing={activeFiling} onClose={() => setActiveFiling(null)} onFile={handleMarkFiled} />
      )}
    </div>
  );
}
