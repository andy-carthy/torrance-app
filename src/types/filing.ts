export type FilingType = "FORM_PF" | "FORM_N_PORT";

export interface FilingEnvelope {
  filing_id: string;
  filing_type: FilingType;
  filing_version: string;
  amendment_indicator: boolean;
  final_filing_indicator: boolean;
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
