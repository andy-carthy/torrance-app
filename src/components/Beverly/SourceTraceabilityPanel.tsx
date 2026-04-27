import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { FieldValue } from '../../types/filing';

interface Props {
  fields: FieldValue[];
}

type ValidationStatusFilter = "all" | FieldValue["validation_status"];

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function fmtShort(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

function validationStatusStyle(status: FieldValue["validation_status"]): React.CSSProperties {
  if (status === "fail") return { background: T.errorBg, color: T.errorBase, border: `1px solid ${T.errorBorder}` };
  if (status === "warn") return { background: T.warnBg,  color: T.warnBase,  border: `1px solid ${T.warnBorder}`  };
  if (status === "pass") return { background: T.okBg,    color: T.okBase,    border: `1px solid ${T.okBorder}`    };
  return { background: T.appBg, color: T.textMuted, border: `1px solid ${T.border}` };
}

const LINEAGE_STEPS = [
  { label: "Source System",  icon: "●", offsetMs: -86400000 * 2 },
  { label: "Transformation", icon: "→", offsetMs: -86400000     },
  { label: "Derived Layer",  icon: "◆", offsetMs: -3600000      },
  { label: "Form Field",     icon: "■", offsetMs: 0              },
];

function LineageTimeline({ field }: { field: FieldValue }) {
  const baseTime = field.last_updated_at
    ? new Date(field.last_updated_at).getTime()
    : Date.now();

  return (
    <div style={{
      padding: "12px 14px",
      background: T.aiBg, border: `1px solid ${T.aiBorder}`,
      borderRadius: 6, marginTop: 8,
    }}>
      <div style={{
        ...SANS, fontSize: 10, fontWeight: 700,
        color: T.aiBase, marginBottom: 10,
        textTransform: "uppercase", letterSpacing: "0.07em",
      }}>
        Data Lineage
      </div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {LINEAGE_STEPS.map((step, i) => {
          const isLast = i === LINEAGE_STEPS.length - 1;
          const ts = fmtShort(baseTime + step.offsetMs);
          return (
            <React.Fragment key={step.label}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto", width: 80 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: isLast ? T.aiBase : T.cardBg,
                  border: `2px solid ${T.aiBase}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13,
                  color: isLast ? "#fff" : T.aiBase,
                  fontWeight: 700,
                }}>
                  {step.icon}
                </div>
                <div style={{
                  ...SANS, fontSize: 9, fontWeight: 700,
                  color: T.aiBase, textAlign: "center", lineHeight: 1.3,
                }}>
                  {step.label}
                </div>
                <div style={{ ...MONO, fontSize: 8, color: T.textMuted, textAlign: "center", lineHeight: 1.3 }}>
                  {ts}
                </div>
              </div>
              {!isLast && (
                <div style={{
                  flex: 1, height: 2,
                  background: `linear-gradient(90deg, ${T.aiBase}, ${T.aiBorder})`,
                  marginTop: 16,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function FieldRow({ field }: { field: FieldValue }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: `1px solid ${T.border}`,
      borderRadius: 7, marginBottom: 8,
      background: T.cardBg, overflow: "hidden",
    }}>
      <div style={{ padding: "10px 14px" }}>
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 10, marginBottom: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...SANS, fontSize: 12, fontWeight: 700,
              color: T.textPrimary, marginBottom: 4,
            }}>
              {field.label}
            </div>
            <span style={{
              ...MONO, fontSize: 9,
              padding: "1px 6px", borderRadius: 4,
              background: T.appBg, border: `1px solid ${T.border}`,
              color: T.textPrimary,
            }}>
              {field.field_path}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{
              ...MONO, fontSize: 9, fontWeight: 700,
              padding: "1px 6px", borderRadius: 3,
              ...validationStatusStyle(field.validation_status),
            }}>
              {field.validation_status.toUpperCase().replace("_", " ")}
            </span>
            <span style={{
              ...MONO, fontSize: 9, fontWeight: 600,
              padding: "1px 6px", borderRadius: 3,
              background: T.aiBg, color: T.aiBase,
              border: `1px solid ${T.aiBorder}`,
            }}>
              {field.source_system || "—"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 8 }}>
          {(
            [
              { heading: "Value",         val: field.display_value || "—",    font: MONO },
              { heading: "Source Record", val: field.source_record_id || "—", font: MONO },
              { heading: "Source Field",  val: field.source_field || "—",     font: MONO },
              { heading: "Calc Method",   val: field.calculation_method || "—", font: MONO },
              { heading: "Reviewer",      val: field.reviewer || "—",         font: SANS },
              { heading: "Updated",       val: fmtDateTime(field.last_updated_at), font: MONO },
            ] as { heading: string; val: string; font: typeof MONO }[]
          ).map(({ heading, val, font }) => (
            <div key={heading}>
              <div style={{
                ...SANS, fontSize: 9, fontWeight: 700,
                color: T.textMuted, textTransform: "uppercase",
                letterSpacing: "0.06em", marginBottom: 2,
              }}>
                {heading}
              </div>
              <div style={{ ...font, fontSize: 11, color: T.textPrimary }}>{val}</div>
            </div>
          ))}
        </div>

        {field.override_reason && (
          <div style={{
            ...SANS, fontSize: 11,
            padding: "4px 8px", borderRadius: 4,
            background: T.warnBg, color: T.warnBase,
            border: `1px solid ${T.warnBorder}`,
            marginBottom: 8,
          }}>
            <span style={{ fontWeight: 700 }}>Override: </span>
            {field.override_reason}
          </div>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            ...SANS, fontSize: 10, fontWeight: 600,
            padding: "3px 8px", borderRadius: 4, cursor: "pointer",
            background: T.aiBg, color: T.aiBase,
            border: `1px solid ${T.aiBorder}`,
          }}
        >
          {expanded ? "▲ Hide Lineage" : "▼ View Lineage"}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 12px" }}>
          <LineageTimeline field={field} />
        </div>
      )}
    </div>
  );
}

export function SourceTraceabilityPanel({ fields }: Props) {
  const [search, setSearch]             = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<ValidationStatusFilter>("all");

  const sourceSystems = useMemo(() => {
    const systems = new Set(fields.map(f => f.source_system).filter(Boolean));
    return ["all", ...Array.from(systems)];
  }, [fields]);

  const filtered = useMemo(() => {
    return fields.filter(f => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        f.label.toLowerCase().includes(q) ||
        f.field_path.toLowerCase().includes(q);
      const matchSource = sourceFilter === "all" || f.source_system === sourceFilter;
      const matchStatus = statusFilter === "all" || f.validation_status === statusFilter;
      return matchSearch && matchSource && matchStatus;
    });
  }, [fields, search, sourceFilter, statusFilter]);

  const statusOptions: { value: ValidationStatusFilter; label: string }[] = [
    { value: "all",            label: "All"  },
    { value: "pass",           label: "Pass" },
    { value: "warn",           label: "Warn" },
    { value: "fail",           label: "Fail" },
    { value: "not_applicable", label: "N/A"  },
  ];

  return (
    <div style={{ ...SANS, color: T.textPrimary }}>
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        padding: "10px 14px",
        background: T.appBg, border: `1px solid ${T.border}`,
        borderRadius: 8, marginBottom: 12,
      }}>
        <input
          type="text"
          placeholder="Search fields…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...SANS, fontSize: 12,
            padding: "6px 10px", borderRadius: 5,
            border: `1px solid ${T.border}`,
            background: T.cardBg, color: T.textPrimary,
            outline: "none", minWidth: 160,
          }}
        />

        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          style={{
            ...SANS, fontSize: 12,
            padding: "6px 10px", borderRadius: 5,
            border: `1px solid ${T.border}`,
            background: T.cardBg, color: T.textPrimary,
            cursor: "pointer",
          }}
        >
          {sourceSystems.map(s => (
            <option key={s} value={s}>{s === "all" ? "All Sources" : s}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {statusOptions.map(opt => {
            const active = statusFilter === opt.value;
            return (
              <label
                key={opt.value}
                className="radio-opt"
                style={{
                  ...SANS, fontSize: 11, fontWeight: active ? 700 : 500,
                  padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                  background: active ? T.actionBg : T.cardBg,
                  color: active ? T.actionBase : T.textMuted,
                  border: `1px solid ${active ? T.actionBase : T.border}`,
                  display: "flex", alignItems: "center",
                }}
              >
                <input
                  type="radio"
                  name="statusFilter"
                  value={opt.value}
                  checked={active}
                  onChange={() => setStatusFilter(opt.value)}
                  style={{ display: "none" }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>

        <div style={{ ...MONO, fontSize: 9, color: T.textMuted, marginLeft: "auto" }}>
          {filtered.length} / {fields.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          ...SANS, fontSize: 13, color: T.textMuted,
          textAlign: "center", padding: "24px 0",
          border: `1px dashed ${T.border}`, borderRadius: 7,
        }}>
          No fields match the current filters.
        </div>
      ) : (
        filtered.map((field, i) => (
          <FieldRow key={`${field.field_path}-${i}`} field={field} />
        ))
      )}
    </div>
  );
}
