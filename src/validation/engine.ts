import type { FilingEnvelope, FormPF, ValidationRule, FieldValue } from "../types/filing";
import type { FormNPort, Holding } from "../types/formNPort";
import { FORM_PF_RULES, FORM_N_PORT_RULES } from "./rules";

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

function runFormPFRules(
  filing: FilingEnvelope,
  payload: FormPF
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const rule of FORM_PF_RULES) {
    switch (rule.id) {
      case "PF-001": {
        if (payload.adviser_profile.eligibility_status !== "eligible") {
          results.push(
            fail(rule, {
              field_path: "adviser_profile.eligibility_status",
              actual_value: payload.adviser_profile.eligibility_status,
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "PF-002": {
        const aum = payload.adviser_profile.private_fund_assets_aum;
        if (aum < 150_000_000) {
          results.push(
            fail(rule, {
              field_path: "adviser_profile.private_fund_assets_aum",
              actual_value: aum,
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "PF-003": {
        const category = payload.adviser_profile.filer_category;
        let anyFail = false;
        for (const section of payload.sections) {
          if (
            !section.applicable_to.includes(category) &&
            section.items.length > 0
          ) {
            results.push(
              fail(rule, {
                field_path: `sections[${section.section_id}]`,
                actual_value: {
                  section_id: section.section_id,
                  filer_category: category,
                  applicable_to: section.applicable_to,
                },
              })
            );
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }

      case "PF-004": {
        const fundNAVByType: Record<string, number> = {};
        for (const fund of payload.funds) {
          fundNAVByType[fund.fund_type] =
            (fundNAVByType[fund.fund_type] ?? 0) + fund.net_asset_value;
        }
        const sumAll = Object.values(fundNAVByType).reduce((a, b) => a + b, 0);
        const reported = payload.derived_metrics.aggregate_private_fund_aum;
        const delta =
          reported > 0 ? Math.abs(sumAll - reported) / reported : Math.abs(sumAll - reported);
        const TOLERANCE = 0.0001;
        if (delta > TOLERANCE) {
          results.push(
            fail(rule, {
              field_path: "derived_metrics.aggregate_private_fund_aum",
              actual_value: { sum_of_funds: sumAll, reported_aggregate: reported, delta_pct: delta },
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "PF-005": {
        const isLargeHF = payload.adviser_profile.filer_category === "large_hedge_fund_adviser";
        if (isLargeHF && payload.counterparties.length === 0) {
          results.push(
            fail(rule, {
              field_path: "counterparties",
              actual_value: [],
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "PF-006": {
        const dueDate = filing.reporting_period.due_date;
        const status = filing.submission_metadata.submission_status;
        if (
          dueDate < today &&
          status !== "submitted" &&
          status !== "accepted"
        ) {
          results.push(
            fail(rule, {
              field_path: "reporting_period.due_date",
              actual_value: { due_date: dueDate, submission_status: status },
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "PF-007": {
        const isAmendment = filing.amendment_indicator;
        // Prior filing reference is absent when filing_version is "1" or no prior reference property exists.
        // We treat filing_version === "1" and amendment_indicator === true as the violation signal.
        const hasPriorRef =
          !isAmendment || (isAmendment && filing.filing_version !== "1");
        if (isAmendment && !hasPriorRef) {
          results.push(
            fail(rule, {
              field_path: "filing.amendment_indicator",
              actual_value: { amendment_indicator: true, filing_version: filing.filing_version },
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "PF-008": {
        const allItems: FieldValue[] = payload.sections.flatMap((s) => s.items);
        let anyFail = false;
        for (const item of allItems) {
          if (item.data_type === "percentage") {
            const v = Number(item.value);
            if (v < 0 || v > 100) {
              results.push(
                fail(rule, {
                  field_path: item.field_path,
                  actual_value: item.value,
                })
              );
              anyFail = true;
            }
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }

      case "PF-009": {
        const allItems: FieldValue[] = payload.sections.flatMap((s) => s.items);
        let anyFail = false;
        for (const item of allItems) {
          if (item.data_type === "date" && !isValidISODate(item.value)) {
            results.push(
              fail(rule, {
                field_path: item.field_path,
                actual_value: item.value,
              })
            );
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }

      case "PF-010": {
        if (payload.attestations.signed_off !== true) {
          results.push(
            fail(rule, {
              field_path: "attestations.signed_off",
              actual_value: payload.attestations.signed_off,
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }
    }
  }

  return results;
}

function runFormNPortRules(
  filing: FilingEnvelope,
  payload: FormNPort
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const rule of FORM_N_PORT_RULES) {
    switch (rule.id) {
      case "NP-001": {
        const fmt = filing.submission_metadata.package_format;
        if (fmt !== "xml") {
          results.push(
            fail(rule, {
              field_path: "submission_metadata.package_format",
              actual_value: fmt,
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "NP-002": {
        const periodEnd = payload.registrant.reporting_period_end;
        if (!isLastDayOfMonth(periodEnd)) {
          results.push(
            fail(rule, {
              field_path: "registrant.reporting_period_end",
              actual_value: periodEnd,
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "NP-003": {
        let anyFail = false;
        for (const holding of payload.holdings) {
          const id = holding.identifier;
          if (!id.cusip && !id.isin && !id.ticker) {
            results.push(
              fail(rule, {
                field_path: `holdings[${holding.holding_id}].identifier`,
                actual_value: { holding_id: holding.holding_id, identifier: id },
              })
            );
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }

      case "NP-004": {
        const sumBySeries: Record<string, number> = {};
        for (const h of payload.holdings) {
          sumBySeries[h.series_id] = (sumBySeries[h.series_id] ?? 0) + (h.value ?? 0);
        }
        const TOLERANCE = 0.001;
        let anyFail = false;
        for (const series of payload.series) {
          const sum = sumBySeries[series.series_id] ?? 0;
          const net = series.net_assets;
          const delta = net > 0 ? Math.abs(sum - net) / net : Math.abs(sum - net);
          if (delta > TOLERANCE) {
            results.push(
              fail(rule, {
                field_path: `series[${series.series_id}].net_assets`,
                actual_value: { series_id: series.series_id, sum_holdings: sum, net_assets: net, delta_pct: delta },
              })
            );
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }

      case "NP-005": {
        let anyFail = false;
        for (const holding of payload.holdings) {
          const pct = holding.pct_net_assets;
          if (pct < 0 || pct > 100) {
            results.push(
              fail(rule, {
                field_path: `holdings[${holding.holding_id}].pct_net_assets`,
                actual_value: pct,
              })
            );
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
          if (seen.has(h.holding_id)) {
            dupes.add(h.holding_id);
          }
          seen.add(h.holding_id);
        }
        if (dupes.size > 0) {
          for (const id of dupes) {
            results.push(
              fail(rule, {
                field_path: `holdings[${id}].holding_id`,
                actual_value: id,
              })
            );
          }
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "NP-007": {
        // Placeholder: amendment_indicator vs effective_date check.
        // Flag if amendment_indicator is true but effective_date is not set.
        const isAmendment = filing.amendment_indicator;
        const effectiveDate = payload.registrant.effective_date;
        if (isAmendment && (!effectiveDate || effectiveDate.trim() === "")) {
          results.push(
            fail(rule, {
              field_path: "registrant.effective_date",
              actual_value: { amendment_indicator: true, effective_date: effectiveDate },
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "NP-008": {
        const liq = payload.liquidity;
        const bucketSum =
          liq.bucket_1_day +
          liq.bucket_2_7_days +
          liq.bucket_8_30_days +
          liq.bucket_gt_30_days;
        const totalPortfolio = payload.holdings.reduce(
          (sum, h) => sum + (h.value ?? 0),
          0
        );
        const TOLERANCE = 0.001;
        const delta =
          totalPortfolio > 0
            ? Math.abs(bucketSum - totalPortfolio) / totalPortfolio
            : Math.abs(bucketSum - totalPortfolio);
        if (delta > TOLERANCE) {
          results.push(
            fail(rule, {
              field_path: "liquidity",
              actual_value: { bucket_sum: bucketSum, total_portfolio: totalPortfolio, delta_pct: delta },
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }

      case "NP-009": {
        let anyFail = false;
        for (const holding of payload.holdings) {
          if (holding.value == null) {
            results.push(
              fail(rule, {
                field_path: `holdings[${holding.holding_id}].value`,
                actual_value: holding.value,
              })
            );
            anyFail = true;
          }
        }
        if (!anyFail) results.push(pass(rule));
        break;
      }

      case "NP-010": {
        const status = filing.submission_metadata.submission_status;
        if (status !== "ready_to_file" && status !== "submitted") {
          results.push(
            fail(rule, {
              field_path: "submission_metadata.submission_status",
              actual_value: status,
            })
          );
        } else {
          results.push(pass(rule));
        }
        break;
      }
    }
  }

  return results;
}

export function runValidation(
  filing: FilingEnvelope,
  payload: FormPF | FormNPort
): ValidationResult[] {
  if (isFormPF(payload)) {
    return runFormPFRules(filing, payload);
  }
  if (isFormNPort(payload)) {
    return runFormNPortRules(filing, payload);
  }
  return [];
}
