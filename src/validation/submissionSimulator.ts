import type { FilingEnvelope, SubmissionResponse } from "../types/filing";
import type { ValidationResult } from "./engine";

function randomHex(length: number): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export async function simulateSubmission(
  filing: FilingEnvelope,
  results: ValidationResult[]
): Promise<SubmissionResponse> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));

  const now = new Date().toISOString();
  const formType = filing.filing_type;
  const isFormPF = formType === "FORM_PF";
  const trackingNumber = `TRK-${formType}-${Date.now()}`;
  const submissionId = `SUB-${randomHex(8)}-${randomHex(4)}`;

  const blockingErrors = results.filter(
    (r) => r.severity === "error" && r.blocked === true && r.resolved === false
  );

  if (blockingErrors.length > 0) {
    return {
      submission_id: submissionId,
      form_type: formType,
      channel: filing.submission_metadata.channel,
      submitted_at: now,
      acknowledged_at: now,
      status: "rejected",
      tracking_number: trackingNumber,
      response_code: isFormPF ? "PFRD-REJECTED" : "EDGAR-REJECTED",
      response_message: "Submission rejected due to blocking validation errors.",
      warnings: blockingErrors.map((r) => r.message),
      accepted_payload_hash: "",
    };
  }

  const unresolvedWarnings = results.filter(
    (r) => r.severity === "warning" && r.resolved === false
  );

  if (unresolvedWarnings.length > 0) {
    return {
      submission_id: submissionId,
      form_type: formType,
      channel: filing.submission_metadata.channel,
      submitted_at: now,
      acknowledged_at: now,
      status: "accepted_with_warnings",
      tracking_number: trackingNumber,
      response_code: isFormPF ? "PFRD-ACCEPTED" : "EDGAR-ACCEPTED",
      response_message:
        "Submission accepted with warnings. Please review and resolve flagged items.",
      warnings: unresolvedWarnings.map((r) => r.message),
      accepted_payload_hash: randomHex(64),
    };
  }

  return {
    submission_id: submissionId,
    form_type: formType,
    channel: filing.submission_metadata.channel,
    submitted_at: now,
    acknowledged_at: now,
    status: "accepted",
    tracking_number: trackingNumber,
    response_code: isFormPF ? "PFRD-ACCEPTED" : "EDGAR-ACCEPTED",
    response_message:
      "Submission accepted successfully. No validation issues detected.",
    warnings: [],
    accepted_payload_hash: randomHex(64),
  };
}
