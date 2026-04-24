import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { fmtUSD, fmtPct } from '../../utils/formatters';
import { DataPrepModal } from '../modals/DataPrepModal';
import { TrialBalanceTab } from './TrialBalanceTab';
import { HoldingsGrid } from './HoldingsGrid';
import { CapitalActivityGrid } from './CapitalActivityGrid';

export function EditableGrid({ data, columns, onUpdateRecord, feedId }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(columns[0]?.field || "");
  const [editingCell, setEditingCell] = useState<{id: any; field: string} | null>(null);
  const [editValue, setEditValue] = useState("");

  const filteredAndSorted = useMemo(() => {
    let res = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    if (sortBy) {
      res.sort((a,b) => {
        if (a[sortBy] < b[sortBy]) return -1;
        if (a[sortBy] > b[sortBy]) return 1;
        return 0;
      });
    }
    return res;
  }, [data, search, sortBy]);

  const handleDoubleClick = (record, field) => {
    setEditingCell({ id: record.id, field });
    setEditValue(record[field] == null ? "" : record[field]);
  };

  const handleKeyDown = (e, recordId, field) => {
    if (e.key === "Enter") commitEdit(recordId, field);
    else if (e.key === "Escape") setEditingCell(null);
  };

  const commitEdit = (recordId, field) => {
    let finalValue: string | number = editValue;
    if (editValue !== "" && !isNaN(Number(editValue))) finalValue = Number(editValue);
    onUpdateRecord(feedId, recordId, field, finalValue);
    setEditingCell(null);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
      {/* Dynamic Toolbar */}
      <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:12, flexWrap:"wrap"}}>
        <div style={{position:"relative", flex:1, minWidth:200, maxWidth:300}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
          <input type="text" placeholder="Search across all fields..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"6px 12px 6px 30px", borderRadius:5, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} />
        </div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"6px 10px", borderRadius:5, border:`1px solid ${T.border}`, fontSize:12, outline:"none", cursor:"pointer"}}>
          <option value="">Sort By...</option>
          {columns.map(c => <option key={c.field} value={c.field}>{c.label}</option>)}
        </select>
        <span style={{...SANS,fontSize:11,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} records</span>
      </div>

      <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:6, overflowY:"auto", overflowX:"auto", flex:1}}>
        <table style={{width:"100%", borderCollapse:"collapse", fontSize:11, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:"#f8fafc", borderBottom:`2px solid ${T.border}`}}>
              {columns.map(c => (
                <th key={c.field} style={{...SANS, padding:"8px 12px", color: c.editable ? T.actionBase : T.textMuted, fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", background: c.editable ? "#eff6ff" : "#f8fafc", borderLeft: c.editable ? "1px solid #bfdbfe" : "none", borderRight: c.editable ? "1px solid #bfdbfe" : "none", whiteSpace:"nowrap"}}>
                  {c.label} {c.editable && "✎"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((record, i) => (
              <tr key={record.id || i} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                {columns.map(c => {
                  const isEditing = editingCell?.id === record.id && editingCell?.field === c.field;
                  const value = record[c.field];
                  
                  return (
                    <td key={c.field} 
                        onDoubleClick={() => c.editable && handleDoubleClick(record, c.field)}
                        style={{padding:"6px 12px", ...MONO, color: c.editable ? T.textPrimary : T.textMuted, background: isEditing ? T.actionBg : c.editable ? "#fafffe" : "transparent", borderLeft: c.editable ? "1px solid #e2e8f0" : "none", borderRight: c.editable ? "1px solid #e2e8f0" : "none", cursor: c.editable ? "cell" : "default", whiteSpace:"nowrap"}}>
                      {isEditing ? (
                        <input autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>commitEdit(record.id, c.field)} onKeyDown={e=>handleKeyDown(e, record.id, c.field)}
                          style={{...MONO, fontSize:11, width:"100%", padding:"2px 6px", border:`1px solid ${T.actionBase}`, borderRadius:3, outline:"none"}} />
                      ) : (
                        <div style={{display:"flex", alignItems:"center", gap:6}}>
                          {c.format === "usd" ? fmtUSD(value) : c.format === "pct" ? fmtPct(value) : value}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredAndSorted.length === 0 && <tr><td colSpan={columns.length} style={{textAlign:"center", padding:30, color:T.textMuted, ...SANS}}>No data found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataExplorerTab({ masterFeeds, onUpdateFeedRecord }) {
  const [subTab, setSubTab] = useState("gl_001");
 

  const SUB_TABS = [
    { key:"gl_001", label:"GL-001 (Trial Balance)" },
    { key:"hd_001", label:"HD-001 (Holdings)" },
    { key:"ca_001", label:"CA-001 (Capital Activity)" },
    { key:"pr_001", label:"PR-001 (Pricing)" },
    { key:"fx_001", label:"FX-001 (Rates)" },
    { key:"cp_001", label:"CP-001 (Counterparties)" },
    { key:"ta_001", label:"TA-001 (Transfer Agent)" },
    { key:"dr_001", label:"DR-001 (Derivatives)" },
    { key:"lp_001", label:"LP-001 (LP Register)" },
    { key:"tx_001", label:"TX-001 (Tax)" },
    { key:"re_001", label:"RE-001 (Real Estate)" },
    { key:"oc_001", label:"OC-001 (OpCo)" },
  ];

  const PR_COLS = [
    { field:"price_id", label:"Price ID" }, { field:"fund_id", label:"Fund ID" }, { field:"identifier", label:"Identifier" }, { field:"identifier_type", label:"ID Type" },
    { field:"security_name", label:"Security Name" }, { field:"price", label:"Unit Price", editable:true, format:"usd" }, { field:"price_date", label:"Price Date" }, 
    { field:"price_type", label:"Price Type" }, { field:"currency", label:"Currency" }, { field:"yield", label:"Yield (%)", editable:true }, 
    { field:"duration", label:"Duration", editable:true }, { field:"fv_level", label:"FV Level", editable:true }, { field:"fv_level_suggested", label:"Suggested FV Level" },
    { field:"price_source", label:"Price Source" }, { field:"is_evaluated", label:"Is Evaluated" }, { field:"accrued_interest", label:"Accrued Interest", format:"usd" }, 
    { field:"convexity", label:"Convexity" }, { field:"delta", label:"Delta" }
  ];

  const FX_COLS = [
    { field:"rate_id", label:"Rate ID" }, { field:"rate_date", label:"Rate Date" }, { field:"rate_time", label:"Rate Time" },
    { field:"quote_currency", label:"Quote CCY" }, { field:"base_currency", label:"Base CCY" }, { field:"spot_rate", label:"Spot Rate", editable:true }, 
    { field:"rate_type", label:"Rate Type" }, { field:"forward_settlement_date", label:"Fwd Settlement Date" }, { field:"rate_source", label:"Source" }
  ];

  const CP_COLS = [
    { field:"counterparty_id", label:"CP ID" }, { field:"legal_name", label:"Legal Name", editable:true }, { field:"entity_type", label:"Entity Type", editable:true }, 
    { field:"country", label:"Country" }, { field:"lei", label:"LEI Code", editable:true }, { field:"is_related_party", label:"Is Related Party" }, 
    { field:"related_party_type", label:"Related Party Type" }, { field:"is_sec_registered", label:"Is SEC Registered" }, 
    { field:"nfa_id", label:"NFA ID" }, { field:"crd_number", label:"CRD Number" }
  ];

  const TA_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"as_of_date", label:"As Of Date" }, { field:"share_class", label:"Share Class" }, 
    { field:"shares_beginning", label:"Shares Beginning" }, { field:"shares_issued", label:"Shares Issued" }, { field:"shares_redeemed", label:"Shares Redeemed" },
    { field:"shares_outstanding", label:"Shares Out.", editable:true }, { field:"nav_per_share", label:"NAV / Share", editable:true, format:"usd" }, 
    { field:"nav_source", label:"NAV Source" }, { field:"net_assets", label:"Total Net Assets", format:"usd" }, { field:"distribution_per_share", label:"Dist. / Share", format:"usd" },
    { field:"expense_ratio_gross", label:"Gross Exp Ratio" }, { field:"expense_ratio_net", label:"Net Exp Ratio" }
  ];

  const DR_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"as_of_date", label:"As Of Date" }, { field:"contract_id", label:"Contract ID" }, 
    { field:"instrument_type", label:"Type" }, { field:"underlying_name", label:"Underlying" }, { field:"underlying_identifier", label:"Underlying ID" },
    { field:"counterparty_id", label:"Counterparty ID" }, { field:"notional_amount", label:"Notional Amount", editable:true, format:"usd" }, 
    { field:"notional_currency", label:"Notional CCY" }, { field:"fair_value", label:"Fair Value", editable:true, format:"usd" }, 
    { field:"fair_value_asset_or_liability", label:"Asset/Liability" }, { field:"fv_level", label:"FV Level" }, { field:"trade_date", label:"Trade Date" }, 
    { field:"maturity_date", label:"Maturity Date" }, { field:"fixed_rate", label:"Fixed Rate" }, { field:"floating_rate_index", label:"Floating Rate Index" }, 
    { field:"pay_receive", label:"Pay/Receive" }, { field:"exercise_price", label:"Exercise Price" }, { field:"delta", label:"Delta" }, 
    { field:"is_exchange_traded", label:"Exchange Traded" }, { field:"variation_margin", label:"Variation Margin" }, 
    { field:"collateral_pledged", label:"Collateral Pledged" }, { field:"netting_set_id", label:"Netting Set ID" }
  ];

  const LP_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"investor_id", label:"Investor ID" }, { field:"investor_legal_name", label:"Legal Name (Encrypted)" }, 
    { field:"investor_type", label:"Type", editable:true }, { field:"is_tax_exempt", label:"Tax Exempt" }, { field:"is_erisa_plan", label:"ERISA Plan" }, 
    { field:"country_of_domicile", label:"Domicile" }, { field:"is_us_person", label:"US Person" }, { field:"committed_capital", label:"Committed Capital", editable:true, format:"usd" }, 
    { field:"called_capital", label:"Called Capital", format:"usd" }, { field:"unfunded_commitment", label:"Unfunded", editable:true, format:"usd" },
    { field:"distributed_capital", label:"Distributed Capital", format:"usd" }, { field:"beginning_capital_account", label:"Beginning Cap", format:"usd" }, 
    { field:"ending_capital_account", label:"Ending Cap", format:"usd" }, { field:"profit_loss_allocation_pct", label:"P&L Alloc %" }, 
    { field:"carried_interest_rate", label:"Carried Int Rate" }, { field:"hurdle_rate", label:"Hurdle Rate" }, { field:"subscription_date", label:"Sub Date" }, 
    { field:"lock_up_expiry", label:"Lock-up Expiry" }, { field:"k1_recipient_tin", label:"K-1 TIN" }, { field:"qualifying_purchaser", label:"Qualifying Purchaser" }, 
    { field:"accredited_investor", label:"Accredited" }
  ];

  const TX_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"tax_year", label:"Tax Year" }, { field:"book_net_income", label:"Book Net Income", format:"usd" }, 
    { field:"book_tax_difference", label:"Book/Tax Diff", format:"usd" }, { field:"taxable_income", label:"Taxable Income", editable:true, format:"usd" }, 
    { field:"wash_sale_adj", label:"Wash Sale Adj.", editable:true, format:"usd" }, { field:"sec_1256_mtm_adj", label:"Sec 1256 MTM Adj" }, 
    { field:"sec_988_fx_adj", label:"Sec 988 FX Adj" }, { field:"pfic_income", label:"PFIC Income" }, { field:"undist_ordinary_income", label:"Undist Ord Income" }, 
    { field:"undist_ltcg", label:"Undist LTCG" }, { field:"capital_loss_carryforward", label:"Cap Loss Carryforward" }, { field:"clf_expiry_year", label:"CLF Expiry" }, 
    { field:"clf_character", label:"CLF Character" }, { field:"unrealized_appreciation_tax", label:"Unrealized App (Tax)" }, 
    { field:"ordinary_distributions", label:"Ord Distributions" }, { field:"ltcg_distributions", label:"LTCG Distributions" }, 
    { field:"roc_distributions", label:"ROC Distributions" }, { field:"ric_qualifying", label:"RIC Qualifying" }, { field:"excise_tax_due", label:"Excise Tax Due" }
  ];

  const RE_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"property_id", label:"Property ID" }, { field:"property_name", label:"Property Name" }, 
    { field:"property_type", label:"Type" }, { field:"address_street", label:"Street" }, { field:"address_city", label:"City" }, 
    { field:"address_state", label:"State" }, { field:"address_country", label:"Country" }, { field:"acquisition_date", label:"Acq Date" }, 
    { field:"acquisition_cost", label:"Acq. Cost", format:"usd" }, { field:"appraisal_date", label:"Appraisal Date" }, 
    { field:"appraiser_name", label:"Appraiser Name" }, { field:"appraisal_method", label:"Appraisal Method" }, 
    { field:"appraised_value", label:"Appraised Value (L3)", editable:true, format:"usd" }, { field:"cap_rate", label:"Cap Rate %", editable:true }, 
    { field:"discount_rate", label:"Discount Rate" }, { field:"noi", label:"NOI", format:"usd" }, { field:"occupancy_rate", label:"Occupancy Rate" }, 
    { field:"mortgage_balance", label:"Mortgage Balance", format:"usd" }, { field:"fv_level", label:"FV Level" }
  ];

  const OC_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"portfolio_company_id", label:"Company ID" }, { field:"company_name", label:"Company Name" }, 
    { field:"fiscal_period_end", label:"Fiscal Period End" }, { field:"revenue", label:"Revenue", format:"usd" }, 
    { field:"ebitda", label:"EBITDA", editable:true, format:"usd" }, { field:"net_income", label:"Net Income", format:"usd" }, 
    { field:"total_assets", label:"Total Assets", format:"usd" }, { field:"total_debt", label:"Total Debt", format:"usd" }, 
    { field:"total_equity", label:"Total Equity", format:"usd" }, { field:"enterprise_value", label:"Enterprise Value", editable:true, format:"usd" }, 
    { field:"ev_multiple_applied", label:"EV Multiple" }, { field:"equity_value", label:"Equity Value (L3)", editable:true, format:"usd" }, 
    { field:"investment_cost", label:"Investment Cost", format:"usd" }, { field:"ownership_pct", label:"Ownership %" }, 
    { field:"fv_level", label:"FV Level" }, { field:"is_consolidation_candidate", label:"Consolidation Candidate" }
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:T.cardBg, borderBottom:`1px solid ${T.border}`, padding:"0 16px", display:"flex", gap:0, flexShrink:0, overflowX:"auto" }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ ...SANS, padding:"10px 14px", fontSize:11, fontWeight:subTab===t.key?700:500, color:subTab===t.key?T.actionBase:T.textMuted, background:"none", border:"none", borderBottom:subTab===t.key?`2px solid ${T.actionBase}`:"2px solid transparent", cursor:"pointer", transition:"color 0.2s", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:T.appBg, padding:"12px 16px" }}>
        
        {subTab==="gl_001" && <TrialBalanceTab tbRows={masterFeeds.gl_001} />}
        {subTab==="hd_001" && <HoldingsGrid holdings={masterFeeds.hd_001} />}
        {subTab==="ca_001" && <CapitalActivityGrid activity={masterFeeds.ca_001} />}
        
        {subTab==="pr_001" && <EditableGrid data={masterFeeds.pr_001} columns={PR_COLS} feedId="pr_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="fx_001" && <EditableGrid data={masterFeeds.fx_001} columns={FX_COLS} feedId="fx_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="cp_001" && <EditableGrid data={masterFeeds.cp_001} columns={CP_COLS} feedId="cp_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="ta_001" && <EditableGrid data={masterFeeds.ta_001} columns={TA_COLS} feedId="ta_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="dr_001" && <EditableGrid data={masterFeeds.dr_001} columns={DR_COLS} feedId="dr_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="lp_001" && <EditableGrid data={masterFeeds.lp_001} columns={LP_COLS} feedId="lp_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="tx_001" && <EditableGrid data={masterFeeds.tx_001} columns={TX_COLS} feedId="tx_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="re_001" && <EditableGrid data={masterFeeds.re_001} columns={RE_COLS} feedId="re_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="oc_001" && <EditableGrid data={masterFeeds.oc_001} columns={OC_COLS} feedId="oc_001" onUpdateRecord={onUpdateFeedRecord} />}
      </div>
    </div>
  );
}

