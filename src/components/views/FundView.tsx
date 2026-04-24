import React, { useState, useEffect } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { AIDecisionLogTab } from '../ai/AIDecisionLogTab';
import { ExceptionsTab } from '../exceptions/ExceptionsTab';
import { TrialBalanceTab } from '../fundTabs/TrialBalanceTab';
import { HoldingsGrid } from '../fundTabs/HoldingsGrid';
import { CapitalActivityGrid } from '../fundTabs/CapitalActivityGrid';
import { RawGLGrid } from '../fundTabs/RawGLGrid';
import { CrossChecksTab } from '../fundTabs/CrossChecksTab';
import { JournalEntriesTab } from '../fundTabs/JournalEntriesTab';
import { FinancialStatementsTab } from '../fundTabs/FinancialStatementsTab';
import { FootnoteEditorTab } from '../fundTabs/FootnoteEditorTab';
import { DataExplorerTab } from '../fundTabs/DataExplorerTab';
import { LpaVerificationTab } from '../fundTabs/LpaVerificationTab';
import { WorkpapersTab } from '../fundTabs/WorkpapersTab';
import { BespokeFeedsTab } from '../fundTabs/BespokeFeedsTab';
import { ScheduledTransfersTab } from '../fundTabs/ScheduledTransfersTab';
import { WebhooksTab } from '../fundTabs/WebhooksTab';
import { ApprovalWaterfallBar } from '../layout/ApprovalWaterfallBar';
import { FundSelectorCombobox } from '../layout/FundSelectorCombobox';
import { SlaPill } from '../primitives/Pills';
import { PdfModal } from '../modals/PdfModal';
import { WORKPAPER_TEMPLATES } from '../../data/workpapers';
import type { FundSeed, Exception, ApprovalRecord, TeamMember } from '../../types';

export function FundView({fund, fundSeeds, exceptions, approval, currentUser, masterFeeds, blockedFunds, onUpdateFeedRecord, onSelectFund, onResolve, onReopen, onUpdate, onAddThread, onSubmit, onApprove, onBack, demoActiveExcId, demoTypingText, demoShouldSubmit, fxOverrideActive, returnToGlobal}) {
  const [tab,setTab]=useState("exceptions");
  const [showFundPdf, setShowFundPdf] = useState(false);
  const [sharedTemplates, setSharedTemplates] = useState(WORKPAPER_TEMPLATES);
  const [activePeriod, setActivePeriod] = useState(fund.period || "December 31, 2024");
  const AVAILABLE_PERIODS = ["December 31, 2024","September 30, 2024","June 30, 2024","March 31, 2024","December 31, 2023","September 30, 2023"];
  
  const handleNextFund = () => {
    const currentIndex = blockedFunds.findIndex(f => f.fund_id === fund.fund_id);
    if (currentIndex !== -1 && currentIndex < blockedFunds.length - 1) {
      onSelectFund(blockedFunds[currentIndex + 1]);
    } else if (blockedFunds.length > 0 && blockedFunds[0].fund_id !== fund.fund_id) {
      onSelectFund(blockedFunds[0]);
    } else {
      onBack();
    }
  };

  const TABS = [
    {key:"exceptions",   label:`Exceptions (${exceptions.length})`},
    {key:"ai_log", label:"AI Decision Log" },
    {key:"explorer",     label:"Data Explorer"},
    {key:"journals",     label:"Journal Entries"},
    {key:"workpapers",   label:"Workpapers" },
    {key:"cross_checks", label:"Cross Checks" },
    {key:"lpa_terms", label:"Key Economic Terms"},
    {key:"statements",   label:"Financial Statements"},
    {key:"footnotes",    label:"Footnote Editor"},
  ]; 
  useEffect(() => { const handle = () => setTab("journals"); window.addEventListener("open-journal", handle); return () => window.removeEventListener("open-journal", handle); }, []);
  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)"}}>
    <div style={{background:T.navyHeader,padding:"8px 24px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <FundSelectorCombobox fund={fund} fundSeeds={fundSeeds} onSelectFund={onSelectFund} />
        <div style={{display:"flex",alignItems:"center",gap:6,color:"#8898aa",fontSize:12,...SANS}}>
          <span>| {fund.series} ·</span>
          <select value={activePeriod} onChange={e=>setActivePeriod(e.target.value)} style={{...SANS,fontSize:12,fontWeight:500,color:"#8898aa",background:"transparent",border:"none",outline:"none",cursor:"pointer",padding:"0 2px"}}>
            {AVAILABLE_PERIODS.map(p=><option key={p} value={p} style={{color:T.textPrimary,background:T.cardBg}}>{p}</option>)}
          </select>
        </div>
        <SlaPill daysLeft={fund.sla_days}/>
        
        {blockedFunds.length > 0 && (
          <button onClick={handleNextFund} style={{...SANS, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, background:T.warnBg, color:T.warnBase, border:`1px solid ${T.warnBorder}`, cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginLeft:12}}>
            Next Blocked Fund <span>→</span>
          </button>
        )}
        {returnToGlobal && (
          <button onClick={returnToGlobal} style={{...SANS, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, background:T.aiBg, color:T.aiBase, border:`1px solid ${T.aiBorder}`, cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginLeft:12}}>
            ← Global Exceptions
          </button>
        )}
      </div>
      <ApprovalWaterfallBar fund={fund} approval={approval} exceptions={exceptions} currentUser={currentUser} onSubmit={onSubmit} onApprove={onApprove} onOpenPdf={() => setShowFundPdf(true)}/>
    </div>

    <div style={{background:T.cardBg,borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",gap:0,flexShrink:0,overflowX:"auto"}}>
      {TABS.map(t=>(
        <button key={t.key} onClick={()=>setTab(t.key)}
          style={{...SANS,padding:"10px 16px",fontSize:12,fontWeight:tab===t.key?700:500,color:tab===t.key?T.actionBase:T.textMuted,background:"none",border:"none",borderBottom:tab===t.key?`2px solid ${T.actionBase}`:"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap", transition:"color 0.2s"}}>
          {t.label}
          {(t as any).ai&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`}}>✦ AI</span>}
        </button>
      ))}
    </div>

    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {tab==="exceptions"  &&<ExceptionsTab exceptions={exceptions} approval={approval} onResolve={onResolve} onReopen={onReopen} onUpdate={onUpdate} onAddThread={onAddThread} currentUserId={currentUser.id} onSubmit={onSubmit} demoActiveExcId={demoActiveExcId} demoTypingText={demoTypingText} demoShouldSubmit={demoShouldSubmit}/>}
      {tab==="ai_log" && <AIDecisionLogTab />}
      {tab==="explorer"    &&<DataExplorerTab masterFeeds={masterFeeds} onUpdateFeedRecord={onUpdateFeedRecord}/>}
      {tab==="journals" && <JournalEntriesTab fund={fund} fundSeeds={fundSeeds} masterFeeds={masterFeeds} currentUser={currentUser} onPostJE={() => {}} />}
      {tab==="workpapers"  &&<WorkpapersTab fund={fund} masterFeeds={masterFeeds} sharedTemplates={sharedTemplates} onTemplatesChange={setSharedTemplates}/>}
      {tab==="cross_checks"&&<CrossChecksTab currentUser={currentUser}/>}
      {tab==="lpa_terms" && <LpaVerificationTab />}
      {tab==="statements"  &&<FinancialStatementsTab fund={fund} fxOverrideActive={fxOverrideActive} exceptions={exceptions}/>}
      {tab==="footnotes"   &&<FootnoteEditorTab fund={fund} templates={sharedTemplates}/>}
    </div>
    {showFundPdf && <PdfModal onClose={() => setShowFundPdf(false)} fund={fund} resolvedExceptions={exceptions.filter(e=>e.status==='resolved')} />}
  </div>;
}

