import React, { useState, useMemo, useRef, useEffect } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { FUNDS_SEED } from '../../data/funds';
import { Avatar } from '../primitives/Avatar';
import type { TeamMember, FundSeed, Exception } from '../../types';

export function GlobalHeader({view, fund, currentUser, onToggleRole, onLogout, onGoToIngestion, onGoToFilings, onGoToEntities, onOpenAiSettings, onGoToDashboard, streak, notificationCount, fundState, fundSeeds}) {
  const [hubOpen, setHubOpen] = useState(false);
  const [excFlash, setExcFlash] = useState(false);
  const showDataFeedsBtn = view !== "login" && view !== "auditor_portal";

  const allExcs = useMemo(() => Object.values(fundState || {}).flat(), [fundState]);
  const fundsOpen = useMemo(() => (fundSeeds || []).filter(f => (fundState?.[f.fund_id] || []).some((e:any) => e.severity === 'error' && e.status === 'open')).length, [fundState, fundSeeds]);
  const exceptionsOpen = useMemo(() => (allExcs as any[]).filter(e => e.severity === 'error' && e.status === 'open').length, [allExcs]);
  const touchlessPct = useMemo(() => {
    const excs = allExcs as any[];
    if (!excs.length) return 0;
    const touchless = excs.filter(e => e.status === 'resolved' && (e.resolvedBy === 'u_ai' || e.resolution === 'acknowledge')).length;
    return Math.round(touchless / excs.length * 100);
  }, [allExcs]);

  const prevExcOpen = useRef(exceptionsOpen);
  useEffect(() => {
    if (prevExcOpen.current !== exceptionsOpen) {
      setExcFlash(true);
      const t = setTimeout(() => setExcFlash(false), 800);
      prevExcOpen.current = exceptionsOpen;
      return () => clearTimeout(t);
    }
  }, [exceptionsOpen]);

  const touchColor = touchlessPct >= 80 ? T.okBase : touchlessPct >= 60 ? T.warnBase : T.errorBase;
  const touchBg = touchlessPct >= 80 ? T.okBg : touchlessPct >= 60 ? T.warnBg : T.errorBg;
  const touchBd = touchlessPct >= 80 ? T.okBorder : touchlessPct >= 60 ? T.warnBorder : T.errorBorder;

  return (
    <header style={{background:T.navyHeader,color:"#fff",padding:"0 24px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200,boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {/** TODO: FIX bug, when the user clicks on Torrance they should be briught to their default dasboard  */}
        <div onClick={() => onGoToDashboard("dashboard")} style={{...SANS,fontWeight:700,fontSize:16,letterSpacing:"0.04em",cursor:"pointer"}}><span style={{color:T.actionBase}}>T</span>ORRANCE</div>
        <div style={{width:1,height:22,background:"rgba(255,255,255,0.15)"}}/>
        <div style={{...SANS,fontSize:12,color:"rgba(255,255,255,0.7)"}}>
          {view==="ingestion" && "Ingestion Status"}
          {view==="dashboard" && "Fund Dashboard"}
          {view==="inbox"     && "My Notifications"}
          {view==="filings"   && "Regulatory Filings"}
          {view==="entities"  && "Global Entity Setup"}
          {view==="data_exchange" && "Data Exchange Hub"}
          {view==="fund" && fund && <span style={{color:"#fff",fontWeight:600}}>{fund.name}</span> }
        </div>
        <div style={{ display:"flex", alignItems:"left"}}>
        <span style={{...SANS,fontSize:11,color:"rgba(255,255,255,0.8)",background:"rgba(0,0,0,0.2)",padding:"4px 12px",borderRadius:4, border:"1px solid rgba(255,255,255,0.1)", letterSpacing:"0.02em"}}>
          IT8 — The Shining
        </span>
      </div>
      </div>

      {/* KPI ticker chips 
      {fundState && (
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.85)",border:"1px solid rgba(255,255,255,0.12)",whiteSpace:"nowrap"}}>
            {fundsOpen} Fund{fundsOpen!==1?"s":""} Open
          </div>
          <div className={excFlash ? "flash-yellow" : ""} style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,background:exceptionsOpen>0?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.08)",color:exceptionsOpen>0?T.warnBase:"rgba(255,255,255,0.6)",border:`1px solid ${exceptionsOpen>0?T.warnBorder:"rgba(255,255,255,0.1)"}`,whiteSpace:"nowrap",transition:"background 0.3s,color 0.3s"}}>
            {exceptionsOpen} Exception{exceptionsOpen!==1?"s":""}
          </div>
          <div style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,background:touchBg,color:touchColor,border:`1px solid ${touchBd}`,whiteSpace:"nowrap"}}>
            {touchlessPct}% Touchless
          </div>
        </div>
      )}*/}

      <div style={{display:"flex",alignItems:"center",gap:10}}>
      <button onClick={() => onGoToDashboard("dashboard")} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 12px",height:26,borderRadius:6,cursor:"pointer",background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:6,marginRight:4,transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
              Dashboard
            </button>

        {/* RADIAL DATA HUB MENU (FIXED: Removed onMouseLeave, added invisible click-away overlay) */}
        {showDataFeedsBtn && (
          
          <div style={{position:"relative"}}>
            
            {/* Invisible overlay catches clicks outside the menu to close it */}
            {hubOpen && <div style={{position:"fixed", inset:0, zIndex:299}} onClick={() => setHubOpen(false)} />}
              {/** TODO: Add a button called dashboard before Daat Hub which brings user back to default dashboard view  */}
              <button onClick={() => setHubOpen(!hubOpen)} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 12px",height:26,borderRadius:6,cursor:"pointer",background:hubOpen?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:6,marginRight:4,transition:"all 0.2s", position:"relative", zIndex:300}}>
              Data Hub {hubOpen ? "▲" : "▼"}
            </button>
            
            {/* The Spiral / Radial Options */}
            <div style={{position:"absolute", top: 35, left: "50%", zIndex: 300, pointerEvents: hubOpen ? "auto" : "none"}}>
              
              {/* Option 1: Data Feeds (Left Down) */}
              <button onClick={() => { setHubOpen(false); onGoToIngestion(); }} 
                style={{position:"absolute", height:26,transform: hubOpen ? "translate(-120px, 0.5px)" : "translate(-50%, -20px) scale(0.5)", opacity: hubOpen ? 1 : 0, transition:"all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)", ...SANS, fontSize:12, fontWeight:600, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)", background:T.navyHeader, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                Ingestion
              </button>

              {/* Option 2: Data Exchange (Straight Down) */}
              <button onClick={() => { setHubOpen(false); onGoToDashboard("data_exchange"); }} 
                style={{position:"absolute", height:26,transform: hubOpen ? "translate(-50%, 5px)" : "translate(-50%, -20px) scale(0.5)", opacity: hubOpen ? 1 : 0, transition:"all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.05s", ...SANS, fontSize:12, fontWeight:600, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)", background:T.navyHeader, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                Exchange
              </button>

              {/* Option 3: Data Architecture (Right Down) */}
              <button onClick={() => { setHubOpen(false); onGoToDashboard("data_architecture"); }} 
                style={{position:"absolute", height:26,transform: hubOpen ? "translate(50px, 0.5px)" : "translate(-50%, -20px) scale(0.5)", opacity: hubOpen ? 1 : 0, transition:"all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s", ...SANS, fontSize:12, fontWeight:600, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)", background:T.navyHeader, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                Pipeline
              </button>
            </div>
          </div>
        )}

  <button onClick={onGoToFilings} style={{...SANS,fontSize:12,fontWeight:600,padding:"5px 12px",height:26,borderRadius:6,cursor:"pointer",background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:6,marginRight:8,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
          Filings
        </button>
        <button onClick={onGoToEntities} style={{...SANS,fontSize:12,fontWeight:600,padding:"5px 12px",height:26,borderRadius:6,cursor:"pointer",background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:6,marginRight:8,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
          Entities
        </button>
        <span style={{...MONO,fontSize:12,fontWeight:600,padding:"0 10px",height:26,borderRadius:6,background:T.aiBase,color:"#fff",display:"flex",alignItems:"center",gap:6,marginRight:8,boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
          <span>✦</span>AI Active
        </span>
        {currentUser.isController&&(
          <button onClick={onOpenAiSettings} style={{...SANS,fontSize:11,fontWeight:600,padding:"4px 10px",height:26,borderRadius:6,cursor:"pointer",background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`,display:"flex",alignItems:"center",gap:5,marginRight:4}}>
            <span>✦</span>AI Settings
          </button>
        )}
        <button onClick={onToggleRole} title="Toggle role (demo)" style={{...SANS,fontSize:12,fontWeight:600,padding:"0 8px",height:26,borderRadius:6,cursor:"pointer",background:currentUser.isController?T.controllerBg:T.preparerBg,color:currentUser.isController?T.controllerAccent:T.preparerAccent,border:`1px solid ${currentUser.isController?T.controllerBd:T.preparerBd}`,display:"flex",alignItems:"center",gap:6}}>
          <Avatar user={currentUser} size={20}/>{currentUser.name} · {currentUser.isController?"Controller":"Preparer"}<span style={{fontSize:10,opacity:0.7,marginLeft:4}}>⇄</span>
        </button>
        {/** TODO: Fix Bug: When the user clicks on the bell icon they should be brough to their indox  */}
        <button onClick={() => onGoToDashboard("inbox")} style={{position:"relative", background:"none", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:18, marginRight:8, transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}>
          🔔
          {notificationCount > 0 && (
            <span style={{position:"absolute", top:-4, right:-6, background:T.errorBase, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:10, border:"2px solid #0f172a", lineHeight:1}}>
              {notificationCount}
            </span>
          )}
        </button>
        <button onClick={onLogout} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",marginLeft:8,fontSize:13,fontWeight:600,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
