import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { Filing } from '../../types';
import type { FilingEnvelope, FormPF, FieldValue, SubmissionResponse } from '../../types/filing';
import type { FormNPort } from '../../types/formNPort';
import type { ValidationResult } from '../../validation/engine';
import { runValidation } from '../../validation/engine';
import { simulateSubmission } from '../../validation/submissionSimulator';
import { FilingIntakePanel } from '../Beverly/FilingIntakePanel';
import { FilingPreviewPanel } from '../Beverly/FilingPreviewPanel';
import { ValidationResultsPanel } from '../Beverly/ValidationResultsPanel';
import { SourceTraceabilityPanel } from '../Beverly/SourceTraceabilityPanel';
import { SubmissionPanel } from '../Beverly/SubmissionPanel';

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

type WorkspaceTab = "intake" | "preview" | "validation" | "lineage" | "submission";

function EmptyWorkspace({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: 200, color: T.textMuted,
      ...SANS, fontSize: 13, fontStyle: "italic",
    }}>
      {message}
    </div>
  );
}

export function BeverleyFilingTracker({ filings, setFilings, onGoToDashboard }) {
  const [search, setSearch]               = useState("");
  const [sortBy, setSortBy]               = useState("due_asc");
  const [hideFiled, setHideFiled]         = useState(true);
  const [period, setPeriod]               = useState("Dec 31, 2024");
  const [collapsedForms, setCollapsedForms] = useState({});
  const [batchState, setBatchState]       = useState(null);

  // Hoisted filing workspace state
  const [activeFiling, setActiveFiling]             = useState<FilingEnvelope | null>(null);
  const [activePayload, setActivePayload]           = useState<FormPF | FormNPort | null>(null);
  const [validationResults, setValidationResults]   = useState<ValidationResult[]>([]);
  const [submissionResponse, setSubmissionResponse] = useState<SubmissionResponse | null>(null);
  const [activeTab, setActiveTab]                   = useState<WorkspaceTab>("intake");
  const [showOverrides, setShowOverrides]           = useState(false);
  const [showLineage, setShowLineage]               = useState(false);

  const PERIODS = ["Dec 31, 2024", "Nov 30, 2024"];

  const periodFilings  = filings.filter(f => f.period === period);
  const readyCount     = periodFilings.filter(f => f.status === "ready").length;
  const blockedCount   = periodFilings.filter(f => f.status === "blocked").length;
  const inReviewCount  = periodFilings.filter(f => f.status === "not_started").length;
  const submittedCount = periodFilings.filter(f => f.status === "filed").length;
  const total          = periodFilings.length;
  const activeCount    = total - submittedCount;

  const groupedData = useMemo(() => {
    let rows = filings.filter(f => f.period === period);
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
  }, [filings, search, period, sortBy, hideFiled]);

  const handleMarkFiled = (id: string) => {
    setFilings(prev => prev.map(f =>
      f.id === id ? { ...f, status: "filed", notes: "SEC EDGAR Confirmed." } : f
    ));
  };

  const handleBatchAction = (action: string) => {
    setBatchState(action);
    setTimeout(() => {
      if (action === "transmit") {
        setFilings(prev => prev.map(f =>
          f.status === "ready" ? { ...f, status: "filed", notes: "Batch SEC Transmit Success" } : f
        ));
      }
      setBatchState(null);
    }, 2000);
  };

  const handleFilingSelected = (rawFiling: FilingEnvelope) => {
    const withPayload = rawFiling as FilingEnvelope & { payload?: FormPF | FormNPort };
    const payload = withPayload.payload ?? null;
    setActiveFiling(rawFiling);
    setActivePayload(payload);
    setSubmissionResponse(null);
    setValidationResults(payload ? runValidation(rawFiling, payload) : []);
  };

  const handleResolve = (ruleId: string) => {
    setValidationResults(prev =>
      prev.map(r => r.id === ruleId ? { ...r, resolved: true } : r)
    );
  };

  const handleSubmit = async (): Promise<SubmissionResponse> => {
    const res = await simulateSubmission(activeFiling!, validationResults);
    setSubmissionResponse(res);
    return res;
  };

  const traceabilityFields = useMemo((): FieldValue[] => {
    if (!activePayload || !('adviser_profile' in activePayload)) return [];
    return (activePayload as FormPF).sections.flatMap(s => s.items);
  }, [activePayload]);

  const unresolvedErrorCount = validationResults.filter(r => !r.resolved && r.severity === "error").length;

  const TABS: { key: WorkspaceTab; label: string; disabled: boolean }[] = [
    { key: "intake",     label: "Intake",     disabled: false },
    { key: "preview",    label: "Preview",    disabled: !activeFiling },
    { key: "validation", label: "Validation", disabled: !activeFiling },
    { key: "lineage",    label: "Lineage",    disabled: !activeFiling },
    { key: "submission", label: "Submission", disabled: !activeFiling || unresolvedErrorCount > 0 },
  ];

  function renderWorkspaceContent() {
    switch (activeTab) {
      case "intake":
        return <FilingIntakePanel onFilingSelected={handleFilingSelected} />;

      case "preview":
        if (!activeFiling || !activePayload)
          return <EmptyWorkspace message="Load a filing from the Intake tab first." />;
        return (
          <div>
            <div style={{ display: "flex", gap: 16, padding: "10px 20px", borderBottom: `1px solid ${T.border}`, background: T.appBg }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input type="checkbox" checked={showOverrides} onChange={e => setShowOverrides(e.target.checked)} style={{ accentColor: T.actionBase }} />
                <span style={{ ...SANS, fontSize: 12, color: T.textPrimary, fontWeight: 500 }}>Show Overrides</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input type="checkbox" checked={showLineage} onChange={e => setShowLineage(e.target.checked)} style={{ accentColor: T.actionBase }} />
                <span style={{ ...SANS, fontSize: 12, color: T.textPrimary, fontWeight: 500 }}>Show Lineage</span>
              </label>
            </div>
            <FilingPreviewPanel
              filing={activeFiling}
              payload={activePayload}
              showOverrides={showOverrides}
              showLineage={showLineage}
            />
          </div>
        );

      case "validation":
        if (!activeFiling)
          return <EmptyWorkspace message="Load a filing from the Intake tab first." />;
        return (
          <div style={{ padding: "16px 20px" }}>
            <ValidationResultsPanel results={validationResults} onResolve={handleResolve} />
          </div>
        );

      case "lineage":
        if (!activeFiling)
          return <EmptyWorkspace message="Load a filing from the Intake tab first." />;
        return <SourceTraceabilityPanel fields={traceabilityFields} />;

      case "submission":
        if (!activeFiling)
          return <EmptyWorkspace message="Load a filing from the Intake tab first." />;
        return (
          <div style={{ padding: "16px 20px" }}>
            <SubmissionPanel
              filing={activeFiling}
              validationResults={validationResults}
              onSubmit={handleSubmit}
            />
          </div>
        );
    }
  }

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

          {/* Batch action buttons */}
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

      {/* ── Two-panel body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left panel: filing list ── */}
        <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.cardBg, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* New Filing button */}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <button
              onClick={() => {
                setActiveFiling(null);
                setActivePayload(null);
                setValidationResults([]);
                setSubmissionResponse(null);
                setActiveTab("intake");
              }}
              style={{ ...SANS, fontSize: 12, fontWeight: 700, width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.actionBase}`, background: T.actionBg, color: T.actionBase, cursor: "pointer" }}
            >
              + New Filing
            </button>
          </div>

          {/* Filing groups */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {Object.entries(groupedData).map(([form, formFilings]) => (
              <div key={form} style={{ marginBottom: 14 }}>

                {/* Group header */}
                <div
                  onClick={() => setCollapsedForms(p => ({ ...p, [form]: !p[form] }))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: T.navyHeader, borderRadius: 6, cursor: "pointer", marginBottom: 4 }}
                >
                  <span style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,0.6)" }}>
                    {collapsedForms[form] ? "▶" : "▼"}
                  </span>
                  <span style={{ ...SANS, fontSize: 11, fontWeight: 700, color: "#fff" }}>{form}</span>
                  <span style={{ ...MONO, fontSize: 10, color: "rgba(255,255,255,0.45)", marginLeft: "auto" }}>
                    {formFilings.length}
                  </span>
                </div>

                {/* Filing rows */}
                {!collapsedForms[form] && formFilings.map(f => {
                  const vb = VALIDATION_BADGE[f.status] ?? VALIDATION_BADGE.not_started;
                  const bc = blockerCount(f);
                  return (
                    <div
                      key={f.id}
                      onClick={() => setActiveTab("intake")}
                      className="tbl-row"
                      style={{
                        padding: "8px 10px", borderRadius: 5, marginBottom: 3,
                        border: `1px solid ${T.border}`, background: T.cardBg,
                        cursor: "pointer",
                      }}
                    >
                      {/* Fund name + status badge */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                        <span style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.fund}
                        </span>
                        <span style={{ ...MONO, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: vb.bg, color: vb.color, border: `1px solid ${vb.border}`, flexShrink: 0 }}>
                          {vb.label}
                        </span>
                      </div>

                      {/* Due date + status label */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ ...MONO, fontSize: 10, color: T.textMuted }}>{f.dueDate}</span>
                        <span style={{ ...SANS, fontSize: 10, color: f.status === "blocked" ? T.errorBase : T.textMuted }}>
                          {f.status === "filed"       ? "Submitted"
                           : f.status === "ready"     ? "Ready"
                           : f.status === "blocked"   ? `${bc} blocker${bc > 1 ? "s" : ""}`
                           : "In review"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {Object.keys(groupedData).length === 0 && (
              <div style={{ ...SANS, fontSize: 12, color: T.textMuted, textAlign: "center", paddingTop: 24, fontStyle: "italic" }}>
                No filings match your filters.
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: filing workspace ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tab bar */}
          <div style={{ display: "flex", background: T.cardBg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && setActiveTab(tab.key)}
                  style={{
                    ...SANS, fontSize: 12, fontWeight: active ? 700 : 500,
                    padding: "10px 18px",
                    border: "none",
                    borderBottom: active ? `2px solid ${T.actionBase}` : "2px solid transparent",
                    background: "transparent",
                    color: tab.disabled ? T.border : active ? T.actionBase : T.textMuted,
                    cursor: tab.disabled ? "not-allowed" : "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            {/* Active filing indicator */}
            {activeFiling && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 16, gap: 8 }}>
                <span style={{ ...MONO, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: T.actionBg, color: T.actionBase, border: `1px solid ${T.aiBorder}` }}>
                  {activeFiling.filing_type.replace("_", " ")}
                </span>
                <span style={{ ...SANS, fontSize: 11, color: T.textMuted }}>
                  {activeFiling.filer_identity.legal_name}
                </span>
                {unresolvedErrorCount > 0 && (
                  <span style={{ ...MONO, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: T.errorBg, color: T.errorBase, border: `1px solid ${T.errorBorder}` }}>
                    {unresolvedErrorCount} error{unresolvedErrorCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Workspace content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {renderWorkspaceContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
