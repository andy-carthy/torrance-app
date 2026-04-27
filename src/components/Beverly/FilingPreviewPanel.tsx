import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { Card, FieldLabel } from '../primitives/Card';
import type { FilingEnvelope, FormPF, FieldValue, PFSection } from '../../types/filing';
import type { FormNPort, Holding, Derivative } from '../../types/formNPort';

interface Props {
  filing: FilingEnvelope;
  payload: FormPF | FormNPort;
  showOverrides: boolean;
  showLineage: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtM(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${m}/${d}/${y}`;
}

function sectionStatusStyle(status: PFSection["section_status"]): React.CSSProperties {
  if (status === "complete")        return { background: T.okBg,   color: T.okBase,   border: `1px solid ${T.okBorder}` };
  if (status === "not_applicable")  return { background: T.cardBg, color: T.textMuted, border: `1px solid ${T.border}` };
  return { background: T.warnBg, color: T.warnBase, border: `1px solid ${T.warnBorder}` };
}

function validationDotColor(vs: FieldValue["validation_status"]): string {
  if (vs === "fail") return T.errorBase;
  if (vs === "warn") return T.warnBase;
  if (vs === "pass") return T.okBase;
  return T.border;
}

// Level 3 fair value assets always warrant scrutiny; large principal/value discrepancies too.
function holdingHasError(h: Holding): boolean {
  return h.fair_value_level === "3" ||
    (h.principal_amount > 0 && Math.abs(h.value - h.principal_amount) / h.principal_amount > 0.15);
}

function getIdentifier(h: Holding): string {
  const id = h.identifier;
  if (id.cusip)  return `CUSIP ${id.cusip}`;
  if (id.isin)   return `ISIN ${id.isin}`;
  if (id.ticker) return id.ticker;
  if (id.other)  return id.other ?? "—";
  return "—";
}

// ── Lineage Tooltip ───────────────────────────────────────────────────────────

function LineageTooltip({ field }: { field: FieldValue }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        ...MONO,
        fontSize: 9, fontWeight: 700,
        padding: "1px 5px", borderRadius: 3,
        background: T.aiBg, color: T.aiBase,
        border: `1px solid ${T.aiBorder}`,
        cursor: "default", letterSpacing: "0.05em",
      }}>
        LINEAGE
      </span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: T.navyHeader, color: "#e2e8f0",
          borderRadius: 6, padding: "8px 11px",
          width: 248, zIndex: 100,
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          pointerEvents: "none",
          ...MONO, fontSize: 10, lineHeight: 1.75,
        }}>
          <div style={{
            marginBottom: 5, paddingBottom: 4,
            borderBottom: "1px solid #1e293b",
            color: "#64748b", letterSpacing: "0.07em",
            fontWeight: 700, textTransform: "uppercase",
          }}>
            Lineage
          </div>
          <div><span style={{ color: "#475569" }}>source_record  </span>{field.source_record_id || "—"}</div>
          <div><span style={{ color: "#475569" }}>calc_method    </span>{field.calculation_method || "—"}</div>
          <div><span style={{ color: "#475569" }}>last_updated   </span>{fmtDate(field.last_updated_at)}</div>
        </div>
      )}
    </span>
  );
}

// ── Field Row ─────────────────────────────────────────────────────────────────

function FieldRow({ field, showOverrides, showLineage }: {
  field: FieldValue;
  showOverrides: boolean;
  showLineage: boolean;
}) {
  const isOverridden = showOverrides && !!field.override_reason;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start",
      justifyContent: "space-between",
      padding: "7px 10px", borderRadius: 5, marginBottom: 2,
      background: isOverridden ? T.warnBg : "transparent",
      borderLeft: `3px solid ${isOverridden ? T.warnBase : "transparent"}`,
    }}>
      {/* Label + optional override reason */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...SANS, fontSize: 11, fontWeight: 600, color: T.textMuted }}>
          {field.label}
        </div>
        {isOverridden && (
          <div style={{ ...SANS, fontSize: 10, color: T.warnBase, fontStyle: "italic", marginTop: 2 }}>
            Override: {field.override_reason}
          </div>
        )}
      </div>

      {/* Value + source badge + lineage */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, marginLeft: 12 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: validationDotColor(field.validation_status),
        }} />
        <span style={{ ...MONO, fontSize: 12, fontWeight: 500, color: T.textPrimary }}>
          {field.display_value || "—"}
        </span>
        {field.source_system && (
          <span style={{
            ...MONO, fontSize: 9, fontWeight: 700,
            padding: "1px 5px", borderRadius: 3,
            background: T.cardBg, color: T.textMuted,
            border: `1px solid ${T.border}`,
            letterSpacing: "0.04em",
          }}>
            {field.source_system}
          </span>
        )}
        {showLineage && <LineageTooltip field={field} />}
      </div>
    </div>
  );
}

// ── Section Accordion (Form PF) ───────────────────────────────────────────────

const SECTION_DEFS = [
  { id: "1a", name: "Identifying Information" },
  { id: "1b", name: "Assets Under Management" },
  { id: "1c", name: "Reporting Position" },
  { id: "2",  name: "Hedge Fund Information" },
  { id: "3",  name: "Liquidity Fund Information" },
  { id: "4",  name: "Private Equity Fund Information" },
  { id: "5",  name: "Large Hedge Fund Information" },
];

function SectionAccordion({ section, showOverrides, showLineage }: {
  section: PFSection;
  showOverrides: boolean;
  showLineage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const st = section.section_status;
  const isNA = st === "not_applicable";
  const sstyle = sectionStatusStyle(st);

  return (
    <div style={{
      border: `1px solid ${T.border}`,
      borderRadius: 7, marginBottom: 6,
      overflow: "hidden",
      opacity: isNA ? 0.55 : 1,
    }}>
      {/* Header */}
      <div
        onClick={() => !isNA && setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          background: open ? T.appBg : T.cardBg,
          cursor: isNA ? "default" : "pointer",
          userSelect: "none",
          borderBottom: open ? `1px solid ${T.border}` : "none",
        }}
      >
        {/* Left: chevron + section id + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isNA && (
            <span style={{
              ...MONO, fontSize: 9, color: T.textMuted,
              display: "inline-block",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              width: 10, textAlign: "center",
            }}>
              ▶
            </span>
          )}
          <span style={{
            ...MONO, fontSize: 10, fontWeight: 700,
            padding: "2px 7px", borderRadius: 4,
            background: T.actionBg, color: T.actionBase,
            border: `1px solid ${T.aiBorder}`,
            letterSpacing: "0.05em",
          }}>
            {section.section_id.toUpperCase()}
          </span>
          <span style={{ ...SANS, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
            {section.section_name}
          </span>
        </div>

        {/* Right: applicability badge + status badge + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            ...MONO, fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 3,
            textTransform: "uppercase", letterSpacing: "0.06em",
            background: section.applicability === "always" ? T.okBg : T.warnBg,
            color:      section.applicability === "always" ? T.okBase : T.warnBase,
            border: `1px solid ${section.applicability === "always" ? T.okBorder : T.warnBorder}`,
          }}>
            {section.applicability}
          </span>
          <span style={{
            ...MONO, fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 3,
            textTransform: "uppercase", letterSpacing: "0.06em",
            ...sstyle,
          }}>
            {st.replace(/_/g, " ")}
          </span>
          {section.items.length > 0 && (
            <span style={{ ...MONO, fontSize: 10, color: T.textMuted }}>
              {section.items.length} field{section.items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: "6px 8px 4px", background: T.cardBg }} className="slide-in">
          {section.items.length === 0 ? (
            <div style={{ ...SANS, fontSize: 12, color: T.textMuted, padding: "10px 4px", fontStyle: "italic" }}>
              No field data available for this section.
            </div>
          ) : (
            section.items.map(field => (
              <FieldRow
                key={field.field_path}
                field={field}
                showOverrides={showOverrides}
                showLineage={showLineage}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Form PF View ──────────────────────────────────────────────────────────────

function FormPFView({ payload, showOverrides, showLineage }: {
  payload: FormPF;
  showOverrides: boolean;
  showLineage: boolean;
}) {
  const sections: PFSection[] = payload.sections.length > 0
    ? payload.sections
    : SECTION_DEFS.map(def => ({
        section_id: def.id,
        section_name: def.name,
        applicability: "always" as const,
        applicable_to: [],
        items: [],
        section_status: "incomplete" as const,
      }));

  const dm = payload.derived_metrics;
  const att = payload.attestations;

  return (
    <>
      {/* ── Sections ────────────────────────── */}
      <Card title="Form PF Sections">
        {sections.map(sec => (
          <SectionAccordion
            key={sec.section_id}
            section={sec}
            showOverrides={showOverrides}
            showLineage={showLineage}
          />
        ))}
      </Card>

      {/* ── Derived Metrics ─────────────────── */}
      <Card title="Derived Metrics">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {([
            ["Aggregate Private Fund AUM", fmtM(dm.aggregate_private_fund_aum)],
            ["Hedge Fund AUM",             fmtM(dm.hedge_fund_aum)],
            ["Liquidity Fund AUM",         fmtM(dm.liquidity_fund_aum)],
            ["Private Equity Fund AUM",    fmtM(dm.private_equity_fund_aum)],
            ["Net Exposure",               fmtM(dm.net_exposure)],
            ["Gross Exposure",             fmtM(dm.gross_exposure)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} style={{
              padding: "10px 12px", borderRadius: 6,
              background: T.appBg, border: `1px solid ${T.border}`,
            }}>
              <FieldLabel>{label}</FieldLabel>
              <div style={{ ...MONO, fontSize: 15, fontWeight: 700, color: T.textPrimary }}>
                {value}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 10, padding: "9px 12px", borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: dm.counterparty_concentration > 25 ? T.warnBg : T.appBg,
          border: `1px solid ${dm.counterparty_concentration > 25 ? T.warnBorder : T.border}`,
        }}>
          <span style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.textMuted }}>
            Counterparty Concentration
          </span>
          <span style={{
            ...MONO, fontSize: 14, fontWeight: 700,
            color: dm.counterparty_concentration > 25 ? T.warnBase : T.textPrimary,
          }}>
            {fmtPct(dm.counterparty_concentration)}
          </span>
        </div>
      </Card>

      {/* ── Attestations ────────────────────── */}
      <Card
        title="Attestations"
        accessory={
          <span style={{
            ...MONO, fontSize: 9, fontWeight: 700,
            padding: "2px 7px", borderRadius: 3,
            letterSpacing: "0.06em", textTransform: "uppercase",
            background: att.signed_off ? T.okBg : T.warnBg,
            color:      att.signed_off ? T.okBase : T.warnBase,
            border: `1px solid ${att.signed_off ? T.okBorder : T.warnBorder}`,
          } as React.CSSProperties}>
            {att.signed_off ? "SIGNED OFF" : "PENDING"}
          </span>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Prepared By</FieldLabel>
              <div style={{ ...SANS, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                {att.prepared_by || "—"}
              </div>
            </div>
            <div>
              <FieldLabel>Approved By</FieldLabel>
              <div style={{ ...SANS, fontSize: 13, fontWeight: 600, color: att.approved_by ? T.textPrimary : T.textMuted }}>
                {att.approved_by || "Awaiting approval"}
              </div>
            </div>
            <div>
              <FieldLabel>Date Approved</FieldLabel>
              <div style={{ ...SANS, fontSize: 13, color: att.date_approved ? T.textPrimary : T.textMuted }}>
                {att.date_approved ? fmtDate(att.date_approved) : "—"}
              </div>
            </div>
          </div>

          <div style={{
            padding: "10px 12px", borderRadius: 6,
            background: T.appBg, border: `1px solid ${T.border}`,
            ...SANS, fontSize: 12, color: T.textMuted, lineHeight: 1.65, fontStyle: "italic",
          }}>
            {att.attestation_text}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <input type="checkbox" checked={att.signed_off} readOnly onChange={() => {}} />
            <span style={{ ...SANS, fontSize: 13, color: T.textPrimary, fontWeight: att.signed_off ? 600 : 400 }}>
              {att.signed_off ? "Attestation signed off" : "Attestation not yet signed"}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}

// ── Liquidity Bar ─────────────────────────────────────────────────────────────

function LiquidityBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ ...SANS, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{label}</span>
        <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color }}>{fmtPct(pct)}</span>
      </div>
      <div style={{ height: 9, borderRadius: 5, background: T.border, overflow: "hidden" }}>
        <div
          className="bar-grow"
          style={{
            height: "100%", borderRadius: 5,
            width: `${Math.min(pct, 100)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

// ── Form N-PORT View ──────────────────────────────────────────────────────────

const ASSET_COLOR: Record<string, string> = {
  equity: T.catAsset, debt: T.okBase, derivative: T.catCap,
  repo: T.textMuted, cash: T.okBase, loan: T.warnBase, other: T.textMuted,
};

const LIQ_BUCKET_LABEL: Record<string, string> = {
  "1": "≤1 day", "2": "2–7 days", "3": "8–30 days", "4": ">30 days",
};

const FVL_LABEL: Record<string, string> = { "1": "L1", "2": "L2", "3": "L3" };

const TH: React.CSSProperties = {
  ...SANS, fontSize: 10, fontWeight: 700,
  color: T.textMuted, letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "7px 10px",
  background: T.appBg,
  borderBottom: `1px solid ${T.border}`,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  ...MONO, fontSize: 11, color: T.textPrimary,
  padding: "7px 10px",
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: "top",
};

function FormNPortView({ payload }: {
  payload: FormNPort;
}) {
  const reg     = payload.registrant;
  const series  = payload.series[0];
  const liq     = payload.liquidity;
  const risk    = payload.risk;

  return (
    <>
      {/* ── Registrant ──────────────────────── */}
      <Card title="Registrant">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Legal Name</FieldLabel>
              <div style={{ ...SANS, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                {reg.legal_name}
              </div>
            </div>
            <div>
              <FieldLabel>Reporting Period End</FieldLabel>
              <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                {fmtDate(reg.reporting_period_end)}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {([
              ["CIK",    reg.cik],
              ["LEI",    reg.lei],
              ["Series", series?.series_name ?? reg.series_id],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <FieldLabel>{label}</FieldLabel>
                <div style={{ ...MONO, fontSize: 11, color: T.textPrimary }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Holdings Grid ───────────────────── */}
      <Card title={`Holdings  (${payload.holdings.length})`} flush>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Identifier", "Asset Type", "Issuer", "Country", "Currency",
                  "Value", "% Net Assets", "Liquidity", "FV Level"].map(col => (
                  <th key={col} style={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.holdings.map(h => {
                const hasErr  = holdingHasError(h);
                const aColor  = ASSET_COLOR[h.asset_type] ?? T.textMuted;
                return (
                  <tr key={h.holding_id} className="tbl-row">
                    {/* Name — first cell carries the error border */}
                    <td style={{
                      ...TD, fontFamily: SANS.fontFamily,
                      maxWidth: 160, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                      borderLeft: hasErr
                        ? `3px solid ${T.errorBase}`
                        : "3px solid transparent",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{h.name}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{h.title}</div>
                    </td>

                    <td style={{ ...TD, fontSize: 10, whiteSpace: "nowrap" }}>
                      {getIdentifier(h)}
                    </td>

                    <td style={TD}>
                      <span style={{
                        ...MONO, fontSize: 9, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 3,
                        background: `${aColor}18`, color: aColor,
                        border: `1px solid ${aColor}44`,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {h.asset_type}
                      </span>
                    </td>

                    <td style={{
                      ...TD, fontFamily: SANS.fontFamily,
                      fontSize: 11, maxWidth: 130,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {h.issuer}
                    </td>

                    <td style={{ ...TD, textAlign: "center" }}>{h.country}</td>
                    <td style={{ ...TD, textAlign: "center" }}>{h.currency}</td>

                    <td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>
                      {fmtM(h.value)}
                    </td>

                    <td style={{ ...TD, textAlign: "right" }}>
                      {fmtPct(h.pct_net_assets)}
                    </td>

                    <td style={{ ...TD, textAlign: "center" }}>
                      <span style={{
                        ...MONO, fontSize: 9, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 3,
                        background: h.liquidity_classification === "4" ? T.warnBg : T.appBg,
                        color:      h.liquidity_classification === "4" ? T.warnBase : T.textMuted,
                        border: `1px solid ${h.liquidity_classification === "4" ? T.warnBorder : T.border}`,
                      }}>
                        {LIQ_BUCKET_LABEL[h.liquidity_classification]}
                      </span>
                    </td>

                    <td style={{ ...TD, textAlign: "center" }}>
                      <span style={{
                        ...MONO, fontSize: 9, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 3,
                        background: h.fair_value_level === "3" ? T.errorBg  : T.appBg,
                        color:      h.fair_value_level === "3" ? T.errorBase : T.textMuted,
                        border: `1px solid ${h.fair_value_level === "3" ? T.errorBorder : T.border}`,
                      }}>
                        {FVL_LABEL[h.fair_value_level]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Derivatives ─────────────────────── */}
      <Card title={`Derivatives  (${payload.derivatives.length})`} flush>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Instrument Type", "Underlying", "Notional", "Market Value", "Counterparty"].map(col => (
                <th key={col} style={TH}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.derivatives.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...TD, fontFamily: SANS.fontFamily, fontSize: 12, color: T.textMuted, fontStyle: "italic" }}>
                  No derivatives reported.
                </td>
              </tr>
            ) : payload.derivatives.map(d => (
              <tr key={d.derivative_id} className="tbl-row">
                <td style={TD}>
                  <span style={{
                    ...MONO, fontSize: 9, fontWeight: 700,
                    padding: "1px 5px", borderRadius: 3,
                    background: T.actionBg, color: T.actionBase,
                    border: `1px solid ${T.aiBorder}`,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {d.instrument_type}
                  </span>
                </td>
                <td style={{ ...TD, fontFamily: SANS.fontFamily, fontSize: 12, color: T.textPrimary }}>
                  {d.underlying}
                </td>
                <td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>
                  {fmtM(d.notional)}
                </td>
                <td style={{ ...TD, textAlign: "right", color: d.market_value >= 0 ? T.okBase : T.errorBase, fontWeight: 600 }}>
                  {fmtM(d.market_value)}
                </td>
                <td style={{ ...TD, fontFamily: SANS.fontFamily, fontSize: 11, color: T.textMuted }}>
                  {d.counterparty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── Liquidity Profile ───────────────── */}
      <Card title="Liquidity Profile">
        <LiquidityBar label="≤ 1 Day  (Highly Liquid)"  pct={liq.bucket_1_day}      color={T.okBase} />
        <LiquidityBar label="2 – 7 Days"                pct={liq.bucket_2_7_days}   color={T.okBase} />
        <LiquidityBar label="8 – 30 Days"               pct={liq.bucket_8_30_days}  color={T.warnBase} />
        <LiquidityBar label="> 30 Days  (Less Liquid)"  pct={liq.bucket_gt_30_days} color={T.errorBase} />
        <div style={{
          marginTop: 12, padding: "9px 12px", borderRadius: 6,
          background: T.appBg, border: `1px solid ${T.border}`,
          display: "flex", gap: 28,
        }}>
          <div>
            <FieldLabel>Illiquid %</FieldLabel>
            <span style={{
              ...MONO, fontSize: 13, fontWeight: 700,
              color: liq.illiquid_percentage > 15 ? T.errorBase : T.textPrimary,
            }}>
              {fmtPct(liq.illiquid_percentage)}
            </span>
          </div>
          <div>
            <FieldLabel>Highly Liquid Minimum</FieldLabel>
            <span style={{ ...MONO, fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
              {fmtPct(liq.highly_liquid_investment_minimum)}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Risk Metrics ────────────────────── */}
      <Card title="Risk Metrics">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {([
            ["Value at Risk (VaR)",   fmtPct(risk.VaR * 100),              risk.VaR > 0.03],
            ["Stress Test Return",    fmtPct(risk.stress_test * 100),       risk.stress_test < -0.1],
            ["Top-10 Concentration", fmtPct(risk.concentration_top10),     risk.concentration_top10 > 30],
            ["Derivative Exposure",   fmtPct(risk.derivative_exposure),     risk.derivative_exposure > 10],
          ] as [string, string, boolean][]).map(([label, value, warn]) => (
            <div key={label} style={{
              padding: "11px 13px", borderRadius: 6,
              background: warn ? T.warnBg : T.appBg,
              border: `1px solid ${warn ? T.warnBorder : T.border}`,
            }}>
              <FieldLabel>{label}</FieldLabel>
              <div style={{ ...MONO, fontSize: 16, fontWeight: 700, color: warn ? T.warnBase : T.textPrimary }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Notes ───────────────────────────── */}
      {payload.notes.length > 0 && (
        <Card title={`Notes  (${payload.notes.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {payload.notes.map(note => (
              <div key={note.note_id} style={{
                padding: "10px 12px", borderRadius: 6,
                border: `1px solid ${T.border}`, background: T.appBg,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    ...MONO, fontSize: 9, fontWeight: 700,
                    padding: "2px 6px", borderRadius: 3,
                    background: T.actionBg, color: T.actionBase,
                    border: `1px solid ${T.aiBorder}`,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {note.topic}
                  </span>
                  <span style={{ ...MONO, fontSize: 9, color: T.textMuted }}>
                    {note.note_id}
                  </span>
                </div>
                <div style={{ ...SANS, fontSize: 12, color: T.textPrimary, lineHeight: 1.65 }}>
                  {note.text}
                </div>
                {note.related_field_paths.length > 0 && (
                  <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {note.related_field_paths.map(fp => (
                      <span key={fp} style={{
                        ...MONO, fontSize: 9,
                        padding: "1px 5px", borderRadius: 3,
                        background: T.cardBg, color: T.textMuted,
                        border: `1px solid ${T.border}`,
                      }}>
                        {fp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function FilingPreviewPanel({ filing, payload, showOverrides, showLineage }: Props) {
  const isFormPF = filing.filing_type === "FORM_PF";
  return (
    <div style={{ ...SANS, padding: "20px", maxWidth: 1100 }}>
      {isFormPF
        ? <FormPFView
            payload={payload as FormPF}
            showOverrides={showOverrides}
            showLineage={showLineage}
          />
        : <FormNPortView
            payload={payload as FormNPort}
          />
      }
    </div>
  );
}
