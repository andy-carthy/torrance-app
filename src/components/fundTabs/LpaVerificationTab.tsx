import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { fmtUSD, fmtPct } from '../../utils/formatters';

export function LpaVerificationTab() {
  const LPA_CHECKS = [
    {
      id: "lpa-1",
      term: "Management Fee",
      rule: "2.00% × Average Daily NAV",
      details: "Calculated using average daily NAV of $687,400,000.",
      torranceCalc: 13748000,
      glReported: 13748000,
      status: "Pass"
    },
    {
      id: "lpa-2",
      term: "Performance Fee (Incentive)",
      rule: "20% above 8.00% Hard Hurdle",
      details: "Hurdle cleared. High Water Mark: $620.0M. Eligible profit: $21.4M.",
      torranceCalc: 4280000,
      glReported: 4280000,
      status: "Pass"
    }
  ];

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "100%", background: T.appBg }}>
      
      {/* Header */}
      <div style={{ padding: "24px 32px", background: T.cardBg, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ ...SANS, fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            LPA Terms Verification Engine
          </h2>
          <div style={{ ...SANS, fontSize: 13, color: T.textMuted, marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>
            Independent recalculation of economic terms derived from the Limited Partnership Agreement. Parameters are locked at fund setup.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <div style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textPrimary }}>Controller-Only Access</div>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
        
        <div style={{ ...SANS, fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
          Hedge Fund Parameters — Pennywise Global Diversified
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {LPA_CHECKS.map(check => {
            const variance = Math.abs(check.torranceCalc - check.glReported);
            
            return (
              <div key={check.id} style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                
                {/* Rule Header */}
                <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ ...SANS, fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{check.term}</div>
                    <div style={{ ...MONO, fontSize: 12, color: T.textMuted, marginTop: 4 }}>Parameter: {check.rule}</div>
                  </div>
                  <span style={{ ...SANS, fontSize: 11, fontWeight: 700, background: check.status === "Pass" ? T.okBg : T.errorBg, color: check.status === "Pass" ? T.okBase : T.errorBase, padding: "4px 10px", borderRadius: 4, border: `1px solid ${check.status === "Pass" ? T.okBorder : T.errorBorder}` }}>
                    {check.status === "Pass" ? "✓ Verified Match" : "⚠ Variance Detected"}
                  </span>
                </div>

                {/* Calculation Comparison */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                  
                  {/* Torrance Column */}
                  <div style={{ padding: "24px", background: T.cardBg }}>
                    <div style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.aiBase, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>✦</span> Torrance AI Calculation
                    </div>
                    <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>
                      {formatCurrency(check.torranceCalc)}
                    </div>
                    <div style={{ ...SANS, fontSize: 12, color: T.textMuted, lineHeight: 1.4 }}>
                      {check.details}
                    </div>
                  </div>

                  {/* GL Reported Column */}
                  <div style={{ padding: "24px", background: T.cardBg, borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
                    <div style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                      System of Record (GL)
                    </div>
                    <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>
                      {formatCurrency(check.glReported)}
                    </div>
                    <div style={{ ...SANS, fontSize: 12, color: T.textMuted, lineHeight: 1.4 }}>
                      Payload extracted from State Street Trial Balance (Acct 5010).
                    </div>
                  </div>

                  {/* Variance Column */}
                  <div style={{ padding: "24px", background: variance === 0 ? "#f8fafc" : T.errorBg }}>
                    <div style={{ ...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                      Calculated Variance
                    </div>
                    <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color: variance === 0 ? T.okBase : T.errorBase }}>
                      {formatCurrency(variance)}
                    </div>
                    {variance > 0 && (
                      <button style={{ ...SANS, marginTop: 12, fontSize: 12, fontWeight: 700, background: T.errorBase, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>
                        Investigate Exception
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Private Equity Stub Note for the Demo */}
        <div style={{ marginTop: 32, padding: "16px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "transparent", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20 }}>💡</div>
          <div>
            <div style={{ ...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Private Equity Waterfall Support</div>
            <div style={{ ...SANS, fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              For closed-end funds, this engine processes full distribution waterfalls (Return of Capital → Preferred Return → Catch-up → Carried Interest Split).
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
