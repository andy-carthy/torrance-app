import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { FS, FV_TABLE_DATA } from '../../data/financials';
import { TB_ROWS } from '../../data/feeds/gl';
import { HOLDINGS } from '../../data/feeds/holdings';
import { CAPITAL_ACTIVITY } from '../../data/feeds/capitalActivity';
import { LP_001_SEED } from '../../data/feeds/limitedPartners';
import { fmtUSD, fmtPct } from '../../utils/formatters';
import { exportWorkingPaper } from '../../utils/exporters';
import { PdfModal } from '../modals/PdfModal';
import { ProvenancePanel } from '../ai/AIDecisionLogTab';
import { FvBadge } from './HoldingsGrid';
import type { FundSeed, Exception } from '../../types';

export function FinancialStatementsTab({ fund, fxOverrideActive, exceptions = [] }: { fund?: any; fxOverrideActive?: boolean; exceptions?: any[] }) {
  const [activeStmt, setActiveStmt] = useState("soa");
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);
  const [showPdf,    setShowPdf]    = useState(false);
  const [provenanceTrace, setProvenanceTrace] = useState<any>(null);

  // Dynamic GAAP Statement Routing based on Fund Type
  const isAlt = ["Hedge Fund", "Private Equity", "Real Estate Fund"].includes(fund?.fundType);
    const isRetail = ["Mutual Fund", "ETF", "Closed-End Fund", "Interval Fund", "Tender Offer Fund"].includes(fund?.fundType);
    const isMoneyMarket = fund?.fundType === "Money Market";

  const STMTS = useMemo(() => {
    let base = [
      { key:"soa",  label:"Statement of Assets & Liabilities" },
      { key:"soo",  label:"Statement of Operations" },
    ];
// Alter capital statement based on retail vs private
    if (isAlt) base.push({ key:"scna", label:"Statement of Changes in Partners' Capital" });
    else base.push({ key:"scna", label:"Statement of Changes in Net Assets" });
    
    base.push({ key:"cf", label:"Statement of Cash Flows" });
    base.push({ key:"fin_high", label:"Financial Highlights" });
    base.push({ key:"fv", label:"Fair Value Table" });
    base.push({ key:"soi", label:"Schedule of Investments" });

    // Supplemental schedules
    if (isAlt) base.push({ key:"cap_acct", label:"Capital Contributions & Distributions" });
    if (isMoneyMarket) base.push({ key:"shadow_nav", label:"Shadow NAV & Maturity" });
    if (isRetail) base.push({ key:"scp", label:"Statement of Changes in Portfolio" });
    if (isAlt) base.push({ key:"port", label:"Portfolio Company Summary" });
    if (isAlt) base.push({ key:"urgl", label:"Schedule of Realized and Unrealized Gains (Losses) by Investment" });
    

    return base;
  }, [fund]);

  // (Keeping FS_DYNAMIC the exact same as previously written)
  const FS_DYNAMIC = useMemo(() => {
    const sumAcct = (accts) => TB_ROWS.filter(r => accts.includes(r.acct)).reduce((s, r) => s + (r.debit - r.credit), 0);

    const investments_at_value = sumAcct(["1010", "1020", "1300"]);
    const cash_domestic = sumAcct(["1100"]);
    const cash_foreign = sumAcct(["1110"]);
    const dividends_receivable = sumAcct(["1200"]);
    const interest_receivable = sumAcct(["1210"]) || 410000; 
    const recv_securities_sold = sumAcct(["1220"]) || 2300000;
    const prepaid_other = 162535;

    const total_assets = investments_at_value + cash_domestic + cash_foreign + dividends_receivable + interest_receivable + recv_securities_sold + prepaid_other;

    const pay_securities = -sumAcct(["2010"]);
    const pay_shares_redeemed = -sumAcct(["2020"]);
    const advisory_fee_payable = -sumAcct(["2030"]);
    const admin_fee_payable = -sumAcct(["2040"]);
    const total_liabilities = pay_securities + pay_shares_redeemed + advisory_fee_payable + admin_fee_payable;

    const net_assets = total_assets - total_liabilities;
    const net_assets_classA = -sumAcct(["3010"]);
    const net_assets_inst = -sumAcct(["3020"]);
    const net_assets_r6 = -sumAcct(["3030"]);

    const div_income_domestic = -sumAcct(["4010"]);
    const div_income_foreign = fxOverrideActive ? 108420 : (-sumAcct(["4020"]) || 108420);
    const interest_income = -sumAcct(["4030"]);
    const total_investment_income = div_income_domestic + div_income_foreign + interest_income;

    const advisory_fees = sumAcct(["5010"]);
    const admin_fees = sumAcct(["5020"]);
    const custodian_fees = sumAcct(["5040"]);
    const professional_fees = sumAcct(["5060"]);
    const other_expenses = sumAcct(["5130"]) || 18000;
    const total_expenses = advisory_fees + admin_fees + custodian_fees + professional_fees + other_expenses;

    const net_investment_income = total_investment_income - total_expenses;
    const realized_gain = -sumAcct(["4100"]);
    const unrealized_change = -sumAcct(["4200"]);
    const net_increase_ops = net_investment_income + realized_gain + unrealized_change;

    const subscriptions = CAPITAL_ACTIVITY.filter(r=>r.type==="Subscription").reduce((s,r)=>s+(r.grossAmount??0),0);
    const redemptions = -CAPITAL_ACTIVITY.filter(r=>r.type==="Redemption").reduce((s,r)=>s+(r.grossAmount??0),0);
    const reinvestments = CAPITAL_ACTIVITY.filter(r=>r.type==="Reinvestment").reduce((s,r)=>s+(r.grossAmount??0),0);
    const distributions = -CAPITAL_ACTIVITY.filter(r=>r.type==="Dividend").reduce((s,r)=>s+(r.grossAmount??0),0);
    const net_capital_txns = subscriptions + redemptions + reinvestments + distributions;
    const beginning_net_assets_actual = net_assets - net_increase_ops - net_capital_txns;

    // --- Cash Flow Statement Bridges ---
    const net_cash_operating = net_increase_ops - unrealized_change - realized_gain - 1270000 + 4520000 - 215000000 + 180500000; // Simplified bridging items
    const cash_bop = 16140109; // Prior year ending cash
    const cash_eop = cash_domestic + cash_foreign;
    const net_change_cash = cash_eop - cash_bop;

    return {
      investments_at_value, cash_domestic, cash_foreign, dividends_receivable, interest_receivable, recv_securities_sold, prepaid_other,
      total_assets, pay_securities, pay_shares_redeemed, advisory_fee_payable, admin_fee_payable, total_liabilities,
      net_assets, net_assets_classA, net_assets_inst, net_assets_r6,
      div_income_domestic, div_income_foreign, interest_income, total_investment_income,
      advisory_fees, admin_fees, custodian_fees, professional_fees, other_expenses, total_expenses,
      net_investment_income, realized_gain, unrealized_change, net_increase_ops,
      subscriptions, redemptions, reinvestments, distributions, net_capital_txns, beginning_net_assets_actual
    };
  }, [fxOverrideActive]);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(()=>{ setGenerating(false); setGenerated(true); setShowPdf(true); }, 1600);
  };

  const FsLine = ({ label, value, indent=0, bold=false, doubleBottom=false, topBorder }: { label: any; value: any; indent?: number; bold?: boolean; doubleBottom?: boolean; topBorder?: string }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", paddingLeft:indent*16, fontWeight:bold?700:400, fontSize:13, borderTop: topBorder==="single"?"1px solid #1a1f36":topBorder==="double"?"3px double #1a1f36":undefined, borderBottom: doubleBottom?"3px double #1a1f36":undefined, marginTop: topBorder?4:0, marginBottom: doubleBottom?4:0 }}>
      <span style={{ color:T.textPrimary }}>{label}</span>
      <span style={{ ...MONO, color: value<0?T.errorBase:T.textPrimary, minWidth:130, textAlign:"right" }}>{value==null?"":value===0?"—":fmtUSD(value)}</span>
    </div>
  );
  const FsSection = ({ title }) => <div style={{ ...SANS, fontWeight:700, fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:18, marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>{title}</div>;
  const FsHeader = ({ title, subtitle }) => <div style={{ textAlign:"center", marginBottom:24 }}><div style={{ ...SANS, fontWeight:700, fontSize:16, color:T.navyHeader }}>{title}</div><div style={{ ...SANS, fontSize:13, color:T.textMuted, marginTop:4 }}>{fund?.name || "Global Diversified Fund"} — {fund?.series || "Series I"}<br/>{subtitle}</div></div>;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <div style={{ width:240, borderRight:`1px solid ${T.border}`, background:T.cardBg, flexShrink:0, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ ...SANS, fontWeight:700, fontSize:13, marginBottom:2, color:T.textPrimary }}>GAAP Reporting</div>
          <div style={{ ...SANS, fontSize:11, color:T.actionBase, fontWeight:600 }}>{fund?.fundType || "Fund"} Format</div>
        </div>
        {STMTS.map(s=>(
          <button key={s.key} onClick={()=>setActiveStmt(s.key)} style={{ ...SANS, width:"100%", textAlign:"left", padding:"11px 16px", border:"none", borderLeft:`3px solid ${activeStmt===s.key?T.actionBase:"transparent"}`, background:activeStmt===s.key?"#f0f4ff":T.cardBg, color:activeStmt===s.key?T.actionBase:T.textPrimary, fontSize:12, fontWeight:activeStmt===s.key?700:500, cursor:"pointer" }}>
            {s.label}
          </button>
        ))}
 <div style={{ flex:1 }}/>
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${T.border}` }}>
          <button disabled={generating} onClick={generated ? () => setShowPdf(true) : handleGenerate} style={{ ...SANS, width:"100%", border:"none", borderRadius:7, padding:"10px", fontSize:12, fontWeight:700, cursor:generating?"not-allowed":"pointer", background:generating?"#374151":T.okBase, color:generating?"#6b7280":"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:7, transition:"background 0.2s" }}>
            {generating?<><span style={{animation:"pulse 0.8s infinite"}}>●</span>Generating…</> :generated?<><span>↓</span>Download Outputs</> :<><span>↓</span>Generate Output</>}
          </button>
          <button style={{ ...SANS, width:"100%", fontSize:12, fontWeight:600, padding:"8px 10px", borderRadius:6, border:`1px solid ${T.border}`, background:"#fff", color:T.textPrimary, cursor:"pointer" }}>
              Audit Package
            </button>
            <button onClick={() => alert("Simulating AI Period Comparison Report Generation...")} style={{ ...SANS, width:"100%", fontSize:12, fontWeight:600, padding:"8px 10px", borderRadius:6, border:`1px dashed ${T.aiBase}`, background:T.aiBg, color:T.aiDark, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span>✦</span> Period Comparison
            </button>
          {generated&&!generating&&(<div style={{ ...SANS, fontSize:10, color:T.okBase, textAlign:"center", marginTop:6, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><span>✓</span>PDF + Excel ready</div>)}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", background:T.appBg }}>
        <div style={{ margin:"24px", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"36px 48px", maxWidth:760, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
          
          {activeStmt==="soa"&&(<>
            <FsHeader title="Statement of Assets and Liabilities" subtitle="As of December 31, 2024"/>
            <FsSection title="Assets"/>
            <FsLine label="Investments, at Value" value={FS_DYNAMIC.investments_at_value} indent={1}/>
            <FsLine label="Cash — Domestic" value={FS_DYNAMIC.cash_domestic} indent={1}/>
            <FsLine label="Cash — Foreign Currency" value={FS_DYNAMIC.cash_foreign} indent={1}/>
            <FsLine label="Dividends Receivable" value={FS_DYNAMIC.dividends_receivable} indent={1}/>
            <FsLine label="Interest Receivable" value={FS_DYNAMIC.interest_receivable} indent={1}/>
            <FsLine label="Receivable for Securities Sold" value={FS_DYNAMIC.recv_securities_sold} indent={1}/>
            <FsLine label="Other Assets" value={FS_DYNAMIC.prepaid_other} indent={1}/>
            <FsLine label="Total Assets" value={FS_DYNAMIC.total_assets} bold topBorder="single"/>
            <FsSection title="Liabilities"/>
            <FsLine label="Payable for Securities Purchased" value={-FS_DYNAMIC.pay_securities} indent={1}/>
            <FsLine label="Payable for Fund Shares Redeemed" value={-FS_DYNAMIC.pay_shares_redeemed} indent={1}/>
            <FsLine label="Investment Advisory Fee Payable" value={-FS_DYNAMIC.advisory_fee_payable} indent={1}/>
            <FsLine label="Administration Fee Payable" value={-FS_DYNAMIC.admin_fee_payable} indent={1}/>
            <FsLine label="Total Liabilities" value={-FS_DYNAMIC.total_liabilities} bold topBorder="single"/>
            <FsSection title={isAlt ? "Partners' Capital" : "Net Assets"}/>
            {isAlt ? (
               <>
                 <FsLine label="Total Partners' Capital" value={FS_DYNAMIC.net_assets} bold topBorder="single" doubleBottom/>
                 {fund?.fundType === "Private Equity" && (
                   <FsLine label="Unfunded Capital Commitments" value={15000000} indent={1} />
                 )}
               </>
            ) : (
               <>
                 <FsLine label="Net Assets — Class A" value={220000000} indent={1}/>
                 <FsLine label="Net Assets — Institutional" value={256198500} indent={1}/>
                 <FsLine label="Net Assets" value={476198500} bold topBorder="single" doubleBottom/>
               </>
            )}
            <FsLine label={isAlt ? "Capital — Class A" : "Net Assets — Class A"} value={FS_DYNAMIC.net_assets_classA} indent={1}/>
            <FsLine label={isAlt ? "Capital — Institutional" : "Net Assets — Institutional"} value={FS_DYNAMIC.net_assets_inst} indent={1}/>
            <FsLine label={isAlt ? "Capital — R6" : "Net Assets — R6"} value={FS_DYNAMIC.net_assets_r6} indent={1}/>
            <FsLine label={isAlt ? "Total Partners' Capital" : "Net Assets"} value={FS_DYNAMIC.net_assets} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="soo"&&(<>
            <FsHeader title="Statement of Operations" subtitle="For the Year Ended December 31, 2024"/>
            <FsSection title="Investment Income"/>
            <FsLine label="Dividend Income — Domestic" value={FS_DYNAMIC.div_income_domestic} indent={1}/>
            <div onClick={() => setProvenanceTrace({
    lineItem: 'Dividend Income - Foreign',
    value: '$108,420',
    derivedField: 'derived.fs_income.dividend_foreign',
    rawRows: [{ id: '129', source: 'State Street GL', payload: 'PW_GL_Dec31_Final.json', originalValue: '$200,000' }],
    exception: { id: 'EXC-003', status: 'Resolved (Human-Accepted)' },
    aiDecision: 'Overridden from $200,000 to $108,420. AI suggestion accepted by Sarah Chen at 9:22 AM based on November 30 prior-period resolution and Bloomberg WM/Reuters 4PM fix (EUR/USD 1.0842).'
})} style={{ cursor: "pointer", borderRadius: 6, transition: "background 0.2s", margin: "0 -16px", padding: "0 16px" }} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

   <FsLine label="Dividend Income — Foreign" value={108420} indent={1} />

</div>

            <FsLine label="Interest Income" value={FS_DYNAMIC.interest_income} indent={1}/>
            <FsLine label="Total Investment Income" value={FS_DYNAMIC.total_investment_income} bold topBorder="single"/>
            
            <FsSection title="Expenses"/>
            <FsLine label={isAlt ? "Management Fees" : "Investment Advisory Fees"} value={-FS_DYNAMIC.advisory_fees} indent={1}/>
            <FsLine label="Administration & Custody Fees" value={-(FS_DYNAMIC.admin_fees + FS_DYNAMIC.custodian_fees)} indent={1}/>
            <FsLine label="Professional Fees" value={-FS_DYNAMIC.professional_fees} indent={1}/>
            <FsLine label="Total Expenses" value={-FS_DYNAMIC.total_expenses} bold topBorder="single"/>
            <FsLine label="Net Investment Income / (Loss)" value={FS_DYNAMIC.net_investment_income} bold topBorder="single"/>
            
            <FsSection title="Realized & Unrealized Gain / (Loss)"/>
            <FsLine label="Net Realized Gain on Investments" value={FS_DYNAMIC.realized_gain} indent={1}/>
            <FsLine label="Net Change in Unrealized Appreciation" value={FS_DYNAMIC.unrealized_change} indent={1}/>
            <FsLine label={isAlt ? "Net Increase in Capital from Operations" : "Net Increase in Net Assets from Operations"} value={FS_DYNAMIC.net_increase_ops} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="scna"&&(<>
            <FsHeader title={isAlt ? "Statement of Changes in Partners' Capital" : "Statement of Changes in Net Assets"} subtitle="For the Year Ended December 31, 2024"/>
            <FsSection title="Operations"/>
            <FsLine label="Net Investment Income / (Loss)" value={FS_DYNAMIC.net_investment_income} indent={1}/>
            <FsLine label="Net Realized Gain on Investments" value={FS_DYNAMIC.realized_gain} indent={1}/>
            <FsLine label="Net Change in Unrealized Appreciation" value={FS_DYNAMIC.unrealized_change} indent={1}/>
            <FsLine label={isAlt ? "Net Increase in Capital from Operations" : "Net Increase in Net Assets from Operations"} value={FS_DYNAMIC.net_increase_ops} bold topBorder="single"/>
            <FsSection title={isAlt ? "Distributions to Partners" : "Distributions to Shareholders"}/>
            <FsLine label="Dividends from Net Investment Income" value={-FS_DYNAMIC.distributions*-1} indent={1}/>
            <FsSection title={isAlt ? "Capital Transactions" : "Capital Share Transactions"}/>
            <FsLine label={isAlt ? "Capital Contributions" : "Proceeds from Shares Sold"} value={FS_DYNAMIC.subscriptions} indent={1}/>
            <FsLine label={isAlt ? "Capital Withdrawals" : "Value of Shares Redeemed"} value={-FS_DYNAMIC.redemptions*-1} indent={1}/>
            <FsLine label="Reinvestment of Distributions" value={FS_DYNAMIC.reinvestments} indent={1}/>
            <FsLine label={isAlt ? "Net Increase from Capital Transactions" : "Net Increase from Capital Share Transactions"} value={FS_DYNAMIC.net_capital_txns} bold topBorder="single"/>
            <FsSection title={isAlt ? "Partners' Capital" : "Net Assets"}/>
            <FsLine label={isAlt ? "Total Increase in Capital" : "Total Increase in Net Assets"} value={FS_DYNAMIC.net_increase_ops+FS_DYNAMIC.net_capital_txns} bold topBorder="single"/>
            <FsLine label="Beginning of Period" value={FS_DYNAMIC.beginning_net_assets_actual} indent={1}/>
            <FsLine label="End of Period" value={FS_DYNAMIC.net_assets} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="fin_high"&&(<>
            <FsHeader title="Financial Highlights" subtitle="For the Year Ended December 31, 2024"/>
            {isAlt ? (
              <>
                <FsSection title="Fund-Level Ratios & Returns"/>
                <FsLine label="Internal Rate of Return (IRR) - Gross" value={"14.2%"} indent={1}/>
                <FsLine label="Internal Rate of Return (IRR) - Net" value={"11.8%"} indent={1}/>
                <FsLine label="Ratio of Expenses to Average Partners' Capital" value={"1.85%"} indent={1}/>
                <FsLine label="Ratio of Net Investment Income to Average Capital" value={"2.10%"} indent={1}/>
              </>
            ) : (
              <>
                <FsSection title="Per Share Operating Performance"/>
                <FsLine label="Net Asset Value, Beginning of Year" value={"$24.12"} indent={1}/>
                <FsLine label="Net Investment Income" value={"$0.45"} indent={1}/>
                <FsLine label="Net Realized and Unrealized Gain" value={"$1.20"} indent={1}/>
                <FsLine label="Net Asset Value, End of Year" value={"$25.77"} bold topBorder="single" doubleBottom/>
                <FsSection title="Ratios and Supplemental Data"/>
                <FsLine label="Total Return" value={"6.84%"} indent={1}/>
                <FsLine label="Ratio of Expenses to Average Net Assets" value={"0.75%"} indent={1}/>
              </>
            )}
          </>)}  
          {activeStmt==="cf"&&(<>
            <FsHeader title="Statement of Cash Flows" subtitle="For the Year Ended December 31, 2024"/>
            <FsSection title="Cash Flows from Operating Activities"/>
            <FsLine label="Net Increase in Net Assets from Operations" value={FS_DYNAMIC.net_increase_ops} indent={1}/>
            <div style={{...SANS, fontSize:12, fontStyle:"italic", color:T.textMuted, paddingLeft:16, margin:"6px 0"}}>Adjustments to reconcile net increase to net cash provided by operations:</div>
            <FsLine label="Purchases of Investments" value={-215000000} indent={2}/>
            <FsLine label="Proceeds from Sales of Investments" value={180500000} indent={2}/>
            <FsLine label="Net Realized (Gain) Loss on Investments" value={-FS_DYNAMIC.realized_gain} indent={2}/>
            <FsLine label="Net Change in Unrealized Appreciation" value={-FS_DYNAMIC.unrealized_change} indent={2}/>
            <FsLine label="Net (Increase) Decrease in Receivables" value={-1270000} indent={2}/>
            <FsLine label="Net Increase (Decrease) in Payables" value={4520000} indent={2}/>
            <FsLine label="Net Cash Provided by (Used in) Operating Activities" value={-1359580} bold topBorder="single"/>

            <FsSection title="Cash Flows from Financing Activities"/>
            <FsLine label="Proceeds from Shares Sold / Capital Contributions" value={FS_DYNAMIC.subscriptions} indent={1}/>
            <FsLine label="Payments for Shares Redeemed / Withdrawals" value={-FS_DYNAMIC.redemptions} indent={1}/>
            <FsLine label="Distributions Paid" value={-FS_DYNAMIC.distributions} indent={1}/>
            <FsLine label="Net Cash Provided by (Used in) Financing Activities" value={FS_DYNAMIC.net_capital_txns} bold topBorder="single"/>

            <FsSection title="Cash & Cash Equivalents"/>
            <FsLine label="Net Increase (Decrease) in Cash" value={FS_DYNAMIC.net_capital_txns - 1359580} bold topBorder="single"/>
            <FsLine label="Cash, Beginning of Year" value={16140109} indent={1}/>
            <FsLine label="Cash, End of Year" value={FS_DYNAMIC.cash_domestic + FS_DYNAMIC.cash_foreign} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="cap_acct"&&(<>
            <FsHeader title="Schedule of Partners' Capital" subtitle="For the Year Ended December 31, 2024"/>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, marginTop:16}}>
              <thead>
                <tr style={{background:T.navyHeader}}>
                  <th style={{...SANS,padding:"8px 12px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Investor ID</th>
                  <th style={{...SANS,padding:"8px 12px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Type</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Beginning Cap</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Contributions</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Net Income Alloc.</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Distributions</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Ending Cap</th>
                </tr>
              </thead>
              <tbody>
                {LP_001_SEED.map((lp, i) => {
                   const alloc = (lp.ending_capital_account - lp.beginning_capital_account - lp.called_capital + lp.distributed_capital);
                   return (
                     <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, color:T.actionBase}}>{lp.investor_id}</td>
                       <td style={{padding:"8px 12px", ...SANS, fontSize:11, color:T.textMuted}}>{lp.investor_type}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right"}}>{fmtUSD(lp.beginning_capital_account)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", color:T.okBase}}>+{fmtUSD(lp.called_capital)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", color:alloc<0?T.errorBase:T.textPrimary}}>{fmtUSD(alloc)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", color:T.errorBase}}>-{fmtUSD(lp.distributed_capital)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", fontWeight:700}}>{fmtUSD(lp.ending_capital_account)}</td>
                     </tr>
                   )
                })}
              </tbody>
            </table>
          </>)}

          {activeStmt==="fv"&&(<>
            <FsHeader title="Notes to Financial Statements" subtitle="Note 5 — Fair Value Measurement"/>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, marginTop:16 }}>
              <thead>
                <tr style={{ background:T.navyHeader }}>
                  <th style={{ ...SANS, padding:"9px 12px", textAlign:"left", color:"#fff", fontWeight:700, fontSize:11, borderBottom:`2px solid ${T.border}` }}>Asset Class / Description</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#8898aa", fontWeight:600, fontSize:10, borderBottom:`2px solid ${T.border}` }}>Level 1</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#8898aa", fontWeight:600, fontSize:10, borderBottom:`2px solid ${T.border}` }}>Level 2</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#8898aa", fontWeight:600, fontSize:10, borderBottom:`2px solid ${T.border}` }}>Level 3</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#fff", fontWeight:700, fontSize:11, borderBottom:`2px solid ${T.border}` }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {FV_TABLE_DATA.map((r,i)=>{
                  const total=r.l1+r.l2+r.l3;
                  return <tr key={i} className="tbl-row">
                    <td style={{ padding:"8px 12px", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.assetClass}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.l1>0?fmtUSD(r.l1):"—"}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.l2>0?fmtUSD(r.l2):"—"}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.l3>0?fmtUSD(r.l3):"—"}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, fontWeight:700, borderBottom:`1px solid ${T.border}` }}>{fmtUSD(total)}</td>
                  </tr>;
                })}
                <tr style={{ background:"#f7f8fa" }}>
                  <td style={{ padding:"9px 12px", fontWeight:700, fontSize:13, borderTop:`2px solid ${T.textPrimary}`, borderBottom:`3px double ${T.textPrimary}` }}>Total Investments at Value</td>
                  {[FV_TABLE_DATA.reduce((s,r)=>s+r.l1,0),FV_TABLE_DATA.reduce((s,r)=>s+r.l2,0),FV_TABLE_DATA.reduce((s,r)=>s+r.l3,0),FV_TABLE_DATA.reduce((s,r)=>s+r.l1+r.l2+r.l3,0)].map((v,i)=>(
                    <td key={i} style={{ ...MONO, padding:"9px 12px", textAlign:"right", fontWeight:700, fontSize:13, borderTop:`2px solid ${T.textPrimary}`, borderBottom:`3px double ${T.textPrimary}` }}>{fmtUSD(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>)}

          {activeStmt==="soi"&&(<>
            <FsHeader title="Schedule of Investments" subtitle="As of December 31, 2024 (Unaudited)" />

            {/* Group holdings by asset class */}
            {(() => {
              const assetClasses = [...new Set(HOLDINGS.map(h => h.assetClass))];
              const totalMV = HOLDINGS.reduce((s, h) => s + h.mv, 0);

              return (
                <>
                  {/* Column headers — GAAP SOI format */}
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 80px 120px 120px 80px 60px", gap:0, borderBottom:`2px solid ${T.textPrimary}`, paddingBottom:4, marginBottom:8 }}>
                    {["Security Description", "Shares / Par", "Cost", "Fair Value", "% of Net Assets", "Level"].map((h, i) => (
                      <div key={h} style={{ ...SANS, fontSize:11, fontWeight:700, color:T.textPrimary, textAlign:i > 0 ? "right" : "left", paddingRight:8 }}>{h}</div>
                    ))}
                  </div>

                  {assetClasses.map(cls => {
                    const rows = HOLDINGS.filter(h => h.assetClass === cls);
                    const subtotalMV = rows.reduce((s, h) => s + h.mv, 0);
                    const subtotalCost = rows.reduce((s, h) => s + h.cost, 0);

                    return (
                      <div key={cls} style={{ marginBottom:16 }}>
                        {/* Asset class header — italic, no indent */}
                        <div style={{ ...SANS, fontWeight:700, fontStyle:"italic", fontSize:13, color:T.textPrimary, marginBottom:4 }}>{cls}</div>

                        {rows.map(h => (
                          <div key={h.position_id} style={{ display:"grid", gridTemplateColumns:"2fr 80px 120px 120px 80px 60px", gap:0, padding:"2px 0", borderBottom:`1px solid #f1f5f9` }}>
                            {/* Security name — indented */}
                            <div style={{ paddingLeft:16 }}>
                              <div style={{ ...SANS, fontSize:12, color:T.textPrimary }}>{h.name}</div>
                              {h.coupon_rate && (
                                <div style={{ ...SANS, fontSize:10, color:T.textMuted }}>
                                  {h.coupon_rate}% due {h.maturity_date} | {h.currency}
                                </div>
                              )}
                              {h.is_restricted && (
                                <div style={{ ...SANS, fontSize:9, color:T.warnBase }}>† Restricted Security</div>
                              )}
                              {h.is_on_loan && (
                                <div style={{ ...SANS, fontSize:9, color:T.textMuted }}>‡ On Loan</div>
                              )}
                            </div>
                            <div style={{ ...MONO, fontSize:11, textAlign:"right", paddingRight:8, color:T.textPrimary }}>
                              {h.shares > 0 ? h.shares.toLocaleString("en-US", { minimumFractionDigits: 0 }) : "—"}
                            </div>
                            <div style={{ ...MONO, fontSize:11, textAlign:"right", paddingRight:8, color:T.textPrimary }}>
                              {fmtUSD(h.cost)}
                            </div>
                            <div style={{ ...MONO, fontSize:11, textAlign:"right", paddingRight:8, color:T.textPrimary }}>
                              {fmtUSD(h.mv)}
                            </div>
                            <div style={{ ...MONO, fontSize:11, textAlign:"right", paddingRight:8, color:T.textMuted }}>
                              {((h.mv / FS.net_assets) * 100).toFixed(2)}%
                            </div>
                            <div style={{ textAlign:"right", paddingRight:4 }}>
                              <FvBadge level={h.fvLevel} />
                            </div>
                          </div>
                        ))}

                        {/* Subtotal row */}
                        <div style={{ display:"grid", gridTemplateColumns:"2fr 80px 120px 120px 80px 60px", gap:0, padding:"4px 0", borderTop:`1px solid ${T.textPrimary}`, marginTop:2 }}>
                          <div style={{ ...SANS, fontSize:12, fontWeight:700, fontStyle:"italic", paddingLeft:16 }}>Total {cls}</div>
                          <div />
                          <div style={{ ...MONO, fontSize:12, fontWeight:700, textAlign:"right", paddingRight:8 }}>{fmtUSD(subtotalCost)}</div>
                          <div style={{ ...MONO, fontSize:12, fontWeight:700, textAlign:"right", paddingRight:8 }}>{fmtUSD(subtotalMV)}</div>
                          <div style={{ ...MONO, fontSize:11, textAlign:"right", paddingRight:8, color:T.textMuted }}>
                            {((subtotalMV / FS.net_assets) * 100).toFixed(2)}%
                          </div>
                          <div />
                        </div>
                      </div>
                    );
                  })}

                  {/* Grand total */}
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 80px 120px 120px 80px 60px", borderTop:`2px solid ${T.textPrimary}`, borderBottom:`3px double ${T.textPrimary}`, padding:"6px 0", marginTop:8 }}>
                    <div style={{ ...SANS, fontSize:13, fontWeight:700 }}>Total Investments, at Value</div>
                    <div />
                    <div style={{ ...MONO, fontSize:13, fontWeight:700, textAlign:"right", paddingRight:8 }}>
                      {fmtUSD(HOLDINGS.reduce((s, h) => s + h.cost, 0))}
                    </div>
                    <div style={{ ...MONO, fontSize:13, fontWeight:700, textAlign:"right", paddingRight:8 }}>
                      {fmtUSD(HOLDINGS.reduce((s, h) => s + h.mv, 0))}
                    </div>
                    <div style={{ ...MONO, fontSize:12, fontWeight:700, textAlign:"right", paddingRight:8 }}>
                      {((HOLDINGS.reduce((s, h) => s + h.mv, 0) / FS.net_assets) * 100).toFixed(2)}%
                    </div>
                    <div />
                  </div>

                  {/* Footnotes */}
                  <div style={{ marginTop:16, ...SANS, fontSize:11, color:T.textMuted, lineHeight:1.7 }}>
                    <div>† Restricted securities are valued using Level 3 inputs. See Note 2 — Fair Value Measurements.</div>
                    <div>‡ Securities on loan. Collateral received consists of cash equivalents.</div>
                    <div style={{ marginTop:4 }}>The accompanying notes are an integral part of these financial statements.</div>
                  </div>
                </>
              );
            })()}
          </>)}
        </div>
      </div>
      {showPdf && <PdfModal onClose={() => setShowPdf(false)} fund={fund} fsData={FS_DYNAMIC} tbData={TB_ROWS} resolvedExceptions={exceptions.filter(e=>e.status==='resolved')} />}
      {provenanceTrace && <ProvenancePanel trace={provenanceTrace} onClose={() => setProvenanceTrace(null)} />}
    </div>
  );
}

