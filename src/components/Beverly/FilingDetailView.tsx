import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { FilingEnvelope, FormPF, FieldValue, SubmissionResponse } from '../../types/filing';
import type { FormNPort } from '../../types/formNPort';
import type { ValidationResult } from '../../validation/engine';
import { FilingIntakePanel } from './FilingIntakePanel';
import { FilingPreviewPanel } from './FilingPreviewPanel';
import { ValidationResultsPanel } from './ValidationResultsPanel';
import { SourceTraceabilityPanel } from './SourceTraceabilityPanel';
import { SubmissionPanel } from './SubmissionPanel';

type WorkspaceTab = "intake" | "preview" | "validation" | "lineage" | "submission";

interface Props {
  filing: FilingEnvelope;
  payload: FormPF | FormNPort | null;
  fundName: string;
  clientName: string;
  validationResults: ValidationResult[];
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  showOverrides: boolean;
  setShowOverrides: (v: boolean) => void;
  showLineage: boolean;
  setShowLineage: (v: boolean) => void;
  onResolve: (ruleId: string) => void;
  onSubmit: () => Promise<SubmissionResponse>;
  onBack: () => void;
  validationInitialFilter: 'errors' | 'all';
  traceabilityFields: FieldValue[];
}

const TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "intake",     label: "Intake"     },
  { key: "preview",    label: "Preview"    },
  { key: "validation", label: "Validation" },
  { key: "lineage",    label: "Lineage"    },
  { key: "submission", label: "Submission" },
];

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m)]} ${parseInt(d)}, ${y}`;
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 200, color: T.textMuted, ...SANS, fontSize: 13, fontStyle: "italic",
    }}>
      {message}
    </div>
  );
}

export function FilingDetailView({
  filing, payload,
  fundName, clientName,
  validationResults, submissionResponse,
  activeTab, setActiveTab,
  showOverrides, setShowOverrides,
  showLineage, setShowLineage,
  onResolve, onSubmit, onBack,
  validationInitialFilter, traceabilityFields,
}: Props) {
  const unresolvedErrors   = validationResults.filter(r => !r.resolved && r.severity === "error").length;
  const unresolvedWarnings = validationResults.filter(r => !r.resolved && r.severity === "warning").length;

  const formLabel = filing.filing_type === "FORM_PF" ? "FORM PF"
    : filing.filing_type === "FORM_N_PORT" ? "FORM N-PORT"
    : filing.filing_type;

  const period = `${fmtDate(filing.reporting_period.start_date)} – ${fmtDate(filing.reporting_period.end_date)}`;

  function renderContent() {
    switch (activeTab) {
      case "intake":
        return <FilingIntakePanel filing={filing} />;

      case "preview":
        if (!payload) return <EmptyTab message="No payload available for this filing." />;
        return (
          <div>
            <div style={{
              display: "flex", gap: 16, padding: "10px 20px",
              borderBottom: `1px solid ${T.border}`, background: T.appBg,
            }}>
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
              filing={filing}
              payload={payload}
              showOverrides={showOverrides}
              showLineage={showLineage}
            />
          </div>
        );

      case "validation":
        return (
          <div style={{ padding: "16px 20px" }}>
            <ValidationResultsPanel
              results={validationResults}
              onResolve={onResolve}
              initialFilter={validationInitialFilter}
            />
          </div>
        );

      case "lineage":
        return <SourceTraceabilityPanel fields={traceabilityFields} />;

      case "submission":
        return (
          <div style={{ padding: "16px 20px" }}>
            <SubmissionPanel
              filing={filing}
              validationResults={validationResults}
              onSubmit={onSubmit}
            />
          </div>
        );
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Detail header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "10px 20px",
        background: T.cardBg, borderBottom: `1px solid ${T.border}`,
        flexShrink: 0, flexWrap: "wrap",
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{
            ...SANS, fontSize: 12, fontWeight: 600,
            background: "none", border: "none", cursor: "pointer",
            color: T.actionBase, padding: 0,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          ← Back to filings
        </button>

        <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />

        {/* Form type badge */}
        <span style={{
          ...MONO, fontSize: 9, fontWeight: 700,
          padding: "2px 7px", borderRadius: 4,
          background: T.actionBg, color: T.actionBase,
          border: `1px solid ${T.aiBorder}`,
          letterSpacing: "0.05em", flexShrink: 0,
        }}>
          {formLabel}
        </span>

        {/* Fund name */}
        <span style={{ ...SANS, fontSize: 14, fontWeight: 500, color: T.textPrimary }}>
          {fundName}
        </span>

        {/* Client name */}
        <span style={{ ...SANS, fontSize: 12, color: T.textMuted }}>
          {clientName}
        </span>

        {/* Reporting period */}
        <span style={{ ...SANS, fontSize: 12, color: T.textMuted }}>
          {period}
        </span>

        {/* Error / warning badge — right-aligned */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {unresolvedErrors > 0 && (
            <span style={{
              ...MONO, fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 4,
              background: T.errorBg, color: T.errorBase,
              border: `1px solid ${T.errorBorder}`,
            }}>
              {unresolvedErrors} error{unresolvedErrors !== 1 ? "s" : ""}
            </span>
          )}
          {unresolvedWarnings > 0 && (
            <span style={{
              ...MONO, fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 4,
              background: T.warnBg, color: T.warnBase,
              border: `1px solid ${T.warnBorder}`,
            }}>
              {unresolvedWarnings} warning{unresolvedWarnings !== 1 ? "s" : ""}
            </span>
          )}
          {unresolvedErrors === 0 && unresolvedWarnings === 0 && validationResults.length > 0 && (
            <span style={{
              ...MONO, fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 4,
              background: T.okBg, color: T.okBase,
              border: `1px solid ${T.okBorder}`,
            }}>
              All clear
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex", background: T.cardBg,
        borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...SANS, fontSize: 12, fontWeight: active ? 700 : 500,
                padding: "10px 18px",
                border: "none",
                borderBottom: active ? `2px solid ${T.actionBase}` : "2px solid transparent",
                background: "transparent",
                color: active ? T.actionBase : T.textMuted,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}
