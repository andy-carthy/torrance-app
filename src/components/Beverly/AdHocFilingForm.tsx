import React, { useState } from 'react';
import { T, SANS } from '../../theme/tokens';
import type { FilingEnvelope } from '../../types/filing';

interface Fund {
  id: string;
  name: string;
  client: string;
}

interface Props {
  funds: Fund[];
  onContinue: (envelope: FilingEnvelope) => void;
  onCancel: () => void;
}

const AD_HOC_FORM_TYPES = [
  "Schedule TO",
  "Form N-23c-2",
  "Form N-23c-3",
  "Form 3 / Form 4 / Form 5",
  "Form D",
  "Form 144",
  "Schedule 13D",
  "Schedule 13G",
];

const inputStyle: React.CSSProperties = {
  ...SANS, width: "100%", padding: "9px 11px",
  borderRadius: 6, border: `1px solid ${T.border}`,
  fontSize: 13, background: "#fff", color: T.textPrimary,
  outline: "none", boxSizing: "border-box",
};

export function AdHocFilingForm({ funds, onContinue, onCancel }: Props) {
  const [selectedFundId, setSelectedFundId] = useState(funds[0]?.id ?? '');
  const [selectedFormType, setSelectedFormType] = useState(AD_HOC_FORM_TYPES[0]);

  function handleContinue() {
    const fund = funds.find(f => f.id === selectedFundId) ?? funds[0];
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const envelope: FilingEnvelope = {
      filing_id: `ADHOC-${Date.now()}`,
      filing_type: "ADHOC",
      filing_version: "1",
      amendment_indicator: false,
      final_filing_indicator: false,
      filing_trigger: 'adhoc',
      adhoc_type: selectedFormType,
      reporting_period: {
        start_date: today,
        end_date: today,
        period_type: "adhoc",
        due_date: today,
        due_basis: "adhoc",
      },
      filer_identity: {
        legal_name: fund.name,
        cik: "",
        lei: "",
        file_number: "",
        sec_iard_number: "",
        address: "",
        contact: "",
      },
      submission_metadata: {
        created_at: now,
        prepared_by: "",
        reviewed_by: "",
        approved_by: "",
        channel: "EDGAR",
        package_format: "XML",
        submission_status: "draft",
      },
      controls: {
        is_locked: false,
        override_count: 0,
        manual_adjustments: false,
        attestation_status: "pending",
        validation_summary: { error_count: 0, warning_count: 0, info_count: 0 },
      },
    };

    onContinue(envelope);
  }

  return (
    <div style={{ ...SANS, padding: "24px", flex: 1, overflowY: "auto" }}>
      {/* Back button */}
      <button
        onClick={onCancel}
        style={{
          ...SANS, fontSize: 12, fontWeight: 600,
          background: "none", border: "none", cursor: "pointer",
          color: T.textMuted, padding: 0, marginBottom: 24,
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        ← Back
      </button>

      {/* Card */}
      <div style={{
        maxWidth: 480,
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: 10, padding: "24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ ...SANS, fontSize: 16, fontWeight: 700, color: T.textPrimary, marginBottom: 20 }}>
          New ad-hoc filing
        </div>

        {/* Fund */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Fund
          </label>
          <select
            value={selectedFundId}
            onChange={e => setSelectedFundId(e.target.value)}
            style={{ ...inputStyle }}
          >
            {funds.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {funds.find(f => f.id === selectedFundId) && (
            <div style={{ ...SANS, fontSize: 11, color: T.textMuted, marginTop: 4 }}>
              {funds.find(f => f.id === selectedFundId)?.client}
            </div>
          )}
        </div>

        {/* Filing type */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ ...SANS, fontSize: 12, fontWeight: 600, color: T.textMuted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Filing type
          </label>
          <select
            value={selectedFormType}
            onChange={e => setSelectedFormType(e.target.value)}
            style={{ ...inputStyle }}
          >
            {AD_HOC_FORM_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleContinue}
            style={{
              ...SANS, fontSize: 13, fontWeight: 700,
              padding: "10px 20px", borderRadius: 7,
              background: T.actionBase, color: "#fff",
              border: "none", cursor: "pointer", flex: 1,
            }}
          >
            Continue →
          </button>
          <button
            onClick={onCancel}
            style={{
              ...SANS, fontSize: 13, fontWeight: 600,
              padding: "10px 16px", borderRadius: 7,
              background: T.cardBg, color: T.textMuted,
              border: `1px solid ${T.border}`, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
