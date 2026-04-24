import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function ScheduledTransfersTab() {
  const [schedules, setSchedules] = useState([
    { id:"sch-1", name:"State Street GL — EOD Pull",      direction:"INBOUND",  host:"sftp.statestreet.com",  path:"/outbound/torrance/gl/",       schedule:"0 23 * * 1-5",  nextRun:"Jan 3, 2025 11:00 PM", status:"Active", lastStatus:"✓ Success", filePattern:"*.csv",  authType:"SSH Key"    },
    { id:"sch-2", name:"BNY Mellon Holdings — EOD Pull",  direction:"INBOUND",  host:"sftp.bnymellon.com",    path:"/torrance/outbound/holdings/", schedule:"0 22 * * 1-5",  nextRun:"Jan 3, 2025 10:00 PM", status:"Active", lastStatus:"✓ Success", filePattern:"*.csv",  authType:"SSH Key"    },
    { id:"sch-3", name:"Pennywise FS — Client Delivery",  direction:"OUTBOUND", host:"sftp.pennywisecapital.com", path:"/inbound/financials/",      schedule:"0 8 1 * *",     nextRun:"Feb 1, 2025 8:00 AM",  status:"Active", lastStatus:"✓ Success", filePattern:"*.pdf",  authType:"Password"   },
    { id:"sch-4", name:"Bowers Board Pack — Delivery",    direction:"OUTBOUND", host:"sftp.bowersasset.com",  path:"/board-reports/",              schedule:"0 7 15 * *",    nextRun:"Jan 15, 2025 7:00 AM", status:"Active", lastStatus:"✓ Success", filePattern:"*.xlsx", authType:"SSH Key"    },
    { id:"sch-5", name:"SEC EDGAR — Filing Transmission", direction:"OUTBOUND", host:"efts.sec.gov",          path:"/submit/",                     schedule:"Manual",        nextRun:"On Demand",             status:"Active", lastStatus:"✓ Success", filePattern:"*.xml",  authType:"Client Cert"},
    { id:"sch-6", name:"JPM Capital Activity — Pull",     direction:"INBOUND",  host:"sftp.jpmorgan.com",     path:"/torrance/capital-activity/",  schedule:"30 23 * * 1-5", nextRun:"Jan 3, 2025 11:30 PM", status:"Active", lastStatus:"✓ Success", filePattern:"*.json", authType:"SSH Key"    },
    { id:"sch-7", name:"PwC Audit Package — Delivery",    direction:"OUTBOUND", host:"sftp.pwc.com",          path:"/client-files/pennywise/",     schedule:"0 9 * * MON",   nextRun:"Jan 6, 2025 9:00 AM",  status:"Paused", lastStatus:"⏸ Paused",  filePattern:"*.zip",  authType:"SSH Key"    },
    { id:"sch-8", name:"Derry Tax Files — Pull",          direction:"INBOUND",  host:"sftp.derrycapital.com", path:"/tax-exports/",                schedule:"0 6 * * FRI",   nextRun:"Jan 3, 2025 6:00 AM",  status:"Error",  lastStatus:"✕ Timeout", filePattern:"*.xlsx", authType:"Password"   },
  ]);
  const [showAddSch, setShowAddSch] = useState(false);
  const [newSch, setNewSch] = useState({ name:"", direction:"INBOUND", host:"", path:"/", schedule:"0 23 * * 1-5", filePattern:"*.csv", authType:"SSH Key" });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ ...SANS, fontSize:16, fontWeight:700 }}>Scheduled Transfers</div>
          <div style={{ ...SANS, fontSize:13, color:T.textMuted, marginTop:4 }}>Automated SFTP push/pull jobs for custodians, auditors, and regulators.</div>
        </div>
        <button onClick={() => setShowAddSch(true)}
          style={{ ...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer" }}>
          + Add Schedule
        </button>
      </div>

      <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
          <thead style={{ background:T.appBg, borderBottom:`2px solid ${T.border}` }}>
            <tr>
              {["Transfer Name","Dir.","Host","Path","Schedule","Next Run","File Pattern","Auth","Last Run","Status",""].map(h => (
                <th key={h} style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map(s => {
              const statusColor = s.status === "Active" ? T.okBase  : s.status === "Paused" ? T.warnBase  : T.errorBase;
              const statusBg    = s.status === "Active" ? T.okBg    : s.status === "Paused" ? T.warnBg    : T.errorBg;
              const statusBd    = s.status === "Active" ? T.okBorder: s.status === "Paused" ? T.warnBorder: T.errorBorder;
              return (
                <tr key={s.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ ...SANS, fontSize:12, fontWeight:600, padding:"10px 12px" }}>{s.name}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ ...MONO, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:3,
                      background: s.direction === "INBOUND" ? T.actionBg : T.aiBg,
                      color: s.direction === "INBOUND" ? T.actionBase : T.aiBase,
                      border: `1px solid ${s.direction === "INBOUND" ? "#bfdbfe" : T.aiBorder}` }}>
                      {s.direction === "INBOUND" ? "↓ IN" : "↑ OUT"}
                    </span>
                  </td>
                  <td style={{ ...MONO, fontSize:10, color:T.textMuted, padding:"10px 12px" }}>{s.host}</td>
                  <td style={{ ...MONO, fontSize:10, color:T.textMuted, padding:"10px 12px" }}>{s.path}</td>
                  <td style={{ ...MONO, fontSize:10, padding:"10px 12px" }}>{s.schedule}</td>
                  <td style={{ ...SANS, fontSize:11, color:T.textMuted, padding:"10px 12px", whiteSpace:"nowrap" }}>{s.nextRun}</td>
                  <td style={{ ...MONO, fontSize:10, color:T.textMuted, padding:"10px 12px" }}>{s.filePattern}</td>
                  <td style={{ ...SANS, fontSize:11, padding:"10px 12px" }}>{s.authType}</td>
                  <td style={{ ...SANS, fontSize:11, padding:"10px 12px", whiteSpace:"nowrap" }}>{s.lastStatus}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ ...SANS, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:4, background:statusBg, color:statusColor, border:`1px solid ${statusBd}` }}>{s.status}</span>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <button style={{ ...SANS, fontSize:11, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer" }}>Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddSch && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowAddSch(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:12, width:600, overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.4)" }}>
            <div style={{ background:T.navyHeader, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ ...SANS, fontWeight:700, fontSize:15, color:"#fff" }}>Add Transfer Schedule</div>
              <button onClick={() => setShowAddSch(false)} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Transfer Name</div>
                <input type="text" value={newSch.name} onChange={e => setNewSch(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Apollo LP Data — Weekly Pull"
                  style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Direction</div>
                  <select value={newSch.direction} onChange={e => setNewSch(p => ({ ...p, direction: e.target.value }))}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                    <option value="INBOUND">↓ INBOUND (Pull)</option>
                    <option value="OUTBOUND">↑ OUTBOUND (Push)</option>
                  </select>
                </div>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Authentication</div>
                  <select value={newSch.authType} onChange={e => setNewSch(p => ({ ...p, authType: e.target.value }))}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                    {["SSH Key","Password","Client Cert","API Key"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Host URL</div>
                <input type="text" value={newSch.host} onChange={e => setNewSch(p => ({ ...p, host: e.target.value }))}
                  placeholder="sftp.custodian.com"
                  style={{ ...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Remote Path</div>
                  <input type="text" value={newSch.path} onChange={e => setNewSch(p => ({ ...p, path: e.target.value }))}
                    placeholder="/outbound/files/"
                    style={{ ...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, boxSizing:"border-box" }} />
                </div>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>CRON Schedule</div>
                  <input type="text" value={newSch.schedule} onChange={e => setNewSch(p => ({ ...p, schedule: e.target.value }))}
                    placeholder="0 23 * * 1-5"
                    style={{ ...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, boxSizing:"border-box" }} />
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowAddSch(false)}
                style={{ ...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer" }}>Cancel</button>
              <button
                onClick={() => {
                  if (!newSch.name.trim() || !newSch.host.trim()) return;
                  setSchedules(p => [...p, { ...newSch, id:`sch-${Date.now()}`, status:"Active", lastStatus:"Never run", nextRun:"Pending", filePattern:"*.*" }]);
                  setNewSch({ name:"", direction:"INBOUND", host:"", path:"/", schedule:"0 23 * * 1-5", filePattern:"*.csv", authType:"SSH Key" });
                  setShowAddSch(false);
                }}
                style={{ ...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer" }}>
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
