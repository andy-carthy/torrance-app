import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([
    { id:"wh-1",  name:"Fund Approved → Client Portal Sync",   trigger:"fund.status.approved",       url:"https://api.clientportal.com/v1/funds/sync",       method:"POST", authType:"Bearer Token", active:true,  lastFired:"Jan 2, 2025 10:15 AM",  successRate:100, avgLatency:142  },
    { id:"wh-2",  name:"Exception Resolved → Risk System",     trigger:"exception.status.resolved",  url:"https://risk.internal.com/v2/exceptions/notify",  method:"POST", authType:"HMAC-SHA256",  active:true,  lastFired:"Jan 1, 2025 9:22 AM",   successRate:98,  avgLatency:89   },
    { id:"wh-3",  name:"NAV Published → Custodian API",        trigger:"nav.daily.published",        url:"https://api.statestreet.com/nav/ingest",           method:"POST", authType:"OAuth 2.0",    active:true,  lastFired:"Jan 2, 2025 6:00 PM",   successRate:100, avgLatency:220  },
    { id:"wh-4",  name:"SEC Filing Transmitted → Compliance",  trigger:"filing.sec.transmitted",     url:"https://compliance.internal.com/filings/confirm", method:"POST", authType:"API Key",      active:true,  lastFired:"Jan 2, 2025 11:00 AM",  successRate:100, avgLatency:310  },
    { id:"wh-5",  name:"Journal Entry Posted → ERP System",    trigger:"journal_entry.posted",       url:"https://erp.client.com/api/v3/journal/import",    method:"POST", authType:"Bearer Token", active:true,  lastFired:"Jan 1, 2025 2:47 PM",   successRate:95,  avgLatency:480  },
    { id:"wh-6",  name:"Capital Call Issued → Investor Portal",trigger:"capital_call.issued",        url:"https://investor.portal.com/api/capital-calls",   method:"POST", authType:"HMAC-SHA256",  active:false, lastFired:"Dec 15, 2024 3:00 PM",  successRate:100, avgLatency:195  },
    { id:"wh-7",  name:"SLA Breach → Ops Alert Channel",       trigger:"sla.breach.detected",        url:"https://hooks.slack.com/services/T0123/BABC/xyz", method:"POST", authType:"None",         active:true,  lastFired:"Dec 31, 2024 11:58 PM", successRate:100, avgLatency:55   },
    { id:"wh-8",  name:"Fund Approved → EDGAR Pre-Validate",   trigger:"fund.status.approved",       url:"https://efts.sec.gov/LATEST/v1/pre-validate",     method:"POST", authType:"Client Cert",  active:false, lastFired:"Never",                 successRate:null,avgLatency:null },
  ]);
  const [showAddWh, setShowAddWh] = useState(false);
  const [newWh, setNewWh] = useState({ name:"", trigger:"fund.status.approved", url:"", method:"POST", authType:"Bearer Token" });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ ...SANS, fontSize:16, fontWeight:700 }}>External API Webhooks</div>
          <div style={{ ...SANS, fontSize:13, color:T.textMuted, marginTop:4 }}>Event-driven payloads pushed to downstream systems on trigger conditions.</div>
        </div>
        <button onClick={() => setShowAddWh(true)}
          style={{ ...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer" }}>
          + Register Webhook
        </button>
      </div>

      <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
          <thead style={{ background:T.appBg, borderBottom:`2px solid ${T.border}` }}>
            <tr>
              {["Webhook Name","Trigger Event","Destination URL","Auth","Last Fired","Success","Latency","Active",""].map(h => (
                <th key={h} style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {webhooks.map(w => (
              <tr key={w.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, opacity: w.active ? 1 : 0.55 }}>
                <td style={{ ...SANS, fontSize:12, fontWeight:600, padding:"10px 12px", maxWidth:200 }}>{w.name}</td>
                <td style={{ ...MONO, fontSize:10, color:T.actionBase, padding:"10px 12px" }}>{w.trigger}</td>
                <td style={{ ...MONO, fontSize:10, color:T.textMuted, padding:"10px 12px", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={w.url}>{w.url}</td>
                <td style={{ ...SANS, fontSize:11, padding:"10px 12px" }}>{w.authType}</td>
                <td style={{ ...MONO, fontSize:10, color:T.textMuted, padding:"10px 12px", whiteSpace:"nowrap" }}>{w.lastFired}</td>
                <td style={{ ...MONO, fontSize:12, fontWeight:700, padding:"10px 12px", color: (w.successRate || 0) >= 99 ? T.okBase : T.warnBase }}>
                  {w.successRate != null ? `${w.successRate}%` : "—"}
                </td>
                <td style={{ ...MONO, fontSize:11, padding:"10px 12px", color:T.textMuted }}>
                  {w.avgLatency != null ? `${w.avgLatency}ms` : "—"}
                </td>
                <td style={{ padding:"10px 12px" }}>
                  <div onClick={() => setWebhooks(p => p.map(x => x.id === w.id ? { ...x, active: !x.active } : x))}
                    style={{ width:34, height:18, borderRadius:9, background:w.active ? T.okBase : T.border, position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:w.active ? 18 : 2, transition:"left 0.2s" }} />
                  </div>
                </td>
                <td style={{ padding:"10px 12px" }}>
                  <button style={{ ...SANS, fontSize:11, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer" }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddWh && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowAddWh(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:12, width:580, overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.4)" }}>
            <div style={{ background:T.navyHeader, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ ...SANS, fontWeight:700, fontSize:15, color:"#fff" }}>Register New Webhook</div>
              <button onClick={() => setShowAddWh(false)} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Webhook Name</div>
                <input type="text" value={newWh.name} onChange={e => setNewWh(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., NAV Published → ERP Sync"
                  style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Trigger Event</div>
                  <select value={newWh.trigger} onChange={e => setNewWh(p => ({ ...p, trigger: e.target.value }))}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                    {["fund.status.approved","exception.status.resolved","nav.daily.published","filing.sec.transmitted","journal_entry.posted","capital_call.issued","sla.breach.detected"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Authentication</div>
                  <select value={newWh.authType} onChange={e => setNewWh(p => ({ ...p, authType: e.target.value }))}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                    {["Bearer Token","HMAC-SHA256","OAuth 2.0","API Key","Client Cert","None"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Destination URL</div>
                <input type="text" value={newWh.url} onChange={e => setNewWh(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://api.yoursystem.com/v1/webhook"
                  style={{ ...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowAddWh(false)}
                style={{ ...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer" }}>Cancel</button>
              <button
                onClick={() => {
                  if (!newWh.name.trim() || !newWh.url.trim()) return;
                  setWebhooks(p => [...p, { ...newWh, id:`wh-${Date.now()}`, active:false, lastFired:"Never", successRate:null, avgLatency:null }]);
                  setNewWh({ name:"", trigger:"fund.status.approved", url:"", method:"POST", authType:"Bearer Token" });
                  setShowAddWh(false);
                }}
                style={{ ...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer" }}>
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
