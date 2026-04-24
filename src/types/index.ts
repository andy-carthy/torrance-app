export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  isController: boolean;
}

export interface FundSeed {
  fund_id: string;
  name: string;
  series: string;
  client: string;
  period: string;
  net_assets: number;
  prior_net_assets: number;
  sla_days: number;
  assignedTo: string;
  fundType: string;
  requiredFilings: string[];
}

export interface ThreadMessage {
  id: string;
  userId: string;
  text: string;
  ts: string;
}

export interface Exception {
  id: string;
  severity: "error" | "warning";
  code: string;
  title: string;
  message: string;
  field: string;
  currentValue: string;
  expectedValue: string;
  account_number: string;
  account_name: string;
  class: string;
  row: number;
  amount: number;
  status: "open" | "resolved";
  resolution: string | null;
  overrideValue: string;
  assignee: string | null;
  resolvedBy: string | null;
  thread: ThreadMessage[];
}

export interface ApprovalRecord {
  status: "open" | "submitted" | "review_pending" | "approved";
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface Filing {
  id: string;
  fund_id: string;
  fund: string;
  client: string;
  form: string;
  period: string;
  dueDate: string;
  daysLeft: number;
  status: string;
  assignedTo: string;
  notes: string;
}

export interface IngestionFeed {
  id: string;
  period: string;
  connType: string;
  fund_id: string;
  fund: string;
  client: string;
  payload: string;
  type: string;
  rows: number;
  received: string;
  sourceOrigin: string;
  exceptions: number;
  status: string;
}

export interface TBRow {
  gl_row_id: number;
  fund_id: string;
  acct: string;
  name: string;
  category: string;
  account_subcategory: string;
  currency: string;
  local_amount: number;
  exchange_rate: number;
  exchange_rate_source: string;
  exchange_rate_date: string;
  posting_date: string;
  trade_date: string;
  period_year: number;
  period_month: number;
  journal_ref: string;
  journal_description: string;
  share_class: string;
  source_system: string;
  is_intercompany: boolean;
  segment_code: string;
  counterparty: string;
  debit: number;
  credit: number;
}

export interface HoldingRow {
  position_id: string;
  fund_id: string;
  as_of_date: string;
  cusip: string;
  isin: string;
  sedol: string;
  lei: string;
  ticker: string;
  name: string;
  assetClass: string;
  asset_subclass: string;
  sector: string;
  country_of_risk: string;
  country_of_issuer: string;
  currency: string;
  shares: number;
  cost: number;
  market_value_local: number;
  mv: number;
  price: number;
  price_date: string;
  price_source: string;
  fvLevel: number;
  fv_technique: string;
  maturity_date: string | null;
  coupon_rate: number | null;
  coupon_type: string | null;
  notional_amount: number | null;
  is_restricted: boolean;
  restriction_note: string | null;
  is_on_loan: boolean;
  class: string;
  liquidity_category: number;
  is_illiquid_investment: boolean;
}

export interface CapitalActivityRow {
  id?: string;
  txn_id: string;
  fund_id: string;
  as_of_date: string;
  type: string;
  investor: string;
  lp_id: string;
  class: string;
  amount: number;
  grossAmount?: number;
  shares: number;
  nav_per_share: number;
  status: string;
  source_system: string;
}

export interface WorkpaperTemplate {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  varKey: string;
  formula: string;
  isGlobal: boolean;
  aiVerified: boolean;
  feeds: string[];
  syncedFunds: number;
  outOfSync: number;
  liveValue: number;
  unit: string;
}

export interface AiDecisionLogEntry {
  id: string;
  timestamp: string;
  type: string;
  exceptionId: string;
  rule: string;
  confidence: number;
  status: string;
  impact: string;
  details: string;
  originalValue: string;
  correctedValue: string;
}

export interface MappingRow {
  sourceField: string;
  sampleValue: string;
  canonicalField: string;
  confidence: number;
  status: string;
}
