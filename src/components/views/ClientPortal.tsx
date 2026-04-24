import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { FUNDS_SEED } from '../../data/funds';
import { FieldLabel } from '../primitives/Card';
import { fmtCompact } from '../../utils/formatters';

export function ClientPortal({onClose}) {
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);

  const handleLogin = () => {
    if (!email.includes("@") || !password) { setLoginErr("Invalid email or password."); return; }
    setLoginErr(""); setStep("mfa");
  };
  const handleMfa = () => {
    if (mfaCode.length !== 6) { setLoginErr("Enter a valid 6-digit code."); return; }
    setLoginErr(""); setStep("portal");
  };

  const PORTAL_FUNDS = [
    {name:"Pennywise Global Diversified Fund",  series:"Series I",  nav:687400000, inception:"Jan 14, 2019", ytd:+4.12, mtd:+0.88, classes:[{name:"Class A",nav:220000000,shares:13272.5},{name:"Institutional",nav:340000000,shares:13649.1},{name:"R6",nav:127400000,shares:8499.3}]},
    {name:"Pennywise Fixed Income Opp. Fund",   series:"Series II", nav:312000000, inception:"Mar 8, 2021",  ytd:+2.74, mtd:+0.31, classes:[{name:"Class A",nav:312000000,shares:8732.4}]},
  ];

  const BOARD_DOCS = [
    {icon:"📋", label:"Board Meeting Packet — Q4 2024",  date:"Jan 5, 2025",  type:"PDF"},
    {icon:"📊", label:"NAV Summary — December 31, 2024", date:"Jan 2, 2025",  type:"Excel"},
    {icon:"📄", label:"Financial Statements Draft",       date:"Jan 3, 2025",  type:"PDF"},
    {icon:"📈", label:"Performance Attribution Report",   date:"Jan 4, 2025",  type:"PDF"},
    {icon:"📑", label:"Holdings Summary (Unaudited)",     date:"Jan 2, 2025",  type:"Excel"},
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(10,18,30,0.85)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:14,width:step==="portal"?760:420,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 30px 80px rgba(0,0,0,0.4)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:T.actionBase}}>T</span>ORRANCE
              <span style={{...SANS,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#0d1724",color:"#8898aa"}}>Client Portal</span>
            </div>
            <div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Pennywise Capital Advisors · Secure client access</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>

        {step==="login"&&(
          <div style={{padding:"28px 28px 32px"}}>
            <div style={{...SANS,fontSize:13,color:T.textMuted,marginBottom:20,lineHeight:1.6}}>Secure read-only access to your fund data. Contact your fund administrator to request access.</div>
            {loginErr&&<div style={{...SANS,fontSize:12,color:T.errorBase,background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:6,padding:"8px 12px",marginBottom:14}}>{loginErr}</div>}
            <div style={{marginBottom:14}}>
              <FieldLabel>Email Address</FieldLabel>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@client.com" style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",fontSize:13}}/>
            </div>
            <div style={{marginBottom:20}}>
              <FieldLabel>Password</FieldLabel>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",fontSize:13}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
            <button onClick={handleLogin} style={{...SANS,width:"100%",border:"none",borderRadius:7,padding:"12px",fontSize:13,fontWeight:700,background:T.actionBase,color:"#fff",cursor:"pointer"}}>Sign In</button>
          </div>
        )}

        {step==="mfa"&&(
          <div style={{padding:"28px 28px 32px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:12}}>📱</div>
            <div style={{...SANS,fontWeight:700,fontSize:15,marginBottom:6}}>Two-Factor Authentication</div>
            <div style={{...SANS,fontSize:13,color:T.textMuted,marginBottom:20}}>Enter the 6-digit code from your authenticator app.</div>
            {loginErr&&<div style={{...SANS,fontSize:12,color:T.errorBase,background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:6,padding:"8px 12px",marginBottom:14}}>{loginErr}</div>}
            <input type="text" maxLength={6} value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,""))} placeholder="000000" onKeyDown={e=>e.key==="Enter"&&mfaCode.length===6&&handleMfa()} style={{...MONO,width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px",fontSize:22,textAlign:"center",letterSpacing:"0.3em",marginBottom:16}}/>
            <button disabled={mfaCode.length!==6} onClick={handleMfa} style={{...SANS,width:"100%",border:"none",borderRadius:7,padding:"12px",fontSize:13,fontWeight:700,background:mfaCode.length===6?T.actionBase:T.border,color:mfaCode.length===6?"#fff":T.textMuted,cursor:mfaCode.length===6?"pointer":"not-allowed"}}>Verify Code</button>
          </div>
        )}

        {step==="portal"&&(
          <div style={{overflowY:"auto",flex:1}}>
            <div style={{padding:"12px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fafbff"}}>
              <div style={{...SANS,fontSize:13,fontWeight:600,color:T.textPrimary}}>Welcome, Client</div>
              <span style={{...SANS,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:5,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:4}}><span>✓</span>Authenticated · Dec 31, 2024</span>
            </div>
            <div style={{padding:"16px 22px 0"}}>
              <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Fund Summary</div>
              {PORTAL_FUNDS.map(fund=>(
                <div key={fund.name} style={{background:T.appBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"16px 18px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div>
                      <div style={{...SANS,fontWeight:700,fontSize:14,color:T.textPrimary}}>{fund.name}</div>
                      <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>{fund.series} · Inception {fund.inception}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{...MONO,fontSize:20,fontWeight:700,color:T.textPrimary}}>{fmtCompact(fund.nav)}</div>
                      <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>Net Assets</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:16,marginBottom:12}}>
                    {[{label:"YTD Return",val:`${fund.ytd>0?"+":""}${fund.ytd}%`,color:fund.ytd>=0?T.okBase:T.errorBase},{label:"MTD Return",val:`${fund.mtd>0?"+":""}${fund.mtd}%`,color:fund.mtd>=0?T.okBase:T.errorBase}].map(m=>(
                      <div key={m.label} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 14px",flex:1}}>
                        <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{m.label}</div>
                        <div style={{...MONO,fontSize:16,fontWeight:700,color:m.color}}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {fund.classes.map(cls=>(
                      <div key={cls.name} style={{padding:"6px 12px",borderRadius:6,background:T.cardBg,border:`1px solid ${T.border}`}}>
                        <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:2}}>{cls.name}</div>
                        <div style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary}}>{fmtCompact(cls.nav)}</div>
                        <div style={{...MONO,fontSize:10,color:T.textMuted}}>{cls.shares.toLocaleString()} shares</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:"0 22px 22px"}}>
              <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10,marginTop:16}}>Board Documents</div>
              {BOARD_DOCS.map((doc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:8,background:T.cardBg}}>
                  <span style={{fontSize:20}}>{doc.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{...SANS,fontWeight:600,fontSize:13,color:T.textPrimary}}>{doc.label}</div>
                    <div style={{...SANS,fontSize:10,color:T.textMuted,marginTop:2}}>{doc.date}</div>
                  </div>
                  <span style={{...MONO,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:doc.type==="PDF"?T.errorBg:T.okBg,color:doc.type==="PDF"?T.errorBase:T.okBase,border:`1px solid ${doc.type==="PDF"?T.errorBorder:T.okBorder}`}}>{doc.type}</span>
                  <button onClick={()=>{setDownloading(i);setTimeout(()=>setDownloading(null),1400);}}
                    style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:5,border:`1px solid ${T.border}`,background:downloading===i?T.okBg:T.cardBg,color:downloading===i?T.okBase:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s",whiteSpace:"nowrap"}}>
                    {downloading===i?<><span>✓</span>Downloaded</>:<><span>↓</span>Download</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

