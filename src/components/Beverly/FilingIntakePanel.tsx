import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { Card, FieldLabel } from '../primitives/Card';
import type { FilingEnvelope, FilingType } from '../../types/filing';
import { mockFormPFFiling, mockFormNPortFiling } from '../../data/mockFilings';

interface Props {
  onFilingSelected: (filing: FilingEnvelope) => void;
}

type SourceSystem = { name: string; status: "connected" | "warning"; note?: string };

const SOURCE_SYSTEMS: SourceSystem[] = [
  { name: "General Ledger",  status: "connected" },
  { name: "Transfer Agent",  status: "connected" },
  { name: "Pricing Vendor",  status: "warning", note: "Stale data" },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function FilingIntakePanel({ onFilingSelected }: Props) {
  const [filingType, setFilingType]     = useState<FilingType>("FORM_PF");
  const [startDate,  setStartDate]      = useState(mockFormPFFiling.reporting_period.start_date);
  const [endDate,    setEndDate]        = useState(mockFormPFFiling.reporting_period.end_date);
  const [isAmendment, setIsAmendment]   = useState(false);

  const activeMock = filingType === "FORM_PF" ? mockFormPFFiling : mockFormNPortFiling;

  function handleTypeChange(type: FilingType) {
    const mock = type === "FORM_PF" ? mockFormPFFiling : mockFormNPortFiling;
    setFilingType(type);
    setStartDate(mock.reporting_period.start_date);
    setEndDate(mock.reporting_period.end_date);
  }

  const dueDays    = filingType === "FORM_PF" ? 60 : 30;
  const estDueDate = endDate ? addDays(endDate, dueDays) : null;

  function handleLoad() {
    onFilingSelected({
      ...activeMock,
      amendment_indicator: isAmendment,
      reporting_period: {
        ...activeMock.reporting_period,
        start_date: startDate,
        end_date:   endDate,
      },
    });
  }

  const dateInputStyle: React.CSSProperties = {
    ...SANS,
    width: "100%",
    padding: "9px 11px",
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    fontSize: 13,
    background: T.cardBg,
    color: T.textPrimary,
    outline: "none",
  };

  return (
    <div style={{ ...SANS, padding: "20px", maxWidth: 640 }}>

      {/* ── Filing Type ─────────────────────────── */}
      <Card title="Filing Type">
        <div style={{ display: "flex", gap: 10 }}>
          {(["FORM_PF", "FORM_N_PORT"] as FilingType[]).map(type => {
            const sel   = filingType === type;
            const label = type === "FORM_PF" ? "Form PF" : "Form N-PORT";
            return (
              <label
                key={type}
                className="radio-opt"
                style={{
                  display: "flex", alignItems: "center", gap: 9, flex: 1,
                  padding: "11px 14px", borderRadius: 7, cursor: "pointer",
                  border:     `1px solid ${sel ? T.actionBase : T.border}`,
                  background: sel ? T.actionBg : T.cardBg,
                  boxShadow:  sel ? "0 1px 3px rgba(79,70,229,0.1)" : "none",
                }}
              >
                <input
                  type="radio"
                  name="filingType"
                  value={type}
                  checked={sel}
                  onChange={() => handleTypeChange(type)}
                  style={{ flexShrink: 0 }}
                />
                <span style={{
                  ...SANS,
                  fontSize:   13,
                  fontWeight: sel ? 700 : 500,
                  color:      sel ? T.actionBase : T.textPrimary,
                }}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </Card>

      {/* ── Reporting Period ─────────────────────── */}
      <Card title="Reporting Period">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel required>Start Date</FieldLabel>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={dateInputStyle}
            />
          </div>
          <div>
            <FieldLabel required>End Date</FieldLabel>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={dateInputStyle}
            />
          </div>
        </div>
      </Card>

      {/* ── Amendment ────────────────────────────── */}
      <Card
        title="Amendment"
        accessory={
          isAmendment ? (
            <span style={{
              ...MONO,
              fontSize: 10, fontWeight: 700,
              padding: "2px 7px", borderRadius: 4,
              background: T.warnBg, color: T.warnBase,
              border: `1px solid ${T.warnBorder}`,
              letterSpacing: "0.06em",
            }}>
              AMENDMENT
            </span>
          ) : null
        }
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ ...SANS, fontSize: 13, fontWeight: 500, color: T.textPrimary }}>
              Amendment Filing
            </div>
            <div style={{ ...SANS, fontSize: 12, color: T.textMuted, marginTop: 3 }}>
              Mark if this is a corrective re-submission of a prior filing
            </div>
          </div>
          <div
            role="switch"
            aria-checked={isAmendment}
            onClick={() => setIsAmendment(v => !v)}
            style={{ cursor: "pointer", flexShrink: 0, marginLeft: 20 }}
          >
            <div style={{
              width: 36, height: 20, borderRadius: 10,
              background: isAmendment ? T.actionBase : T.border,
              position: "relative", transition: "background 0.2s",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: "#fff",
                position: "absolute", top: 2,
                left: isAmendment ? 18 : 2,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Filer Identity ───────────────────────── */}
      <Card
        title="Filer Identity"
        accessory={
          <span style={{ ...SANS, fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>
            read-only
          </span>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Legal Name</FieldLabel>
              <div style={{ ...SANS, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                {activeMock.filer_identity.legal_name}
              </div>
            </div>
            <div>
              <FieldLabel>Contact</FieldLabel>
              <div style={{ ...SANS, fontSize: 13, color: T.textPrimary }}>
                {activeMock.filer_identity.contact}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "CIK",         value: activeMock.filer_identity.cik },
              { label: "File Number", value: activeMock.filer_identity.file_number },
              { label: "LEI",         value: activeMock.filer_identity.lei },
            ].map(({ label, value }) => (
              <div key={label}>
                <FieldLabel>{label}</FieldLabel>
                <div style={{ ...MONO, fontSize: 11, color: T.textPrimary }}>{value}</div>
              </div>
            ))}
          </div>

          <div>
            <FieldLabel>Address</FieldLabel>
            <div style={{ ...SANS, fontSize: 12, color: T.textMuted }}>
              {activeMock.filer_identity.address}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Source Systems ───────────────────────── */}
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
                  border:     `1px solid ${ok ? T.okBorder  : T.warnBorder}`,
                  background: ok ? T.okBg : T.warnBg,
                }}
              >
                <span style={{ ...SANS, fontSize: 13, color: T.textPrimary }}>
                  {sys.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: ok ? T.okBase : T.warnBase,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    ...SANS, fontSize: 11, fontWeight: 700,
                    color:          ok ? T.okBase : T.warnBase,
                    textTransform:  "uppercase",
                    letterSpacing:  "0.05em",
                  }}>
                    {sys.note ? `Warning — ${sys.note}` : "Connected"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Footer: Est. Due Date + Load Button ──── */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...SANS, fontSize: 12, color: T.textMuted, fontWeight: 600 }}>
            Est. Due Date
          </span>
          {estDueDate && (
            <span style={{
              ...MONO, fontSize: 12, fontWeight: 700,
              padding: "3px 9px", borderRadius: 5,
              background: T.actionBg, color: T.actionBase,
              border: `1px solid ${T.aiBorder}`,
            }}>
              {fmtDisplayDate(estDueDate)}
            </span>
          )}
          <span style={{ ...SANS, fontSize: 11, color: T.textMuted }}>
            (+{dueDays} days from period end)
          </span>
        </div>
        <button
          onClick={handleLoad}
          className="ai-btn"
          style={{
            ...SANS, fontSize: 13, fontWeight: 700,
            padding: "10px 22px", borderRadius: 7,
            border: "none",
            background: T.actionBase, color: "#fff",
            cursor: "pointer",
          }}
        >
          Load Filing →
        </button>
      </div>

    </div>
  );
}
