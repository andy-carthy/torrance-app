import type { AiDecisionLogEntry } from '../types';

export const AI_PARAM_DEFAULTS = {
  confidenceThreshold:   80,   // % — minimum confidence to show an AI suggestion
  autoAcceptThreshold:   95,   // % — confidence above which suggestions are auto-accepted
  fxVarianceTolerance:  200,   // USD — FX variances below this amount are auto-acknowledged
  priorPeriodLookback:    6,   // months
  eligibleCodes: ["FX_MISMATCH","FX_RATE_VARIANCE","HOLDINGS_CROSS_CHECK","ACCRUAL_VARIANCE"],
  allCodes:      ["CATEGORY_MISMATCH","MISSING_ACCOUNT_NUMBER","FX_MISMATCH","FX_RATE_VARIANCE","INVALID_ACCOUNT","MISSING_FUND_ID","HOLDINGS_CROSS_CHECK","ACCRUAL_VARIANCE","NAV_MISMATCH","STALE_PRICE","COUNTERPARTY_MISSING"],
};

// ─── SPRINT 1 DATA: Autonomous Log & AI Decisions (C-02 & C-03) ─────────────

// ─── SPRINT 1 DATA: Autonomous Log & AI Decisions (Updated) ─────────────────
export const AI_DECISION_LOG: AiDecisionLogEntry[] = [
  { id: 'log-1', timestamp: 'Dec 31, 23:46:01', type: 'autonomous', exceptionId: 'EXC-A01', rule: 'Bloomberg FX tolerance rule (< 0.05%)', confidence: 99, status: 'auto-resolved', impact: 'Variance Cleared', details: 'FX rate variance below threshold. Source: Bloomberg B-PIPE.', originalValue: '1.0845', correctedValue: '1.0842' },
  { id: 'log-2', timestamp: 'Dec 31, 23:46:02', type: 'autonomous', exceptionId: 'EXC-A02', rule: 'Bloomberg FX tolerance rule (< 0.05%)', confidence: 99, status: 'auto-resolved', impact: 'Variance Cleared', details: 'FX rate variance below threshold. Source: Bloomberg B-PIPE.', originalValue: '1.2610', correctedValue: '1.2611' },
  { id: 'log-3', timestamp: 'Dec 31, 23:46:03', type: 'autonomous', exceptionId: 'EXC-A03', rule: 'T+1 settlement match', confidence: 98, status: 'auto-resolved', impact: 'Trade Reconciled', details: 'T+1 settlement variance matches confirmed trade record.', originalValue: 'Unsettled', correctedValue: 'Settled' },
  { id: 'log-4', timestamp: 'Dec 31, 23:46:04', type: 'autonomous', exceptionId: 'EXC-A04', rule: 'Prior-period frequency match (6 periods)', confidence: 96, status: 'auto-resolved', impact: 'Acknowledged', details: 'Routine accrual rounding variance.', originalValue: '$4,500.01', correctedValue: '$4,500.00' },
  { id: 'log-5', timestamp: 'Jan 01, 09:22:15', type: 'human-certified', exceptionId: 'EXC-003', rule: 'Prior-period resolution + Bloomberg 4PM fix', confidence: 92, status: 'human-accepted', impact: 'Value Overridden', details: 'Overridden EUR dividend income. Accepted by S. Chen.', originalValue: '$200,000.00', correctedValue: '$108,420.00' },
  { id: 'log-6', timestamp: 'Jan 01, 09:25:10', type: 'human-certified', exceptionId: 'EXC-H01', rule: 'Regex pattern extraction', confidence: 88, status: 'human-accepted', impact: 'Entity Extracted', details: 'Extracted counterparty name from unstructured wire detail.', originalValue: 'WIRE IN GS&CO NYC', correctedValue: 'Goldman Sachs & Co.' },
  { id: 'log-7', timestamp: 'Jan 01, 09:30:00', type: 'human-certified', exceptionId: 'EXC-006', rule: 'GL to Holdings Reconciliation', confidence: 94, status: 'human-accepted', impact: 'Mapped ID', details: 'Reconciled orphaned holding based on CUSIP fuzzy match.', originalValue: 'Unknown Asset', correctedValue: 'ID-8821' },
  { id: 'FOOT-AR-001', timestamp: 'Dec 31, 11:59 PM', type: 'footing', exceptionId: 'FOOTING_VARIANCE', rule: 'Largest Remainder Method', confidence: 99.8, status: 'auto_accepted', impact: 'Debit column corrected by $1', details: '3 EUR-translated positions in Account 1010 produced $1 column rounding residual. Largest Remainder applied: +$1 distributed to Account 1010-EUR-01 (largest remainder: $0.47).', originalValue: '$75,894,426 (Floored)', correctedValue: '$75,894,427 (Target)' },
  { id: 'FOOT-AR-002', timestamp: 'Dec 31, 11:59 PM', type: 'footing', exceptionId: 'FOOTING_VARIANCE', rule: 'Largest Remainder Method', confidence: 99.9, status: 'auto_accepted', impact: 'SOI subtotal corrected by $7', details: '7 Common Stock positions produced $7 subtotal rounding residual. Largest Remainder applied: +$1 distributed to each position.', originalValue: '$608,748,493 (Floored)', correctedValue: '$608,748,500 (Target)' }
];
export const SOC1_ACCESS_LOG = [
  {ts:"Dec 31, 11:58 PM",user:"u1",action:"GL ingested",detail:"RB_GL_20241231.csv — 131 rows, 8 exceptions raised"},
  {ts:"Dec 31, 9:14 AM", user:"u1",action:"Exception flagged",detail:"EXC-001: CATEGORY_MISMATCH — Account 1010 classification error"},
  {ts:"Dec 31, 10:02 AM",user:"u4",action:"Thread comment",detail:"EXC-001: Confirmed — correct at source, do not override"},
  {ts:"Dec 31, 9:22 AM", user:"u1",action:"AI suggestion accepted",detail:"EXC-003: FX override $108,420 — 97% confidence"},
  {ts:"Dec 31, 2:00 PM", user:"u1",action:"Submitted for review",detail:"Pennywise Global Diversified Fund submitted to James Okafor"},
];

export const SOC1_AI_STATS = {
  totalSuggestions: 5, accepted: 4, dismissed: 1, autoAccepted: 0, acceptanceRate: 80, overrides: 1, overrideJustified:true,
};

// ─── AI / Prior Period data (IT4) ────────────────────────────────────────────
export const AI_SUGGESTIONS = {
  "EXC-003":{summary:"Last month you overrode this with Bloomberg Spot Rate",detail:"In the November 30, 2024 close, EUR 100,000 Dividend Income (Account 4020) had the same FX mismatch. You accepted a Bloomberg WM/Reuters fix override of $108,420.",resolution:"override_value",overrideValue:"$108,420.00",confidence:97,priorPeriod:"November 30, 2024"},
  "EXC-H01":{summary:"T+1 settlement lag — same pattern seen Oct & Nov closes",detail:"Apple Inc share count variance of 3,300 shares appeared in both October and November closes due to T+1 settlement timing. In both months the exception was acknowledged and cleared within 2 business days.",resolution:"acknowledged",overrideValue:"",confidence:89,priorPeriod:"November 30, 2024"},
  "EXC-006":{summary:"FX variance within Bloomberg tolerance — acknowledged last 3 months",detail:"JPY rate variance at this magnitude (<$200) has been acknowledged without action for 3 consecutive month-ends (Sep, Oct, Nov 2024).",resolution:"acknowledged",overrideValue:"",confidence:99,priorPeriod:"November 30, 2024"},
  "EXC-007":{summary:"GBP variance — acknowledged in prior 2 periods",detail:"GBP equity block FX variance below $50,000 threshold acknowledged in October and November closes.",resolution:"acknowledged",overrideValue:"",confidence:92,priorPeriod:"November 30, 2024"},
  "EXC-B01":{summary:"Rounding difference — auto-cleared in last 4 periods",detail:"30/360 vs actual/actual rounding has produced a sub-$10,000 variance in every period since June 2024.",resolution:"acknowledged",overrideValue:"",confidence:99,priorPeriod:"November 30, 2024"},
};
export const PRIOR_PERIOD_FLAGS = {
  "EXC-001":{type:"spike",  message:"Account category mismatch has NOT occurred in any prior 6 periods — new pattern. High risk.",priorOccurrences:0},
  "EXC-003":{type:"repeat", message:"FX mismatch on Account 4020 occurred in 2 of the last 6 periods (Oct, Nov 2024).",priorOccurrences:2},
  "EXC-H01":{type:"repeat", message:"Holdings cross-check variance on AAPL appeared in 3 of last 6 periods. Likely T+1 settlement.",priorOccurrences:3},
  "EXC-006":{type:"routine",message:"JPY FX rate variance has occurred in all 6 prior periods. Consistent rounding artifact.",priorOccurrences:6},
  "EXC-007":{type:"routine",message:"GBP FX variance has appeared in 5 of last 6 periods. Consistent end-of-month pattern.",priorOccurrences:5},
};
export const AI_FOOTNOTES = [
  { id:"fn-1",  title:"Basis of Presentation",           category:"Significant Accounting Policies", aiDrafted:false, varBindings:[],                                          content:`These financial statements have been prepared in conformity with accounting principles generally accepted in the United States of America (U.S. GAAP) as applicable to investment companies under ASC Topic 946. The fiscal year end is December 31, 2024.`,                                                                                                                                                                       lastEdited:"Edited · Sarah Chen · Dec 31, 2024",         wordCount:42 },
  { id:"fn-2",  title:"Fair Value — Level 3 Investments",category:"Fair Value Hierarchy",             aiDrafted:true,  varBindings:["ASC820_L3_PCT","L1_MARKET_VALUE","NET_ASSETS"], content:`The Fund uses a three-tier fair value hierarchy. As of December 31, 2024, Level 3 investments represented {{ASC820_L3_PCT}} of net assets of {{NET_ASSETS}}. Level 1 exchange-traded securities totalled {{L1_MARKET_VALUE}}. All Level 3 positions were valued using a discounted cash flow methodology with unobservable inputs reviewed quarterly by the Valuation Committee.`,                                              lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:62 },
  { id:"fn-3",  title:"Foreign Currency Translation",    category:"Significant Accounting Policies", aiDrafted:true,  varBindings:[],                                          content:`The Fund's functional and reporting currency is the U.S. Dollar. Portfolio investments denominated in foreign currencies are translated at WM/Reuters 4:00 PM London closing exchange rates on December 31, 2024. EUR/USD 1.0842, GBP/USD 1.2715, JPY/USD 0.006711. Net realized and unrealized currency gains and losses are presented separately on the Statement of Operations.`,                                                  lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:65 },
  { id:"fn-4",  title:"Investment Advisory Fees",        category:"Related Party Transactions",       aiDrafted:true,  varBindings:["NET_EXPENSE_RATIO","MGMT_FEE_ACCRUAL"],    content:`Pennywise Capital Advisors LLC receives an annual advisory fee at 0.75% (Class A), 0.60% (Institutional), 0.55% (R6) of average daily net assets. For the year ended December 31, 2024, advisory fees incurred were {{MGMT_FEE_ACCRUAL}}, of which $590,000 remained payable at period end. The net expense ratio was {{NET_EXPENSE_RATIO}}.`,                                                                                    lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:58 },
  { id:"fn-5",  title:"Derivatives and Hedging",         category:"Derivative Instruments",           aiDrafted:false, varBindings:["CPTY_EXPOSURE_PCT"],                       content:`[HUMAN EDIT REQUIRED: Confirm notional amounts and fair values for all open derivative positions as of December 31, 2024. Current unrealized appreciation on futures: $1,250,000; on swaps: $680,000; on FX forwards: $340,000. Counterparty exposure as a percentage of net assets: {{CPTY_EXPOSURE_PCT}}. Confirm this does not exceed Form PF disclosure thresholds.]`,                                                               lastEdited:"Partially edited · Sarah Chen · Dec 31, 2024",wordCount:56 },
  { id:"fn-6",  title:"Securities Lending",              category:"Significant Accounting Policies", aiDrafted:true,  varBindings:[],                                          content:`The Fund participates in a securities lending program managed by State Street Bank & Trust Co. As of December 31, 2024, the fair value of securities on loan was approximately $157.8M. Collateral received consists solely of cash equivalents held in a separately managed account. Securities lending income of $320,000 is included within investment income on the Statement of Operations.`,                                         lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:62 },
  { id:"fn-7",  title:"Concentration Risk",              category:"Risk Disclosures",                 aiDrafted:false, varBindings:["HIGHLY_LIQUID_PCT"],                       content:`As of December 31, 2024, approximately 34% of net assets were invested in technology sector securities. The three largest positions (Apple Inc., Microsoft Corp., Alphabet Inc.) represented 68% of the equity sleeve. Highly liquid investments as a percentage of net assets were {{HIGHLY_LIQUID_PCT}}. Investors should consider the concentration risk inherent in this allocation.`,                                                  lastEdited:"Edited · James Okafor · Dec 31, 2024",       wordCount:61 },
  { id:"fn-8",  title:"Management Fee Waiver",           category:"Related Party Transactions",       aiDrafted:true,  varBindings:["NET_EXPENSE_RATIO","MGMT_FEE_ACCRUAL"],    content:`The Adviser has contractually agreed to waive fees and/or reimburse Fund expenses to limit total annual operating expenses to 0.75% (Class A) through at least April 30, 2026. For the year ended December 31, 2024, fee waivers amounted to $150,000. The management fee accrual was {{MGMT_FEE_ACCRUAL}} and the resulting net expense ratio was {{NET_EXPENSE_RATIO}}.`,                                                            lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:60 },
  { id:"fn-9",  title:"Capital Share Transactions",      category:"Capital Activity",                 aiDrafted:true,  varBindings:["CLASS_A_INCOME_ALLOC","INST_INCOME_ALLOC"],content:`For the year ended December 31, 2024, the Fund had net subscriptions of $8.6M and net redemptions of $2.5M across all share classes. Income allocated to Class A shareholders was {{CLASS_A_INCOME_ALLOC}}. Income allocated to Institutional shareholders was {{INST_INCOME_ALLOC}}. Dividend reinvestments totalled $65,431 during the period.`,                                                                                             lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:58 },
  { id:"fn-10", title:"Portfolio Turnover Rate",         category:"Financial Highlights",             aiDrafted:true,  varBindings:["PORTFOLIO_TURNOVER","SEC_30_DAY_YIELD"],   content:`For the year ended December 31, 2024, the portfolio turnover rate was {{PORTFOLIO_TURNOVER}}. Portfolio turnover is calculated by dividing the lesser of purchases or sales of portfolio securities for the period by the average monthly value of portfolio securities owned during the period. The 30-day SEC Yield as of period end was {{SEC_30_DAY_YIELD}}.`,                                                                              lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:59 },
  { id:"fn-11", title:"Subsequent Events",               category:"Subsequent Events",                aiDrafted:false, varBindings:[],                                          content:`Management has evaluated subsequent events through the date the financial statements were available to be issued. No events have occurred subsequent to December 31, 2024 that would require recognition or disclosure in the financial statements, except as already described herein. The Fund's next distribution record date is January 15, 2025.`,                                                                                     lastEdited:"Edited · James Okafor · Dec 31, 2024",       wordCount:54 },
  { id:"fn-12", title:"Indemnifications",                category:"Significant Accounting Policies", aiDrafted:true,  varBindings:[],                                          content:`In the normal course of business, the Fund enters into contracts that contain a variety of indemnifications. The Fund's maximum exposure under these arrangements is unknown. However, the Fund has not had prior claims or losses pursuant to these indemnification contracts and expects the risk of loss to be remote.`,                                                                                                                lastEdited:"AI-drafted · Dec 31, 2024",                  wordCount:50 },
];

export const AI_ROOT_CAUSE = {
  "EXC-001": {
    confidence: 91,
    rootCause: "Upstream ETL pipeline mis-tagged Account 1010 as category 'Income' during the December 29 batch run. Source system classification table was overwritten by a bulk-load job (ETL-20241229-0341) that lacked schema validation against the Chart of Accounts master.",
    causeChain: [
      { step:1, label:"Source System",  detail:"Custodian GL export at 11:48 PM Dec 28 included a bad category flag on acct 1010 — custodian's category enum differs from Torrance COA." },
      { step:2, label:"ETL Transform",  detail:"Batch job ETL-20241229-0341 propagated the category field without validating against the Torrance COA master. No schema guard existed for this field." },
      { step:3, label:"GL Ingestion",   detail:"Torrance loaded the GL at 11:58 PM Dec 31. Rules engine caught the mismatch at row 127 and raised EXC-001." },
    ],
    affectedDownstream: [
      "Trial Balance — Asset subtotal understated by $500,000",
      "SOA — 'Investments, at Value' will be understated on the Statement of Assets",
      "SOO — Investment income will be double-counted in Total Investment Income",
      "FV Table cross-check (Check 3) will fail until corrected",
    ],
    suggestedRemediation: "Contact custodian ops team to re-export Account 1010 rows with correct category 'Asset'. Do not override — the fix must be at source to preserve audit trail integrity. Expected resolution time: 4–6 hours.",
    similarPastExceptions: [
      { id:"EXC-C01", fund:"Bowers Growth Equity", date:"Sep 30, 2024", resolution:"corrected_source", outcome:"Resolved in 4h" },
    ],
  },
  "EXC-003": {
    confidence: 97,
    rootCause: "FX conversion was applied using a stale ECB reference rate (1.0798) rather than the WM/Reuters 4PM London fix (1.0842) required by the fund's valuation policy. The stale rate was cached in the accounting system's FX table, which was last refreshed November 30.",
    causeChain: [
      { step:1, label:"Rate Source",    detail:"Accounting system FX table last refreshed Nov 30 — did not pull the Dec 31 WM/Reuters 4PM London fix for EUR/USD." },
      { step:2, label:"Conversion",     detail:"EUR 100,000 × 1.0798 (stale ECB) = $107,980, vs required 1.0842 = $108,420. A compounding data entry error further inflated the reported amount to $200,000." },
      { step:3, label:"GL Entry",       detail:"Account 4020 loaded into Torrance with $200,000 — substantially above the Bloomberg-correct value of $108,420." },
    ],
    affectedDownstream: [
      "Dividend Income — Foreign overstated by $91,580 on the SOO",
      "Total Investment Income materially misstated",
      "Net Increase in Net Assets from Operations affected downstream",
    ],
    suggestedRemediation: "Override Account 4020 with Bloomberg WM/Reuters fix value of $108,420.00. The AI Suggestion (97% confidence) pre-fills this exact resolution based on the identical November 30 close precedent.",
    similarPastExceptions: [
      { id:"EXC-003", fund:"Pennywise Global Diversified", date:"Nov 30, 2024", resolution:"override_value", outcome:"Override accepted" },
      { id:"EXC-003", fund:"Pennywise Global Diversified", date:"Oct 31, 2024", resolution:"override_value", outcome:"Override accepted" },
    ],
  },
  "EXC-H01": {
    confidence: 89,
    rootCause: "T+1 settlement timing mismatch. Apple Inc (CUSIP 037833100) had 3,300 shares purchased on December 30 that will not settle until January 2, 2025 (T+1). The custodian's position file reflects the settled state (284,500 shares) while the fund GL reflects trade-date accounting (281,200 booked at cost).",
    causeChain: [
      { step:1, label:"Trade Date",     detail:"3,300 AAPL shares purchased Dec 30 and booked in the GL under Trade Date Accounting (TDA)." },
      { step:2, label:"Settlement",     detail:"T+1 settlement will occur January 2, 2025. The custodian's Dec 31 position file already shows the settled balance of 284,500." },
      { step:3, label:"Cross-Check",    detail:"Holdings cross-check runs on Dec 31: custodian 284,500 vs GL 281,200 = variance of 3,300 shares (≈$658K). This is an expected T+1 artifact." },
    ],
    affectedDownstream: [
      "SOI — Apple Inc position count will appear slightly understated",
      "Holdings KPI — Total Market Value understated by ≈$658K",
    ],
    suggestedRemediation: "Acknowledge this exception. The 3,300 share variance is a known T+1 settlement artifact that will self-correct on January 2. No restatement is required. Document the rationale in the audit thread.",
    similarPastExceptions: [
      { id:"EXC-H01", fund:"Pennywise Global Diversified", date:"Nov 30, 2024", resolution:"acknowledged", outcome:"Auto-cleared Jan 2" },
      { id:"EXC-H01", fund:"Pennywise Global Diversified", date:"Oct 31, 2024", resolution:"acknowledged", outcome:"Auto-cleared Nov 1" },
    ],
  },
};

