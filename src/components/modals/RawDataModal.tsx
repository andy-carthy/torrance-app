import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function RawDataModal({ feed, onClose }) {
  // Generate a realistic dummy preview based on the file type
  const headers = feed.type === "GL" ? ["account_no", "account_desc", "acct_category", "ccy", "debit_amount", "credit_amount"] : ["cusip", "security_name", "asset_class", "shares", "cost_basis", "market_value"];
  const dummyRows = feed.type === "GL" ? [
    ["1010", "Investments in Securities, at Value", "Asset", "USD", "125000000.00", "0.00"],
    ["1100", "Cash - Domestic", "Asset", "USD", "16700000.00", "0.00"],
    ["2030", "Investment Advisory Fee Payable", "Liability", "USD", "0.00", "590000.00"],
    ["5010", "Investment Advisory Fees", "Expense", "USD", "6400000.00", "0.00"]
  ] : [
    ["037833100", "Apple Inc.", "Common Stock", "281200", "188540000", "199610000"],
    ["594918104", "Microsoft Corp.", "Common Stock", "115400", "148200000", "157825000"]
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:720,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>Raw Source Data Preview</div><div style={{...MONO,fontSize:11,color:"#8898aa",marginTop:4}}>{feed.file}</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div style={{padding:"20px 24px", overflowX:"auto"}}>
          <div style={{...SANS, fontSize:12, color:T.textMuted, marginBottom:12}}>Displaying top {dummyRows.length} rows of {feed.rows.toLocaleString()} total rows ingested via {feed.source}.</div>
          <table style={{width:"100%", borderCollapse:"collapse", border:`1px solid ${T.border}`}}>
            <thead>
              <tr style={{background:T.appBg}}>
                {headers.map(h => <th key={h} style={{...MONO, fontSize:10, fontWeight:700, padding:"8px 12px", textAlign:"left", borderBottom:`1px solid ${T.border}`, color:T.textPrimary}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {dummyRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j} style={{...MONO, fontSize:11, padding:"8px 12px", borderBottom:`1px solid ${T.border}`, color:T.textMuted, whiteSpace:"nowrap"}}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
