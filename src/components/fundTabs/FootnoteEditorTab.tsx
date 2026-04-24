import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { AI_FOOTNOTES } from '../../data/aiData';
import { WORKPAPER_TEMPLATES } from '../../data/workpapers';
import { FieldLabel } from '../primitives/Card';
import { fmtUSD } from '../../utils/formatters';
import type { FundSeed, WorkpaperTemplate } from '../../types';

export function FootnoteEditorTab({ fund, FS_DYNAMIC = null, templates = WORKPAPER_TEMPLATES }: { fund?: any; FS_DYNAMIC?: any; templates?: any[] }) {
  const [footnotes,setFootnotes]=useState(AI_FOOTNOTES);
  const [activeId,setActiveId]=useState("fn-1");
  const [editContent,setEditContent]=useState({});
  const [saved,setSaved]=useState({});
  const [previewMode, setPreviewMode] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Record<string,boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string|null>(null);

  const BUILTIN_VARS = [
    { varKey:"FUND_NAME",            label:"Fund Name",              value: fund?.name || "[Fund Name]" },
    { varKey:"PERIOD_END",           label:"Period End",             value: "December 31, 2024" },
    { varKey:"NET_ASSETS",           label:"Net Assets",             value: fmtUSD(FS_DYNAMIC?.net_assets || 0) },
    { varKey:"TOTAL_INVESTMENTS",    label:"Total Investments",      value: fmtUSD(FS_DYNAMIC?.investments_at_value || 0) },
    { varKey:"ADVISORY_FEE_EXPENSE", label:"Advisory Fee Expense",   value: fmtUSD(FS_DYNAMIC?.advisory_fees || 0) },
  ];

  const allVars = useMemo(() => [
    ...BUILTIN_VARS,
    ...templates
      .filter(t => t.varKey)
      .map(t => ({
        varKey: t.varKey,
        label: t.name,
        value: t.unit === "$"
          ? fmtUSD(t.liveValue)
          : t.unit === "%"
          ? `${t.liveValue}%`
          : `${t.liveValue} ${t.unit}`,
        category: t.category,
      })),
  ], [templates]);

  const resolved = useMemo(() => {
    const m: Record<string,string> = {};
    allVars.forEach(v => { m[v.varKey] = v.value; });
    return m;
  }, [allVars]);

  const active = footnotes.find(f => f.id === activeId);
  const currentText = editContent[activeId] ?? active?.content ?? "";

  const parsedContent = useMemo(() => {
    let t = currentText;
    Object.entries(resolved).forEach(([k, v]) => {
      t = t.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    });
    return t;
  }, [currentText, resolved]);

  const groupedVars = useMemo(() => {
    const groups: Record<string, typeof allVars> = { "Core Fund Data": BUILTIN_VARS };
    allVars.filter(v => (v as any).category).forEach(v => {
      const cat = (v as any).category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    });
    return groups;
  }, [allVars]);

  const navGroups = useMemo(() => {
    const g: Record<string, typeof footnotes> = {};
    const list = search.trim()
      ? footnotes.filter(f => f.title.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()))
      : footnotes;
    list.forEach(fn => {
      if (!g[fn.category]) g[fn.category] = [];
      g[fn.category].push(fn);
    });
    return g;
  }, [footnotes, search]);

  const handleSave = (id: string) => {
    setFootnotes(prev => prev.map(f => f.id===id ? {...f, content: editContent[id]||f.content, aiDrafted:false, lastEdited:`Edited · System User · Just now`} : f));
    setSaved(p => ({...p, [id]:true}));
    setTimeout(() => setSaved(p => ({...p, [id]:false})), 2000);
  };

  const insertVariable = (varKey: string) => {
    if (previewMode) setPreviewMode(false);
    setEditContent(p => ({...p, [activeId]: `${currentText} {{${varKey}}}`}));
  };

  const toggleCat = (cat: string) => setCollapsedCats(p => ({...p, [cat]: !p[cat]}));

  function AddFootnoteModal() {
    const [title, setTitle] = useState("");
    const [categorySelect, setCategorySelect] = useState("Significant Accounting Policies");
    const [customCategory, setCustomCategory] = useState("");
    const [content, setContent] = useState("");
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const category = categorySelect === "__new__" ? customCategory : categorySelect;

    const insertVarInModal = (varKey: string) => {
      const ta = textareaRef.current;
      if (!ta) { setContent(c => `${c} {{${varKey}}}`); return; }
      const s = ta.selectionStart, e = ta.selectionEnd;
      const token = `{{${varKey}}}`;
      setContent(c => c.slice(0, s) + token + c.slice(e));
      setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + token.length; }, 0);
    };

    const handleCreate = () => {
      if (!title.trim() || !content.trim() || !category.trim()) return;
      const id = `fn-${Date.now()}`;
      const newFn = { id, title: title.trim(), category, aiDrafted: false, varBindings: [], content: content.trim(), lastEdited: "Just now", wordCount: content.trim().split(/\s+/).length };
      setFootnotes(prev => [...prev, newFn]);
      setActiveId(id);
      setJustAddedId(id);
      setTimeout(() => setJustAddedId(null), 3500);
      setShowAddModal(false);
    };

    const cats = Array.from(new Set(AI_FOOTNOTES.map(f => f.category)));
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const canCreate = title.trim() && content.trim() && category.trim();

    return (
      <div style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAddModal(false)}>
        <div style={{background:T.cardBg,borderRadius:12,width:820,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{...SANS,fontWeight:700,fontSize:16}}>Add Footnote</div>
            <button onClick={()=>setShowAddModal(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:T.textMuted}}>✕</button>
          </div>
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>
            <div style={{flex:1,padding:"24px",overflowY:"auto",display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div>
                  <FieldLabel required>Title</FieldLabel>
                  <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Subsequent Events" style={{...SANS,width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <FieldLabel required>Category</FieldLabel>
                  <select value={categorySelect} onChange={e=>setCategorySelect(e.target.value)} style={{...SANS,width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,outline:"none",background:T.cardBg}}>
                    {cats.map(c=><option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ New Category...</option>
                  </select>
                  {categorySelect === "__new__" && (
                    <input value={customCategory} onChange={e=>setCustomCategory(e.target.value)} placeholder="Category name" style={{...SANS,width:"100%",padding:"7px 12px",borderRadius:6,border:`1px solid ${T.actionBase}`,fontSize:13,outline:"none",marginTop:6,boxSizing:"border-box"}} />
                  )}
                </div>
              </div>
              <div>
                <FieldLabel required>Content</FieldLabel>
                <textarea ref={textareaRef} value={content} onChange={e=>setContent(e.target.value)} rows={10} placeholder="Write your footnote content here. Use the variable picker on the right to insert live data bindings." style={{...MONO,width:"100%",padding:"12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:12,lineHeight:1.6,minHeight:220,resize:"vertical",outline:"none",boxSizing:"border-box"}} />
                <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:4}}>{wordCount} word{wordCount!==1?"s":""}</div>
              </div>
            </div>
            <div style={{width:260,borderLeft:`1px solid ${T.border}`,background:T.appBg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"16px",borderBottom:`1px solid ${T.border}`}}>
                <div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Variable Picker</div>
                <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:4}}>Click to insert at cursor</div>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"12px"}}>
                {Object.entries(groupedVars).map(([grp,vars])=>(
                  <div key={grp} style={{marginBottom:12}}>
                    <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{grp}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {vars.map(v=>(
                        <button key={v.varKey} onClick={()=>insertVarInModal(v.varKey)} style={{...MONO,textAlign:"left",fontSize:10,padding:"6px 8px",background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:5,color:T.actionBase,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                          {`{{${v.varKey}}}`}
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
            <button onClick={handleCreate} disabled={!canCreate} style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 18px",borderRadius:6,border:"none",background:canCreate?T.actionBase:T.border,color:canCreate?"#fff":T.textMuted,cursor:canCreate?"pointer":"not-allowed"}}>Create Footnote</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",height:"100%"}}>
      {showAddModal && <AddFootnoteModal />}

      {/* Left nav */}
      <aside style={{width:280,borderRight:`1px solid ${T.border}`,background:T.cardBg,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{...SANS,fontWeight:700,fontSize:13,color:T.textPrimary,marginBottom:10}}>Footnotes</div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:13}}>⌕</span>
            <input type="text" placeholder="Search footnotes..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS,width:"100%",padding:"6px 12px 6px 30px",borderRadius:6,border:`1px solid ${T.border}`,background:T.appBg,color:T.textPrimary,fontSize:12,outline:"none",boxSizing:"border-box"}} />
          </div>
        </div>

        <div style={{overflowY:"auto",flex:1}}>
          {Object.entries(navGroups).length === 0 ? (
            <div style={{padding:"30px 20px",textAlign:"center",color:T.textMuted,...SANS,fontSize:13}}>No footnotes match "{search}"</div>
          ) : (
            Object.entries(navGroups).map(([cat, fns]) => {
              const collapsed = collapsedCats[cat];
              return (
                <div key={cat}>
                  <div onClick={()=>toggleCat(cat)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",cursor:"pointer",background:"#f8fafc",borderBottom:`1px solid ${T.border}`}}>
                    <span style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{cat}</span>
                    <span style={{color:T.textMuted,fontSize:11}}>{collapsed?"▶":"▼"} {fns.length}</span>
                  </div>
                  {!collapsed && fns.map(fn => {
                    const isActive = activeId === fn.id;
                    const isFlash = justAddedId === fn.id;
                    return (
                      <div key={fn.id} onClick={()=>setActiveId(fn.id)} style={{padding:"10px 20px 10px 28px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:isFlash?"#f0fdf4":isActive?"#eff6ff":T.cardBg,borderLeft:`3px solid ${isActive?T.actionBase:"transparent"}`,transition:"background 0.2s"}}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}}>
                          <div style={{flex:1}}>
                            <div style={{...SANS,fontWeight:600,fontSize:12,color:isActive?T.actionBase:T.textPrimary,marginBottom:2}}>{fn.title}</div>
                            <div style={{...SANS,fontSize:10,color:T.textMuted}}>{fn.lastEdited}</div>
                          </div>
                          {fn.aiDrafted
                            ? <span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 5px",borderRadius:4,background:T.aiBg,color:T.aiBase,flexShrink:0}}>✦ AI</span>
                            : <span style={{...SANS,fontSize:9,fontWeight:700,padding:"2px 5px",borderRadius:4,background:T.warnBg,color:T.warnBase,flexShrink:0}}>EDITED</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div style={{flexShrink:0,padding:"12px 16px",borderTop:`1px solid ${T.border}`,background:"#f8fafc"}}>
          <button onClick={()=>setShowAddModal(true)} style={{...SANS,width:"100%",padding:"9px",borderRadius:7,border:`1px dashed ${T.actionBase}`,background:"transparent",color:T.actionBase,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center"}}>+ Add Footnote</button>
        </div>
      </aside>

      {/* Right pane */}
      {active && (
        <div style={{flex:1,overflowY:"auto",background:T.appBg,display:"flex",flexDirection:"column"}}>
          <div style={{background:T.cardBg,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{...SANS,fontWeight:700,fontSize:16}}>{active.title}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                <span style={{...SANS,fontSize:11,color:T.textMuted}}>{active.category}</span><span>·</span>
                {active.aiDrafted
                  ? <span style={{...MONO,fontSize:10,fontWeight:700,color:T.aiBase}}>✦ AI-Drafted</span>
                  : <span style={{...SANS,fontSize:10,fontWeight:600,color:T.okBase}}>✓ Human Reviewed</span>}
                <span>·</span><span style={{...SANS,fontSize:11,color:T.textMuted}}>{active.lastEdited}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{display:"flex",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:6,padding:3,gap:2}}>
                <button onClick={()=>setPreviewMode(false)} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:4,border:"none",background:!previewMode?T.cardBg:"transparent",color:!previewMode?T.textPrimary:T.textMuted,cursor:"pointer",boxShadow:!previewMode?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>✎ Edit Template</button>
                <button onClick={()=>setPreviewMode(true)} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:4,border:"none",background:previewMode?T.cardBg:"transparent",color:previewMode?T.textPrimary:T.textMuted,cursor:"pointer",boxShadow:previewMode?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>👁 Live Preview</button>
              </div>
              {saved[activeId] && <span style={{...SANS,fontSize:12,color:T.okBase,fontWeight:600}}>✓ Saved</span>}
              <button onClick={()=>handleSave(activeId)} style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer"}}>Save Template</button>
            </div>
          </div>

          <div style={{display:"flex",flex:1,overflow:"hidden"}}>
            <div style={{flex:1,padding:"24px 32px",overflowY:"auto"}}>
              {previewMode ? (
                <div>
                  <div style={{...SANS,fontWeight:700,fontSize:18,marginBottom:16}}>{active.title}</div>
                  <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"32px",fontSize:14,lineHeight:1.8,color:"#000",fontFamily:"Georgia, 'Times New Roman', serif",boxShadow:"0 4px 6px rgba(0,0,0,0.02)",minHeight:400,whiteSpace:"pre-wrap"}}>{parsedContent}</div>
                </div>
              ) : (
                <textarea
                  value={currentText}
                  onChange={e=>setEditContent(p=>({...p,[activeId]:e.target.value}))}
                  className="wysiwyg-body"
                  style={{...MONO,width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"24px",fontSize:13,lineHeight:1.6,minHeight:400,background:"#f8fafc",boxSizing:"border-box"}}
                />
              )}
            </div>

            {!previewMode && (
              <div style={{width:240,background:T.cardBg,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
                  <div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Dynamic Variables</div>
                  <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:4}}>Click to insert at cursor</div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"12px"}}>
                  {Object.entries(groupedVars).map(([grp,vars])=>(
                    <div key={grp} style={{marginBottom:14}}>
                      <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{grp}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {vars.map(v=>(
                          <button key={v.varKey} onClick={()=>insertVariable(v.varKey)} style={{...MONO,textAlign:"left",fontSize:11,padding:"7px 10px",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:6,color:T.actionBase,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                            {`{{${v.varKey}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

