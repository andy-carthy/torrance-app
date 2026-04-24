import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { Soc1AuditReport } from '../modals/Soc1AuditReport';

export function GlobalAuditLogView({ onBack }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");

  // Expanded Mock Audit Log Data to show system-wide compliance tracking
  const AUDIT_LOGS = [
    { id: "al-101", ts: "2024-12-31 23:58:12", user: "system", role: "Service Account", action: "Data Ingestion", target: "FND-2024-001", detail: "SFTP transfer complete. 131 rows parsed. 8 exceptions generated.", ip: "10.0.4.15" },
    { id: "al-102", ts: "2025-01-01 09:14:05", user: "Sarah Chen", role: "Preparer", action: "Exception Reviewed", target: "EXC-001", detail: "Added comment: 'Flagging — classification error in Dec 29 batch.'", ip: "192.168.1.44" },
    { id: "al-103", ts: "2025-01-01 09:22:18", user: "Sarah Chen", role: "Preparer", action: "AI Override Accepted", target: "EXC-003", detail: "Accepted AI suggestion for FX rate. Overrode value to $108,420.00 (Confidence: 97%).", ip: "192.168.1.44" },
    { id: "al-104", ts: "2025-01-01 10:02:44", user: "James Okafor", role: "Controller", action: "Exception Resolved", target: "EXC-001", detail: "Resolved exception. Resolution: 'Corrected in Source'.", ip: "192.168.1.89" },
    { id: "al-105", ts: "2025-01-01 11:30:00", user: "James Okafor", role: "Controller", action: "Cross-Check Override", target: "NMFP-01", detail: "Overrode Shadow NAV deviation (31 bps). Justification: Board notified.", ip: "192.168.1.89" },
    { id: "al-106", ts: "2025-01-01 14:05:12", user: "Sarah Chen", role: "Preparer", action: "Journal Entry Drafted", target: "JE-1042", detail: "Drafted 2-leg JE for Audit Fee Accrual ($15,000). Routed for Controller review.", ip: "192.168.1.44" },
    { id: "al-107", ts: "2025-01-01 14:45:00", user: "James Okafor", role: "Controller", action: "Journal Entry Posted", target: "JE-1042", detail: "Approved and posted JE-1042. Ledger balanced.", ip: "192.168.1.89" },
    { id: "al-108", ts: "2025-01-01 16:00:00", user: "Jennifer Liu", role: "Preparer", action: "Schema Map Updated", target: "feed-001", detail: "Mapped 'fx_spot_rate' to 'exchange_rate'. Applied rule globally to 49 feeds.", ip: "192.168.1.102" },
    { id: "al-109", ts: "2025-01-02 08:30:00", user: "PwC Audit Team", role: "Auditor", action: "Report Download", target: "FND-2024-001", detail: "Downloaded 'Trial Balance — Dec 31, 2024 (Excel)'.", ip: "203.0.113.42" },
    { id: "al-110", ts: "2025-01-02 10:15:00", user: "James Okafor", role: "Controller", action: "Fund Approved", target: "FND-2024-001", detail: "Signed off on GAAP Financials. Status changed to Approved.", ip: "192.168.1.89" },
    { id: "al-111", ts: "2025-01-02 11:00:00", user: "system", role: "Beverley Engine", action: "SEC Transmission", target: "FND-2024-001", detail: "Transmitted Form N-PORT XML payload to SEC EDGAR. Status: Success.", ip: "10.0.4.15" },
  ];

  const filteredLogs = useMemo(() => {
    let res = [...AUDIT_LOGS];
    if (actionFilter !== "All") {
      res = res.filter(l => l.action.includes(actionFilter) || l.role.includes(actionFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(l => l.user.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q));
    }
    return res.reverse(); // Newest first
  }, [search, actionFilter]);

  return (
    <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 52px)", background:T.appBg}}>
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Global Audit & Compliance Ledger</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Immutable system-wide tracking for SOC 1 Type II compliance.</div>
          </div>
        </div>
        <button style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:"0 2px 4px rgba(79,70,229,0.2)"}}>
          <span>↓</span> Export Complete SOC 1 Package
        </button>
      </div>

      <div style={{padding:"24px", display:"flex", flexDirection:"column", flex:1, overflow:"hidden"}}>
        {/* Filters */}
        <div style={{display:"flex", gap:12, marginBottom:16, alignItems:"center"}}>
          <div style={{position:"relative", width: 320}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" placeholder="Search logs by user, fund, or ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} />
          </div>
          <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} style={{...SANS, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, background:"#fff", cursor:"pointer", outline:"none"}}>
            <option value="All">All Actions</option>
            <option value="Exception">Exceptions & Overrides</option>
            <option value="Journal Entry">Journal Entries</option>
            <option value="Fund Approved">Approvals</option>
            <option value="Auditor">Auditor Activity</option>
            <option value="system">System / API Activity</option>
          </select>
          <span style={{...SANS, fontSize:12, color:T.textMuted, marginLeft:"auto"}}>{filteredLogs.length} events logged</span>
        </div>

        {/* Grid */}
        <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", flex:1, display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}>
          <div style={{overflowY:"auto", flex:1}}>
            <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
              <thead style={{position:"sticky", top:0, zIndex:10, background:"#f8fafc"}}>
                <tr style={{borderBottom:`2px solid ${T.border}`}}>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"12%"}}>Timestamp (UTC)</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>User / System</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"18%"}}>Action</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>Target ID</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"30%"}}>Detail</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"10%"}}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{...MONO, fontSize:11, color:T.textMuted, padding:"12px 16px", whiteSpace:"nowrap"}}>{log.ts}</td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary}}>{log.user}</div>
                      <div style={{...SANS, fontSize:10, color:T.textMuted, marginTop:2}}>{log.role}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{...SANS, fontSize:11, fontWeight:600, color:T.textPrimary, background:T.appBg, padding:"3px 8px", borderRadius:4, border:`1px solid ${T.border}`}}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{...MONO, fontSize:11, color:T.actionBase, padding:"12px 16px"}}>{log.target}</td>
                    <td style={{...SANS, fontSize:12, color:T.textPrimary, padding:"12px 16px", lineHeight:1.4}}>{log.detail}</td>
                    <td style={{...MONO, fontSize:10, color:T.textMuted, padding:"12px 16px"}}>{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

