import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { GlobalAddEntityModal } from '../modals/GlobalAddEntityModal';
import { InviteUserModal } from '../modals/InviteUserModal';
import { AddRuleModal } from '../modals/AddRuleModal';
import { FUND_STRUCTURE } from '../../data/feeds/gl';
import { fmtUSD } from '../../utils/formatters';
import type { FundSeed } from '../../types';

export function GlobalEntityManager({ fundSeeds, onBack = null }: { fundSeeds: FundSeed[]; onBack?: (() => void) | null }) {
  const [activeTab, setActiveTab] = useState("entities"); // 'entities', 'rbac', 'rules'
  const [search, setSearch] = useState("");
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [customEntities, setCustomEntities] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Mocking the Internal/External Users for RBAC
  const ALL_USERS = [
    { id: "u1", name: "Sarah Chen", email: "sarah.c@torrance.com", role: "Preparer", type: "Internal", funds: "12 Funds", mfa: true },
    { id: "u4", name: "James Okafor", email: "james.o@torrance.com", role: "Controller", type: "Internal", funds: "All Funds", mfa: true },
    { id: "u5", name: "Jennifer Liu", email: "jennifer.l@torrance.com", role: "Preparer", type: "Internal", funds: "8 Funds", mfa: true },
    { id: "ext1", name: "PwC Audit Team", email: "torrance.audit@pwc.com", role: "Auditor (Read-Only)", type: "External", funds: "Pennywise Capital (All)", mfa: true },
    { id: "ext2", name: "Derry GP", email: "gp@derrycapital.com", role: "Client / LP", type: "External", funds: "Derry Credit Opps", mfa: false }
  ];

  // Mocking Assignment Rules
  const RULES = [
    { id: "r1", condition: "IF Exception Code == 'NAV_MISMATCH'", action: "ASSIGN TO James Okafor (Controller)", active: true },
    { id: "r2", condition: "IF Dollar Variance > $500,000", action: "ASSIGN TO Sarah Chen (Senior)", active: true },
    { id: "r3", condition: "IF Fund Type == 'Private Equity'", action: "ASSIGN TO Marcus Reid", active: false },
  ];

  const allEntities = useMemo(() => {
    let entities: any[] = [];
    fundSeeds.forEach(fund => {
      const structure = FUND_STRUCTURE[fund.fund_id];
      entities.push({
        id: fund.fund_id, name: fund.name, type: fund.fundType === "Management Co" ? "Mgt Co" : "Master Fund",
        client: fund.client, jurisdiction: structure?.jurisdiction || "Delaware, USA", nav: fund.net_assets,
        fundType: fund.fundType, parent: "—", filings: fund.requiredFilings || []
      });

      if (structure && structure.feeders) {
        structure.feeders.forEach((f, idx) => {
          entities.push({
            id: `${fund.fund_id}-F${idx}`, name: `${fund.name} - ${f.shareClass}`, type: "Feeder / Class",
            client: fund.client, jurisdiction: f.jurisdiction || "Delaware, USA", nav: f.nav,
            fundType: fund.fundType, parent: fund.fund_id, filings: [] 
          });
        });
      }
    });
    customEntities.forEach(e => entities.push(e));
    return entities;
  }, [fundSeeds, customEntities]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    const filtered = allEntities.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()) || e.client.toLowerCase().includes(search.toLowerCase()));
    filtered.forEach(e => {
      if(!g[e.client]) g[e.client] = [];
      g[e.client].push(e);
    });
    return g;
  }, [allEntities, search]);

  return (
    <div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden", flexDirection:"column", background:T.appBg}}>
      
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Global Entity Setup</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Manage Master Data, RBAC, and Assignment Rules.</div>
          </div>
        </div>
        <div style={{display:"flex", background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, padding:4}}>
          <button onClick={()=>setActiveTab("entities")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="entities"?T.cardBg:"transparent", color:activeTab==="entities"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="entities"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Entities & Feeders</button>
          <button onClick={()=>setActiveTab("rbac")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="rbac"?T.cardBg:"transparent", color:activeTab==="rbac"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="rbac"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Access & Roles</button>
          <button onClick={()=>setActiveTab("rules")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="rules"?T.cardBg:"transparent", color:activeTab==="rules"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="rules"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Assignment Rules</button>
        </div>
      </div>

      <div style={{padding:"24px", overflowY:"auto", flex:1}}>
        
        {/* Toolbar */}
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:20}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:13}}>⌕</span>
            <input type="text" placeholder={activeTab === "rules" ? "Search rules..." : activeTab === "entities" ? "Search entities, clients, IDs..." : "Search users, emails, roles..."} value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, padding:"8px 12px 8px 28px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:300, outline:"none"}} />
          </div>
          <button onClick={() => {
            if (activeTab === "entities") setShowAddEntity(true);
            else if (activeTab === "rbac") setShowAddUser(true);
            else if (activeTab === "rules") setShowAddRule(true);
          }} style={{...SANS,fontSize:12,fontWeight:600,padding:"8px 16px",borderRadius:6,border:"none",background:T.actionBase, color:"#fff",cursor:"pointer"}}>
            {activeTab === "rules" ? "+ Build Rule" : activeTab === "entities" ? "+ Setup New Entity" : "+ Invite User"}
          </button>
        </div>

        {/* TAB 1: Entities */}
        {activeTab === "entities" && (
          <div className="fade-in">
            {Object.entries(grouped).map(([client, entities]) => {
              const isOpen = !collapsed[client];
              return (
                <div key={client} style={{border:`1px solid ${T.border}`,borderRadius:10,marginBottom:14,background:T.cardBg,overflow:"hidden"}}>
                  <div onClick={()=>setCollapsed(p=>({...p,[client]:!p[client]}))} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:T.appBg,borderBottom:isOpen?`1px solid ${T.border}`:"none",cursor:"pointer"}}>
                    <span style={{color:T.textMuted,fontSize:12, width:16, textAlign:"center"}}>{isOpen?"▼":"▶"}</span>
                    <div>
                      <div style={{...SANS,fontWeight:700,fontSize:14,color:T.textPrimary}}>{client}</div>
                      <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>{entities.length} entities</div>
                    </div>
                  </div>
                  {isOpen && (
                    <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                      <thead>
                        <tr style={{background:"#f8fafc", borderBottom:`1px solid ${T.border}`}}>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"30%"}}>Entity Name & ID</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>Structure / Parent</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"20%"}}>GAAP Format</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>Required Filings</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", textAlign:"right"}}>Net Assets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entities.map(e => (
                          <tr key={e.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary}}>{e.name}</div>
                              <div style={{...MONO, fontSize:11, color:T.textMuted, marginTop:2}}>{e.id}</div>
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{display:"flex", alignItems:"center", gap:6}}>
                                <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:e.type.includes("Master")?T.actionBg:T.appBg, color:e.type.includes("Master")?T.actionBase:T.textMuted, border:`1px solid ${e.type.includes("Master")?"#bfdbfe":T.border}`}}>
                                  {e.type}
                                </span>
                              </div>
                              {e.parent !== "—" && <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:4}}>↳ {e.parent}</div>}
                            </td>
                            <td style={{...SANS, fontSize:12, color:T.textPrimary, padding:"12px 16px"}}>
                              {e.fundType}
                              <div style={{...SANS, fontSize:10, color:T.textMuted, marginTop:2}}>{e.jurisdiction}</div>
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                                {e.filings.length === 0 ? <span style={{...SANS, fontSize:11, color:T.textMuted}}>—</span> : e.filings.map(f => (
                                  <span key={f} style={{...MONO, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.border}`, background:T.cardBg, color:T.textPrimary}}>{f}</span>
                                ))}
                              </div>
                            </td>
                            <td style={{padding:"12px 16px", textAlign:"right"}}>
                              {e.nav ? <div style={{...MONO, fontSize:13, fontWeight:700, color:T.textPrimary}}>{fmtUSD(e.nav)}</div> : <span style={{color:T.textMuted}}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: RBAC / Permissions */}
        {activeTab === "rbac" && (
          <div className="fade-in" style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}>
            <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
              <thead style={{background:T.appBg, borderBottom:`2px solid ${T.border}`}}>
                <tr>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>User</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Access Level (Role)</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Fund Assignment</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px", textAlign:"center"}}>MFA Enforced</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px", textAlign:"right"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ALL_USERS.map(u => (
                  <tr key={u.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary, display:"flex", alignItems:"center", gap:8}}>
                        {u.type === "External" ? <span style={{fontSize:16}}>🌐</span> : <span style={{fontSize:16}}>🏢</span>}
                        {u.name}
                      </div>
                      <div style={{...MONO, fontSize:11, color:T.textMuted, marginTop:4, paddingLeft:28}}>{u.email}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <select defaultValue={u.role} style={{...SANS, fontSize:12, padding:"6px 10px", borderRadius:4, border:`1px solid ${T.border}`, background:T.appBg, cursor:"pointer"}}>
                        <option>Controller</option>
                        <option>Preparer</option>
                        <option>Auditor (Read-Only)</option>
                        <option>Client / LP</option>
                      </select>
                    </td>
                    <td style={{padding:"12px 16px", ...SANS, fontSize:12, color:T.textPrimary}}>
                      <div style={{background:T.appBg, padding:"4px 8px", borderRadius:4, border:`1px solid ${T.border}`, display:"inline-block"}}>{u.funds}</div>
                    </td>
                    <td style={{padding:"12px 16px", textAlign:"center"}}>
                      {u.mfa ? <span style={{color:T.okBase, fontSize:16}}>✓</span> : <span style={{...SANS, fontSize:10, fontWeight:700, background:T.errorBg, color:T.errorBase, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.errorBorder}`}}>⚠ DISABLED</span>}
                    </td>
                    <td style={{padding:"12px 16px", textAlign:"right"}}>
                      <button style={{...SANS, fontSize:11, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer"}}>Edit Access</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Assignment Rules */}
        {activeTab === "rules" && (
          <div className="fade-in">
            <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden"}}>
              {RULES.map((r, idx) => (
                <div key={r.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom: idx < RULES.length-1 ? `1px solid ${T.border}` : "none"}}>
                  <div style={{display:"flex", alignItems:"center", gap:16}}>
                    <span style={{fontSize:20}}>{r.active ? "✅" : "⏸"}</span>
                    <div>
                      <div style={{...MONO, fontSize:13, fontWeight:600, color:T.aiDark, marginBottom:4}}>{r.condition}</div>
                      <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textPrimary}}>{r.action}</div>
                    </div>
                  </div>
                  <button style={{...SANS, fontSize:11, color:T.textMuted, background:"transparent", border:`1px solid ${T.border}`, padding:"4px 10px", borderRadius:4, cursor:"pointer"}}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      {showAddEntity && (
        <GlobalAddEntityModal
          onClose={() => setShowAddEntity(false)}
          onSave={(entity) => {
            setCustomEntities(p => [...p, entity]);
            setShowAddEntity(false);
          }}
        />
      )}
      {showAddUser && <InviteUserModal onClose={() => setShowAddUser(false)} />}
      {showAddRule && <AddRuleModal onClose={() => setShowAddRule(false)} />}
    </div>
  );
}

