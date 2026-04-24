import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { BespokeFeedsTab } from '../fundTabs/BespokeFeedsTab';
import { ScheduledTransfersTab } from '../fundTabs/ScheduledTransfersTab';
import { WebhooksTab } from '../fundTabs/WebhooksTab';

export function DataExchangeView({ onBack }) {
  const [activeTab, setActiveTab] = useState("bespoke"); // 'bespoke', 'api', 'sftp'

  const CardHeader = ({ icon, title, desc }) => (
    <div style={{marginBottom:24}}>
      <div style={{...SANS, fontSize:18, fontWeight:700, color:T.textPrimary, display:"flex", alignItems:"center", gap:8}}>
        <span>{icon}</span> {title}
      </div>
      <div style={{...SANS, fontSize:13, color:T.textMuted, marginTop:4}}>{desc}</div>
    </div>
  );

  return (
    <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 52px)", background:T.appBg}}>
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Data Exchange Hub</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Configure bespoke file formats, API webhooks, and external transmission schedules.</div>
          </div>
        </div>
      </div>

      <div style={{display:"flex", flex:1, overflow:"hidden"}}>
        {/* Left Nav */}
        <div style={{width: 240, background:T.cardBg, borderRight:`1px solid ${T.border}`, padding:"20px 16px", display:"flex", flexDirection:"column", gap:8}}>
          <button onClick={()=>setActiveTab("bespoke")} style={{...SANS, textAlign:"left", fontSize:13, fontWeight:600, padding:"10px 14px", borderRadius:6, border:"none", background:activeTab==="bespoke"?"#eff6ff":"transparent", color:activeTab==="bespoke"?T.actionBase:T.textPrimary, cursor:"pointer"}}>
            📑 Bespoke File Feeds
          </button>
          <button onClick={()=>setActiveTab("api")} style={{...SANS, textAlign:"left", fontSize:13, fontWeight:600, padding:"10px 14px", borderRadius:6, border:"none", background:activeTab==="api"?"#eff6ff":"transparent", color:activeTab==="api"?T.actionBase:T.textPrimary, cursor:"pointer"}}>
            ⚡ External API Webhooks
          </button>
          <button onClick={()=>setActiveTab("sftp")} style={{...SANS, textAlign:"left", fontSize:13, fontWeight:600, padding:"10px 14px", borderRadius:6, border:"none", background:activeTab==="sftp"?"#eff6ff":"transparent", color:activeTab==="sftp"?T.actionBase:T.textPrimary, cursor:"pointer"}}>
            ⏱ Scheduled Transfers
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{flex:1, overflowY:"auto", padding:"32px 48px"}}>
          {activeTab === "bespoke" && <BespokeFeedsTab />}

          {activeTab === "sftp" && <ScheduledTransfersTab />}

          {activeTab === "api" && <WebhooksTab />}
        </div>
      </div>
    </div>
  );
}

