import type { FilingEnvelope, FormPF, ValidationRule, FieldValue } from "../types/filing";
import type { FormNPort, Holding } from "../types/formNPort";
import type { Exception } from "../types";
import { FORM_PF_RULES, FORM_N_PORT_RULES } from "./rules";

// ============================================================================
// PART 1: BEVERLEY FILING VALIDATION ENGINE
// ============================================================================

export interface ValidationResult extends ValidationRule {
  field_path?: string;
  actual_value?: unknown;
  blocked: boolean;
  resolved: boolean;
}

type Payload = FormPF | FormNPort;

function isFormPF(payload: Payload): payload is FormPF {
  return "adviser_profile" in payload;
}

function isFormNPort(payload: Payload): payload is FormNPort {
  return "registrant" in payload;
}

function pass(rule: ValidationRule): ValidationResult {
  return { ...rule, blocked: false, resolved: true };
}

function fail(
  rule: ValidationRule,
  opts: { field_path?: string; actual_value?: unknown } = {}
): ValidationResult {
  return {
    ...rule,
    field_path: opts.field_path,
    actual_value: opts.actual_value,
    blocked: rule.severity === "error",
    resolved: false,
  };
}

function isValidISODate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

function isLastDayOfMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const lastDay = new Date(next.getTime() - 86400000);
  return d.getDate() === lastDay.getDate();
}

function runFormPFRules(filing: FilingEnvelope, payload: FormPF): ValidationResult[] {
  const results: ValidationResult[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const rule of FORM_PF_RULES) {
    switch (rule.id) {
      case "PF-001":
        if (payload.adviser_profile.eligibility_status !== "eligible") {
          results.push(fail(rule, { field_path: "adviser_profile.eligibility_status", actual_value: payload.adviser_profile.eligibility_status }));
        } else results.push(pass(rule));
        break;
      case "PF-002":
        if (payload.adviser_profile.private_fund_assets_aum < 150_000_000) {
          results.push(fail(rule, { field_path: "adviser_profile.private_fund_assets_aum", actual_value: payload.adviser_profile.private_fund_assets_aum }));
        } else results.push(pass(rule));
        break;
      case "PF-003": {
        const category = payload.adviser_profile.filer_category;
        let anyFail = false;
        for (const section of payload.sections) {
          if (!section.applicable_to.includes(category) && section.items.length > 0) {
            results.push(fail(rule, { field_path: `sections[${section.section_id}]`, actual_value: { section_id: section.section_id, filer_category: category } }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "PF-004": {
        let sumAll = 0;
        for (const fund of payload.funds) sumAll += fund.net_asset_value;
        const reported = payload.derived_metrics.aggregate_private_fund_aum;
        const delta = reported > 0 ? Math.abs(sumAll - reported) / reported : Math.abs(sumAll - reported);
        if (delta > 0.0001) results.push(fail(rule, { field_path: "derived_metrics.aggregate_private_fund_aum", actual_value: { sum_of_funds: sumAll, reported_aggregate: reported } }));
        else results.push(pass(rule));
        break;
      }
      case "PF-005":
        if (payload.adviser_profile.filer_category === "large_hedge_fund_adviser" && payload.counterparties.length === 0) {
          results.push(fail(rule, { field_path: "counterparties", actual_value: [] }));
        } else results.push(pass(rule));
        break;
      case "PF-006":
        if (filing.reporting_period.due_date < today && !["submitted", "accepted"].includes(filing.submission_metadata.submission_status)) {
          results.push(fail(rule, { field_path: "reporting_period.due_date", actual_value: filing.reporting_period.due_date }));
        } else results.push(pass(rule));
        break;
      case "PF-007":
        if (filing.amendment_indicator && filing.filing_version === "1") {
          results.push(fail(rule, { field_path: "filing.amendment_indicator", actual_value: { amendment_indicator: true, filing_version: filing.filing_version } }));
        } else results.push(pass(rule));
        break;
      case "PF-008": {
        let anyFail = false;
        for (const item of payload.sections.flatMap(s => s.items)) {
          if (item.data_type === "percentage" && (Number(item.value) < 0 || Number(item.value) > 100)) {
            results.push(fail(rule, { field_path: item.field_path, actual_value: item.value }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "PF-009": {
        let anyFail = false;
        for (const item of payload.sections.flatMap(s => s.items)) {
          if (item.data_type === "date" && !isValidISODate(item.value)) {
            results.push(fail(rule, { field_path: item.field_path, actual_value: item.value }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "PF-010":
        if (payload.attestations.signed_off !== true) {
          results.push(fail(rule, { field_path: "attestations.signed_off", actual_value: payload.attestations.signed_off }));
        } else results.push(pass(rule));
        break;
    }
  }
  return results;
}

function runFormNPortRules(filing: FilingEnvelope, payload: FormNPort): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const rule of FORM_N_PORT_RULES) {
    switch (rule.id) {
      case "NP-001":
        if (filing.submission_metadata.package_format !== "xml") results.push(fail(rule, { field_path: "submission_metadata.package_format", actual_value: filing.submission_metadata.package_format }));
        else results.push(pass(rule));
        break;
      case "NP-002":
        if (!isLastDayOfMonth(payload.registrant.reporting_period_end)) results.push(fail(rule, { field_path: "registrant.reporting_period_end", actual_value: payload.registrant.reporting_period_end }));
        else results.push(pass(rule));
        break;
      case "NP-003": {
        let anyFail = false;
        for (const holding of payload.holdings) {
          if (!holding.identifier.cusip && !holding.identifier.isin && !holding.identifier.ticker) {
            results.push(fail(rule, { field_path: `holdings[${holding.holding_id}].identifier`, actual_value: holding.identifier }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "NP-004": {
        const sumBySeries: Record<string, number> = {};
        for (const h of payload.holdings) sumBySeries[h.series_id] = (sumBySeries[h.series_id] ?? 0) + (h.value ?? 0);
        let anyFail = false;
        for (const series of payload.series) {
          const sum = sumBySeries[series.series_id] ?? 0;
          const delta = series.net_assets > 0 ? Math.abs(sum - series.net_assets) / series.net_assets : Math.abs(sum - series.net_assets);
          if (delta > 0.001) {
            results.push(fail(rule, { field_path: `series[${series.series_id}].net_assets`, actual_value: { sum_holdings: sum, net_assets: series.net_assets } }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "NP-005": {
        let anyFail = false;
        for (const holding of payload.holdings) {
          if (holding.pct_net_assets < 0 || holding.pct_net_assets > 100) {
            results.push(fail(rule, { field_path: `holdings[${holding.holding_id}].pct_net_assets`, actual_value: holding.pct_net_assets }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "NP-006": {
        const seen = new Set<string>();
        const dupes = new Set<string>();
        for (const h of payload.holdings) {
          if (seen.has(h.holding_id)) dupes.add(h.holding_id);
          seen.add(h.holding_id);
        }
        if (dupes.size > 0) {
          for (const id of dupes) results.push(fail(rule, { field_path: `holdings[${id}].holding_id`, actual_value: id }));
        } else results.push(pass(rule));
        break;
      }
      case "NP-007":
        if (filing.amendment_indicator && (!payload.registrant.effective_date || payload.registrant.effective_date.trim() === "")) {
          results.push(fail(rule, { field_path: "registrant.effective_date", actual_value: payload.registrant.effective_date }));
        } else results.push(pass(rule));
        break;
      case "NP-008": {
        const liq = payload.liquidity;
        const bucketSum = liq.bucket_1_day + liq.bucket_2_7_days + liq.bucket_8_30_days + liq.bucket_gt_30_days;
        const totalPortfolio = payload.holdings.reduce((sum, h) => sum + (h.value ?? 0), 0);
        const delta = totalPortfolio > 0 ? Math.abs(bucketSum - totalPortfolio) / totalPortfolio : Math.abs(bucketSum - totalPortfolio);
        if (delta > 0.001) results.push(fail(rule, { field_path: "liquidity", actual_value: { bucket_sum: bucketSum, total_portfolio: totalPortfolio } }));
        else results.push(pass(rule));
        break;
      }
      case "NP-009": {
        let anyFail = false;
        for (const holding of payload.holdings) {
          if (holding.value == null) {
            results.push(fail(rule, { field_path: `holdings[${holding.holding_id}].value`, actual_value: holding.value }));
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }
      case "NP-010":
        if (filing.submission_metadata.submission_status !== "ready_to_file" && filing.submission_metadata.submission_status !== "submitted") {
          results.push(fail(rule, { field_path: "submission_metadata.submission_status", actual_value: filing.submission_metadata.submission_status }));
        } else results.push(pass(rule));
        break;
    }
  }
  return results;
}

export function runValidation(filing: FilingEnvelope, payload: FormPF | FormNPort): ValidationResult[] {
  if (isFormPF(payload)) return runFormPFRules(filing, payload);
  if (isFormNPort(payload)) return runFormNPortRules(filing, payload);
  return [];
}


// ============================================================================
// PART 2: SIMULATED AI RULES ENGINE
// ============================================================================

export interface AiSuggestion {
  summary: string;
  detail: string;
  resolution: "override_value" | "corrected_source" | "acknowledged" | "accept_as_is";
  overrideValue: string;
  confidence: number;
  priorPeriod: string;
}

export interface AiRootCause {
  confidence: number;
  rootCause: string;
  causeChain: { step: number; label: string; detail: string }[];
  affectedDownstream: string[];
  suggestedRemediation: string;
  similarPastExceptions: { id: string; fund: string; date: string; resolution: string; outcome: string }[];
}

export interface PriorPeriodFlag {
  type: "spike" | "repeat" | "routine";
  message: string;
  priorOccurrences: number;
}

export interface SimulatedAiContext {
  suggestion: AiSuggestion | null;
  rootCause: AiRootCause | null;
  priorPeriodFlag: PriorPeriodFlag | null;
}

/**
 * Evaluates an Exception against a localized heuristic rule engine to simulate AI outputs.
 * This dynamically generates root causes, suggestions, and historical flags based on the exception's properties.
 */
export function evaluateExceptionForAI(exc: Exception): SimulatedAiContext {
  const ctx: SimulatedAiContext = {
    suggestion: null,
    rootCause: null,
    priorPeriodFlag: null,
  };

  const titleLower = exc.title.toLowerCase();
  const msgLower = exc.message.toLowerCase();
  const code = exc.code;

  // RULE 1: FX Variances & Mismatches
  if (code === "FX_RATE_VARIANCE" || titleLower.includes("fx") || titleLower.includes("currency")) {
    const isImmaterial = Math.abs(exc.amount) < 10;
    
    ctx.priorPeriodFlag = {
      type: isImmaterial ? "routine" : "repeat",
      message: isImmaterial 
        ? "FX rate variance has occurred in all 6 prior periods. Consistent rounding artifact."
        : "FX mismatch on this account occurred in 2 of the last 6 periods.",
      priorOccurrences: isImmaterial ? 6 : 2
    };

    if (isImmaterial) {
      ctx.suggestion = {
        summary: "FX variance within tolerance — acknowledged last 3 months",
        detail: "FX rate variance at this magnitude has been acknowledged without action for 3 consecutive month-ends.",
        resolution: "acknowledged",
        overrideValue: "",
        confidence: 99,
        priorPeriod: "November 30, 2024"
      };
    } else {
      ctx.suggestion = {
        summary: "Last month you overrode this with Bloomberg Spot Rate",
        detail: "In the prior close, this account had the same FX mismatch. You accepted a Bloomberg WM/Reuters fix override.",
        resolution: "override_value",
        overrideValue: `$${(Math.abs(exc.amount) * 0.85).toLocaleString('en-US', {minimumFractionDigits: 2})}`, // Simulated correction
        confidence: 97,
        priorPeriod: "November 30, 2024"
      };
      
      ctx.rootCause = {
        confidence: 97,
        rootCause: "FX conversion was applied using a stale reference rate rather than the WM/Reuters 4PM London fix required by the valuation policy.",
        causeChain: [
          { step: 1, label: "Rate Source", detail: "Accounting system FX table last refreshed prior to month-end." },
          { step: 2, label: "Conversion", detail: `Stale rate triggered a variance resulting in ${exc.amount > 0 ? 'overstatement' : 'understatement'}.` },
          { step: 3, label: "GL Entry", detail: `Account loaded into Torrance diverges from the Bloomberg-correct value.` }
        ],
        affectedDownstream: [
          "Foreign Income/Expense incorrectly stated",
          "Net Increase in Net Assets from Operations affected downstream"
        ],
        suggestedRemediation: `Override value with Bloomberg WM/Reuters fix. Expected adjusted amount is roughly $${(Math.abs(exc.amount) * 0.85).toLocaleString('en-US', {minimumFractionDigits: 2})}.`,
        similarPastExceptions: [
          { id: exc.id, fund: "Current Fund", date: "Nov 30, 2024", resolution: "override_value", outcome: "Override accepted" }
        ]
      };
    }
  }

  // RULE 2: T+1 Settlement / Holdings Cross-Checks
  else if (code === "HOLDINGS_CROSS_CHECK" || titleLower.includes("holdings") || titleLower.includes("shares")) {
    ctx.priorPeriodFlag = {
      type: "repeat",
      message: "Holdings cross-check variance on this position appeared in 3 of last 6 periods. Likely T+1 settlement.",
      priorOccurrences: 3
    };

    ctx.suggestion = {
      summary: "T+1 settlement lag — same pattern seen in prior closes",
      detail: "Share count variance appeared in prior closes due to T+1 settlement timing. The exception was acknowledged and cleared within 2 business days.",
      resolution: "acknowledged",
      overrideValue: "",
      confidence: 89,
      priorPeriod: "November 30, 2024"
    };

    ctx.rootCause = {
      confidence: 89,
      rootCause: "T+1 settlement timing mismatch. Recent trades will not settle until the next business day, creating a delta between Trade Date GL accounting and Settled Custodian files.",
      causeChain: [
        { step: 1, label: "Trade Date", detail: "Shares purchased/sold right before period end and booked in GL." },
        { step: 2, label: "Settlement", detail: "T+1 settlement bridges over the reporting period." },
        { step: 3, label: "Cross-Check", detail: "Variance flagged due to expected T+1 artifact." }
      ],
      affectedDownstream: [
        "Schedule of Investments position count temporary mismatch",
        "Holdings KPI Market Value temporary variance"
      ],
      suggestedRemediation: "Acknowledge this exception. The variance is a known T+1 settlement artifact that will self-correct on the next business day. No restatement is required.",
      similarPastExceptions: [
        { id: exc.id, fund: "Current Fund", date: "Nov 30, 2024", resolution: "acknowledged", outcome: "Auto-cleared" }
      ]
    };
  }

  // RULE 3: Category Mismatch / ETL Issues
  else if (code === "CATEGORY_MISMATCH" || titleLower.includes("category")) {
    ctx.priorPeriodFlag = {
      type: "spike",
      message: "Account category mismatch has NOT occurred in any prior 6 periods — new pattern. High risk.",
      priorOccurrences: 0
    };

    ctx.suggestion = {
      summary: "Correct at source system",
      detail: "This is a structural mapping error. Overriding locally will break subsequent downstream roll-ups. Must correct in upstream ETL.",
      resolution: "corrected_source",
      overrideValue: "",
      confidence: 94,
      priorPeriod: "None"
    };

    ctx.rootCause = {
      confidence: 91,
      rootCause: "Upstream ETL pipeline mis-tagged the account category during the batch run. Source system classification table was likely overwritten.",
      causeChain: [
        { step: 1, label: "Source System", detail: `Custodian export included a bad category flag on account ${exc.account_number}.` },
        { step: 2, label: "ETL Transform", detail: "Batch job propagated the category field without validating against the Torrance COA master." },
        { step: 3, label: "GL Ingestion", detail: "Rules engine caught the mismatch during Trial Balance ingestion." }
      ],
      affectedDownstream: [
        "Trial Balance subtotal mapping errors",
        "Financial Statements will classify this balance in the wrong hierarchy"
      ],
      suggestedRemediation: "Contact ops team to re-export the rows with correct category. Do not override locally — the fix must be at source to preserve audit trail integrity.",
      similarPastExceptions: []
    };
  }

  // DEFAULT / FALLBACK RULE
  else {
    ctx.suggestion = {
      summary: "AI Confidence Too Low",
      detail: "Insufficient prior-period matches to confidently suggest an automated resolution. Manual review required.",
      resolution: "accept_as_is",
      overrideValue: "",
      confidence: 35,
      priorPeriod: "N/A"
    };
  }

  return ctx;
}