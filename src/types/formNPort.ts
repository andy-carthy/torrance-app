export interface NPortRegistrant {
  legal_name: string;
  cik: string;
  lei: string;
  series_id: string;
  fund_type: "mutual_fund" | "etf" | "closed_end_fund" | "other";
  reporting_period_end: string;
  effective_date: string;
}

export interface NPortSeries {
  series_id: string;
  series_name: string;
  class_id: string;
  class_name: string;
  net_assets: number;
  shares_outstanding: number;
}

export interface Holding {
  holding_id: string;
  series_id: string;
  name: string;
  title: string;
  identifier: {
    cusip?: string;
    isin?: string;
    ticker?: string;
    other?: string;
  };
  asset_type: "equity" | "debt" | "derivative" | "repo" | "cash" | "loan" | "other";
  issuer: string;
  country: string;
  currency: string;
  value: number;
  principal_amount: number;
  pct_net_assets: number;
  maturity_date: string | null;
  payoff_profile: string;
  liquidity_classification: "1" | "2" | "3" | "4";
  fair_value_level: "1" | "2" | "3";
}

export interface Derivative {
  derivative_id: string;
  series_id: string;
  instrument_type: "swap" | "option" | "future" | "forward" | "other";
  underlying: string;
  notional: number;
  market_value: number;
  delta_adjusted_exposure: number;
  counterparty: string;
  settlement_date: string;
}

export interface LiquidityProfile {
  bucket_1_day: number;
  bucket_2_7_days: number;
  bucket_8_30_days: number;
  bucket_gt_30_days: number;
  illiquid_percentage: number;
  highly_liquid_investment_minimum: number;
}

export interface RiskProfile {
  VaR: number;
  stress_test: number;
  concentration_top10: number;
  derivative_exposure: number;
}

export interface FilingNote {
  note_id: string;
  topic: string;
  text: string;
  related_field_paths: string[];
}

export interface FormNPort {
  registrant: NPortRegistrant;
  series: NPortSeries[];
  holdings: Holding[];
  derivatives: Derivative[];
  liquidity: LiquidityProfile;
  risk: RiskProfile;
  notes: FilingNote[];
}
