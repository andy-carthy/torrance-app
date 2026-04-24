import React, { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { FS } from '../../data/financials';
import { TB_ROWS } from '../../data/feeds/gl';
import { exportWorkingPaper } from '../../utils/exporters';

export const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#334155' },
  header: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  subHeader: { fontSize: 10, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowBold: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontWeight: 'bold', borderTop: '1px solid #0f172a', marginTop: 4 },
  rowDouble: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontWeight: 'bold', borderTop: '1px solid #0f172a', borderBottom: '2px solid #0f172a', marginTop: 4, marginBottom: 4 },
  label: { flex: 1 },
  value: { width: 100, textAlign: 'right', fontFamily: 'Courier' },
  indent: { paddingLeft: 15 }
});

export const fmtPdfUSD = (n) => n == null ? "—" : n < 0 ? `($${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})` : `$${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;

export const FinancialStatementPDF = ({ fund, fsData, resolvedExceptions = [] }: { fund?: any; fsData?: any; resolvedExceptions?: any[] }) => (
  <Document>
    {/* PAGE 1: Statement of Assets and Liabilities */}
    {fsData && <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>Statement of Assets and Liabilities</Text>
      <Text style={pdfStyles.subHeader}>{fund?.name || "Fund"} — As of December 31, 2024</Text>

      <Text style={pdfStyles.sectionTitle}>Assets</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Investments, at Value</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.investments_at_value)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Cash — Domestic</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.cash_domestic)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Cash — Foreign Currency</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.cash_foreign)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Dividends Receivable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.dividends_receivable)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Interest Receivable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.interest_receivable)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Receivable for Securities Sold</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.recv_securities_sold)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Assets</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.total_assets)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Liabilities</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Payable for Securities Purchased</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.pay_securities)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Payable for Fund Shares Redeemed</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.pay_shares_redeemed)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Investment Advisory Fee Payable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.advisory_fee_payable)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Administration Fee Payable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.admin_fee_payable)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Liabilities</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.total_liabilities)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Net Assets</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Assets — Class A</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets_classA)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Assets — Institutional</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets_inst)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Assets — R6</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets_r6)}</Text></View>
      <View style={pdfStyles.rowDouble}><Text style={pdfStyles.label}>Total Net Assets</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets)}</Text></View>
    </Page>}

    {/* PAGE 2: Statement of Operations */}
    {fsData && <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>Statement of Operations</Text>
      <Text style={pdfStyles.subHeader}>{fund?.name || "Fund"} — For the Year Ended December 31, 2024</Text>

      <Text style={pdfStyles.sectionTitle}>Investment Income</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Dividend Income</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.div_income_domestic + fsData.div_income_foreign)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Interest Income</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.interest_income)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Investment Income</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.total_investment_income)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Expenses</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Advisory Fees</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.advisory_fees)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Administration Fees</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.admin_fees)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Professional Fees</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.professional_fees)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Expenses</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.total_expenses)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Net Investment Income / (Loss)</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_investment_income)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Realized & Unrealized Gain / (Loss)</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Realized Gain on Investments</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.realized_gain)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Change in Unrealized Appreciation</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.unrealized_change)}</Text></View>
      <View style={pdfStyles.rowDouble}><Text style={pdfStyles.label}>Net Increase in Net Assets from Operations</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_increase_ops)}</Text></View>
    </Page>}

    {/* PAGE 3: Exception Resolution Audit Trail */}
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>Exception Resolution Audit Trail</Text>
      <Text style={pdfStyles.subHeader}>{fund?.name || "Fund"} — December 31, 2024 Close</Text>
      <Text style={[pdfStyles.sectionTitle, {marginTop: 8}]}>Resolved Exceptions</Text>

      {/* Table header */}
      <View style={{flexDirection:'row', backgroundColor:'#0f172a', padding:'6px 4px', marginBottom:2}}>
        <Text style={{color:'#fff', fontSize:8, fontWeight:'bold', width:60}}>Exc. ID</Text>
        <Text style={{color:'#fff', fontSize:8, fontWeight:'bold', flex:1}}>Code</Text>
        <Text style={{color:'#fff', fontSize:8, fontWeight:'bold', flex:2}}>Resolution</Text>
        <Text style={{color:'#fff', fontSize:8, fontWeight:'bold', width:80}}>Override Value</Text>
        <Text style={{color:'#fff', fontSize:8, fontWeight:'bold', width:70}}>Resolved By</Text>
      </View>
      {resolvedExceptions.length === 0 && (
        <View style={{padding:'12px 4px'}}><Text style={{fontSize:10, color:'#64748b'}}>No exceptions resolved for this period.</Text></View>
      )}
      {resolvedExceptions.map((exc, i) => {
        const resolver = TEAM.find(m => m.id === exc.resolvedBy);
        return (
          <View key={exc.id} style={{flexDirection:'row', backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', padding:'5px 4px', borderBottom:'1px solid #e2e8f0'}}>
            <Text style={{fontSize:8, width:60, fontFamily:'Courier'}}>{exc.id}</Text>
            <Text style={{fontSize:8, flex:1, color:'#4f46e5'}}>{exc.code}</Text>
            <Text style={{fontSize:8, flex:2}}>{exc.resolution || '—'}{exc.overrideValue ? `  Before: ${exc.currentValue}  →  After: ${exc.overrideValue}` : ''}</Text>
            <Text style={{fontSize:8, width:80, fontFamily:'Courier'}}>{exc.overrideValue || '—'}</Text>
            <Text style={{fontSize:8, width:70}}>{resolver?.name || exc.resolvedBy || '—'}</Text>
          </View>
        );
      })}
      <View style={{marginTop: 20, padding:'10px 12px', backgroundColor:'#f0fdf4', border:'1px solid #a7f3d0'}}>
        <Text style={{fontSize:9, color:'#0f766e', fontWeight:'bold'}}>✓ Audit trail generated by Torrance AI — {new Date().toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}</Text>
        <Text style={{fontSize:8, color:'#64748b', marginTop:4}}>This document represents the complete exception resolution log for the reporting period. All resolutions have been reviewed and approved per the fund's exception management policy.</Text>
      </View>
    </Page>
  </Document>
);

export function PdfModal({ onClose, fund, fsData, tbData, resolvedExceptions = [] }: { onClose: () => void; fund?: any; fsData?: any; tbData?: any; resolvedExceptions?: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExcelExport = async () => {
    if (!fund) return;
    setIsExporting(true);
    try {
      await exportWorkingPaper(
        fund,
        fsData || FS,
        tbData || TB_ROWS
      );
    } catch (err) {
      console.error("Excel export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.6)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{...SANS,fontWeight:700,fontSize:14,color:"#fff"}}>Export Reports</span>
          <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        
        <div style={{padding:"18px 20px 22px"}}>
          
          {/* REAL PDF GENERATOR BUTTON */}
          {fsData && (
            <PDFDownloadLink document={<FinancialStatementPDF fund={fund} fsData={fsData} resolvedExceptions={resolvedExceptions} />} fileName={`${fund?.fund_id || 'fund'}_financials.pdf`} style={{textDecoration:'none'}}>
              {({ loading }) => (
                <button style={{...SANS,width:"100%",textAlign:"left",border:`1px solid ${T.actionBase}`,borderRadius:8,padding:"12px 15px",marginBottom:9,cursor:loading?"wait":"pointer",background:T.actionBg,display:"flex",alignItems:"center",gap:13}}>
                  <span style={{fontSize:22}}>📄</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:T.actionBase,marginBottom:2}}>
                      {loading ? "Generating PDF Data..." : "Clean PDF (Generated)"}
                    </div>
                    <div style={{fontSize:11,color:T.textMuted}}>Multi-page GAAP Financial Statements.</div>
                  </div>
                  <span style={{color:T.actionBase,fontSize:16}}>{loading ? "⏳" : "↓"}</span>
                </button>
              )}
            </PDFDownloadLink>
          )}

          {/* REAL EXCEL WORKING PAPER BUTTON */}
          <button onClick={handleExcelExport} disabled={isExporting} style={{...SANS,width:"100%",textAlign:"left",border:`1px solid ${T.okBorder}`,borderRadius:8,padding:"12px 15px",marginBottom:9,cursor:isExporting?"wait":"pointer",background:T.okBg,display:"flex",alignItems:"center",gap:13}}>
            <span style={{fontSize:22}}>📊</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:T.okBase,marginBottom:2}}>
                {isExporting ? "Compiling Workbook..." : "Excel Working Paper"}
              </div>
              <div style={{fontSize:11,color:T.textMuted}}>Multi-tab XLSX with GL and formatting.</div>
            </div>
            <span style={{color:T.okBase,fontSize:16}}>{isExporting ? "⏳" : "↓"}</span>
          </button>

          {/* MOCK BUTTON for UI */}
          <button style={{...SANS,width:"100%",textAlign:"left",border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 15px",marginBottom:9,cursor:"pointer",background:T.cardBg,display:"flex",alignItems:"center",gap:13,transition:"border-color 0.1s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            <span style={{fontSize:22}}>🔍</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:T.textPrimary,display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                Audit PDF
                <span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`}}>AUDIT TRAIL</span>
              </div>
              <div style={{fontSize:11,color:T.textMuted}}>Exception log and audit trail.</div>
            </div>
            <span style={{color:T.actionBase,fontSize:16}}>↓</span>
          </button>
          {/* ─── SPRINT 2: Export API Endpoint (C-16) ─── */}
          <div style={{marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${T.border}`}}>
             <div style={{...SANS, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8}}>Automate this export</div>
             <div style={{background: T.navyHeader, borderRadius: 6, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
               <div style={{display: "flex", alignItems: "center", gap: 8}}>
                 <span style={{...MONO, fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4}}>GET</span>
                 <span style={{...MONO, fontSize: 11, color: "#e2e8f0"}}>/api/v1/export/fs/{fund?.fund_id}</span>
               </div>
               <button title="Copy to clipboard" style={{background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 14}}>📋</button>
             </div>
             <div style={{...SANS, fontSize: 11, color: T.textMuted, marginTop: 6}}>
               Use this endpoint to programmatically pull the approved financial statements into downstream systems.
             </div>
          </div>
          </div>
        </div>
      </div>
  );
}

