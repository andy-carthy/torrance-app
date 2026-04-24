import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { FieldLabel } from '../primitives/Card';
import type { FundSeed } from '../../types';

export function IntegrationsAndArchitectureHub({ fundSeeds, masterFeeds, onBack }) {
  const [activeTab, setActiveTab] = useState("connectors"); // 'connectors', 'flows', or 'schemas'

  // Edit States
  const [syncing, setSyncing] = useState<string | null>(null);
  const [editingConnector, setEditingConnector] = useState<any>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  
  const CONNECTORS = [
    { id: "c1", name: "State Street Bank", type: "Custodian", protocol: "SFTP / CSV", status: "Healthy", lastSync: "Today, 11:58 PM", nextSync: "Scheduled (Daily)", logo: "🏦", host: "sftp.statestreet.com", port: "22", auth: "SSH Key" },
    { id: "c2", name: "Goldman Sachs", type: "Prime Broker", protocol: "REST API", status: "Healthy", lastSync: "Today, 11:05 PM", nextSync: "Real-time", logo: "📈", endpoint: "api.gs.com/v1/positions", auth: "OAuth 2.0" },
    { id: "c3", name: "Bloomberg Data License", type: "Pricing Feed", protocol: "API (B-PIPE)", status: "Degraded", lastSync: "Today, 4:00 PM", nextSync: "Manual Intervention", logo: "💹", error: "Latency spike detected on European endpoints.", endpoint: "api.bloomberg.com/marketdata", auth: "API Key" },
    { id: "c4", name: "SEC EDGAR", type: "Regulatory", protocol: "SOAP API", status: "Healthy", lastSync: "Test Ping: Success", nextSync: "Awaiting Transmission", logo: "🏛", endpoint: "edgar.sec.gov/submit", auth: "Client Certificate" },
  ];

  const SCHEMAS = [
    { id: "sch-01", client: "Pennywise Capital", source: "State Street Bank", feedType: "GL", version: "v2.1", date: "Dec 15, 2024", coverage: "100%", status: "Active", approvedBy: "Sarah Chen" },
    { id: "sch-02", client: "Bowers Asset Mgt", source: "Goldman Sachs", feedType: "Holdings", version: "v1.0", date: "Nov 01, 2024", coverage: "98%", status: "Active", approvedBy: "James Okafor" },
    { id: "sch-03", client: "Derry Capital", source: "Internal Admin", feedType: "Capital Activity", version: "v3.4", date: "Jan 02, 2025", coverage: "85%", status: "Delta Review Required", approvedBy: "System" },
  ];

  const handleForceSync = (e, id) => {
    e.stopPropagation();
    setSyncing(id);
    setTimeout(() => setSyncing(null), 2000);
  };

  const ConnectorCard = ({ conn }) => {
    const isError = conn.status !== "Healthy";
    return (
      <div onClick={() => setEditingConnector(conn)} style={{background:T.cardBg, border:`1px solid ${isError ? T.warnBorder : T.border}`, borderRadius:12, padding:"20px", display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(0,0,0,0.02)", cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=isError ? T.warnBorder : T.border}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{fontSize:28, background:T.appBg, width:48, height:48, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${T.border}`}}>
              {conn.logo}
            </div>
            <div>
              <div style={{...SANS, fontSize:15, fontWeight:700, color:T.textPrimary}}>{conn.name}</div>
              <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>{conn.type} · {conn.protocol}</div>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6, background:isError ? T.warnBg : T.okBg, padding:"4px 10px", borderRadius:20, border:`1px solid ${isError ? T.warnBorder : T.okBorder}`}}>
            <span style={{color:isError ? T.warnBase : T.okBase, fontSize:10}}>●</span>
            <span style={{...SANS, fontSize:11, fontWeight:700, color:isError ? T.warnBase : T.okBase, textTransform:"uppercase", letterSpacing:"0.03em"}}>{conn.status}</span>
          </div>
        </div>
        
        {isError && (
          <div style={{background:T.warnBg, borderLeft:`3px solid ${T.warnBase}`, padding:"8px 12px", ...SANS, fontSize:11, color:T.warnBase, marginBottom:16, borderRadius:4}}>
            <strong>Alert:</strong> {conn.error}
          </div>
        )}

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"auto", paddingTop:16, borderTop:`1px solid ${T.border}`}}>
          <div>
            <div style={{...SANS, fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2}}>Last Sync</div>
            <div style={{...MONO, fontSize:11, color:T.textPrimary, fontWeight:600}}>{conn.lastSync}</div>
          </div>
          <button onClick={(e) => handleForceSync(e, conn.id)} disabled={syncing === conn.id} style={{...SANS, fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.border}`, background:T.appBg, color:T.textPrimary, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:6}}>
            {syncing === conn.id ? <><span style={{animation:"pulse 0.8s infinite"}}>↻</span> Syncing...</> : <><span>↻</span> Force Sync</>}
          </button>
        </div>
      </div>
    );
  };

  const Node = ({ id, title, desc, layer, color }) => (
    <div onClick={() => setEditingNode({ id, title, desc, layer, color })} style={{background:T.cardBg, border:`1px solid ${color}`, borderRadius:8, padding:"12px 16px", minWidth:220, position:"relative", zIndex:2, boxShadow:"0 4px 6px rgba(0,0,0,0.02)", cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <div style={{...MONO, fontSize:9, fontWeight:700, color:color, background:`${color}15`, display:"flex", padding:"2px 6px", borderRadius:4, marginBottom:6, justifyContent:"space-between", alignItems:"center"}}>
        <span>LAYER {layer}</span>
        <span style={{fontSize:12}}>⚙</span>
      </div>
      <div style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary}}>{title}</div>
      <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:4, lineHeight:1.4}}>{desc}</div>
    </div>
  );

  return (
    <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 52px)", background:T.appBg}}>
      
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Integrations & Data Architecture</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Manage API connections, system flows, and global mapping schemas.</div>
          </div>
        </div>
        <div style={{display:"flex", background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, padding:4}}>
          <button onClick={()=>setActiveTab("connectors")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="connectors"?T.cardBg:"transparent", color:activeTab==="connectors"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="connectors"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Connectors</button>
          <button onClick={()=>setActiveTab("flows")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="flows"?T.cardBg:"transparent", color:activeTab==="flows"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="flows"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Pipeline Map</button>
          <button onClick={()=>setActiveTab("schemas")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="schemas"?T.cardBg:"transparent", color:activeTab==="schemas"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="schemas"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Schema Registry</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{flex:1, overflowY:"auto", padding:"32px 48px", position:"relative"}}>
        
        {/* TAB 1: CONNECTORS */}
        {activeTab === "connectors" && (
          <div className="fade-in">
            <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, marginBottom:20}}>Active Integration Hub</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:20}}>
              {CONNECTORS.map(c => <ConnectorCard key={c.id} conn={c} />)}
            </div>
            
            <div style={{marginTop:32, padding:"20px", border:`2px dashed ${T.border}`, borderRadius:10, textAlign:"center", background:T.cardBg, cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{fontSize:24, color:T.textMuted, marginBottom:8}}>+</div>
              <div style={{...SANS, fontSize:14, fontWeight:600, color:T.textPrimary}}>Add New Connection</div>
              <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:4}}>Configure a new SFTP endpoint or API Token.</div>
            </div>
          </div>
        )}

        {/* TAB 2: PIPELINE FLOWS */}
        {activeTab === "flows" && (
          <div className="fade-in">
            <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, marginBottom:8}}>System Architecture Flow</div>
            <div style={{...SANS, fontSize:13, color:T.textMuted, marginBottom:32}}>Click any node to configure ETL mapping rules and logic.</div>
            
            {/* Visual Pipeline Representation */}
            <div style={{display:"flex", gap:40, position:"relative", alignItems:"center"}}>
              <div style={{position:"absolute", top:"50%", left:200, right:200, height:2, background:T.border, zIndex:1, transform:"translateY(-50%)"}} />

              {/* Column 1 */}
              <div style={{display:"flex", flexDirection:"column", gap:24, flex:1}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center"}}>External APIs</div>
                <Node id="n1" title="Custodians & Admins" desc="Positions, Trial Balance, & Capital Activity via SFTP" layer="0" color="#64748b" />
                <Node id="n2" title="Market Data" desc="Pricing and FX Rates via API" layer="0" color="#64748b" />
              </div>
              <div style={{color:T.border, fontSize:24, zIndex:2}}>→</div>

              {/* Column 2 */}
              <div style={{display:"flex", flexDirection:"column", gap:24, flex:1.5, background:"#f8fafc", padding:24, borderRadius:12, border:`1px solid ${T.border}`, position:"relative", zIndex:2}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textPrimary, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center", marginBottom:8}}>Torrance Core Engine</div>
                <Node id="n3" title="raw.ingestion" desc="The 12 Canonical Feeds (GL, Holdings, Rates)." layer="1" color="#3b82f6" />
                <div style={{textAlign:"center", color:T.border, fontSize:16, margin:"-12px 0"}}>↓</div>
                <Node id="n4" title="ref.master_data" desc="Chart of Accounts and Entity Hierarchy." layer="2" color="#8b5cf6" />
                <div style={{textAlign:"center", color:T.border, fontSize:16, margin:"-12px 0"}}>↓</div>
                <Node id="n5" title="derived.aggregates" desc="Position valuations and calculated NAVs." layer="3" color="#10b981" />
              </div>
              <div style={{color:T.border, fontSize:24, zIndex:2}}>→</div>

              {/* Column 3 */}
              <div style={{display:"flex", flexDirection:"column", gap:24, flex:1}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center"}}>Outputs</div>
                <Node id="n6" title="Financial Statements" desc="GAAP reporting & dynamic footnotes." layer="4" color="#0ea5e9" />
                <Node id="n7" title="SEC EDGAR" desc="N-PORT, N-CEN, Form PF XML payloads." layer="4" color="#0ea5e9" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SCHEMA REGISTRY */}
        {activeTab === "schemas" && (
          <div className="fade-in">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
              <div>
                <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary}}>Client-Custodian Schema Registry</div>
                <div style={{...SANS, fontSize:13, color:T.textMuted, marginTop:4}}>Pre-registered mappings for touchless ingestion.</div>
              </div>
              <button style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", boxShadow:"0 1px 2px rgba(79,70,229,0.2)"}}>+ Register Schema</button>
            </div>
            
            <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}>
              <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                <thead style={{background:T.appBg, borderBottom:`2px solid ${T.border}`}}>
                  <tr>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Client & Custodian</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Feed Type</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Version</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Coverage</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Status</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px", textAlign:"right"}}>Last Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMAS.map(s => (
                    <tr key={s.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"12px 16px"}}>
                        <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary}}>{s.source}</div>
                        <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:2}}>{s.client}</div>
                      </td>
                      <td style={{...SANS, fontSize:12, color:T.textPrimary, padding:"12px 16px"}}>{s.feedType}</td>
                      <td style={{...MONO, fontSize:12, color:T.textPrimary, padding:"12px 16px"}}>{s.version}</td>
                      <td style={{padding:"12px 16px"}}><span style={{...MONO, fontSize:11, fontWeight:700, color:T.okBase, background:T.okBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.okBorder}`}}>{s.coverage}</span></td>
                      <td style={{padding:"12px 16px"}}><span style={{...SANS, fontSize:10, fontWeight:700, color:s.status==="Active"?T.okBase:T.errorBase, background:s.status==="Active"?T.okBg:T.errorBg, padding:"3px 8px", borderRadius:4, border:`1px solid ${s.status==="Active"?T.okBorder:T.errorBorder}`}}>{s.status}</span></td>
                      <td style={{padding:"12px 16px", textAlign:"right"}}>
                        <div style={{...SANS, fontSize:12, color:T.textPrimary}}>{s.approvedBy}</div>
                        <div style={{...SANS, fontSize:11, color:T.textMuted}}>{s.date}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: Connector Settings */}
        {editingConnector && (
          <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:1000,display:"flex",justifyContent:"flex-end"}} onClick={()=>setEditingConnector(null)}>
            <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg, width:500, height:"100vh", boxShadow:"-10px 0 30px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column"}}>
              <div style={{padding:"20px 24px", borderBottom:`1px solid ${T.border}`, background:T.navyHeader, color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{...SANS, fontSize:16, fontWeight:700}}>Edit Connection: {editingConnector.name}</div>
                  <div style={{...SANS, fontSize:12, color:"#9ca3af", marginTop:4}}>{editingConnector.protocol} Setup</div>
                </div>
                <button onClick={()=>setEditingConnector(null)} style={{background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20}}>✕</button>
              </div>
              <div style={{padding:"24px", overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:20}}>
                <div>
                  <FieldLabel>Endpoint / Host</FieldLabel>
                  <input type="text" defaultValue={editingConnector.host || editingConnector.endpoint} style={{...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12}} />
                </div>
                {editingConnector.host && (
                  <div>
                    <FieldLabel>Port</FieldLabel>
                    <input type="text" defaultValue={editingConnector.port} style={{...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12}} />
                  </div>
                )}
                <div>
                  <FieldLabel>Authentication Method</FieldLabel>
                  <select defaultValue={editingConnector.auth} style={{...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}}>
                    <option>SSH Key</option>
                    <option>API Key</option>
                    <option>OAuth 2.0</option>
                    <option>Client Certificate</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Credentials (Encrypted via Layer 13)</FieldLabel>
                  <input type="password" defaultValue="••••••••••••••••" style={{...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, background:"#f8fafc"}} readOnly />
                  <div style={{...SANS, fontSize:10, color:T.actionBase, marginTop:6, cursor:"pointer"}}>Update Credentials...</div>
                </div>
                
                <div style={{marginTop:"auto", borderTop:`1px solid ${T.border}`, paddingTop:24, display:"flex", gap:12}}>
                  <button style={{flex:1, ...SANS, fontSize:13, fontWeight:600, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, background:"#fff", cursor:"pointer"}}>Test Connection</button>
                  <button style={{flex:1, ...SANS, fontSize:13, fontWeight:700, padding:"10px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer"}}>Save Configuration</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Edit Pipeline Node */}
        {editingNode && (
          <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setEditingNode(null)}>
             <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg, borderRadius:12, width:700, overflow:"hidden", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
               <div style={{padding:"20px 24px", borderBottom:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                 <div>
                   <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary}}>Configure Flow: {editingNode.title}</div>
                   <div style={{...MONO, fontSize:11, color:T.textMuted, marginTop:4}}>Layer {editingNode.layer} Schema Mapping</div>
                 </div>
                 <button onClick={()=>setEditingNode(null)} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20}}>✕</button>
               </div>
               <div style={{padding:"24px"}}>
                 <div style={{...SANS, fontSize:13, color:T.textPrimary, marginBottom:20, lineHeight:1.5}}>
                   Define the ETL rules moving data into <strong>{editingNode.title}</strong>. Changes here affect all active client pipelines.
                 </div>
                 <div style={{background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:8, padding:"16px", display:"flex", flexDirection:"column", gap:12}}>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${T.border}`, paddingBottom:8}}>
                      <span style={{...MONO, fontSize:12, fontWeight:700}}>Source Object</span>
                      <span style={{...MONO, fontSize:12, fontWeight:700}}>Target Object (Layer {editingNode.layer})</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <span style={{...SANS, fontSize:12, color:T.textMuted}}>raw.custodian_positions</span>
                      <span style={{color:T.actionBase}}>→</span>
                      <span style={{...MONO, fontSize:12, color:T.textPrimary, background:"#fff", padding:"4px 8px", borderRadius:4, border:`1px solid ${T.border}`}}>ref.holdings</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <span style={{...SANS, fontSize:12, color:T.textMuted}}>raw.bloomberg_eod</span>
                      <span style={{color:T.actionBase}}>→</span>
                      <span style={{...MONO, fontSize:12, color:T.textPrimary, background:"#fff", padding:"4px 8px", borderRadius:4, border:`1px solid ${T.border}`}}>ref.pricing</span>
                    </div>
                 </div>
                 <button style={{...SANS, marginTop:24, width:"100%", fontSize:13, fontWeight:700, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                   <span>⚙</span> Open Rules Engine
                 </button>
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

