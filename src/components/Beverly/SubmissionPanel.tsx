import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { FilingEnvelope, SubmissionResponse } from '../../types/filing';
import type { ValidationResult } from '../../validation/engine';

interface Props {
  filing: FilingEnvelope;
  validationResults: ValidationResult[];
  onSubmit: () => Promise<SubmissionResponse>;
}

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function ChecklistItem({
  label, pass, description,
}: {
  label: string; pass: boolean; description?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 12px", borderRadius: 6, marginBottom: 6,
      background: pass ? T.okBg : T.errorBg,
      border: `1px solid ${pass ? T.okBorder : T.errorBorder}`,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
        {pass ? "✅" : "❌"}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          ...SANS, fontSize: 12, fontWeight: 700,
          color: pass ? T.okBase : T.errorBase,
        }}>
          {label}
        </div>
        {description && (
          <div style={{ ...SANS, fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <span style={{
        ...MONO, fontSize: 9, fontWeight: 700,
        padding: "1px 5px", borderRadius: 3, flexShrink: 0,
        background: pass ? T.okBg : T.errorBg,
        color: pass ? T.okBase : T.errorBase,
        border: `1px solid ${pass ? T.okBorder : T.errorBorder}`,
      }}>
        {pass ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

function ResponseStatusBadge({ status }: { status: SubmissionResponse["status"] }) {
  const styleMap: Record<SubmissionResponse["status"], React.CSSProperties> = {
    accepted:              { background: T.okBg,   color: T.okBase,   border: `1px solid ${T.okBorder}`   },
    rejected:              { background: T.errorBg, color: T.errorBase, border: `1px solid ${T.errorBorder}` },
    accepted_with_warnings:{ background: T.warnBg,  color: T.warnBase,  border: `1px solid ${T.warnBorder}`  },
  };
  const labelMap: Record<SubmissionResponse["status"], string> = {
    accepted:               "ACCEPTED",
    rejected:               "REJECTED",
    accepted_with_warnings: "ACCEPTED WITH WARNINGS",
  };
  return (
    <span style={{
      ...MONO, fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 5,
      ...styleMap[status],
    }}>
      {labelMap[status]}
    </span>
  );
}

export function SubmissionPanel({ filing, validationResults, onSubmit }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [response,   setResponse]   = useState<SubmissionResponse | null>(null);

  const unresolvedErrors = validationResults.filter(r => !r.resolved && r.severity === "error");

  const schemaErrors     = unresolvedErrors.filter(r => r.scope === "submission" || r.scope === "filing");
  const fieldErrors      = unresolvedErrors.filter(r => r.scope === "field");
  const crossFieldErrors = unresolvedErrors.filter(r => r.scope === "cross_field");

  const schemaPass     = schemaErrors.length === 0;
  const fieldPass      = fieldErrors.length === 0;
  const crossFieldPass = crossFieldErrors.length === 0;
  const attestPass     = (
    filing.controls.attestation_status === "complete" ||
    filing.controls.attestation_status === "signed"   ||
    filing.controls.attestation_status === "approved"
  );
  const packagePass    = !!(
    filing.submission_metadata.package_format &&
    filing.submission_metadata.package_format !== "" &&
    filing.submission_metadata.package_format !== "pending" &&
    filing.submission_metadata.package_format !== "none"
  );

  const allPass = schemaPass && fieldPass && crossFieldPass && attestPass && packagePass;
  const channel = filing.filing_type === "FORM_PF" ? "PFRD" : "EDGAR";
  const channelDesc = filing.filing_type === "FORM_PF"
    ? "Form PF via Private Fund Reporting Depot"
    : "Form N-PORT via EDGAR";

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await onSubmit();
      setResponse(res);
    } finally {
      setSubmitting(false);
    }
  }

  const respBorderColor = response
    ? response.status === "accepted"               ? T.okBorder
    : response.status === "rejected"               ? T.errorBorder
    : T.warnBorder
    : T.border;

  const respBg = response
    ? response.status === "accepted"               ? T.okBg
    : response.status === "rejected"               ? T.errorBg
    : T.warnBg
    : T.cardBg;

  return (
    <div style={{ ...SANS, color: T.textPrimary }}>
      <div style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8, overflow: "hidden", marginBottom: 14,
      }}>
        <div style={{
          padding: "10px 14px",
          background: T.appBg, borderBottom: `1px solid ${T.border}`,
          ...SANS, fontSize: 11, fontWeight: 700,
          color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          Pre-Submission Checklist
        </div>
        <div style={{ padding: "12px 14px" }}>
          <ChecklistItem
            label="Schema Validation"
            pass={schemaPass}
            description={schemaPass
              ? "No schema or filing-level errors."
              : `${schemaErrors.length} blocking error${schemaErrors.length !== 1 ? "s" : ""} found.`}
          />
          <ChecklistItem
            label="Field Validation"
            pass={fieldPass}
            description={fieldPass
              ? "All field-level rules passed."
              : `${fieldErrors.length} field error${fieldErrors.length !== 1 ? "s" : ""} unresolved.`}
          />
          <ChecklistItem
            label="Cross-Field Validation"
            pass={crossFieldPass}
            description={crossFieldPass
              ? "All cross-field checks passed."
              : `${crossFieldErrors.length} cross-field error${crossFieldErrors.length !== 1 ? "s" : ""} unresolved.`}
          />
          <ChecklistItem
            label="Attestation Complete"
            pass={attestPass}
            description={`Status: ${filing.controls.attestation_status}`}
          />
          <ChecklistItem
            label="Package Generated"
            pass={packagePass}
            description={packagePass
              ? `Format: ${filing.submission_metadata.package_format.toUpperCase()}`
              : "No valid package format configured."}
          />
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "10px 14px",
        background: T.appBg, border: `1px solid ${T.border}`,
        borderRadius: 7, marginBottom: 14,
      }}>
        <span style={{
          ...SANS, fontSize: 11, fontWeight: 700,
          color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          Submission Channel
        </span>
        <span style={{
          ...MONO, fontSize: 11, fontWeight: 700,
          padding: "2px 8px", borderRadius: 4,
          background: T.aiBg, color: T.aiBase,
          border: `1px solid ${T.aiBorder}`,
        }}>
          {channel}
        </span>
        <span style={{ ...SANS, fontSize: 11, color: T.textMuted }}>
          {channelDesc}
        </span>
      </div>

      {!response && (
        <>
          <button
            disabled={!allPass || submitting}
            onClick={handleSubmit}
            className="glow-btn"
            style={{
              ...SANS, fontSize: 13, fontWeight: 700,
              padding: "10px 24px", borderRadius: 7,
              cursor: allPass && !submitting ? "pointer" : "not-allowed",
              background: allPass ? T.okBase : T.border,
              color: allPass ? "#fff" : T.textMuted,
              border: "none", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: submitting ? 0.75 : 1,
              transition: "all 0.15s",
            }}
          >
            {submitting ? (
              <>
                <span style={{ display: "inline-block", animation: "pulse 1s infinite" }}>⏳</span>
                Submitting…
              </>
            ) : (
              "Submit Filing →"
            )}
          </button>
          {!allPass && (
            <div style={{
              ...SANS, fontSize: 11, color: T.textMuted,
              textAlign: "center", marginTop: 6,
            }}>
              Resolve all failing checklist items before submitting.
            </div>
          )}
        </>
      )}

      {response && (
        <div
          className="slide-in"
          style={{
            border: `1px solid ${respBorderColor}`,
            borderRadius: 8, background: respBg,
            padding: "14px 16px", marginTop: 4,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap",
            gap: 8, marginBottom: 12,
          }}>
            <ResponseStatusBadge status={response.status} />
            <span style={{ ...MONO, fontSize: 10, color: T.textMuted }}>
              {fmtDateTime(response.submitted_at)}
            </span>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 10,
          }}>
            {[
              { heading: "Tracking Number", val: response.tracking_number },
              { heading: "Response Code",   val: response.response_code   },
            ].map(({ heading, val }) => (
              <div key={heading}>
                <div style={{
                  ...SANS, fontSize: 9, fontWeight: 700,
                  color: T.textMuted, textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 2,
                }}>
                  {heading}
                </div>
                <div style={{ ...MONO, fontSize: 11, color: T.textPrimary }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: response.warnings.length > 0 ? 10 : 0 }}>
            <div style={{
              ...SANS, fontSize: 9, fontWeight: 700,
              color: T.textMuted, textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 4,
            }}>
              Message
            </div>
            <div style={{ ...SANS, fontSize: 12, color: T.textPrimary }}>
              {response.response_message}
            </div>
          </div>

          {response.warnings.length > 0 && (
            <div>
              <div style={{
                ...SANS, fontSize: 9, fontWeight: 700,
                color: T.warnBase, textTransform: "uppercase",
                letterSpacing: "0.06em", marginBottom: 6,
              }}>
                Warnings ({response.warnings.length})
              </div>
              {response.warnings.map((w, i) => (
                <div key={i} style={{
                  ...SANS, fontSize: 11, color: T.warnBase,
                  padding: "5px 8px", borderRadius: 4, marginBottom: 4,
                  background: T.warnBg, border: `1px solid ${T.warnBorder}`,
                }}>
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
