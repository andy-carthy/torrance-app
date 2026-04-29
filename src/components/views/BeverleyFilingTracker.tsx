import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { Filing } from '../../types';
import type { FilingEnvelope, FormPF, FieldValue, SubmissionResponse } from '../../types/filing';
import type { FormNPort } from '../../types/formNPort';
import type { ValidationResult } from '../../validation/engine';
import { runValidation } from '../../validation/engine';
import { simulateSubmission } from '../../validation/submissionSimulator';
import { mockFormPFFiling, mockFormNPortFiling } from '../../data/mockFilings';
import { FilingDetailView } from '../Beverly/FilingDetailView';
import { AdHocFilingForm } from '../Beverly/AdHocFilingForm';

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode    = 'list' | 'detail' | 'adhoc';
type WorkspaceTab = 'intake' | 'preview' | 'validation' | 'lineage' | 'submission';

const STATUS_ORDER: Record<string, number> = {
  blocked: 0, ready: 1, not_started: 2, filed: 3,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getMock(f: Filing) {
  return (f.form === 'N-PORT' || f.form === 'N-MFP' || f.form === 'N-CEN')
    ? mockFormNPortFiling
    : mockFormPFFiling;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AiConfCell({ conf }: { conf: number }) {
  const color = conf >= 90 ? T.okBase : conf >= 75 ? T.warnBase : T.errorBase;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color, minWidth: 34 }}>{conf}%</span>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border, overflow: 'hidden' }}>
        <div style={{ width: `${conf}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Filing['status'] }) {
  if (status === 'ready') return (
    <span style={{ ...SANS, fontSize: 11, fontWeight: 600, color: T.okBase, border: `1px solid ${T.okBase}`, padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap' }}>
      Ready to file
    </span>
  );
  if (status === 'blocked') return (
    <span style={{ ...SANS, fontSize: 11, fontWeight: 700, background: T.errorBase, color: '#fff', padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap' }}>
      Blocked
    </span>
  );
  if (status === 'not_started') return (
    <span style={{ ...SANS, fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>In review</span>
  );
  return (
    <span style={{ ...SANS, fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>Submitted to EDGAR</span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const COL_HEADERS = ['ID', 'FUND', 'CLIENT', 'DUE', 'VALIDATION', 'AI CONF.', 'STATUS', 'ACTION'];
const PERIODS = ['Dec 31, 2024', 'Nov 30, 2024'];

export function BeverleyFilingTracker({ filings, setFilings, onGoToDashboard }) {

  // ── List-view state ────────────────────────────────────────────────────────
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('due_asc');
  const [hideFiled, setHideFiled] = useState(true);
  const [period, setPeriod]     = useState('Dec 31, 2024');
  const [collapsedForms, setCollapsedForms] = useState<Record<string, boolean>>({
    'N-PORT': true, 'N-CEN': true, 'N-MFP': true, 'ADV': true,
  });
  const [batchState, setBatchState] = useState<string | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const [inlineSubmitting, setInlineSubmitting] = useState<string | null>(null);

  // ── View-mode state machine ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // ── Hoisted filing workspace state ─────────────────────────────────────────
  const [activeFiling, setActiveFiling]             = useState<FilingEnvelope | null>(null);
  const [activePayload, setActivePayload]           = useState<FormPF | FormNPort | null>(null);
  const [activeFilingRow, setActiveFilingRow]       = useState<Filing | null>(null);
  const [validationResults, setValidationResults]   = useState<ValidationResult[]>([]);
  const [submissionResponse, setSubmissionResponse] = useState<SubmissionResponse | null>(null);
  const [activeTab, setActiveTab]                   = useState<WorkspaceTab>('intake');
  const [showOverrides, setShowOverrides]           = useState(false);
  const [showLineage, setShowLineage]               = useState(false);
  const [validationInitialFilter, setValidationInitialFilter] = useState<'errors' | 'all'>('all');

  // ── Derived counts ─────────────────────────────────────────────────────────
  const periodFilings  = filings.filter(f => f.period === period);
  const readyCount     = periodFilings.filter(f => f.status === 'ready').length;
  const blockedCount   = periodFilings.filter(f => f.status === 'blocked').length;
  const inReviewCount  = periodFilings.filter(f => f.status === 'not_started').length;
  const submittedCount = periodFilings.filter(f => f.status === 'filed').length;
  const total          = periodFilings.length;
  const activeCount    = total - submittedCount;

  // ── Grouped / filtered / sorted list ──────────────────────────────────────
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
    if (hideFiled) rows = rows.filter(f => f.status !== 'filed');
    rows.sort((a, b) => {
      if (sortBy === 'due_asc')  return a.daysLeft - b.daysLeft;
      if (sortBy === 'fund_asc') return a.fund.localeCompare(b.fund);
      if (sortBy === 'status')   return (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4);
      return 0;
    });
    const groups: Record<string, Filing[]> = {};
    rows.forEach(f => {
      if (!groups[f.form]) groups[f.form] = [];
      groups[f.form].push(f);
    });
    return groups;
  }, [filings, search, period, sortBy, hideFiled]);

  // ── Unique fund list for ad-hoc form ──────────────────────────────────────
  const uniqueFunds = useMemo(() => {
    const seen = new Set<string>();
    return filings
      .filter(f => { if (seen.has(f.fund_id)) return false; seen.add(f.fund_id); return true; })
      .map(f => ({ id: f.fund_id, name: f.fund, client: f.client }));
  }, [filings]);

  // ── Traceability fields (FormPF only) ──────────────────────────────────────
  const traceabilityFields = useMemo((): FieldValue[] => {
    if (!activePayload || !('adviser_profile' in activePayload)) return [];
    return (activePayload as FormPF).sections.flatMap(s => s.items);
  }, [activePayload]);

  // ── Batch actions ──────────────────────────────────────────────────────────
  function handleBatchAction(action: string) {
    setBatchState(action);
    setTimeout(() => {
      if (action === 'transmit') {
        setFilings(prev => prev.map(f =>
          f.status === 'ready' ? { ...f, status: 'filed', notes: 'Batch SEC Transmit Success' } : f
        ));
      }
      setBatchState(null);
    }, 2000);
  }

  // ── Detail-view open ───────────────────────────────────────────────────────
  function openDetail(f: Filing, defaultTab: WorkspaceTab, initFilter: 'errors' | 'all') {
    const mock = getMock(f);
    const envelope = { ...mock, filing_trigger: 'periodic' as const } as FilingEnvelope;
    const payload  = mock.payload;
    setActiveFiling(envelope);
    setActivePayload(payload);
    setActiveFilingRow(f);
    setSubmissionResponse(null);
    setValidationResults(runValidation(envelope, payload));
    setActiveTab(defaultTab);
    setValidationInitialFilter(initFilter);
    setViewMode('detail');
  }

  function handleRowClick(f: Filing) {
    const isPASS = f.status === 'ready' || f.status === 'filed';
    openDetail(f, isPASS ? 'submission' : 'validation', f.status === 'blocked' ? 'errors' : 'all');
  }

  function handleOpenAction(f: Filing, e: React.MouseEvent, initFilter: 'errors' | 'all') {
    e.stopPropagation();
    openDetail(f, 'validation', initFilter);
  }

  // ── Inline submission (PASS rows) ─────────────────────────────────────────
  async function handleSubmitInline(f: Filing, e: React.MouseEvent) {
    e.stopPropagation();
    setInlineSubmitting(f.id);
    try {
      const mock     = getMock(f);
      const envelope = { ...mock, filing_trigger: 'periodic' as const } as FilingEnvelope;
      const results  = runValidation(envelope, mock.payload);
      const res      = await simulateSubmission(envelope, results);
      setFilings(prev => prev.map(x =>
        x.id === f.id ? { ...x, status: 'filed', notes: `Tracking: ${res.tracking_number}` } : x
      ));
      showToast(`${f.fund} submitted — ${res.tracking_number}`);
    } finally {
      setInlineSubmitting(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Detail-view handlers ───────────────────────────────────────────────────
  function handleBack() {
    setViewMode('list');
    setActiveFiling(null);
    setActivePayload(null);
    setActiveFilingRow(null);
    setValidationResults([]);
    setSubmissionResponse(null);
  }

  function handleResolve(ruleId: string) {
    setValidationResults(prev => prev.map(r => r.id === ruleId ? { ...r, resolved: true } : r));
  }

  async function handleSubmit(): Promise<SubmissionResponse> {
    const res = await simulateSubmission(activeFiling!, validationResults);
    setSubmissionResponse(res);
    return res;
  }

  // ── Ad-hoc handlers ────────────────────────────────────────────────────────
  function handleAdhocContinue(envelope: FilingEnvelope) {
    setActiveFiling(envelope);
    setActivePayload(null);
    setActiveFilingRow(null);
    setSubmissionResponse(null);
    setValidationResults([]);
    setActiveTab('intake');
    setViewMode('detail');
  }

  // ── All-filed celebration ──────────────────────────────────────────────────
  if (viewMode === 'list' && total > 0 && activeCount === 0 && !search && hideFiled) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px)', background: T.appBg }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🏆</div>
        <div style={{ ...SANS, fontSize: 26, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>All Filings Transmitted!</div>
        <div style={{ ...SANS, fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 450, textAlign: 'center', lineHeight: 1.5 }}>
          Outstanding work. All <strong>{total}</strong> regulatory filings for {period} have been successfully validated and transmitted to the SEC.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onGoToDashboard} className="glow-btn" style={{ ...SANS, fontSize: 14, fontWeight: 700, padding: '12px 24px', borderRadius: 6, border: 'none', background: T.actionBase, color: '#fff', cursor: 'pointer' }}>
            ← Return to Dashboard
          </button>
          <button onClick={() => setHideFiled(false)} style={{ ...SANS, fontSize: 14, fontWeight: 600, padding: '12px 24px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.cardBg, color: T.textPrimary, cursor: 'pointer' }}>
            Review Filed Returns
          </button>
        </div>
      </div>
    );
  }

  // ── Summary stats ──────────────────────────────────────────────────────────
  const SUMMARY_STATS = [
    { label: 'READY',     count: readyCount,     color: T.okBase    },
    { label: 'BLOCKED',   count: blockedCount,   color: T.errorBase },
    { label: 'IN REVIEW', count: inReviewCount,  color: T.textMuted },
    { label: 'SUBMITTED', count: submittedCount, color: T.actionBase },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: T.appBg, height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* ── Toast notification ── */}
      {toast && (
        <div className="slide-in" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          background: T.okBase, color: '#fff',
          padding: '11px 18px', borderRadius: 8,
          ...SANS, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ✓ {toast}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LIST VIEW                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <>
          {/* ── Page header ── */}
          <div style={{ padding: '12px 24px', background: T.cardBg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>

            {/* Row 1: title + period + stats + batch buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ ...SANS, fontWeight: 700, fontSize: 18, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 10 }}>
                Beverley Filing Workflow
                <span style={{ color: T.textMuted, fontSize: 16, fontWeight: 400 }}>|</span>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  style={{ ...SANS, fontSize: 16, fontWeight: 700, color: T.actionBase, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: 16, backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=%22%234f46e5%22 height%3D%2224%22 viewBox%3D%220 0 24 24%22 width%3D%2224%22 xmlns%3D%22http://www.w3.org/2000/svg%22><path d%3D%22M7 10l5 5 5-5z%22/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
                >
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {SUMMARY_STATS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <span style={{ ...MONO, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.label}:</span>
                      <span style={{ color: T.textPrimary, marginLeft: 4 }}>{s.count}</span>
                    </span>
                    {i < SUMMARY_STATS.length - 1 && <span style={{ color: T.border, fontSize: 14 }}>|</span>}
                  </React.Fragment>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleBatchAction('validate')}
                  disabled={!!batchState}
                  style={{ ...SANS, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.aiBorder}`, background: T.aiBg, color: T.aiBase, cursor: 'pointer' }}
                >
                  {batchState === 'validate' ? 'Scanning...' : '✦ Re-validate all'}
                </button>
                <button
                  onClick={() => handleBatchAction('transmit')}
                  disabled={!!batchState || readyCount === 0}
                  style={{ ...SANS, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: readyCount > 0 ? T.actionBase : T.border, color: '#fff', cursor: readyCount > 0 ? 'pointer' : 'not-allowed' }}
                >
                  {batchState === 'transmit' ? 'Submitting...' : `Submit ready (${readyCount})`}
                </button>
              </div>
            </div>

            {/* Regulatory alert */}
            <div className="slide-in" style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ fontSize: 22 }}>🏛</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 3 }}>SEC EDGAR Change Detected: Form N-PORT</div>
                <div style={{ ...SANS, fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                  SEC amended Part C reporting for derivatives — effective March 31, 2025.{' '}
                  <strong>Impact:</strong> 3 of your filing templates require mapping updates. Torrance AI has generated draft mapping proposals.
                </div>
              </div>
              <button style={{ ...SANS, fontSize: 12, fontWeight: 600, background: T.warnBg, color: T.warnBase, border: `1px solid ${T.warnBorder}`, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
                Review AI Proposals
              </button>
            </div>

            {/* Toolbar: search + sort + New Filing + hide completed */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: 280 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, fontSize: 14 }}>⌕</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search forms, funds, or clients..."
                  style={{ ...SANS, width: '100%', padding: '8px 12px 8px 32px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }}
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{ ...SANS, padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, color: T.textPrimary, background: '#fff', outline: 'none', cursor: 'pointer' }}
              >
                <option value="due_asc">Sort: Urgent (Due Soon)</option>
                <option value="fund_asc">Sort: Fund Name (A–Z)</option>
                <option value="status">Sort: Status</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={hideFiled} onChange={e => setHideFiled(e.target.checked)} style={{ accentColor: T.actionBase }} />
                <span style={{ ...SANS, fontSize: 12, color: T.textPrimary, fontWeight: 600 }}>Hide Completed</span>
              </label>
              <button
                onClick={() => setViewMode('adhoc')}
                style={{ ...SANS, fontSize: 12, fontWeight: 700, marginLeft: 'auto',padding: '8px 16px', borderRadius: 6, border: `1px solid ${T.actionBase}`, background: T.actionBg, color: T.actionBase, cursor: 'pointer' }}
              >
                + Ad-Hoc Filing
              </button>

            </div>
          </div>

          {/* ── Filing group tables ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {Object.entries(groupedData).map(([form, formFilings]) => (
              <div key={form} style={{ marginBottom: 24, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>

                {/* Group header */}
                <div
                  onClick={() => setCollapsedForms(p => ({ ...p, [form]: !p[form] }))}
                  style={{ background: '#0d0d0d', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#fff', ...SANS, fontWeight: 700 }}
                >
                  <span style={{ fontSize: 11 }}>{collapsedForms[form] ? '▶' : '▼'}</span>
                  {form} Filings
                  <span style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 'auto' }}>
                    {formFilings.length} filing{formFilings.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {!collapsedForms[form] && (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: T.appBg, borderBottom: `1px solid ${T.border}` }}>
                        {COL_HEADERS.map(col => (
                          <th key={col} style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
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
                        const isSubmitting = inlineSubmitting === f.id;
                        return (
                          <tr
                            key={f.id}
                            className="tbl-row"
                            onClick={() => handleRowClick(f)}
                            style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}
                          >
                            {/* ID */}
                            <td style={{ ...MONO, fontSize: 11, color: T.textMuted, padding: '10px 12px', whiteSpace: 'nowrap' }}>{f.id}</td>

                            {/* FUND (fund name + client stacked) */}
                            <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                              <div style={{ ...SANS, fontSize: 13, fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.fund}</div>
                              <div style={{ ...SANS, fontSize: 11, color: T.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.client}</div>
                            </td>

                            {/* CLIENT */}
                            <td style={{ ...SANS, fontSize: 12, color: T.textMuted, padding: '10px 12px', whiteSpace: 'nowrap' }}>{f.client}</td>

                            {/* DUE */}
                            <td style={{ ...MONO, fontSize: 11, color: T.textPrimary, padding: '10px 12px', whiteSpace: 'nowrap' }}>{f.dueDate}</td>

                            {/* VALIDATION */}
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ ...MONO, fontSize: 11, fontWeight: 700, background: vb.bg, color: vb.color, border: `1px solid ${vb.border}`, padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                                {vb.label}
                              </span>
                            </td>

                            {/* AI CONF. */}
                            <td style={{ padding: '10px 12px' }}>
                              <AiConfCell conf={conf} />
                            </td>

                            {/* STATUS */}
                            <td style={{ padding: '10px 12px' }}>
                              <StatusPill status={f.status} />
                            </td>

                            {/* ACTION — stopPropagation on the td so row click doesn't fire */}
                            <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                              {f.status === 'ready' && (
                                <button
                                  onClick={e => handleSubmitInline(f, e)}
                                  disabled={isSubmitting}
                                  style={{ ...SANS, fontSize: 12, fontWeight: 700, background: T.actionBase, color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                                >
                                  {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                              )}
                              {f.status === 'not_started' && (
                                <button
                                  onClick={e => handleOpenAction(f, e, 'all')}
                                  style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.actionBase, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  Open
                                </button>
                              )}
                              {f.status === 'blocked' && (
                                <button
                                  onClick={e => handleOpenAction(f, e, 'errors')}
                                  style={{ ...SANS, fontSize: 12, fontWeight: 700, background: T.errorBase, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  {bc} blocker{bc > 1 ? 's' : ''}
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

            {Object.keys(groupedData).length === 0 && (
              <div style={{ ...SANS, fontSize: 13, color: T.textMuted, textAlign: 'center', paddingTop: 48, fontStyle: 'italic' }}>
                No filings match your filters.
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DETAIL VIEW                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'detail' && activeFiling && (
        <FilingDetailView
          filing={activeFiling}
          payload={activePayload}
          fundName={activeFilingRow?.fund ?? activeFiling.filer_identity.legal_name}
          clientName={activeFilingRow?.client ?? ''}
          validationResults={validationResults}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showOverrides={showOverrides}
          setShowOverrides={setShowOverrides}
          showLineage={showLineage}
          setShowLineage={setShowLineage}
          onResolve={handleResolve}
          onSubmit={handleSubmit}
          onBack={handleBack}
          validationInitialFilter={validationInitialFilter}
          traceabilityFields={traceabilityFields}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* AD-HOC VIEW                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'adhoc' && (
        <AdHocFilingForm
          funds={uniqueFunds}
          onContinue={handleAdhocContinue}
          onCancel={() => setViewMode('list')}
        />
      )}
    </div>
  );
}
