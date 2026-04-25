import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { FundSeed, Exception, ApprovalRecord, Filing, IngestionFeed } from "./types";

// Theme
import { T, SANS } from "./theme/tokens";

// Data
import { TEAM } from "./data/team";
import { FUNDS_SEED, INITIAL_APPROVAL_STATE } from "./data/funds";
import { FUND_EXCEPTIONS } from "./data/exceptions";
import { BEVERLEY_FILINGS } from "./data/filings";
import { INGESTION_FEEDS } from "./data/feeds/gl";
import { TB_ROWS } from "./data/feeds/gl";
import { HOLDINGS } from "./data/feeds/holdings";
import { CAPITAL_ACTIVITY } from "./data/feeds/capitalActivity";
import { PR_001_SEED } from "./data/feeds/priceRef";
import { FX_001_SEED } from "./data/feeds/fxRates";
import { CP_001_SEED } from "./data/feeds/counterparties";
import { TA_001_SEED } from "./data/feeds/transferAgent";
import { DR_001_SEED } from "./data/feeds/derivatives";
import { LP_001_SEED } from "./data/feeds/limitedPartners";
import { TX_001_SEED } from "./data/feeds/tax";
import { RE_001_SEED } from "./data/feeds/realEstate";
import { OC_001_SEED } from "./data/feeds/operatingCompanies";

// Primitives
import { StyleInjector } from "./components/primitives/StyleInjector";

// AI
import { AILearningToast } from "./components/ai/AILearningToast";
import { AiParameterTuning } from "./components/ai/AiParameterTuning";

// Layout
import { GlobalHeader } from "./components/layout/GlobalHeader";

// Views
import { LoginScreen } from "./components/views/LoginScreen";
import { AuditorPortal } from "./components/views/AuditorPortal";
import { AiDataMappingScreen } from "./components/views/AiDataMappingScreen";
import { Dashboard } from "./components/views/Dashboard";
import { FundView } from "./components/views/FundView";
import { IngestionStatusWidget } from "./components/views/IngestionStatusWidget";
import { BeverleyFilingTracker } from "./components/views/BeverleyFilingTracker";
import { GlobalAuditLogView } from "./components/views/GlobalAuditLogView";
import { GlobalEntityManager } from "./components/views/GlobalEntityManager";
import { IntegrationsAndArchitectureHub } from "./components/views/IntegrationsAndArchitectureHub";
import { DataExchangeView } from "./components/views/DataExchangeView";
import { SchemaRegistryView } from "./components/views/SchemaRegistryView";
import { SchemaStudioView } from "./components/views/SchemaStudioView";

export default function App() {
  const [view, setView] = useState("login");
  const [selectedFund, setSelectedFund] = useState<FundSeed | null>(null);
  const [showAIToast, setShowAIToast] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [fundState, setFundState] = useState<Record<string, Exception[]>>(()=>{
    const s: Record<string, Exception[]> = {};
    Object.entries(FUND_EXCEPTIONS).forEach(([id, excs]) => { s[id] = [...excs]; });
    return s;
  });
  const [approvalState, setApprovalState] = useState<Record<string, ApprovalRecord>>(INITIAL_APPROVAL_STATE);
  const [fundSeeds, setFundSeeds] = useState<FundSeed[]>(FUNDS_SEED);
  const [mappingSession, setMappingSession] = useState<any>(null);
  const [feeds, setFeeds] = useState<IngestionFeed[]>(INGESTION_FEEDS);
  const [streak, setStreak] = useState(12);
  const [activeSchema, setActiveSchema] = useState<string | null>(null);

  const [filings, setFilings] = useState<Filing[]>(BEVERLEY_FILINGS);

  const [masterFeeds, setMasterFeeds] = useState<Record<string, any[]>>({
    gl_001: TB_ROWS,
    hd_001: HOLDINGS,
    ca_001: CAPITAL_ACTIVITY,
    pr_001: PR_001_SEED,
    fx_001: FX_001_SEED,
    cp_001: CP_001_SEED,
    ta_001: TA_001_SEED,
    dr_001: DR_001_SEED,
    lp_001: LP_001_SEED,
    tx_001: TX_001_SEED,
    re_001: RE_001_SEED,
    oc_001: OC_001_SEED
  });

  // STP AUTOMATION: Unblock Filings when Exceptions Clear
  useEffect(() => {
    setFilings(prevFilings => prevFilings.map(filing => {
      const fundExcs = fundState[filing.fund_id] || [];
      const hasBlocking = fundExcs.some(e => e.severity === "error" && e.status === "open");
      if (!hasBlocking && filing.status === "blocked") {
        return { ...filing, status: "ready", notes: "Exceptions cleared. STP Validation Passed." };
      }
      return filing;
    }));
  }, [fundState]);

  // STP AUTOMATION: Inline Editing Clears Exceptions
  const handleUpdateFeedRecord = (feedId: string, recordId: any, field: string, newValue: any) => {
    setMasterFeeds(prev => ({
      ...prev,
      [feedId]: prev[feedId].map(record => {
        if ((record.id && record.id === recordId) || (record.cusip && record.cusip === recordId) || (record.acct && record.acct === recordId)) {
          return { ...record, [field]: newValue };
        }
        return record;
      })
    }));

    if ((field === "cusip" || field === "lei") && newValue) {
      setFundState(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(fid => {
          next[fid] = next[fid].map(e =>
            ((e.title.includes("CUSIP") || e.title.includes("LEI")) && e.status === "open")
              ? { ...e, status: "resolved" as const, resolution: "corrected_source", resolvedBy: "system", thread: [...e.thread, {id:`t${Date.now()}`, userId:"system", text:`Auto-resolved via inline data grid correction.`, ts:"Just now"}]}
              : e
          );
        });
        return next;
      });
      setStreak(s => s + 1);
    }
  };

  const getStats = useCallback((fund: FundSeed) => {
    const excs = fundState[fund.fund_id] || [];
    return {
      total: excs.length,
      resolved: excs.filter(e => e.status === "resolved").length,
      errors: excs.filter(e => e.severity === "error" && e.status === "open").length,
      warnings: excs.filter(e => e.severity === "warning" && e.status === "open").length,
      status: excs.filter(e => e.severity === "error" && e.status === "open").length === 0 ? "READY" : "BLOCKED"
    };
  }, [fundState]);

  const blockedFundsList = useMemo(() => fundSeeds.filter(f => getStats(f).status === "BLOCKED"), [fundSeeds, getStats]);

  const currentUser = TEAM.find(m=>m.id===currentUserId) || TEAM[0];
  const [dashSubView, setDashSubView] = useState<string | null>(null);
  const [showGlobalExcs, setShowGlobalExcs] = useState(false);

  const [fxOverrideActive, setFxOverrideActive] = useState(false);

  const [demoKey, setDemoKey] = useState(0);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoActiveExcId, setDemoActiveExcId] = useState<string | null>(null);
  const [demoTypingText, setDemoTypingText] = useState("");
  const [demoShouldSubmit, setDemoShouldSubmit] = useState(false);
  const [demoToast, setDemoToast] = useState<string | null>(null);
  const demoRunningRef = useRef(false);

  const handleGoToDashboard = (target = "dashboard") => {
    setSelectedFund(null);
    if (target === "inbox") {
      setDashSubView("inbox");
      setView("dashboard");
    } else if (target === "dashboard") {
      setDashSubView(null);
      setView("dashboard");
    } else {
      setView(target);
    }
  };
  const handleGoToFilings   = () => { setSelectedFund(null); setView("filings"); };
  const handleGoToEntities  = () => { setSelectedFund(null); setView("entities"); };

  // Dynamic Notification Engine
  const notifications = useMemo(() => {
    const notifs: any[] = [];
    if (!currentUser) return notifs;

    if (currentUser.isController) {
      fundSeeds.forEach(f => {
        const approv = approvalState[f.fund_id];
        if (approv?.status === "review_pending") {
          notifs.push({ id: `rev-${f.fund_id}`, type: "review", fund: f, title: "Review Required", message: `${f.name} was submitted for your sign-off.`, time: approv.submittedAt || "Just now", icon: "✓", color: T.okBase, bg: T.okBg });
        }
      });
    }

    Object.entries(fundState).forEach(([fid, excs]) => {
      const fund = fundSeeds.find(f => f.fund_id === fid);
      if (!fund) return;

      excs.forEach(exc => {
        if (exc.status === "open" && exc.assignee === currentUser.id) {
          notifs.push({ id: `ass-${exc.id}`, type: "assignment", fund, exc, title: "Task Assigned", message: `You were assigned to resolve: ${exc.title}`, time: "Recent", icon: "👤", color: T.actionBase, bg: T.actionBg });
        }

        if (exc.thread.length > 0) {
          const lastMsg = exc.thread[exc.thread.length - 1];
          const iParticipated = exc.thread.some(t => t.userId === currentUser.id);
          if (iParticipated && lastMsg.userId !== currentUser.id) {
            const sender = TEAM.find(m => m.id === lastMsg.userId)?.name || "Someone";
            notifs.push({ id: `msg-${exc.id}`, type: "message", fund, exc, title: "New Reply", message: `${sender}: "${lastMsg.text}"`, time: lastMsg.ts, icon: "💬", color: T.aiBase, bg: T.aiBg });
          }
        }
      });
    });

    return notifs.reverse();
  }, [fundState, approvalState, fundSeeds, currentUser]);

  const handleLogin = (uid: string, targetView: string) => {
    setCurrentUserId(uid);
    setView(targetView);
    if (uid === "u1" && targetView === "dashboard") setShowAIToast(true);
  };
  const handleLogout = () => { setCurrentUserId(null); setSelectedFund(null); setView("login"); };
  const handleGoToIngestion = () => { setSelectedFund(null); setView("ingestion"); };

  const handleGoToExceptions = (fundId: string) => {
    const targetFund = fundSeeds.find(f => f.fund_id === fundId);
    if (targetFund) { setSelectedFund(targetFund); setView("fund"); }
  };

  const handleViewClientExceptions = (clientName: string) => {
    setSelectedFund({
      fund_id: `CLIENT-${clientName}`,
      name: `${clientName} — Consolidated Exceptions`,
      client: clientName,
      series: "All Funds",
      period: "Dec 2024",
      net_assets: 0,
      prior_net_assets: 0,
      sla_days: 0,
      assignedTo: "",
      fundType: "",
      requiredFilings: []
    });
    setView("fund");
  };

  const handleMappingComplete = (feedId: string) => {
    setFeeds(prev => prev.map(f => f.id === feedId ? {...f, status: "success"} : f));
    setMappingSession(null);
  };

  const handleToggleRole = useCallback(()=>setCurrentUserId(prev=>prev==="u4"?"u1":"u4"),[]);

  const getExceptions = (fid: string): Exception[] => {
    if (!fid) return [];
    if (fid.startsWith("CLIENT-")) {
      const clientName = fid.replace("CLIENT-", "");
      const clientFunds = fundSeeds.filter(f => f.client === clientName);
      let allExcs: Exception[] = [];
      clientFunds.forEach(f => {
        const excs = fundState[f.fund_id] || [];
        const mapped = excs.map(e => ({ ...e, title: `[${f.name}] ${e.title}` }));
        allExcs = [...allExcs, ...mapped];
      });
      return allExcs;
    }
    return fundState[fid] || [];
  };

  const getRealFid = (prev: Record<string, Exception[]>, fid: string, excId: string): string => {
    if (fid.startsWith("CLIENT-")) return Object.keys(prev).find(k => prev[k].some(e => e.id === excId)) || fid;
    return fid;
  };

  const handleResolve = useCallback((fid: string, id: string, res: string, ov: string) => {
    setStreak(s=>s+1);
    if(id==='EXC-003' && res==='override_value') setFxOverrideActive(true);
    setFundState(prev=>{
      const realFid = getRealFid(prev, fid, id);
      if(!prev[realFid]) return prev;
      return {...prev,[realFid]:prev[realFid].map(e=>e.id===id?{...e,status:"resolved" as const,resolution:res,overrideValue:ov||"",resolvedBy:currentUserId}:e)}
    });
    if (res === "override_value" || res === "corrected_source") {
      const resolvedFid = getRealFid(fundState, fid, id);
      const exc = (fundState[resolvedFid] || []).find(e => e.id === id);
      if (exc) {
        const newJe = {
          id: `je-exc-${id}-${Date.now()}`,
          date: "2024-12-31",
          ref: `ADJ-${id}`,
          desc: `Auto-adjustment: ${exc.title}${ov ? ` — Override to ${ov}` : ""}`,
          status: "posted",
          mode: "exception_auto",
          lines: [
            { fundId: resolvedFid, acct: exc.account_number || "9999", name: exc.account_name || "", debit: exc.amount || 0, credit: 0 },
            { fundId: resolvedFid, acct: "1000", name: "Clearing / Offset", debit: 0, credit: exc.amount || 0 },
          ],
          createdBy: currentUserId,
          excRef: id,
          currentValue: exc.currentValue,
          expectedValue: exc.expectedValue,
          account_name: exc.account_name,
        };
        // dispatch event for JournalEntriesTab listener
        window.dispatchEvent(new CustomEvent("je-auto-posted", { detail: { fundId: resolvedFid, je: newJe } }));
      }
    }
  },[currentUserId, fundState]);

  const handleReopen=useCallback((fid: string, id: string)=>setFundState(prev=>{
    const realFid = getRealFid(prev, fid, id);
    if(!prev[realFid]) return prev;
    return {...prev,[realFid]:prev[realFid].map(e=>e.id===id?{...e,status:"open" as const,resolution:null,overrideValue:"",resolvedBy:null}:e)}
  }),[]);

  const handleUpdate=useCallback((fid: string, id: string, patch: Partial<Exception>)=>setFundState(prev=>{
    const realFid = getRealFid(prev, fid, id);
    if(!prev[realFid]) return prev;
    return {...prev,[realFid]:prev[realFid].map(e=>e.id===id?{...e,...patch}:e)}
  }),[]);

  const handleGlobalResolve=useCallback((excCode: string, res: string)=>{
    setStreak(s=>s+1);
    setFundState(prev=>{
      const next = {...prev};
      Object.keys(next).forEach(fid => {
        next[fid] = next[fid].map(e => (e.code === excCode && e.status === "open") ? { ...e, status: "resolved" as const, resolution: res, overrideValue: "", resolvedBy: currentUserId } : e);
      });
      return next;
    });
  },[currentUserId]);

  const handleAddThread=useCallback((fid: string, excId: string, text: string, userId?: string)=>{
    const ts=new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    const uid=userId||currentUserId;
    setFundState(prev=>{
      const realFid = getRealFid(prev, fid, excId);
      if(!prev[realFid]) return prev;
      return {...prev,[realFid]:prev[realFid].map(e=>e.id===excId?{...e,thread:[...e.thread,{id:`t${Date.now()}`,userId:uid||"system",text,ts}]}:e)}
    });
  },[currentUserId]);

  const handleSubmit=useCallback((fid: string)=>setApprovalState(prev=>({...prev,[fid]:{status:"review_pending" as const,submittedBy:currentUserId,submittedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}),approvedBy:null,approvedAt:null}})),[currentUserId]);
  const handleApprove=useCallback((fid: string)=>setApprovalState(prev=>({...prev,[fid]:{...prev[fid],status:"approved" as const,approvedBy:currentUserId,approvedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}})),[currentUserId]);
  const handleBulkSubmitForReview = useCallback((fids: string[]) => {
    setApprovalState(prev => {
      const next = { ...prev };
      fids.forEach(fid => {
        next[fid] = {
          status: "review_pending" as const,
          submittedBy: currentUserId,
          submittedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          approvedBy: null,
          approvedAt: null
        };
      });
      return next;
    });
  }, [currentUserId]);
  const handleBulkApprove=useCallback((fids: string[])=>setApprovalState(prev=>{
    const next = {...prev};
    fids.forEach(fid => { next[fid] = {...next[fid], status:"approved" as const, approvedBy:currentUserId, approvedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}; });
    return next;
  }),[currentUserId]);

  const handleReassign=useCallback((fid: string, newUid: string)=>setFundSeeds(prev=>prev.map(f=>f.fund_id===fid?{...f,assignedTo:newUid}:f)),[]);

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
  const handleRunDemo = useCallback(() => {
    if (demoRunningRef.current) {
      demoRunningRef.current = false;
      setIsDemoRunning(false);
      setDemoToast(null);
      return;
    }
    demoRunningRef.current = true;
    setIsDemoRunning(true);
    setDemoKey(k => k + 1);

    const run = async () => {
      await sleep(9600);
      if (!demoRunningRef.current) return;

      const fund = FUNDS_SEED.find(f => f.fund_id === "FND-2024-001");
      setSelectedFund(fund ?? null); setView("fund");
      await sleep(500);
      if (!demoRunningRef.current) return;

      setDemoActiveExcId("EXC-H01");
      await sleep(1000);
      if (!demoRunningRef.current) return;

      const comment = "Reviewing T+1 settlement lag on AAPL position.";
      for (let i = 0; i <= comment.length; i++) {
        if (!demoRunningRef.current) return;
        setDemoTypingText(comment.slice(0, i));
        await sleep(45);
      }
      await sleep(500);
      if (!demoRunningRef.current) return;

      setDemoShouldSubmit(true);
      await sleep(200);
      setDemoShouldSubmit(false);
      setDemoTypingText("");

      await sleep(2200);
      if (!demoRunningRef.current) return;
      handleResolve("FND-2024-001", "EXC-H01", "accept_as_is", "");

      await sleep(600);
      if (!demoRunningRef.current) return;
      setSelectedFund(null); setView("dashboard");
      setDemoActiveExcId(null);

      await sleep(600);
      if (!demoRunningRef.current) return;
      setDemoToast("✓ Touchless Demo Complete — 4 auto-resolved, 1 human-assisted");
      setTimeout(() => setDemoToast(null), 6000);

      demoRunningRef.current = false;
      setIsDemoRunning(false);
    };
    run();
  }, [handleResolve]);

  if (view === "login") return <><StyleInjector/><LoginScreen onLogin={handleLogin} /></>;
  if (view === "auditor_portal") return <><StyleInjector/><AuditorPortal onClose={handleLogout} /></>;

  if (mappingSession) {
    return (
      <>
        <StyleInjector/>
        <AiDataMappingScreen session={mappingSession} onBack={()=>setMappingSession(null)} onComplete={handleMappingComplete} />
      </>
    );
  }

  const currentView=selectedFund?"fund":view;

  return (
    <div style={{...SANS,background:T.appBg,minHeight:"100vh",color:T.textPrimary,fontSize:13}}>
      <StyleInjector/>
      {showAIToast && <AILearningToast onClose={() => setShowAIToast(false)} />}
      {showAiSettings && <AiParameterTuning onClose={() => setShowAiSettings(false)} />}
      <GlobalHeader
        view={currentView}
        fund={selectedFund}
        currentUser={currentUser}
        onToggleRole={handleToggleRole}
        onLogout={handleLogout}
        onGoToIngestion={handleGoToIngestion}
        onGoToFilings={handleGoToFilings}
        onGoToEntities={handleGoToEntities}
        onOpenAiSettings={()=>setShowAiSettings(true)}
        onGoToDashboard={handleGoToDashboard}
        streak={streak}
        notificationCount={notifications.length}
        fundState={fundState}
        fundSeeds={FUNDS_SEED}
      />
      {view==="ingestion"&&!selectedFund&&<IngestionStatusWidget feeds={feeds} setFeeds={setFeeds} currentUser={currentUser} onGoToDashboard={()=>{setView("dashboard");}} onOpenMapping={session=>setMappingSession(session)} onGoToExceptions={handleGoToExceptions} setView={setView}/>}
      {view === "schemas" && <SchemaRegistryView onBack={() => setView("ingestion")} onOpenStudio={(id) => { setActiveSchema(id); setView("schema_studio"); }} />}
      {view === "schema_studio" && <SchemaStudioView schemaId={activeSchema} onBack={() => setView("schemas")} />}
      {view==="filings"&&!selectedFund&&<BeverleyFilingTracker filings={filings} setFilings={setFilings} onGoToDashboard={()=>{setView("dashboard");}} />}
      {view==="audit_logs"&&!selectedFund&&<GlobalAuditLogView onBack={()=>setView("dashboard")} />}
      {view==="entities"&&!selectedFund&&<GlobalEntityManager fundSeeds={fundSeeds} />}
      {view==="data_architecture"&&!selectedFund&&<IntegrationsAndArchitectureHub fundSeeds={fundSeeds} masterFeeds={masterFeeds} onBack={()=>setView("dashboard")} />}
      {view==="data_exchange"&&!selectedFund&&<DataExchangeView onBack={()=>setView("dashboard")} />}
      {demoToast && <div className="slide-in" style={{position:"fixed",top:70,right:24,background:T.navyHeader,border:`1px solid ${T.okBase}`,color:"#fff",padding:"14px 20px",borderRadius:8,boxShadow:"0 10px 25px rgba(0,0,0,0.2)",zIndex:9999,display:"flex",gap:12,alignItems:"center",...SANS,fontSize:13,fontWeight:600}}><span style={{fontSize:18}}>✓</span>{demoToast}<button onClick={()=>setDemoToast(null)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:16,marginLeft:8}}>✕</button></div>}
      {view==="dashboard"&&!selectedFund&&<Dashboard onBulkSubmitForReview={handleBulkSubmitForReview} dashSubView={dashSubView} fundState={fundState} fundSeeds={fundSeeds} approvalState={approvalState} currentUser={currentUser} notifications={notifications} onSelectFund={f=>{setSelectedFund(f); setView("fund");}} onReassign={handleReassign} onViewClientExceptions={handleViewClientExceptions} onBulkApprove={handleBulkApprove} onGlobalResolve={handleGlobalResolve} onGoToAudit={()=>setView("audit_logs")} onRunDemo={handleRunDemo} isDemoRunning={isDemoRunning} demoKey={demoKey} showGlobalExcs={showGlobalExcs} setShowGlobalExcs={setShowGlobalExcs} onSingleResolve={(fid,excId,res,ov)=>handleResolve(fid,excId,res,ov||"")} onSelectFundFromGlobal={fund=>{setSelectedFund(fund); setView("fund");}}/>}
      {selectedFund&&<FundView fund={selectedFund} fundSeeds={fundSeeds} onSelectFund={f=>{setSelectedFund(f); setView("fund");}} exceptions={getExceptions(selectedFund.fund_id)} approval={approvalState[selectedFund.fund_id] || {status:"open"}} currentUser={currentUser} masterFeeds={masterFeeds} blockedFunds={blockedFundsList}
        onUpdateFeedRecord={handleUpdateFeedRecord}
        onResolve={(id,res,ov)=>handleResolve(selectedFund.fund_id,id,res,ov)} onReopen={id=>handleReopen(selectedFund.fund_id,id)} onUpdate={(id,patch)=>handleUpdate(selectedFund.fund_id,id,patch)} onAddThread={(excId,txt,uid?)=>handleAddThread(selectedFund.fund_id,excId,txt,uid)} onSubmit={()=>handleSubmit(selectedFund.fund_id)} onApprove={()=>handleApprove(selectedFund.fund_id)} onBack={()=>{ setSelectedFund(null); setView("dashboard"); }} demoActiveExcId={demoActiveExcId} demoTypingText={demoTypingText} demoShouldSubmit={demoShouldSubmit} fxOverrideActive={fxOverrideActive} returnToGlobal={showGlobalExcs ? ()=>{ setSelectedFund(null); setView("dashboard"); } : null}/>}
    </div>
  );
}
