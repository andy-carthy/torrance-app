import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import type { ValidationResult } from '../../validation/engine';

interface Props {
  results: ValidationResult[];
  onResolve: (ruleId: string) => void;
  initialFilter?: 'errors' | 'all';
}

type FilterTab = 'all' | 'errors' | 'warnings' | 'info' | 'passed';

const INFO_COLOR = "#1d4ed8";
const INFO_BG    = "#eff6ff";
const INFO_BD    = "#bfdbfe";

function severityIcon(result: ValidationResult): string {
  if (result.resolved) return "✅";
  if (result.severity === "error")   return "❌";
  if (result.severity === "warning") return "⚠️";
  return "ℹ️";
}

function severityOrder(r: ValidationResult): number {
  if (!r.resolved && r.severity === "error")   return 0;
  if (!r.resolved && r.severity === "warning") return 1;
  if (!r.resolved && r.severity === "info")    return 2;
  return 3;
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v, null, 0);
  return String(v);
}

function SummaryPill({
  label, count, color, bg, border,
}: {
  label: string; count: number; color: string; bg: string; border: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 6,
      background: bg, border: `1px solid ${border}`,
    }}>
      <span style={{ ...MONO, fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ ...SANS, fontSize: 10, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

function ResultItem({
  result, onResolve,
}: {
  result: ValidationResult; onResolve: (id: string) => void;
}) {
  const isPass = result.resolved;

  const borderColor = isPass
    ? T.okBorder
    : result.severity === "error"   ? T.errorBorder
    : result.severity === "warning" ? T.warnBorder
    : INFO_BD;

  const iconBg = isPass
    ? T.okBg
    : result.severity === "error"   ? T.errorBg
    : result.severity === "warning" ? T.warnBg
    : INFO_BG;

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 7, marginBottom: 8,
      background: T.cardBg, overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: 10, padding: "12px 14px", alignItems: "flex-start" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6,
          background: iconBg, border: `1px solid ${borderColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0,
        }}>
          {severityIcon(result)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
            <span style={{
              ...MONO, fontSize: 9, fontWeight: 700,
              padding: "1px 6px", borderRadius: 3,
              background: T.appBg, color: T.textPrimary,
              border: `1px solid ${T.border}`,
            }}>
              {result.id}
            </span>
            <span style={{
              ...MONO, fontSize: 9, fontWeight: 700,
              padding: "1px 6px", borderRadius: 3,
              background: T.aiBg, color: T.aiBase,
              border: `1px solid ${T.aiBorder}`,
            }}>
              {result.form_type.replace("_", " ")}
            </span>
            <span style={{
              ...MONO, fontSize: 9, fontWeight: 700,
              padding: "1px 6px", borderRadius: 3,
              background: T.appBg, color: T.textMuted,
              border: `1px solid ${T.border}`,
            }}>
              {result.scope}
            </span>
            {result.blocked && (
              <span style={{
                ...MONO, fontSize: 9, fontWeight: 700,
                padding: "1px 6px", borderRadius: 3,
                background: T.errorBg, color: T.errorBase,
                border: `1px solid ${T.errorBorder}`,
              }}>
                BLOCKED
              </span>
            )}
          </div>

          <div style={{
            ...SANS, fontSize: 12, fontWeight: 700,
            color: T.textPrimary, marginBottom: 3,
          }}>
            {result.message}
          </div>

          <div style={{
            ...SANS, fontSize: 11, color: T.textMuted,
            marginBottom: (result.field_path || result.actual_value !== undefined) ? 6 : 0,
          }}>
            {result.remediation}
          </div>

          {result.field_path && (
            <div style={{ marginBottom: 4 }}>
              <span style={{
                ...MONO, fontSize: 10,
                padding: "1px 6px", borderRadius: 4,
                background: T.appBg, color: T.textPrimary,
                border: `1px solid ${T.border}`,
              }}>
                {result.field_path}
              </span>
            </div>
          )}

          {result.actual_value !== undefined && (
            <div style={{ ...SANS, fontSize: 11, color: T.textMuted, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>Value: </span>
              <span style={{ ...MONO, fontSize: 10 }}>{fmtValue(result.actual_value)}</span>
            </div>
          )}

          {!result.resolved && (
            <div style={{ marginTop: 8 }}>
              <button
                className="resolve-btn"
                onClick={() => onResolve(result.id)}
                style={{
                  ...SANS, fontSize: 11, fontWeight: 600,
                  padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                  background: T.okBase, color: "#fff", border: "none",
                }}
              >
                Mark Resolved
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValidationResultsPanel({ results, onResolve, initialFilter }: Props) {
  const [filter, setFilter] = useState<FilterTab>(initialFilter === 'all' ? 'all' : 'errors');

  const errCount  = results.filter(r => !r.resolved && r.severity === "error").length;
  const warnCount = results.filter(r => !r.resolved && r.severity === "warning").length;
  const infoCount = results.filter(r => !r.resolved && r.severity === "info").length;
  const passCount = results.filter(r => r.resolved).length;

  const sorted = [...results].sort((a, b) => severityOrder(a) - severityOrder(b));

  const filtered = sorted.filter(r => {
    if (filter === "all")      return true;
    if (filter === "errors")   return !r.resolved && r.severity === "error";
    if (filter === "warnings") return !r.resolved && r.severity === "warning";
    if (filter === "info")     return !r.resolved && r.severity === "info";
    if (filter === "passed")   return r.resolved;
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: results.length },
    { key: "errors",   label: "Errors",   count: errCount },
    { key: "warnings", label: "Warnings", count: warnCount },
    { key: "info",     label: "Info",     count: infoCount },
    { key: "passed",   label: "Passed",   count: passCount },
  ];

  return (
    <div style={{ ...SANS, color: T.textPrimary }}>
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        padding: "12px 14px",
        background: T.appBg, border: `1px solid ${T.border}`,
        borderRadius: 8, marginBottom: 10,
      }}>
        <SummaryPill label="Errors"   count={errCount}  color={T.errorBase} bg={T.errorBg} border={T.errorBorder} />
        <SummaryPill label="Warnings" count={warnCount} color={T.warnBase}  bg={T.warnBg}  border={T.warnBorder}  />
        <SummaryPill label="Info"     count={infoCount} color={INFO_COLOR}  bg={INFO_BG}   border={INFO_BD}        />
        <SummaryPill label="Passed"   count={passCount} color={T.okBase}   bg={T.okBg}    border={T.okBorder}    />
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map(tab => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                ...SANS, fontSize: 11, fontWeight: 600,
                padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                background: active ? T.actionBase : T.cardBg,
                color: active ? "#fff" : T.textMuted,
                border: `1px solid ${active ? T.actionBase : T.border}`,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  ...MONO, fontSize: 9,
                  background: active ? "rgba(255,255,255,0.25)" : T.appBg,
                  padding: "0 4px", borderRadius: 3,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          ...SANS, fontSize: 13, color: T.textMuted,
          textAlign: "center", padding: "24px 0",
          border: `1px dashed ${T.border}`, borderRadius: 7,
        }}>
          No results in this category.
        </div>
      ) : (
        filtered.map((r, i) => (
          <ResultItem key={`${r.id}-${i}`} result={r} onResolve={onResolve} />
        ))
      )}
    </div>
  );
}
