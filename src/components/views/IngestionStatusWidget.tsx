import React, { useState, useCallback, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { MAPPING_SESSIONS } from '../../data/feeds/gl';
import { RawDataModal } from '../modals/RawDataModal';
import { UploadModal } from '../modals/UploadModal';
import type { IngestionFeed, TeamMember } from '../../types';
import type { CSSProperties } from 'react';

export function IngestionStatusWidget({feeds, setFeeds, onGoToDashboard, onOpenMapping, onGoToExceptions, currentUser, setView}) {
  const [retrying,setRetrying] = useState(null);
  const [showUpload,setShowUpload] = useState(false);
  const [previewFeed,setPreviewFeed] = useState(null);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("received");

  const success=feeds.filter(f=>f.status==="success").length;
  const failed=feeds.filter(f=>f.status==="failed").length;
  const pending=feeds.filter(f=>f.status==="pending" || f.status==="needs_mapping").length;
  
  const STATUS_CFG={
    success:{color:T.okBase,icon:"✓",label:"Success"},
    failed:{color:T.errorBase,icon:"✕",label:"Failed"},
    pending:{color:T.warnBase,icon:"⏳",label:"Pending"},
    needs_mapping:{color:T.aiBase,icon:"✦",label:"Mapping Req."}
  };
  
  const handleRetry=id=>{ setRetrying(id);setTimeout(()=>{setFeeds(prev=>prev.map(f=>f.id===id?{...f,status:"success",received:new Date().toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}),rows:203,exceptions:7,error:undefined}:f));setRetrying(null);},1800); };
  const handleUploadComplete = (newFeed, mappingRows) => {
    setFeeds(prev => [newFeed, ...prev]);
    MAPPING_SESSIONS[newFeed.id] = {
      feedId: newFeed.id,
      fileName: newFeed.payload || newFeed.file,
      fundName: newFeed.fund,
      rows: mappingRows
    };
  };

  const displayFeeds = useMemo(() => {
    let result = [...feeds];
    if (statusFilter !== "All") result = result.filter(f => f.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f => f.fund.toLowerCase().includes(q) || (f.payload || f.file || "").toLowerCase().includes(q) || f.client.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === "fund") return a.fund.localeCompare(b.fund);
      if (sortBy === "exceptions") return (b.exceptions || 0) - (a.exceptions || 0);
      if (sortBy === "received") return b.id.localeCompare(a.id);
      return 0; 
    });
    return result;
  }, [feeds, search, statusFilter, sortBy]);

  const getConnectionBadge = (src) => {
    const s = (src || "").toUpperCase();
    if (s.includes("API")) return <span style={{...MONO,fontSize:10,fontWeight:700,border:`1px solid ${T.okBorder}`,color:T.okBase,padding:"2px 6px",borderRadius:4}}>Direct API</span>;
    if (s.includes("SFTP")) return <span style={{...MONO,fontSize:10,fontWeight:700,border:`1px solid ${T.warnBorder}`,color:T.warnBase,padding:"2px 6px",borderRadius:4}}>SFTP</span>;
    return <span style={{...MONO,fontSize:10,fontWeight:700,border:`1px solid ${T.border}`,color:T.textMuted,padding:"2px 6px",borderRadius:4}}>Manual</span>;
  };

  const thStyle: CSSProperties = { ...SANS, padding: "8px 12px", textAlign: "left", color: T.textMuted, fontWeight: 700, fontSize: 10, letterSpacing: "0.05em", borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 12px", borderBottom: `1px solid ${T.border}` };

  return <div style={{padding:"20px 24px"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:16}}>
      <div style={{display:"flex", flexDirection:"column", justifyContent:"space-between"}}>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <div style={{position:"relative", width: 280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" placeholder="Search fund, client, or payload..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...SANS, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="All">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="needs_mapping">Mapping Req.</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="received">Sort: Date Received</option>
            <option value="fund">Sort: Fund Name</option>
            <option value="exceptions">Sort: Exception Count</option>
          </select>
        </div>
      </div>
      
      <div style={{display:"flex",gap:10,alignItems:"center", height:"100%"}}>
        {/* NEW BUTTONS: Connect New Source & Schema Registry */}
        {[{label:"Success",val:success,color:T.okBase,bg:T.cardBg,bd:T.okBorder, icon:"✓"},{label:"Failed",val:failed,color:T.errorBase,bg:T.cardBg,bd:T.errorBorder, icon:"✕"},{label:"Pending",val:pending,color:T.warnBase,bg:T.cardBg,bd:T.warnBorder, icon:"⏳"}].map(k=>(
          <div key={k.label} style={{background:k.bg,border:`1px solid ${k.bd}`,borderRadius:7,padding:"0 14px",height:38,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14, color:k.color, fontWeight:700}} aria-hidden="true">{k.icon}</span>
            <span style={{...MONO,fontSize:14,fontWeight:700,color:k.color, lineHeight:1}}>{k.val}</span>
            <span style={{...SANS,fontSize:11,fontWeight:700,color:k.color,textTransform:"uppercase",letterSpacing:"0.03em"}}>{k.label}</span>
          </div>
        ))}
        <div style={{width:1,height:24,background:T.border,margin:"0 4px"}}/>
            <button onClick={() => setView('schemas')} style={{...SANS,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,borderRadius:7,padding:"0 16px",height:38,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>Schema Registry</button>
            <button onClick={()=>setShowUpload(true)} style={{...SANS,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,borderRadius:7,padding:"0 16px",height:38,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><span>↑</span>Manual Upload</button>
            <button style={{...SANS,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,borderRadius:7,padding:"0 16px",height:38,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><span>⚡</span>Connect New Source</button>
            
      </div>
    </div>

    <div style={{background:T.aiBg,border:`1px solid ${T.aiBorder}`,borderRadius:9,padding:"11px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
      <span style={{fontSize:18}}>✦</span>
      <div style={{flex:1}}>
        <span style={{...SANS,fontWeight:700,fontSize:12,color:T.aiBase}}>AI Schema Mapping Available — </span>
        <span style={{...SANS,fontSize:12,color:T.textMuted}}>Click the mapping badge on successful GL rows below to verify AI field predictions.</span>
      </div>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr style={{background:T.appBg}}>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Period</th>
            <th style={thStyle}>Connection</th>
            <th style={thStyle}>Fund</th>
            <th style={thStyle}>Payload</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Received</th>
            <th style={thStyle}>Source</th>
            {/* Split Exceptions into two columns */}
            <th style={{...thStyle, textAlign:"right"}}>Auto-Resolved</th>
            <th style={{...thStyle, textAlign:"right"}}>Requires Review</th>
            <th style={{...thStyle, textAlign:"center"}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayFeeds.map(feed=>{ 
            const cfg=STATUS_CFG[retrying===feed.id?"pending":feed.status];
            const isRetrying=retrying===feed.id; 
            
            // Generate deterministic mock numbers for Auto-Resolved based on rows
            const autoResolved = feed.rows > 0 ? Math.floor(feed.rows * 0.08) : 0; 

            return(
              <tr key={feed.id} className="feed-row"
                onClick={!!MAPPING_SESSIONS[feed.id]&&feed.status==="success"&&feed.type==="GL" ? ()=>onOpenMapping(MAPPING_SESSIONS[feed.id]) : undefined}
                style={{cursor:!!MAPPING_SESSIONS[feed.id]&&feed.status==="success"&&feed.type==="GL"?"pointer":"default"}}>
                
                <td style={tdStyle}><span style={{...SANS,fontSize:11,fontWeight:700,color:cfg.color,display:"inline-flex",alignItems:"center",gap:4}}>{isRetrying?<span style={{animation:"pulse 0.8s infinite"}}>⏳</span>:<span>{cfg.icon}</span>}{isRetrying?"Retrying…":cfg.label}</span></td>
                
                <td style={{...tdStyle,...SANS,fontSize:11,fontWeight:600,color:T.textPrimary,whiteSpace:"nowrap"}}>{feed.period}</td>
                
                <td style={tdStyle}>{getConnectionBadge(feed.connType || feed.source)}</td>
                
                <td style={{...tdStyle, whiteSpace:"nowrap"}}><div style={{...SANS,fontSize:12,fontWeight:600}}>{feed.fund}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>{feed.client}</div></td>
                
                <td style={{...tdStyle,...MONO,fontSize:10,color:T.textMuted,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{feed.payload || feed.file}</td>
                
                {/* Type: Button look removed, combined with rows */}
                <td style={tdStyle}>
                  <div style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary}}>{feed.type}</div>
                  <div style={{...MONO,fontSize:10,color:T.textMuted,marginTop:2}}>{feed.rows>0?feed.rows.toLocaleString():"—"} rows</div>
                </td>
                
                <td style={{...tdStyle,...MONO,fontSize:11,color:T.textMuted,whiteSpace:"nowrap"}}>{feed.received}</td>
                
                <td style={{...tdStyle,...MONO,fontSize:10,color:T.textMuted,whiteSpace:"nowrap"}}>{feed.sourceOrigin || feed.source || "System"}</td>
                
                {/* Auto-Resolved Column */}
                <td style={{...tdStyle,...MONO,textAlign:"right",fontSize:11,color:autoResolved>0?T.aiBase:T.textMuted,fontWeight:autoResolved>0?700:400}}>
                  {autoResolved>0 ? autoResolved : "—"}
                </td>

                {/* Requires Review Column */}
                <td style={{...tdStyle,...MONO,textAlign:"right",fontSize:11,color:feed.exceptions>0?T.errorBase:T.textMuted,fontWeight:feed.exceptions>0?700:400}}>
                  {feed.exceptions>0 ? feed.exceptions : "—"}
                </td>
                
                <td style={{...tdStyle,textAlign:"center",whiteSpace:"nowrap"}}>
                  <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                    {feed.status==="success"&&feed.rows>0&&<button onClick={(e)=>{e.stopPropagation(); setPreviewFeed(feed);}} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background=T.cardBg}>🔍 Data</button>}
                    
                    {/* RESTORED: Now correctly looks at the status, and passes a fallback layout so it never crashes */}
                    {feed.status==="needs_mapping"&&(
                      <button onClick={(e)=>{e.stopPropagation(); onOpenMapping(MAPPING_SESSIONS[feed.id] || {feedId:feed.id, fundName:feed.fund, rows:[]});}} style={{...SANS,fontSize:10,fontWeight:700,padding:"4px 8px",borderRadius:4,background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`,cursor:"pointer",transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>✦ Mapping</button>
                    )}
                    
                    {feed.status==="success"&&feed.exceptions>0&&(
                      <button onClick={()=>onGoToExceptions(feed.fund_id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid ${T.warnBorder}`,background:T.warnBg,color:T.warnBase,cursor:"pointer",transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>⚠ Review</button>
                    )}
                    {feed.status==="failed"&&!isRetrying&&<button onClick={()=>handleRetry(feed.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid ${T.errorBorder}`,background:T.errorBg,color:T.errorBase,cursor:"pointer",transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>↺ Retry</button>}
                  </div>
                  {feed.error&&!isRetrying&&<div style={{...SANS,fontSize:10,color:T.errorBase,marginTop:6,maxWidth:180,textAlign:"right"}}>{feed.error}</div>}
                </td>
              </tr>
            );
          })}
          {displayFeeds.length === 0 && (
            <tr>
              <td colSpan={11} style={{padding:"40px 0", textAlign:"center", color:T.textMuted, ...SANS}}>No feeds match your search criteria.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {showUpload && <UploadModal currentUser={currentUser} onClose={()=>setShowUpload(false)} onUploadComplete={handleUploadComplete} />}
    {previewFeed && <RawDataModal feed={previewFeed} onClose={()=>setPreviewFeed(null)} />}
  </div>;
}

