import type { Exception } from '../types';

export const RESOLUTIONS = {
  error:[
    {value:"corrected_source",label:"Corrected in Source", icon:"✎",desc:"Fix applied in upstream source system."},
    {value:"override_value",  label:"Override with Value",  icon:"⌀",desc:"Manually set a replacement value."},
    {value:"exclude_report",  label:"Exclude from Report",  icon:"⊗",desc:"Remove this line item from the period."},
    {value:"defer_next",      label:"Defer to Next Period", icon:"↷",desc:"Carry forward; resolve in next close."},
    {value:"accept_as_is",    label:"Accept as Is",         icon:"✔",desc:"Accept the broken value. Requires justification."},
  ],
  warning:[
    {value:"acknowledged",    label:"Acknowledged",         icon:"👁",desc:"Reviewed and noted. No action required."},
    {value:"corrected_source",label:"Corrected in Source",  icon:"✎",desc:"Fix applied in upstream source system."},
    {value:"override_value",  label:"Override with Value",  icon:"⌀",desc:"Manually set a replacement value."},
    {value:"accept_as_is",    label:"Accept as Is",         icon:"✔",desc:"Accept the current value."},
  ],
};

export const mkExc = (base) => ({...base, overrideValue:"", assignee:null, resolvedBy:null, thread:base.thread||[]});
export const FUND_EXCEPTIONS: Record<string, Exception[]> = {
  "FND-2024-001":[
    mkExc({id:"EXC-001",severity:"error",  code:"CATEGORY_MISMATCH",    title:"Wrong Account Category",          message:"Account 1010 posted under Income. All TB roll-ups will be materially misstated.",field:"account_category",currentValue:"Income",     expectedValue:"Asset",                   account_number:"1010",account_name:"Investments in Securities, at Value",class:"Class A",       row:127,amount:500000,  status:"open",resolution:null,thread:[{id:"t1",userId:"u1",text:"Flagging — classification error in Dec 29 batch.",ts:"Dec 31, 9:14 AM"},{id:"t2",userId:"u4",text:"Confirmed. Correct at source. Do not override.",ts:"Dec 31, 10:02 AM"}]}),
    mkExc({id:"EXC-002",severity:"error",  code:"MISSING_ACCOUNT_NUMBER",title:"Missing Account Number",          message:"Row 128 has a $75,000 debit with no account number.",field:"account_number",currentValue:"(null)",    expectedValue:"Valid COA code",          account_number:"—",   account_name:"Unknown Account",                       class:"Institutional",row:128,amount:75000,    status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-003",severity:"error",  code:"FX_MISMATCH",            title:"FX Conversion Mismatch — EUR",    message:"Account 4020: EUR 100,000 × 1.0842 = $108,420. Reported $200,000.",field:"usd_amount",       currentValue:"$200,000.00",expectedValue:"$108,420.00",             account_number:"4020",account_name:"Dividend Income - Foreign",            class:"Class A",      row:129,amount:200000,  status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-004",severity:"error",  code:"INVALID_ACCOUNT",        title:"Account Not in Chart of Accounts",message:"Account 9999 'Suspense Account' does not exist in COA.",field:"account_number",currentValue:"9999",        expectedValue:"Approved COA account",    account_number:"9999",account_name:"Suspense Account",                     class:"R6",           row:130,amount:150000,  status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-005",severity:"error",  code:"MISSING_FUND_ID",        title:"Missing Fund ID & Fund Name",     message:"Row 131 missing fund_id. $50,000 Cash cannot be attributed.",field:"fund_id",          currentValue:"(null)",    expectedValue:"FND-2024-001",            account_number:"1100",account_name:"Cash - Domestic",                     class:"Class A",      row:131,amount:50000,   status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-H01",severity:"error",  code:"HOLDINGS_CROSS_CHECK",  title:"Holdings Cross-Check Failure",    message:"Apple Inc: custodian 284,500 vs GL 281,200. Variance 3,300 shares ≈ $658,482.",field:"shares",            currentValue:"281,200",    expectedValue:"284,500 (Custodian)",     account_number:"1010",account_name:"Investments in Securities, at Value",class:"Institutional",row:0,  amount:658482,  status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-006",severity:"warning",code:"FX_RATE_VARIANCE",      title:"FX Rate Variance — JPY",          message:"Account 1110: JPY rate 0.006711 vs Bloomberg fix 0.006712.",field:"exchange_rate",    currentValue:"0.006711",   expectedValue:"0.006712 (Bloomberg Fix)",account_number:"1110",account_name:"Cash - Foreign Currency",             class:"R6",           row:19, amount:1006650, status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-007",severity:"warning",code:"FX_RATE_VARIANCE",      title:"FX Rate Variance — GBP Block",    message:"GBP 28M @ 1.2715 vs Bloomberg close 1.2731.",field:"exchange_rate",    currentValue:"1.2715",     expectedValue:"1.2731 (Bloomberg Fix)",  account_number:"1010",account_name:"Investments in Securities, at Value", class:"Institutional",row:6,  amount:35602000,status:"open",resolution:null,thread:[]}),
  ],
  "FND-2024-002":[
    mkExc({id:"EXC-B01",severity:"error",code:"ACCRUAL_VARIANCE",title:"Interest Accrual Variance",message:"Account 4030: 30/360 accrual $4,195,000 vs system $4,200,000.",field:"usd_amount",currentValue:"$4,200,000",expectedValue:"$4,195,000",account_number:"4030",account_name:"Interest Income - Bonds",class:"Class A",row:88,amount:5000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-B02",severity:"error",code:"MISSING_PRICE",title:"Missing End of Day Price",message:"Asset ID 88732J202 missing EOD price.",field:"price",currentValue:"(null)",expectedValue:"96.24",account_number:"1010",account_name:"Investments in Securities",class:"Institutional",row:42,amount:120000,status:"open",resolution:null,thread:[]})
  ],
  "FND-2024-003":[
    mkExc({id:"EXC-C01",severity:"error",  code:"NAV_MISMATCH",         title:"NAV Per Share Mismatch",  message:"Class A NAV/share: $24.9100 (fund) vs $24.8712 (admin). $93,120 discrepancy.",field:"nav_per_share",currentValue:"$24.9100",expectedValue:"$24.8712 (Admin)",account_number:"3010",account_name:"Net Assets - Class A",class:"Class A",row:0,amount:93120,status:"resolved",resolution:"corrected_source",resolvedBy:"u5",thread:[{id:"t3",userId:"u5",text:"Resolved with administrator — confirmed at $24.8712.",ts:"Dec 31, 2:45 PM"}]}),
    mkExc({id:"EXC-C02",severity:"error",  code:"HOLDINGS_CROSS_CHECK", title:"Holdings Cross-Check",    message:"Microsoft: custodian 412,000 vs GL 415,500. Variance ≈ $1,330,000.",field:"shares",currentValue:"415,500",expectedValue:"412,000",account_number:"1010",account_name:"Investments in Securities",class:"Class A",row:0,amount:1330000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-C03",severity:"error",  code:"FX_MISMATCH",          title:"FX Mismatch — EUR Bonds", message:"EUR bonds stale ECB 1.0798 vs Bloomberg 1.0842. Understatement $441,000.",field:"exchange_rate",currentValue:"1.0798",expectedValue:"1.0842",account_number:"1010",account_name:"Investments",class:"Institutional",row:0,amount:441000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-C04",severity:"warning",code:"COUNTERPARTY_MISSING", title:"Missing Counterparty",    message:"4 rows in Account 2010 have no counterparty. $6.2M.",field:"counterparty",currentValue:"(null)",expectedValue:"Broker name",account_number:"2010",account_name:"Payable for Securities Purchased",class:"Institutional",row:0,amount:6200000,status:"open",resolution:null,thread:[]}),
  ],
  "FND-2024-004":[
    // NEW: Added an exception to Bowers Multi-Strategy so the Bowers client has exceptions across multiple funds
    mkExc({id:"EXC-M01",severity:"error",code:"RECON_BREAK",title:"Cash Reconciliation Break",message:"Bank balance $1,250,000 does not tie to GL balance $1,200,000.",field:"balance",currentValue:"$1,200,000",expectedValue:"$1,250,000",account_number:"1100",account_name:"Cash - Domestic",class:"Institutional",row:12,amount:50000,status:"open",resolution:null,thread:[]})
  ],
  "FND-2024-005":[
    mkExc({id:"EXC-D01",severity:"error",  code:"CATEGORY_MISMATCH",    title:"Wrong Category — Loan",  message:"Account 2500 booked under Capital. Expected Liability.",field:"account_category",currentValue:"Capital",expectedValue:"Liability",account_number:"2500",account_name:"Senior Secured Loan at Value",class:"Class A",row:42,amount:14200000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-D02",severity:"error",  code:"MISSING_ACCOUNT_NUMBER",title:"Missing Account — PIK", message:"2 PIK interest entries (rows 67, 71) unmapped. $380,000.",field:"account_number",currentValue:"(null)",expectedValue:"4510 or 4520",account_number:"—",account_name:"PIK Interest Income",class:"Class A",row:67,amount:380000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-D03",severity:"warning",code:"ACCRUAL_VARIANCE",     title:"Capital Call Variance",  message:"LP capital call accrual $2,100,000 vs register $2,085,000.",field:"usd_amount",currentValue:"$2,100,000",expectedValue:"$2,085,000",account_number:"3500",account_name:"Subscriptions Receivable",class:"Class A",row:0,amount:15000,status:"open",resolution:null,thread:[]}),
  ],
  "FND-2024-006":[
    mkExc({id:"EXC-E01",severity:"warning",code:"STALE_PRICE",     title:"Stale Price — Infrastructure",message:"'Redwood Infrastructure Partners': last valuation Q3 2024.",field:"price_date",currentValue:"2024-09-30",expectedValue:"2024-12-31",account_number:"1010",account_name:"Investments",class:"Institutional",row:0,amount:22000000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-E02",severity:"warning",code:"FX_RATE_VARIANCE",title:"FX Rate Variance — CAD",    message:"CAD 6,500,000 @ 0.7368 vs Bloomberg 0.7382.",field:"exchange_rate",currentValue:"0.7368",expectedValue:"0.7382",account_number:"1110",account_name:"Cash - Foreign Currency",class:"Institutional",row:0,amount:4789200,status:"open",resolution:null,thread:[]}),
  ],
};

