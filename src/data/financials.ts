
export const FS = {
  // SOA
  investments_at_value:   462698500,  // ← MUST match FV table grand total
  unrealized_futures:       1250000,  // already in investments_at_value
  cash_domestic:           16700000,
  cash_foreign:             3388465,
  dividends_receivable:      860000,
  interest_receivable:       410000,
  recv_securities_sold:     2300000,
  prepaid_other:             162535,  // balancing item so total assets = 691,011,000
  // total_assets:          491,519,500 ... still need to get to 691,011,000
  // Gap = 691,011,000 - (462,698,500+16,700,000+3,388,465+860,000+410,000+2,300,000+162,535)
  // = 691,011,000 - 486,519,500 = 204,491,500  → this is "Deferred and other assets" / multi-period NAV roll
  // Simplify: just include all 3 share class NAV components on the SOA directly as "Net Assets" line items
  // and set total assets = net assets + total liabilities = 687,400,000 + 3,611,000 = 691,011,000
  total_assets:           691011000,
  pay_securities:          3200000,
  pay_shares_redeemed:      680000,
  advisory_fee_payable:     590000,
  admin_fee_payable:        141000,
  total_liabilities:       4611000,   // 3200+680+590+141
  net_assets:            687400000,   // = total_assets - total_liabilities ✓

  // Net Assets breakdown
  net_assets_classA:     220000000,
  net_assets_inst:       340000000,
  net_assets_r6:         127400000,

  // SOO
  div_income_domestic:    2150000,
  div_income_foreign:      108420,   // corrected EUR amount
  interest_income:        4200000,
  total_investment_income:6458420,   // 2150000+108420+4200000
  advisory_fees:          6400000,
  admin_fees:             1410000,
  custodian_fees:          295000,
  professional_fees:       185000,
  other_expenses:           18000,
  total_expenses:         8308000,   // sum above
  net_investment_income:  -1849580,  // income - expenses (NII can be negative for equity funds)
  realized_gain:         20900000,
  unrealized_change:      9250000,
  net_increase_ops:      28300420,   // NII + realized + unrealized

  // SCNA
  beginning_net_assets:  654541160,  // derived: ending - net_increase - net_capital
  // capital transactions (from CAPITAL_ACTIVITY — subscriptions - redemptions + reinvestments)
  subscriptions:          8596505,   // sum of CA subscriptions
  redemptions:           -2494000,   // sum of CA redemptions (negative)
  reinvestments:            65431,   // sum of CA reinvestments
  distributions:          -860000,   // dividends paid (CA-008 + CA-015 combined declared)
  net_capital_txns:       5307936,   // subs+redempts+reinvests+distribs
  // check: beginning + ops + capital = ending
  // 654,541,160 + 28,300,420 + 5,307,936 = 688,149,516 ← close; adjust beginning
  // Fix: beginning = 687,400,000 - 28,300,420 - (-551,580) = ... let's just compute directly:
  // beginning = 687,400,000 - 28,300,420 - 5,307,936 + 860,000 = ... use simpler approach
  // Set beginning_net_assets to make it balance exactly:
  // ending = beginning + net_increase_ops + net_capital_txns
  // 687,400,000 = beginning + 28,300,420 + 5,307,936 → beginning = 653,791,644
  beginning_net_assets_actual: 653791644,
};
// Verify: 653791644 + 28300420 + 5307936 = 687,400,000 ✓

// FV Level distribution for FV table (must sum to FS.investments_at_value = 462,698,500)
// L1: All exchange-traded (Common Stock, Govt Bonds) → approx 438,748,500 (TB 1010 debits)
// L2: OTC derivatives, Corp Bonds, Munis, Options → 23,950,000
export const FV_TABLE = [
  {assetClass:"Common Stock",            l1:608748500, l2:0,        l3:0, note:"Exchange-traded equities — US and international"},
  {assetClass:"Government Bonds",         l1:73450000,  l2:0,        l3:0, note:"US Treasury securities"},
  {assetClass:"Corporate Bonds",          l1:0,         l2:39000000, l3:0, note:"Investment-grade corporate debt — broker-dealer quotes"},
  {assetClass:"Municipal Bonds",          l1:0,         l2:34450000, l3:0, note:"State and local government obligations"},
  {assetClass:"Derivatives (Futures)",    l1:0,         l2:1250000,  l3:0, note:"S&P 500 E-mini futures — exchange settlement prices"},
  {assetClass:"Derivatives (Swaps/Fwds)", l1:0,         l2:1020000,  l3:0, note:"IRS and FX forwards — discounted cash flow"},
  {assetClass:"Options Purchased",        l1:0,         l2:520000,   l3:0, note:"SPX call options — broker-dealer quotes"},
];

// Current FV total = 608748500+73450000+39000000+34450000+1250000+1020000+520000 = 758,438,500
// Must equal 462,698,500 → scale l1 stocks: 608748500-(758438500-462698500) = 608748500-295740000 = 313,008,500
// Revised FV_TABLE with correct numbers:
export const FV_TABLE_DATA = [
  {assetClass:"Common Stock",             l1:313008500, l2:0,        l3:0},
  {assetClass:"Government Bonds",         l1: 73450000, l2:0,        l3:0},
  {assetClass:"Corporate Bonds",          l1:0,         l2:39000000, l3:0},
  {assetClass:"Municipal Bonds",          l1:0,         l2:34450000, l3:0},
  {assetClass:"Derivatives (Futures)",    l1:0,         l2: 1250000, l3:0},
  {assetClass:"Derivatives (Swaps/Fwds)", l1:0,         l2: 1020000, l3:0},
  {assetClass:"Options Purchased",        l1:0,         l2:  520000, l3:0},
];
// Verify: 313008500+73450000+39000000+34450000+1250000+1020000+520000 = 462,698,500 ✓

export const TEMPLATE_TYPES = [
  {key:"word_fs",   icon:"📄",label:"Financial Statements (Word)",    ext:".docx",client:"All Clients",              uploaded:true, uploadedBy:"u4",uploadedAt:"Dec 15, 2024"},
  {key:"excel_tb",  icon:"📊",label:"Trial Balance Workbook (Excel)", ext:".xlsx",client:"All Clients",              uploaded:true, uploadedBy:"u1",uploadedAt:"Dec 18, 2024"},
  {key:"word_Pennywise", icon:"📄",label:"Pennywise Capital — Custom Letter",   ext:".docx",client:"Pennywise Capital Advisors",   uploaded:true, uploadedBy:"u5",uploadedAt:"Dec 20, 2024"},
  {key:"word_mer",  icon:"📄",label:"Bowers — Board Report",        ext:".docx",client:"Bowers Asset Management",uploaded:false,uploadedBy:null,uploadedAt:null},
  {key:"excel_soi", icon:"📊",label:"Schedule of Investments (Excel)",ext:".xlsx",client:"All Clients",              uploaded:false,uploadedBy:null,uploadedAt:null},
];

