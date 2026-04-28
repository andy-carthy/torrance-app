import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { Card, FieldLabel } from '../primitives/Card';
import type { FilingEnvelope } from '../../types/filing';

interface Props {
  filing: FilingEnvelope;
}

const AD_HOC_FORM_TYPES = [
  "Schedule TO",
  "Form N-23c-3",
  "Form 3 / Form 4 / Form 5",
  "Form D",
  "Form 144",
  "Schedule 13D",
  "Schedule 13G",
];

const SOURCE_SYSTEMS = [
  { name: "General Ledger",  status: "connected" as const },
  { name: "Transfer Agent",  status: "connected" as const },
  { name: "Pricing Vendor",  status: "warning"   as const, note: "Stale — last sync 2h ago" },
];

function fmtDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m)]} ${parseInt(d)}, ${y}`;
}

function daysRemaining(dueDate: string): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function cadenceLabel(filing: FilingEnvelope): string {
  if (filing.filing_type === "FORM_PF")     return "Annual";
  if (filing.filing_type === "FORM_N_PORT") return "Monthly";
  return filing.reporting_period.period_type ?? "Quarterly";
}

function channelLabel(filing: FilingEnvelope): string {
  return filing.filing_type === "FORM_PF" ? "PFRD (Private Fund Reporting Depot)" : "EDGAR";
}

function formLabel(filing: FilingEnvelope): string {
  if (filing.filing_type === "FORM_PF")     return "Form PF";
  if (filing.filing_type === "FORM_N_PORT") return "Form N-PORT";
  return filing.filing_type;
}

const inputStyle: React.CSSProperties = {
  ...SANS, width: "100%", padding: "8px 10px",
  borderRadius: 6, border: `1px solid ${T.border}`,
  fontSize: 13, background: "#fff", color: T.textPrimary,
  outline: "none",
};

const readonlyVal: React.CSSProperties = {
  ...SANS, fontSize: 13, color: T.textPrimary, fontWeight: 500,
};

function AutoBadge() {
  return (
    <span style={{
      ...MONO, fontSize: 9, fontWeight: 700,
      padding: "1px 5px", borderRadius: 3,
      background: T.actionBg, color: T.actionBase,
      border: `1px solid ${T.aiBorder}`,
      letterSpacing: "0.05em", marginLeft: 6,
    }}>
      AUTO
    </span>
  );
}

export function FilingIntakePanel({ filing }: Props) {
  const isAdhoc = filing.filing_trigger === 'adhoc';
  const [isAmendment, setIsAmendment] = useState(filing.amendment_indicator);
  const [priorRef, setPriorRef] = useState('');

  // Ad-hoc local editable state
  const [adhocType, setAdhocType] = useState(filing.adhoc_type ?? AD_HOC_FORM_TYPES[0]);
  const [startDate, setStartDate] = useState(filing.reporting_period.start_date);
  const [endDate, setEndDate]     = useState(filing.reporting_period.end_date);

  const days = daysRemaining(isAdhoc ? endDate : filing.reporting_period.due_date);

  return (
    <div style={{ ...SANS, padding: "20px", maxWidth: 920 }}>

      {/* ── STP Banner (periodic only) ── */}
      {!isAdhoc && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 16px", marginBottom: 18, borderRadius: 8,
          background: "#eff6ff", border: "1px solid #bfdbfe",
          ...SANS, fontSize: 12, color: "#1d4ed8", lineHeight: 1.55,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
          <span>
            <strong>STP mode</strong> — filing type and period auto-detected from entity configuration.
            Amendment override available below.
          </span>
        </div>
      )}

      {/* ── 2×2 card grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Card 1 — Filing type */}
        <Card title={<>Filing Type{!isAdhoc && <AutoBadge />}</>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <FieldLabel>Form name</FieldLabel>
              {isAdhoc ? (
                <select
                  value={adhocType}
                  onChange={e => setAdhocType(e.target.value)}
                  style={{ ...inputStyle }}
                >
                  {AD_HOC_FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <div style={readonlyVal}>{formLabel(filing)}</div>
              )}
            </div>
            <div>
              <FieldLabel>Submission channel</FieldLabel>
              <div style={readonlyVal}>{channelLabel(filing)}</div>
            </div>
            <div>
              <FieldLabel>Cadence</FieldLabel>
              <div style={readonlyVal}>{cadenceLabel(filing)}</div>
            </div>

            {/* Amendment toggle */}
            <div style={{
              marginTop: 4, padding: "10px 12px", borderRadius: 6,
              border: `1px solid ${isAmendment ? T.warnBorder : T.border}`,
              background: isAmendment ? T.warnBg : T.appBg,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>Amendment filing</div>
                  <div style={{ ...SANS, fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                    Corrective re-submission of a prior filing
                  </div>
                </div>
                <div
                  role="switch"
                  aria-checked={isAmendment}
                  onClick={() => setIsAmendment(v => !v)}
                  style={{ cursor: "pointer", flexShrink: 0, marginLeft: 16 }}
                >
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: isAmendment ? T.actionBase : T.border,
                    position: "relative", transition: "background 0.2s",
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 2,
                      left: isAmendment ? 18 : 2,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </div>
              </div>
              {isAmendment && (
                <div style={{ marginTop: 10 }}>
                  <FieldLabel required>Prior filing reference</FieldLabel>
                  <input
                    type="text"
                    value={priorRef}
                    onChange={e => setPriorRef(e.target.value)}
                    placeholder="e.g. FIL-PF-2024-001"
                    style={{ ...inputStyle }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Card 2 — Reporting period */}
        <Card title={<>Reporting Period{!isAdhoc && <AutoBadge />}</>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <FieldLabel>Start date</FieldLabel>
              {isAdhoc ? (
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ ...inputStyle }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={readonlyVal}>{fmtDisplayDate(filing.reporting_period.start_date)}</span>
                  <AutoBadge />
                </div>
              )}
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              {isAdhoc ? (
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ ...inputStyle }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={readonlyVal}>{fmtDisplayDate(filing.reporting_period.end_date)}</span>
                  <AutoBadge />
                </div>
              )}
            </div>
            {!isAdhoc && (
              <div>
                <FieldLabel>Due date</FieldLabel>
                <div style={readonlyVal}>{fmtDisplayDate(filing.reporting_period.due_date)}</div>
              </div>
            )}
            <div style={{
              padding: "8px 10px", borderRadius: 6,
              background: days < 14 ? T.errorBg : days < 30 ? T.warnBg : T.appBg,
              border: `1px solid ${days < 14 ? T.errorBorder : days < 30 ? T.warnBorder : T.border}`,
            }}>
              <div style={{ ...SANS, fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Days remaining</div>
              <div style={{
                ...MONO, fontSize: 18, fontWeight: 700,
                color: days < 14 ? T.errorBase : days < 30 ? T.warnBase : T.textPrimary,
              }}>
                {days > 0 ? days : 0}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3 — Filer identity */}
        <Card
          title="Filer Identity"
          accessory={<span style={{ ...SANS, fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>read-only</span>}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FieldLabel>Legal name</FieldLabel>
                <div style={{ ...SANS, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                  {filing.filer_identity.legal_name}
                </div>
              </div>
              <div>
                <FieldLabel>Contact</FieldLabel>
                <div style={readonlyVal}>{filing.filer_identity.contact}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {([
                ["CIK",         filing.filer_identity.cik],
                ["File number", filing.filer_identity.file_number],
                ["LEI",         filing.filer_identity.lei],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <FieldLabel>{label}</FieldLabel>
                  <div style={{ ...MONO, fontSize: 11, color: T.textPrimary }}>{value || "—"}</div>
                </div>
              ))}
            </div>
            <div>
              <FieldLabel>Address</FieldLabel>
              <div style={{ ...SANS, fontSize: 12, color: T.textMuted }}>
                {filing.filer_identity.address}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 4 — Source systems */}
        <Card title="Source Systems Connected">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SOURCE_SYSTEMS.map(sys => {
              const ok = sys.status === "connected";
              return (
                <div
                  key={sys.name}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 6,
                    border: `1px solid ${ok ? T.okBorder : T.warnBorder}`,
                    background: ok ? T.okBg : T.warnBg,
                  }}
                >
                  <span style={{ ...SANS, fontSize: 13, color: T.textPrimary }}>{sys.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: ok ? T.okBase : T.warnBase,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      ...SANS, fontSize: 11, fontWeight: 700,
                      color: ok ? T.okBase : T.warnBase,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {(sys as any).note ? `Warning — ${(sys as any).note}` : "Connected"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
