export type FilingType = "FORM_PF" | "FORM_N_PORT";

export interface FilingEnvelope {
  filing_id: string;
  filing_type: FilingType;
  filing_version: string;
  amendment_indicator: boolean;
  final_filing_indicator: boolean;
  filing_trigger?: 'periodic' | 'adhoc';
  adhoc_type?: string;
  reporting_period: {
    start_date: string;
    end_date: string;
    period_type: string;
    due_date: string;
    due_basis: string;
  };
  filer_identity: {
    legal_name: string;
    cik: string;
    lei: string;
    file_number: string;
    sec_iard_number: string;
    address: string;
    contact: string;
  };
  submission_metadata: {
    created_at: string;
    prepared_by: string;
    reviewed_by: string;
    approved_by: string;
    channel: string;
    package_format: string;
    submission_status: string;
  };
  controls: {
    is_locked: boolean;
    override_count: number;
    manual_adjustments: boolean;
    attestation_status: string;
    validation_summary: {
      error_count: number;
      warning_count: number;
      info_count: number;
    };
  };
}

export interface FieldValue {
  field_path: string;
  label: string;
  section_id: string;
  value: unknown;
  normalized_value: unknown;
  display_value: string;
  data_type: string;
  required: boolean;
  repeatable: boolean;
  source_system: string;
  source_record_id: string;
  source_field: string;
  calculation_method: string;
  unit: string;
  as_of_date: string;
  currency_code: string;
  validation_status: "pass" | "warn" | "fail" | "not_applicable";
  rule_ids: string[];
  reviewer: string;
  override_reason: string;
  last_updated_at: string;
}

export interface ValidationRule {
  id: string;
  form_type: FilingType;
  scope: "field" | "section" | "cross_field" | "filing" | "submission";
  stage: string;
  condition: string;
  severity: "error" | "warning" | "info";
  message: string;
  remediation: string;
  source_reference: string;
}

export interface SubmissionResponse {
  submission_id: string;
  form_type: FilingType;
  channel: string;
  submitted_at: string;
  acknowledged_at: string;
  status: "accepted" | "rejected" | "accepted_with_warnings";
  tracking_number: string;
  response_code: string;
  response_message: string;
  warnings: string[];
  accepted_payload_hash: string;
}

// Form PF types

export type FilerCategory =
  | "small"
  | "large_hedge_fund_adviser"
  | "large_liquidity_fund_adviser"
  | "large_private_equity_fund_adviser"
  | "other";

export interface AdviserProfile {
  legal_name: string;
  cik: string;
  lei: string;
  file_number: string;
  firm_type: "RIA" | "dually_registered" | "CPO" | "CTA";
  private_fund_assets_aum: number;
  regulatory_aum: number;
  eligibility_status: "eligible" | "not_eligible";
  filer_category: FilerCategory;
  fiscal_year_end: string;
}

export interface PFFund {
  fund_id: string;
  fund_name: string;
  fund_type:
    | "hedge"
    | "liquidity"
    | "private_equity"
    | "venture"
    | "real_estate"
    | "securitized_asset"
    | "other";
  domicile: string;
  cik: string;
  lei: string;
  gross_asset_value: number;
  net_asset_value: number;
  investor_count: number;
}

export interface Counterparty {
  counterparty_id: string;
  name: string;
  type: "prime_broker" | "swap_dealer" | "custodian" | "lender" | "other";
  exposure_amount: number;
  secured: boolean;
}

export interface RiskBlock {
  risk_block_id: string;
  risk_type:
    | "liquidity"
    | "leverage"
    | "market"
    | "counterparty"
    | "concentration"
    | "financing";
  metric_name: string;
  metric_value: number;
  unit: string;
  period_end: string;
}

export interface PFSection {
  section_id: string;
  section_name: string;
  applicability: "always" | "conditional";
  applicable_to: FilerCategory[];
  items: FieldValue[];
  section_status: "complete" | "incomplete" | "not_applicable";
}

export interface FormPF {
  adviser_profile: AdviserProfile;
  sections: PFSection[];
  funds: PFFund[];
  counterparties: Counterparty[];
  risk_blocks: RiskBlock[];
  derived_metrics: {
    aggregate_private_fund_aum: number;
    hedge_fund_aum: number;
    liquidity_fund_aum: number;
    private_equity_fund_aum: number;
    net_exposure: number;
    gross_exposure: number;
    counterparty_concentration: number;
  };
  attestations: {
    prepared_by: string;
    approved_by: string;
    date_approved: string;
    attestation_text: string;
    signed_off: boolean;
  };
}
