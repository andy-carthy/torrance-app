export const T = {
  navyHeader:"#0f172a", // Deeper, less saturated slate-navy
  appBg:"#f8fafc", cardBg:"#ffffff", rowHover:"#f1f5f9",
  textPrimary:"#334155", textMuted:"#64748b", border:"#e2e8f0",
  
  // Status Colors: Shifted to calmer Crimson, Amber, and Sage
  errorBase:"#b91c1c", errorBg:"#fef2f2", errorBorder:"#fecaca", 
  warnBase:"#b45309",  warnBg:"#fffbeb",  warnBorder:"#fde68a", 
  okBase:"#0f766e",    okBg:"#f0fdf4",    okBorder:"#a7f3d0", 
  
  // Actions & AI: Unified into a cohesive Indigo family to prevent clashing
  actionBase:"#4f46e5",actionBg:"#eef2ff",
  aiBase:"#6366f1",    aiBg:"#e0e7ff",    aiBorder:"#c7d2fe", aiDark:"#4338ca",
  
  // Categories: Stripped of heavy background fills. Now use subtle borders and colored text.
  catAsset:"#2563eb",  catAssetBg:"#f8fafc",  catAssetBd:"#e2e8f0",
  catLiab:"#dc2626",   catLiabBg:"#f8fafc",   catLiabBd:"#e2e8f0",
  catCap:"#7c3aed",    catCapBg:"#f8fafc",    catCapBd:"#e2e8f0",
  catIncome:"#059669", catIncomeBg:"#f8fafc", catIncomeBd:"#e2e8f0",
  catExp:"#d97706",    catExpBg:"#f8fafc",    catExpBd:"#e2e8f0",
  
  preparerAccent:"#6366f1", preparerBg:"#f8fafc", preparerBd:"#e2e8f0",
  controllerAccent:"#0ea5e9",controllerBg:"#f8fafc",controllerBd:"#e2e8f0",
};

export const MONO = { fontFamily:"'IBM Plex Mono','Source Code Pro',monospace" };
export const SANS = { fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif" };
export const CAT: Record<string, {color: string; bg: string; border: string}> = {
  Asset:    {color:T.catAsset, bg:T.catAssetBg, border:T.catAssetBd},
  Liability:{color:T.catLiab,  bg:T.catLiabBg,  border:T.catLiabBd },
  Capital:  {color:T.catCap,   bg:T.catCapBg,   border:T.catCapBd  },
  Income:   {color:T.catIncome,bg:T.catIncomeBg,border:T.catIncomeBd},
  Expense:  {color:T.catExp,   bg:T.catExpBg,   border:T.catExpBd  },
};
export const GLOBAL_CSS = `
  :root { color-scheme: light only !important; }
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { margin: 0 !important; padding: 0 !important; max-width: none !important; width: 100%; text-align: left; background-color: ${T.appBg} !important; color: ${T.textPrimary} !important; color-scheme: light only !important; }
  input, select, textarea, button { background-color: #ffffff; color: ${T.textPrimary}; color-scheme: light only; }
  input[type="text"], input[type="email"], input[type="password"] { color: ${T.textPrimary} !important; background: #ffffff !important; }
  :focus-visible { outline:3px solid ${T.actionBg} !important; border-color:${T.actionBase} !important; }
  .exc-card { transition:background 0.1s, opacity 0.2s; }
  .exc-card:hover { background:${T.rowHover} !important; }
  .radio-opt { transition:border-color 0.12s, background 0.12s; }
  .radio-opt:hover { border-color:${T.actionBase} !important; }
  .resolve-btn { transition:all 0.15s; }
  .resolve-btn:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 4px 12px rgba(5,150,105,0.3); }
  .resolve-btn:active:not(:disabled) { transform:translateY(0); }
  .reopen-btn:hover { background:${T.appBg} !important; }
  .ai-btn { transition:all 0.15s; }
  .ai-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }
  .fund-card { transition:box-shadow 0.15s, transform 0.15s; cursor:pointer; }
  .fund-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.1) !important; transform:translateY(-2px); }
  .row-hover:hover { background:${T.rowHover} !important; cursor:pointer; }
  .tbl-row:hover td { background:${T.rowHover}; }
  .feed-row:hover { background:${T.rowHover}; }
  .fte-card { transition:box-shadow 0.12s; border-radius:9px; }
  .fte-card:hover { box-shadow:0 4px 14px rgba(0,0,0,0.08); }
  .wysiwyg-body { font-family:'IBM Plex Sans','Segoe UI',sans-serif; font-size:13px; line-height:1.75; color:${T.textPrimary}; outline:none; min-height:220px; }
  .bulk-bar { animation:slideUp 0.2s ease; }
  @keyframes slideUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes barGrow   { from{width:0%} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .slide-in  { animation:slideDown 0.2s ease forwards; }
  .fade-in   { animation:fadeIn 0.25s ease forwards; }
  .bar-grow  { animation:barGrow 0.5s ease forwards; }
  .modal-overlay { animation:fadeIn 0.15s ease forwards; }
  .ai-shimmer { background:linear-gradient(90deg,#f5f3ff 25%,#ede9fe 50%,#f5f3ff 75%); background-size:200% 100%; animation:shimmer 2s infinite; }
  input[type="checkbox"] { accent-color:${T.actionBase}; width:15px; height:15px; cursor:pointer; }
  input[type="radio"]    { accent-color:${T.actionBase}; width:15px; height:15px; cursor:pointer; }
  textarea { outline:none; resize:vertical; }
  select { outline:none; }
  textarea:focus, select:focus, input[type="text"]:focus { border-color:${T.actionBase} !important; }
  .fs-line { display:flex; justify-content:space-between; padding:3px 0; font-size:13px; }
  .fs-line:hover { background:#f9fafb; }
  .fs-subtotal { display:flex; justify-content:space-between; padding:5px 0; font-weight:700; border-top:1px solid ${T.textPrimary}; margin-top:4px; font-size:13px; }
  .fs-total { display:flex; justify-content:space-between; padding:6px 0; font-weight:700; border-top:2px solid ${T.textPrimary}; border-bottom:3px double ${T.textPrimary}; font-size:14px; }
  .map-row:hover { background:#fafbfc; }
  .node-card { transition:box-shadow 0.15s, border-color 0.15s; }
  ..node-card:hover { box-shadow:0 4px 16px rgba(74,124,255,0.18) !important; border-color:#4a7cff !important; } 
    .glow-btn { transition: all 0.2s ease-in-out; }
    .glow-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(5,150,105,0.4); }
    .pulse-border { animation: pulseBorder 2s infinite; }
    @keyframes pulseBorder { 0% { box-shadow: 0 0 0 0 rgba(220,53,69,0.4); } 70% { box-shadow: 0 0 0 6px rgba(220,53,69,0); } 100% { box-shadow: 0 0 0 0 rgba(220,53,69,0); } }
    @keyframes flashGreen { 0%{background:rgba(16,185,129,0.35);} 100%{background:transparent;} }
    @keyframes flashPurple { 0%{background:rgba(99,102,241,0.35);} 100%{background:transparent;} }
    @keyframes countDown { 0%{color:#f87171;} 100%{color:#34d399;} }
    @keyframes flashYellow { 0%{background:rgba(251,191,36,0.45);} 100%{background:rgba(251,191,36,0.15);} }
    .flash-green { animation: flashGreen 0.8s ease forwards; }
    .flash-purple { animation: flashPurple 0.8s ease forwards; }
    .count-down { animation: countDown 0.6s ease forwards; }
    .flash-yellow { animation: flashYellow 0.8s ease forwards; }
}`;

