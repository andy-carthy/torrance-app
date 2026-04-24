import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function BespokeFeedsTab() {
  const [bespokeFeeds, setBespokeFeeds] = useState([
    { id:"bf-1", name:"Bowers Private Equity Drawdowns",   client:"Bowers Asset Management",   source:"BNY Mellon SFTP",      feedType:"Capital Activity", fileType:".xlsx (Multi-tab)",        targetFeed:"CA-001",  status:"Active",       lastReceived:"Jan 1, 2025",  mappedFields:18, activeRules:3 },
    { id:"bf-2", name:"Derry Custom P&L Export",           client:"Derry Capital Partners",     source:"JPM Webhook",          feedType:"General Ledger",   fileType:".csv (Pipe-delimited)",     targetFeed:"GL-001",  status:"Active",       lastReceived:"Jan 1, 2025",  mappedFields:24, activeRules:6 },
    { id:"bf-3", name:"Pennywise Advisor Override Sheet",  client:"Pennywise Capital Advisors", source:"Email / Manual Upload",feedType:"GL Adjustments",   fileType:".xlsx",                     targetFeed:"GL-001",  status:"Needs Mapping",lastReceived:"Jan 2, 2025",  mappedFields:9,  activeRules:0 },
    { id:"bf-4", name:"Apollo Loan Portfolio Export",      client:"Derry Capital Partners",     source:"Apollo SFTP",          feedType:"Holdings",         fileType:".csv (Fixed-width)",        targetFeed:"HD-001",  status:"Active",       lastReceived:"Dec 31, 2024", mappedFields:31, activeRules:5 },
    { id:"bf-5", name:"CBRE Appraisal Data Feed",          client:"Bowers Asset Management",   source:"CBRE API",             feedType:"Real Estate",      fileType:".json",                     targetFeed:"RE-001",  status:"Active",       lastReceived:"Dec 15, 2024", mappedFields:14, activeRules:2 },
  ]);
  const [showAddBespoke, setShowAddBespoke] = useState(false);
  const [newFeed, setNewFeed] = useState({ name:"", client:"", source:"", feedType:"General Ledger", fileType:".csv", targetFeed:"GL-001", status:"Active" });

  return (
    <div className="fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ ...SANS, fontSize:16, fontWeight:700 }}>Bespoke File Feeds</div>
          <div style={{ ...SANS, fontSize:13, color:T.textMuted, marginTop:4 }}>Custom Excel/CSV layouts for non-standard client data drops.</div>
        </div>
        <button onClick={() => setShowAddBespoke(true)}
          style={{ ...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer" }}>
          + Add New Feed
        </button>
      </div>

      <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
          <thead style={{ background:T.appBg, borderBottom:`2px solid ${T.border}` }}>
            <tr>
              {["Feed Name","Client","Source","Feed Type","File Format","Target","Fields","Rules","Status",""].map(h => (
                <th key={h} style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 14px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bespokeFeeds.map(f => (
              <tr key={f.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{ ...SANS, fontSize:13, fontWeight:600, padding:"12px 14px" }}>{f.name}</td>
                <td style={{ ...SANS, fontSize:12, color:T.textMuted, padding:"12px 14px" }}>{f.client}</td>
                <td style={{ ...SANS, fontSize:12, padding:"12px 14px" }}>{f.source}</td>
                <td style={{ ...SANS, fontSize:12, padding:"12px 14px" }}>{f.feedType}</td>
                <td style={{ ...MONO, fontSize:11, color:T.textMuted, padding:"12px 14px" }}>{f.fileType}</td>
                <td style={{ ...MONO, fontSize:11, color:T.actionBase, padding:"12px 14px" }}>{f.targetFeed}</td>
                <td style={{ ...MONO, fontSize:12, padding:"12px 14px", textAlign:"center" }}>{f.mappedFields}</td>
                <td style={{ ...MONO, fontSize:12, padding:"12px 14px", textAlign:"center" }}>{f.activeRules}</td>
                <td style={{ padding:"12px 14px" }}>
                  <span style={{ ...SANS, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:4,
                    background: f.status === "Active" ? T.okBg : T.warnBg,
                    color: f.status === "Active" ? T.okBase : T.warnBase,
                    border: `1px solid ${f.status === "Active" ? T.okBorder : T.warnBorder}` }}>
                    {f.status}
                  </span>
                </td>
                <td style={{ padding:"12px 14px" }}>
                  <button style={{ ...SANS, fontSize:11, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer" }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddBespoke && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowAddBespoke(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.cardBg, borderRadius:12, width:560, overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.4)" }}>
            <div style={{ background:T.navyHeader, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ ...SANS, fontWeight:700, fontSize:15, color:"#fff" }}>Add New Bespoke Feed</div>
              <button onClick={() => setShowAddBespoke(false)} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { label:"Feed Name", field:"name", placeholder:"e.g., BlackRock Custom Holdings Export" },
                { label:"Client", field:"client", placeholder:"e.g., Pennywise Capital Advisors" },
                { label:"Source System", field:"source", placeholder:"e.g., SFTP / API / Email" },
              ].map(f => (
                <div key={f.field}>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>{f.label}</div>
                  <input type="text" value={newFeed[f.field]} onChange={e => setNewFeed(p => ({ ...p, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, boxSizing:"border-box" }} />
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>Feed Type</div>
                  <select value={newFeed.feedType} onChange={e => setNewFeed(p => ({ ...p, feedType: e.target.value }))}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                    {["General Ledger","Holdings","Capital Activity","Pricing","Tax","Real Estate"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:6 }}>File Format</div>
                  <select value={newFeed.fileType} onChange={e => setNewFeed(p => ({ ...p, fileType: e.target.value }))}
                    style={{ ...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, cursor:"pointer" }}>
                    {[".csv",".xlsx",".json",".txt (Fixed-width)",".xml"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowAddBespoke(false)}
                style={{ ...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer" }}>Cancel</button>
              <button
                onClick={() => {
                  if (!newFeed.name.trim()) return;
                  setBespokeFeeds(p => [...p, { ...newFeed, id:`bf-${Date.now()}`, mappedFields:0, activeRules:0, lastReceived:"Just now" }]);
                  setNewFeed({ name:"", client:"", source:"", feedType:"General Ledger", fileType:".csv", targetFeed:"GL-001", status:"Active" });
                  setShowAddBespoke(false);
                }}
                style={{ ...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer" }}>
                Add Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
