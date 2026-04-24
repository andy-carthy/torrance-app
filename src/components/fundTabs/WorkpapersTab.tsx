import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { WORKPAPER_TEMPLATES } from '../../data/workpapers';
import { FieldLabel } from '../primitives/Card';
import { fmtUSD, fmtNum } from '../../utils/formatters';
import type { FundSeed, WorkpaperTemplate } from '../../types';

export function WorkpapersTab({ fund, masterFeeds, sharedTemplates, onTemplatesChange }) {
  const [templates, setTemplates] = useState(sharedTemplates || WORKPAPER_TEMPLATES);
  const [activeCalcId, setActiveCalcId] = useState("wp-1");
  const [deploying, setDeploying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftFormula, setDraftFormula] = useState("");
  const [hasOverride, setHasOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState("");
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Record<string,boolean>>({});
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string,boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [justAdded, setJustAdded] = useState<string|null>(null);

  const navTree = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q ? templates.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.subcategory||"").toLowerCase().includes(q)) : templates;
    const tree: Record<string, Record<string, typeof templates>> = {};
    filtered.forEach(t => {
      if (!tree[t.category]) tree[t.category] = {};
      const sub = t.subcategory || "General";
      if (!tree[t.category][sub]) tree[t.category][sub] = [];
      tree[t.category][sub].push(t);
    });
    return tree;
  }, [templates, search]);

  const activeCalc = templates.find(c => c.id === activeCalcId);

  const runtimeValues: Record<string,number> = {
    Total_Expenses: 8308000, Fee_Waivers: 150000, Avg_Daily_Net_Assets: 685000000,
    Mgmt_Fee_Rate: 0.0075, Days_In_Period: 31, Ending_NAV: 687400000,
    Committed_Cap: 500000000, Hurdle_Rate: 0.08, Total_Level_3_Assets: 45000000, Net_Assets: 687400000
  };

  const handleSaveFormula = () => {
    const next = templates.map(t => t.id === activeCalcId ? {...t, formula: draftFormula} : t);
    setTemplates(next);
    onTemplatesChange?.(next);
    setIsEditing(false);
  };

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setIsEditing(false);
      const next = templates.map(t => t.id === activeCalcId ? {...t, formula: draftFormula} : t);
      setTemplates(next);
      onTemplatesChange?.(next);
    }, 1500);
  };

  const handleAddFormula = (item: typeof templates[0]) => {
    const next = [...templates, item];
    setTemplates(next);
    onTemplatesChange?.(next);
    setActiveCalcId(item.id);
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 3500);
    setShowAddModal(false);
  };

  const toggleCat = (cat: string) => setCollapsedCats(p => ({...p, [cat]: !p[cat]}));
  const toggleSub = (key: string) => setCollapsedSubs(p => ({...p, [key]: !p[key]}));

  const renderFormula = (formulaString: string) => {
    const tokens = formulaString.split(/(\[.*?\]|[\(\)\/\*\-\+\^])/g).filter(t => t.trim());
    return (
      <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",padding:"16px",background:T.navyHeader,borderRadius:8,fontFamily:MONO.fontFamily,fontSize:14,lineHeight:2}}>
        {tokens.map((token, i) => {
          if (token.startsWith("[")) {
            const varName = token.replace(/[\[\]]/g, "");
            return (
              <div key={i} style={{background:T.actionBase,color:"#fff",padding:"2px 10px",borderRadius:6,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center"}}>
                <span>{varName}</span>
                <span style={{fontSize:10,color:"#a5b4fc",fontWeight:500,marginTop:2}}>{fmtNum(runtimeValues[varName]||0)}</span>
              </div>
            );
          }
          if (["+","-","*","/","^"].includes(token)) return <span key={i} style={{color:"#cbd5e1",fontWeight:700,margin:"0 4px"}}>{token}</span>;
          if (["(", ")"].includes(token)) return <span key={i} style={{color:"#94a3b8",fontWeight:700,fontSize:16}}>{token}</span>;
          return <span key={i} style={{color:"#34d399",fontWeight:700}}>{token}</span>;
        })}
      </div>
    );
  };

  function AddFormulaModal() {
    const [name, setName] = useState("");
    const [formula, setFormula] = useState("");
    const [categorySelect, setCategorySelect] = useState("Custom Formulas");
    const [customCategory, setCustomCategory] = useState("");
    const [subcategory, setSubcategory] = useState("Ad Hoc");
    const [unit, setUnit] = useState("%");
    const [isGlobal, setIsGlobal] = useState(true);
    const formulaRef = React.useRef<HTMLTextAreaElement>(null);

    const category = categorySelect === "__new__" ? customCategory : categorySelect;
    const varKey = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const canSubmit = name.trim() && formula.trim() && category.trim();
    const cats = Array.from(new Set(WORKPAPER_TEMPLATES.map(t => t.category)));

    const MODEL_DATA_POINTS: Record<string, string[]> = {
      "Balance Sheet": ["Net_Assets","Total_Assets","Total_Liabilities","Total_Level_3_Assets","Committed_Cap","Ending_NAV","Beginning_NAV","Gross_Asset_Value"],
      "Income & Expenses": ["Total_Expenses","Fee_Waivers","Advisory_Fee","Admin_Fee","Performance_Fee","Interest_Income","Dividend_Income","Realized_Gain_Loss","Unrealized_Gain_Loss"],
      "Averages & Rates": ["Avg_Daily_Net_Assets","Mgmt_Fee_Rate","Perf_Fee_Rate","Hurdle_Rate","Days_In_Period","Days_In_Year"],
      "Portfolio": ["Total_Investments","Portfolio_Cost","Long_Exposure","Short_Exposure","Gross_Exposure","Net_Exposure","Num_Positions"],
      "Capital Activity": ["Total_Subscriptions","Total_Redemptions","Net_Capital_Activity","Shares_Outstanding","NAV_Per_Share"],
    };

    const insertDataPoint = (pt: string) => {
      const ta = formulaRef.current;
      const token = `[${pt}]`;
      if (!ta) { setFormula(f => f + token); return; }
      const s = ta.selectionStart, e = ta.selectionEnd;
      setFormula(f => f.slice(0, s) + token + f.slice(e));
      setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + token.length; }, 0);
    };

    const handleCreate = () => {
      if (!canSubmit) return;
      handleAddFormula({
        id: `wp-${Date.now()}`,
        category, subcategory, name: name.trim(),
        varKey, formula: formula.trim(),
        isGlobal, aiVerified: false,
        feeds: [], syncedFunds: 0, outOfSync: 0,
        liveValue: 0, unit,
      });
    };

    return (
      <div style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAddModal(false)}>
        <div style={{background:T.cardBg,borderRadius:12,width:860,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{...SANS,fontWeight:700,fontSize:16}}>New Formula</div>
            <button onClick={()=>setShowAddModal(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:T.textMuted}}>✕</button>
          </div>
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>
            {/* Left: form */}
            <div style={{flex:1,padding:"24px",overflowY:"auto",display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <FieldLabel required>Formula Name</FieldLabel>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sharpe Ratio" style={{...SANS,width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}} />
                {varKey && (
                  <div style={{marginTop:8,padding:"8px 12px",borderRadius:6,background:"#eff6ff",border:`1px solid ${T.actionBase}`}}>
                    <span style={{...SANS,fontSize:11,color:T.textMuted}}>Token key: </span>
                    <span style={{...MONO,fontSize:12,color:T.actionBase,fontWeight:700}}>{`{{${varKey}}}`}</span>
                    <span style={{...SANS,fontSize:11,color:T.textMuted}}> — use in Footnote Editor</span>
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 90px",gap:12}}>
                <div>
                  <FieldLabel required>Category</FieldLabel>
                  <select value={categorySelect} onChange={e=>setCategorySelect(e.target.value)} style={{...SANS,width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,outline:"none",background:T.cardBg}}>
                    {cats.map(c=><option key={c} value={c}>{c}</option>)}
                    <option value="Custom Formulas">Custom Formulas</option>
                    <option value="__new__">+ New Category...</option>
                  </select>
                  {categorySelect === "__new__" && (
                    <input value={customCategory} onChange={e=>setCustomCategory(e.target.value)} placeholder="Category name" style={{...SANS,width:"100%",padding:"7px 12px",borderRadius:6,border:`1px solid ${T.actionBase}`,fontSize:13,outline:"none",marginTop:6,boxSizing:"border-box"}} />
                  )}
                </div>
                <div>
                  <FieldLabel>Subcategory</FieldLabel>
                  <input value={subcategory} onChange={e=>setSubcategory(e.target.value)} placeholder="e.g. Ad Hoc" style={{...SANS,width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <FieldLabel>Unit</FieldLabel>
                  <select value={unit} onChange={e=>setUnit(e.target.value)} style={{...SANS,width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,outline:"none",background:T.cardBg}}>
                    {["%","$","days","x","bps"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel required>Formula</FieldLabel>
                <textarea ref={formulaRef} value={formula} onChange={e=>setFormula(e.target.value)} rows={5} placeholder="( [Total_Expenses] - [Fee_Waivers] ) / [Avg_Daily_Net_Assets]" style={{...MONO,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:12,lineHeight:1.6,resize:"vertical",outline:"none",boxSizing:"border-box"}} />
                <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:4}}>Click data points on the right to insert at cursor, or type <span style={{...MONO,background:"#e2e8f0",padding:"1px 4px",borderRadius:3}}>[Variable_Name]</span> manually.</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{...SANS,fontSize:13,fontWeight:600,color:T.textPrimary}}>Global Template</span>
                <div onClick={()=>setIsGlobal(g=>!g)} style={{width:40,height:22,borderRadius:11,background:isGlobal?T.actionBase:"#cbd5e1",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,left:isGlobal?20:3,width:16,height:16,borderRadius:8,background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}} />
                </div>
                <span style={{...SANS,fontSize:11,color:T.textMuted}}>Apply across all synced funds</span>
              </div>
            </div>
            {/* Right: data point picker */}
            <div style={{width:240,borderLeft:`1px solid ${T.border}`,background:T.appBg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"16px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
                <div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Data Model</div>
                <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:3}}>Click to insert at cursor</div>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"12px"}}>
                {Object.entries(MODEL_DATA_POINTS).map(([grp,pts])=>(
                  <div key={grp} style={{marginBottom:14}}>
                    <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{grp}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      {pts.map(pt=>(
                        <button key={pt} onClick={()=>insertDataPoint(pt)} style={{...MONO,textAlign:"left",fontSize:10,padding:"5px 8px",background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:5,color:T.actionBase,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                          [{pt}]
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{padding:"16px 24px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:12}}>
            <button onClick={()=>setShowAddModal(false)} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:"none",cursor:"pointer",color:T.textMuted}}>Cancel</button>
            <button onClick={handleCreate} disabled={!canSubmit} style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 18px",borderRadius:6,border:"none",background:canSubmit?T.actionBase:T.border,color:canSubmit?"#fff":T.textMuted,cursor:canSubmit?"pointer":"not-allowed"}}>Add Formula</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",height:"100%",background:T.appBg}}>
      {showAddModal && <AddFormulaModal />}

      {/* Left nav */}
      <div style={{width:300,background:T.cardBg,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{...SANS,fontWeight:700,fontSize:13,color:T.textPrimary,marginBottom:10}}>Workpapers Engine</div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:13}}>⌕</span>
            <input type="text" placeholder="Search formulas..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS,width:"100%",padding:"6px 12px 6px 30px",borderRadius:6,border:`1px solid ${T.border}`,background:T.appBg,color:T.textPrimary,fontSize:12,outline:"none",boxSizing:"border-box"}} />
          </div>
        </div>

        <div style={{overflowY:"auto",flex:1}}>
          {Object.keys(navTree).length === 0 ? (
            <div style={{padding:"30px 20px",textAlign:"center",color:T.textMuted,...SANS,fontSize:13}}>No formulas match</div>
          ) : (
            Object.entries(navTree).map(([cat, subs]) => {
              const catCollapsed = collapsedCats[cat];
              const catCount = Object.values(subs).reduce((s,a)=>s+a.length,0);
              return (
                <div key={cat}>
                  <div onClick={()=>toggleCat(cat)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",cursor:"pointer",background:"#f8fafc",borderBottom:`1px solid ${T.border}`,userSelect:"none"}}>
                    <span style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{cat}</span>
                    <span style={{color:T.textMuted,fontSize:11}}>{catCollapsed?"▶":"▼"} {catCount}</span>
                  </div>
                  {!catCollapsed && Object.entries(subs).map(([sub, items]) => {
                    const subKey = `${cat}::${sub}`;
                    const subCollapsed = collapsedSubs[subKey];
                    return (
                      <div key={sub}>
                        <div onClick={()=>toggleSub(subKey)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 20px 7px 32px",cursor:"pointer",background:"#f8fafc",borderBottom:`1px solid ${T.border}`,userSelect:"none"}}>
                          <span style={{...SANS,fontSize:10,fontWeight:600,color:T.textMuted}}>{sub}</span>
                          <span style={{color:T.textMuted,fontSize:10}}>{subCollapsed?"▶":"▼"} {items.length}</span>
                        </div>
                        {!subCollapsed && items.map(calc => {
                          const isActive = activeCalcId === calc.id;
                          const isFlash = justAdded === calc.id;
                          return (
                            <div key={calc.id} onClick={()=>{setActiveCalcId(calc.id);setIsEditing(false);setHasOverride(false);}} style={{padding:"9px 20px 9px 40px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:isFlash?"#f0fdf4":isActive?"#eff6ff":T.cardBg,borderLeft:`3px solid ${isActive?T.actionBase:"transparent"}`,transition:"background 0.2s"}}>
                              <div style={{...SANS,fontSize:12,fontWeight:600,color:isActive?T.actionBase:T.textPrimary,marginBottom:2}}>{calc.name}</div>
                              <div style={{...MONO,fontSize:9,color:T.textMuted}}>{calc.varKey?`{{${calc.varKey}}}`:" "}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div style={{flexShrink:0,padding:"12px 16px",borderTop:`1px solid ${T.border}`,background:"#f8fafc"}}>
          <button onClick={()=>setShowAddModal(true)} style={{...SANS,width:"100%",padding:"9px",borderRadius:7,border:`1px dashed ${T.actionBase}`,background:"transparent",color:T.actionBase,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center"}}>+ New Formula</button>
        </div>
      </div>

      {/* Right pane */}
      <div style={{flex:1,overflowY:"auto",padding:"24px 32px"}}>
        {activeCalc && (
          <div className="fade-in">
            {justAdded === activeCalc.id && (
              <div style={{marginBottom:20,padding:"12px 16px",borderRadius:8,background:"#f0fdf4",border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16,color:T.okBase}}>✓</span>
                <span style={{...SANS,fontSize:13,fontWeight:600,color:T.okBase}}>Formula added! Use <span style={{...MONO}}>{`{{${activeCalc.varKey||activeCalc.id}}}`}</span> in the Footnote Editor to bind this value.</span>
              </div>
            )}

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`}}>GLOBAL TEMPLATE</span>
                  {activeCalc.varKey && <span style={{...MONO,fontSize:11,padding:"3px 8px",borderRadius:4,background:T.appBg,color:T.actionBase,border:`1px solid ${T.border}`}}>{`{{${activeCalc.varKey}}}`}</span>}
                  <span style={{...MONO,fontSize:11,color:T.textMuted}}>ID: {activeCalc.id}</span>
                </div>
                <div style={{...SANS,fontSize:22,fontWeight:700,color:T.textPrimary}}>{activeCalc.name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Cross-Fund Sync Status</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:T.okBase,fontSize:14}}>●</span><span style={{...MONO,fontSize:13,fontWeight:700,color:T.textPrimary}}>{activeCalc.syncedFunds}</span><span style={{...SANS,fontSize:11,color:T.textMuted}}>Synced</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:activeCalc.outOfSync>0?T.errorBase:T.textMuted,fontSize:14}}>●</span><span style={{...MONO,fontSize:13,fontWeight:700,color:T.textPrimary}}>{activeCalc.outOfSync}</span><span style={{...SANS,fontSize:11,color:T.textMuted}}>Overrides</span></div>
                </div>
              </div>
            </div>

            {/* Formula Builder */}
            <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:24,boxShadow:"0 2px 10px rgba(0,0,0,0.02)"}}>
              <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
                <div style={{...SANS,fontSize:13,fontWeight:700,color:T.textPrimary}}>Calculation Logic</div>
                {!isEditing
                  ? <button onClick={()=>{setDraftFormula(activeCalc.formula);setIsEditing(true);}} style={{...SANS,fontSize:11,fontWeight:600,color:T.actionBase,background:"none",border:"none",cursor:"pointer"}}>✎ Edit Formula</button>
                  : <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button onClick={()=>setIsEditing(false)} style={{...SANS,fontSize:11,fontWeight:600,color:T.textMuted,background:"none",border:"none",cursor:"pointer",padding:"4px 0"}}>Cancel</button>
                      <button onClick={handleSaveFormula} style={{...SANS,fontSize:11,fontWeight:700,padding:"5px 14px",borderRadius:5,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer"}}>Save Formula</button>
                    </div>
                }
              </div>
              <div style={{padding:20}}>
                {isEditing ? (
                  <div>
                    <textarea value={draftFormula} onChange={e=>setDraftFormula(e.target.value)} style={{...MONO,width:"100%",padding:"16px",borderRadius:8,border:`1px solid ${T.actionBase}`,fontSize:14,minHeight:100,background:"#f8fafc",boxSizing:"border-box"}} />
                    <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:8}}>Use <span style={{...MONO,background:"#e2e8f0",padding:"2px 4px",borderRadius:3}}>[Variable_Name]</span> syntax.</div>
                  </div>
                ) : renderFormula(activeCalc.formula)}

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:`1px dashed ${T.border}`}}>
                  <div style={{...SANS,fontSize:12,color:T.textMuted}}>Live Preview for <strong>{fund.name}</strong></div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Calculated Result =</span>
                    <span style={{...MONO,fontSize:18,fontWeight:700,color:hasOverride?T.warnBase:T.okBase,background:hasOverride?T.warnBg:T.okBg,padding:"4px 12px",borderRadius:6,border:`1px solid ${hasOverride?T.warnBorder:T.okBorder}`}}>
                      {hasOverride ? overrideValue : (activeCalc.unit==="$" ? fmtUSD(activeCalc.liveValue||0) : `${activeCalc.liveValue||0}${activeCalc.unit||""}`)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fund-Level Override */}
            <div style={{background:hasOverride?T.warnBg:T.cardBg,border:`1px solid ${hasOverride?T.warnBorder:T.border}`,borderRadius:10,overflow:"hidden",marginBottom:24,transition:"all 0.2s"}}>
              <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{...SANS,fontSize:14,fontWeight:700,color:hasOverride?T.warnBase:T.textPrimary,display:"flex",alignItems:"center",gap:8}}>
                    <span>{hasOverride?"⚠":"🔗"}</span> Fund-Level Override
                  </div>
                  <div style={{...SANS,fontSize:12,color:T.textMuted,marginTop:4}}>Sever the link to the global template and apply a static manual value for this fund only.</div>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <span style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary}}>Override Active</span>
                  <input type="checkbox" checked={hasOverride} onChange={e=>setHasOverride(e.target.checked)} style={{accentColor:T.warnBase,width:16,height:16}} />
                </label>
              </div>
              {hasOverride && (
                <div className="slide-in" style={{padding:"0 20px 20px",display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <FieldLabel>Static Override Value</FieldLabel>
                    <input type="text" value={overrideValue} onChange={e=>setOverrideValue(e.target.value)} style={{...MONO,width:"100%",padding:"10px 14px",borderRadius:6,border:`1px solid ${T.warnBorder}`,fontSize:14,background:"#fff",boxSizing:"border-box"}} />
                  </div>
                  <div style={{flex:2,minWidth:300}}>
                    <FieldLabel>Justification / Supporting File</FieldLabel>
                    <input type="text" placeholder="e.g., Refer to Side Letter A for fee waiver..." style={{...SANS,width:"100%",padding:"10px 14px",borderRadius:6,border:`1px solid ${T.warnBorder}`,fontSize:13,background:"#fff",boxSizing:"border-box"}} />
                  </div>
                  <div style={{width:"100%",marginTop:8,...MONO,fontSize:10,color:T.warnBase,background:"#fff",padding:"8px",borderRadius:4,border:`1px dashed ${T.warnBorder}`}}>
                    AUDIT LOG: Override enacted by Sarah Chen (u1) on Dec 31, 2024 at 10:45 AM. Justification recorded.
                  </div>
                </div>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:24}}>
              {/* Downstream Lineage */}
              <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.02)"}}>
                <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,background:"#f8fafc",...SANS,fontSize:13,fontWeight:700,color:T.textPrimary}}>Downstream Data Lineage</div>
                <div style={{padding:20}}>
                  <div style={{...SANS,fontSize:12,color:T.textMuted,marginBottom:16}}>This calculation dynamically feeds the following deliverables.</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:activeCalc.varKey?16:0}}>
                    {(activeCalc.feeds||[]).map(f=>(
                      <span key={f} style={{...SANS,fontSize:11,fontWeight:600,padding:"6px 12px",borderRadius:20,background:T.appBg,border:`1px solid ${T.border}`,color:T.textPrimary,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:T.actionBase}}>↳</span> {f}
                      </span>
                    ))}
                  </div>
                  {activeCalc.varKey && (
                    <div style={{padding:"10px 12px",borderRadius:6,background:T.appBg,border:`1px solid ${T.border}`}}>
                      <div style={{...SANS,fontSize:11,fontWeight:600,color:T.textMuted,marginBottom:6}}>Use in Footnote Editor →</div>
                      <span style={{...MONO,fontSize:12,color:T.actionBase}}>{`{{${activeCalc.varKey}}}`}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="slide-in" style={{marginTop:24,padding:"20px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{...SANS,fontSize:14,fontWeight:700,color:T.textPrimary}}>Deploy Global Updates</div>
                  <div style={{...SANS,fontSize:12,color:T.textMuted,marginTop:4}}>Push formula changes to {activeCalc.syncedFunds} actively synced funds.</div>
                </div>
                <button disabled={deploying} onClick={handleDeploy} style={{...SANS,fontSize:13,fontWeight:700,padding:"10px 24px",borderRadius:6,border:"none",background:deploying?"#94a3b8":T.actionBase,color:"#fff",cursor:deploying?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,transition:"background 0.2s"}}>
                  {deploying ? <><span style={{animation:"pulse 0.8s infinite"}}>●</span> Synchronizing...</> : <><span>🌍</span> Deploy to {activeCalc.syncedFunds} Funds</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

