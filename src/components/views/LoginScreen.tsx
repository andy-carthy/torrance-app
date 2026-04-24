import React, { useState, useEffect } from 'react';
import { T, SANS, MONO } from '../../theme/tokens';
import { FieldLabel } from '../primitives/Card';
import { TEAM } from '../../data/team';
import { CURRENT_USER_ID } from '../../data/team';

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("login");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [valuePropIdx, setValuePropIdx] = useState(0);
  const [ssoLoading, setSsoLoading] = useState(false);

  const valueProps = [
    "High-velocity financial reporting.",
    "Touchless enterprise workflows.",
    "Automated regulatory compliance."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setValuePropIdx((prev) => (prev + 1) % valueProps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isEnterprise = email.toLowerCase().endsWith("@Pennywisecapital.com");
  const canSubmit = isEnterprise ? email.length > 0 : (email.length > 0 && password.length > 0);

  const handleLogin = () => {
    if (!email.includes("@")) {
      setError("Invalid email or password.");
      return;
    }
    setError("");
    if (isEnterprise) {
      onLogin("u1", "dashboard"); 
    } else {
      setStep("mfa");
    }
  };

  const handleSsoClick = () => {
    setSsoLoading(true);
    setTimeout(() => {
      onLogin("u1", "dashboard");
    }, 600);
  };

  const handleMfa = () => {
    if (mfaCode.length !== 6) {
      setError("Enter a valid 6-digit TOTP code.");
      return;
    }
    setError("");
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes("controller")) {
      onLogin("u4", "dashboard"); 
    } else if (lowerEmail.endsWith("@pwc.com") || lowerEmail.includes("audit")) {
      onLogin("auditor", "auditor_portal"); 
    } else {
      onLogin("u1", "dashboard"); 
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:SANS.fontFamily, overflow:"hidden" }}>
      <div style={{ flex:1, background:T.navyHeader, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 10%", position:"relative" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, opacity:0.03, backgroundImage:"radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)", backgroundSize:"32px 32px" }} />
        <div style={{ zIndex:1 }}>
          <div style={{ fontSize:28, fontWeight:700, color:"#fff", letterSpacing:"0.04em", marginBottom:24 }}>
            <span style={{ color:T.actionBase }}>T</span>ORRANCE
          </div>
          <div key={valuePropIdx} className="fade-in" style={{ fontSize:38, fontWeight:300, color:"#e2e6ed", lineHeight:1.3, maxWidth:480 }}>
            {valueProps[valuePropIdx]}
          </div>
          <div style={{ fontSize:16, color:T.textMuted, marginTop:16 }}>
            Enterprise scale. Exception-based triage.
          </div>
        </div>
      </div>
      
      <div style={{ flex:1, background:T.cardBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:400, padding:"0 32px" }}>
          {step === "login" ? (
            <div className="fade-in">
              <h2 style={{ fontSize:24, fontWeight:700, color:T.textPrimary, marginBottom:28 }}>Sign in to Torrance</h2>
              
              {error && (
                <div style={{ background:T.errorBg, border:`1px solid ${T.errorBorder}`, color:T.errorBase, padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:700 }}>✕</span>{error}
                </div>
              )}
              
              <button
                onClick={handleSsoClick}
                disabled={ssoLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 6,
                  border: `1px solid ${T.actionBase}`,
                  background: "transparent",
                  color: T.actionBase,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: ssoLoading ? "not-allowed" : "pointer",
                  marginBottom: 24,
                  transition: "all 0.15s",
                  opacity: ssoLoading ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!ssoLoading) e.currentTarget.style.background = T.actionBg; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {ssoLoading ? "Redirecting to SSO..." : "Continue with Enterprise SSO"}
              </button>
              
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
                <div style={{ flex:1, height:1, background:"#eef1f5" }} />
                <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em" }}>or</div>
                <div style={{ flex:1, height:1, background:"#eef1f5" }} />
              </div>
              
              <div style={{ marginBottom: isEnterprise ? 24 : 16 }}>
                <FieldLabel>Email Address</FieldLabel>
                <input type="email" autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com" style={{ width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${error?T.errorBorder:T.border}`, fontSize:13, fontFamily:SANS.fontFamily }} onKeyDown={e=>e.key==="Enter"&&canSubmit&&handleLogin()} />
              </div>
              
              {!isEnterprise && (
                <div className="slide-in" style={{ marginBottom:24 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <FieldLabel>Password</FieldLabel>
                    <button style={{ background:"none", border:"none", color:T.textMuted, fontSize:11, cursor:"pointer", marginBottom:6, transition:"color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color=T.actionBase} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>Forgot Password?</button>
                  </div>
                  <div style={{ position:"relative" }}>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ width:"100%", padding:"10px 38px 10px 14px", borderRadius:6, border:`1px solid ${error?T.errorBorder:T.border}`, fontSize:13, fontFamily:SANS.fontFamily }} onKeyDown={e=>e.key==="Enter"&&canSubmit&&handleLogin()} />
                    <button onClick={()=>setShowPassword(!showPassword)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:16 }}>
                      {showPassword ? "👁" : "👁‍🗨"}
                    </button>
                  </div>
                </div>
              )}
              
              <button disabled={!canSubmit} onClick={handleLogin} style={{ width:"100%", padding:"12px", borderRadius:6, border:"none", background:canSubmit?T.actionBase:T.border, color:canSubmit?"#fff":T.textMuted, fontSize:13, fontWeight:700, cursor:canSubmit?"pointer":"not-allowed", transition:"all 0.15s" }}>
                {isEnterprise ? "Sign in via Okta/Microsoft" : "Sign In"}
              </button>
            </div>
          ) : (
            <div className="slide-in" style={{ textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:16 }}>🔒</div>
              <h2 style={{ fontSize:20, fontWeight:700, color:T.textPrimary, marginBottom:8 }}>Two-Factor Authentication</h2>
              <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, lineHeight:1.5 }}>Enter the 6-digit TOTP code from your authenticator app.</p>
              
              {error && (
                <div style={{ background:T.errorBg, border:`1px solid ${T.errorBorder}`, color:T.errorBase, padding:"10px 14px", borderRadius:6, fontSize:13, marginBottom:20, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontWeight:700 }}>✕</span>{error}
                </div>
              )}
              
              <input type="text" autoFocus maxLength={6} value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" style={{ ...MONO, width:"100%", padding:"14px", borderRadius:8, border:`1px solid ${error?T.errorBorder:T.border}`, fontSize:24, textAlign:"center", letterSpacing:"0.3em", marginBottom:24 }} onKeyDown={e=>e.key==="Enter"&&mfaCode.length===6&&handleMfa()} />
              
              <button disabled={mfaCode.length!==6} onClick={handleMfa} style={{ width:"100%", padding:"12px", borderRadius:6, border:"none", background:mfaCode.length===6?T.actionBase:T.border, color:mfaCode.length===6?"#fff":T.textMuted, fontSize:13, fontWeight:700, cursor:mfaCode.length===6?"pointer":"not-allowed", transition:"all 0.15s" }}>
                Verify Code
              </button>
              
              <button onClick={()=>{setStep("login");setMfaCode("");setError("");}} style={{ marginTop:16, background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer" }}>
                ← Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

{/** TODO: M  */}
