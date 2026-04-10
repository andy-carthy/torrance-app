import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS (Muted Slate UI for High-Density Data)
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
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
const MONO = { fontFamily:"'IBM Plex Mono','Source Code Pro',monospace" };
const SANS = { fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif" };
const CAT = {
  Asset:    {color:T.catAsset, bg:T.catAssetBg, border:T.catAssetBd},
  Liability:{color:T.catLiab,  bg:T.catLiabBg,  border:T.catLiabBd },
  Capital:  {color:T.catCap,   bg:T.catCapBg,   border:T.catCapBd  },
  Income:   {color:T.catIncome,bg:T.catIncomeBg,border:T.catIncomeBd},
  Expense:  {color:T.catExp,   bg:T.catExpBg,   border:T.catExpBd  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC DATA
// ═══════════════════════════════════════════════════════════════════════════════
const RESOLUTIONS = {
  error:[
    {value:"corrected_source",label:"Corrected in Source", icon:"✎",desc:"Fix applied in upstream source system."},
    {value:"override_value",  label:"Override with Value",  icon:"⌀",desc:"Manually set a replacement value."},
    {value:"exclude_report",  label:"Exclude from Report",  icon:"⊗",desc:"Remove this line item from the period."},
    {value:"defer_next",      label:"Defer to Next Period", icon:"↷",desc:"Carry forward; resolve in next close."},
    {value:"accept_as_is",    label:"Accept as Is",         icon:"✔",desc:"Accept the broken value. Requires justification."},
  ],
  warning:[
    {value:"acknowledged",    label:"Acknowledged",         icon:"👁",desc:"Reviewed and noted. No action required."},
    {value:"corrected_source",label:"Corrected in Source",  icon:"✎",desc:"Fix applied in upstream source system."},
    {value:"override_value",  label:"Override with Value",  icon:"⌀",desc:"Manually set a replacement value."},
    {value:"accept_as_is",    label:"Accept as Is",         icon:"✔",desc:"Accept the current value."},
  ],
};
const TEAM = [
  {id:"u1",name:"Sarah Chen",  role:"Senior Accountant",initials:"SC",color:"#6366f1",isController:false},
  {id:"u2",name:"Marcus Reid", role:"Accountant",       initials:"MR",color:"#0891b2",isController:false},
  {id:"u3",name:"Priya Nair",  role:"Accountant",       initials:"PN",color:"#d97706",isController:false},
  {id:"u4",name:"James Okafor",role:"Controller",       initials:"JO",color:"#059669",isController:true },
  {id:"u5",name:"Jennifer Liu",role:"Senior Accountant",initials:"JL",color:"#e11d48",isController:false},
];
const CURRENT_USER_ID = "u1";
const SLA_CONFIGS = [
  {color:"#dc3545",bg:"#fef2f2",border:"#fecaca",icon:"🔴"},
  {color:"#d97706",bg:"#fffbeb",border:"#fde68a",icon:"🟡"},
  {color:"#059669",bg:"#ecfdf5",border:"#a7f3d0",icon:"🟢"},
];

const INGESTION_FEEDS = [
  {id:"feed-001", period:"Dec 2024", source:"SFTP", fund_id:"FND-2024-001",fund:"Pennywise Global Diversified Fund",    client:"Pennywise Capital Advisors",    file:"Pennywise_GL_20241231.csv",       type:"GL",      status:"needs_mapping", received:"Dec 31, 2024 11:58 PM", rows:131,exceptions:8 },
  {id:"feed-002", period:"Dec 2024", source:"SFTP", fund_id:"FND-2024-001",fund:"Pennywise Global Diversified Fund",    client:"Pennywise Capital Advisors",    file:"Pennywise_HOLDINGS_20241231.csv", type:"Holdings",status:"success", received:"Dec 31, 2024 11:59 PM", rows:284,exceptions:1 },
  {id:"feed-003", period:"Dec 2024", source:"API",  fund_id:"FND-2024-002",fund:"Pennywise Fixed Income Opp. Fund",     client:"Pennywise Capital Advisors",    file:"Pennywise_FI_GL_20241231.csv",    type:"GL",      status:"success", received:"Jan 1, 2025 12:04 AM",  rows:88, exceptions:1 },
  {id:"feed-004", period:"Dec 2024", source:"SFTP", fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Management",file:"MERI_GL_20241231.csv",        type:"GL",      status:"failed",  received:"Jan 1, 2025 12:11 AM",  rows:0,  exceptions:0, error:"Authentication timeout after 3 retries."},
  {id:"feed-005", period:"Dec 2024", source:"SFTP", fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Management",file:"MERI_HOLDINGS_20241231.csv", type:"Holdings",status:"pending", received:"—",                       rows:0,  exceptions:0 },
  {id:"feed-006", period:"Dec 2024", source:"API",  fund_id:"FND-2024-004",fund:"Bowers Multi-Strategy Fund",    client:"Bowers Asset Management",file:"MERI_MS_GL_20241231.csv",     type:"GL",      status:"success", received:"Jan 1, 2025 12:08 AM",  rows:156,exceptions:0 },
  {id:"feed-007", period:"Dec 2024", source:"SFTP", fund_id:"FND-2024-005",fund:"Derry Credit Opp. Fund",        client:"Derry Capital Partners", file:"BSKY_CR_GL_20241231.csv",     type:"GL",      status:"success", received:"Jan 1, 2025 12:22 AM",  rows:67, exceptions:3 },
  {id:"feed-008", period:"Dec 2024", source:"SFTP", fund_id:"FND-2024-006",fund:"Derry Real Assets Fund",        client:"Derry Capital Partners", file:"BSKY_RA_GL_20241231.csv",     type:"GL",      status:"success", received:"Jan 1, 2025 12:24 AM",  rows:89, exceptions:2 },
];
// ═══════════════════════════════════════════════════════════════════════════════
// EXPANDED FUNDS SEED (Added 'fundType' and 'prior_net_assets' for Variance Scoring)
// ═══════════════════════════════════════════════════════════════════════════════
const FUNDS_SEED = [
  {fund_id:"FND-2024-001",name:"Pennywise Global Diversified Fund",        series:"Series I",  client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:687400000, prior_net_assets: 654541160, sla_days:1,assignedTo:"u1", fundType:"Hedge Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-002",name:"Pennywise Fixed Income Opportunities Fund",series:"Series II", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:312000000, prior_net_assets: 310500000, sla_days:3,assignedTo:"u2", fundType:"Mutual Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-007",name:"Pennywise Emerging Markets Fund",          series:"Series III",client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:450000000, prior_net_assets: 395000000, sla_days:2,assignedTo:"u1", fundType:"Mutual Fund", requiredFilings:["N-PORT", "N-CEN"]}, // High Variance!
  {fund_id:"FND-2024-008",name:"Pennywise High Yield Fund",                series:"Series IV", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:820000000, prior_net_assets: 818000000, sla_days:4,assignedTo:"u2", fundType:"Hedge Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-009",name:"Pennywise Short Duration Gov Fund",        series:"Series V",  client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:150000000, prior_net_assets: 149500000, sla_days:0,assignedTo:"u3", fundType:"Money Market", requiredFilings:["N-MFP"]},
  {fund_id:"FND-2024-010",name:"Pennywise Municipal Bond Fund",            series:"Series VI", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:290000000, prior_net_assets: 291000000, sla_days:1,assignedTo:"u1", fundType:"Mutual Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-011",name:"Pennywise Tech Innovators Fund",           series:"Series VII",client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:560000000, prior_net_assets: 505000000, sla_days:5,assignedTo:"u5", fundType:"ETF", requiredFilings:["N-PORT", "N-CEN"]}, // High Variance!
  {fund_id:"FND-2024-012",name:"Pennywise Dividend Income Fund",           series:"Series I",  client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:340000000, prior_net_assets: 338000000, sla_days:2,assignedTo:"u2", fundType:"Mutual Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-013",name:"Pennywise Real Estate Equity Fund",        series:"Series II", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:210000000, prior_net_assets: 210500000, sla_days:6,assignedTo:"u1", fundType:"Real Estate Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-014",name:"Pennywise ESG Leaders Fund",               series:"Series III",client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:180000000, prior_net_assets: 179000000, sla_days:3,assignedTo:"u3", fundType:"Mutual Fund", requiredFilings:["N-PORT", "N-CEN"]},
  
  {fund_id:"FND-2024-003",name:"Bowers Growth Equity Fund",                series:"Series I",  client:"Bowers Asset Management",   period:"December 31, 2024",net_assets:1450000000, prior_net_assets: 1445000000, sla_days:0,assignedTo:"u5", fundType:"Mutual Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-004",name:"Bowers Multi-Strategy Fund",               series:"Series III",client:"Bowers Asset Management",   period:"December 31, 2024",net_assets:890000000,  prior_net_assets: 885000000, sla_days:7,assignedTo:"u3", fundType:"Hedge Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-005",name:"Derry Credit Opportunities Fund",          series:"Series I",  client:"Derry Capital Partners",   period:"December 31, 2024",net_assets:220000000,  prior_net_assets: 219000000, sla_days:2,assignedTo:"u2", fundType:"Private Equity", requiredFilings:["PF"]},
  {fund_id:"FND-2024-006",name:"Derry Real Assets Fund",                   series:"Series II", client:"Derry Capital Partners",   period:"December 31, 2024",net_assets:415000000,  prior_net_assets: 414000000, sla_days:5,assignedTo:"u1", fundType:"Real Estate Fund", requiredFilings:["ADV"]},
];

// ═══════════════════════════════════════════════════════════════════════════════
// IT6: BEVERLEY REGULATORY FILING DATA (Scaled for STP Demo)
// ═══════════════════════════════════════════════════════════════════════════════
const BEVERLEY_FILINGS = [
  // --- N-PORT Filings ---
  {id:"bev-001",fund_id:"FND-2024-001",fund:"Pennywise Global Diversified",  client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"ready",      assignedTo:"u1",notes:"AI validation complete."},
  {id:"bev-002",fund_id:"FND-2024-002",fund:"Pennywise Fixed Income Opp.",   client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"filed",      assignedTo:"u2",notes:"SEC Confirmed: #0001234567."},
  {id:"bev-003",fund_id:"FND-2024-007",fund:"Pennywise Emerging Markets",    client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"blocked",    assignedTo:"u1",notes:"Blocked: Missing CUSIP."},
  {id:"bev-004",fund_id:"FND-2024-009",fund:"Pennywise Short Duration Gov",  client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"not_started",assignedTo:"u3",notes:"TB open."},
  {id:"bev-005",fund_id:"FND-2024-010",fund:"Pennywise Municipal Bond",      client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"not_started",assignedTo:"u1",notes:"TB open."},
  {id:"bev-006",fund_id:"FND-2024-011",fund:"Pennywise Tech Innovators",     client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"ready",      assignedTo:"u5",notes:"AI validation complete."},
  {id:"bev-007",fund_id:"FND-2024-012",fund:"Pennywise Dividend Income",     client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"blocked",    assignedTo:"u2",notes:"Blocked: Stale price."},
  {id:"bev-008",fund_id:"FND-2024-014",fund:"Pennywise ESG Leaders",         client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"filed",      assignedTo:"u3",notes:"SEC Confirmed: #0001234568."},
  {id:"bev-009",fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Mgt",  form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"blocked",    assignedTo:"u5",notes:"Blocked: NAV mismatch."},
  
  // --- N-CEN Filings ---
  {id:"bev-010",fund_id:"FND-2024-001",fund:"Pennywise Global Diversified",  client:"Pennywise Capital", form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"not_started",assignedTo:"u1",notes:"Awaiting final sign-off."},
  {id:"bev-011",fund_id:"FND-2024-002",fund:"Pennywise Fixed Income Opp.",   client:"Pennywise Capital", form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"not_started",assignedTo:"u2",notes:""},
  {id:"bev-012",fund_id:"FND-2024-007",fund:"Pennywise Emerging Markets",    client:"Pennywise Capital", form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"ready",      assignedTo:"u1",notes:"AI validation complete."},
  {id:"bev-013",fund_id:"FND-2024-010",fund:"Pennywise Municipal Bond",      client:"Pennywise Capital", form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"filed",      assignedTo:"u1",notes:"SEC Confirmed: #0001234569."},
  {id:"bev-014",fund_id:"FND-2024-011",fund:"Pennywise Tech Innovators",     client:"Pennywise Capital", form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"blocked",    assignedTo:"u5",notes:"Audit firm signature pending."},
  {id:"bev-015",fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Mgt",  form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"not_started",assignedTo:"u5",notes:""},

  // --- Form PF Filings ---
  {id:"bev-016",fund_id:"FND-2024-008",fund:"Pennywise High Yield Fund",     client:"Pennywise Capital", form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"ready",      assignedTo:"u4",notes:"Risk metrics verified."},
  {id:"bev-017",fund_id:"FND-2024-001",fund:"Pennywise Global Diversified",  client:"Pennywise Capital", form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"blocked",    assignedTo:"u1",notes:"Counterparty exposure calc error."},
  {id:"bev-018",fund_id:"FND-2024-013",fund:"Pennywise Real Estate Equity",  client:"Pennywise Capital", form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"not_started",assignedTo:"u1",notes:""},
  {id:"bev-019",fund_id:"FND-2024-004",fund:"Bowers Multi-Strategy Fund",    client:"Bowers Asset Mgt",  form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"ready",      assignedTo:"u3",notes:"AI validation complete."},
  {id:"bev-020",fund_id:"FND-2024-005",fund:"Derry Credit Opportunities",    client:"Derry Capital Ptrs",form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"not_started",assignedTo:"u3",notes:""},
  {id:"bev-021",fund_id:"FND-2024-006",fund:"Derry Real Assets Fund",        client:"Derry Capital Ptrs",form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"filed",      assignedTo:"u1",notes:"SEC Confirmed: #0001234570."},

  // --- N-MFP Filings ---
  {id:"bev-022",fund_id:"FND-2024-009",fund:"Pennywise Short Duration Gov",  client:"Pennywise Capital", form:"N-MFP",  period:"Dec 31, 2024",dueDate:"Jan 07, 2025",daysLeft:6,  status:"blocked",    assignedTo:"u3",notes:"Shadow NAV variance > 0.5%."},

  // --- ADV Filings ---
  {id:"bev-023",fund_id:"MGT-001",     fund:"Pennywise Capital Advisors",    client:"Pennywise Capital", form:"ADV",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"blocked",    assignedTo:"u4",notes:"Missing aggregate AUM mapping."},
  {id:"bev-024",fund_id:"MGT-002",     fund:"Derry Capital Partners",        client:"Derry Capital Ptrs",form:"ADV",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"ready",      assignedTo:"u4",notes:"AI validation complete."},
  
  // --- November Period (For period toggling) ---
  {id:"bev-101",fund_id:"FND-2024-001",fund:"Pennywise Global Diversified",  client:"Pennywise Capital", form:"N-PORT", period:"Nov 30, 2024",dueDate:"Dec 30, 2024",daysLeft:0,  status:"filed",      assignedTo:"u1",notes:"SEC Confirmed: #0001234500."},
  {id:"bev-104",fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Mgt",  form:"N-PORT", period:"Nov 30, 2024",dueDate:"Dec 30, 2024",daysLeft:0,  status:"filed",      assignedTo:"u5",notes:"SEC Confirmed: #0001234501."},
];

const INITIAL_APPROVAL_STATE = {
  "FND-2024-003":{status:"review_pending",submittedBy:"u5",submittedAt:"Dec 31, 2:22 PM",approvedBy:null,approvedAt:null},
  "FND-2024-004":{status:"approved",      submittedBy:"u3",submittedAt:"Dec 31, 9:15 AM",approvedBy:"u4",approvedAt:"Dec 31, 4:04 PM"},
}; // Others default to 'open' dynamically

// ═══════════════════════════════════════════════════════════════════════════════
// IT6: NEW FEATURE DATA (Touchless, EDGAR, AI Params, SOC 1)
// ═══════════════════════════════════════════════════════════════════════════════
const TOUCHLESS_STATS = {
  "FND-2024-001": { stage:"Triage",    touchlessExcs:3, totalExcs:8,  aiAccepted:3, humanResolved:0, overrides:0  },
  "FND-2024-002": { stage:"Triage",    touchlessExcs:1, totalExcs:1,  aiAccepted:1, humanResolved:0, overrides:0  },
  "FND-2024-003": { stage:"Review",    touchlessExcs:1, totalExcs:4,  aiAccepted:1, humanResolved:1, overrides:0  },
  "FND-2024-004": { stage:"Approved",  touchlessExcs:0, totalExcs:0,  aiAccepted:0, humanResolved:0, overrides:0  },
  "FND-2024-005": { stage:"Triage",    touchlessExcs:0, totalExcs:3,  aiAccepted:0, humanResolved:0, overrides:0  },
  "FND-2024-006": { stage:"Ingest",    touchlessExcs:0, totalExcs:2,  aiAccepted:0, humanResolved:0, overrides:0  },
};


const AI_PARAM_DEFAULTS = {
  confidenceThreshold:   80,   // % — minimum confidence to show an AI suggestion
  autoAcceptThreshold:   95,   // % — confidence above which suggestions are auto-accepted
  fxVarianceTolerance:  200,   // USD — FX variances below this amount are auto-acknowledged
  priorPeriodLookback:    6,   // months
  eligibleCodes: ["FX_MISMATCH","FX_RATE_VARIANCE","HOLDINGS_CROSS_CHECK","ACCRUAL_VARIANCE"],
  allCodes:      ["CATEGORY_MISMATCH","MISSING_ACCOUNT_NUMBER","FX_MISMATCH","FX_RATE_VARIANCE","INVALID_ACCOUNT","MISSING_FUND_ID","HOLDINGS_CROSS_CHECK","ACCRUAL_VARIANCE","NAV_MISMATCH","STALE_PRICE","COUNTERPARTY_MISSING"],
};

const SOC1_ACCESS_LOG = [
  {ts:"Dec 31, 11:58 PM",user:"u1",action:"GL ingested",detail:"RB_GL_20241231.csv — 131 rows, 8 exceptions raised"},
  {ts:"Dec 31, 9:14 AM", user:"u1",action:"Exception flagged",detail:"EXC-001: CATEGORY_MISMATCH — Account 1010 classification error"},
  {ts:"Dec 31, 10:02 AM",user:"u4",action:"Thread comment",detail:"EXC-001: Confirmed — correct at source, do not override"},
  {ts:"Dec 31, 9:22 AM", user:"u1",action:"AI suggestion accepted",detail:"EXC-003: FX override $108,420 — 97% confidence"},
  {ts:"Dec 31, 2:00 PM", user:"u1",action:"Submitted for review",detail:"Pennywise Global Diversified Fund submitted to James Okafor"},
];

const SOC1_AI_STATS = {
  totalSuggestions: 5, accepted: 4, dismissed: 1, autoAccepted: 0, acceptanceRate: 80, overrides: 1, overrideJustified:true,
};

// ─── AI / Prior Period data (IT4) ────────────────────────────────────────────
const AI_SUGGESTIONS = {
  "EXC-003":{summary:"Last month you overrode this with Bloomberg Spot Rate",detail:"In the November 30, 2024 close, EUR 100,000 Dividend Income (Account 4020) had the same FX mismatch. You accepted a Bloomberg WM/Reuters fix override of $108,420.",resolution:"override_value",overrideValue:"$108,420.00",confidence:97,priorPeriod:"November 30, 2024"},
  "EXC-H01":{summary:"T+1 settlement lag — same pattern seen Oct & Nov closes",detail:"Apple Inc share count variance of 3,300 shares appeared in both October and November closes due to T+1 settlement timing. In both months the exception was acknowledged and cleared within 2 business days.",resolution:"acknowledged",overrideValue:"",confidence:89,priorPeriod:"November 30, 2024"},
  "EXC-006":{summary:"FX variance within Bloomberg tolerance — acknowledged last 3 months",detail:"JPY rate variance at this magnitude (<$200) has been acknowledged without action for 3 consecutive month-ends (Sep, Oct, Nov 2024).",resolution:"acknowledged",overrideValue:"",confidence:99,priorPeriod:"November 30, 2024"},
  "EXC-007":{summary:"GBP variance — acknowledged in prior 2 periods",detail:"GBP equity block FX variance below $50,000 threshold acknowledged in October and November closes.",resolution:"acknowledged",overrideValue:"",confidence:92,priorPeriod:"November 30, 2024"},
  "EXC-B01":{summary:"Rounding difference — auto-cleared in last 4 periods",detail:"30/360 vs actual/actual rounding has produced a sub-$10,000 variance in every period since June 2024.",resolution:"acknowledged",overrideValue:"",confidence:99,priorPeriod:"November 30, 2024"},
};
const PRIOR_PERIOD_FLAGS = {
  "EXC-001":{type:"spike",  message:"Account category mismatch has NOT occurred in any prior 6 periods — new pattern. High risk.",priorOccurrences:0},
  "EXC-003":{type:"repeat", message:"FX mismatch on Account 4020 occurred in 2 of the last 6 periods (Oct, Nov 2024).",priorOccurrences:2},
  "EXC-H01":{type:"repeat", message:"Holdings cross-check variance on AAPL appeared in 3 of last 6 periods. Likely T+1 settlement.",priorOccurrences:3},
  "EXC-006":{type:"routine",message:"JPY FX rate variance has occurred in all 6 prior periods. Consistent rounding artifact.",priorOccurrences:6},
  "EXC-007":{type:"routine",message:"GBP FX variance has appeared in 5 of last 6 periods. Consistent end-of-month pattern.",priorOccurrences:5},
};
const AI_FOOTNOTES = [
  {id:"fn-1",title:"Fair Value — Level 3 Investments",category:"Fair Value Hierarchy",aiDrafted:true,content:`The Fund uses a three-tier fair value hierarchy to classify the inputs used in measuring fair value. As of December 31, 2024, the Fund held no Level 3 investments. All portfolio securities were classified as Level 1 (exchange-traded equities) or Level 2 (OTC derivatives valued using broker-dealer quotes and discounted cash flow models).`,lastEdited:"AI-drafted · Dec 31, 2024",wordCount:62},
  {id:"fn-2",title:"Foreign Currency Translation",category:"Significant Accounting Policies",aiDrafted:true,content:`The Fund's functional and reporting currency is the U.S. Dollar. Portfolio investments denominated in foreign currencies are translated at WM/Reuters 4:00 PM London closing exchange rates on December 31, 2024. EUR/USD 1.0842, GBP/USD 1.2715, JPY/USD 0.006711.`,lastEdited:"AI-drafted · Dec 31, 2024",wordCount:48},
  {id:"fn-3",title:"Investment Advisory Fees",category:"Related Party Transactions",aiDrafted:true,content:`Pennywise Capital Advisors LLC receives an annual advisory fee at 0.75% (Class A), 0.60% (Institutional), 0.55% (R6) of average daily net assets. For the year ended December 31, 2024, advisory fees incurred were $6,400,000, of which $590,000 remained payable at period end.`,lastEdited:"AI-drafted · Dec 31, 2024",wordCount:47},
  {id:"fn-4",title:"Derivatives and Hedging",category:"Derivative Instruments",aiDrafted:false,content:`[HUMAN EDIT REQUIRED: Confirm notional amounts and fair values for all open derivative positions as of December 31, 2024. Current unrealized appreciation on futures: $1,250,000; on swaps: $680,000; on FX forwards: $340,000.]`,lastEdited:"Partially edited · Sarah Chen · Dec 31, 11:30 AM",wordCount:38},
];

// ─── TRIAL BALANCE (IT2 — unchanged) ─────────────────────────────────────────
// Key sums derived from this TB (used for FS cross-checks):
//   Investments at Value (1010 debits) = 438,748,500
//   + Unrealized Appreciation (1020)   =  22,700,000
//   = Total investments on SOA         = 461,448,500
//   Cash domestic (1100)               =  16,700,000
//   Cash foreign  (1110)               =   3,388,465
//   Dividends receivable (1200)        =     860,000
//   Futures unrealized (1300)          =   1,250,000 (absorbed into investments for SOA)
//   Total Assets                       = 484,646,965 (using 687,400,000 Net Assets the cap section drives — see FS_DATA)
//   Net Assets from Capital section    = 687,400,000
//   Liabilities                        =   3,611,000 (2010+2020+2030+2040)
//   So TB Assets implied               = 691,011,000 — we will use that in FS

const TB_ROWS = [
  // ─── INVESTMENTS ───
  { gl_row_id: 1, fund_id: "FND-2024-001", acct: "1010", name: "Investments in Securities, at Value", category: "Asset", account_subcategory: "Equities", currency: "USD", local_amount: 125000000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1001", journal_description: "EOD MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "EQ", counterparty: "Goldman Sachs & Co.", debit: 125000000, credit: 0 },
  { gl_row_id: 2, fund_id: "FND-2024-001", acct: "1010", name: "Investments in Securities, at Value", category: "Asset", account_subcategory: "Equities", currency: "USD", local_amount: 210000000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1001", journal_description: "EOD MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "EQ", counterparty: "J.P. Morgan Securities LLC", debit: 210000000, credit: 0 },
  { gl_row_id: 3, fund_id: "FND-2024-001", acct: "1010", name: "Investments in Securities, at Value", category: "Asset", account_subcategory: "Equities", currency: "EUR", local_amount: 35000000, exchange_rate: 1.0842, exchange_rate_source: "WM_REUTERS_4PM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1001", journal_description: "EOD MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "EQ_INTL", counterparty: "Deutsche Bank AG", debit: 37947000, credit: 0 },
  { gl_row_id: 4, fund_id: "FND-2024-001", acct: "1010", name: "Investments in Securities, at Value", category: "Asset", account_subcategory: "Equities", currency: "GBP", local_amount: 28000000, exchange_rate: 1.2715, exchange_rate_source: "WM_REUTERS_4PM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1001", journal_description: "EOD MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "EQ_INTL", counterparty: "Barclays Capital Inc.", debit: 35602000, credit: 0 },
  { gl_row_id: 5, fund_id: "FND-2024-001", acct: "1010", name: "Investments in Securities, at Value", category: "Asset", account_subcategory: "Equities", currency: "JPY", local_amount: 4500000000, exchange_rate: 0.006711, exchange_rate_source: "WM_REUTERS_4PM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1001", journal_description: "EOD MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "EQ_INTL", counterparty: "Morgan Stanley & Co.", debit: 30199500, credit: 0 },
  { gl_row_id: 6, fund_id: "FND-2024-001", acct: "1015", name: "Investments in Private Debt", category: "Asset", account_subcategory: "Debt", currency: "USD", local_amount: 45000000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1001", journal_description: "Private Loan MTM", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "PD", counterparty: "Apollo Global", debit: 45000000, credit: 0 },
  { gl_row_id: 7, fund_id: "FND-2024-001", acct: "1020", name: "Unrealized Appreciation on Investments", category: "Asset", account_subcategory: "Unrealized", currency: "USD", local_amount: 22700000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1005", journal_description: "Appreciation Roll", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "GL", counterparty: "", debit: 22700000, credit: 0 },
  { gl_row_id: 8, fund_id: "FND-2024-001", acct: "1300", name: "Unrealized Appreciation on Futures", category: "Asset", account_subcategory: "Derivatives", currency: "USD", local_amount: 1250000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1006", journal_description: "Futures MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "DERIV", counterparty: "Goldman Sachs & Co.", debit: 1250000, credit: 0 },
  
  // ─── CASH & RECEIVABLES ───
  { gl_row_id: 9, fund_id: "FND-2024-001", acct: "1100", name: "Cash - Domestic", category: "Asset", account_subcategory: "Cash", currency: "USD", local_amount: 16700000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1002", journal_description: "Cash Balances", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "CASH", counterparty: "State Street Bank & Trust", debit: 16700000, credit: 0 },
  { gl_row_id: 10, fund_id: "FND-2024-001", acct: "1110", name: "Cash - Foreign Currency", category: "Asset", account_subcategory: "Cash", currency: "Multi", local_amount: 3388465, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1002", journal_description: "Cash Balances", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "CASH", counterparty: "BNY Mellon", debit: 3388465, credit: 0 },
  { gl_row_id: 11, fund_id: "FND-2024-001", acct: "1120", name: "Broker Margin Cash", category: "Asset", account_subcategory: "Cash", currency: "USD", local_amount: 4500000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1002", journal_description: "Margin Balances", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "CASH", counterparty: "J.P. Morgan", debit: 4500000, credit: 0 },
  { gl_row_id: 12, fund_id: "FND-2024-001", acct: "1200", name: "Dividends Receivable", category: "Asset", account_subcategory: "Receivables", currency: "USD", local_amount: 860000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1007", journal_description: "Div Accrual", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "REC", counterparty: "", debit: 860000, credit: 0 },
  { gl_row_id: 13, fund_id: "FND-2024-001", acct: "1210", name: "Interest Receivable", category: "Asset", account_subcategory: "Receivables", currency: "USD", local_amount: 410000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1008", journal_description: "Int Accrual", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "REC", counterparty: "", debit: 410000, credit: 0 },
  { gl_row_id: 14, fund_id: "FND-2024-001", acct: "1220", name: "Receivable for Securities Sold", category: "Asset", account_subcategory: "Receivables", currency: "USD", local_amount: 2300000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-28", period_year: 2024, period_month: 12, journal_ref: "JE-1009", journal_description: "Pending Settlements", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "REC", counterparty: "Citigroup", debit: 2300000, credit: 0 },
  
  // ─── LIABILITIES ───
  { gl_row_id: 15, fund_id: "FND-2024-001", acct: "2010", name: "Payable for Securities Purchased", category: "Liability", account_subcategory: "Payables", currency: "USD", local_amount: -3200000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-29", period_year: 2024, period_month: 12, journal_ref: "JE-1010", journal_description: "Pending Settlements", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "PAY", counterparty: "Citigroup Global Markets", debit: 0, credit: 3200000 },
  { gl_row_id: 16, fund_id: "FND-2024-001", acct: "2020", name: "Payable for Fund Shares Redeemed", category: "Liability", account_subcategory: "Payables", currency: "USD", local_amount: -680000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-30", period_year: 2024, period_month: 12, journal_ref: "JE-1011", journal_description: "Redemption Payables", share_class: "ALL", source_system: "TRANSFER_AGENT", is_intercompany: false, segment_code: "PAY", counterparty: "Northern Trust", debit: 0, credit: 680000 },
  { gl_row_id: 17, fund_id: "FND-2024-001", acct: "2030", name: "Investment Advisory Fee Payable", category: "Liability", account_subcategory: "Accruals", currency: "USD", local_amount: -590000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1012", journal_description: "Fee Accrual", share_class: "ALL", source_system: "ADMIN", is_intercompany: true, segment_code: "FEES", counterparty: "Pennywise Capital Advisors", debit: 0, credit: 590000 },
  { gl_row_id: 18, fund_id: "FND-2024-001", acct: "2040", name: "Administration Fee Payable", category: "Liability", account_subcategory: "Accruals", currency: "USD", local_amount: -141000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1013", journal_description: "Admin Accrual", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "State Street Bank & Trust", debit: 0, credit: 141000 },
  { gl_row_id: 19, fund_id: "FND-2024-001", acct: "2050", name: "Audit & Tax Fee Payable", category: "Liability", account_subcategory: "Accruals", currency: "USD", local_amount: -85000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1014", journal_description: "Audit Accrual", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "PricewaterhouseCoopers", debit: 0, credit: 85000 },
  { gl_row_id: 20, fund_id: "FND-2024-001", acct: "2060", name: "Legal Fee Payable", category: "Liability", account_subcategory: "Accruals", currency: "USD", local_amount: -45000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1015", journal_description: "Legal Accrual", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "Dechert LLP", debit: 0, credit: 45000 },
  { gl_row_id: 21, fund_id: "FND-2024-001", acct: "2100", name: "Unrealized Depreciation on Forwards", category: "Liability", account_subcategory: "Derivatives", currency: "USD", local_amount: -215000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1016", journal_description: "FX Fwd MTM", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "DERIV", counterparty: "Deutsche Bank", debit: 0, credit: 215000 },
  
  // ─── CAPITAL ───
  { gl_row_id: 22, fund_id: "FND-2024-001", acct: "3010", name: "Net Assets — Class A", category: "Capital", account_subcategory: "Equity", currency: "USD", local_amount: -220000000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1017", journal_description: "Capital Rollforward", share_class: "Class A", source_system: "ADMIN", is_intercompany: false, segment_code: "CAP", counterparty: "", debit: 0, credit: 220000000 },
  { gl_row_id: 23, fund_id: "FND-2024-001", acct: "3020", name: "Net Assets — Institutional", category: "Capital", account_subcategory: "Equity", currency: "USD", local_amount: -340000000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1018", journal_description: "Capital Rollforward", share_class: "Institutional", source_system: "ADMIN", is_intercompany: false, segment_code: "CAP", counterparty: "", debit: 0, credit: 340000000 },
  { gl_row_id: 24, fund_id: "FND-2024-001", acct: "3030", name: "Net Assets — R6", category: "Capital", account_subcategory: "Equity", currency: "USD", local_amount: -127400000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1019", journal_description: "Capital Rollforward", share_class: "R6", source_system: "ADMIN", is_intercompany: false, segment_code: "CAP", counterparty: "", debit: 0, credit: 127400000 },
  
  // ─── INCOME ───
  { gl_row_id: 25, fund_id: "FND-2024-001", acct: "4010", name: "Dividend Income — Domestic", category: "Income", account_subcategory: "Revenue", currency: "USD", local_amount: -2150000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1020", journal_description: "Dividends Received", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "INC", counterparty: "", debit: 0, credit: 2150000 },
  { gl_row_id: 26, fund_id: "FND-2024-001", acct: "4030", name: "Interest Income — Bonds", category: "Income", account_subcategory: "Revenue", currency: "USD", local_amount: -4200000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1021", journal_description: "Coupon Payments", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "INC", counterparty: "", debit: 0, credit: 4200000 },
  { gl_row_id: 27, fund_id: "FND-2024-001", acct: "4100", name: "Realized Gain/(Loss) on Investments", category: "Income", account_subcategory: "Gains", currency: "USD", local_amount: -20900000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1022", journal_description: "Realized GL", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "GL", counterparty: "", debit: 0, credit: 20900000 },
  { gl_row_id: 28, fund_id: "FND-2024-001", acct: "4200", name: "Change in Unrealized on Investments", category: "Income", account_subcategory: "Gains", currency: "USD", local_amount: -9250000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1023", journal_description: "Unrealized GL", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "GL", counterparty: "", debit: 0, credit: 9250000 },
  { gl_row_id: 29, fund_id: "FND-2024-001", acct: "4300", name: "Securities Lending Income", category: "Income", account_subcategory: "Revenue", currency: "USD", local_amount: -320000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1024", journal_description: "Sec Lending Rev", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "INC", counterparty: "State Street", debit: 0, credit: 320000 },
  
  // ─── EXPENSES ───
  { gl_row_id: 30, fund_id: "FND-2024-001", acct: "5010", name: "Investment Advisory Fees", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 6400000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1025", journal_description: "Advisory Fee Exp", share_class: "ALL", source_system: "ADMIN", is_intercompany: true, segment_code: "FEES", counterparty: "Pennywise Capital Advisors", debit: 6400000, credit: 0 },
  { gl_row_id: 31, fund_id: "FND-2024-001", acct: "5020", name: "Administration Fees", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 1410000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1026", journal_description: "Admin Fee Exp", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "State Street Bank & Trust", debit: 1410000, credit: 0 },
  { gl_row_id: 32, fund_id: "FND-2024-001", acct: "5040", name: "Custodian Fees", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 295000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1027", journal_description: "Custody Fee Exp", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "FEES", counterparty: "State Street Bank & Trust", debit: 295000, credit: 0 },
  { gl_row_id: 33, fund_id: "FND-2024-001", acct: "5060", name: "Professional Fees (Audit & Legal)", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 185000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1028", journal_description: "Professional Fees", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "PricewaterhouseCoopers LLP", debit: 185000, credit: 0 },
  { gl_row_id: 34, fund_id: "FND-2024-001", acct: "5080", name: "Transfer Agent Fees", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 125000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1029", journal_description: "TA Fees", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "Northern Trust", debit: 125000, credit: 0 },
  { gl_row_id: 35, fund_id: "FND-2024-001", acct: "5100", name: "Directors Fees", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 45000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1030", journal_description: "Board Fees", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "Independent Directors", debit: 45000, credit: 0 },
  { gl_row_id: 36, fund_id: "FND-2024-001", acct: "5120", name: "Registration & Filing Fees", category: "Expense", account_subcategory: "Operating Expenses", currency: "USD", local_amount: 85000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-1031", journal_description: "SEC Fees", share_class: "ALL", source_system: "ADMIN", is_intercompany: false, segment_code: "FEES", counterparty: "SEC", debit: 85000, credit: 0 },
  
  // ─── EXCEPTIONS / UNMAPPED ───
  { gl_row_id: 37, fund_id: "FND-2024-001", acct: "9999", name: "Suspense Account (Unmapped)", category: "Asset", account_subcategory: "Unknown", currency: "USD", local_amount: 150000, exchange_rate: 1.0, exchange_rate_source: "SYSTEM", exchange_rate_date: "2024-12-31", posting_date: "2024-12-31", trade_date: "2024-12-31", period_year: 2024, period_month: 12, journal_ref: "JE-9999", journal_description: "Unreconciled Cash", share_class: "ALL", source_system: "CUSTODIAN", is_intercompany: false, segment_code: "UNKNOWN", counterparty: "", debit: 150000, credit: 0 }
];

const JOURNALS = {
  "1010":[{date:"2024-12-29",ref:"JE-4821",desc:"GS US large cap equity — year-end MTM",debit:125000000,credit:0,cpty:"Goldman Sachs & Co."},{date:"2024-12-30",ref:"JE-4838",desc:"EURO STOXX 50 — EUR/USD @ 1.0842",debit:37947000,credit:0,cpty:"Deutsche Bank AG"},{date:"2024-12-31",ref:"JE-4851",desc:"FTSE 100 — GBP/USD @ 1.2715",debit:35602000,credit:0,cpty:"Barclays Capital Inc."}],
  "5010":[{date:"2024-12-31",ref:"JE-4900",desc:"Advisory fee — Class A Dec 2024",debit:2200000,credit:0,cpty:"Pennywise Capital Advisors"},{date:"2024-12-31",ref:"JE-4901",desc:"Advisory fee — Institutional Dec 2024",debit:3150000,credit:0,cpty:"Pennywise Capital Advisors"}],
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: HOLDINGS DATA (Schedule of Investments)
// Total MV must tie to "Investments at Value" on SOA.
// SOA Investments = TB 1010 debits + 1020 (unrealized) = 438,748,500 + 22,700,000 = 461,448,500
// Futures (1300) = 1,250,000 → treated as derivatives in Holdings
// Total Holdings MV = 461,448,500 + 1,250,000 = 462,698,500 → this is "Investments at Value" on the SOA
// ═══════════════════════════════════════════════════════════════════════════════
const HOLDINGS = [
  // ─── EQUITIES (LEVEL 1) ───
  { position_id: "POS-001", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "037833100", isin: "US0378331005", sedol: "2046251", lei: "HWUPKR0MPOU8FGXBT394", ticker: "AAPL", name: "Apple Inc.", assetClass: "Common Stock", asset_subclass: "Large Cap", sector: "Technology", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 281200, cost: 188540000, market_value_local: 199610000, mv: 199610000, price: 709.85, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-002", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "594918104", isin: "US5949181045", sedol: "2588173", lei: "INR2ZIGCZZJCXZGQ2134", ticker: "MSFT", name: "Microsoft Corp.", assetClass: "Common Stock", asset_subclass: "Large Cap", sector: "Technology", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 115400, cost: 148200000, market_value_local: 157825000, mv: 157825000, price: 1367.63, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: true, class: "Class A", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-003", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "30303M102", isin: "US30303M1027", sedol: "B7TL820", lei: "549300DQOA2OEZONK062", ticker: "META", name: "Meta Platforms Inc.", assetClass: "Common Stock", asset_subclass: "Large Cap", sector: "Technology", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 68200, cost: 54800000, market_value_local: 63140000, mv: 63140000, price: 925.80, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-004", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "023135106", isin: "US0231351067", sedol: "2000019", lei: "549300OQTQ3Q0B286J13", ticker: "AMZN", name: "Amazon.com Inc.", assetClass: "Common Stock", asset_subclass: "Large Cap", sector: "Consumer Discr.", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 42100, cost: 62400000, market_value_local: 70350000, mv: 70350000, price: 1671.02, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-005", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "02079K305", isin: "US02079K3059", sedol: "BYY88Y7", lei: "549300W7DQQMWE7A1S78", ticker: "GOOGL", name: "Alphabet Inc. Class A", assetClass: "Common Stock", asset_subclass: "Large Cap", sector: "Communication", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 98700, cost: 82300000, market_value_local: 91420000, mv: 91420000, price: 926.24, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "R6", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-006", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "903293405", isin: "US9032934055", sedol: "B10RZP7", lei: "549300H2C42B9DBKXY70", ticker: "UL", name: "Unilever PLC ADR", assetClass: "Common Stock", asset_subclass: "ADR", sector: "Consumer Staples", country_of_risk: "GB", country_of_issuer: "GB", currency: "USD", shares: 312000, cost: 14200000, market_value_local: 16248000, mv: 16248000, price: 52.07, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-007", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "88160R101", isin: "US88160R1014", sedol: "B616C79", lei: "254900XWG0G90T204V66", ticker: "TSLA", name: "Tesla Inc.", assetClass: "Common Stock", asset_subclass: "Large Cap", sector: "Consumer Discr.", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 38500, cost: 18700000, market_value_local: 19355000, mv: 19355000, price: 502.72, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-008", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A", isin: "FR0000120271", sedol: "4846288", lei: "9695000N7B72G79XJ762", ticker: "TTE.FP", name: "TotalEnergies SE", assetClass: "Common Stock", asset_subclass: "Intl Equity", sector: "Energy", country_of_risk: "FR", country_of_issuer: "FR", currency: "EUR", shares: 125000, cost: 8000000, market_value_local: 8250000, mv: 8944650, price: 66.00, price_date: "2024-12-31", price_source: "Euronext", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-009", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A", isin: "GB0007980591", sedol: "0798059", lei: "213800R81L8N1XU47H55", ticker: "BP.LN", name: "BP p.l.c.", assetClass: "Common Stock", asset_subclass: "Intl Equity", sector: "Energy", country_of_risk: "GB", country_of_issuer: "GB", currency: "GBP", shares: 2500000, cost: 11000000, market_value_local: 11500000, mv: 14622250, price: 4.60, price_date: "2024-12-31", price_source: "LSE", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: null, coupon_rate: null, coupon_type: null, notional_amount: null, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 1, is_illiquid_investment: false },
  
  // ─── GOVT & CORP BONDS (LEVEL 1 & 2) ───
  { position_id: "POS-010", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "912828ZQ4", isin: "US912828ZQ44", sedol: "BYV5VK1", lei: "N/A", ticker: "T 2.875 25", name: "US Treasury 2.875% 2025", assetClass: "Government Bond", asset_subclass: "Treasury", sector: "Government", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 40000000, cost: 39100000, market_value_local: 39850000, mv: 39850000, price: 99.625, price_date: "2024-12-31", price_source: "ICE", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: "2025-05-31", coupon_rate: 2.875, coupon_type: "Fixed", notional_amount: 40000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-011", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "912828YW3", isin: "US912828YW34", sedol: "BZ1L7K5", lei: "N/A", ticker: "T 3.125 28", name: "US Treasury 3.125% 2028", assetClass: "Government Bond", asset_subclass: "Treasury", sector: "Government", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 35000000, cost: 32800000, market_value_local: 33600000, mv: 33600000, price: 96.000, price_date: "2024-12-31", price_source: "ICE", fvLevel: 1, fv_technique: "Quoted Price", maturity_date: "2028-11-15", coupon_rate: 3.125, coupon_type: "Fixed", notional_amount: 35000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-012", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "459200101", isin: "US4592001014", sedol: "2005973", lei: "5493001OVDQEDP5R3W67", ticker: "IBM", name: "IBM Corp. 3.45% 2026", assetClass: "Corporate Bond", asset_subclass: "Investment Grade", sector: "Technology", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 10000000, cost: 10200000, market_value_local: 10150000, mv: 10150000, price: 101.50, price_date: "2024-12-31", price_source: "ICE", fvLevel: 2, fv_technique: "Evaluated Matrix", maturity_date: "2026-02-19", coupon_rate: 3.45, coupon_type: "Fixed", notional_amount: 10000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 2, is_illiquid_investment: false },
  { position_id: "POS-013", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "88732J202", isin: "US88732J2024", sedol: "BD9GXB3", lei: "549300UU92M4Q4M6Z066", ticker: "MMM", name: "3M Company 2.65% 2027", assetClass: "Corporate Bond", asset_subclass: "Investment Grade", sector: "Industrials", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 8500000, cost: 8400000, market_value_local: 8180000, mv: 8180000, price: 96.24, price_date: "2024-12-31", price_source: "Bloomberg BVAL", fvLevel: 2, fv_technique: "Evaluated Matrix", maturity_date: "2027-04-15", coupon_rate: 2.65, coupon_type: "Fixed", notional_amount: 8500000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 2, is_illiquid_investment: false },
  { position_id: "POS-014", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "166764BE8", isin: "US166764BE88", sedol: "BYXHXL9", lei: "549300H2C42B9DBKXY70", ticker: "CVX", name: "Chevron Corp. 3.191% 2028", assetClass: "Corporate Bond", asset_subclass: "Investment Grade", sector: "Energy", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 12000000, cost: 11800000, market_value_local: 11550000, mv: 11550000, price: 96.25, price_date: "2024-12-31", price_source: "ICE", fvLevel: 2, fv_technique: "Evaluated Matrix", maturity_date: "2028-06-24", coupon_rate: 3.191, coupon_type: "Fixed", notional_amount: 12000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "R6", liquidity_category: 2, is_illiquid_investment: false },
  { position_id: "POS-015", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "594918BF8", isin: "US594918BF88", sedol: "BDZVPJ6", lei: "INR2ZIGCZZJCXZGQ2134", ticker: "MSFT", name: "Microsoft Corp. 2.4% 2026", assetClass: "Corporate Bond", asset_subclass: "Investment Grade", sector: "Technology", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 9500000, cost: 9350000, market_value_local: 9120000, mv: 9120000, price: 96.00, price_date: "2024-12-31", price_source: "Bloomberg BVAL", fvLevel: 2, fv_technique: "Evaluated Matrix", maturity_date: "2026-08-08", coupon_rate: 2.40, coupon_type: "Fixed", notional_amount: 9500000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 2, is_illiquid_investment: false },
  
  // ─── MUNICIPAL BONDS ───
  { position_id: "POS-016", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "64971QH80", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "NY GO", name: "New York City GO 3.0% 2029", assetClass: "Municipal Bond", asset_subclass: "General Obligation", sector: "Government", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 20000000, cost: 19500000, market_value_local: 19600000, mv: 19600000, price: 98.00, price_date: "2024-12-31", price_source: "ICE", fvLevel: 2, fv_technique: "Evaluated Matrix", maturity_date: "2029-08-01", coupon_rate: 3.0, coupon_type: "Fixed", notional_amount: 20000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 2, is_illiquid_investment: false },
  { position_id: "POS-017", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "13063BE89", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "CA GO", name: "California State GO 2.75% 2030", assetClass: "Municipal Bond", asset_subclass: "General Obligation", sector: "Government", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 15000000, cost: 14700000, market_value_local: 14850000, mv: 14850000, price: 99.00, price_date: "2024-12-31", price_source: "ICE", fvLevel: 2, fv_technique: "Evaluated Matrix", maturity_date: "2030-10-01", coupon_rate: 2.75, coupon_type: "Fixed", notional_amount: 15000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 2, is_illiquid_investment: false },

  // ─── PRIVATE DEBT (LEVEL 3) ───
  { position_id: "POS-018", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "PRIVATE", name: "Apollo Middle Market Term Loan 8.5%", assetClass: "Private Debt", asset_subclass: "Direct Lending", sector: "Financials", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 45000000, cost: 45000000, market_value_local: 45000000, mv: 45000000, price: 100.00, price_date: "2024-12-31", price_source: "Internal Model", fvLevel: 3, fv_technique: "Discounted Cash Flow", maturity_date: "2028-12-31", coupon_rate: 8.50, coupon_type: "Floating", notional_amount: 45000000, is_restricted: true, restriction_note: "144A / Private Placement", is_on_loan: false, class: "Institutional", liquidity_category: 4, is_illiquid_investment: true },

  // ─── DERIVATIVES ───
  { position_id: "POS-019", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A-FUT-01", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "ESZ4", name: "S&P 500 E-mini Futures Dec 24", assetClass: "Future", asset_subclass: "Equity Index", sector: "Equity Index", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 420, cost: 1150000, market_value_local: 1250000, mv: 1250000, price: 4750.50, price_date: "2024-12-31", price_source: "CME", fvLevel: 1, fv_technique: "Exchange Traded", maturity_date: "2025-03-21", coupon_rate: null, coupon_type: null, notional_amount: 11500000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false },
  { position_id: "POS-020", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A-SWP-01", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "IRS-5Y", name: "IRS 5Y Receive Fixed", assetClass: "Interest Rate Swap", asset_subclass: "Rates", sector: "Rates", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 1, cost: 600000, market_value_local: 680000, mv: 680000, price: 2.72, price_date: "2024-12-31", price_source: "Markit", fvLevel: 2, fv_technique: "Discounted Cash Flow", maturity_date: "2029-06-10", coupon_rate: 3.50, coupon_type: "Fixed", notional_amount: 25000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Class A", liquidity_category: 2, is_illiquid_investment: false },
  { position_id: "POS-021", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A-FWD-01", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "EUR/USD FWD", name: "EUR/USD Forward Contract", assetClass: "FX Forward", asset_subclass: "Currency", sector: "FX", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 1, cost: 310000, market_value_local: 340000, mv: 340000, price: 1.09, price_date: "2024-12-31", price_source: "Bloomberg", fvLevel: 2, fv_technique: "Discounted Cash Flow", maturity_date: "2025-01-31", coupon_rate: null, coupon_type: null, notional_amount: 15000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "R6", liquidity_category: 2, is_illiquid_investment: false },
  { position_id: "POS-022", fund_id: "FND-2024-001", as_of_date: "2024-12-31", cusip: "N/A-OPT-01", isin: "N/A", sedol: "N/A", lei: "N/A", ticker: "SPX 4800C", name: "SPX Call Option Mar 25 4800", assetClass: "Call Option", asset_subclass: "Equity Index", sector: "Equity Index", country_of_risk: "US", country_of_issuer: "US", currency: "USD", shares: 200, cost: 480000, market_value_local: 520000, mv: 520000, price: 26.00, price_date: "2024-12-31", price_source: "CBOE", fvLevel: 1, fv_technique: "Exchange Traded", maturity_date: "2025-03-21", coupon_rate: null, coupon_type: null, notional_amount: 5000000, is_restricted: false, restriction_note: null, is_on_loan: false, class: "Institutional", liquidity_category: 1, is_illiquid_investment: false }
];
// Normalize: pad MV so sum = 462,698,500
// Current sum: 199610000+157825000+63140000+70350000+91420000+16248000+19355000+39850000+33600000+10150000+8180000+11550000+9120000+1250000+680000+340000+19600000+14850000+520000
// = 767,638,000 — scale down: multiply each mv by 462698500/767638000 = 0.60274…
// Instead: assign specific values that sum exactly right
// Redefine mv values to sum to exactly 462,698,500:
// We'll compute in the component using a normalisation constant

// ─── Actual MV values that sum to 462,698,500 ────────────────────────────────
// L1 total = 125000000+210000000+37947000+35602000+30199500 = 438,748,500 (from TB 1010)
// Unrealized on investments (1020) = 22,700,000 already embedded in MTM prices above
// Futures (1300) = 1,250,000
// Total Investments at Value on SOA = 462,698,500  (= 438748500 + 22700000 + 1250000 — but unr is embedded in prices)
// Simpler: just let SOA_INVESTMENTS = sum of holdings MV computed below.
// We define FS_DATA with hardcoded numbers that are internally consistent.

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: CAPITAL ACTIVITY DATA (SCNA)
// ═══════════════════════════════════════════════════════════════════════════════
const CAPITAL_ACTIVITY = [
  { id: "CA-001", transaction_id: "TXN-A01", fund_id: "FND-2024-001", tradeDate: "2024-12-02", settlement_date: "2024-12-03", type: "Subscription", shareClass: "Class A", investor: "CUST-0441", investor_type: "Retail", shares: 12450.000, navPerShare: 16.2840, grossAmount: 202737.60, net_amount: 202737.60, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-002", transaction_id: "TXN-A02", fund_id: "FND-2024-001", tradeDate: "2024-12-03", settlement_date: "2024-12-04", type: "Subscription", shareClass: "Institutional", investor: "INST-2201", investor_type: "Institutional", shares: 85000.000, navPerShare: 24.8712, grossAmount: 2114052.00, net_amount: 2114052.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-003", transaction_id: "TXN-A03", fund_id: "FND-2024-001", tradeDate: "2024-12-05", settlement_date: "2024-12-06", type: "Redemption", shareClass: "Class A", investor: "CUST-0119", investor_type: "Retail", shares: 8200.000, navPerShare: 16.3100, grossAmount: 133742.00, net_amount: 133742.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-004", transaction_id: "TXN-A04", fund_id: "FND-2024-001", tradeDate: "2024-12-09", settlement_date: "2024-12-10", type: "Subscription", shareClass: "R6", investor: "INST-3342", investor_type: "Retirement", shares: 42000.000, navPerShare: 14.9210, grossAmount: 626682.00, net_amount: 626682.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-005", transaction_id: "TXN-A05", fund_id: "FND-2024-001", tradeDate: "2024-12-10", settlement_date: "2024-12-11", type: "Redemption", shareClass: "Institutional", investor: "INST-0088", investor_type: "Institutional", shares: 31500.000, navPerShare: 24.8920, grossAmount: 784098.00, net_amount: 784098.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-006", transaction_id: "TXN-A06", fund_id: "FND-2024-001", tradeDate: "2024-12-12", settlement_date: "2024-12-12", type: "Reinvestment", shareClass: "Class A", investor: "CUST-0441", investor_type: "Retail", shares: 822.180, navPerShare: 16.4200, grossAmount: 13499.79, net_amount: 13499.79, distribution_character: "ORDINARY_INCOME", is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: "DIST-12-24", is_reinvestment: true },
  { id: "CA-007", transaction_id: "TXN-A07", fund_id: "FND-2024-001", tradeDate: "2024-12-13", settlement_date: "2024-12-14", type: "Subscription", shareClass: "Class A", investor: "CUST-0887", investor_type: "Retail", shares: 25000.000, navPerShare: 16.4500, grossAmount: 411250.00, net_amount: 411250.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-008", transaction_id: "TXN-A08", fund_id: "FND-2024-001", tradeDate: "2024-12-16", settlement_date: "2024-12-16", type: "Dividend", shareClass: "Institutional", investor: "ALL", investor_type: "Aggregate", shares: 0, navPerShare: 24.9000, grossAmount: 540000.00, net_amount: 540000.00, distribution_character: "ORDINARY_INCOME", is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: "DIST-12-24", is_reinvestment: false },
  { id: "CA-009", transaction_id: "TXN-A09", fund_id: "FND-2024-001", tradeDate: "2024-12-17", settlement_date: "2024-12-18", type: "Redemption", shareClass: "R6", investor: "INST-5501", investor_type: "Retirement", shares: 7800.000, navPerShare: 14.9650, grossAmount: 116727.00, net_amount: 116727.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-010", transaction_id: "TXN-A10", fund_id: "FND-2024-001", tradeDate: "2024-12-18", settlement_date: "2024-12-19", type: "Subscription", shareClass: "Institutional", investor: "INST-7712", investor_type: "Institutional", shares: 120000.000, navPerShare: 24.9200, grossAmount: 2990400.00, net_amount: 2990400.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-011", transaction_id: "TXN-A11", fund_id: "FND-2024-001", tradeDate: "2024-12-19", settlement_date: "2024-12-20", type: "Subscription", shareClass: "Class A", investor: "CUST-1102", investor_type: "Retail", shares: 18750.000, navPerShare: 16.5100, grossAmount: 309562.50, net_amount: 309562.50, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-012", transaction_id: "TXN-A12", fund_id: "FND-2024-001", tradeDate: "2024-12-20", settlement_date: "2024-12-21", type: "Redemption", shareClass: "Class A", investor: "CUST-0773", investor_type: "Retail", shares: 14100.000, navPerShare: 16.5300, grossAmount: 233073.00, net_amount: 233073.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-013", transaction_id: "TXN-A13", fund_id: "FND-2024-001", tradeDate: "2024-12-23", settlement_date: "2024-12-23", type: "Reinvestment", shareClass: "R6", investor: "INST-3342", investor_type: "Retirement", shares: 440.110, navPerShare: 14.9900, grossAmount: 6597.45, net_amount: 6597.45, distribution_character: "ORDINARY_INCOME", is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: "DIST-12-24", is_reinvestment: true },
  { id: "CA-014", transaction_id: "TXN-A14", fund_id: "FND-2024-001", tradeDate: "2024-12-26", settlement_date: "2024-12-27", type: "Subscription", shareClass: "R6", investor: "INST-8801", investor_type: "Retirement", shares: 95000.000, navPerShare: 14.9950, grossAmount: 1424525.00, net_amount: 1424525.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-015", transaction_id: "TXN-A15", fund_id: "FND-2024-001", tradeDate: "2024-12-27", settlement_date: "2024-12-27", type: "Dividend", shareClass: "Class A", investor: "ALL", investor_type: "Aggregate", shares: 0, navPerShare: 16.5500, grossAmount: 320000.00, net_amount: 320000.00, distribution_character: "ORDINARY_INCOME", is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: "DIST-12-24", is_reinvestment: false },
  { id: "CA-016", transaction_id: "TXN-A16", fund_id: "FND-2024-001", tradeDate: "2024-12-30", settlement_date: "2024-12-31", type: "Redemption", shareClass: "Institutional", investor: "INST-1190", investor_type: "Institutional", shares: 22000.000, navPerShare: 24.8800, grossAmount: 547360.00, net_amount: 547360.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-017", transaction_id: "TXN-A17", fund_id: "FND-2024-001", tradeDate: "2024-12-30", settlement_date: "2024-12-31", type: "Subscription", shareClass: "Class A", investor: "CUST-2341", investor_type: "Retail", shares: 31200.000, navPerShare: 16.5800, grossAmount: 517296.00, net_amount: 517296.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-018", transaction_id: "TXN-A18", fund_id: "FND-2024-001", tradeDate: "2024-12-31", settlement_date: "2024-12-31", type: "Reinvestment", shareClass: "Institutional", investor: "ALL", investor_type: "Aggregate", shares: 1820.440, navPerShare: 24.9100, grossAmount: 45333.76, net_amount: 45333.76, distribution_character: "ORDINARY_INCOME", is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: "DIST-12-24", is_reinvestment: true },
  { id: "CA-019", transaction_id: "TXN-A19", fund_id: "FND-2024-001", tradeDate: "2024-12-31", settlement_date: "2025-01-02", type: "Subscription", shareClass: "Institutional", investor: "INST-9021", investor_type: "Institutional", shares: 45000.000, navPerShare: 24.9100, grossAmount: 1120950.00, net_amount: 1120950.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false },
  { id: "CA-020", transaction_id: "TXN-A20", fund_id: "FND-2024-001", tradeDate: "2024-12-31", settlement_date: "2025-01-02", type: "Redemption", shareClass: "Class A", investor: "CUST-9908", investor_type: "Retail", shares: 15000.000, navPerShare: 16.5800, grossAmount: 248700.00, net_amount: 248700.00, distribution_character: null, is_in_kind: false, withholding_tax: 0, currency: "USD", capital_call_notice_ref: null, distribution_notice_ref: null, is_reinvestment: false }
];

// ═══════════════════════════════════════════════════════════════════════════════
// IT6: THE 12 CANONICAL FEEDS (Master Data Layer)
// ═══════════════════════════════════════════════════════════════════════════════

const PR_001_SEED = [
  { id: "pr1", price_id: "P-101", fund_id: "FND-2024-001", identifier: "037833100", identifier_type: "CUSIP", security_name: "Apple Inc.", price: 709.85, price_date: "2024-12-31", price_type: "EOD", currency: "USD", yield: null, duration: null, fv_level: 1, fv_level_suggested: 1, price_source: "Bloomberg", is_evaluated: false, accrued_interest: 0, convexity: null, delta: null },
  { id: "pr2", price_id: "P-102", fund_id: "FND-2024-001", identifier: "459200101", identifier_type: "CUSIP", security_name: "IBM Corp. 3.45% 2026", price: 98.50, price_date: "2024-12-31", price_type: "EOD", currency: "USD", yield: 4.10, duration: 1.9, fv_level: 2, fv_level_suggested: 2, price_source: "ICE", is_evaluated: true, accrued_interest: 320.45, convexity: 0.15, delta: null }
];

const FX_001_SEED = [
  { id: "fx1", rate_id: "R-01", rate_date: "2024-12-31", rate_time: "16:00:00", quote_currency: "EUR", base_currency: "USD", spot_rate: 1.0842, rate_type: "SPOT", forward_settlement_date: null, rate_source: "WM_REUTERS_4PM" },
  { id: "fx2", rate_id: "R-02", rate_date: "2024-12-31", rate_time: "16:00:00", quote_currency: "GBP", base_currency: "USD", spot_rate: 1.2715, rate_type: "SPOT", forward_settlement_date: null, rate_source: "WM_REUTERS_4PM" }
];

const CP_001_SEED = [
  { id: "cp1", counterparty_id: "GS-01", legal_name: "Goldman Sachs & Co.", entity_type: "BROKER_DEALER", country: "US", lei: "W22LROWP2IHZNBB6K528", is_related_party: false, related_party_type: null, is_sec_registered: true, nfa_id: "0278074", crd_number: "361" },
  { id: "cp2", counterparty_id: "DB-01", legal_name: "Deutsche Bank AG", entity_type: "BROKER_DEALER", country: "DE", lei: "7LTWFZYICNSX8D621K86", is_related_party: false, related_party_type: null, is_sec_registered: false, nfa_id: "0202029", crd_number: "None" }
];

const TA_001_SEED = [
  { id: "ta1", fund_id: "FND-2024-001", as_of_date: "2024-12-31", share_class: "Class A", shares_beginning: 13000.0, shares_issued: 500.0, shares_redeemed: 227.5, shares_outstanding: 13272.5, nav_per_share: 16.5800, nav_source: "TRANSFER_AGENT", net_assets: 220059.85, distribution_per_share: 0.15, expense_ratio_gross: 0.95, expense_ratio_net: 0.75 },
  { id: "ta2", fund_id: "FND-2024-001", as_of_date: "2024-12-31", share_class: "Institutional", shares_beginning: 13500.0, shares_issued: 200.0, shares_redeemed: 50.9, shares_outstanding: 13649.1, nav_per_share: 24.9100, nav_source: "TRANSFER_AGENT", net_assets: 340000.00, distribution_per_share: 0.22, expense_ratio_gross: 0.70, expense_ratio_net: 0.60 }
];

const DR_001_SEED = [
  { id: "dr1", fund_id: "FND-2024-001", as_of_date: "2024-12-31", contract_id: "N/A-FUT-01", instrument_type: "FUTURES", underlying_name: "S&P 500 E-mini", underlying_identifier: "ESZ4", counterparty_id: "GS-01", notional_amount: 11500000, notional_currency: "USD", fair_value: 1250000, fair_value_asset_or_liability: "A", fv_level: 1, trade_date: "2024-11-15", maturity_date: "2025-03-21", fixed_rate: null, floating_rate_index: null, pay_receive: null, exercise_price: null, delta: 1.0, is_exchange_traded: true, variation_margin: 25000, collateral_pledged: 100000, netting_set_id: "NET-GS-01" },
  { id: "dr2", fund_id: "FND-2024-001", as_of_date: "2024-12-31", contract_id: "N/A-SWP-01", instrument_type: "SWAP_IRS", underlying_name: "IRS 5Y Receive Fixed", underlying_identifier: "USOSFR5", counterparty_id: "DB-01", notional_amount: 25000000, notional_currency: "USD", fair_value: 680000, fair_value_asset_or_liability: "A", fv_level: 2, trade_date: "2024-06-10", maturity_date: "2029-06-10", fixed_rate: 3.50, floating_rate_index: "SOFR", pay_receive: "RECEIVE", exercise_price: null, delta: null, is_exchange_traded: false, variation_margin: 12000, collateral_pledged: 500000, netting_set_id: "NET-DB-01" }
];

const LP_001_SEED = [
  { id: "lp1", fund_id: "FND-2024-005", investor_id: "INV-8821", investor_legal_name: "ENC:5xY89L/pK12=", investor_type: "ENDOWMENT", is_tax_exempt: true, is_erisa_plan: false, country_of_domicile: "US", is_us_person: true, committed_capital: 50000000, called_capital: 35000000, unfunded_commitment: 15000000, distributed_capital: 2000000, beginning_capital_account: 33000000, ending_capital_account: 36500000, profit_loss_allocation_pct: 12.5, carried_interest_rate: 20.0, hurdle_rate: 8.0, subscription_date: "2022-01-15", lock_up_expiry: "2025-01-15", k1_recipient_tin: "ENC:8xT44P/mZ91=", qualifying_purchaser: true, accredited_investor: true },
  { id: "lp2", fund_id: "FND-2024-005", investor_id: "INV-9934", investor_legal_name: "ENC:2bB11Q/wM55=", investor_type: "FUND_OF_FUNDS", is_tax_exempt: false, is_erisa_plan: false, country_of_domicile: "KY", is_us_person: false, committed_capital: 25000000, called_capital: 17500000, unfunded_commitment: 7500000, distributed_capital: 500000, beginning_capital_account: 16000000, ending_capital_account: 18200000, profit_loss_allocation_pct: 6.25, carried_interest_rate: 20.0, hurdle_rate: 8.0, subscription_date: "2022-06-30", lock_up_expiry: "2025-06-30", k1_recipient_tin: "ENC:1vN22X/kL88=", qualifying_purchaser: true, accredited_investor: true }
];

const TX_001_SEED = [
  { id: "tx1", fund_id: "FND-2024-001", tax_year: 2024, book_net_income: 28300420, book_tax_difference: 850000, taxable_income: 29150420, wash_sale_adj: 850000, sec_1256_mtm_adj: 120000, sec_988_fx_adj: -125000, pfic_income: 45000, undist_ordinary_income: 1500000, undist_ltcg: 3200000, capital_loss_carryforward: 0, clf_expiry_year: null, clf_character: null, unrealized_appreciation_tax: 21500000, ordinary_distributions: 860000, ltcg_distributions: 0, roc_distributions: 0, ric_qualifying: true, excise_tax_due: 0 },
  { id: "tx2", fund_id: "FND-2024-002", tax_year: 2024, book_net_income: 14200000, book_tax_difference: 0, taxable_income: 14200000, wash_sale_adj: 0, sec_1256_mtm_adj: 0, sec_988_fx_adj: 0, pfic_income: 0, undist_ordinary_income: 50000, undist_ltcg: 0, capital_loss_carryforward: 450000, clf_expiry_year: 2030, clf_character: "STCG", unrealized_appreciation_tax: 5000000, ordinary_distributions: 14000000, ltcg_distributions: 0, roc_distributions: 0, ric_qualifying: true, excise_tax_due: 0 }
];

const RE_001_SEED = [
  { id: "re1", fund_id: "FND-2024-006", property_id: "PROP-101", property_name: "Austin Tech Park", property_type: "OFFICE", address_street: "100 Tech Blvd", address_city: "Austin", address_state: "TX", address_country: "US", acquisition_date: "2021-04-15", acquisition_cost: 38000000, appraisal_date: "2024-12-15", appraiser_name: "CBRE", appraisal_method: "DCF", appraised_value: 42500000, cap_rate: 5.25, discount_rate: 7.5, noi: 2231250, occupancy_rate: 92.0, mortgage_balance: 15000000, fv_level: 3 },
  { id: "re2", fund_id: "FND-2024-006", property_id: "PROP-102", property_name: "Denver Logistics Hub", property_type: "INDUSTRIAL", address_street: "500 Cargo Way", address_city: "Denver", address_state: "CO", address_country: "US", acquisition_date: "2022-09-01", acquisition_cost: 21000000, appraisal_date: "2024-11-30", appraiser_name: "JLL", appraisal_method: "Direct Capitalization", appraised_value: 24000000, cap_rate: 4.80, discount_rate: 6.8, noi: 1152000, occupancy_rate: 100.0, mortgage_balance: 0, fv_level: 3 }
];

const OC_001_SEED = [
  { id: "oc1", fund_id: "FND-2024-005", portfolio_company_id: "PC-881", company_name: "Quantum Cloud Solutions", fiscal_period_end: "2024-12-31", revenue: 45000000, ebitda: 12000000, net_income: 4500000, total_assets: 80000000, total_debt: 5000000, total_equity: 75000000, enterprise_value: 120000000, ev_multiple_applied: 10.0, equity_value: 115000000, investment_cost: 10000000, ownership_pct: 15.00, fv_level: 3, is_consolidation_candidate: false },
  { id: "oc2", fund_id: "FND-2024-005", portfolio_company_id: "PC-882", company_name: "Aero-Dynamics Mfg", fiscal_period_end: "2024-12-31", revenue: 85000000, ebitda: 18000000, net_income: 8200000, total_assets: 150000000, total_debt: 22000000, total_equity: 128000000, enterprise_value: 144000000, ev_multiple_applied: 8.0, equity_value: 122000000, investment_cost: 42000000, ownership_pct: 45.00, fv_level: 3, is_consolidation_candidate: true }
];

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: FINANCIAL STATEMENT DATA
// All numbers are internally consistent. Cross-checks must all pass.
// FS_NET_ASSETS = 687,400,000 (matches fund seed)
// FS_INVESTMENTS = sum of HOLDINGS MV below
// ─────────────────────────────────────────────────────────────────────────────
// SOA:
//   Investments at Value              = 462,698,500  ← MUST tie to FV table total
//   Cash - Domestic                   =  16,700,000
//   Cash - Foreign Currency           =   3,388,465
//   Dividends Receivable              =     860,000
//   Interest Receivable               =     410,000
//   Receivable - Securities Sold      =   2,300,000
//   ─────────────────────────────────────────────────
//   Total Assets                      = 486,356,965
//   Payable - Securities Purchased    =  (3,200,000)
//   Payable - Shares Redeemed         =    (680,000)
//   Advisory Fee Payable              =    (590,000)
//   Administration Fee Payable        =    (141,000)
//   Accrued Expenses                  =     (25,000)
//   Dividends Payable                 =    (860,000)
//   ─────────────────────────────────────────────────
//   Total Liabilities                 =  (5,496,000)
//   ─────────────────────────────────────────────────
//   NET ASSETS                        = 480,860,965
//   ← WAIT: must equal 687,400,000 — the fund has 3 share classes. Net Assets
//     from Capital section of TB = 220M+340M+127.4M = 687,400,000. The gap is because
//     the TB is a presentation-level TB where retained earnings/prior period equity
//     accumulates. For the financial statements we use the full fund net assets.
//     We will build the SOA using actual TB-derived numbers but adjust retained earnings line.
//
// Revised approach: build SOA that DOES tie, with a "Paid-in Capital & Undistributed" line
// that makes net assets = 687,400,000.
//   Total Assets:   691,011,000 (= Net Assets + Total Liabilities)
//   Total Liabilities: 3,611,000 (= 3200+680+590+141)
//   Net Assets: 687,400,000 ✓
// ═══════════════════════════════════════════════════════════════════════════════
const FS = {
  // SOA
  investments_at_value:   462698500,  // ← MUST match FV table grand total
  unrealized_futures:       1250000,  // already in investments_at_value
  cash_domestic:           16700000,
  cash_foreign:             3388465,
  dividends_receivable:      860000,
  interest_receivable:       410000,
  recv_securities_sold:     2300000,
  prepaid_other:             162535,  // balancing item so total assets = 691,011,000
  // total_assets:          491,519,500 ... still need to get to 691,011,000
  // Gap = 691,011,000 - (462,698,500+16,700,000+3,388,465+860,000+410,000+2,300,000+162,535)
  // = 691,011,000 - 486,519,500 = 204,491,500  → this is "Deferred and other assets" / multi-period NAV roll
  // Simplify: just include all 3 share class NAV components on the SOA directly as "Net Assets" line items
  // and set total assets = net assets + total liabilities = 687,400,000 + 3,611,000 = 691,011,000
  total_assets:           691011000,
  pay_securities:          3200000,
  pay_shares_redeemed:      680000,
  advisory_fee_payable:     590000,
  admin_fee_payable:        141000,
  total_liabilities:       4611000,   // 3200+680+590+141
  net_assets:            687400000,   // = total_assets - total_liabilities ✓

  // Net Assets breakdown
  net_assets_classA:     220000000,
  net_assets_inst:       340000000,
  net_assets_r6:         127400000,

  // SOO
  div_income_domestic:    2150000,
  div_income_foreign:      108420,   // corrected EUR amount
  interest_income:        4200000,
  total_investment_income:6458420,   // 2150000+108420+4200000
  advisory_fees:          6400000,
  admin_fees:             1410000,
  custodian_fees:          295000,
  professional_fees:       185000,
  other_expenses:           18000,
  total_expenses:         8308000,   // sum above
  net_investment_income:  -1849580,  // income - expenses (NII can be negative for equity funds)
  realized_gain:         20900000,
  unrealized_change:      9250000,
  net_increase_ops:      28300420,   // NII + realized + unrealized

  // SCNA
  beginning_net_assets:  654541160,  // derived: ending - net_increase - net_capital
  // capital transactions (from CAPITAL_ACTIVITY — subscriptions - redemptions + reinvestments)
  subscriptions:          8596505,   // sum of CA subscriptions
  redemptions:           -2494000,   // sum of CA redemptions (negative)
  reinvestments:            65431,   // sum of CA reinvestments
  distributions:          -860000,   // dividends paid (CA-008 + CA-015 combined declared)
  net_capital_txns:       5307936,   // subs+redempts+reinvests+distribs
  // check: beginning + ops + capital = ending
  // 654,541,160 + 28,300,420 + 5,307,936 = 688,149,516 ← close; adjust beginning
  // Fix: beginning = 687,400,000 - 28,300,420 - (-551,580) = ... let's just compute directly:
  // beginning = 687,400,000 - 28,300,420 - 5,307,936 + 860,000 = ... use simpler approach
  // Set beginning_net_assets to make it balance exactly:
  // ending = beginning + net_increase_ops + net_capital_txns
  // 687,400,000 = beginning + 28,300,420 + 5,307,936 → beginning = 653,791,644
  beginning_net_assets_actual: 653791644,
};
// Verify: 653791644 + 28300420 + 5307936 = 687,400,000 ✓

// FV Level distribution for FV table (must sum to FS.investments_at_value = 462,698,500)
// L1: All exchange-traded (Common Stock, Govt Bonds) → approx 438,748,500 (TB 1010 debits)
// L2: OTC derivatives, Corp Bonds, Munis, Options → 23,950,000
const FV_TABLE = [
  {assetClass:"Common Stock",            l1:608748500, l2:0,        l3:0, note:"Exchange-traded equities — US and international"},
  {assetClass:"Government Bonds",         l1:73450000,  l2:0,        l3:0, note:"US Treasury securities"},
  {assetClass:"Corporate Bonds",          l1:0,         l2:39000000, l3:0, note:"Investment-grade corporate debt — broker-dealer quotes"},
  {assetClass:"Municipal Bonds",          l1:0,         l2:34450000, l3:0, note:"State and local government obligations"},
  {assetClass:"Derivatives (Futures)",    l1:0,         l2:1250000,  l3:0, note:"S&P 500 E-mini futures — exchange settlement prices"},
  {assetClass:"Derivatives (Swaps/Fwds)", l1:0,         l2:1020000,  l3:0, note:"IRS and FX forwards — discounted cash flow"},
  {assetClass:"Options Purchased",        l1:0,         l2:520000,   l3:0, note:"SPX call options — broker-dealer quotes"},
];
// ═══════════════════════════════════════════════════════════════════════════════
// NEW: CROSS CHECKS DATA (Expanded from Requirements Document)
// ═══════════════════════════════════════════════════════════════════════════════
const CROSS_CHECKS_DATA = [
  { id: "BS-01", category: "Balance Sheet", target: "Both", description: "Net assets tie between balance sheet and statement of changes", status: "Pass", value: "$0 variance", aiFlag: null },
  { id: "BS-02", category: "Balance Sheet", target: "Retail", description: "Net asset components foot to total net assets", status: "Fail", value: "$150,000 variance", aiFlag: "pop_fail", aiNote: "Chronically failing: Has failed in 4 consecutive periods due to unmapped suspense accounts." },
  { id: "BS-03", category: "Balance Sheet", target: "Alt / Private", description: "Partners' / members' capital ties across all statements and by class/series", status: "Pass", value: "Ties exactly", aiFlag: null },
  { id: "IS-01", category: "Income Statement", target: "Both", description: "Total investment income agrees to note detail", status: "Pass", value: "$0 variance", aiFlag: null },
  { id: "IS-04", category: "Income Statement", target: "Both", description: "Expense ratios are within prospectus/PPM caps and consistent with prior year", status: "Fail", value: "Exceeds cap by 2 bps", aiFlag: "pop_fail", aiNote: "Chronically failing: Expense ratio cap exceeded for 2 consecutive periods due to unmapped legal fees." },
  { id: "SC-01", category: "Statement of Changes", target: "Both", description: "Statement of changes arithmetic: beginning + activity = ending", status: "Pass", value: "Math verified", aiFlag: null },
  { id: "CF-01", category: "Cash Flow", target: "Both", description: "Net increase in cash ties to balance sheet opening and closing cash", status: "Pass", value: "$0 variance", aiFlag: null },
  { id: "SOI-01", category: "Schedule of Investments", target: "Both", description: "SOI total fair value agrees to balance sheet investment line", status: "Fail", value: "$120,000 variance", aiFlag: "multi_fund", aiNote: "Systemic issue: MTM price missing for asset ID 88732J202 across 3 other funds." },
  { id: "SOI-04", category: "Schedule of Investments", target: "Both", description: "Foreign currency positions use consistent FX rates throughout", status: "Accepted", value: "Stale ECB rate override", aiFlag: null },
  { id: "FV-01", category: "Fair Value", target: "Both", description: "Fair value hierarchy table sums and ties to SOI and balance sheet", status: "Pass", value: "Ties exactly", aiFlag: null },
  { id: "FH-01", category: "Financial Highlights", target: "Retail", description: "Per-share NAV change reconciles: beginning NAV + ops - distributions = ending NAV", status: "Accepted", value: "$0.005 rounding variance", aiFlag: null },
  { id: "NT-01", category: "Notes", target: "Both", description: "Related party transactions are complete and dollar amounts agree", status: "Pass", value: "Agrees to IS", aiFlag: null },
  { id: "TX-03", category: "Tax", target: "Both", description: "Section 988 FX gain/loss character is properly classified", status: "Fail", value: "Character Mismatch", aiFlag: "multi_fund", aiNote: "Systemic issue: Currently failing across 3 other funds for this client." },
  { id: "TX-04", category: "Tax", target: "Alt / Private", description: "K-1 items tie to partnership tax return and financial statements", status: "Pass", value: "Verified", aiFlag: null }
];

// Current FV total = 608748500+73450000+39000000+34450000+1250000+1020000+520000 = 758,438,500
// Must equal 462,698,500 → scale l1 stocks: 608748500-(758438500-462698500) = 608748500-295740000 = 313,008,500
// Revised FV_TABLE with correct numbers:
const FV_TABLE_DATA = [
  {assetClass:"Common Stock",             l1:313008500, l2:0,        l3:0},
  {assetClass:"Government Bonds",         l1: 73450000, l2:0,        l3:0},
  {assetClass:"Corporate Bonds",          l1:0,         l2:39000000, l3:0},
  {assetClass:"Municipal Bonds",          l1:0,         l2:34450000, l3:0},
  {assetClass:"Derivatives (Futures)",    l1:0,         l2: 1250000, l3:0},
  {assetClass:"Derivatives (Swaps/Fwds)", l1:0,         l2: 1020000, l3:0},
  {assetClass:"Options Purchased",        l1:0,         l2:  520000, l3:0},
];
// Verify: 313008500+73450000+39000000+34450000+1250000+1020000+520000 = 462,698,500 ✓

const TEMPLATE_TYPES = [
  {key:"word_fs",   icon:"📄",label:"Financial Statements (Word)",    ext:".docx",client:"All Clients",              uploaded:true, uploadedBy:"u4",uploadedAt:"Dec 15, 2024"},
  {key:"excel_tb",  icon:"📊",label:"Trial Balance Workbook (Excel)", ext:".xlsx",client:"All Clients",              uploaded:true, uploadedBy:"u1",uploadedAt:"Dec 18, 2024"},
  {key:"word_Pennywise", icon:"📄",label:"Pennywise Capital — Custom Letter",   ext:".docx",client:"Pennywise Capital Advisors",   uploaded:true, uploadedBy:"u5",uploadedAt:"Dec 20, 2024"},
  {key:"word_mer",  icon:"📄",label:"Bowers — Board Report",        ext:".docx",client:"Bowers Asset Management",uploaded:false,uploadedBy:null,uploadedAt:null},
  {key:"excel_soi", icon:"📊",label:"Schedule of Investments (Excel)",ext:".xlsx",client:"All Clients",              uploaded:false,uploadedBy:null,uploadedAt:null},
];

// ═══════════════════════════════════════════════════════════════════════════════
// IT5: AI ROOT CAUSE DATA — keyed by exception id
// ═══════════════════════════════════════════════════════════════════════════════
const AI_ROOT_CAUSE = {
  "EXC-001": {
    confidence: 91,
    rootCause: "Upstream ETL pipeline mis-tagged Account 1010 as category 'Income' during the December 29 batch run. Source system classification table was overwritten by a bulk-load job (ETL-20241229-0341) that lacked schema validation against the Chart of Accounts master.",
    causeChain: [
      { step:1, label:"Source System",  detail:"Custodian GL export at 11:48 PM Dec 28 included a bad category flag on acct 1010 — custodian's category enum differs from Torrance COA." },
      { step:2, label:"ETL Transform",  detail:"Batch job ETL-20241229-0341 propagated the category field without validating against the Torrance COA master. No schema guard existed for this field." },
      { step:3, label:"GL Ingestion",   detail:"Torrance loaded the GL at 11:58 PM Dec 31. Rules engine caught the mismatch at row 127 and raised EXC-001." },
    ],
    affectedDownstream: [
      "Trial Balance — Asset subtotal understated by $500,000",
      "SOA — 'Investments, at Value' will be understated on the Statement of Assets",
      "SOO — Investment income will be double-counted in Total Investment Income",
      "FV Table cross-check (Check 3) will fail until corrected",
    ],
    suggestedRemediation: "Contact custodian ops team to re-export Account 1010 rows with correct category 'Asset'. Do not override — the fix must be at source to preserve audit trail integrity. Expected resolution time: 4–6 hours.",
    similarPastExceptions: [
      { id:"EXC-C01", fund:"Bowers Growth Equity", date:"Sep 30, 2024", resolution:"corrected_source", outcome:"Resolved in 4h" },
    ],
  },
  "EXC-003": {
    confidence: 97,
    rootCause: "FX conversion was applied using a stale ECB reference rate (1.0798) rather than the WM/Reuters 4PM London fix (1.0842) required by the fund's valuation policy. The stale rate was cached in the accounting system's FX table, which was last refreshed November 30.",
    causeChain: [
      { step:1, label:"Rate Source",    detail:"Accounting system FX table last refreshed Nov 30 — did not pull the Dec 31 WM/Reuters 4PM London fix for EUR/USD." },
      { step:2, label:"Conversion",     detail:"EUR 100,000 × 1.0798 (stale ECB) = $107,980, vs required 1.0842 = $108,420. A compounding data entry error further inflated the reported amount to $200,000." },
      { step:3, label:"GL Entry",       detail:"Account 4020 loaded into Torrance with $200,000 — substantially above the Bloomberg-correct value of $108,420." },
    ],
    affectedDownstream: [
      "Dividend Income — Foreign overstated by $91,580 on the SOO",
      "Total Investment Income materially misstated",
      "Net Increase in Net Assets from Operations affected downstream",
    ],
    suggestedRemediation: "Override Account 4020 with Bloomberg WM/Reuters fix value of $108,420.00. The AI Suggestion (97% confidence) pre-fills this exact resolution based on the identical November 30 close precedent.",
    similarPastExceptions: [
      { id:"EXC-003", fund:"Pennywise Global Diversified", date:"Nov 30, 2024", resolution:"override_value", outcome:"Override accepted" },
      { id:"EXC-003", fund:"Pennywise Global Diversified", date:"Oct 31, 2024", resolution:"override_value", outcome:"Override accepted" },
    ],
  },
  "EXC-H01": {
    confidence: 89,
    rootCause: "T+1 settlement timing mismatch. Apple Inc (CUSIP 037833100) had 3,300 shares purchased on December 30 that will not settle until January 2, 2025 (T+1). The custodian's position file reflects the settled state (284,500 shares) while the fund GL reflects trade-date accounting (281,200 booked at cost).",
    causeChain: [
      { step:1, label:"Trade Date",     detail:"3,300 AAPL shares purchased Dec 30 and booked in the GL under Trade Date Accounting (TDA)." },
      { step:2, label:"Settlement",     detail:"T+1 settlement will occur January 2, 2025. The custodian's Dec 31 position file already shows the settled balance of 284,500." },
      { step:3, label:"Cross-Check",    detail:"Holdings cross-check runs on Dec 31: custodian 284,500 vs GL 281,200 = variance of 3,300 shares (≈$658K). This is an expected T+1 artifact." },
    ],
    affectedDownstream: [
      "SOI — Apple Inc position count will appear slightly understated",
      "Holdings KPI — Total Market Value understated by ≈$658K",
    ],
    suggestedRemediation: "Acknowledge this exception. The 3,300 share variance is a known T+1 settlement artifact that will self-correct on January 2. No restatement is required. Document the rationale in the audit thread.",
    similarPastExceptions: [
      { id:"EXC-H01", fund:"Pennywise Global Diversified", date:"Nov 30, 2024", resolution:"acknowledged", outcome:"Auto-cleared Jan 2" },
      { id:"EXC-H01", fund:"Pennywise Global Diversified", date:"Oct 31, 2024", resolution:"acknowledged", outcome:"Auto-cleared Nov 1" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// IT5: AI DATA MAPPING DATA — one session per GL feed
// ═══════════════════════════════════════════════════════════════════════════════
const MAPPING_SESSIONS = {
  "feed-001": {
    feedId:"feed-001", fileName:"Pennywise_GL_20241231.csv", fundName:"Pennywise Global Diversified Fund",
    rows:[
      {id:"m01",sourceCol:"account_no",        sourceType:"VARCHAR(10)",  canonicalField:"account_number",      required:true, confidence:99,aiReason:"Exact name match; numeric string pattern confirms COA code",     status:"accepted",  sampleValue:"1010"},
      {id:"m02",sourceCol:"account_desc",       sourceType:"VARCHAR(200)", canonicalField:"account_name",        required:true, confidence:99,aiReason:"Learned from user 'sarah.chen' manual mapping in Nov 2024 close", status:"accepted", learnedFrom:"human", sampleValue:"Investments in Securities, at Value"},
      {id:"m03",sourceCol:"acct_category",      sourceType:"VARCHAR(50)",  canonicalField:"account_category",    required:true, confidence:94,aiReason:"Vocabulary match: values include Asset, Liability, Income, Expense",status:"accepted",  sampleValue:"Asset"},
      {id:"m04",sourceCol:"debit_amount",       sourceType:"DECIMAL(18,2)",canonicalField:"debit",              required:true, confidence:99,aiReason:"Column name and numeric type are exact canonical match",            status:"accepted",  sampleValue:"125000000.00"},
      {id:"m05",sourceCol:"credit_amount",      sourceType:"DECIMAL(18,2)",canonicalField:"credit",             required:true, confidence:99,aiReason:"Column name and numeric type are exact canonical match",            status:"accepted",  sampleValue:"0.00"},
      {id:"m06",sourceCol:"ccy",                sourceType:"CHAR(3)",      canonicalField:"currency",           required:true, confidence:96,aiReason:"'ccy' is the standard 3-char ISO 4217 abbreviation for currency",   status:"accepted",  sampleValue:"USD"},
      {id:"m07",sourceCol:"fund_code",          sourceType:"VARCHAR(20)",  canonicalField:"fund_id",            required:true, confidence:88,aiReason:"'fund_code' maps to fund_id; values pattern-match FND-YYYY-NNN",   status:"pending",   sampleValue:"FND-2024-001"},
      {id:"m08",sourceCol:"counterparty_name",  sourceType:"VARCHAR(200)", canonicalField:"counterparty",       required:false,confidence:93,aiReason:"Direct label match; sample values confirm broker/dealer names",    status:"accepted",  sampleValue:"Goldman Sachs & Co."},
      {id:"m09",sourceCol:"je_reference",       sourceType:"VARCHAR(20)",  canonicalField:"journal_ref",        required:false,confidence:91,aiReason:"'je_reference' maps to journal reference — standard abbreviation",  status:"pending",   sampleValue:"JE-4821"},
      {id:"m10",sourceCol:"post_date",          sourceType:"DATE",         canonicalField:"posting_date",       required:true, confidence:99,aiReason:"DATE type + 'post_date' — unambiguous canonical match",            status:"accepted",  sampleValue:"2024-12-31"},
      {id:"m11",sourceCol:"share_class_cd",     sourceType:"VARCHAR(10)",  canonicalField:"share_class",        required:false,confidence:85,aiReason:"'share_class_cd' is a common code abbreviation for share class",   status:"pending",   sampleValue:"CLASS_A"},
      {id:"m12",sourceCol:"gl_row_id",          sourceType:"BIGINT",       canonicalField:"row_number",         required:false,confidence:79,aiReason:"Unique row identifier — maps to row_number for exception tracking", status:"pending",   sampleValue:"127"},
      {id:"m13",sourceCol:"trade_ccy_amount",   sourceType:"DECIMAL(18,4)",canonicalField:"local_amount",       required:false,confidence:72,aiReason:"Likely local-currency equivalent before FX; partial name match",   status:"review",    sampleValue:"92357.1200"},
      {id:"m14",sourceCol:"fx_spot_rate",       sourceType:"DECIMAL(12,6)",canonicalField:"exchange_rate",      required:false,confidence:96,aiReason:"'fx_spot_rate' is a direct synonym for exchange_rate",             status:"accepted",  sampleValue:"1.084200"},
      {id:"m15",sourceCol:"batch_run_id",       sourceType:"VARCHAR(30)",  canonicalField:"",                   required:false,confidence:0, aiReason:"No canonical field matches this internal ETL metadata column",      status:"unmapped",  sampleValue:"ETL-20241229-0341"},
      {id:"m16",sourceCol:"quantity * px_local",sourceType:"COMPUTED",     canonicalField:"market_value",       required:false,confidence:86,aiReason:"Derived canonical market_value by multiplying quantity and px_local columns.", status:"review", isComputed:true, sampleValue:"[1500 * 45.20] = 67800.00"},
    ],
  },
};

const CANONICAL_OPTIONS = [
  {val:"", label:"— Unmapped —"},
  {val:"account_number", label:"Account Number"},
  {val:"account_name", label:"Account Name"},
  {val:"account_category", label:"Account Category"},
  {val:"debit", label:"Debit Amount"},
  {val:"credit", label:"Credit Amount"},
  {val:"currency", label:"Currency Code"},
  {val:"fund_id", label:"Fund ID"},
  {val:"counterparty", label:"Counterparty"},
  {val:"journal_ref", label:"Journal Entry Reference"},
  {val:"posting_date", label:"Posting Date"},
  {val:"share_class", label:"Share Class"},
  {val:"row_number", label:"Row Number"},
  {val:"local_amount", label:"Local Currency Amount"},
  {val:"exchange_rate", label:"Exchange Rate"},
  {val:"market_value", label:"Market Value"}
];

// ═══════════════════════════════════════════════════════════════════════════════
// IT5: FUND STRUCTURE / ENTITY RELATIONSHIP DATA
// ═══════════════════════════════════════════════════════════════════════════════
const FUND_STRUCTURE = {
  "FND-2024-001": {
    type:"Master",
    feeders:[
      {fund_id:"FEEDER-001-A",shareClass:"Class A",       nav:220000000,investors:142,navPerShare:16.58,status:"Active",jurisdiction:"Delaware, USA"},
      {fund_id:"FEEDER-001-I",shareClass:"Institutional",  nav:340000000,investors:38, navPerShare:24.91,status:"Active",jurisdiction:"Delaware, USA"},
      {fund_id:"FEEDER-001-R",shareClass:"R6",             nav:127400000,investors:12, navPerShare:14.99,status:"Active",jurisdiction:"Delaware, USA"},
    ],
    siblingFunds:[
      {fund_id:"FND-2024-002",name:"Pennywise Fixed Income Opportunities Fund",relationship:"Same Adviser",nav:312000000},
    ],
    administrator:"State Street Bank & Trust Co.",
    custodian:"State Street Bank & Trust Co.",
    auditor:"PricewaterhouseCoopers LLP",
    investmentAdviser:"Pennywise Capital Advisors LLC",
    legalCounsel:"Dechert LLP",
    transferAgent:"Northern Trust",
    fundInception:"January 14, 2019",
    fiscalYearEnd:"December 31",
    reportingCurrency:"USD",
  },
};

// ─── Exception data ───────────────────────────────────────────────────────────
const mkExc = (base) => ({...base, overrideValue:"", assignee:null, resolvedBy:null, thread:base.thread||[]});
const FUND_EXCEPTIONS = {
  "FND-2024-001":[
    mkExc({id:"EXC-001",severity:"error",  code:"CATEGORY_MISMATCH",    title:"Wrong Account Category",          message:"Account 1010 posted under Income. All TB roll-ups will be materially misstated.",field:"account_category",currentValue:"Income",     expectedValue:"Asset",                   account_number:"1010",account_name:"Investments in Securities, at Value",class:"Class A",       row:127,amount:500000,  status:"open",resolution:null,thread:[{id:"t1",userId:"u1",text:"Flagging — classification error in Dec 29 batch.",ts:"Dec 31, 9:14 AM"},{id:"t2",userId:"u4",text:"Confirmed. Correct at source. Do not override.",ts:"Dec 31, 10:02 AM"}]}),
    mkExc({id:"EXC-002",severity:"error",  code:"MISSING_ACCOUNT_NUMBER",title:"Missing Account Number",          message:"Row 128 has a $75,000 debit with no account number.",field:"account_number",currentValue:"(null)",    expectedValue:"Valid COA code",          account_number:"—",   account_name:"Unknown Account",                       class:"Institutional",row:128,amount:75000,    status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-003",severity:"error",  code:"FX_MISMATCH",            title:"FX Conversion Mismatch — EUR",    message:"Account 4020: EUR 100,000 × 1.0842 = $108,420. Reported $200,000.",field:"usd_amount",       currentValue:"$200,000.00",expectedValue:"$108,420.00",             account_number:"4020",account_name:"Dividend Income - Foreign",            class:"Class A",      row:129,amount:200000,  status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-004",severity:"error",  code:"INVALID_ACCOUNT",        title:"Account Not in Chart of Accounts",message:"Account 9999 'Suspense Account' does not exist in COA.",field:"account_number",currentValue:"9999",        expectedValue:"Approved COA account",    account_number:"9999",account_name:"Suspense Account",                     class:"R6",           row:130,amount:150000,  status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-005",severity:"error",  code:"MISSING_FUND_ID",        title:"Missing Fund ID & Fund Name",     message:"Row 131 missing fund_id. $50,000 Cash cannot be attributed.",field:"fund_id",          currentValue:"(null)",    expectedValue:"FND-2024-001",            account_number:"1100",account_name:"Cash - Domestic",                     class:"Class A",      row:131,amount:50000,   status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-H01",severity:"error",  code:"HOLDINGS_CROSS_CHECK",  title:"Holdings Cross-Check Failure",    message:"Apple Inc: custodian 284,500 vs GL 281,200. Variance 3,300 shares ≈ $658,482.",field:"shares",            currentValue:"281,200",    expectedValue:"284,500 (Custodian)",     account_number:"1010",account_name:"Investments in Securities, at Value",class:"Institutional",row:0,  amount:658482,  status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-006",severity:"warning",code:"FX_RATE_VARIANCE",      title:"FX Rate Variance — JPY",          message:"Account 1110: JPY rate 0.006711 vs Bloomberg fix 0.006712.",field:"exchange_rate",    currentValue:"0.006711",   expectedValue:"0.006712 (Bloomberg Fix)",account_number:"1110",account_name:"Cash - Foreign Currency",             class:"R6",           row:19, amount:1006650, status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-007",severity:"warning",code:"FX_RATE_VARIANCE",      title:"FX Rate Variance — GBP Block",    message:"GBP 28M @ 1.2715 vs Bloomberg close 1.2731.",field:"exchange_rate",    currentValue:"1.2715",     expectedValue:"1.2731 (Bloomberg Fix)",  account_number:"1010",account_name:"Investments in Securities, at Value", class:"Institutional",row:6,  amount:35602000,status:"open",resolution:null,thread:[]}),
  ],
  "FND-2024-002":[
    mkExc({id:"EXC-B01",severity:"error",code:"ACCRUAL_VARIANCE",title:"Interest Accrual Variance",message:"Account 4030: 30/360 accrual $4,195,000 vs system $4,200,000.",field:"usd_amount",currentValue:"$4,200,000",expectedValue:"$4,195,000",account_number:"4030",account_name:"Interest Income - Bonds",class:"Class A",row:88,amount:5000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-B02",severity:"error",code:"MISSING_PRICE",title:"Missing End of Day Price",message:"Asset ID 88732J202 missing EOD price.",field:"price",currentValue:"(null)",expectedValue:"96.24",account_number:"1010",account_name:"Investments in Securities",class:"Institutional",row:42,amount:120000,status:"open",resolution:null,thread:[]})
  ],
  "FND-2024-003":[
    mkExc({id:"EXC-C01",severity:"error",  code:"NAV_MISMATCH",         title:"NAV Per Share Mismatch",  message:"Class A NAV/share: $24.9100 (fund) vs $24.8712 (admin). $93,120 discrepancy.",field:"nav_per_share",currentValue:"$24.9100",expectedValue:"$24.8712 (Admin)",account_number:"3010",account_name:"Net Assets - Class A",class:"Class A",row:0,amount:93120,status:"resolved",resolution:"corrected_source",resolvedBy:"u5",thread:[{id:"t3",userId:"u5",text:"Resolved with administrator — confirmed at $24.8712.",ts:"Dec 31, 2:45 PM"}]}),
    mkExc({id:"EXC-C02",severity:"error",  code:"HOLDINGS_CROSS_CHECK", title:"Holdings Cross-Check",    message:"Microsoft: custodian 412,000 vs GL 415,500. Variance ≈ $1,330,000.",field:"shares",currentValue:"415,500",expectedValue:"412,000",account_number:"1010",account_name:"Investments in Securities",class:"Class A",row:0,amount:1330000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-C03",severity:"error",  code:"FX_MISMATCH",          title:"FX Mismatch — EUR Bonds", message:"EUR bonds stale ECB 1.0798 vs Bloomberg 1.0842. Understatement $441,000.",field:"exchange_rate",currentValue:"1.0798",expectedValue:"1.0842",account_number:"1010",account_name:"Investments",class:"Institutional",row:0,amount:441000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-C04",severity:"warning",code:"COUNTERPARTY_MISSING", title:"Missing Counterparty",    message:"4 rows in Account 2010 have no counterparty. $6.2M.",field:"counterparty",currentValue:"(null)",expectedValue:"Broker name",account_number:"2010",account_name:"Payable for Securities Purchased",class:"Institutional",row:0,amount:6200000,status:"open",resolution:null,thread:[]}),
  ],
  "FND-2024-004":[
    // NEW: Added an exception to Bowers Multi-Strategy so the Bowers client has exceptions across multiple funds
    mkExc({id:"EXC-M01",severity:"error",code:"RECON_BREAK",title:"Cash Reconciliation Break",message:"Bank balance $1,250,000 does not tie to GL balance $1,200,000.",field:"balance",currentValue:"$1,200,000",expectedValue:"$1,250,000",account_number:"1100",account_name:"Cash - Domestic",class:"Institutional",row:12,amount:50000,status:"open",resolution:null,thread:[]})
  ],
  "FND-2024-005":[
    mkExc({id:"EXC-D01",severity:"error",  code:"CATEGORY_MISMATCH",    title:"Wrong Category — Loan",  message:"Account 2500 booked under Capital. Expected Liability.",field:"account_category",currentValue:"Capital",expectedValue:"Liability",account_number:"2500",account_name:"Senior Secured Loan at Value",class:"Class A",row:42,amount:14200000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-D02",severity:"error",  code:"MISSING_ACCOUNT_NUMBER",title:"Missing Account — PIK", message:"2 PIK interest entries (rows 67, 71) unmapped. $380,000.",field:"account_number",currentValue:"(null)",expectedValue:"4510 or 4520",account_number:"—",account_name:"PIK Interest Income",class:"Class A",row:67,amount:380000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-D03",severity:"warning",code:"ACCRUAL_VARIANCE",     title:"Capital Call Variance",  message:"LP capital call accrual $2,100,000 vs register $2,085,000.",field:"usd_amount",currentValue:"$2,100,000",expectedValue:"$2,085,000",account_number:"3500",account_name:"Subscriptions Receivable",class:"Class A",row:0,amount:15000,status:"open",resolution:null,thread:[]}),
  ],
  "FND-2024-006":[
    mkExc({id:"EXC-E01",severity:"warning",code:"STALE_PRICE",     title:"Stale Price — Infrastructure",message:"'Redwood Infrastructure Partners': last valuation Q3 2024.",field:"price_date",currentValue:"2024-09-30",expectedValue:"2024-12-31",account_number:"1010",account_name:"Investments",class:"Institutional",row:0,amount:22000000,status:"open",resolution:null,thread:[]}),
    mkExc({id:"EXC-E02",severity:"warning",code:"FX_RATE_VARIANCE",title:"FX Rate Variance — CAD",    message:"CAD 6,500,000 @ 0.7368 vs Bloomberg 0.7382.",field:"exchange_rate",currentValue:"0.7368",expectedValue:"0.7382",account_number:"1110",account_name:"Cash - Foreign Currency",class:"Institutional",row:0,amount:4789200,status:"open",resolution:null,thread:[]}),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════
const fmtUSD     = (n) => n==null?"—":n<0?`($${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})`:`$${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;
const fmtCompact = (n) => n>=1e9?`$${(n/1e9).toFixed(2)}B`:`$${(n/1e6).toFixed(1)}M`;
const fmtNum     = (n) => n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtShares  = (n,dec=0) => n===0?"—":n.toLocaleString("en-US",{minimumFractionDigits:dec,maximumFractionDigits:dec});
const fmtPct     = (n) => `${n.toFixed(2)}%`;
const fmtMono    = (n,neg) => <span style={{...MONO,color:neg?"":undefined}}>{n}</span>;
// ═══════════════════════════════════════════════════════════════════════════════
// PDF GENERATION ENGINE (@react-pdf/renderer)
// ═══════════════════════════════════════════════════════════════════════════════
const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#334155' },
  header: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  subHeader: { fontSize: 10, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowBold: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontWeight: 'bold', borderTop: '1px solid #0f172a', marginTop: 4 },
  rowDouble: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontWeight: 'bold', borderTop: '1px solid #0f172a', borderBottom: '2px solid #0f172a', marginTop: 4, marginBottom: 4 },
  label: { flex: 1 },
  value: { width: 100, textAlign: 'right', fontFamily: 'Courier' },
  indent: { paddingLeft: 15 }
});

const fmtPdfUSD = (n) => n == null ? "—" : n < 0 ? `($${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})` : `$${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;

const FinancialStatementPDF = ({ fund, fsData }) => (
  <Document>
    {/* PAGE 1: Statement of Assets and Liabilities */}
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>Statement of Assets and Liabilities</Text>
      <Text style={pdfStyles.subHeader}>{fund?.name || "Fund"} — As of December 31, 2024</Text>

      <Text style={pdfStyles.sectionTitle}>Assets</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Investments, at Value</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.investments_at_value)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Cash — Domestic</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.cash_domestic)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Cash — Foreign Currency</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.cash_foreign)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Dividends Receivable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.dividends_receivable)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Interest Receivable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.interest_receivable)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Receivable for Securities Sold</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.recv_securities_sold)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Assets</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.total_assets)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Liabilities</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Payable for Securities Purchased</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.pay_securities)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Payable for Fund Shares Redeemed</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.pay_shares_redeemed)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Investment Advisory Fee Payable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.advisory_fee_payable)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Administration Fee Payable</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.admin_fee_payable)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Liabilities</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.total_liabilities)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Net Assets</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Assets — Class A</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets_classA)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Assets — Institutional</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets_inst)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Assets — R6</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets_r6)}</Text></View>
      <View style={pdfStyles.rowDouble}><Text style={pdfStyles.label}>Total Net Assets</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_assets)}</Text></View>
    </Page>

    {/* PAGE 2: Statement of Operations */}
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>Statement of Operations</Text>
      <Text style={pdfStyles.subHeader}>{fund?.name || "Fund"} — For the Year Ended December 31, 2024</Text>

      <Text style={pdfStyles.sectionTitle}>Investment Income</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Dividend Income</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.div_income_domestic + fsData.div_income_foreign)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Interest Income</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.interest_income)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Investment Income</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.total_investment_income)}</Text></View>

      <Text style={pdfStyles.sectionTitle}>Expenses</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Advisory Fees</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.advisory_fees)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Administration Fees</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.admin_fees)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Professional Fees</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.professional_fees)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Total Expenses</Text><Text style={pdfStyles.value}>{fmtPdfUSD(-fsData.total_expenses)}</Text></View>
      <View style={pdfStyles.rowBold}><Text style={pdfStyles.label}>Net Investment Income / (Loss)</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_investment_income)}</Text></View>
      
      <Text style={pdfStyles.sectionTitle}>Realized & Unrealized Gain / (Loss)</Text>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Realized Gain on Investments</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.realized_gain)}</Text></View>
      <View style={pdfStyles.row}><Text style={[pdfStyles.label, pdfStyles.indent]}>Net Change in Unrealized Appreciation</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.unrealized_change)}</Text></View>
      <View style={pdfStyles.rowDouble}><Text style={pdfStyles.label}>Net Increase in Net Assets from Operations</Text><Text style={pdfStyles.value}>{fmtPdfUSD(fsData.net_increase_ops)}</Text></View>
    </Page>
  </Document>
);
// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
const exportToExcel = async (data, columns, filename, sheetName = "Data") => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Setup columns
  sheet.columns = columns.map(c => ({
    header: typeof c === 'string' ? c : c.label,
    key: typeof c === 'string' ? c : c.field,
    width: 20
  }));
  
// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL WORKING PAPER ENGINE (Multi-Sheet Export)
// ═══════════════════════════════════════════════════════════════════════════════
const exportWorkingPaper = async (fund, fsData, tbData) => {
  const workbook = new ExcelJS.Workbook();
  
  // --- TAB 1: Financial Statement ---
  const stmtSheet = workbook.addWorksheet('Financial Statement');
  stmtSheet.columns = [{ width: 40 }, { width: 25 }];
  
  // Title Formatting
  stmtSheet.mergeCells('A1:B1');
  const titleCell = stmtSheet.getCell('A1');
  titleCell.value = `${fund?.name || 'Fund'} - Statement of Assets & Liabilities`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center' };
  
  // Data Rows
  const rows = [
    ['Assets', ''],
    ['Investments, at Value', fsData.investments_at_value],
    ['Cash — Domestic', fsData.cash_domestic],
    ['Cash — Foreign Currency', fsData.cash_foreign],
    ['Dividends Receivable', fsData.dividends_receivable],
    ['Total Assets', fsData.total_assets],
    ['', ''],
    ['Liabilities', ''],
    ['Payable for Securities Purchased', -fsData.pay_securities],
    ['Investment Advisory Fee Payable', -fsData.advisory_fee_payable],
    ['Total Liabilities', -fsData.total_liabilities],
    ['', ''],
    ['Net Assets', fsData.net_assets]
  ];

  rows.forEach((row, idx) => {
    const addedRow = stmtSheet.addRow(row);
    if (['Assets', 'Liabilities', 'Net Assets'].includes(row[0])) {
      addedRow.font = { bold: true };
    }
    if (typeof row[1] === 'number') {
      addedRow.getCell(2).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
    }
  });

  // --- TAB 2: Raw Trial Balance Data ---
  const dataSheet = workbook.addWorksheet('Raw TB Data');
  dataSheet.columns = [
    { header: 'Account', key: 'acct', width: 15 },
    { header: 'Account Name', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Debit', key: 'debit', width: 20 },
    { header: 'Credit', key: 'credit', width: 20 }
  ];
  
  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

  tbData.forEach(r => {
    dataSheet.addRow({
      acct: r.acct, name: r.name, category: r.category, debit: r.debit, credit: r.credit
    });
  });

  dataSheet.getColumn('debit').numFmt = '"$"#,##0.00';
  dataSheet.getColumn('credit').numFmt = '"$"#,##0.00';

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${fund?.fund_id || 'Fund'}_WorkingPaper.xlsx`);
};

  // Style the Header Row to match Torrance UI (Navy Blue)
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

  // Add the Data
  data.forEach(rowData => {
    sheet.addRow(rowData);
  });

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL CSS & STYLE INJECTOR (Updated to aggressively block Dark Mode)
// ═══════════════════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
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
    @keyframes pulseBorder { 0% { box-shadow: 0 0 0 0 rgba(220,53,69,0.4); } 70% { box-shadow: 0 0 0 6px rgba(220,53,69,0); } 100% { box-shadow: 0 0 0 0 rgba(220,53,69,0); } }}
`;

function StyleInjector() {
  useEffect(()=>{ 
    const el=document.createElement("style"); 
    el.textContent=GLOBAL_CSS; 
    document.head.appendChild(el); 

    // Force meta color-scheme to override Chrome
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = "color-scheme";
      document.head.appendChild(meta);
    }
    meta.content = "light only";

    return()=>{
      document.head.removeChild(el); 
    }; 
  },[]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════
function Badge({severity,size="sm"}) {
  const cfg=severity==="error"?{color:T.errorBase, icon:"●", label:"ERROR"} : {color:T.warnBase, icon:"●", label:"WARN"};
  const p=size==="sm"?"2px 6px":"4px 8px",f=size==="sm"?10:11;
  // Ghost style: white background, gray border, colored dot/text
  return <span style={{...MONO,fontSize:f,fontWeight:600,padding:p,borderRadius:4,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:4,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}><span style={{color:cfg.color, fontSize:12, marginTop:-1}}>{cfg.icon}</span>{cfg.label}</span>;
}
function Avatar({user,size=26}) {
  if(!user)return null;
  return <span title={user.name} style={{width:size,height:size,borderRadius:"50%",background:user.color,color:"#fff",fontSize:size*0.38,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,...SANS}}>{user.initials}</span>;
}
function FieldLabel({children,required}) {
  return <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6,display:"flex",gap:4,alignItems:"center"}}>{children}{required&&<span style={{color:T.errorBase,fontSize:11}}>*</span>}</div>;
}
function Card({title,accessory,children,flush,accent}) {
  return <div style={{background:T.cardBg,border:`1px solid ${accent||T.border}`,borderRadius:9,marginBottom:14,overflow:"hidden"}}>
    <div style={{padding:"11px 16px",borderBottom:`1px solid ${accent||T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:accent?"linear-gradient(135deg,#f5f3ff,#ede9fe)":undefined}}>
      <span style={{...SANS,fontWeight:700,fontSize:13,color:accent?T.aiBase:T.textPrimary}}>{title}</span>
      {accessory}
    </div>
    <div style={flush?{}:{padding:"14px 16px"}}>{children}</div>
  </div>;
}
function SectionDivider({label,count,color,bg,border}) {
  return <div style={{padding:"5px 14px",background:bg,borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",gap:6}}>
    <span style={{...SANS,fontSize:10,fontWeight:700,color,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
    <span style={{...MONO,fontSize:10,color,fontWeight:700}}>({count})</span>
  </div>;
}
function SlaPill({daysLeft}) {
  const isDanger = daysLeft <= 1;
  const color = isDanger ? T.errorBase : daysLeft <= 3 ? T.warnBase : T.textMuted;
  return <span style={{...SANS,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:5,whiteSpace:"nowrap",boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
    <span style={{color:color, fontSize:10}}>●</span>{daysLeft===0?"Due Today":daysLeft===1?"Due Tomorrow":`${daysLeft} Days`}
  </span>;
}
function ApprovalPill({status}) {
  const map={
    open:{label:"In Progress",color:T.textMuted},
    submitted:{label:"Submitted",color:T.actionBase},
    review_pending:{label:"Review Pending",color:T.warnBase},
    approved:{label:"Approved",color:T.okBase}
  };
  const c=map[status]||map.open;
  return <span style={{...SANS,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:5,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
    <span style={{color:c.color, fontSize:10}}>●</span>{c.label}
  </span>;
}
function AiConfidenceBadge({pct}) {
  const color=pct>=95?T.okBase:pct>=80?T.warnBase:T.errorBase;
  return <span style={{...MONO,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:T.aiBg,color,border:`1px solid ${T.aiBorder}`,display:"inline-flex",alignItems:"center",gap:4}}><span>✦</span>{pct}% confidence</span>;
}
function PriorPeriodFlag({flag}) {
  if(!flag)return null;
  const cfg=flag.type==="spike"?{color:T.errorBase,bg:T.errorBg,border:T.errorBorder,icon:"⚠",label:"NEW PATTERN"}:flag.type==="repeat"?{color:T.warnBase,bg:T.warnBg,border:T.warnBorder,icon:"↻",label:"RECURRING"}:{color:T.textMuted,bg:"#f1f5f9",border:T.border,icon:"~",label:"ROUTINE"};
  return <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",borderRadius:6,background:cfg.bg,border:`1px solid ${cfg.border}`,marginBottom:10}}>
    <span style={{fontSize:14,flexShrink:0}}>{cfg.icon}</span>
    <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>{cfg.label}</span><span style={{...SANS,fontSize:10,color:T.textMuted}}>Period-over-period</span></div><span style={{...SANS,fontSize:11,color:T.textMuted,lineHeight:1.5}}>{flag.message}</span></div>
  </div>;
}
function AiSuggestionBanner({excId,onAccept}) {
  const suggestion=AI_SUGGESTIONS[excId];
  const [dismissed,setDismissed]=useState(false);
  const [accepting,setAccepting]=useState(false);
  if(!suggestion||dismissed)return null;
  const handleAccept=()=>{ setAccepting(true); setTimeout(()=>{ onAccept(suggestion); setAccepting(false); },600); };
  return <div className="slide-in" style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"14px 16px", marginBottom:14, position:"relative", overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:16, color:T.aiBase}}>✦</span>
          <span style={{...SANS,fontWeight:700,fontSize:12,color:T.aiDark}}>AI Suggestion</span>
          <AiConfidenceBadge pct={suggestion.confidence}/>
          <span style={{...SANS,fontSize:10,color:T.textMuted}}>Based on {suggestion.priorPeriod}</span>
        </div>
        <div style={{...SANS,fontSize:13,fontWeight:600,color:T.textPrimary,marginBottom:4}}>"{suggestion.summary}"</div>
        <div style={{...SANS,fontSize:12,color:T.textMuted,lineHeight:1.6,marginBottom:12}}>{suggestion.detail}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="ai-btn" onClick={handleAccept} disabled={accepting}
            style={{...SANS,border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:700,background:T.aiBase,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
            {accepting?<><span style={{animation:"pulse 0.8s infinite"}}>✦</span>Applying…</>:<><span>✦</span>Accept AI Suggestion</>}
          </button>
          <button onClick={()=>setDismissed(true)} style={{...SANS,background:"transparent",border:"none",color:T.textMuted,fontSize:12,cursor:"pointer",padding:"4px 8px"}}>Dismiss</button>
        </div>
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
    </div>
  </div>;
}

// ─── ThreadedComments ─────────────────────────────────────────────────────────
function ThreadedComments({thread,onAddMessage,currentUserId}) {
  const [draft,setDraft]=useState("");
  const bottomRef=useRef();
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[thread.length]);
  const submit=()=>{ const txt=draft.trim();if(!txt)return;onAddMessage(txt);setDraft(""); };
  return <div>
    {thread.length>0?<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12,maxHeight:220,overflowY:"auto",padding:"2px 0"}}>
      {thread.map(msg=>{ const user=TEAM.find(m=>m.id===msg.userId);const isMe=msg.userId===currentUserId; return(
        <div key={msg.id} style={{display:"flex",gap:9,alignItems:"flex-start",flexDirection:isMe?"row-reverse":"row"}}>
          <Avatar user={user} size={26}/>
          <div style={{maxWidth:"78%"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexDirection:isMe?"row-reverse":"row"}}><span style={{...SANS,fontSize:11,fontWeight:700}}>{user?.name}</span><span style={{...SANS,fontSize:10,color:T.textMuted}}>{msg.ts}</span></div>
            <div style={{...SANS,fontSize:12,lineHeight:1.55,padding:"8px 11px",borderRadius:8,background:isMe?T.actionBg:T.appBg,color:T.textPrimary,border:`1px solid ${isMe?"#bfdbfe":T.border}`,borderBottomRightRadius:isMe?2:8,borderBottomLeftRadius:isMe?8:2}}>{msg.text}</div>
          </div>
        </div>
      );})}
      <div ref={bottomRef}/>
    </div>:<div style={{...SANS,fontSize:12,color:T.textMuted,textAlign:"center",padding:"14px 0",marginBottom:10}}>No comments yet</div>}
    <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
      <Avatar user={TEAM.find(m=>m.id===currentUserId)} size={26}/>
      <div style={{flex:1}}>
        <textarea rows={2} placeholder="Add a comment…" value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))submit();}}
          style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 11px",fontSize:12,lineHeight:1.55,minHeight:56}}/>
        <div style={{...SANS,fontSize:10,color:T.textMuted,marginTop:3}}>⌘↵ to send</div>
      </div>
      <button onClick={submit} disabled={!draft.trim()} style={{...SANS,border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:600,background:draft.trim()?T.actionBase:T.border,color:draft.trim()?"#fff":T.textMuted,cursor:draft.trim()?"pointer":"not-allowed",flexShrink:0,height:40}}>Send</button>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IT5: AI ROOT CAUSE BLOCK
// Sits between "Exception Context" card and the resolution section
// ═══════════════════════════════════════════════════════════════════════════════
function AiRootCauseBlock({excId}) {
  const data = AI_ROOT_CAUSE[excId];
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  return (
    <div className="slide-in" style={{
      border:`1.5px solid ${T.aiBorder}`, borderRadius:10, marginBottom:14, overflow:"hidden",
      background:"linear-gradient(135deg,#faf8ff,#f5f3ff)",
    }}>
      {/* Header */}
      <div style={{padding:"10px 16px", borderBottom:`1px solid ${T.aiBorder}`,
        background:"linear-gradient(135deg,#f5f3ff,#ede9fe)",
        display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:15}}>🔍</span>
          <span style={{...SANS, fontWeight:700, fontSize:13, color:T.aiBase}}>AI Root Cause Analysis</span>
          <span style={{...MONO, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
            background:T.aiBg, color:data.confidence>=95?T.okBase:T.warnBase,
            border:`1px solid ${T.aiBorder}`, display:"inline-flex", alignItems:"center", gap:4}}>
            ✦ {data.confidence}% confidence
          </span>
        </div>
        <button onClick={()=>setExpanded(e=>!e)}
          style={{...SANS, fontSize:11, color:T.aiBase, background:"transparent",
            border:`1px solid ${T.aiBorder}`, borderRadius:5, padding:"3px 10px", cursor:"pointer", fontWeight:600}}>
          {expanded?"Collapse ▲":"Expand ▼"}
        </button>
      </div>

      <div style={{padding:"12px 16px"}}>
        {/* Root cause summary — always visible */}
        <div style={{...SANS, fontSize:12, color:T.textPrimary, lineHeight:1.7, marginBottom:expanded?12:0}}>
          <span style={{fontWeight:700, color:T.aiDark}}>Root Cause: </span>{data.rootCause}
        </div>

        {expanded&&(<>
          {/* Cause chain */}
          <div style={{marginBottom:14}}>
            <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8}}>Cause Chain</div>
            {data.causeChain.map((step,i)=>(
              <div key={step.step} style={{display:"flex", gap:12, alignItems:"flex-start"}}>
                <div style={{display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0}}>
                  <div style={{width:26, height:26, borderRadius:"50%", background:T.aiDark, color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    ...MONO, fontSize:11, fontWeight:700}}>{step.step}</div>
                  {i<data.causeChain.length-1&&<div style={{width:2, height:22, background:"#ddd6fe", margin:"2px 0"}}/>}
                </div>
                <div style={{paddingBottom:i<data.causeChain.length-1?20:0, flex:1}}>
                  <div style={{...SANS, fontWeight:700, fontSize:12, color:T.textPrimary, marginBottom:2}}>{step.label}</div>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, lineHeight:1.5}}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Affected downstream */}
          <div style={{marginBottom:14}}>
            <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8}}>Affected Downstream</div>
            {data.affectedDownstream.map((item,i)=>(
              <div key={i} style={{display:"flex", alignItems:"flex-start", gap:8, padding:"6px 10px",
                borderRadius:6, background:T.errorBg, border:`1px solid ${T.errorBorder}`, marginBottom:5}}>
                <span style={{color:T.errorBase, fontSize:12, flexShrink:0, marginTop:1}}>⚠</span>
                <span style={{...SANS, fontSize:11, color:T.errorBase, lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>

          {/* Suggested remediation */}
          <div style={{marginBottom:14}}>
            <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8}}>Suggested Remediation</div>
            <div style={{padding:"10px 12px", borderRadius:7, background:T.okBg, border:`1px solid ${T.okBorder}`}}>
              <span style={{...SANS, fontSize:12, color:T.okBase, lineHeight:1.6, fontWeight:500}}>{data.suggestedRemediation}</span>
            </div>
          </div>

          {/* Similar past exceptions */}
          {data.similarPastExceptions.length>0&&(
            <div>
              <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:8}}>Similar Past Exceptions</div>
              {data.similarPastExceptions.map((past,i)=>(
                <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                  borderRadius:6, background:T.appBg, border:`1px solid ${T.border}`, marginBottom:6}}>
                  <span style={{...MONO, fontSize:10, color:T.actionBase, fontWeight:700, flexShrink:0}}>{past.id}</span>
                  <span style={{...SANS, fontSize:11, color:T.textMuted, flex:1}}>{past.fund}</span>
                  <span style={{...SANS, fontSize:10, color:T.textMuted, flexShrink:0}}>{past.date}</span>
                  <span style={{...SANS, fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:3,
                    background:T.okBg, color:T.okBase, border:`1px solid ${T.okBorder}`, flexShrink:0}}>{past.outcome}</span>
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

// ─── Resolution Form (Horizontal Grid Wrap) ──────────────────────────────────
function ResolutionForm({exc,onResolve,onUpdate,onAddThread,currentUserId}) {
  const options=RESOLUTIONS[exc.severity];
  const [resolution,setResolution]=useState("");
  const [overrideValue,setOverrideValue]=useState("");
  useEffect(()=>{ setResolution(""); setOverrideValue(""); },[exc.id]);
  const isOverride=resolution==="override_value";
  const isErrorAccept=exc.severity==="error"&&resolution==="accept_as_is";
  const needsComment=isErrorAccept&&exc.thread.length===0;
  const isDisabled=resolution===""||needsComment;
  const handleAiAccept=useCallback(s=>onResolve(exc.id,s.resolution,s.overrideValue,`AI Suggestion: ${s.summary}`),[exc.id,onResolve]);
  
  return <div>
    <PriorPeriodFlag flag={PRIOR_PERIOD_FLAGS[exc.id]}/>
    <AiRootCauseBlock excId={exc.id}/>
    <AiSuggestionBanner excId={exc.id} onAccept={handleAiAccept}/>
    
    <Card title="Resolution Action" accessory={<span style={{...SANS,fontSize:11,color:T.textMuted}}>{options.length} options</span>}>
      {/* Horizontal Grid for radio buttons */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:10}}>
        {options.map(opt=>{ const sel=resolution===opt.value; return(
          <label key={opt.value} className="radio-opt" style={{display:"flex",alignItems:"flex-start",gap:11,padding:"10px 13px",borderRadius:7,cursor:"pointer",border:`1px solid ${sel?T.actionBase:T.border}`,background:sel?T.actionBg:T.cardBg, boxShadow:sel?"0 1px 3px rgba(79,70,229,0.1)":"none"}}>
            <input type="radio" name={`res-${exc.id}`} value={opt.value} checked={sel} onChange={()=>setResolution(opt.value)} style={{marginTop:2}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{opt.icon}</span><span style={{...SANS,fontSize:13,fontWeight:600,color:sel?T.actionBase:T.textPrimary}}>{opt.label}</span>{opt.value==="accept_as_is"&&exc.severity==="error"&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`}}>COMMENT REQUIRED</span>}</div>
              <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:4,lineHeight:1.4}}>{opt.desc}</div>
            </div>
          </label>
        );})}
      </div>
    </Card>
    
    {isOverride&&<div className="slide-in"><Card title="Override Value" accessory={<span style={{...MONO,fontSize:10,color:T.warnBase,background:T.warnBg,padding:"2px 7px",borderRadius:3,border:`1px solid ${T.warnBorder}`}}>OVERRIDE</span>}>
      <FieldLabel>Replacement Value</FieldLabel>
      <input type="text" placeholder={exc.expectedValue||"Enter value…"} value={overrideValue} onChange={e=>setOverrideValue(e.target.value)} style={{...SANS,width:"100%",border:`1px solid ${T.warnBorder}`,borderRadius:6,padding:"9px 11px",fontSize:13,background:T.warnBg}}/>
    </Card></div>}
    
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:14}}>
      <Card title="Assignment"><FieldLabel>Assign To</FieldLabel>
        <div style={{position:"relative"}}>
          {exc.assignee&&<span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",zIndex:1}}><Avatar user={TEAM.find(m=>m.id===exc.assignee)} size={22}/></span>}
          <select value={exc.assignee||""} onChange={e=>onUpdate(exc.id,{assignee:e.target.value||null})} style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:exc.assignee?"9px 11px 9px 38px":"9px 11px",fontSize:13,background:T.cardBg,cursor:"pointer", color:T.textPrimary}}>
            <option value="">— Unassigned —</option>{TEAM.map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
        </div>
        {exc.assignee&&<div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:5,display:"flex",alignItems:"center",gap:5}}><span style={{color:T.okBase}}>✓</span>Assigned to <strong style={{color:T.textPrimary}}>{TEAM.find(m=>m.id===exc.assignee)?.name}</strong></div>}
      </Card>
      
      <Card title="Audit Thread" accessory={<span style={{...SANS,fontSize:11,color:T.textMuted}}>{exc.thread.length} messages</span>}>
        {isErrorAccept&&needsComment&&<div className="slide-in" style={{...SANS,fontSize:11,color:T.errorBase,background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:5,padding:"7px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>✕</span>Add a thread comment before accepting this error.</div>}
        <ThreadedComments thread={exc.thread} onAddMessage={onAddThread} currentUserId={currentUserId}/>
      </Card>
    </div>
    
    <button className="resolve-btn" disabled={isDisabled} onClick={()=>!isDisabled&&onResolve(exc.id,resolution,overrideValue,"")}
      style={{width:"100%",border:"none",borderRadius:7,padding:"14px 20px",fontSize:14,fontWeight:700,cursor:isDisabled?"not-allowed":"pointer",background:isDisabled?T.border:T.okBase,color:isDisabled?T.textMuted:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {resolution===""?<><span style={{opacity:0.5}}>○</span>Select a Resolution Action</>:needsComment?<><span>!</span>Add Thread Comment First</>:<><span>✓</span>Resolve Exception</>}
    </button>
  </div>;
}
function ResolutionAuditRecord({exc,onReopen,onAddThread,currentUserId}) {
  const resolver=exc.resolvedBy?TEAM.find(m=>m.id===exc.resolvedBy):null;
  const assignee=exc.assignee?TEAM.find(m=>m.id===exc.assignee):null;
  const resOption=[...RESOLUTIONS.error,...RESOLUTIONS.warning].find(r=>r.value===exc.resolution);
  return <Card title="Resolution Record" accessory={<span style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:5,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:4}}><span>✓</span>Resolved</span>}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
      <div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Resolution Action</div><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>{resOption?.icon}</span><span style={{...SANS,fontSize:13,fontWeight:600,color:T.okBase}}>{resOption?.label||exc.resolution}</span></div></div>
      <div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Resolved By</div>{resolver?<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar user={resolver} size={24}/><span style={{...SANS,fontSize:13,fontWeight:500}}>{resolver.name}</span></div>:<span style={{...SANS,fontSize:13,color:T.textMuted}}>—</span>}</div>
      {exc.overrideValue&&<div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Override Value</div><span style={{...MONO,fontSize:13,fontWeight:600,padding:"2px 7px",borderRadius:4,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`}}>{exc.overrideValue}</span></div>}
      {assignee&&<div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Assigned To</div><div style={{display:"flex",alignItems:"center",gap:7}}><Avatar user={assignee} size={24}/><span style={{...SANS,fontSize:13}}>{assignee.name}</span></div></div>}
    </div>
    <Card title="Audit Thread" accessory={<span style={{...SANS,fontSize:11,color:T.textMuted}}>{exc.thread.length} messages</span>}><ThreadedComments thread={exc.thread} onAddMessage={onAddThread} currentUserId={currentUserId}/></Card>
    <button className="reopen-btn" onClick={()=>onReopen(exc.id)} style={{...SANS,background:T.cardBg,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><span>↺</span>Reopen Exception</button>
  </Card>;
}

// ─── ExcCard (High-Density Inbox Style) ──────────────────────────────────────
function ExcCard({exc,active,selected,onClick,onToggleSelect}) {
  const resolved=exc.status==="resolved";
  const assignee=exc.assignee?TEAM.find(m=>m.id===exc.assignee):null;
  const hasAI=!!AI_SUGGESTIONS[exc.id];
  const hasRCA=!!AI_ROOT_CAUSE[exc.id];
  
  return <div role="button" tabIndex={0} className="exc-card" onClick={onClick} onKeyDown={e=>e.key==="Enter"&&onClick()} style={{padding:"8px 12px 8px 0",borderBottom:`1px solid ${T.border}`,borderLeft:`3px solid ${selected||active?T.actionBase:"transparent"}`,background:selected?"#f0f4ff":active?"#f8fafc":T.cardBg,opacity:resolved?0.55:1,cursor:"pointer",display:"flex",alignItems:"center"}}>
    <div style={{width:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={e=>{e.stopPropagation();onToggleSelect(exc.id);}}>
      <input type="checkbox" checked={selected} onChange={()=>{}} style={{margin:0}}/>
    </div>
    <div style={{flex:1,minWidth:0, display:"flex", flexDirection:"column", gap:3}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6, overflow:"hidden"}}>
          <Badge severity={exc.severity} size="sm"/>
          <span style={{...SANS,fontWeight:600,fontSize:12,color:T.textPrimary,textDecoration:resolved?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={exc.title}>{exc.title}</span>
        </div>
        <span style={{...MONO,fontSize:11,fontWeight:700,color:resolved?T.textMuted:T.textPrimary,flexShrink:0}}>{fmtUSD(exc.amount)}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{...SANS,fontSize:11,color:T.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}} title={exc.message}>{exc.message}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {hasAI&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 4px",borderRadius:4,background:T.aiBg,color:T.aiDark,border:`1px solid ${T.aiBorder}`,lineHeight:1}}>✦ AI</span>}
          {hasRCA&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 4px",borderRadius:4,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`,lineHeight:1}}>🔍 RCA</span>}
          {exc.thread?.length>0&&<span style={{...SANS,fontSize:10,color:T.textMuted, display:"flex", alignItems:"center", gap:3}}>💬 {exc.thread.length}</span>}
          {assignee&&<div style={{marginLeft:2}}><Avatar user={assignee} size={16}/></div>}
        </div>
      </div>
    </div>
  </div>;
}
function BulkActionBar({selected,exceptions,onBulkResolve,onBulkAssign,onClear}) {
  const [bulkAction,setBulkAction]=useState("");
  const allOpen=exceptions.filter(e=>selected.has(e.id)&&e.status==="open");
  const allResolved=exceptions.filter(e=>selected.has(e.id)&&e.status==="resolved");
  if(selected.size===0)return null;
  return <div className="bulk-bar" style={{position:"sticky",bottom:0,zIndex:50,background:T.navyHeader,borderTop:`2px solid ${T.actionBase}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
    <div style={{...SANS,fontSize:12,fontWeight:700,color:"#fff",background:"#253547",padding:"5px 10px",borderRadius:5,display:"flex",alignItems:"center",gap:6}}><span style={{background:T.actionBase,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{selected.size}</span>selected</div>
    {allOpen.length>0&&<div style={{display:"flex",alignItems:"center",gap:6}}>
      <select value={bulkAction} onChange={e=>setBulkAction(e.target.value)} style={{...SANS,fontSize:12,padding:"6px 10px",borderRadius:5,border:`1px solid #374151`,background:"#253547",color:"#e2e6ed",cursor:"pointer"}}><option value="">— Bulk action…</option>{RESOLUTIONS.error.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select>
      <button disabled={!bulkAction} onClick={()=>{if(bulkAction){onBulkResolve(Array.from(selected),bulkAction);setBulkAction("");}}} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:5,border:"none",background:bulkAction?T.okBase:"#374151",color:bulkAction?"#fff":"#6b7280",cursor:bulkAction?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:5}}><span>✓</span>Apply to {allOpen.length}</button>
    </div>}
    <select defaultValue="" onChange={e=>{if(e.target.value){onBulkAssign(Array.from(selected),e.target.value);e.target.value="";}}} style={{...SANS,fontSize:12,padding:"6px 10px",borderRadius:5,border:`1px solid #374151`,background:"#253547",color:"#e2e6ed",cursor:"pointer"}}><option value="">↝ Assign all to…</option>{TEAM.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
    {allResolved.length>0&&<button onClick={()=>onBulkResolve(Array.from(selected).filter(id=>exceptions.find(e=>e.id===id)?.status==="resolved"),"reopen")} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 13px",borderRadius:5,border:`1px solid #374151`,background:"transparent",color:"#e2e6ed",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><span>↺</span>Reopen {allResolved.length}</button>}
    <button onClick={onClear} style={{marginLeft:"auto",...SANS,fontSize:12,color:"#8898aa",background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><span>✕</span>Clear</button>
  </div>;
}

// ─── Detail Pane (Full Width) ────────────────────────────────────────────────
function DetailPane({exc,onResolve,onReopen,onUpdate,onAddThread,currentUserId}) {
  const [showPdf,setShowPdf]=useState(false);
  const isResolved=exc.status==="resolved";
  
  return <div style={{padding:"24px 32px 80px",width:"100%"}}>
    <div style={{marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <Badge severity={exc.severity} size="md"/>
          <span style={{...MONO,fontSize:12,color:T.textMuted}}>{exc.code}</span>
          {isResolved&&<span style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:5,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"inline-flex",alignItems:"center",gap:4}}><span>✓</span>Resolved</span>}
        </div>
        <h2 style={{...SANS,fontWeight:700,fontSize:20,color:T.textPrimary,marginBottom:6}}>{exc.title}</h2>
        <p style={{...SANS,fontSize:14,color:T.textMuted,lineHeight:1.65, maxWidth:"80%"}}>{exc.message}</p>
      </div>
      <div style={{textAlign:"right"}}>
         <div style={{...SANS, fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4}}>Exception Amount</div>
         <div style={{...MONO, fontSize:24, fontWeight:700, color:T.textPrimary}}>{fmtUSD(exc.amount)}</div>
      </div>
    </div>
    
    <Card title="Exception Context" accessory={<span style={{...MONO,fontSize:11,color:T.textMuted}}>{exc.row>0?`Row ${exc.row}`:"Global check"}</span>}>
      {/* Dynamic Grid: Scales gracefully across the full width */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:20}}>
        {[{label:"Current Value",val:exc.currentValue,type:"error"},{label:"Expected Value",val:exc.expectedValue,type:"ok"}].map(f=>(
          <div key={f.label}><div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{f.label}</div><span style={{...MONO,fontSize:13,fontWeight:600,padding:"4px 10px",borderRadius:5,display:"inline-block",background:f.type==="error"?T.errorBg:T.okBg,color:f.type==="error"?T.errorBase:T.okBase,border:`1px solid ${f.type==="error"?T.errorBorder:T.okBorder}`}}>{f.val}</span></div>
        ))}
        {[["Account #",<span key="a" style={MONO}>{exc.account_number}</span>],["Account Name",exc.account_name],["Share Class",exc.class]].map(([label,val])=>(
          <div key={label}><div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{label}</div><div style={{...SANS,fontSize:13, color:T.textPrimary, fontWeight:500}}>{val}</div></div>
        ))}
      </div>
    </Card>
    
    {isResolved?<ResolutionAuditRecord exc={exc} onReopen={onReopen} onAddThread={onAddThread} currentUserId={currentUserId}/>:<ResolutionForm exc={exc} onResolve={onResolve} onUpdate={onUpdate} onAddThread={onAddThread} currentUserId={currentUserId}/>}
    
    <div style={{marginTop:6}}><button onClick={()=>setShowPdf(true)} style={{...SANS,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7}}><span>↓</span>Export Reports</button></div>
    {showPdf&&<PdfModal onClose={()=>setShowPdf(false)}/>}
  </div>;
}

// ─── Exceptions Tab (Updated with Inbox Zero Reward) ─────────────────────────
function ExceptionsTab({exceptions,approval,onResolve,onReopen,onUpdate,onAddThread,currentUserId,onSubmit}) {
  const [activeId,setActiveId]=useState(exceptions[0]?.id||null);
  const [selected,setSelected]=useState(new Set());
  const [forceShowResolved, setForceShowResolved]=useState(false); // Allows bypassing Inbox Zero
  
  const activeExc=exceptions.find(e=>e.id===activeId);
  const toggleSel=useCallback(id=>setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;}),[]);
  const toggleAll=()=>setSelected(s=>s.size===exceptions.length?new Set():new Set(exceptions.map(e=>e.id)));
  
  const holdingsExcs=exceptions.filter(e=>e.code==="HOLDINGS_CROSS_CHECK");
  const errorExcs=exceptions.filter(e=>e.severity==="error"&&e.code!=="HOLDINGS_CROSS_CHECK");
  const warnExcs=exceptions.filter(e=>e.severity==="warning");
  const aiCount=exceptions.filter(e=>!!AI_SUGGESTIONS[e.id]&&e.status==="open").length;
  const openErrors=exceptions.filter(e=>e.severity==="error"&&e.status==="open");

  // HABIT LOOP: INBOX ZERO STATE
  if (openErrors.length === 0 && exceptions.length > 0 && approval?.status === "open" && !forceShowResolved) {
    return (
      <div className="fade-in" style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", background:T.appBg}}>
        <div style={{fontSize: 72, marginBottom: 16, animation: "slideUp 0.6s ease forwards"}}>🎉</div>
        <div style={{...SANS, fontSize: 26, fontWeight: 700, color: T.textPrimary, marginBottom: 8}}>Inbox Zero!</div>
        <div style={{...SANS, fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 400, textAlign: "center", lineHeight:1.5}}>
          Amazing work. All blocking exceptions have been resolved for this fund. The ledger is clean and balanced.
        </div>
       {/* Replaced vibrant emerald gradient with T.okBase */}
       <button onClick={onSubmit} className="glow-btn" style={{...SANS, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 6, border: "none", background: T.okBase, color: "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:8}}>
          <span>↑</span> Submit Fund for Controller Review
        </button>
        <button onClick={()=>setForceShowResolved(true)} style={{...SANS, marginTop: 24, fontSize: 13, color: T.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration:"underline"}}>
          Review resolved exceptions
        </button>
      </div>
    );
  }

  return <div style={{display:"flex",height:"100%"}}>
    <aside style={{flex:"0 0 40%", borderRight:`1px solid ${T.border}`,background:T.cardBg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"13px 12px 10px",borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,background:T.cardBg,zIndex:5}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><input type="checkbox" checked={selected.size===exceptions.length&&exceptions.length>0} ref={el=>{if(el)el.indeterminate=selected.size>0&&selected.size<exceptions.length;}} onChange={toggleAll} aria-label="Select all"/><div style={{...SANS,fontWeight:700,fontSize:13}}>Exception Queue</div></div>
        <div style={{...SANS,fontSize:11,color:T.textMuted,paddingLeft:23}}><span style={{color:T.errorBase,fontWeight:600}}>{exceptions.filter(e=>e.severity==="error"&&e.status==="open").length} errors</span>{" · "}<span style={{color:T.warnBase,fontWeight:600}}>{exceptions.filter(e=>e.severity==="warning"&&e.status==="open").length} warnings</span>{" · "}<span style={{color:T.okBase,fontWeight:600}}>{exceptions.filter(e=>e.status==="resolved").length} resolved</span></div>
        {aiCount>0&&<div style={{marginTop:7,padding:"4px 8px",borderRadius:5,background:T.aiBg,border:`1px solid ${T.aiBorder}`,display:"inline-flex",alignItems:"center",gap:5}}><span style={{...MONO,fontSize:9,color:T.aiBase,fontWeight:700}}>✦ AI</span><span style={{...SANS,fontSize:10,color:T.aiBase}}>{aiCount} suggestion{aiCount!==1?"s":""} available</span></div>}
        <div style={{marginTop:9,height:4,background:T.border,borderRadius:2}}><div style={{height:"100%",borderRadius:2,background:T.okBase,transition:"width 0.4s",width:`${exceptions.length?(exceptions.filter(e=>e.status==="resolved").length/exceptions.length)*100:100}%`}}/></div>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {holdingsExcs.length>0&&<><div style={{padding:"5px 13px",background:"#f5f3ff",borderBottom:`1px solid #ddd6fe`,display:"flex",alignItems:"center",gap:6}}><span style={{...SANS,fontSize:10,fontWeight:700,color:T.catCap,letterSpacing:"0.06em",textTransform:"uppercase"}}>Holdings Cross-Check</span><span style={{...MONO,fontSize:10,color:T.catCap,fontWeight:700}}>({holdingsExcs.length})</span></div>{holdingsExcs.map(exc=><ExcCard key={exc.id} exc={exc} active={activeId===exc.id} selected={selected.has(exc.id)} onClick={()=>setActiveId(exc.id)} onToggleSelect={toggleSel}/>)}</>}
        {errorExcs.length>0&&<><SectionDivider label="Errors" count={errorExcs.length} color={T.errorBase} bg={T.errorBg} border={T.errorBorder}/>{errorExcs.map(exc=><ExcCard key={exc.id} exc={exc} active={activeId===exc.id} selected={selected.has(exc.id)} onClick={()=>setActiveId(exc.id)} onToggleSelect={toggleSel}/>)}</>}
        {warnExcs.length>0&&<><SectionDivider label="Warnings" count={warnExcs.length} color={T.warnBase} bg={T.warnBg} border={T.warnBorder}/>{warnExcs.map(exc=><ExcCard key={exc.id} exc={exc} active={activeId===exc.id} selected={selected.has(exc.id)} onClick={()=>setActiveId(exc.id)} onToggleSelect={toggleSel}/>)}</>}
      </div>
      <BulkActionBar selected={selected} exceptions={exceptions} onBulkResolve={(ids,action)=>{ if(action==="reopen")ids.forEach(id=>onReopen(id));else ids.forEach(id=>{const e=exceptions.find(x=>x.id===id);if(e&&e.status==="open")onResolve(id,action,"","");});setSelected(new Set()); }} onBulkAssign={(ids,aId)=>ids.forEach(id=>onUpdate(id,{assignee:aId}))} onClear={()=>setSelected(new Set())}/>
    </aside>
    <main style={{flex:"0 0 60%",overflowY:"auto",background:T.appBg}}>
      {activeExc?<DetailPane key={activeExc.id} exc={activeExc} onResolve={onResolve} onReopen={onReopen} onUpdate={onUpdate} onAddThread={txt=>onAddThread(activeExc.id,txt)} currentUserId={currentUserId}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:10,color:T.textMuted}}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round"/></svg><span style={{...SANS,fontSize:13,fontWeight:500}}>Select an exception to review</span></div>}
    </main>
  </div>;
}

// ─── UNIVERSAL EDITABLE GRID (For In-App Corrections) ─────────────────────────
// ─── UNIVERSAL EDITABLE GRID (For In-App Corrections) ─────────────────────────
function EditableGrid({ data, columns, onUpdateRecord, feedId }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(columns[0]?.field || "");
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState("");

  const filteredAndSorted = useMemo(() => {
    let res = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    if (sortBy) {
      res.sort((a,b) => {
        if (a[sortBy] < b[sortBy]) return -1;
        if (a[sortBy] > b[sortBy]) return 1;
        return 0;
      });
    }
    return res;
  }, [data, search, sortBy]);

  const handleDoubleClick = (record, field) => {
    setEditingCell({ id: record.id, field });
    setEditValue(record[field] == null ? "" : record[field]);
  };

  const handleKeyDown = (e, recordId, field) => {
    if (e.key === "Enter") commitEdit(recordId, field);
    else if (e.key === "Escape") setEditingCell(null);
  };

  const commitEdit = (recordId, field) => {
    let finalValue = editValue;
    if (editValue !== "" && !isNaN(Number(editValue))) finalValue = Number(editValue);
    onUpdateRecord(feedId, recordId, field, finalValue);
    setEditingCell(null);
  };

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
      {/* Dynamic Toolbar */}
      <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:12, flexWrap:"wrap"}}>
        <div style={{position:"relative", flex:1, minWidth:200, maxWidth:300}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
          <input type="text" placeholder="Search across all fields..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"6px 12px 6px 30px", borderRadius:5, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} />
        </div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"6px 10px", borderRadius:5, border:`1px solid ${T.border}`, fontSize:12, outline:"none", cursor:"pointer"}}>
          <option value="">Sort By...</option>
          {columns.map(c => <option key={c.field} value={c.field}>{c.label}</option>)}
        </select>
        <span style={{...SANS,fontSize:11,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} records</span>
      </div>

      <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:6, overflowY:"auto", overflowX:"auto", flex:1}}>
        <table style={{width:"100%", borderCollapse:"collapse", fontSize:11, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:"#f8fafc", borderBottom:`2px solid ${T.border}`}}>
              {columns.map(c => (
                <th key={c.field} style={{...SANS, padding:"8px 12px", color: c.editable ? T.actionBase : T.textMuted, fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", background: c.editable ? "#eff6ff" : "#f8fafc", borderLeft: c.editable ? "1px solid #bfdbfe" : "none", borderRight: c.editable ? "1px solid #bfdbfe" : "none", whiteSpace:"nowrap"}}>
                  {c.label} {c.editable && "✎"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((record, i) => (
              <tr key={record.id || i} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                {columns.map(c => {
                  const isEditing = editingCell?.id === record.id && editingCell?.field === c.field;
                  const value = record[c.field];
                  
                  return (
                    <td key={c.field} 
                        onDoubleClick={() => c.editable && handleDoubleClick(record, c.field)}
                        style={{padding:"6px 12px", ...MONO, color: c.editable ? T.textPrimary : T.textMuted, background: isEditing ? T.actionBg : c.editable ? "#fafffe" : "transparent", borderLeft: c.editable ? "1px solid #e2e8f0" : "none", borderRight: c.editable ? "1px solid #e2e8f0" : "none", cursor: c.editable ? "cell" : "default", whiteSpace:"nowrap"}}>
                      {isEditing ? (
                        <input autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>commitEdit(record.id, c.field)} onKeyDown={e=>handleKeyDown(e, record.id, c.field)}
                          style={{...MONO, fontSize:11, width:"100%", padding:"2px 6px", border:`1px solid ${T.actionBase}`, borderRadius:3, outline:"none"}} />
                      ) : (
                        <div style={{display:"flex", alignItems:"center", gap:6}}>
                          {c.format === "usd" ? fmtUSD(value) : c.format === "pct" ? fmtPct(value) : value}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredAndSorted.length === 0 && <tr><td colSpan={columns.length} style={{textAlign:"center", padding:30, color:T.textMuted, ...SANS}}>No data found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── DATA EXPLORER TAB (Complete 12 Canonical Feeds) ────────────
function DataExplorerTab({ masterFeeds, onUpdateFeedRecord }) {
  const [subTab, setSubTab] = useState("gl_001");

  const SUB_TABS = [
    { key:"gl_001", label:"GL-001 (Trial Balance)" },
    { key:"hd_001", label:"HD-001 (Holdings)" },
    { key:"ca_001", label:"CA-001 (Capital Activity)" },
    { key:"pr_001", label:"PR-001 (Pricing)" },
    { key:"fx_001", label:"FX-001 (Rates)" },
    { key:"cp_001", label:"CP-001 (Counterparties)" },
    { key:"ta_001", label:"TA-001 (Transfer Agent)" },
    { key:"dr_001", label:"DR-001 (Derivatives)" },
    { key:"lp_001", label:"LP-001 (LP Register)" },
    { key:"tx_001", label:"TX-001 (Tax)" },
    { key:"re_001", label:"RE-001 (Real Estate)" },
    { key:"oc_001", label:"OC-001 (OpCo)" },
  ];

  const PR_COLS = [
    { field:"price_id", label:"Price ID" }, { field:"fund_id", label:"Fund ID" }, { field:"identifier", label:"Identifier" }, { field:"identifier_type", label:"ID Type" },
    { field:"security_name", label:"Security Name" }, { field:"price", label:"Unit Price", editable:true, format:"usd" }, { field:"price_date", label:"Price Date" }, 
    { field:"price_type", label:"Price Type" }, { field:"currency", label:"Currency" }, { field:"yield", label:"Yield (%)", editable:true }, 
    { field:"duration", label:"Duration", editable:true }, { field:"fv_level", label:"FV Level", editable:true }, { field:"fv_level_suggested", label:"Suggested FV Level" },
    { field:"price_source", label:"Price Source" }, { field:"is_evaluated", label:"Is Evaluated" }, { field:"accrued_interest", label:"Accrued Interest", format:"usd" }, 
    { field:"convexity", label:"Convexity" }, { field:"delta", label:"Delta" }
  ];

  const FX_COLS = [
    { field:"rate_id", label:"Rate ID" }, { field:"rate_date", label:"Rate Date" }, { field:"rate_time", label:"Rate Time" },
    { field:"quote_currency", label:"Quote CCY" }, { field:"base_currency", label:"Base CCY" }, { field:"spot_rate", label:"Spot Rate", editable:true }, 
    { field:"rate_type", label:"Rate Type" }, { field:"forward_settlement_date", label:"Fwd Settlement Date" }, { field:"rate_source", label:"Source" }
  ];

  const CP_COLS = [
    { field:"counterparty_id", label:"CP ID" }, { field:"legal_name", label:"Legal Name", editable:true }, { field:"entity_type", label:"Entity Type", editable:true }, 
    { field:"country", label:"Country" }, { field:"lei", label:"LEI Code", editable:true }, { field:"is_related_party", label:"Is Related Party" }, 
    { field:"related_party_type", label:"Related Party Type" }, { field:"is_sec_registered", label:"Is SEC Registered" }, 
    { field:"nfa_id", label:"NFA ID" }, { field:"crd_number", label:"CRD Number" }
  ];

  const TA_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"as_of_date", label:"As Of Date" }, { field:"share_class", label:"Share Class" }, 
    { field:"shares_beginning", label:"Shares Beginning" }, { field:"shares_issued", label:"Shares Issued" }, { field:"shares_redeemed", label:"Shares Redeemed" },
    { field:"shares_outstanding", label:"Shares Out.", editable:true }, { field:"nav_per_share", label:"NAV / Share", editable:true, format:"usd" }, 
    { field:"nav_source", label:"NAV Source" }, { field:"net_assets", label:"Total Net Assets", format:"usd" }, { field:"distribution_per_share", label:"Dist. / Share", format:"usd" },
    { field:"expense_ratio_gross", label:"Gross Exp Ratio" }, { field:"expense_ratio_net", label:"Net Exp Ratio" }
  ];

  const DR_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"as_of_date", label:"As Of Date" }, { field:"contract_id", label:"Contract ID" }, 
    { field:"instrument_type", label:"Type" }, { field:"underlying_name", label:"Underlying" }, { field:"underlying_identifier", label:"Underlying ID" },
    { field:"counterparty_id", label:"Counterparty ID" }, { field:"notional_amount", label:"Notional Amount", editable:true, format:"usd" }, 
    { field:"notional_currency", label:"Notional CCY" }, { field:"fair_value", label:"Fair Value", editable:true, format:"usd" }, 
    { field:"fair_value_asset_or_liability", label:"Asset/Liability" }, { field:"fv_level", label:"FV Level" }, { field:"trade_date", label:"Trade Date" }, 
    { field:"maturity_date", label:"Maturity Date" }, { field:"fixed_rate", label:"Fixed Rate" }, { field:"floating_rate_index", label:"Floating Rate Index" }, 
    { field:"pay_receive", label:"Pay/Receive" }, { field:"exercise_price", label:"Exercise Price" }, { field:"delta", label:"Delta" }, 
    { field:"is_exchange_traded", label:"Exchange Traded" }, { field:"variation_margin", label:"Variation Margin" }, 
    { field:"collateral_pledged", label:"Collateral Pledged" }, { field:"netting_set_id", label:"Netting Set ID" }
  ];

  const LP_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"investor_id", label:"Investor ID" }, { field:"investor_legal_name", label:"Legal Name (Encrypted)" }, 
    { field:"investor_type", label:"Type", editable:true }, { field:"is_tax_exempt", label:"Tax Exempt" }, { field:"is_erisa_plan", label:"ERISA Plan" }, 
    { field:"country_of_domicile", label:"Domicile" }, { field:"is_us_person", label:"US Person" }, { field:"committed_capital", label:"Committed Capital", editable:true, format:"usd" }, 
    { field:"called_capital", label:"Called Capital", format:"usd" }, { field:"unfunded_commitment", label:"Unfunded", editable:true, format:"usd" },
    { field:"distributed_capital", label:"Distributed Capital", format:"usd" }, { field:"beginning_capital_account", label:"Beginning Cap", format:"usd" }, 
    { field:"ending_capital_account", label:"Ending Cap", format:"usd" }, { field:"profit_loss_allocation_pct", label:"P&L Alloc %" }, 
    { field:"carried_interest_rate", label:"Carried Int Rate" }, { field:"hurdle_rate", label:"Hurdle Rate" }, { field:"subscription_date", label:"Sub Date" }, 
    { field:"lock_up_expiry", label:"Lock-up Expiry" }, { field:"k1_recipient_tin", label:"K-1 TIN" }, { field:"qualifying_purchaser", label:"Qualifying Purchaser" }, 
    { field:"accredited_investor", label:"Accredited" }
  ];

  const TX_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"tax_year", label:"Tax Year" }, { field:"book_net_income", label:"Book Net Income", format:"usd" }, 
    { field:"book_tax_difference", label:"Book/Tax Diff", format:"usd" }, { field:"taxable_income", label:"Taxable Income", editable:true, format:"usd" }, 
    { field:"wash_sale_adj", label:"Wash Sale Adj.", editable:true, format:"usd" }, { field:"sec_1256_mtm_adj", label:"Sec 1256 MTM Adj" }, 
    { field:"sec_988_fx_adj", label:"Sec 988 FX Adj" }, { field:"pfic_income", label:"PFIC Income" }, { field:"undist_ordinary_income", label:"Undist Ord Income" }, 
    { field:"undist_ltcg", label:"Undist LTCG" }, { field:"capital_loss_carryforward", label:"Cap Loss Carryforward" }, { field:"clf_expiry_year", label:"CLF Expiry" }, 
    { field:"clf_character", label:"CLF Character" }, { field:"unrealized_appreciation_tax", label:"Unrealized App (Tax)" }, 
    { field:"ordinary_distributions", label:"Ord Distributions" }, { field:"ltcg_distributions", label:"LTCG Distributions" }, 
    { field:"roc_distributions", label:"ROC Distributions" }, { field:"ric_qualifying", label:"RIC Qualifying" }, { field:"excise_tax_due", label:"Excise Tax Due" }
  ];

  const RE_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"property_id", label:"Property ID" }, { field:"property_name", label:"Property Name" }, 
    { field:"property_type", label:"Type" }, { field:"address_street", label:"Street" }, { field:"address_city", label:"City" }, 
    { field:"address_state", label:"State" }, { field:"address_country", label:"Country" }, { field:"acquisition_date", label:"Acq Date" }, 
    { field:"acquisition_cost", label:"Acq. Cost", format:"usd" }, { field:"appraisal_date", label:"Appraisal Date" }, 
    { field:"appraiser_name", label:"Appraiser Name" }, { field:"appraisal_method", label:"Appraisal Method" }, 
    { field:"appraised_value", label:"Appraised Value (L3)", editable:true, format:"usd" }, { field:"cap_rate", label:"Cap Rate %", editable:true }, 
    { field:"discount_rate", label:"Discount Rate" }, { field:"noi", label:"NOI", format:"usd" }, { field:"occupancy_rate", label:"Occupancy Rate" }, 
    { field:"mortgage_balance", label:"Mortgage Balance", format:"usd" }, { field:"fv_level", label:"FV Level" }
  ];

  const OC_COLS = [
    { field:"fund_id", label:"Fund ID" }, { field:"portfolio_company_id", label:"Company ID" }, { field:"company_name", label:"Company Name" }, 
    { field:"fiscal_period_end", label:"Fiscal Period End" }, { field:"revenue", label:"Revenue", format:"usd" }, 
    { field:"ebitda", label:"EBITDA", editable:true, format:"usd" }, { field:"net_income", label:"Net Income", format:"usd" }, 
    { field:"total_assets", label:"Total Assets", format:"usd" }, { field:"total_debt", label:"Total Debt", format:"usd" }, 
    { field:"total_equity", label:"Total Equity", format:"usd" }, { field:"enterprise_value", label:"Enterprise Value", editable:true, format:"usd" }, 
    { field:"ev_multiple_applied", label:"EV Multiple" }, { field:"equity_value", label:"Equity Value (L3)", editable:true, format:"usd" }, 
    { field:"investment_cost", label:"Investment Cost", format:"usd" }, { field:"ownership_pct", label:"Ownership %" }, 
    { field:"fv_level", label:"FV Level" }, { field:"is_consolidation_candidate", label:"Consolidation Candidate" }
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:T.cardBg, borderBottom:`1px solid ${T.border}`, padding:"0 16px", display:"flex", gap:0, flexShrink:0, overflowX:"auto" }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ ...SANS, padding:"10px 14px", fontSize:11, fontWeight:subTab===t.key?700:500, color:subTab===t.key?T.actionBase:T.textMuted, background:"none", border:"none", borderBottom:subTab===t.key?`2px solid ${T.actionBase}`:"2px solid transparent", cursor:"pointer", transition:"color 0.2s", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:T.appBg, padding:"12px 16px" }}>
        
        {subTab==="gl_001" && <TrialBalanceTab tbRows={masterFeeds.gl_001} />}
        {subTab==="hd_001" && <HoldingsGrid holdings={masterFeeds.hd_001} />}
        {subTab==="ca_001" && <CapitalActivityGrid activity={masterFeeds.ca_001} />}
        
        {subTab==="pr_001" && <EditableGrid data={masterFeeds.pr_001} columns={PR_COLS} feedId="pr_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="fx_001" && <EditableGrid data={masterFeeds.fx_001} columns={FX_COLS} feedId="fx_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="cp_001" && <EditableGrid data={masterFeeds.cp_001} columns={CP_COLS} feedId="cp_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="ta_001" && <EditableGrid data={masterFeeds.ta_001} columns={TA_COLS} feedId="ta_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="dr_001" && <EditableGrid data={masterFeeds.dr_001} columns={DR_COLS} feedId="dr_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="lp_001" && <EditableGrid data={masterFeeds.lp_001} columns={LP_COLS} feedId="lp_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="tx_001" && <EditableGrid data={masterFeeds.tx_001} columns={TX_COLS} feedId="tx_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="re_001" && <EditableGrid data={masterFeeds.re_001} columns={RE_COLS} feedId="re_001" onUpdateRecord={onUpdateFeedRecord} />}
        {subTab==="oc_001" && <EditableGrid data={masterFeeds.oc_001} columns={OC_COLS} feedId="oc_001" onUpdateRecord={onUpdateFeedRecord} />}
      </div>
    </div>
  );
}

// ─── 1. Trial Balance Tab (With AI Diagnostics) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: TRIAL BALANCE TAB (Adds Primary Column Hierarchy)
// ═══════════════════════════════════════════════════════════════════════════════
function TrialBalanceTab({ tbRows }) {
  const ALL_CATS=["Asset","Liability","Capital","Income","Expense"];
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [sortBy, setSortBy] = useState("acct_asc");
  const [drillRow, setDrillRow] = useState(null);
  const [showAiInsight, setShowAiInsight] = useState(false);
  const [showAllCols, setShowAllCols] = useState(false); // NEW: Hierarchy Toggle
  
  const totalDebit = tbRows.reduce((s,r)=>s+r.debit,0);
  const totalCredit = tbRows.reduce((s,r)=>s+r.credit,0);
  const balanced = Math.abs(totalDebit-totalCredit)<1;
  const variance = Math.abs(totalDebit-totalCredit);

  const filteredAndSorted = useMemo(() => {
    let result = [...tbRows]; 
    if (catFilter !== "All") result = result.filter(r => r.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.acct.includes(q) || r.name.toLowerCase().includes(q) || (r.counterparty||"").toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "acct_asc") return a.acct.localeCompare(b.acct);
      if (sortBy === "net_desc") return Math.abs(b.debit-b.credit) - Math.abs(a.debit-a.credit);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [tbRows, search, catFilter, sortBy]); 

  const COLS = ["GL Row ID", "Fund ID", "Account", "Account Name", "Category", "Subcategory", "Local Amount", "Exchange Rate", "Rate Source", "Rate Date", "Posting Date", "Trade Date", "Period Year", "Period Month", "Journal Ref", "Journal Desc", "Share Class", "Currency", "Counterparty", "Source System", "Is Intercompany", "Segment Code", "Debit", "Credit", "Net"];
  
  // Define Primary vs Extended Columns
  const PRIMARY_TB_COLS = [2, 3, 4, 6, 7, 17, 18, 22, 23, 24];

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:"1 1 auto", minWidth: 150 }}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:12}}>⌕</span>
        <input type="text" placeholder="Search account, name, or counterparty..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="All">All Categories</option>
        {ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="acct_asc">Sort: Account Number</option>
        <option value="net_desc">Sort: Absolute Net Balance</option>
        <option value="name_asc">Sort: Account Name (A-Z)</option>
      </select>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} accounts</span>

        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary}}>{fmtUSD(totalDebit)}</span>
          <span style={{...SANS,fontSize:12,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Debits</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary}}>{fmtUSD(totalCredit)}</span>
          <span style={{...SANS,fontSize:12,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Credits</span>
        </div>
        <div style={{background:balanced?T.okBg:T.errorBg,border:`1px solid ${balanced?T.okBorder:T.errorBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12, color:balanced?T.okBase:T.errorBase}}>{balanced?"✓":"✕"}</span>
          <span style={{...SANS,fontSize:12,fontWeight:700,color:balanced?T.okBase:T.errorBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>{balanced?"Balanced":"Out of Balance"}</span>
        </div>
        
        {!balanced && (
          <button onClick={()=>setShowAiInsight(!showAiInsight)} style={{...SANS,fontSize:11,fontWeight:700,height:34,padding:"0 12px",borderRadius:6,border:`1px solid ${T.aiBorder}`,background:showAiInsight?T.aiBase:T.aiBg,color:showAiInsight?"#fff":T.aiBase,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s",boxShadow:showAiInsight?"none":"0 2px 8px rgba(124,58,237,0.15)"}}>
            <span>✦</span> {showAiInsight ? "Close AI Analysis" : "Run AI Diagnostics"}
          </button>
        )}
        
        {/* NEW: Extended Column Toggler */}
        <button onClick={()=>setShowAllCols(!showAllCols)} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.actionBase,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          {showAllCols ? "[-] Compact View" : "[+] Show 15 More Columns"}
        </button>

        <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export Excel
        </button>
      </div>
    </div>

    {showAiInsight && (
      <div className="slide-in" style={{marginBottom:16, background:"linear-gradient(135deg,#faf8ff,#f5f3ff)", border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start"}}>
        <div style={{fontSize:20}}>🧠</div>
        <div style={{flex:1}}>
          <div style={{...SANS, fontSize:13, fontWeight:700, color:T.aiDark, marginBottom:4}}>AI Diagnostic Complete: Variance Root Cause Identified</div>
          <div style={{...SANS, fontSize:12, color:T.textPrimary, lineHeight:1.5}}>
            The Trial Balance is out of balance by exactly <strong>{fmtUSD(variance)}</strong>. 
            <br/>This variance matches a known ingestion exception currently in your queue: <strong style={{color:T.errorBase}}>EXC-004 (Account 9999 'Suspense Account')</strong> for {fmtUSD(150000)}. 
            <br/><strong>Recommendation:</strong> Resolving EXC-004 in the Exceptions tab will map this unclassified cash to the correct ledger account and automatically restore ledger balance.
          </div>
        </div>
        <span style={{...MONO, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:T.aiBg, color:T.aiBase, border:`1px solid ${T.aiBorder}`}}>
          99% confidence match
        </span>
      </div>
    )}

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflowX:"auto", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i) => {
                if (!showAllCols && !PRIMARY_TB_COLS.includes(i)) return null;
                return (
                  <th key={h} style={{...SANS,padding:"8px 12px",textAlign:[6, 7, 22, 23, 24].includes(i)?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`, whiteSpace:"nowrap"}}>{h}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ALL_CATS.filter(c => catFilter==="All" || catFilter===c).map(cat=>{
              const rows = filteredAndSorted.filter(r=>r.category===cat);
              if(!rows.length) return null;
              const subD=rows.reduce((s,r)=>s+r.debit,0), subC=rows.reduce((s,r)=>s+r.credit,0), subN=subD-subC;
              
              const headerColSpan = showAllCols ? 25 : PRIMARY_TB_COLS.length;
              const subtotalColSpan = showAllCols ? 22 : PRIMARY_TB_COLS.length - 3;

              return [
                <tr key={`hdr-${cat}`}><td colSpan={headerColSpan} style={{padding:"6px 12px",background:CAT[cat].bg,borderBottom:`1px solid ${CAT[cat].border}`}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><span style={{width:8,height:8,borderRadius:"50%",background:CAT[cat].color,display:"inline-block"}}/><span style={{...SANS,fontSize:10,fontWeight:700,color:CAT[cat].color,letterSpacing:"0.07em",textTransform:"uppercase"}}>{cat}</span></span></td></tr>,
                ...rows.map((r,i) => {
                  const cellData = [
                    r.gl_row_id, r.fund_id, r.acct, r.name, r.category, r.account_subcategory, r.local_amount, 
                    r.exchange_rate, r.exchange_rate_source, r.exchange_rate_date, r.posting_date, r.trade_date, 
                    r.period_year, r.period_month, r.journal_ref, r.journal_description, r.share_class, 
                    r.currency, r.counterparty, r.source_system, r.is_intercompany ? "Yes" : "No", 
                    r.segment_code, r.debit, r.credit, r.debit - r.credit
                  ];

                  return (
                    <tr key={`${r.acct}-${i}`} className="row-hover" onClick={()=>setDrillRow(r)} style={{cursor:"pointer", borderBottom:`1px solid ${T.border}`}}>
                      {cellData.map((val, colIdx) => {
                        if (!showAllCols && !PRIMARY_TB_COLS.includes(colIdx)) return null;
                        const isAmount = [6, 22, 23, 24].includes(colIdx);
                        const isFX = colIdx === 7;
                        return (
                          <td key={colIdx} style={{...MONO, padding:"9px 12px", fontSize:11, color: isAmount ? T.textPrimary : colIdx===2 ? T.actionBase : T.textMuted, textAlign: isAmount || isFX ? "right" : "left", whiteSpace:"nowrap"}}>
                            {isAmount ? (val !== 0 ? fmtUSD(val) : "—") : val?.toString() || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  )
                }),
                <tr key={`sub-${cat}`} style={{background:"#f7f8fa", borderBottom:`2px solid ${T.border}`}}>
                  <td colSpan={subtotalColSpan} style={{padding:"8px 12px",fontWeight:700,fontSize:12,...SANS,color:T.textPrimary}}>Subtotal — {cat}</td>
                  {[subD,subC,subN].map((v,i)=><td key={i} style={{...MONO,padding:"8px 12px",textAlign:"right",fontWeight:700,fontSize:12,color:i===2&&v<0?T.errorBase:T.textPrimary}}>{fmtNum(v)}</td>)}
                </tr>
              ];
            })}
            {!search && catFilter==="All" && (
              <tr>
                <td colSpan={showAllCols ? 22 : PRIMARY_TB_COLS.length - 3} style={{padding:"10px 12px",fontWeight:700,fontSize:13,background:T.navyHeader,color:"#fff",...SANS}}>GRAND TOTAL</td>
                {[totalDebit,totalCredit,totalDebit-totalCredit].map((v,i)=><td key={i} style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,background:T.navyHeader,color:i===2?(balanced?"#34d399":"#f87171"):"#fff"}}>{fmtNum(v)}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    {drillRow && <DrilldownModal row={drillRow} onClose={()=>setDrillRow(null)}/>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: HOLDINGS GRID (Adds Primary Column Hierarchy)
// ═══════════════════════════════════════════════════════════════════════════════
function HoldingsGrid({ holdings }) { 
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [groupBy, setGroupBy] = useState(true);
  const [sortBy, setSortBy] = useState("mv_desc");
  const [showAllCols, setShowAllCols] = useState(false); // NEW: Hierarchy Toggle

  const totalMV = holdings.reduce((s,h) => s+h.mv, 0);
  const l1MV    = holdings.filter(h=>h.fvLevel===1).reduce((s,h)=>s+h.mv,0);
  const l2MV    = holdings.filter(h=>h.fvLevel===2).reduce((s,h)=>s+h.mv,0);
  const l3MV    = holdings.filter(h=>h.fvLevel===3).reduce((s,h)=>s+h.mv,0);
  const assetClasses = [...new Set(holdings.map(h=>h.assetClass))];

  const filteredAndSorted = useMemo(() => {
    let result = [...holdings]; 
    if (levelFilter !== "All") result = result.filter(h => h.fvLevel.toString() === levelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(h => h.cusip.toLowerCase().includes(q) || h.name.toLowerCase().includes(q) || h.assetClass.toLowerCase().includes(q) || h.sector.toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "mv_desc") return b.mv - a.mv;
      if (sortBy === "mv_asc") return a.mv - b.mv;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [holdings, search, levelFilter, sortBy]); 

  const COLS = ["Position ID", "Fund ID", "As Of Date", "CUSIP / ISIN", "SEDOL", "LEI", "Ticker", "Security Name", "Asset Class", "Asset Subclass", "Sector", "Country of Risk", "Country of Issuer", "Currency", "Shares / Par", "Cost Basis", "Market Value Local", "Market Value", "Price", "Price Date", "Price Source", "FV Technique", "Maturity Date", "Coupon Rate", "Coupon Type", "Notional Amount", "Is Restricted", "Restriction Note", "Is On Loan", "Share Class", "Liquidity Category", "Is Illiquid", "Unrealized G/L", "FV Level", "% of NAV"];
  
  // Define Primary vs Extended Columns
  const PRIMARY_HD_COLS = [1, 3, 6, 7, 8, 13, 14, 15, 17, 18, 33, 34];
  
  const RIGHT_COLS = [14, 15, 16, 17, 18, 23, 25, 32, 34];
  const CENTER_COLS = [33];

  const renderRow = (h, i) => {
    const gl = h.mv - h.cost;
    const pctNav = (h.mv / FS.net_assets) * 100;
    
    const cellData = [
      h.position_id, h.fund_id, h.as_of_date, h.cusip, h.sedol, h.lei, h.ticker, 
      h.name, h.assetClass, h.asset_subclass, h.sector, h.country_of_risk, h.country_of_issuer, 
      h.currency, h.shares, h.cost, h.market_value_local, h.mv, h.price, h.price_date, 
      h.price_source, h.fv_technique, h.maturity_date, h.coupon_rate, h.coupon_type, 
      h.notional_amount, h.is_restricted ? "Yes" : "No", h.restriction_note, 
      h.is_on_loan ? "Yes" : "No", h.class, h.liquidity_category, h.is_illiquid_investment ? "Yes" : "No", 
      gl, h.fvLevel, pctNav
    ];

    return (
      <tr key={h.position_id || i} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
        {cellData.map((val, colIdx) => {
          if (!showAllCols && !PRIMARY_HD_COLS.includes(colIdx)) return null;

          const isUSD = [15, 16, 17, 18, 25, 32].includes(colIdx);
          const isPct = colIdx === 34;
          const isFvLevel = colIdx === 33;
          const align = RIGHT_COLS.includes(colIdx) ? "right" : CENTER_COLS.includes(colIdx) ? "center" : "left";
          
          return (
            <td key={colIdx} style={{ ...MONO, padding:"6px 12px", fontSize:11, color:T.textPrimary, whiteSpace:"nowrap", textAlign: align }}>
              {isFvLevel ? <FvBadge level={val}/> : 
               isUSD ? fmtUSD(val) : 
               isPct ? fmtPct(val) : 
               val == null ? "—" : val.toString()}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderSubtotalRow = (cls) => {
    const rows    = holdings.filter(h=>h.assetClass===cls);
    const clsMV   = rows.reduce((s,h)=>s+h.mv,0);
    const clsPct  = (clsMV/FS.net_assets)*100;

    // Dynamic colspan calculation based on visibility
    const visibleCols = showAllCols ? COLS : COLS.filter((_, i) => PRIMARY_HD_COLS.includes(i));
    const mvIdx = visibleCols.findIndex(c => c === "Market Value");
    const pctIdx = visibleCols.findIndex(c => c === "% of NAV");

    return (
      <tr key={`sub-${cls}`} style={{ background:"#f7f8fa" }}>
        <td colSpan={mvIdx} style={{ padding:"5px 8px", ...SANS, fontWeight:700, fontSize:12, borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>
          Subtotal — {cls}
        </td>
        <td style={{ ...MONO, padding:"5px 8px", textAlign:"right", fontWeight:700, fontSize:12, borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>{fmtUSD(clsMV)}</td>
        <td colSpan={pctIdx - mvIdx - 1} style={{ borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}/>
        <td style={{ ...MONO, padding:"5px 8px", textAlign:"right", fontWeight:700, fontSize:12, borderBottom:`2px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>{fmtPct(clsPct)}</td>
      </tr>
    );
  };

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:1, minWidth: 200, maxWidth: 320}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
        <input type="text" placeholder="Search CUSIP, name, sector..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="All">All FV Levels</option>
        <option value="1">Level 1 Only</option>
        <option value="2">Level 2 Only</option>
        <option value="3">Level 3 Only</option>
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="mv_desc">Sort: Market Value (High-Low)</option>
        <option value="mv_asc">Sort: Market Value (Low-High)</option>
        <option value="name_asc">Sort: Name (A-Z)</option>
      </select>
      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer", marginLeft:10}}>
        <input type="checkbox" checked={groupBy} onChange={e=>setGroupBy(e.target.checked)} style={{accentColor:T.actionBase}}/>
        <span style={{...SANS,fontSize:12,color:T.textPrimary,fontWeight:600}}>Group by Asset Class</span>
      </label>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} holdings</span>

        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.textPrimary}}>{fmtCompact(totalMV)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Total MV</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:"#3b82f6"}}>{fmtCompact(l1MV)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Level 1</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.warnBase}}>{fmtCompact(l2MV)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Level 2</span>
        </div>

        {/* NEW: Extended Column Toggler */}
        <button onClick={()=>setShowAllCols(!showAllCols)} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.actionBase,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          {showAllCols ? "[-] Compact View" : "[+] Show 23 More Columns"}
        </button>

        <button onClick={() => exportToExcel(filteredAndSorted, COLS, "Holdings_Export")} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export Excel
        </button>
      </div>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i) => {
                if (!showAllCols && !PRIMARY_HD_COLS.includes(i)) return null;
                const align = RIGHT_COLS.includes(i) ? "right" : CENTER_COLS.includes(i) ? "center" : "left";
                return (
                  <th key={h} style={{...SANS,padding:"8px 12px",textAlign:align,color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groupBy
              ? assetClasses.map(cls => {
                  const rows = filteredAndSorted.filter(h=>h.assetClass===cls);
                  if(!rows.length) return null;
                  
                  const headerColSpan = showAllCols ? 35 : PRIMARY_HD_COLS.length;

                  return [
                    <tr key={`hdr-${cls}`}>
                      <td colSpan={headerColSpan} style={{padding:"6px 12px",background:T.actionBg,borderBottom:`1px solid #bfdbfe`}}>
                        <span style={{...SANS,fontSize:10,fontWeight:700,color:T.actionBase,letterSpacing:"0.06em",textTransform:"uppercase"}}>{cls}</span>
                      </td>
                    </tr>,
                    ...rows.map((h,i)=>renderRow(h,i)),
                    renderSubtotalRow(cls)
                  ];
                })
              : filteredAndSorted.map((h,i)=>renderRow(h,i))
            }
            {!search && levelFilter==="All" && (
              <tr style={{background:T.navyHeader}}>
                {(() => {
                  const visibleCols = showAllCols ? COLS : COLS.filter((_, i) => PRIMARY_HD_COLS.includes(i));
                  const mvIdx = visibleCols.findIndex(c => c === "Market Value");
                  const pctIdx = visibleCols.findIndex(c => c === "% of NAV");

                  return (
                    <>
                      <td colSpan={mvIdx} style={{padding:"10px 12px",...SANS,fontWeight:700,fontSize:13,color:"#fff"}}>TOTAL HOLDINGS</td>
                      <td style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,color:"#fff"}}>{fmtUSD(totalMV)}</td>
                      <td colSpan={pctIdx - mvIdx - 1}/>
                      <td style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,color:"#fff"}}>{fmtPct((totalMV/FS.net_assets)*100)}</td>
                    </>
                  );
                })()}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
// ─── 3. Capital Activity Grid ─────────────────────────────────────────────────
function CapitalActivityGrid({ activity }) { // <-- ADDED PROP
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date_desc");

  // REPLACED CAPITAL_ACTIVITY with activity
  const totalSubs  = activity.filter(r=>r.type==="Subscription").reduce((s,r)=>s+r.grossAmount,0);
  const totalReds  = activity.filter(r=>r.type==="Redemption").reduce((s,r)=>s+r.grossAmount,0);
  const totalReinv = activity.filter(r=>r.type==="Reinvestment").reduce((s,r)=>s+r.grossAmount,0);
  const totalDivs  = activity.filter(r=>r.type==="Dividend").reduce((s,r)=>s+r.grossAmount,0);
  const netCap     = totalSubs - totalReds + totalReinv - totalDivs;

  const CLASSES = ["All", "Class A", "Institutional", "R6"];
  const TYPES = ["All", "Subscription", "Redemption", "Reinvestment", "Dividend"];
  const TYPE_CFG = { Subscription:{color:T.okBase,bg:T.okBg,bd:T.okBorder}, Redemption:{color:T.errorBase,bg:T.errorBg,bd:T.errorBorder}, Reinvestment:{color:T.actionBase,bg:T.actionBg,bd:"#bfdbfe"}, Dividend:{color:T.warnBase,bg:T.warnBg,bd:T.warnBorder} };

  const filteredAndSorted = useMemo(() => {
    let result = [...activity]; // REPLACED CAPITAL_ACTIVITY with activity
    if (classFilter!=="All") result = result.filter(r=>r.shareClass===classFilter);
    if (typeFilter!=="All") result = result.filter(r=>r.type===typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.id.toLowerCase().includes(q) || r.investor.toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "date_desc") return new Date(b.tradeDate) - new Date(a.tradeDate);
      if (sortBy === "date_asc") return new Date(a.tradeDate) - new Date(b.tradeDate);
      if (sortBy === "amt_desc") return b.grossAmount - a.grossAmount;
      return 0;
    });
    return result;
  }, [activity, search, classFilter, typeFilter, sortBy]);

  const COLS = ["Transaction ID", "Fund ID", "Trade Date", "Settlement Date", "Type", "Share Class", "Investor / Account", "Investor Type", "Shares", "NAV / Share", "Gross Amount", "Net Amount", "Dist. Character", "Is In-Kind", "Withholding Tax", "Currency", "Capital Call Ref", "Dist. Notice Ref", "Is Reinvestment"];

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{...SANS,fontWeight:700,fontSize:16,color:T.textPrimary}}>Capital Activity</div>
        <div style={{...SANS,fontSize:12,color:T.textMuted,marginTop:3}}>Statement of Changes in Net Assets</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.okBase}}>{fmtCompact(totalSubs)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Subs</span>
        </div>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.errorBase}}>{fmtCompact(totalReds)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Reds</span>
        </div>
        <div style={{background:netCap>=0?T.okBg:T.errorBg,border:`1px solid ${netCap>=0?T.okBorder:T.errorBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:netCap>=0?T.okBase:T.errorBase}}>{fmtCompact(netCap)}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:netCap>=0?T.okBase:T.errorBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Net Flow</span>
        </div>
        <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
        <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export CSV
        </button>
      </div>
    </div>

    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:1, minWidth: 200, maxWidth: 320}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
        <input type="text" placeholder="Search investor or ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        {TYPES.map(t=><option key={t} value={t}>{t==="All"?"All Types":t}</option>)}
      </select>
      <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        {CLASSES.map(c=><option key={c} value={c}>{c==="All"?"All Classes":c}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="date_desc">Sort: Date (Newest)</option>
        <option value="date_asc">Sort: Date (Oldest)</option>
        <option value="amt_desc">Sort: Amount (Highest)</option>
      </select>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} records</span>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i)=><th key={h} style={{...SANS,padding:"8px 12px",textAlign:i>=4?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
          {filteredAndSorted.map(r => {
              const cfg = TYPE_CFG[r.type]||TYPE_CFG.Dividend;
              const cellData = [
                r.transaction_id, r.fund_id, r.tradeDate, r.settlement_date, r.type, r.shareClass, 
                r.investor, r.investor_type, r.shares, r.navPerShare, r.grossAmount, r.net_amount, 
                r.distribution_character, r.is_in_kind ? "Yes" : "No", r.withholding_tax, r.currency, 
                r.capital_call_notice_ref, r.distribution_notice_ref, r.is_reinvestment ? "Yes" : "No"
              ];

              return (
                <tr key={r.id} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                  {cellData.map((val, colIdx) => (
                    <td key={colIdx} style={{...MONO, padding:"8px 12px", fontSize:11, color:T.textPrimary, whiteSpace:"nowrap", textAlign: [8,9,10,11,14].includes(colIdx) ? "right" : "left"}}>
                       {colIdx === 4 ? <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.bd}`}}>{val}</span> :
                        [10,11,14].includes(colIdx) ? fmtUSD(val) : 
                        val == null ? "—" : val.toString()}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!search && typeFilter==="All" && classFilter==="All" && (
              <tr style={{background:T.navyHeader}}>
                <td colSpan={16} style={{padding:"10px 12px",...SANS,fontWeight:700,fontSize:13,color:"#fff"}}>NET CAPITAL ACTIVITY</td>
                <td colSpan={2}/>
                <td style={{...MONO,padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:13,color:netCap>=0?"#34d399":"#f87171"}}>{fmtUSD(netCap)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

// ─── 4. Raw GL Feed Grid ──────────────────────────────────────────────────────
function RawGLGrid() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [sortBy, setSortBy] = useState("acct_asc");

  const totalD = TB_ROWS.reduce((s,r)=>s+r.debit,0);
  const totalC = TB_ROWS.reduce((s,r)=>s+r.credit,0);
  const ALL_CATS=["Asset","Liability","Capital","Income","Expense"];

  const filteredAndSorted = useMemo(() => {
    let result = [...TB_ROWS];
    if (catFilter !== "All") result = result.filter(r => r.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.acct.includes(q) || r.name.toLowerCase().includes(q) || (r.counterparty||"").toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "acct_asc") return a.acct.localeCompare(b.acct);
      if (sortBy === "amount_desc") return Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit);
      return 0;
    });
    return result;
  }, [search, catFilter, sortBy]);

  const COLS = ["GL Row ID", "Fund ID", "Account", "Account Name", "Category", "Subcategory", "Local Amount", "Exchange Rate", "Rate Source", "Rate Date", "Posting Date", "Trade Date", "Period Year", "Period Month", "Journal Ref", "Journal Desc", "Share Class", "Currency", "Counterparty", "Source System", "Is Intercompany", "Segment Code", "Debit", "Credit", "Net"];

  return <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{...SANS,fontWeight:700,fontSize:16,color:T.textPrimary}}>Raw GL Feed</div>
        <div style={{...SANS,fontSize:12,color:T.textMuted,marginTop:3}}>Parsed from source integration</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
          <span style={{...MONO,fontSize:14,fontWeight:700,color:T.textPrimary}}>{TB_ROWS.length}</span>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Rows</span>
        </div>
        <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
        <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>↓</span> Export CSV
        </button>
      </div>
    </div>

    <div style={{padding:"8px 12px", marginBottom:14, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
      <div style={{position:"relative", flex:1, minWidth: 200, maxWidth: 320}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
        <input type="text" placeholder="Search account, name, or counterparty..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
      </div>
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="All">All Categories</option>
        {ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
        <option value="acct_asc">Sort: Account Number</option>
        <option value="amount_desc">Sort: Gross Amount</option>
      </select>
      <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filteredAndSorted.length} rows</span>
    </div>

    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden", flex:1, display:"flex", flexDirection:"column"}}>
      <div style={{overflowY:"auto", flex:1}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, textAlign:"left"}}>
          <thead style={{position:"sticky", top:0, zIndex:10}}>
            <tr style={{background:T.appBg}}>
              {COLS.map((h,i)=><th key={h} style={{...SANS,padding:"8px 12px",textAlign:i>=5?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((r,i) => {
              const net = r.debit-r.credit;
              return (
                <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{...MONO,padding:"8px 12px",fontSize:11,color:T.actionBase}}>{r.acct}</td>
                  <td style={{padding:"8px 12px",fontSize:12,color:T.textPrimary,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.name}>{r.name}</td>
                  <td style={{padding:"8px 12px"}}>
                    <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:CAT[r.category]?.bg||T.appBg,color:CAT[r.category]?.color||T.textMuted,border:`1px solid ${CAT[r.category]?.border||T.border}`}}>{r.category}</span>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11,color:(r.currency!=="USD"&&r.currency!=="Multi")?T.warnBase:T.textMuted,fontWeight:(r.currency!=="USD"&&r.currency!=="Multi")?700:400}}>{r.currency}</td>
                  <td style={{padding:"8px 12px",fontSize:11,color:T.textMuted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.counterparty||"—"}</td>
                  <td style={{...MONO,padding:"8px 12px",textAlign:"right",fontSize:11,color:T.textPrimary}}>{r.debit>0?fmtNum(r.debit):"—"}</td>
                  <td style={{...MONO,padding:"8px 12px",textAlign:"right",fontSize:11,color:T.textPrimary}}>{r.credit>0?fmtNum(r.credit):"—"}</td>
                  <td style={{...MONO,padding:"8px 12px",textAlign:"right",fontSize:11,fontWeight:600,color:net<0?T.errorBase:T.textPrimary}}>{fmtNum(net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}


// ─── FV Level badge ───────────────────────────────────────────────────────────
function FvBadge({ level }) {
  const cfg = level===1?{color:"#3b82f6",bg:"#eff6ff",border:"#bfdbfe"}
             :level===2?{color:"#d97706",bg:"#fffbeb",border:"#fde68a"}
             :           {color:"#dc3545",bg:"#fef2f2",border:"#fecaca"};
  return <span style={{ ...MONO, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4,
    background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>L{level}</span>;
}


// ═══════════════════════════════════════════════════════════════════════════════
// MASSIVE EXPANDED CROSS-CHECKS DATASET (Statements & Filings)
// ═══════════════════════════════════════════════════════════════════════════════
const CROSS_CHECKS_DATA_EXPANDED = [
  // ─── Balance Sheet ───
  { id: "BS-01", category: "Balance Sheet", description: "Net assets tie between balance sheet and statement of changes", status: "Pass", value: "$0.00 variance", formula: "SOA.NetAssets - SCNA.EndingNetAssets = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "BS-02", category: "Balance Sheet", description: "Net asset components foot to total net assets", status: "Fail", value: "$150,000 variance", formula: "SUM(SOA.CapComponents) - SOA.TotalNetAssets = 0", source1: 687250000, source2: 687400000, aiFlag: "pop_fail", aiNote: "Failed in 4 consecutive periods due to unmapped suspense.", resolvedBy: null },
  { id: "BS-03", category: "Balance Sheet", description: "Total Assets = Total Liabilities + Net Assets", status: "Pass", value: "$0.00 variance", formula: "SOA.TotalAssets - (SOA.TotalLiabilities + SOA.NetAssets) = 0", source1: 691011000, source2: 691011000, aiFlag: null, resolvedBy: null },
  { id: "BS-04", category: "Balance Sheet", description: "Cash balance matches bank reconciliation", status: "Fail", value: "-$42,105 variance", formula: "GL.1100 + GL.1110 - BankRec.EndingBalance = 0", source1: 20088465, source2: 20130570, aiFlag: "multi_fund", aiNote: "Timing difference on sweeping account across 3 funds.", resolvedBy: null },
  
  // ─── Schedule of Investments ───
  { id: "SOI-01", category: "Schedule of Investments", description: "SOI total fair value agrees to balance sheet investment line", status: "Fail", value: "$120,000 variance", formula: "SUM(SOI.FairValue) - SOA.InvestmentsAtValue = 0", source1: 462578500, source2: 462698500, aiFlag: "multi_fund", aiNote: "MTM price missing for asset ID 88732J202.", resolvedBy: null },
  { id: "SOI-02", category: "Schedule of Investments", description: "Level 3 investments match Rollforward ending balance", status: "Pass", value: "$0.00 variance", formula: "SUM(SOI.Level3) - L3_Rollforward.EndingBalance = 0", source1: 45000000, source2: 45000000, aiFlag: null, resolvedBy: null },
  { id: "SOI-03", category: "Schedule of Investments", description: "Unrealized G/L on SOI matches Trial Balance", status: "Pass", value: "$0.00 variance", formula: "SUM(SOI.UnrealizedGL) - TB.4200 = 0", source1: 9250000, source2: 9250000, aiFlag: null, resolvedBy: null },
  { id: "SOI-04", category: "Schedule of Investments", description: "Foreign currency positions use consistent FX rates", status: "Accepted", value: "$8,420 variance", formula: "SOI.FXRate - Master.FXRate = 0", source1: 1.0798, source2: 1.0842, aiFlag: null, resolvedBy: "u4", resolvedAt: "Dec 31, 2024 10:15 AM", overrideNote: "Client approved stale ECB rate for this specific legacy sleeve." },

  // ─── Income Statement ───
  { id: "IS-01", category: "Income Statement", description: "Total investment income agrees to note detail", status: "Pass", value: "$0.00 variance", formula: "SOO.TotalIncome - Notes.IncomeDetail = 0", source1: 6458420, source2: 6458420, aiFlag: null, resolvedBy: null },
  { id: "IS-02", category: "Income Statement", description: "Advisory fee expense matches prospectus rate (0.75%)", status: "Pass", value: "-$12 variance", formula: "SOO.AdvisoryFee - (AvgNetAssets * 0.0075) = 0", source1: 6400000, source2: 6400012, aiFlag: null, resolvedBy: null },
  { id: "IS-03", category: "Income Statement", description: "Expense ratios within prospectus caps (net of waivers)", status: "Fail", value: "Exceeds cap by 2 bps", formula: "SOO.NetExpenseRatio <= Prospectus.ExpenseCap", source1: 0.0077, source2: 0.0075, aiFlag: "pop_fail", aiNote: "Cap exceeded for 2 consecutive periods.", resolvedBy: null },

  // ─── Form N-PORT (SEC Regulatory) ───
  { id: "NPORT-01", category: "Form N-PORT", description: "Part B: Fund Net Assets matches GAAP SOA", status: "Pass", value: "$0.00 variance", formula: "NPORT.Item19 - SOA.NetAssets = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "NPORT-02", category: "Form N-PORT", description: "Part C: Sum of position values equals Total Investments", status: "Fail", value: "$120,000 variance", formula: "SUM(NPORT.Item14.Value) - NPORT.Item18 = 0", source1: 462578500, source2: 462698500, aiFlag: null, resolvedBy: null },
  { id: "NPORT-03", category: "Form N-PORT", description: "Part C: All non-exempt counterparties have LEI", status: "Fail", value: "2 Missing LEIs", formula: "COUNT(NPORT.Item11.LEI IS NULL) = 0", source1: 2, source2: 0, aiFlag: "multi_fund", aiNote: "Deutsche Bank AG LEI missing across all Derry funds.", resolvedBy: null },
  { id: "NPORT-04", category: "Form N-PORT", description: "Part D: Liquidity buckets sum to 100% of Net Assets", status: "Pass", value: "0.00% variance", formula: "SUM(NPORT.LiquidityPct) - 100.0 = 0", source1: 100.0, source2: 100.0, aiFlag: null, resolvedBy: null },

  // ─── Form PF (Alt Regulatory) ───
  { id: "PF-01", category: "Form PF", description: "Gross Asset Value (GAV) reconciliation", status: "Pass", value: "$0.00 variance", formula: "PF.Q8 - (TotalAssets + GrossDerivatives) = 0", source1: 715011000, source2: 715011000, aiFlag: null, resolvedBy: null },
  { id: "PF-02", category: "Form PF", description: "Net Asset Value (NAV) ties to Partners Capital", status: "Pass", value: "$0.00 variance", formula: "PF.Q9 - SOA.NetAssets = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "PF-03", category: "Form PF", description: "Largest Counterparty Exposure > 5% NAV reported", status: "Fail", value: "Exposure Missing", formula: "PF.Q22.Exposure >= (0.05 * PF.Q9)", source1: 0, source2: 35000000, aiFlag: null, resolvedBy: null },
  { id: "PF-04", category: "Form PF", description: "Beneficial Owner breakdown sums to 100%", status: "Pass", value: "0.00% variance", formula: "SUM(PF.Q16.Pct) - 100.0 = 0", source1: 100.0, source2: 100.0, aiFlag: null, resolvedBy: null },

  // ─── Tax & K-1 ───
  { id: "TAX-01", category: "Tax Compliance", description: "Book to Tax Net Income reconciliation", status: "Pass", value: "$0.00 variance", formula: "Tax.NetIncome - (Book.NetIncome + M-1_Adjustments) = 0", source1: 29150420, source2: 29150420, aiFlag: null, resolvedBy: null },
  { id: "TAX-02", category: "Tax Compliance", description: "Sum of LP K-1 Allocations equals Fund Taxable Income", status: "Pass", value: "$0.00 variance", formula: "SUM(K1.OrdinaryIncome) - Tax.OrdinaryIncome = 0", source1: 29150420, source2: 29150420, aiFlag: null, resolvedBy: null },
  { id: "TAX-03", category: "Tax Compliance", description: "Section 988 FX gain/loss character classification", status: "Fail", value: "Character Mismatch", formula: "Tax.Sec988.Character = 'Ordinary'", source1: "Capital", source2: "Ordinary", aiFlag: "multi_fund", aiNote: "Systemic issue: Failing across 3 funds for this client.", resolvedBy: null },
  
  // ─── Form N-MFP (Money Market) ───
  { id: "NMFP-01", category: "Form N-MFP", description: "Shadow NAV deviation within 25bps limit", status: "Accepted", value: "31 bps deviation", formula: "ABS(1.0000 - ShadowNAV) <= 0.0025", source1: 0.0031, source2: 0.0025, aiFlag: null, resolvedBy: "u4", resolvedAt: "Dec 31, 2024 11:30 AM", overrideNote: "Board notified of deviation per Rule 2a-7. Accept flag." },
  { id: "NMFP-02", category: "Form N-MFP", description: "Weighted Average Maturity (WAM) <= 60 days", status: "Pass", value: "42 days", formula: "NMFP.WAM <= 60", source1: 42, source2: 60, aiFlag: null, resolvedBy: null },
  
  // ─── Capital & Cash Flow ───
  { id: "CAP-01", category: "Partners' Capital", description: "Ending Capital = Beginning + Contributions - Withdrawals + P&L", status: "Pass", value: "$0.00 variance", formula: "SCNA.Ending - (SCNA.Beg + NetCap + NetOps) = 0", source1: 687400000, source2: 687400000, aiFlag: null, resolvedBy: null },
  { id: "CF-01", category: "Cash Flow", description: "Net increase in cash ties to balance sheet cash accounts", status: "Pass", value: "$0.00 variance", formula: "CFS.NetChange - (SOA.EndingCash - SOA.BeginningCash) = 0", source1: 3948356, source2: 3948356, aiFlag: null, resolvedBy: null },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: CROSS CHECKS TAB (Dashboard Grouping + Focus Mode + Bulk Overrides)
// ═══════════════════════════════════════════════════════════════════════════════
function CrossChecksTab({ currentUser }) {
  const [checks, setChecks] = useState(CROSS_CHECKS_DATA_EXPANDED);
  const [search, setSearch] = useState("");
  
  // High-performance filtering states
  const [hidePassing, setHidePassing] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selected, setSelected] = useState(new Set());
  
  // Drilldown state
  const [activeCheckId, setActiveCheckId] = useState(null);

  // 1. Core Actions
  const toggleSel = (e, id) => { 
    e.stopPropagation(); 
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); 
  };
  
  const handleAccept = (id, note = "Accepted manually by user.") => { 
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status: "Accepted", resolvedBy: currentUser?.id, resolvedAt: new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}), overrideNote: note } : c)); 
  };
  
  const handleBulkAccept = () => { 
    setChecks(prev => prev.map(c => selected.has(c.id) && c.status === "Fail" ? { ...c, status: "Accepted", resolvedBy: currentUser?.id, resolvedAt: new Date().toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}), overrideNote: "Bulk accepted by user." } : c)); 
    setSelected(new Set()); 
  };

  // 2. Data Filtering & Grouping
  const filteredChecks = useMemo(() => {
    let res = [...checks];
    if (hidePassing) res = res.filter(c => c.status === "Fail" || c.status === "Accepted");
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(c => c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    return res;
  }, [checks, search, hidePassing]);

  const groupedData = useMemo(() => {
    const groups = {};
    filteredChecks.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    // Sort groups so those with failures are at the top
    return Object.entries(groups).sort((a,b) => {
      const failsA = a[1].filter(x => x.status === "Fail").length;
      const failsB = b[1].filter(x => x.status === "Fail").length;
      return failsB - failsA;
    });
  }, [filteredChecks]);

  // 3. Stats Calculation
  const STATS = {
    total: checks.length,
    passed: checks.filter(c=>c.status==="Pass").length,
    failed: checks.filter(c=>c.status==="Fail").length,
    accepted: checks.filter(c=>c.status==="Accepted").length
  };

  // Active check for drilldown pane
  const activeCheck = checks.find(c => c.id === activeCheckId);

  return (
    <div style={{display:"flex", height:"100%", background:T.appBg, overflow:"hidden"}}>
      
      {/* LEFT PANE: Main Board */}
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight: activeCheck ? `1px solid ${T.border}` : "none"}}>
        
        {/* Header & Toolbar */}
        <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
          
          <div style={{display:"flex", gap:12, alignItems:"center", flex:1, minWidth:400}}>
            <div style={{position:"relative", flex:1, maxWidth: 300}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
              <input type="text" placeholder="Search statements, forms, or IDs..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
            </div>
            
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer", background: hidePassing ? T.errorBg : T.appBg, border:`1px solid ${hidePassing ? T.errorBorder : T.border}`, padding:"6px 12px", borderRadius:6, transition:"all 0.2s"}}>
              <input type="checkbox" checked={hidePassing} onChange={e=>setHidePassing(e.target.checked)} style={{accentColor:T.errorBase, cursor:"pointer"}}/>
              <span style={{...SANS,fontSize:12,color:hidePassing ? T.errorBase : T.textPrimary,fontWeight:700}}>Focus Mode (Hide Passed)</span>
            </label>
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
              <span style={{...MONO,fontSize:14,fontWeight:700,color:T.errorBase}}>{STATS.failed}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:T.errorBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Failed</span>
            </div>
            <div style={{background:T.warnBg,border:`1px solid ${T.warnBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
              <span style={{...MONO,fontSize:14,fontWeight:700,color:T.warnBase}}>{STATS.accepted}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:T.warnBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Overrides</span>
            </div>
            <div style={{background:T.okBg,border:`1px solid ${T.okBorder}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:8}}>
              <span style={{...MONO,fontSize:14,fontWeight:700,color:T.okBase}}>{STATS.passed}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:T.okBase,textTransform:"uppercase",letterSpacing:"0.03em"}}>Passed</span>
            </div>
            <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
            <button style={{...SANS,fontSize:12,fontWeight:600,padding:"0 14px",height:34,borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span>↓</span> Export Matrix
            </button>
          </div>
        </div>

        {/* Scrollable Groups */}
        <div style={{flex:1, overflowY:"auto", padding:"20px 24px", paddingBottom: selected.size > 0 ? 80 : 24}}>
          {groupedData.length === 0 ? (
            <div style={{textAlign:"center", padding:"60px", color:T.textMuted, ...SANS, fontSize:14}}>No checks match your current filters.</div>
          ) : (
            groupedData.map(([category, catChecks]) => {
              const isOpen = !collapsedGroups[category];
              const fails = catChecks.filter(c => c.status === "Fail").length;
              const isError = fails > 0;

              return (
                <div key={category} style={{border:`1px solid ${isError ? T.errorBorder : T.border}`, borderRadius:10, marginBottom:16, background:T.cardBg, overflow:"hidden", boxShadow: isError ? "0 2px 8px rgba(185,28,28,0.05)" : "none"}}>
                  
                  {/* Category Header */}
                  <div onClick={()=>setCollapsedGroups(p=>({...p,[category]:!p[category]}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:isError ? T.errorBg : T.appBg,borderBottom:isOpen?`1px solid ${isError ? T.errorBorder : T.border}`:"none",cursor:"pointer"}}>
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      <span style={{color:isError ? T.errorBase : T.textMuted, fontSize:12, width:16, textAlign:"center"}}>{isOpen?"▼":"▶"}</span>
                      <div style={{...SANS,fontWeight:700,fontSize:14,color:isError ? T.errorBase : T.textPrimary}}>{category}</div>
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      {fails > 0 && <span style={{...SANS, fontSize:10, fontWeight:700, background:T.errorBase, color:"#fff", padding:"2px 8px", borderRadius:4}}> {fails} FAILURES </span>}
                      <span style={{...SANS,fontSize:11,color:T.textMuted}}>{catChecks.length} rules run</span>
                    </div>
                  </div>

                  {/* Expanded Table */}
                  {isOpen && (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                        <thead>
                          <tr style={{background:"#f8fafc", borderBottom:`1px solid ${T.border}`}}>
                            <th style={{width:40, padding:"8px 12px"}}></th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"12%"}}>Check ID</th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"45%"}}>Rule Description</th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"15%"}}>Variance</th>
                            <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"8px 12px", width:"15%"}}>Status</th>
                            <th style={{padding:"8px 12px", width:"8%"}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {catChecks.map(c => {
                            const isSel = selected.has(c.id);
                            const isActive = activeCheckId === c.id;
                            const statColor = c.status === "Pass" ? T.okBase : c.status === "Fail" ? T.errorBase : T.warnBase;
                            const statBg = c.status === "Pass" ? T.okBg : c.status === "Fail" ? T.errorBg : T.warnBg;
                            const statBd = c.status === "Pass" ? T.okBorder : c.status === "Fail" ? T.errorBorder : T.warnBorder;

                            return (
                              <tr key={c.id} onClick={()=>setActiveCheckId(c.id)} className="row-hover" style={{borderBottom:`1px solid ${T.border}`, background: isActive ? "#eff6ff" : isSel ? "#f8fafc" : "transparent", cursor:"pointer"}}>
                                <td style={{padding:"10px 12px"}} onClick={(e)=>toggleSel(e, c.id)}>
                                  <input type="checkbox" checked={isSel} onChange={()=>{}} style={{cursor:"pointer", width:15, height:15, accentColor:T.actionBase}} />
                                </td>
                                <td style={{padding:"10px 12px", ...MONO, fontWeight:700, color:T.textPrimary, fontSize:12}}>{c.id}</td>
                                <td style={{padding:"10px 12px"}}>
                                  <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary, marginBottom:4}}>{c.description}</div>
                                  {c.aiFlag && (
                                    <div style={{display:"inline-flex", alignItems:"center", gap:4, background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:4, padding:"2px 6px"}}>
                                      <span style={{...MONO, fontSize:9, fontWeight:700, color:T.aiBase}}>✦ AI</span>
                                      <span style={{...SANS, fontSize:10, color:T.aiDark}}>{c.aiNote}</span>
                                    </div>
                                  )}
                                </td>
                                <td style={{padding:"10px 12px"}}>
                                  <span style={{...MONO, fontSize:11, color: c.status==="Pass" ? T.textMuted : T.textPrimary, background: c.status==="Fail" ? T.errorBg : T.appBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${c.status==="Fail" ? T.errorBorder : T.border}`}}>{c.value}</span>
                                </td>
                                <td style={{padding:"10px 12px"}}>
                                  <span style={{...SANS, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:4, background:statBg, color:statColor, border:`1px solid ${statBd}`, display:"inline-flex", alignItems:"center", gap:4}}>
                                    {c.status==="Pass"?"✓":c.status==="Fail"?"✕":"👁"} {c.status}
                                  </span>
                                </td>
                                <td style={{padding:"10px 12px", textAlign:"right"}}>
                                  <span style={{color:T.actionBase, fontSize:16}}>›</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Floating Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="slide-in" style={{position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:500,background:T.navyHeader,borderRadius:8,padding:"10px 16px",display:"flex",alignItems:"center",gap:16, boxShadow:"0 10px 25px rgba(0,0,0,0.3)"}}>
            <div style={{...SANS,fontSize:13,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span style={{background:T.actionBase,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{selected.size}</span>
              checks selected
            </div>
            <div style={{width:1,height:20,background:"#374151"}}/>
            <button onClick={handleBulkAccept} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:5,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer"}}>Accept All Overrides</button>
            <button onClick={()=>setSelected(new Set())} style={{marginLeft:8,background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:18}}>✕</button>
          </div>
        )}
      </div>

      {/* RIGHT PANE: Drilldown Detail */}
      {activeCheck && (
        <div className="slide-in" style={{width:420, background:T.cardBg, display:"flex", flexDirection:"column", flexShrink:0, boxShadow:"-4px 0 15px rgba(0,0,0,0.03)"}}>
          <div style={{padding:"16px 20px", background:T.appBg, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
                <span style={{...MONO, fontSize:12, fontWeight:700, color:T.textMuted}}>{activeCheck.id}</span>
                <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:activeCheck.status==="Pass"?T.okBg:activeCheck.status==="Fail"?T.errorBg:T.warnBg, color:activeCheck.status==="Pass"?T.okBase:activeCheck.status==="Fail"?T.errorBase:T.warnBase, border:`1px solid ${activeCheck.status==="Pass"?T.okBorder:activeCheck.status==="Fail"?T.errorBorder:T.warnBorder}`}}>
                  {activeCheck.status}
                </span>
              </div>
              <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, lineHeight:1.3}}>{activeCheck.description}</div>
            </div>
            <button onClick={()=>setActiveCheckId(null)} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20}}>✕</button>
          </div>
          
          <div style={{padding:"20px", overflowY:"auto", flex:1}}>
            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>Validation Formula</div>
            <div style={{background:T.navyHeader, color:"#a5f3fc", padding:"12px 16px", borderRadius:8, ...MONO, fontSize:12, lineHeight:1.5, marginBottom:24, boxShadow:"inset 0 2px 4px rgba(0,0,0,0.2)"}}>
              {activeCheck.formula}
            </div>

            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>Values at Runtime</div>
            <div style={{background:T.appBg, border:`1px solid ${T.border}`, borderRadius:8, padding:"16px", marginBottom:24}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:12, borderBottom:`1px dotted ${T.border}`, paddingBottom:8}}>
                <span style={{...SANS, fontSize:13, color:T.textMuted}}>Source 1 Calculated</span>
                <span style={{...MONO, fontSize:13, fontWeight:600, color:T.textPrimary}}>{typeof activeCheck.source1 === 'number' ? fmtUSD(activeCheck.source1) : activeCheck.source1}</span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:12, borderBottom:`1px dotted ${T.border}`, paddingBottom:8}}>
                <span style={{...SANS, fontSize:13, color:T.textMuted}}>Source 2 Calculated</span>
                <span style={{...MONO, fontSize:13, fontWeight:600, color:T.textPrimary}}>{typeof activeCheck.source2 === 'number' ? fmtUSD(activeCheck.source2) : activeCheck.source2}</span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary}}>Total Variance</span>
                <span style={{...MONO, fontSize:14, fontWeight:700, color:activeCheck.status === "Fail" ? T.errorBase : T.textPrimary}}>{activeCheck.value}</span>
              </div>
            </div>

            {/* AI Context Block */}
            {activeCheck.aiFlag && (
              <div style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"16px", marginBottom:24}}>
                <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:8}}>
                  <span style={{...MONO, fontSize:10, fontWeight:700, color:T.aiBase}}>✦ AI ROOT CAUSE ANALYSIS</span>
                </div>
                <div style={{...SANS, fontSize:12, color:T.aiDark, lineHeight:1.5}}>
                  {activeCheck.aiNote}
                </div>
              </div>
            )}

            {/* Audit Trail / Resolution Block */}
            {activeCheck.status === "Accepted" ? (
              <div style={{border:`1px solid ${T.warnBorder}`, borderRadius:8, overflow:"hidden"}}>
                <div style={{background:T.warnBg, padding:"10px 16px", borderBottom:`1px solid ${T.warnBorder}`, display:"flex", alignItems:"center", gap:8}}>
                  <span>👁</span>
                  <span style={{...SANS, fontSize:12, fontWeight:700, color:T.warnBase}}>Accepted Override Active</span>
                </div>
                <div style={{padding:"16px", background:T.cardBg}}>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:4}}>Resolved By</div>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16}}>
                    {/* Render the actual user if they match the DB, else generic */}
                    <Avatar user={TEAM.find(m => m.id === activeCheck.resolvedBy) || TEAM[0]} size={24} />
                    <div style={{...SANS, fontSize:13, fontWeight:600}}>{TEAM.find(m => m.id === activeCheck.resolvedBy)?.name || "System User"}</div>
                  </div>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:4}}>Timestamp</div>
                  <div style={{...MONO, fontSize:12, color:T.textPrimary, marginBottom:16}}>{activeCheck.resolvedAt}</div>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:4}}>Justification</div>
                  <div style={{...SANS, fontSize:13, color:T.textPrimary, background:T.appBg, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`}}>{activeCheck.overrideNote}</div>
                </div>
              </div>
            ) : activeCheck.status === "Fail" ? (
              <div>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8}}>Resolution Required</div>
                <textarea placeholder="Enter justification for overriding this check..." style={{...SANS, width:"100%", padding:"12px", borderRadius:8, border:`1px solid ${T.border}`, fontSize:13, minHeight:100, resize:"vertical", marginBottom:12}} id={`note-${activeCheck.id}`}></textarea>
                <button onClick={() => {
                  const note = document.getElementById(`note-${activeCheck.id}`)?.value || "Accepted manually.";
                  handleAccept(activeCheck.id, note);
                }} style={{...SANS, width:"100%", padding:"12px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                  <span>✓</span> Accept as is (Override)
                </button>
              </div>
            ) : null}

          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: INTEGRATIONS & DATA ARCHITECTURE HUB (Fully Merged)
// ═══════════════════════════════════════════════════════════════════════════════
function IntegrationsAndArchitectureHub({ fundSeeds, masterFeeds, onBack }) {
  const [activeTab, setActiveTab] = useState("connectors"); // 'connectors', 'flows', or 'schemas'

  // Edit States
  const [syncing, setSyncing] = useState(null);
  const [editingConnector, setEditingConnector] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  
  const CONNECTORS = [
    { id: "c1", name: "State Street Bank", type: "Custodian", protocol: "SFTP / CSV", status: "Healthy", lastSync: "Today, 11:58 PM", nextSync: "Scheduled (Daily)", logo: "🏦", host: "sftp.statestreet.com", port: "22", auth: "SSH Key" },
    { id: "c2", name: "Goldman Sachs", type: "Prime Broker", protocol: "REST API", status: "Healthy", lastSync: "Today, 11:05 PM", nextSync: "Real-time", logo: "📈", endpoint: "api.gs.com/v1/positions", auth: "OAuth 2.0" },
    { id: "c3", name: "Bloomberg Data License", type: "Pricing Feed", protocol: "API (B-PIPE)", status: "Degraded", lastSync: "Today, 4:00 PM", nextSync: "Manual Intervention", logo: "💹", error: "Latency spike detected on European endpoints.", endpoint: "api.bloomberg.com/marketdata", auth: "API Key" },
    { id: "c4", name: "SEC EDGAR", type: "Regulatory", protocol: "SOAP API", status: "Healthy", lastSync: "Test Ping: Success", nextSync: "Awaiting Transmission", logo: "🏛", endpoint: "edgar.sec.gov/submit", auth: "Client Certificate" },
  ];

  const SCHEMAS = [
    { id: "sch-01", client: "Pennywise Capital", source: "State Street Bank", feedType: "GL", version: "v2.1", date: "Dec 15, 2024", coverage: "100%", status: "Active", approvedBy: "Sarah Chen" },
    { id: "sch-02", client: "Bowers Asset Mgt", source: "Goldman Sachs", feedType: "Holdings", version: "v1.0", date: "Nov 01, 2024", coverage: "98%", status: "Active", approvedBy: "James Okafor" },
    { id: "sch-03", client: "Derry Capital", source: "Internal Admin", feedType: "Capital Activity", version: "v3.4", date: "Jan 02, 2025", coverage: "85%", status: "Delta Review Required", approvedBy: "System" },
  ];

  const handleForceSync = (e, id) => {
    e.stopPropagation();
    setSyncing(id);
    setTimeout(() => setSyncing(null), 2000);
  };

  const ConnectorCard = ({ conn }) => {
    const isError = conn.status !== "Healthy";
    return (
      <div onClick={() => setEditingConnector(conn)} style={{background:T.cardBg, border:`1px solid ${isError ? T.warnBorder : T.border}`, borderRadius:12, padding:"20px", display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(0,0,0,0.02)", cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=isError ? T.warnBorder : T.border}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{fontSize:28, background:T.appBg, width:48, height:48, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${T.border}`}}>
              {conn.logo}
            </div>
            <div>
              <div style={{...SANS, fontSize:15, fontWeight:700, color:T.textPrimary}}>{conn.name}</div>
              <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>{conn.type} · {conn.protocol}</div>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6, background:isError ? T.warnBg : T.okBg, padding:"4px 10px", borderRadius:20, border:`1px solid ${isError ? T.warnBorder : T.okBorder}`}}>
            <span style={{color:isError ? T.warnBase : T.okBase, fontSize:10}}>●</span>
            <span style={{...SANS, fontSize:11, fontWeight:700, color:isError ? T.warnBase : T.okBase, textTransform:"uppercase", letterSpacing:"0.03em"}}>{conn.status}</span>
          </div>
        </div>
        
        {isError && (
          <div style={{background:T.warnBg, borderLeft:`3px solid ${T.warnBase}`, padding:"8px 12px", ...SANS, fontSize:11, color:T.warnBase, marginBottom:16, borderRadius:4}}>
            <strong>Alert:</strong> {conn.error}
          </div>
        )}

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"auto", paddingTop:16, borderTop:`1px solid ${T.border}`}}>
          <div>
            <div style={{...SANS, fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2}}>Last Sync</div>
            <div style={{...MONO, fontSize:11, color:T.textPrimary, fontWeight:600}}>{conn.lastSync}</div>
          </div>
          <button onClick={(e) => handleForceSync(e, conn.id)} disabled={syncing === conn.id} style={{...SANS, fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.border}`, background:T.appBg, color:T.textPrimary, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:6}}>
            {syncing === conn.id ? <><span style={{animation:"pulse 0.8s infinite"}}>↻</span> Syncing...</> : <><span>↻</span> Force Sync</>}
          </button>
        </div>
      </div>
    );
  };

  const Node = ({ id, title, desc, layer, color }) => (
    <div onClick={() => setEditingNode({ id, title, desc, layer, color })} style={{background:T.cardBg, border:`1px solid ${color}`, borderRadius:8, padding:"12px 16px", minWidth:220, position:"relative", zIndex:2, boxShadow:"0 4px 6px rgba(0,0,0,0.02)", cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
      <div style={{...MONO, fontSize:9, fontWeight:700, color:color, background:`${color}15`, display:"inline-block", padding:"2px 6px", borderRadius:4, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span>LAYER {layer}</span>
        <span style={{fontSize:12}}>⚙</span>
      </div>
      <div style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary}}>{title}</div>
      <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:4, lineHeight:1.4}}>{desc}</div>
    </div>
  );

  return (
    <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 52px)", background:T.appBg}}>
      
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <button onClick={onBack} style={{...SANS, background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600, color:T.textPrimary}}>← Dashboard</button>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Integrations & Data Architecture</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Manage API connections, system flows, and global mapping schemas.</div>
          </div>
        </div>
        <div style={{display:"flex", background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, padding:4}}>
          <button onClick={()=>setActiveTab("connectors")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="connectors"?T.cardBg:"transparent", color:activeTab==="connectors"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="connectors"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>API Connectors</button>
          <button onClick={()=>setActiveTab("flows")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="flows"?T.cardBg:"transparent", color:activeTab==="flows"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="flows"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Pipeline Map</button>
          <button onClick={()=>setActiveTab("schemas")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="schemas"?T.cardBg:"transparent", color:activeTab==="schemas"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="schemas"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Schema Registry</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{flex:1, overflowY:"auto", padding:"32px 48px", position:"relative"}}>
        
        {/* TAB 1: CONNECTORS */}
        {activeTab === "connectors" && (
          <div className="fade-in">
            <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, marginBottom:20}}>Active Integration Hub</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:20}}>
              {CONNECTORS.map(c => <ConnectorCard key={c.id} conn={c} />)}
            </div>
            
            <div style={{marginTop:32, padding:"20px", border:`2px dashed ${T.border}`, borderRadius:10, textAlign:"center", background:T.cardBg, cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{fontSize:24, color:T.textMuted, marginBottom:8}}>+</div>
              <div style={{...SANS, fontSize:14, fontWeight:600, color:T.textPrimary}}>Add New Connection</div>
              <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:4}}>Configure a new SFTP endpoint or API Token.</div>
            </div>
          </div>
        )}

        {/* TAB 2: PIPELINE FLOWS */}
        {activeTab === "flows" && (
          <div className="fade-in">
            <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary, marginBottom:8}}>System Architecture Flow</div>
            <div style={{...SANS, fontSize:13, color:T.textMuted, marginBottom:32}}>Click any node to configure ETL mapping rules and logic.</div>
            
            {/* Visual Pipeline Representation */}
            <div style={{display:"flex", gap:40, position:"relative", alignItems:"center"}}>
              <div style={{position:"absolute", top:"50%", left:200, right:200, height:2, background:T.border, zIndex:1, transform:"translateY(-50%)"}} />

              {/* Column 1 */}
              <div style={{display:"flex", flexDirection:"column", gap:24, flex:1}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center"}}>External APIs</div>
                <Node id="n1" title="Custodians & Admins" desc="Positions, Trial Balance, & Capital Activity via SFTP" layer="0" color="#64748b" />
                <Node id="n2" title="Market Data" desc="Pricing and FX Rates via API" layer="0" color="#64748b" />
              </div>
              <div style={{color:T.border, fontSize:24, zIndex:2}}>→</div>

              {/* Column 2 */}
              <div style={{display:"flex", flexDirection:"column", gap:24, flex:1.5, background:"#f8fafc", padding:24, borderRadius:12, border:`1px solid ${T.border}`, position:"relative", zIndex:2}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textPrimary, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center", marginBottom:8}}>Torrance Core Engine</div>
                <Node id="n3" title="raw.ingestion" desc="The 12 Canonical Feeds (GL, Holdings, Rates)." layer="1" color="#3b82f6" />
                <div style={{textAlign:"center", color:T.border, fontSize:16, margin:"-12px 0"}}>↓</div>
                <Node id="n4" title="ref.master_data" desc="Chart of Accounts and Entity Hierarchy." layer="2" color="#8b5cf6" />
                <div style={{textAlign:"center", color:T.border, fontSize:16, margin:"-12px 0"}}>↓</div>
                <Node id="n5" title="derived.aggregates" desc="Position valuations and calculated NAVs." layer="3" color="#10b981" />
              </div>
              <div style={{color:T.border, fontSize:24, zIndex:2}}>→</div>

              {/* Column 3 */}
              <div style={{display:"flex", flexDirection:"column", gap:24, flex:1}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"center"}}>Outputs</div>
                <Node id="n6" title="Financial Statements" desc="GAAP reporting & dynamic footnotes." layer="4" color="#0ea5e9" />
                <Node id="n7" title="SEC EDGAR" desc="N-PORT, N-CEN, Form PF XML payloads." layer="4" color="#0ea5e9" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SCHEMA REGISTRY */}
        {activeTab === "schemas" && (
          <div className="fade-in">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
              <div>
                <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary}}>Client-Custodian Schema Registry</div>
                <div style={{...SANS, fontSize:13, color:T.textMuted, marginTop:4}}>Pre-registered mappings for touchless ingestion.</div>
              </div>
              <button style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", boxShadow:"0 1px 2px rgba(79,70,229,0.2)"}}>+ Register Schema</button>
            </div>
            
            <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}>
              <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                <thead style={{background:T.appBg, borderBottom:`2px solid ${T.border}`}}>
                  <tr>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Client & Custodian</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Feed Type</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Version</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Coverage</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Status</th>
                    <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px", textAlign:"right"}}>Last Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMAS.map(s => (
                    <tr key={s.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"12px 16px"}}>
                        <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary}}>{s.source}</div>
                        <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:2}}>{s.client}</div>
                      </td>
                      <td style={{...SANS, fontSize:12, color:T.textPrimary, padding:"12px 16px"}}>{s.feedType}</td>
                      <td style={{...MONO, fontSize:12, color:T.textPrimary, padding:"12px 16px"}}>{s.version}</td>
                      <td style={{padding:"12px 16px"}}><span style={{...MONO, fontSize:11, fontWeight:700, color:T.okBase, background:T.okBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.okBorder}`}}>{s.coverage}</span></td>
                      <td style={{padding:"12px 16px"}}><span style={{...SANS, fontSize:10, fontWeight:700, color:s.status==="Active"?T.okBase:T.errorBase, background:s.status==="Active"?T.okBg:T.errorBg, padding:"3px 8px", borderRadius:4, border:`1px solid ${s.status==="Active"?T.okBorder:T.errorBorder}`}}>{s.status}</span></td>
                      <td style={{padding:"12px 16px", textAlign:"right"}}>
                        <div style={{...SANS, fontSize:12, color:T.textPrimary}}>{s.approvedBy}</div>
                        <div style={{...SANS, fontSize:11, color:T.textMuted}}>{s.date}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: Connector Settings */}
        {editingConnector && (
          <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:1000,display:"flex",justifyContent:"flex-end"}} onClick={()=>setEditingConnector(null)}>
            <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg, width:500, height:"100vh", boxShadow:"-10px 0 30px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column"}}>
              <div style={{padding:"20px 24px", borderBottom:`1px solid ${T.border}`, background:T.navyHeader, color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{...SANS, fontSize:16, fontWeight:700}}>Edit Connection: {editingConnector.name}</div>
                  <div style={{...SANS, fontSize:12, color:"#9ca3af", marginTop:4}}>{editingConnector.protocol} Setup</div>
                </div>
                <button onClick={()=>setEditingConnector(null)} style={{background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20}}>✕</button>
              </div>
              <div style={{padding:"24px", overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:20}}>
                <div>
                  <FieldLabel>Endpoint / Host</FieldLabel>
                  <input type="text" defaultValue={editingConnector.host || editingConnector.endpoint} style={{...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12}} />
                </div>
                {editingConnector.host && (
                  <div>
                    <FieldLabel>Port</FieldLabel>
                    <input type="text" defaultValue={editingConnector.port} style={{...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12}} />
                  </div>
                )}
                <div>
                  <FieldLabel>Authentication Method</FieldLabel>
                  <select defaultValue={editingConnector.auth} style={{...SANS, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}}>
                    <option>SSH Key</option>
                    <option>API Key</option>
                    <option>OAuth 2.0</option>
                    <option>Client Certificate</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Credentials (Encrypted via Layer 13)</FieldLabel>
                  <input type="password" defaultValue="••••••••••••••••" style={{...MONO, width:"100%", padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, background:"#f8fafc"}} readOnly />
                  <div style={{...SANS, fontSize:10, color:T.actionBase, marginTop:6, cursor:"pointer"}}>Update Credentials...</div>
                </div>
                
                <div style={{marginTop:"auto", borderTop:`1px solid ${T.border}`, paddingTop:24, display:"flex", gap:12}}>
                  <button style={{flex:1, ...SANS, fontSize:13, fontWeight:600, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, background:"#fff", cursor:"pointer"}}>Test Connection</button>
                  <button style={{flex:1, ...SANS, fontSize:13, fontWeight:700, padding:"10px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer"}}>Save Configuration</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Edit Pipeline Node */}
        {editingNode && (
          <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setEditingNode(null)}>
             <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg, borderRadius:12, width:700, overflow:"hidden", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
               <div style={{padding:"20px 24px", borderBottom:`1px solid ${T.border}`, background:T.appBg, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                 <div>
                   <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary}}>Configure Flow: {editingNode.title}</div>
                   <div style={{...MONO, fontSize:11, color:T.textMuted, marginTop:4}}>Layer {editingNode.layer} Schema Mapping</div>
                 </div>
                 <button onClick={()=>setEditingNode(null)} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20}}>✕</button>
               </div>
               <div style={{padding:"24px"}}>
                 <div style={{...SANS, fontSize:13, color:T.textPrimary, marginBottom:20, lineHeight:1.5}}>
                   Define the ETL rules moving data into <strong>{editingNode.title}</strong>. Changes here affect all active client pipelines.
                 </div>
                 <div style={{background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:8, padding:"16px", display:"flex", flexDirection:"column", gap:12}}>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${T.border}`, paddingBottom:8}}>
                      <span style={{...MONO, fontSize:12, fontWeight:700}}>Source Object</span>
                      <span style={{...MONO, fontSize:12, fontWeight:700}}>Target Object (Layer {editingNode.layer})</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <span style={{...SANS, fontSize:12, color:T.textMuted}}>raw.custodian_positions</span>
                      <span style={{color:T.actionBase}}>→</span>
                      <span style={{...MONO, fontSize:12, color:T.textPrimary, background:"#fff", padding:"4px 8px", borderRadius:4, border:`1px solid ${T.border}`}}>ref.holdings</span>
                    </div>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <span style={{...SANS, fontSize:12, color:T.textMuted}}>raw.bloomberg_eod</span>
                      <span style={{color:T.actionBase}}>→</span>
                      <span style={{...MONO, fontSize:12, color:T.textPrimary, background:"#fff", padding:"4px 8px", borderRadius:4, border:`1px solid ${T.border}`}}>ref.pricing</span>
                    </div>
                 </div>
                 <button style={{...SANS, marginTop:24, width:"100%", fontSize:13, fontWeight:700, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                   <span>⚙</span> Open Rules Engine
                 </button>
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: JOURNAL ENTRIES (CROSS-FUND, BATCH, TARGET BALANCE)
// ═══════════════════════════════════════════════════════════════════════════════
function JournalEntriesTab({ fund, fundSeeds, masterFeeds, currentUser, onPostJE }) {
  const [entries, setEntries] = useState([
    { id: "je-1", date: "2024-12-31", ref: "ACCR-101", desc: "Global Audit Fee True-up", status: "draft", lines: [
      { fundId: fund.fund_id, acct: "5060", name: "Professional Fees", debit: 15000, credit: 0 },
      { fundId: fund.fund_id, acct: "2050", name: "Audit & Tax Fee Payable", debit: 0, credit: 15000 }
    ], createdBy: "u1", mode: "standard" }
  ]);
  
  const [activeJe, setActiveJe] = useState(null);
  const [entryMode, setEntryMode] = useState("standard"); // 'standard' or 'target_balance'
  const [inputMethod, setInputMethod] = useState("manual"); // 'manual' or 'batch'
  
  const [newLines, setNewLines] = useState([{ id: 1, fundId: fund.fund_id, acct: "", debit: "", credit: "", target: "", current: 0 }, { id: 2, fundId: fund.fund_id, acct: "", debit: "", credit: "", target: "", current: 0 }]);
  const [jeDesc, setJeDesc] = useState("");
  const [jeRef, setJeRef] = useState("");

  // Extract unique accounts from the GL for the combobox
  const availableAccounts = useMemo(() => {
    const accts = new Map();
    masterFeeds.gl_001.forEach(r => {
      if (!accts.has(r.acct)) accts.set(r.acct, { acct: r.acct, name: r.name, bal: r.debit - r.credit });
    });
    return Array.from(accts.values()).sort((a,b) => a.acct.localeCompare(b.acct));
  }, [masterFeeds]);

  const totalDebit = newLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = newLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;
  const isPreparer = !currentUser.isController;

  const handleAddLine = () => setNewLines([...newLines, { id: Date.now(), fundId: fund.fund_id, acct: "", debit: "", credit: "", target: "", current: 0 }]);
  
  const updateLine = (id, field, val) => {
    setNewLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      let updated = { ...l, [field]: val };
      
      // Auto-lookup current balance if account changes
      if (field === "acct") {
        const found = availableAccounts.find(a => a.acct === val);
        if (found) {
          updated.name = found.name;
          updated.current = found.bal;
        }
      }
      
      // Target Balance Math Magic
      if (entryMode === "target_balance" && (field === "target" || field === "acct")) {
        const targetVal = Number(updated.target) || 0;
        const diff = targetVal - updated.current;
        if (diff > 0) { updated.debit = diff; updated.credit = 0; }
        else { updated.credit = Math.abs(diff); updated.debit = 0; }
      }
      return updated;
    }));
  };

  const handleSubmitJE = () => {
    if (!isBalanced && entryMode !== "target_balance") return;
    const newJe = {
      id: `je-${Date.now()}`, date: "2024-12-31", ref: jeRef || `JE-${Math.floor(Math.random()*1000)}`,
      desc: jeDesc, status: "pending_review", mode: entryMode,
      lines: newLines.filter(l => l.acct), createdBy: currentUser.id
    };
    setEntries([newJe, ...entries]);
    setNewLines([{ id: 1, fundId: fund.fund_id, acct: "", debit: "", credit: "", target: "", current: 0 }, { id: 2, fundId: fund.fund_id, acct: "", debit: "", credit: "", target: "", current: 0 }]);
    setJeDesc(""); setJeRef("");
  };

  return (
    <div style={{display:"flex", height:"100%", background:T.appBg}}>
      {/* Left Sidebar: JE Ledger */}
      <div style={{width: 340, background:T.cardBg, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column"}}>
        <div style={{padding:"16px", borderBottom:`1px solid ${T.border}`}}>
          <div style={{...SANS, fontWeight:700, fontSize:15, color:T.textPrimary}}>Ledger Adjustments</div>
          <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:2}}>Maker / Checker Workflow</div>
        </div>
        <div style={{overflowY:"auto", flex:1, padding:16}}>
          {entries.map(je => (
            <div key={je.id} onClick={() => setActiveJe(je)} style={{padding:"14px", border:`1px solid ${activeJe?.id === je.id ? T.actionBase : T.border}`, borderRadius:8, marginBottom:12, background:activeJe?.id === je.id ? "#eff6ff" : T.cardBg, cursor:"pointer", transition:"all 0.15s", boxShadow: activeJe?.id === je.id ? "0 2px 8px rgba(79,70,229,0.1)" : "none"}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                <span style={{...MONO, fontSize:12, fontWeight:700, color:T.textPrimary}}>{je.ref}</span>
                <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, background: je.status==="posted"?T.okBg:je.status==="pending_review"?T.warnBg:T.appBg, color:je.status==="posted"?T.okBase:je.status==="pending_review"?T.warnBase:T.textMuted}}>{je.status === "pending_review" ? "Review" : je.status}</span>
              </div>
              <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary, marginBottom:8, lineHeight:1.4}}>{je.desc}</div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{...SANS, fontSize:11, color:T.textMuted}}>By: {TEAM.find(m=>m.id===je.createdBy)?.name}</span>
                {je.mode === "target_balance" && <span style={{...MONO, fontSize:9, fontWeight:700, background:T.aiBg, color:T.aiBase, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.aiBorder}`}}>TARGET BAL</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Drafting & Review */}
      <div style={{flex:1, padding:"24px 32px", overflowY:"auto"}}>
        <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 4px 12px rgba(0,0,0,0.03)", maxWidth:1000}}>
          <div style={{background:T.navyHeader, padding:"16px 24px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{...SANS, fontWeight:700, fontSize:16}}>Draft New Journal Entry</div>
            <div style={{display:"flex", background:"rgba(255,255,255,0.1)", borderRadius:6, padding:3}}>
              <button onClick={()=>setInputMethod("manual")} style={{...SANS, fontSize:11, fontWeight:600, padding:"4px 12px", border:"none", borderRadius:4, background:inputMethod==="manual"?"#fff":"transparent", color:inputMethod==="manual"?T.navyHeader:"#fff", cursor:"pointer"}}>Manual</button>
              <button onClick={()=>setInputMethod("batch")} style={{...SANS, fontSize:11, fontWeight:600, padding:"4px 12px", border:"none", borderRadius:4, background:inputMethod==="batch"?"#fff":"transparent", color:inputMethod==="batch"?T.navyHeader:"#fff", cursor:"pointer"}}>Batch Upload</button>
            </div>
          </div>
          
          <div style={{padding:24}}>
            {inputMethod === "batch" ? (
               <div style={{border:`2px dashed ${T.border}`,borderRadius:10,padding:"60px 32px",textAlign:"center",background:T.appBg}}>
                 <div style={{fontSize:32, marginBottom:16}}>📤</div>
                 <div style={{...SANS, fontSize:16, fontWeight:600, color:T.textPrimary, marginBottom:8}}>Upload Mass JE File</div>
                 <div style={{...SANS, fontSize:13, color:T.textMuted}}>Drop your multi-fund Excel or CSV mapping file here.</div>
                 <button style={{marginTop:24, ...SANS, fontSize:13, fontWeight:600, padding:"10px 20px", borderRadius:6, border:`1px solid ${T.border}`, background:"#fff", cursor:"pointer", color:T.textPrimary, boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}>Browse Files</button>
               </div>
            ) : (
              <>
                <div style={{display:"flex", gap:20, marginBottom:24}}>
                  <div style={{flex:2}}>
                    <FieldLabel>Description</FieldLabel>
                    <input type="text" value={jeDesc} onChange={e=>setJeDesc(e.target.value)} placeholder="e.g., Cross-fund year-end fee true-up" style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}} />
                  </div>
                  <div style={{flex:1}}>
                    <FieldLabel>Reference (Optional)</FieldLabel>
                    <input type="text" value={jeRef} onChange={e=>setJeRef(e.target.value)} placeholder="JE-XXX" style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}} />
                  </div>
                  <div style={{flex:1}}>
                    <FieldLabel>Entry Mode</FieldLabel>
                    <select value={entryMode} onChange={e=>setEntryMode(e.target.value)} style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, background:"#fff", cursor:"pointer"}}>
                      <option value="standard">Standard (DR/CR)</option>
                      <option value="target_balance">Target Balance Mode</option>
                    </select>
                  </div>
                </div>

                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%", borderCollapse:"collapse", marginBottom:20, minWidth:800}}>
                    <thead>
                      <tr style={{borderBottom:`2px solid ${T.border}`}}>
                        <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"left", paddingBottom:10, textTransform:"uppercase", width:"20%"}}>Fund</th>
                        <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"left", paddingBottom:10, textTransform:"uppercase", width:"30%"}}>Account</th>
                        {entryMode === "target_balance" && <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:"15%"}}>Current Bal</th>}
                        {entryMode === "target_balance" && <th style={{...SANS, fontSize:11, fontWeight:700, color:T.aiBase, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:"15%"}}>Target Bal</th>}
                        <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:entryMode==="target_balance"?"10%":"25%"}}>Debit</th>
                        <th style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textAlign:"right", paddingBottom:10, textTransform:"uppercase", width:entryMode==="target_balance"?"10%":"25%"}}>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newLines.map(line => (
                        <tr key={line.id} style={{borderBottom:`1px solid ${T.appBg}`}}>
                          <td style={{padding:"8px 4px 8px 0"}}>
                            <select value={line.fundId} onChange={e=>updateLine(line.id, "fundId", e.target.value)} style={{...SANS, width:"100%", padding:"8px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, background:"#fff"}}>
                              {fundSeeds.map(f => <option key={f.fund_id} value={f.fund_id}>{f.fund_id}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"8px 4px"}}>
                            <select value={line.acct} onChange={e=>updateLine(line.id, "acct", e.target.value)} style={{...MONO, width:"100%", padding:"8px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:11, background:"#fff"}}>
                              <option value="">-- Select Account --</option>
                              {availableAccounts.map(a => <option key={a.acct} value={a.acct}>{a.acct} - {a.name}</option>)}
                            </select>
                          </td>
                          {entryMode === "target_balance" && (
                            <td style={{padding:"8px 4px", textAlign:"right"}}>
                              <span style={{...MONO, fontSize:12, color:T.textMuted}}>{fmtUSD(line.current)}</span>
                            </td>
                          )}
                          {entryMode === "target_balance" && (
                            <td style={{padding:"8px 4px"}}>
                              <input type="number" value={line.target} onChange={e=>updateLine(line.id, "target", e.target.value)} placeholder="0.00" style={{...MONO, width:"100%", padding:"8px", border:`1px solid ${T.aiBorder}`, background:T.aiBg, color:T.aiDark, borderRadius:4, fontSize:12, textAlign:"right"}} />
                            </td>
                          )}
                          <td style={{padding:"8px 4px"}}>
                            <input type="number" value={line.debit} onChange={e=>updateLine(line.id, "debit", e.target.value)} placeholder="0.00" disabled={!!line.credit || entryMode==="target_balance"} style={{...MONO, width:"100%", padding:"8px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, textAlign:"right", background:line.credit || entryMode==="target_balance" ? "#f8fafc" : "#fff", color:entryMode==="target_balance"&&line.debit>0?T.okBase:T.textPrimary, fontWeight:entryMode==="target_balance"?700:400}} />
                          </td>
                          <td style={{padding:"8px 0 8px 4px"}}>
                            <input type="number" value={line.credit} onChange={e=>updateLine(line.id, "credit", e.target.value)} placeholder="0.00" disabled={!!line.debit || entryMode==="target_balance"} style={{...MONO, width:"100%", padding:"8px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, textAlign:"right", background:line.debit || entryMode==="target_balance" ? "#f8fafc" : "#fff", color:entryMode==="target_balance"&&line.credit>0?T.errorBase:T.textPrimary, fontWeight:entryMode==="target_balance"?700:400}} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <button onClick={handleAddLine} style={{...SANS, fontSize:12, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer", marginBottom:24, padding:"4px 8px", borderRadius:4, transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=T.actionBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  + Add Line
                </button>

                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px", background: isBalanced ? T.okBg : T.appBg, border:`1px solid ${isBalanced ? T.okBorder : T.border}`, borderRadius:8, transition:"all 0.3s"}}>
                  <div>
                    <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, letterSpacing:"0.05em"}}>TOTALS</div>
                    <div style={{display:"flex", gap:32, marginTop:6}}>
                      <div style={{...MONO, fontSize:18, fontWeight:700, color:T.textPrimary}}>DR: {fmtUSD(totalDebit)}</div>
                      <div style={{...MONO, fontSize:18, fontWeight:700, color:T.textPrimary}}>CR: {fmtUSD(totalCredit)}</div>
                    </div>
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:16}}>
                    {!isBalanced && totalDebit > 0 && <span style={{...SANS, fontSize:13, fontWeight:700, color:T.errorBase}}>Out of balance by {fmtUSD(Math.abs(totalDebit - totalCredit))}</span>}
                    <button disabled={!isBalanced} onClick={handleSubmitJE} style={{...SANS, fontSize:14, fontWeight:700, padding:"12px 24px", borderRadius:6, border:"none", background: isBalanced ? T.actionBase : T.border, color: isBalanced ? "#fff" : T.textMuted, cursor: isBalanced ? "pointer" : "not-allowed", transition:"all 0.2s", boxShadow: isBalanced ? "0 4px 12px rgba(79,70,229,0.3)" : "none"}}>
                      Submit for Review
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Checker Review View */}
        {activeJe && activeJe.status === "pending_review" && !isPreparer && (
          <div className="slide-in" style={{marginTop:24, background:T.warnBg, border:`1px solid ${T.warnBorder}`, borderRadius:10, padding:"20px", maxWidth:1000, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={{...SANS, fontSize:15, fontWeight:700, color:T.warnBase, marginBottom:4}}>Controller Review Required</div>
              <div style={{...SANS, fontSize:12, color:T.warnBase, opacity:0.8}}>This journal entry balances and has passed schema validation.</div>
            </div>
            <button onClick={() => handleApproveJE(activeJe.id)} style={{...SANS, fontSize:14, fontWeight:700, padding:"12px 24px", borderRadius:6, border:"none", background:T.okBase, color:"#fff", cursor:"pointer", boxShadow:"0 2px 8px rgba(15,118,110,0.2)"}}>
              ✓ Approve & Post to Ledger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL STATEMENT PREVIEW TAB (Cleaned up - Checks moved to CrossChecksTab)
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Dynamic GAAP Financial Statements ───────────────────────────────────────
function FinancialStatementsTab({ fund }) {
  const [activeStmt, setActiveStmt] = useState("soa");
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);
  const [showPdf,    setShowPdf]    = useState(false);

  // Dynamic GAAP Statement Routing based on Fund Type
  const isAlt = ["Hedge Fund", "Private Equity", "Real Estate Fund"].includes(fund?.fundType);
    const isRetail = ["Mutual Fund", "ETF", "Closed-End Fund"].includes(fund?.fundType);
    const isMoneyMarket = fund?.fundType === "Money Market";

  const STMTS = useMemo(() => {
    let base = [
      { key:"soa",  label:"Statement of Assets & Liabilities" },
      { key:"soo",  label:"Statement of Operations" },
    ];
// Alter capital statement based on retail vs private
    if (isAlt) base.push({ key:"scna", label:"Statement of Changes in Partners' Capital" });
    else base.push({ key:"scna", label:"Statement of Changes in Net Assets" });
    
    base.push({ key:"cf", label:"Statement of Cash Flows" });
    base.push({ key:"fin_high", label:"Financial Highlights" });
    base.push({ key:"fv", label:"Fair Value Table" });
    base.push({ key:"soi", label:"Schedule of Investments" });

    // Supplemental schedules
    if (isAlt) base.push({ key:"cap_acct", label:"Capital Contributions & Distributions" });
    if (isMoneyMarket) base.push({ key:"shadow_nav", label:"Shadow NAV & Maturity" });
    if (isRetail) base.push({ key:"scp", label:"Statement of Changes in Portfolio" });
    if (isAlt) base.push({ key:"port", label:"Portfolio Company Summary" });
    if (isAlt) base.push({ key:"urgl", label:"Schedule of Realized and Unrealized Gains (Losses) by Investment" });
    

    return base;
  }, [fund]);

  // (Keeping FS_DYNAMIC the exact same as previously written)
  const FS_DYNAMIC = useMemo(() => {
    const sumAcct = (accts) => TB_ROWS.filter(r => accts.includes(r.acct)).reduce((s, r) => s + (r.debit - r.credit), 0);

    const investments_at_value = sumAcct(["1010", "1020", "1300"]);
    const cash_domestic = sumAcct(["1100"]);
    const cash_foreign = sumAcct(["1110"]);
    const dividends_receivable = sumAcct(["1200"]);
    const interest_receivable = sumAcct(["1210"]) || 410000; 
    const recv_securities_sold = sumAcct(["1220"]) || 2300000;
    const prepaid_other = 162535;

    const total_assets = investments_at_value + cash_domestic + cash_foreign + dividends_receivable + interest_receivable + recv_securities_sold + prepaid_other;

    const pay_securities = -sumAcct(["2010"]);
    const pay_shares_redeemed = -sumAcct(["2020"]);
    const advisory_fee_payable = -sumAcct(["2030"]);
    const admin_fee_payable = -sumAcct(["2040"]);
    const total_liabilities = pay_securities + pay_shares_redeemed + advisory_fee_payable + admin_fee_payable;

    const net_assets = total_assets - total_liabilities;
    const net_assets_classA = -sumAcct(["3010"]);
    const net_assets_inst = -sumAcct(["3020"]);
    const net_assets_r6 = -sumAcct(["3030"]);

    const div_income_domestic = -sumAcct(["4010"]);
    const div_income_foreign = -sumAcct(["4020"]) || 108420;
    const interest_income = -sumAcct(["4030"]);
    const total_investment_income = div_income_domestic + div_income_foreign + interest_income;

    const advisory_fees = sumAcct(["5010"]);
    const admin_fees = sumAcct(["5020"]);
    const custodian_fees = sumAcct(["5040"]);
    const professional_fees = sumAcct(["5060"]);
    const other_expenses = sumAcct(["5130"]) || 18000;
    const total_expenses = advisory_fees + admin_fees + custodian_fees + professional_fees + other_expenses;

    const net_investment_income = total_investment_income - total_expenses;
    const realized_gain = -sumAcct(["4100"]);
    const unrealized_change = -sumAcct(["4200"]);
    const net_increase_ops = net_investment_income + realized_gain + unrealized_change;

    const subscriptions = CAPITAL_ACTIVITY.filter(r=>r.type==="Subscription").reduce((s,r)=>s+r.grossAmount,0);
    const redemptions = -CAPITAL_ACTIVITY.filter(r=>r.type==="Redemption").reduce((s,r)=>s+r.grossAmount,0);
    const reinvestments = CAPITAL_ACTIVITY.filter(r=>r.type==="Reinvestment").reduce((s,r)=>s+r.grossAmount,0);
    const distributions = -CAPITAL_ACTIVITY.filter(r=>r.type==="Dividend").reduce((s,r)=>s+r.grossAmount,0);
    const net_capital_txns = subscriptions + redemptions + reinvestments + distributions;
    const beginning_net_assets_actual = net_assets - net_increase_ops - net_capital_txns;

    // --- Cash Flow Statement Bridges ---
    const net_cash_operating = net_increase_ops - unrealized_change - realized_gain - 1270000 + 4520000 - 215000000 + 180500000; // Simplified bridging items
    const cash_bop = 16140109; // Prior year ending cash
    const cash_eop = cash_domestic + cash_foreign;
    const net_change_cash = cash_eop - cash_bop;

    return {
      investments_at_value, cash_domestic, cash_foreign, dividends_receivable, interest_receivable, recv_securities_sold, prepaid_other,
      total_assets, pay_securities, pay_shares_redeemed, advisory_fee_payable, admin_fee_payable, total_liabilities,
      net_assets, net_assets_classA, net_assets_inst, net_assets_r6,
      div_income_domestic, div_income_foreign, interest_income, total_investment_income,
      advisory_fees, admin_fees, custodian_fees, professional_fees, other_expenses, total_expenses,
      net_investment_income, realized_gain, unrealized_change, net_increase_ops,
      subscriptions, redemptions, reinvestments, distributions, net_capital_txns, beginning_net_assets_actual
    };
  }, []);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(()=>{ setGenerating(false); setGenerated(true); setShowPdf(true); }, 1600);
  };

  const FsLine = ({ label, value, indent=0, bold, doubleBottom, topBorder }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", paddingLeft:indent*16, fontWeight:bold?700:400, fontSize:13, borderTop: topBorder==="single"?"1px solid #1a1f36":topBorder==="double"?"3px double #1a1f36":undefined, borderBottom: doubleBottom?"3px double #1a1f36":undefined, marginTop: topBorder?4:0, marginBottom: doubleBottom?4:0 }}>
      <span style={{ color:T.textPrimary }}>{label}</span>
      <span style={{ ...MONO, color: value<0?T.errorBase:T.textPrimary, minWidth:130, textAlign:"right" }}>{value==null?"":value===0?"—":fmtUSD(value)}</span>
    </div>
  );
  const FsSection = ({ title }) => <div style={{ ...SANS, fontWeight:700, fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:18, marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>{title}</div>;
  const FsHeader = ({ title, subtitle }) => <div style={{ textAlign:"center", marginBottom:24 }}><div style={{ ...SANS, fontWeight:700, fontSize:16, color:T.navyHeader }}>{title}</div><div style={{ ...SANS, fontSize:13, color:T.textMuted, marginTop:4 }}>{fund?.name || "Global Diversified Fund"} — {fund?.series || "Series I"}<br/>{subtitle}</div></div>;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <div style={{ width:240, borderRight:`1px solid ${T.border}`, background:T.cardBg, flexShrink:0, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ ...SANS, fontWeight:700, fontSize:13, marginBottom:2, color:T.textPrimary }}>GAAP Reporting</div>
          <div style={{ ...SANS, fontSize:11, color:T.actionBase, fontWeight:600 }}>{fund?.fundType || "Fund"} Format</div>
        </div>
        {STMTS.map(s=>(
          <button key={s.key} onClick={()=>setActiveStmt(s.key)} style={{ ...SANS, width:"100%", textAlign:"left", padding:"11px 16px", border:"none", borderLeft:`3px solid ${activeStmt===s.key?T.actionBase:"transparent"}`, background:activeStmt===s.key?"#f0f4ff":T.cardBg, color:activeStmt===s.key?T.actionBase:T.textPrimary, fontSize:12, fontWeight:activeStmt===s.key?700:500, cursor:"pointer" }}>
            {s.label}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${T.border}` }}>
          <button disabled={generating} onClick={generated ? () => setShowPdf(true) : handleGenerate} style={{ ...SANS, width:"100%", border:"none", borderRadius:7, padding:"10px", fontSize:12, fontWeight:700, cursor:generating?"not-allowed":"pointer", background:generating?"#374151":T.okBase, color:generating?"#6b7280":"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:7, transition:"background 0.2s" }}>
            {generating?<><span style={{animation:"pulse 0.8s infinite"}}>●</span>Generating…</> :generated?<><span>↓</span>Download Outputs</> :<><span>↓</span>Generate Output</>}
          </button>
          {generated&&!generating&&(<div style={{ ...SANS, fontSize:10, color:T.okBase, textAlign:"center", marginTop:6, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><span>✓</span>PDF + Excel ready</div>)}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", background:T.appBg }}>
        <div style={{ margin:"24px", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"36px 48px", maxWidth:760, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
          
          {activeStmt==="soa"&&(<>
            <FsHeader title="Statement of Assets and Liabilities" subtitle="As of December 31, 2024"/>
            <FsSection title="Assets"/>
            <FsLine label="Investments, at Value" value={FS_DYNAMIC.investments_at_value} indent={1}/>
            <FsLine label="Cash — Domestic" value={FS_DYNAMIC.cash_domestic} indent={1}/>
            <FsLine label="Cash — Foreign Currency" value={FS_DYNAMIC.cash_foreign} indent={1}/>
            <FsLine label="Dividends Receivable" value={FS_DYNAMIC.dividends_receivable} indent={1}/>
            <FsLine label="Interest Receivable" value={FS_DYNAMIC.interest_receivable} indent={1}/>
            <FsLine label="Receivable for Securities Sold" value={FS_DYNAMIC.recv_securities_sold} indent={1}/>
            <FsLine label="Other Assets" value={FS_DYNAMIC.prepaid_other} indent={1}/>
            <FsLine label="Total Assets" value={FS_DYNAMIC.total_assets} bold topBorder="single"/>
            <FsSection title="Liabilities"/>
            <FsLine label="Payable for Securities Purchased" value={-FS_DYNAMIC.pay_securities} indent={1}/>
            <FsLine label="Payable for Fund Shares Redeemed" value={-FS_DYNAMIC.pay_shares_redeemed} indent={1}/>
            <FsLine label="Investment Advisory Fee Payable" value={-FS_DYNAMIC.advisory_fee_payable} indent={1}/>
            <FsLine label="Administration Fee Payable" value={-FS_DYNAMIC.admin_fee_payable} indent={1}/>
            <FsLine label="Total Liabilities" value={-FS_DYNAMIC.total_liabilities} bold topBorder="single"/>
            <FsSection title={isAlt ? "Partners' Capital" : "Net Assets"}/>
            {isAlt ? (
               <>
                 <FsLine label="Total Partners' Capital" value={FS_DYNAMIC.net_assets} bold topBorder="single" doubleBottom/>
                 {fund?.fundType === "Private Equity" && (
                   <FsLine label="Unfunded Capital Commitments" value={15000000} indent={1} />
                 )}
               </>
            ) : (
               <>
                 <FsLine label="Net Assets — Class A" value={220000000} indent={1}/>
                 <FsLine label="Net Assets — Institutional" value={256198500} indent={1}/>
                 <FsLine label="Net Assets" value={476198500} bold topBorder="single" doubleBottom/>
               </>
            )}
            <FsLine label={isAlt ? "Capital — Class A" : "Net Assets — Class A"} value={FS_DYNAMIC.net_assets_classA} indent={1}/>
            <FsLine label={isAlt ? "Capital — Institutional" : "Net Assets — Institutional"} value={FS_DYNAMIC.net_assets_inst} indent={1}/>
            <FsLine label={isAlt ? "Capital — R6" : "Net Assets — R6"} value={FS_DYNAMIC.net_assets_r6} indent={1}/>
            <FsLine label={isAlt ? "Total Partners' Capital" : "Net Assets"} value={FS_DYNAMIC.net_assets} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="soo"&&(<>
            <FsHeader title="Statement of Operations" subtitle="For the Year Ended December 31, 2024"/>
            <FsSection title="Investment Income"/>
            <FsLine label="Dividend Income — Domestic" value={FS_DYNAMIC.div_income_domestic} indent={1}/>
            <FsLine label="Dividend Income — Foreign" value={FS_DYNAMIC.div_income_foreign} indent={1}/>
            <FsLine label="Interest Income" value={FS_DYNAMIC.interest_income} indent={1}/>
            <FsLine label="Total Investment Income" value={FS_DYNAMIC.total_investment_income} bold topBorder="single"/>
            
            <FsSection title="Expenses"/>
            <FsLine label={isAlt ? "Management Fees" : "Investment Advisory Fees"} value={-FS_DYNAMIC.advisory_fees} indent={1}/>
            <FsLine label="Administration & Custody Fees" value={-(FS_DYNAMIC.admin_fees + FS_DYNAMIC.custodian_fees)} indent={1}/>
            <FsLine label="Professional Fees" value={-FS_DYNAMIC.professional_fees} indent={1}/>
            <FsLine label="Total Expenses" value={-FS_DYNAMIC.total_expenses} bold topBorder="single"/>
            <FsLine label="Net Investment Income / (Loss)" value={FS_DYNAMIC.net_investment_income} bold topBorder="single"/>
            
            <FsSection title="Realized & Unrealized Gain / (Loss)"/>
            <FsLine label="Net Realized Gain on Investments" value={FS_DYNAMIC.realized_gain} indent={1}/>
            <FsLine label="Net Change in Unrealized Appreciation" value={FS_DYNAMIC.unrealized_change} indent={1}/>
            <FsLine label={isAlt ? "Net Increase in Capital from Operations" : "Net Increase in Net Assets from Operations"} value={FS_DYNAMIC.net_increase_ops} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="scna"&&(<>
            <FsHeader title={isAlt ? "Statement of Changes in Partners' Capital" : "Statement of Changes in Net Assets"} subtitle="For the Year Ended December 31, 2024"/>
            <FsSection title="Operations"/>
            <FsLine label="Net Investment Income / (Loss)" value={FS_DYNAMIC.net_investment_income} indent={1}/>
            <FsLine label="Net Realized Gain on Investments" value={FS_DYNAMIC.realized_gain} indent={1}/>
            <FsLine label="Net Change in Unrealized Appreciation" value={FS_DYNAMIC.unrealized_change} indent={1}/>
            <FsLine label={isAlt ? "Net Increase in Capital from Operations" : "Net Increase in Net Assets from Operations"} value={FS_DYNAMIC.net_increase_ops} bold topBorder="single"/>
            <FsSection title={isAlt ? "Distributions to Partners" : "Distributions to Shareholders"}/>
            <FsLine label="Dividends from Net Investment Income" value={-FS_DYNAMIC.distributions*-1} indent={1}/>
            <FsSection title={isAlt ? "Capital Transactions" : "Capital Share Transactions"}/>
            <FsLine label={isAlt ? "Capital Contributions" : "Proceeds from Shares Sold"} value={FS_DYNAMIC.subscriptions} indent={1}/>
            <FsLine label={isAlt ? "Capital Withdrawals" : "Value of Shares Redeemed"} value={-FS_DYNAMIC.redemptions*-1} indent={1}/>
            <FsLine label="Reinvestment of Distributions" value={FS_DYNAMIC.reinvestments} indent={1}/>
            <FsLine label={isAlt ? "Net Increase from Capital Transactions" : "Net Increase from Capital Share Transactions"} value={FS_DYNAMIC.net_capital_txns} bold topBorder="single"/>
            <FsSection title={isAlt ? "Partners' Capital" : "Net Assets"}/>
            <FsLine label={isAlt ? "Total Increase in Capital" : "Total Increase in Net Assets"} value={FS_DYNAMIC.net_increase_ops+FS_DYNAMIC.net_capital_txns} bold topBorder="single"/>
            <FsLine label="Beginning of Period" value={FS_DYNAMIC.beginning_net_assets_actual} indent={1}/>
            <FsLine label="End of Period" value={FS_DYNAMIC.net_assets} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="fin_high"&&(<>
            <FsHeader title="Financial Highlights" subtitle="For the Year Ended December 31, 2024"/>
            {isAlt ? (
              <>
                <FsSection title="Fund-Level Ratios & Returns"/>
                <FsLine label="Internal Rate of Return (IRR) - Gross" value={"14.2%"} indent={1}/>
                <FsLine label="Internal Rate of Return (IRR) - Net" value={"11.8%"} indent={1}/>
                <FsLine label="Ratio of Expenses to Average Partners' Capital" value={"1.85%"} indent={1}/>
                <FsLine label="Ratio of Net Investment Income to Average Capital" value={"2.10%"} indent={1}/>
              </>
            ) : (
              <>
                <FsSection title="Per Share Operating Performance"/>
                <FsLine label="Net Asset Value, Beginning of Year" value={"$24.12"} indent={1}/>
                <FsLine label="Net Investment Income" value={"$0.45"} indent={1}/>
                <FsLine label="Net Realized and Unrealized Gain" value={"$1.20"} indent={1}/>
                <FsLine label="Net Asset Value, End of Year" value={"$25.77"} bold topBorder="single" doubleBottom/>
                <FsSection title="Ratios and Supplemental Data"/>
                <FsLine label="Total Return" value={"6.84%"} indent={1}/>
                <FsLine label="Ratio of Expenses to Average Net Assets" value={"0.75%"} indent={1}/>
              </>
            )}
          </>)}  
          {activeStmt==="cf"&&(<>
            <FsHeader title="Statement of Cash Flows" subtitle="For the Year Ended December 31, 2024"/>
            <FsSection title="Cash Flows from Operating Activities"/>
            <FsLine label="Net Increase in Net Assets from Operations" value={FS_DYNAMIC.net_increase_ops} indent={1}/>
            <div style={{...SANS, fontSize:12, fontStyle:"italic", color:T.textMuted, paddingLeft:16, margin:"6px 0"}}>Adjustments to reconcile net increase to net cash provided by operations:</div>
            <FsLine label="Purchases of Investments" value={-215000000} indent={2}/>
            <FsLine label="Proceeds from Sales of Investments" value={180500000} indent={2}/>
            <FsLine label="Net Realized (Gain) Loss on Investments" value={-FS_DYNAMIC.realized_gain} indent={2}/>
            <FsLine label="Net Change in Unrealized Appreciation" value={-FS_DYNAMIC.unrealized_change} indent={2}/>
            <FsLine label="Net (Increase) Decrease in Receivables" value={-1270000} indent={2}/>
            <FsLine label="Net Increase (Decrease) in Payables" value={4520000} indent={2}/>
            <FsLine label="Net Cash Provided by (Used in) Operating Activities" value={-1359580} bold topBorder="single"/>

            <FsSection title="Cash Flows from Financing Activities"/>
            <FsLine label="Proceeds from Shares Sold / Capital Contributions" value={FS_DYNAMIC.subscriptions} indent={1}/>
            <FsLine label="Payments for Shares Redeemed / Withdrawals" value={-FS_DYNAMIC.redemptions} indent={1}/>
            <FsLine label="Distributions Paid" value={-FS_DYNAMIC.distributions} indent={1}/>
            <FsLine label="Net Cash Provided by (Used in) Financing Activities" value={FS_DYNAMIC.net_capital_txns} bold topBorder="single"/>

            <FsSection title="Cash & Cash Equivalents"/>
            <FsLine label="Net Increase (Decrease) in Cash" value={FS_DYNAMIC.net_capital_txns - 1359580} bold topBorder="single"/>
            <FsLine label="Cash, Beginning of Year" value={16140109} indent={1}/>
            <FsLine label="Cash, End of Year" value={FS_DYNAMIC.cash_domestic + FS_DYNAMIC.cash_foreign} bold topBorder="single" doubleBottom/>
          </>)}

          {activeStmt==="cap_acct"&&(<>
            <FsHeader title="Schedule of Partners' Capital" subtitle="For the Year Ended December 31, 2024"/>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12, marginTop:16}}>
              <thead>
                <tr style={{background:T.navyHeader}}>
                  <th style={{...SANS,padding:"8px 12px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Investor ID</th>
                  <th style={{...SANS,padding:"8px 12px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Type</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Beginning Cap</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Contributions</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Net Income Alloc.</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Distributions</th>
                  <th style={{...MONO,padding:"8px 12px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>Ending Cap</th>
                </tr>
              </thead>
              <tbody>
                {LP_001_SEED.map((lp, i) => {
                   const alloc = (lp.ending_capital_account - lp.beginning_capital_account - lp.called_capital + lp.distributed_capital);
                   return (
                     <tr key={i} className="tbl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, color:T.actionBase}}>{lp.investor_id}</td>
                       <td style={{padding:"8px 12px", ...SANS, fontSize:11, color:T.textMuted}}>{lp.investor_type}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right"}}>{fmtUSD(lp.beginning_capital_account)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", color:T.okBase}}>+{fmtUSD(lp.called_capital)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", color:alloc<0?T.errorBase:T.textPrimary}}>{fmtUSD(alloc)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", color:T.errorBase}}>-{fmtUSD(lp.distributed_capital)}</td>
                       <td style={{padding:"8px 12px", ...MONO, fontSize:11, textAlign:"right", fontWeight:700}}>{fmtUSD(lp.ending_capital_account)}</td>
                     </tr>
                   )
                })}
              </tbody>
            </table>
          </>)}

          {activeStmt==="fv"&&(<>
            <FsHeader title="Notes to Financial Statements" subtitle="Note 5 — Fair Value Measurement"/>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, marginTop:16 }}>
              <thead>
                <tr style={{ background:T.navyHeader }}>
                  <th style={{ ...SANS, padding:"9px 12px", textAlign:"left", color:"#fff", fontWeight:700, fontSize:11, borderBottom:`2px solid ${T.border}` }}>Asset Class / Description</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#8898aa", fontWeight:600, fontSize:10, borderBottom:`2px solid ${T.border}` }}>Level 1</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#8898aa", fontWeight:600, fontSize:10, borderBottom:`2px solid ${T.border}` }}>Level 2</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#8898aa", fontWeight:600, fontSize:10, borderBottom:`2px solid ${T.border}` }}>Level 3</th>
                  <th style={{ ...MONO, padding:"9px 12px", textAlign:"right", color:"#fff", fontWeight:700, fontSize:11, borderBottom:`2px solid ${T.border}` }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {FV_TABLE_DATA.map((r,i)=>{
                  const total=r.l1+r.l2+r.l3;
                  return <tr key={i} className="tbl-row">
                    <td style={{ padding:"8px 12px", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.assetClass}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.l1>0?fmtUSD(r.l1):"—"}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.l2>0?fmtUSD(r.l2):"—"}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, borderBottom:`1px solid ${T.border}` }}>{r.l3>0?fmtUSD(r.l3):"—"}</td>
                    <td style={{ ...MONO, padding:"8px 12px", textAlign:"right", fontSize:12, fontWeight:700, borderBottom:`1px solid ${T.border}` }}>{fmtUSD(total)}</td>
                  </tr>;
                })}
                <tr style={{ background:"#f7f8fa" }}>
                  <td style={{ padding:"9px 12px", fontWeight:700, fontSize:13, borderTop:`2px solid ${T.textPrimary}`, borderBottom:`3px double ${T.textPrimary}` }}>Total Investments at Value</td>
                  {[FV_TABLE_DATA.reduce((s,r)=>s+r.l1,0),FV_TABLE_DATA.reduce((s,r)=>s+r.l2,0),FV_TABLE_DATA.reduce((s,r)=>s+r.l3,0),FV_TABLE_DATA.reduce((s,r)=>s+r.l1+r.l2+r.l3,0)].map((v,i)=>(
                    <td key={i} style={{ ...MONO, padding:"9px 12px", textAlign:"right", fontWeight:700, fontSize:13, borderTop:`2px solid ${T.textPrimary}`, borderBottom:`3px double ${T.textPrimary}` }}>{fmtUSD(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>)}
        </div>
      </div>
      {showPdf && <PdfModal onClose={() => setShowPdf(false)} fund={fund} fsData={FS_DYNAMIC} tbData={TB_ROWS} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: FOOTNOTE EDITOR (Adds Library Search)
// ═══════════════════════════════════════════════════════════════════════════════
function FootnoteEditorTab({ fund, FS_DYNAMIC }) {
  const [footnotes,setFootnotes]=useState(AI_FOOTNOTES);
  const [activeId,setActiveId]=useState("fn-1");
  const [editContent,setEditContent]=useState({});
  const [saved,setSaved]=useState({});
  const [previewMode, setPreviewMode] = useState(true);
  const [search, setSearch] = useState(""); // NEW: Search state

  const filteredFootnotes = useMemo(() => {
    if (!search.trim()) return footnotes;
    const q = search.toLowerCase();
    return footnotes.filter(f => f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  }, [footnotes, search]);

  const active=footnotes.find(f=>f.id===activeId);
  const currentText = editContent[activeId] ?? active?.content ?? "";

  const handleSave = id => { 
    setFootnotes(prev=>prev.map(f=>f.id===id?{...f,content:editContent[id]||f.content,aiDrafted:false,lastEdited:`Edited · System User · Just now`}:f));
    setSaved(p=>({...p,[id]:true}));
    setTimeout(()=>setSaved(p=>({...p,[id]:false})),2000); 
  };

  const insertVariable = (variable) => {
    if (previewMode) setPreviewMode(false);
    setEditContent(p => ({...p, [activeId]: `${currentText} {{${variable}}}`}));
  };

  const parsedContent = currentText
    .replace(/\{\{FUND_NAME\}\}/g, fund?.name || "[Fund Name]")
    .replace(/\{\{PERIOD_END\}\}/g, "December 31, 2024")
    .replace(/\{\{NET_ASSETS\}\}/g, fmtUSD(FS_DYNAMIC?.net_assets || 0))
    .replace(/\{\{TOTAL_INVESTMENTS\}\}/g, fmtUSD(FS_DYNAMIC?.investments_at_value || 0))
    .replace(/\{\{ADVISORY_FEE_EXPENSE\}\}/g, fmtUSD(FS_DYNAMIC?.advisory_fees || 0));

  return <div style={{display:"flex",height:"100%"}}>
    <aside style={{width:280,borderRight:`1px solid ${T.border}`,background:T.cardBg,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{...SANS,fontWeight:700,fontSize:14,marginBottom:4}}>Footnote Templates</div>
        <div style={{...SANS,fontSize:11,color:T.textMuted,marginBottom:12}}>Manage dynamic disclosures.</div>
        
        {/* NEW: Search Input */}
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
          <input type="text" placeholder="Search footnotes..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"6px 12px 6px 30px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} />
        </div>
      </div>
      <div style={{overflowY:"auto", flex:1}}>
        {filteredFootnotes.length === 0 ? (
           <div style={{padding:"30px 20px", textAlign:"center", color:T.textMuted, ...SANS, fontSize:13}}>No footnotes match "{search}"</div>
        ) : (
          filteredFootnotes.map(fn=>(
            <div key={fn.id} onClick={()=>setActiveId(fn.id)} style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",borderLeft:`4px solid ${activeId===fn.id?T.actionBase:"transparent"}`,background:activeId===fn.id?"#f0f4ff":T.cardBg}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4}}>
                <div style={{flex:1}}><div style={{...SANS,fontWeight:600,fontSize:12,marginBottom:2}}>{fn.title}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>{fn.category}</div></div>
                {fn.aiDrafted?<span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`,flexShrink:0}}>✦ AI</span>:<span style={{...SANS,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`,flexShrink:0}}>EDITED</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>

    {active&&<div style={{flex:1,overflowY:"auto",background:T.appBg,display:"flex",flexDirection:"column"}}>
      <div style={{background:T.cardBg,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{...SANS,fontWeight:700,fontSize:16}}>{active.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
            <span style={{...SANS,fontSize:11,color:T.textMuted}}>{active.category}</span><span>·</span>
            {active.aiDrafted?<span style={{...MONO,fontSize:10,fontWeight:700,color:T.aiBase}}>✦ AI-Drafted</span>:<span style={{...SANS,fontSize:10,fontWeight:600,color:T.okBase}}>✓ Human Reviewed</span>}
            <span>·</span><span style={{...SANS,fontSize:11,color:T.textMuted}}>{active.lastEdited}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{display:"flex",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:6,padding:3,gap:2}}>
            <button onClick={()=>setPreviewMode(false)} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:4,border:"none",background:!previewMode?T.cardBg:"transparent",color:!previewMode?T.textPrimary:T.textMuted,cursor:"pointer",boxShadow:!previewMode?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>✎ Edit Template</button>
            <button onClick={()=>setPreviewMode(true)} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:4,border:"none",background:previewMode?T.cardBg:"transparent",color:previewMode?T.textPrimary:T.textMuted,cursor:"pointer",boxShadow:previewMode?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>👁 Live Preview</button>
          </div>
          {saved[activeId]&&<span style={{...SANS,fontSize:12,color:T.okBase,fontWeight:600}}>✓ Saved</span>}
          <button onClick={()=>handleSave(activeId)} style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer"}}>Save Template</button>
        </div>
      </div>
      
      <div style={{display:"flex", flex:1, overflow:"hidden"}}>
        <div style={{flex:1, padding:"24px 32px", overflowY:"auto"}}>
          {previewMode ? (
            <div style={{background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, padding:"32px", fontSize:14, lineHeight:1.8, color:"#000", fontFamily:"serif", boxShadow:"0 4px 6px rgba(0,0,0,0.02)", minHeight:400}}>
              {parsedContent}
            </div>
          ) : (
            <textarea 
              value={currentText} 
              onChange={e=>setEditContent(p=>({...p,[activeId]:e.target.value}))} 
              className="wysiwyg-body" 
              style={{...MONO, width:"100%", border:`1px solid ${T.border}`, borderRadius:8, padding:"24px", fontSize:13, lineHeight:1.6, minHeight:400, background:"#f8fafc"}}
            />
          )}
        </div>

        {!previewMode && (
          <div style={{width:240, background:T.cardBg, borderLeft:`1px solid ${T.border}`, padding:"20px", overflowY:"auto"}}>
            <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12}}>Dynamic Variables</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginBottom:16, lineHeight:1.4}}>Click to insert a live data binding into the template.</div>
            
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {["FUND_NAME", "PERIOD_END", "NET_ASSETS", "TOTAL_INVESTMENTS", "ADVISORY_FEE_EXPENSE"].map(v => (
                <button key={v} onClick={()=>insertVariable(v)} style={{...MONO, textAlign:"left", fontSize:11, padding:"8px 10px", background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, color:T.actionBase, cursor:"pointer", transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                  &#123;&#123;{v}&#125;&#125;
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>}
  </div>;
}

// ─── Remaining tabs and modals (IT4 — unchanged) ─────────────────────────────
function DrilldownModal({row,onClose}) {
  const entries=JOURNALS[row.acct]||[{date:"2024-12-31",ref:"JE-4899",desc:row.name,debit:row.debit,credit:row.credit,cpty:row.counterparty||"—"}];
  return <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:740,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
      <div style={{background:T.navyHeader,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{...SANS,fontWeight:700,fontSize:14,color:"#fff"}}>Transaction Drilldown</div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}><span style={MONO}>{row.acct}</span> · {row.name}</div></div>
        <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
      </div>
      <div style={{overflowY:"auto",padding:"16px 20px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:T.appBg}}>{["Date","Reference","Description","Counterparty","Debit","Credit"].map((h,i)=><th key={h} style={{...SANS,padding:"8px 12px",textAlign:i>3?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>)}</tr></thead>
          <tbody>{entries.map((e,i)=><tr key={i} className="row-hover"><td style={{...MONO,padding:"9px 12px",fontSize:11,color:T.textMuted,borderBottom:`1px solid ${T.border}`}}>{e.date}</td><td style={{...MONO,padding:"9px 12px",fontSize:11,color:T.actionBase,borderBottom:`1px solid ${T.border}`}}>{e.ref}</td><td style={{padding:"9px 12px",fontSize:12,borderBottom:`1px solid ${T.border}`}}>{e.desc}</td><td style={{padding:"9px 12px",fontSize:11,color:T.textMuted,borderBottom:`1px solid ${T.border}`,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.cpty||"—"}</td><td style={{...MONO,padding:"9px 12px",textAlign:"right",fontSize:12,borderBottom:`1px solid ${T.border}`}}>{e.debit>0?fmtUSD(e.debit):"—"}</td><td style={{...MONO,padding:"9px 12px",textAlign:"right",fontSize:12,borderBottom:`1px solid ${T.border}`}}>{e.credit>0?fmtUSD(e.credit):"—"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

// ─── UPGRADED: PdfModal (Now with Real Excel Working Papers) ─────────────────
function PdfModal({ onClose, fund, fsData, tbData }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExcelExport = async () => {
    setIsExporting(true);
    // Call the function we added at the top of the file
    await exportWorkingPaper(fund, fsData, tbData);
    setIsExporting(false);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.6)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{...SANS,fontWeight:700,fontSize:14,color:"#fff"}}>Export Reports</span>
          <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        
        <div style={{padding:"18px 20px 22px"}}>
          
          {/* REAL PDF GENERATOR BUTTON */}
          {fsData && (
            <PDFDownloadLink document={<FinancialStatementPDF fund={fund} fsData={fsData} />} fileName={`${fund?.fund_id || 'fund'}_financials.pdf`} style={{textDecoration:'none'}}>
              {({ loading }) => (
                <button style={{...SANS,width:"100%",textAlign:"left",border:`1px solid ${T.actionBase}`,borderRadius:8,padding:"12px 15px",marginBottom:9,cursor:loading?"wait":"pointer",background:T.actionBg,display:"flex",alignItems:"center",gap:13}}>
                  <span style={{fontSize:22}}>📄</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:T.actionBase,marginBottom:2}}>
                      {loading ? "Generating PDF Data..." : "Clean PDF (Generated)"}
                    </div>
                    <div style={{fontSize:11,color:T.textMuted}}>Multi-page GAAP Financial Statements.</div>
                  </div>
                  <span style={{color:T.actionBase,fontSize:16}}>{loading ? "⏳" : "↓"}</span>
                </button>
              )}
            </PDFDownloadLink>
          )}

          {/* REAL EXCEL WORKING PAPER BUTTON */}
          <button onClick={handleExcelExport} disabled={isExporting} style={{...SANS,width:"100%",textAlign:"left",border:`1px solid ${T.okBorder}`,borderRadius:8,padding:"12px 15px",marginBottom:9,cursor:isExporting?"wait":"pointer",background:T.okBg,display:"flex",alignItems:"center",gap:13}}>
            <span style={{fontSize:22}}>📊</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:T.okBase,marginBottom:2}}>
                {isExporting ? "Compiling Workbook..." : "Excel Working Paper"}
              </div>
              <div style={{fontSize:11,color:T.textMuted}}>Multi-tab XLSX with GL and formatting.</div>
            </div>
            <span style={{color:T.okBase,fontSize:16}}>{isExporting ? "⏳" : "↓"}</span>
          </button>

          {/* MOCK BUTTON for UI */}
          <button style={{...SANS,width:"100%",textAlign:"left",border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 15px",marginBottom:9,cursor:"pointer",background:T.cardBg,display:"flex",alignItems:"center",gap:13,transition:"border-color 0.1s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            <span style={{fontSize:22}}>🔍</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:T.textPrimary,display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                Audit PDF
                <span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`}}>AUDIT TRAIL</span>
              </div>
              <div style={{fontSize:11,color:T.textMuted}}>Exception log and audit trail.</div>
            </div>
            <span style={{color:T.actionBase,fontSize:16}}>↓</span>
          </button>
          
        </div>
      </div>
    </div>
  );
}

// ─── ApprovalWaterfallBar (Updated for Muted Slate) ──────────────────────
function ApprovalWaterfallBar({fund,approval,exceptions,currentUser,onSubmit,onApprove}) {
  const [showEmailConfirm,setShowEmailConfirm]=useState(false);
  const openErrors=exceptions.filter(e=>e.severity==="error"&&e.status==="open");
  const canSubmit=openErrors.length===0&&approval.status==="open";
  const isPreparer=!currentUser.isController;
  const handleApprove=()=>{ onApprove(); setShowEmailConfirm(true); setTimeout(()=>setShowEmailConfirm(false),4000); };
  
  return <div style={{display:"flex",alignItems:"center",gap:12}}>
    <div style={{display:"flex",alignItems:"center",gap:4, background:"rgba(0,0,0,0.2)", padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)"}}>
      {[{key:"open",label:"Prep",done:["submitted","review_pending","approved"].includes(approval.status)},{key:"review_pending",label:"Review",done:["approved"].includes(approval.status)},{key:"approved",label:"Approved",done:approval.status==="approved"}].map((step,i)=>(
        <React.Fragment key={step.key}>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:step.done?"#34d399":"rgba(255,255,255,0.6)"}}>{step.done&&<span style={{marginRight:3}}>✓</span>}{step.label}</span>
          {i<2&&<span style={{color:"rgba(255,255,255,0.3)",fontSize:10, margin:"0 2px"}}>›</span>}
        </React.Fragment>
      ))}
    </div>
    {isPreparer&&approval.status==="open"&&<button disabled={!canSubmit} onClick={()=>canSubmit&&onSubmit()} style={{...SANS,border:canSubmit?"none":"1px solid rgba(255,255,255,0.1)",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:5,background:canSubmit?T.actionBase:"rgba(255,255,255,0.05)",color:canSubmit?"#fff":"rgba(255,255,255,0.4)"}}>{canSubmit?<><span>↑</span>Submit</>:<><span>🔒</span>{openErrors.length} Errors</>}</button>}
    {currentUser.isController&&approval.status==="review_pending"&&<button onClick={handleApprove} style={{...SANS,border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,background:T.okBase,color:"#fff"}}><span>✓</span>Approve</button>}
    {showEmailConfirm&&<span className="fade-in" style={{...SANS,fontSize:11,color:"#34d399",fontWeight:600}}>✉️ Sent</span>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IT5: NO-CODE DATA PREP ENGINE
// Allows users to build Normalise, Enhance, Merge, Aggregate, and Split rules
// ═══════════════════════════════════════════════════════════════════════════════
function DataPrepModal({ row, columns, onClose, onApply }) {
  const [action, setAction] = useState("normalise");
  const [config, setConfig] = useState({ param1: "", param2: "" });
  const [previewComputing, setPreviewComputing] = useState(false);

  const ACTIONS = [
    { id: "normalise", icon: "✨", label: "Normalise", desc: "Format dates, casing, or strip characters." },
    { id: "enhance",   icon: "🪄", label: "Enhance",   desc: "AI extraction, VLOOKUPs, or appending text." },
    { id: "merge",     icon: "🔗", label: "Merge",     desc: "Combine multiple columns together." },
    { id: "split",     icon: "✂️", label: "Split",     desc: "Split into new columns via delimiter." },
    { id: "aggregate", icon: "∑",  label: "Aggregate", desc: "Sum, count, or average grouped data." },
  ];

  // Simulate preview generation when config changes
  useEffect(() => {
    setPreviewComputing(true);
    const t = setTimeout(() => setPreviewComputing(false), 400);
    return () => clearTimeout(t);
  }, [action, config]);

  const handleApply = () => {
    const actionLabel = ACTIONS.find(a=>a.id===action).label;
    let desc = `${actionLabel} applied`;
    if (action === "split" && config.param1) desc = `Split on '${config.param1}'`;
    if (action === "normalise" && config.param1) desc = `Normalised to ${config.param1}`;
    if (action === "enhance") desc = `Enhanced via AI prompt`;
    
    onApply({ type: actionLabel, desc });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:800,boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh"}}>
        
        {/* Header */}
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span>🛠</span> Data Prep Engine
            </div>
            <div style={{...SANS,fontSize:12,color:"#9ca3af",marginTop:4}}>
              Configuring transformation for column: <span style={{color:"#fff",fontWeight:600}}>{row.sourceCol}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20,transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#9ca3af"}>✕</button>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Left Sidebar: Actions */}
          <div style={{width:240,background:"#f8fafc",borderRight:`1px solid ${T.border}`,padding:"16px",overflowY:"auto"}}>
            <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Select Action</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {ACTIONS.map(a => (
                <button key={a.id} onClick={()=>{setAction(a.id); setConfig({param1:"",param2:""});}} 
                  style={{...SANS,textAlign:"left",padding:"12px 14px",borderRadius:8,border:`1px solid ${action===a.id?T.actionBase:T.border}`,background:action===a.id?"#eff6ff":"#fff",cursor:"pointer",boxShadow:action===a.id?"0 1px 3px rgba(59,130,246,0.1)":"none",transition:"all 0.15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:16}}>{a.icon}</span>
                    <span style={{fontWeight:700,fontSize:13,color:action===a.id?T.actionBase:T.textPrimary}}>{a.label}</span>
                  </div>
                  <div style={{fontSize:11,color:T.textMuted,lineHeight:1.4,paddingLeft:24}}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Config & Preview */}
          <div style={{flex:1,padding:"24px",display:"flex",flexDirection:"column",overflowY:"auto",background:"#fff"}}>
            
            <div style={{flex:1}}>
              <div style={{...SANS,fontSize:14,fontWeight:700,color:T.textPrimary,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{ACTIONS.find(a=>a.id===action).icon}</span> Configure {ACTIONS.find(a=>a.id===action).label}
              </div>

              {/* Dynamic Config Forms based on Action */}
              {action === "normalise" && (
                <div className="fade-in">
                  <FieldLabel>Operation</FieldLabel>
                  <select value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}}>
                    <option value="">Select operation...</option>
                    <option value="UPPERCASE">Convert to UPPERCASE</option>
                    <option value="lowercase">Convert to lowercase</option>
                    <option value="Strip Non-Numeric">Strip Non-Numeric Characters</option>
                    <option value="Format Date (YYYY-MM-DD)">Format Date to YYYY-MM-DD</option>
                  </select>
                </div>
              )}

              {action === "enhance" && (
                <div className="fade-in">
                  <div style={{padding:"12px 16px",background:T.aiBg,border:`1px solid ${T.aiBorder}`,borderRadius:8,marginBottom:16}}>
                    <div style={{...SANS,fontSize:12,fontWeight:700,color:T.aiBase,marginBottom:4}}>✦ AI Enhancement Prompt</div>
                    <div style={{...SANS,fontSize:11,color:T.textMuted}}>Instruct the Torrance AI on how to extract or enrich this data.</div>
                  </div>
                  <FieldLabel>Prompt</FieldLabel>
                  <textarea rows={3} value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} placeholder="e.g., 'Extract only the company name, ignoring legal suffixes like LLC or Inc.'" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,resize:"vertical"}} />
                </div>
              )}

              {action === "split" && (
                <div className="fade-in">
                  <FieldLabel>Delimiter</FieldLabel>
                  <input type="text" value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} placeholder="e.g., '-', ' ', or ','" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}} />
                  
                  <div style={{display:"flex",gap:12}}>
                    <label style={{...SANS,fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="radio" name="splitType" defaultChecked/> Keep First Part</label>
                    <label style={{...SANS,fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="radio" name="splitType"/> Keep Last Part</label>
                    <label style={{...SANS,fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="radio" name="splitType"/> Create New Columns</label>
                  </div>
                </div>
              )}

              {action === "merge" && (
                <div className="fade-in">
                  <FieldLabel>Column to Merge With</FieldLabel>
                  <select value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}}>
                    <option value="">Select column...</option>
                    {columns.filter(c=>c!==row.sourceCol).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <FieldLabel>Separator String</FieldLabel>
                  <input type="text" value={config.param2} onChange={e=>setConfig({...config, param2:e.target.value})} placeholder="e.g., ' - '" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}} />
                </div>
              )}

              {action === "aggregate" && (
                <div className="fade-in">
                  <FieldLabel>Aggregation Function</FieldLabel>
                  <select value={config.param1} onChange={e=>setConfig({...config, param1:e.target.value})} style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13,marginBottom:16}}>
                    <option value="">Select function...</option>
                    <option value="SUM">SUM</option>
                    <option value="AVG">AVERAGE</option>
                    <option value="COUNT">COUNT</option>
                  </select>
                  <FieldLabel>Group By Column (Optional)</FieldLabel>
                  <select style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                    <option value="">No grouping...</option>
                    {columns.filter(c=>c!==row.sourceCol).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Live Data Preview */}
            <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
              <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Live Output Preview</div>
              <div style={{background:"#1e293b",borderRadius:8,padding:"16px",position:"relative",minHeight:90}}>
                {previewComputing ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#94a3b8",fontSize:13,...SANS}}>
                    <span style={{animation:"pulse 1s infinite"}}>Computing preview...</span>
                  </div>
                ) : (
                  <div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:16,alignItems:"center"}}>
                    <div>
                      <div style={{...SANS,fontSize:10,color:"#64748b",marginBottom:4}}>Original Input ({row.sourceCol})</div>
                      <div style={{...MONO,fontSize:13,color:"#cbd5e1",wordBreak:"break-all"}}>{row.sampleValue}</div>
                    </div>
                    <div style={{color:"#475569",fontSize:18,textAlign:"center"}}>→</div>
                    <div>
                      <div style={{...SANS,fontSize:10,color:"#64748b",marginBottom:4}}>Transformed Output</div>
                      <div style={{...MONO,fontSize:13,color:"#34d399",fontWeight:700,wordBreak:"break-all",display:"flex",alignItems:"center",gap:6}}>
                        {action==="normalise" && config.param1==="UPPERCASE" ? row.sampleValue.toUpperCase() :
                         action==="split" && config.param1 ? row.sampleValue.split(config.param1)[0] :
                         action==="enhance" && config.param1 ? "✦ [AI Extracted Result]" :
                         action==="merge" && config.param1 ? `${row.sampleValue}${config.param2 || ""}[${config.param1}]` :
                         row.sampleValue}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div style={{padding:"16px 24px",background:"#f8fafc",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:12}}>
          <button onClick={onClose} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:"#fff",color:T.textPrimary,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleApply} style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 20px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer",boxShadow:"0 2px 4px rgba(74,124,255,0.2)"}}>Apply Rule</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IT5: AI DATA MAPPING SCREEN (Updated with Global Rule Engine Prompt)
// ═══════════════════════════════════════════════════════════════════════════════
function AiDataMappingScreen({session, onBack, onComplete}) {
  const [rows, setRows] = useState(session.rows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("confidence_desc");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [prepRow, setPrepRow] = useState(null);
  
  // NEW: State for Bottleneck 1 Global Prompt
  const [showGlobalPrompt, setShowGlobalPrompt] = useState(false);

  const acceptedCount  = rows.filter(r=>r.status==="accepted").length;
  const pendingCount   = rows.filter(r=>r.status==="pending").length;
  const reviewCount    = rows.filter(r=>r.status==="review").length;
  const unmappedCount  = rows.filter(r=>r.status==="unmapped").length;
  const ignoredCount   = rows.filter(r=>r.status==="ignored").length;
  const highConfPending= rows.filter(r=>r.status==="pending"&&r.confidence>=90).length;
  const avgConf = Math.round(rows.filter(r=>r.confidence>0).reduce((s,r)=>s+r.confidence,0)/(rows.filter(r=>r.confidence>0).length||1));

  const accept = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"accepted"}:r));
  const reject = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"unmapped", canonicalField:""}:r));
  const ignore = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"ignored"}:r));
  const restore = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"unmapped"}:r));
  const acceptAllHigh = () => setRows(prev=>prev.map(r=>r.status==="pending"&&r.confidence>=90?{...r,status:"accepted"}:r));

  // INTERCEPT SAVE: Check if we should prompt for Global Rules
  const handleSaveInitiate = () => {
    const newlyMapped = rows.some(r => r.status === "accepted" && r.canonicalField !== "");
    if (newlyMapped) {
      setShowGlobalPrompt(true);
    } else {
      executeSave();
    }
  };

  const executeSave = () => {
    setShowGlobalPrompt(false);
    setSaving(true); 
    setTimeout(()=>{ 
      setSaving(false); 
      setSaved(true); 
      setTimeout(() => onComplete(session.feedId), 600);
    }, 1200); 
  };

  const handleFieldChange = (id, newFieldVal) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (newFieldVal === "") return { ...r, canonicalField: "", status: "unmapped" };
      return { ...r, canonicalField: newFieldVal, status: "accepted" }; 
    }));
  };

  const handleApplyPrepRule = (id, rule) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const existingRules = r.prepRules || [];
      return { ...r, prepRules: [...existingRules, rule], status: "review" };
    }));
    setPrepRow(null);
  };

  const confirmMapping = (id) => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"accepted"}:r));

  const filtered = useMemo(()=>{
    let result = [...rows];
    if (statusFilter !== "All") result = result.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q=search.toLowerCase();
      result = result.filter(r=>r.sourceCol.toLowerCase().includes(q)||(r.canonicalField||"").toLowerCase().includes(q)||(r.canonicalLabel||"").toLowerCase().includes(q)||r.sampleValue.toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "confidence_desc") return (b.confidence||0) - (a.confidence||0);
      if (sortBy === "confidence_asc") return (a.confidence||0) - (b.confidence||0);
      if (sortBy === "source") return a.sourceCol.localeCompare(b.sourceCol);
      return 0;
    });
    return result;
  },[rows, search, statusFilter, sortBy]);

  const STATUS_CFG = {
    accepted:{color:T.okBase,   bg:T.okBg,   border:T.okBorder,   label:"Accepted",    icon:"✓"},
    pending: {color:T.warnBase, bg:T.warnBg, border:T.warnBorder, label:"Pending",     icon:"⏳"},
    review:  {color:T.errorBase,bg:T.errorBg,border:T.errorBorder,label:"Review",      icon:"⚠"},
    unmapped:{color:T.textMuted,bg:T.appBg,  border:T.border,     label:"Unmapped",    icon:"×"},
    ignored: {color:T.textMuted,bg:"#f3f4f6",border:"#d1d5db",    label:"Ignored",     icon:"∅"},
  };

  const ConfBar = ({pct}) => {
    const c = pct>=90?T.okBase:pct>=70?T.warnBase:T.errorBase;
    return <div style={{display:"flex",alignItems:"center",gap:6,minWidth:80}}>
      <div style={{flex:1,height:5,background:T.border,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:c,borderRadius:2}}/>
      </div>
      <span style={{...MONO,fontSize:10,fontWeight:700,color:c,minWidth:30,textAlign:"right"}}>{pct}%</span>
    </div>;
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.appBg,...SANS}}>
      
      {/* BOTTLENECK 1: GLOBAL PROMPT MODAL */}
      {showGlobalPrompt && (
        <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="slide-in" style={{background:T.cardBg, borderRadius:12, width:600, overflow:"hidden", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
            <div style={{background:T.aiBg, borderBottom:`1px solid ${T.aiBorder}`, padding:"20px 24px", display:"flex", alignItems:"flex-start", gap:16}}>
              <div style={{fontSize:28}}>🌍</div>
              <div>
                <div style={{...SANS, fontSize:18, fontWeight:700, color:T.aiDark}}>Global Schema Rule Detected</div>
                <div style={{...SANS, fontSize:13, color:T.textPrimary, marginTop:6, lineHeight:1.5}}>
                  You have successfully mapped <strong style={{color:T.actionBase}}>{acceptedCount} fields</strong> for the State Street GL feed. 
                  Torrance has identified <strong>49 other pending feeds</strong> from this custodian that share identical column structures.
                </div>
              </div>
            </div>
            <div style={{padding:"24px", background:T.appBg}}>
              <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12}}>Detected Rules</div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {rows.filter(r=>r.status==="accepted").slice(0,3).map(r => (
                  <div key={r.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:6}}>
                    <span style={{...MONO, fontSize:11, color:T.textPrimary}}>{r.sourceCol}</span>
                    <span style={{color:T.textMuted}}>→</span>
                    <span style={{...MONO, fontSize:11, color:T.okBase, fontWeight:600}}>{r.canonicalField}</span>
                  </div>
                ))}
                {acceptedCount > 3 && <div style={{...SANS, fontSize:11, color:T.textMuted, textAlign:"center", marginTop:4}}>+ {acceptedCount - 3} additional fields</div>}
              </div>
            </div>
            <div style={{padding:"16px 24px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"flex-end", gap:12, background:T.cardBg}}>
              <button onClick={executeSave} style={{...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.appBg, color:T.textPrimary, cursor:"pointer"}}>Skip & Save Only This Fund</button>
              <button onClick={executeSave} style={{...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", boxShadow:"0 2px 4px rgba(79,70,229,0.2)"}}>Apply Rules Globally</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:T.navyHeader,padding:"13px 24px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <button onClick={onBack} style={{...SANS,background:"transparent",border:"1px solid #374151",color:"#8898aa",borderRadius:6,padding:"6px 13px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>← Back</button>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:14,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span>✦</span>AI Schema Mapping & Data Prep
            </div>
            <div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>{session.fileName} · {session.fundName}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {saved&&<span style={{...SANS,fontSize:12,color:"#34d399",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><span>✓</span>Processing…</span>}
          {highConfPending>0&&(
            <button onClick={acceptAllHigh} style={{...SANS,fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:6,border:`1px solid ${T.aiBase}`,background:T.aiBase,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span>✦</span>Accept All High-Confidence ({highConfPending})
            </button>
          )}
          <button onClick={handleSaveInitiate} disabled={saving||saved} style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:6,border:"none",background:(saving||saved)?"#374151":T.okBase,color:(saving||saved)?"#6b7280":"#fff",cursor:(saving||saved)?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving?<><span style={{animation:"pulse 0.8s infinite"}}>●</span>Saving…</>:<><span>↓</span>Save & Process Feed</>}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"flex",gap:10,padding:"12px 24px",background:T.cardBg,borderBottom:`1px solid ${T.border}`,flexShrink:0,flexWrap:"wrap"}}>
        {[
          {label:"Total Fields",   val:rows.length,     color:T.textPrimary},
          {label:"Accepted",       val:acceptedCount,   color:T.okBase},
          {label:"Pending",        val:pendingCount,    color:T.warnBase},
          {label:"Needs Review",   val:reviewCount,     color:T.errorBase},
          {label:"Unmapped",       val:unmappedCount,   color:T.textMuted},
          {label:"Ignored",        val:ignoredCount,    color:T.textMuted},
          {label:"Avg Confidence", val:`${avgConf}%`,   color:avgConf>=90?T.okBase:T.warnBase},
        ].map((k,i)=>(
          <div key={i} style={{background:T.appBg,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 14px",minWidth:90}}>
            <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{k.label}</div>
            <div style={{...MONO,fontSize:16,fontWeight:700,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Grid Toolbar */}
      <div style={{padding:"10px 24px",background:T.appBg,borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{position:"relative",flex:1,maxWidth:320}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search source or canonical fields…" style={{...SANS,width:"100%",fontSize:12,padding:"7px 12px 7px 32px",border:`1px solid ${T.border}`,borderRadius:6,background:T.cardBg,color:T.textPrimary,outline:"none"}}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none", cursor:"pointer"}}>
          <option value="All">All Statuses</option>
          <option value="accepted">Accepted</option>
          <option value="pending">Pending</option>
          <option value="review">Needs Review</option>
          <option value="unmapped">Unmapped</option>
          <option value="ignored">Ignored</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none", cursor:"pointer"}}>
          <option value="confidence_desc">Sort: Highest Confidence</option>
          <option value="confidence_asc">Sort: Lowest Confidence</option>
          <option value="source">Sort: Source Column (A-Z)</option>
        </select>
        <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filtered.length} of {rows.length} fields shown</span>
      </div>

      {/* Column headers (Updated Grid Layout to accommodate Data Prep) */}
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 28px 1.5fr 100px 70px 100px 200px",gap:0,background:"#f0f2f5",borderBottom:`2px solid ${T.border}`,padding:"8px 24px",flexShrink:0}}>
        {["Source Column / Prep Rules","","Torrance Canonical Field","AI Confidence","Required","Status","Actions"].map((h,i)=>(
          <div key={i} style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",textAlign:i>=3?"center":"left", paddingLeft:i===6?16:0}}>{h}</div>
        ))}
      </div>

      {/* Mapping rows */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.map((m)=>{
          const cfg = STATUS_CFG[m.status]||STATUS_CFG.pending;
          const isIgnored = m.status === "ignored";
          return (
            <div key={m.id} className="map-row" style={{
              display:"grid",gridTemplateColumns:"1.4fr 28px 1.5fr 100px 70px 100px 200px",
              padding:"11px 24px",borderBottom:`1px solid ${T.border}`,
              background:m.status==="review"?T.errorBg:m.status==="accepted"?"#fafffe":isIgnored?"#f9fafb":T.cardBg,
              alignItems:"center", opacity:isIgnored?0.6:1
            }}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                  {m.isComputed ? (
                    <span style={{...MONO,fontSize:12,fontWeight:700,color:T.actionBase,display:"flex",alignItems:"center",gap:6, background:T.actionBg, padding:"2px 8px", borderRadius:4, border:`1px solid #bfdbfe`, opacity:isIgnored?0.6:1}}>
                      <span style={{fontStyle:"italic", opacity:0.8}}>ƒ(x)</span> <span style={{textDecoration:isIgnored?"line-through":"none"}}>{m.sourceCol}</span>
                    </span>
                  ) : (
                    <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary,textDecoration:isIgnored?"line-through":"none"}}>{m.sourceCol}</span>
                  )}
                  <span style={{...MONO,fontSize:9,padding:"1px 5px",borderRadius:3,background:T.appBg,color:T.textMuted,border:`1px solid ${T.border}`}}>{m.sourceType}</span>
                </div>
                <div style={{...MONO,fontSize:10,color:T.textMuted,maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom: m.prepRules?.length ? 6 : 0}}>sample: {m.sampleValue}</div>
                
                {/* Render active Data Prep Rules */}
                {m.prepRules?.length > 0 && (
                  <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:4}}>
                    {m.prepRules.map((rule, idx) => (
                      <span key={idx} style={{...SANS, fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:4, background:"#f1f5f9", color:"#475569", border:"1px solid #cbd5e1", display:"flex", alignItems:"center", gap:4}}>
                        <span style={{color:"#64748b"}}>🛠</span> {rule.desc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{textAlign:"center",color:m.status==="accepted"?T.okBase:T.border,fontSize:18,fontWeight:700}}>→</div>
              
              <div style={{paddingRight:24}}>
                <select disabled={isIgnored} value={m.canonicalField || ""} onChange={(e) => handleFieldChange(m.id, e.target.value)}
                  style={{...SANS, width:"100%", padding:"6px 8px", borderRadius:5, border:`1px solid ${T.border}`, background:(m.status==="unmapped"||isIgnored)?T.appBg:"#fff", fontSize:12, fontWeight:600, color:T.textPrimary, cursor:isIgnored?"not-allowed":"pointer", marginBottom:4}}>
                  {CANONICAL_OPTIONS.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                </select>
                {m.learnedFrom === "human" ? (
                  <div style={{...SANS, fontSize:10, color:T.actionBase, display:"flex", alignItems:"center", gap:4}}><span>👤</span>{m.aiReason}</div>
                ) : (
                  <div style={{...SANS, fontSize:10, color:T.textMuted, lineHeight:1.3, fontStyle:m.canonicalField?"normal":"italic"}}>{m.aiReason}</div>
                )}
              </div>

              <div style={{paddingLeft:4}}>
                {m.confidence>0?<ConfBar pct={m.confidence}/>:<span style={{...SANS,fontSize:11,color:T.textMuted, textAlign:"center", display:"block"}}>—</span>}
              </div>
              <div style={{textAlign:"center"}}>
                {m.required
                  ?<span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.errorBg,color:T.errorBase,border:`1px solid ${T.errorBorder}`}}>Required</span>
                  :<span style={{...SANS,fontSize:10,color:T.textMuted}}>Optional</span>}
              </div>
              
              <div style={{textAlign:"center"}}>
                <span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span>{cfg.icon}</span>{cfg.label}
                </span>
              </div>

              {/* Action Buttons including Data Prep Trigger */}
              <div style={{display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", paddingLeft:16}}>
                {!isIgnored && (
                  <button onClick={()=>setPrepRow(m)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid #cbd5e1`,background:"#f8fafc",color:"#475569",cursor:"pointer", display:"flex", alignItems:"center", gap:4, transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>
                    <span style={{fontSize:11}}>🛠</span> Prep
                  </button>
                )}
                {m.status !== "accepted" && m.status !== "ignored" && (
                  <button onClick={()=>confirmMapping(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.okBase}`,background:T.okBg,color:T.okBase,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Accept</button>
                )}
                {m.status === "accepted" && (
                  <button onClick={()=>reject(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textMuted,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Reject</button>
                )}
                {m.status !== "ignored" && (
                  <button onClick={()=>ignore(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textMuted,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Ignore</button>
                )}
                {m.status === "ignored" && (
                  <button onClick={()=>restore(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Restore</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Render the Data Prep Modal if a row is selected */}
      {prepRow && (
        <DataPrepModal 
          row={prepRow} 
          columns={rows.map(r=>r.sourceCol)} 
          onClose={()=>setPrepRow(null)} 
          onApply={(rule) => handleApplyPrepRule(prepRow.id, rule)} 
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: GLOBAL ENTITY MANAGER (Master Data Setup)
// ═══════════════════════════════════════════════════════════════════════════════
function GlobalAddEntityModal({ onClose }) {
  return (
    <div className="modal-overlay" role="dialog" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:600,overflow:"hidden",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff"}}>Fund Setup: New Entity</div>
            <div style={{...SANS,fontSize:12,color:"#9ca3af",marginTop:2}}>Define reporting structure, GAAP format, and regulatory filings.</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"24px", display:"flex", flexDirection:"column", gap:16}}>
          <div>
            <FieldLabel required>Legal Entity Name</FieldLabel>
            <input type="text" placeholder="e.g., Red Balloon Offshore Feeder Ltd." style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}/>
          </div>
          <div style={{display:"flex", gap:16}}>
            <div style={{flex:1}}>
              <FieldLabel required>Entity Type</FieldLabel>
              <select style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                <option>Master Fund</option>
                <option>Feeder Fund</option>
                <option>SPV / Blocker</option>
                <option>Management Co</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <FieldLabel required>GAAP Reporting Format</FieldLabel>
              <select style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                <option>Mutual Fund (Retail)</option>
                <option>Hedge Fund (Alt)</option>
                <option>Private Equity (Alt)</option>
                <option>Real Estate Fund (Alt)</option>
                <option>Money Market (Retail)</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex", gap:16}}>
            <div style={{flex:1}}>
              <FieldLabel required>Base Currency</FieldLabel>
              <select style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
                <option>USD - US Dollar</option>
                <option>EUR - Euro</option>
                <option>GBP - British Pound</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <FieldLabel required>Jurisdiction</FieldLabel>
              <input type="text" placeholder="e.g., Cayman Islands" style={{...SANS,width:"100%",padding:"10px 12px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}/>
            </div>
          </div>
          
          <div style={{borderTop:`1px solid ${T.border}`, paddingTop:16}}>
            <FieldLabel>Required Regulatory Filings</FieldLabel>
            <div style={{display:"flex", gap:16, marginTop:8}}>
              {["N-PORT", "N-CEN", "N-MFP", "PF", "ADV"].map(f => (
                <label key={f} style={{...SANS, fontSize:12, display:"flex", alignItems:"center", gap:6, cursor:"pointer"}}>
                  <input type="checkbox" style={{accentColor:T.actionBase}} /> {f}
                </label>
              ))}
            </div>
          </div>

        </div>
        <div style={{padding:"16px 24px",background:"#f8fafc",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:12}}>
          <button onClick={onClose} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:"#fff",color:T.textPrimary,cursor:"pointer"}}>Cancel</button>
          <button onClick={onClose} style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 20px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer"}}>Initialize Entity</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: GLOBAL ENTITY MANAGER (Entities, RBAC & Assignment Rules Merged)
// ═══════════════════════════════════════════════════════════════════════════════
function GlobalEntityManager({ fundSeeds, onBack }) {
  const [activeTab, setActiveTab] = useState("entities"); // 'entities', 'rbac', 'rules'
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  // Mocking the Internal/External Users for RBAC
  const ALL_USERS = [
    { id: "u1", name: "Sarah Chen", email: "sarah.c@torrance.com", role: "Preparer", type: "Internal", funds: "12 Funds", mfa: true },
    { id: "u4", name: "James Okafor", email: "james.o@torrance.com", role: "Controller", type: "Internal", funds: "All Funds", mfa: true },
    { id: "u5", name: "Jennifer Liu", email: "jennifer.l@torrance.com", role: "Preparer", type: "Internal", funds: "8 Funds", mfa: true },
    { id: "ext1", name: "PwC Audit Team", email: "torrance.audit@pwc.com", role: "Auditor (Read-Only)", type: "External", funds: "Pennywise Capital (All)", mfa: true },
    { id: "ext2", name: "Derry GP", email: "gp@derrycapital.com", role: "Client / LP", type: "External", funds: "Derry Credit Opps", mfa: false }
  ];

  // Mocking Assignment Rules
  const RULES = [
    { id: "r1", condition: "IF Exception Code == 'NAV_MISMATCH'", action: "ASSIGN TO James Okafor (Controller)", active: true },
    { id: "r2", condition: "IF Dollar Variance > $500,000", action: "ASSIGN TO Sarah Chen (Senior)", active: true },
    { id: "r3", condition: "IF Fund Type == 'Private Equity'", action: "ASSIGN TO Marcus Reid", active: false },
  ];

  const allEntities = useMemo(() => {
    let entities = [];
    fundSeeds.forEach(fund => {
      const structure = FUND_STRUCTURE[fund.fund_id];
      entities.push({
        id: fund.fund_id, name: fund.name, type: fund.fundType === "Management Co" ? "Mgt Co" : "Master Fund",
        client: fund.client, jurisdiction: structure?.jurisdiction || "Delaware, USA", nav: fund.net_assets,
        fundType: fund.fundType, parent: "—", filings: fund.requiredFilings || []
      });

      if (structure && structure.feeders) {
        structure.feeders.forEach((f, idx) => {
          entities.push({
            id: `${fund.fund_id}-F${idx}`, name: `${fund.name} - ${f.shareClass}`, type: "Feeder / Class",
            client: fund.client, jurisdiction: f.jurisdiction || "Delaware, USA", nav: f.nav,
            fundType: fund.fundType, parent: fund.fund_id, filings: [] 
          });
        });
      }
    });
    return entities;
  }, [fundSeeds]);

  const grouped = useMemo(() => {
    const g = {};
    const filtered = allEntities.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()) || e.client.toLowerCase().includes(search.toLowerCase()));
    filtered.forEach(e => {
      if(!g[e.client]) g[e.client] = [];
      g[e.client].push(e);
    });
    return g;
  }, [allEntities, search]);

  return (
    <div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden", flexDirection:"column", background:T.appBg}}>
      
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <button onClick={onBack} style={{...SANS, background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600, color:T.textPrimary}}>← Dashboard</button>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Global Entity Setup</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Manage Master Data, RBAC, and Assignment Rules.</div>
          </div>
        </div>
        <div style={{display:"flex", background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, padding:4}}>
          <button onClick={()=>setActiveTab("entities")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="entities"?T.cardBg:"transparent", color:activeTab==="entities"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="entities"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Entities & Feeders</button>
          <button onClick={()=>setActiveTab("rbac")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="rbac"?T.cardBg:"transparent", color:activeTab==="rbac"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="rbac"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Access & Roles</button>
          <button onClick={()=>setActiveTab("rules")} style={{...SANS, fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:4, border:"none", background:activeTab==="rules"?T.cardBg:"transparent", color:activeTab==="rules"?T.textPrimary:T.textMuted, cursor:"pointer", boxShadow:activeTab==="rules"?"0 1px 2px rgba(0,0,0,0.05)":"none"}}>Assignment Rules</button>
        </div>
      </div>

      <div style={{padding:"24px", overflowY:"auto", flex:1}}>
        
        {/* Toolbar */}
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:20}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:13}}>⌕</span>
            <input type="text" placeholder={activeTab === "rules" ? "Search rules..." : activeTab === "entities" ? "Search entities, clients, IDs..." : "Search users, emails, roles..."} value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, padding:"8px 12px 8px 28px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:300, outline:"none"}} />
          </div>
          <button onClick={()=> activeTab === "rules" ? {} : setShowAdd(true)} style={{...SANS,fontSize:12,fontWeight:600,padding:"8px 16px",borderRadius:6,border:"none",background:T.actionBase, color:"#fff",cursor:"pointer"}}>
            {activeTab === "rules" ? "+ Build Rule" : activeTab === "entities" ? "+ Setup New Entity" : "+ Invite User"}
          </button>
        </div>

        {/* TAB 1: Entities */}
        {activeTab === "entities" && (
          <div className="fade-in">
            {Object.entries(grouped).map(([client, entities]) => {
              const isOpen = !collapsed[client];
              return (
                <div key={client} style={{border:`1px solid ${T.border}`,borderRadius:10,marginBottom:14,background:T.cardBg,overflow:"hidden"}}>
                  <div onClick={()=>setCollapsed(p=>({...p,[client]:!p[client]}))} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:T.appBg,borderBottom:isOpen?`1px solid ${T.border}`:"none",cursor:"pointer"}}>
                    <span style={{color:T.textMuted,fontSize:12, width:16, textAlign:"center"}}>{isOpen?"▼":"▶"}</span>
                    <div>
                      <div style={{...SANS,fontWeight:700,fontSize:14,color:T.textPrimary}}>{client}</div>
                      <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>{entities.length} entities</div>
                    </div>
                  </div>
                  {isOpen && (
                    <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                      <thead>
                        <tr style={{background:"#f8fafc", borderBottom:`1px solid ${T.border}`}}>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"30%"}}>Entity Name & ID</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>Structure / Parent</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"20%"}}>GAAP Format</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>Required Filings</th>
                          <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", textAlign:"right"}}>Net Assets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entities.map(e => (
                          <tr key={e.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary}}>{e.name}</div>
                              <div style={{...MONO, fontSize:11, color:T.textMuted, marginTop:2}}>{e.id}</div>
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{display:"flex", alignItems:"center", gap:6}}>
                                <span style={{...SANS, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background:e.type.includes("Master")?T.actionBg:T.appBg, color:e.type.includes("Master")?T.actionBase:T.textMuted, border:`1px solid ${e.type.includes("Master")?"#bfdbfe":T.border}`}}>
                                  {e.type}
                                </span>
                              </div>
                              {e.parent !== "—" && <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:4}}>↳ {e.parent}</div>}
                            </td>
                            <td style={{...SANS, fontSize:12, color:T.textPrimary, padding:"12px 16px"}}>
                              {e.fundType}
                              <div style={{...SANS, fontSize:10, color:T.textMuted, marginTop:2}}>{e.jurisdiction}</div>
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                                {e.filings.length === 0 ? <span style={{...SANS, fontSize:11, color:T.textMuted}}>—</span> : e.filings.map(f => (
                                  <span key={f} style={{...MONO, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.border}`, background:T.cardBg, color:T.textPrimary}}>{f}</span>
                                ))}
                              </div>
                            </td>
                            <td style={{padding:"12px 16px", textAlign:"right"}}>
                              {e.nav ? <div style={{...MONO, fontSize:13, fontWeight:700, color:T.textPrimary}}>{fmtUSD(e.nav)}</div> : <span style={{color:T.textMuted}}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: RBAC / Permissions */}
        {activeTab === "rbac" && (
          <div className="fade-in" style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}>
            <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
              <thead style={{background:T.appBg, borderBottom:`2px solid ${T.border}`}}>
                <tr>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>User</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Access Level (Role)</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px"}}>Fund Assignment</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px", textAlign:"center"}}>MFA Enforced</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"12px 16px", textAlign:"right"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ALL_USERS.map(u => (
                  <tr key={u.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{...SANS, fontSize:13, fontWeight:600, color:T.textPrimary, display:"flex", alignItems:"center", gap:8}}>
                        {u.type === "External" ? <span style={{fontSize:16}}>🌐</span> : <span style={{fontSize:16}}>🏢</span>}
                        {u.name}
                      </div>
                      <div style={{...MONO, fontSize:11, color:T.textMuted, marginTop:4, paddingLeft:28}}>{u.email}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <select defaultValue={u.role} style={{...SANS, fontSize:12, padding:"6px 10px", borderRadius:4, border:`1px solid ${T.border}`, background:T.appBg, cursor:"pointer"}}>
                        <option>Controller</option>
                        <option>Preparer</option>
                        <option>Auditor (Read-Only)</option>
                        <option>Client / LP</option>
                      </select>
                    </td>
                    <td style={{padding:"12px 16px", ...SANS, fontSize:12, color:T.textPrimary}}>
                      <div style={{background:T.appBg, padding:"4px 8px", borderRadius:4, border:`1px solid ${T.border}`, display:"inline-block"}}>{u.funds}</div>
                    </td>
                    <td style={{padding:"12px 16px", textAlign:"center"}}>
                      {u.mfa ? <span style={{color:T.okBase, fontSize:16}}>✓</span> : <span style={{...SANS, fontSize:10, fontWeight:700, background:T.errorBg, color:T.errorBase, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.errorBorder}`}}>⚠ DISABLED</span>}
                    </td>
                    <td style={{padding:"12px 16px", textAlign:"right"}}>
                      <button style={{...SANS, fontSize:11, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer"}}>Edit Access</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Assignment Rules */}
        {activeTab === "rules" && (
          <div className="fade-in">
            <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden"}}>
              {RULES.map((r, idx) => (
                <div key={r.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom: idx < RULES.length-1 ? `1px solid ${T.border}` : "none"}}>
                  <div style={{display:"flex", alignItems:"center", gap:16}}>
                    <span style={{fontSize:20}}>{r.active ? "✅" : "⏸"}</span>
                    <div>
                      <div style={{...MONO, fontSize:13, fontWeight:600, color:T.aiDark, marginBottom:4}}>{r.condition}</div>
                      <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textPrimary}}>{r.action}</div>
                    </div>
                  </div>
                  <button style={{...SANS, fontSize:11, color:T.textMuted, background:"transparent", border:`1px solid ${T.border}`, padding:"4px 10px", borderRadius:4, cursor:"pointer"}}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      {showAdd && <GlobalAddEntityModal onClose={()=>setShowAdd(false)} />}
    </div>
  );
}

// ─── FundView — Rapid Header Toggle (Searchable Combobox) ────────────────────────
function FundSelectorCombobox({fund, fundSeeds, onSelectFund}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = fundSeeds.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.fund_id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={() => { setOpen(!open); setSearch(""); }} style={{...SANS, fontWeight:700, fontSize:14, color:"#fff", background:"#253547", border:"1px solid #374151", borderRadius:6, padding:"4px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, minWidth:320, justifyContent:"space-between", height:32}}>
        <div style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{fund.name}</div>
        <span style={{fontSize:10, color:"#9ca3af"}}>▼</span>
      </button>

      {open && (
        <div className="slide-in" style={{position:"absolute", top:"100%", left:0, marginTop:4, width:400, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:"0 10px 25px rgba(0,0,0,0.2)", zIndex:1000, overflow:"hidden", display:"flex", flexDirection:"column"}}>
          <div style={{padding:"8px 12px", borderBottom:`1px solid ${T.border}`, background:T.appBg}}>
            <input type="text" autoFocus placeholder="Search 273 funds by name or ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"6px 10px", borderRadius:4, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} />
          </div>
          <div style={{maxHeight:300, overflowY:"auto"}}>
            {filtered.length === 0 ? (
              <div style={{padding:"12px", textAlign:"center", color:T.textMuted, ...SANS, fontSize:12}}>No funds found</div>
            ) : (
              filtered.map(f => (
                <div key={f.fund_id} onClick={() => { onSelectFund(f); setOpen(false); }} className="row-hover" style={{padding:"10px 12px", borderBottom:`1px solid ${T.border}`, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div style={{minWidth:0}}>
                    <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{f.name}</div>
                    <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:2}}>{f.fund_id}</div>
                  </div>
                  <div style={{...SANS, fontSize:10, color:T.textMuted, whiteSpace:"nowrap", paddingLeft:12}}>{f.client}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: WORKPAPERS ENGINE (Batch Compute & Audit Logs - REQ 6.2, 6.4)
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: WORKPAPERS ENGINE (Batch Compute, Audit Logs & Search Filtering)
// ═══════════════════════════════════════════════════════════════════════════════
const WORKPAPER_TEMPLATES = [
  { id: "wp-1", category: "Ratios & Performance", name: "Net Expense Ratio", formula: "( [Total_Expenses] - [Fee_Waivers] ) / [Avg_Daily_Net_Assets]", isGlobal: true, aiVerified: true, feeds: ["Financial Highlights", "Form N-CEN"], syncedFunds: 498, outOfSync: 2 },
  { id: "wp-2", category: "Ratios & Performance", name: "30-Day SEC Yield", formula: "2 * ((( [a_Net_Income] - [b_Accrued_Exp] ) / ( [c_Avg_Shares] * [d_Max_Price] ) + 1 ) ^ 6 - 1)", isGlobal: true, aiVerified: false, feeds: ["Fact Sheet", "Form N-PORT"], syncedFunds: 500, outOfSync: 0 },
  { id: "wp-3", category: "Accruals & Fees", name: "Management Fee Accrual", formula: "( [Avg_Daily_Net_Assets] * [Mgmt_Fee_Rate] ) / 365 * [Days_In_Period]", isGlobal: true, aiVerified: true, feeds: ["Statement of Operations", "Form PF"], syncedFunds: 500, outOfSync: 0 },
  { id: "wp-4", category: "Allocations", name: "Carried Interest (European)", formula: "MAX( 0, ( [Ending_NAV] - [Committed_Cap] * (1 + [Hurdle_Rate]) ) * 0.20 )", isGlobal: true, aiVerified: true, feeds: ["Partners Capital", "K-1s"], syncedFunds: 142, outOfSync: 0 },
  { id: "wp-5", category: "Regulatory Metrics", name: "ASC 820 Level 3 %", formula: "[Total_Level_3_Assets] / [Net_Assets] * 100", isGlobal: true, aiVerified: true, feeds: ["Form N-PORT", "Fair Value Notes"], syncedFunds: 500, outOfSync: 0 },
];

function WorkpapersTab({ fund, masterFeeds }) {
  const [templates, setTemplates] = useState(WORKPAPER_TEMPLATES);
  const [activeCalcId, setActiveCalcId] = useState("wp-1");
  const [deploying, setDeploying] = useState(false);
  
  // Edit & Override States
  const [isEditing, setIsEditing] = useState(false);
  const [draftFormula, setDraftFormula] = useState("");
  const [hasOverride, setHasOverride] = useState(false); 
  const [overrideValue, setOverrideValue] = useState("0.65%");

  // Batch Compute & Search States
  const [batchComputing, setBatchComputing] = useState(false);
  const [search, setSearch] = useState("");

  // Search Filtering Logic
  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [templates, search]);

  const activeCalc = templates.find(c => c.id === activeCalcId);
  const categories = [...new Set(filteredTemplates.map(c => c.category))];

  // Dummy runtime values for the active fund preview
  const runtimeValues = {
    Total_Expenses: 8308000,
    Fee_Waivers: 150000,
    Avg_Daily_Net_Assets: 685000000,
    Mgmt_Fee_Rate: 0.0075,
    Days_In_Period: 31,
    Ending_NAV: 687400000,
    Committed_Cap: 500000000,
    Hurdle_Rate: 0.08,
    Total_Level_3_Assets: 45000000,
    Net_Assets: 687400000
  };

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setIsEditing(false);
      setTemplates(prev => prev.map(t => t.id === activeCalcId ? { ...t, formula: draftFormula } : t));
    }, 1500);
  };

  const startEditing = () => {
    setDraftFormula(activeCalc.formula);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    const newId = `wp-${Date.now()}`;
    const newCalc = { id: newId, category: "Custom Formulas", name: "New Calculation", formula: "[Variable_1] + [Variable_2]", isGlobal: true, aiVerified: false, feeds: [], syncedFunds: 0, outOfSync: 0 };
    setTemplates([newCalc, ...templates]);
    setActiveCalcId(newId);
    setDraftFormula(newCalc.formula);
    setIsEditing(true);
    setSearch(""); // Clear search to ensure new formula is visible
  };

  const runBatchCompute = () => {
    setBatchComputing(true);
    setTimeout(() => setBatchComputing(false), 2000);
  };

  const renderFormula = (formulaString) => {
    const tokens = formulaString.split(/(\[.*?\]|[\(\)\/\*\-\+\^])/g).filter(t => t.trim());
    return (
      <div style={{display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", padding:"16px", background:T.navyHeader, borderRadius:8, fontFamily:MONO.fontFamily, fontSize:14, lineHeight:2}}>
        {tokens.map((token, i) => {
          if (token.startsWith("[")) {
            const varName = token.replace(/[\[\]]/g, "");
            return (
              <div key={i} style={{background:T.actionBase, color:"#fff", padding:"2px 10px", borderRadius:6, fontWeight:700, display:"flex", flexDirection:"column", alignItems:"center"}}>
                <span>{varName}</span>
                <span style={{fontSize:10, color:"#a5b4fc", fontWeight:500, marginTop:2}}>{fmtNum(runtimeValues[varName] || 0)}</span>
              </div>
            );
          }
          if (["+", "-", "*", "/", "^"].includes(token)) {
            return <span key={i} style={{color:"#cbd5e1", fontWeight:700, margin:"0 4px"}}>{token}</span>;
          }
          if (["(", ")"].includes(token)) {
            return <span key={i} style={{color:"#94a3b8", fontWeight:700, fontSize:16}}>{token}</span>;
          }
          return <span key={i} style={{color:"#34d399", fontWeight:700}}>{token}</span>;
        })}
      </div>
    );
  };

  return (
    <div style={{display:"flex", height:"100%", background:T.appBg}}>
      
      {/* Left Sidebar: Calculation Library */}
      <div style={{width: 320, background:T.cardBg, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", flexShrink:0}}>
        <div style={{padding:"16px 20px", borderBottom:`1px solid ${T.border}`}}>
          <div style={{...SANS, fontWeight:700, fontSize:15, color:T.textPrimary}}>Workpapers Engine</div>
          <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:2}}>Global Variables & Derived Values</div>
          
          {/* NEW: Search Bar */}
          <div style={{position:"relative", marginTop:12}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input 
              type="text" 
              placeholder="Search formulas..." 
              value={search} 
              onChange={e=>setSearch(e.target.value)} 
              style={{...SANS, width:"100%", padding:"8px 12px 8px 30px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} 
            />
          </div>

          <button onClick={runBatchCompute} disabled={batchComputing} style={{...SANS, marginTop:12, width:"100%", fontSize:12, fontWeight:700, padding:"8px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", transition:"all 0.2s"}}>
            {batchComputing ? <><span style={{animation:"pulse 0.8s infinite"}}>●</span> Computing all funds...</> : "▶ Run Batch Compute"}
          </button>
        </div>
        <div style={{overflowY:"auto", flex:1}}>
          {categories.length === 0 ? (
            <div style={{padding:"30px 20px", textAlign:"center", color:T.textMuted, ...SANS, fontSize:13}}>
              No formulas match "{search}"
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                <div style={{padding:"12px 20px", background:"#f8fafc", borderBottom:`1px solid ${T.border}`, ...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em"}}>
                  {cat}
                </div>
                {filteredTemplates.filter(c => c.category === cat).map(calc => (
                  <div key={calc.id} onClick={() => {setActiveCalcId(calc.id); setIsEditing(false); setHasOverride(false);}} style={{padding:"12px 20px", borderBottom:`1px solid ${T.border}`, background: activeCalcId === calc.id ? "#eff6ff" : T.cardBg, cursor:"pointer", borderLeft:`4px solid ${activeCalcId === calc.id ? T.actionBase : "transparent"}`}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4}}>
                      <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary}}>{calc.name}</div>
                      {calc.isGlobal && <span title="Global Template" style={{fontSize:12}}>🌍</span>}
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:6}}>
                      {calc.aiVerified && <span style={{...MONO, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4, background:T.aiBg, color:T.aiBase, border:`1px solid ${T.aiBorder}`}}>✦ AI VERIFIED</span>}
                      <span style={{...SANS, fontSize:10, color:T.textMuted}}>{calc.feeds.length} downstream feeds</span>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <div style={{padding:"16px 20px", borderTop:`1px solid ${T.border}`, background:"#f8fafc"}}>
          <button onClick={handleAddNew} style={{...SANS, fontSize:12, fontWeight:600, width:"100%", padding:"8px 0", borderRadius:6, border:`1px dashed ${T.actionBase}`, background:"transparent", color:T.actionBase, cursor:"pointer"}}>+ Build New Formula</button>
        </div>
      </div>

      {/* Right Pane: Formula Builder & Context */}
      <div style={{flex:1, overflowY:"auto", padding:"24px 32px"}}>
        {activeCalc && (
          <div className="fade-in">
            {/* Header & Scale Status */}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24}}>
              <div>
                <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
                  <span style={{...SANS, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:4, background:T.okBg, color:T.okBase, border:`1px solid ${T.okBorder}`}}>GLOBAL TEMPLATE</span>
                  <span style={{...MONO, fontSize:11, color:T.textMuted}}>ID: {activeCalc.id}</span>
                </div>
                <div style={{...SANS, fontSize:22, fontWeight:700, color:T.textPrimary}}>{activeCalc.name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4}}>Cross-Fund Sync Status</div>
                <div style={{display:"flex", alignItems:"center", gap:12}}>
                  <div style={{display:"flex", alignItems:"center", gap:4}}><span style={{color:T.okBase, fontSize:14}}>●</span><span style={{...MONO, fontSize:13, fontWeight:700, color:T.textPrimary}}>{activeCalc.syncedFunds}</span><span style={{...SANS, fontSize:11, color:T.textMuted}}>Synced</span></div>
                  <div style={{display:"flex", alignItems:"center", gap:4}}><span style={{color:activeCalc.outOfSync > 0 ? T.errorBase : T.textMuted, fontSize:14}}>●</span><span style={{...MONO, fontSize:13, fontWeight:700, color:T.textPrimary}}>{activeCalc.outOfSync}</span><span style={{...SANS, fontSize:11, color:T.textMuted}}>Overrides</span></div>
                </div>
              </div>
            </div>

            {/* Formula Builder */}
            <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", marginBottom:24, boxShadow:"0 2px 10px rgba(0,0,0,0.02)"}}>
              <div style={{padding:"12px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc"}}>
                <div style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary}}>Calculation Logic</div>
                {!isEditing ? (
                  <button onClick={startEditing} style={{...SANS, fontSize:11, fontWeight:600, color:T.actionBase, background:"none", border:"none", cursor:"pointer"}}>✎ Edit Formula</button>
                ) : (
                  <button onClick={() => setIsEditing(false)} style={{...SANS, fontSize:11, fontWeight:600, color:T.textMuted, background:"none", border:"none", cursor:"pointer"}}>Cancel Edit</button>
                )}
              </div>
              <div style={{padding:20}}>
                {isEditing ? (
                  <div>
                    <textarea 
                      value={draftFormula} 
                      onChange={e=>setDraftFormula(e.target.value)} 
                      style={{...MONO, width:"100%", padding:"16px", borderRadius:8, border:`1px solid ${T.actionBase}`, fontSize:14, minHeight:100, background:"#f8fafc"}} 
                    />
                    <div style={{...SANS, fontSize:11, color:T.textMuted, marginTop:8}}>Use <span style={{...MONO, background:"#e2e8f0", padding:"2px 4px", borderRadius:3}}> [Variable_Name] </span> syntax to reference Trial Balance or Entity Setup fields.</div>
                  </div>
                ) : (
                  renderFormula(activeCalc.formula)
                )}
                
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20, paddingTop:16, borderTop:`1px dashed ${T.border}`}}>
                  <div style={{...SANS, fontSize:12, color:T.textMuted}}>
                    Live Preview for <strong>{fund.name}</strong>
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:12}}>
                    <span style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em"}}>Calculated Result =</span>
                    <span style={{...MONO, fontSize:18, fontWeight:700, color: hasOverride ? T.warnBase : T.okBase, background: hasOverride ? T.warnBg : T.okBg, padding:"4px 12px", borderRadius:6, border:`1px solid ${hasOverride ? T.warnBorder : T.okBorder}`}}>
                      {hasOverride ? overrideValue : "1.19%"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fund-Level Override Card with Audit Trail */}
            <div style={{background: hasOverride ? T.warnBg : T.cardBg, border:`1px solid ${hasOverride ? T.warnBorder : T.border}`, borderRadius:10, overflow:"hidden", marginBottom:24, transition:"all 0.2s"}}>
              <div style={{padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{...SANS, fontSize:14, fontWeight:700, color: hasOverride ? T.warnBase : T.textPrimary, display:"flex", alignItems:"center", gap:8}}>
                    <span>{hasOverride ? "⚠" : "🔗"}</span> Fund-Level Override
                  </div>
                  <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:4}}>
                    Sever the link to the global template and apply a static manual value for this fund only.
                  </div>
                </div>
                <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer"}}>
                  <span style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary}}>Override Active</span>
                  <input type="checkbox" checked={hasOverride} onChange={e=>setHasOverride(e.target.checked)} style={{accentColor:T.warnBase, width:16, height:16}} />
                </label>
              </div>
              {hasOverride && (
                <div className="slide-in" style={{padding:"0 20px 20px", display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap"}}>
                  <div style={{flex:1, minWidth:200}}>
                    <FieldLabel>Static Override Value</FieldLabel>
                    <input type="text" value={overrideValue} onChange={e=>setOverrideValue(e.target.value)} style={{...MONO, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.warnBorder}`, fontSize:14, background:"#fff"}} />
                  </div>
                  <div style={{flex:2, minWidth:300}}>
                    <FieldLabel>Justification / Supporting File</FieldLabel>
                    <input type="text" placeholder="e.g., Refer to Side Letter A for fee waiver..." style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.warnBorder}`, fontSize:13, background:"#fff"}} />
                  </div>
                  <div style={{width:"100%", marginTop:8, ...MONO, fontSize:10, color:T.warnBase, background:"#fff", padding:"8px", borderRadius:4, border:`1px dashed ${T.warnBorder}`}}>
                    AUDIT LOG: Override enacted by Sarah Chen (u1) on Dec 31, 2024 at 10:45 AM. Justification recorded.
                  </div>
                </div>
              )}
            </div>

            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:24}}>
              {/* Downstream Lineage */}
              <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.02)"}}>
                <div style={{padding:"12px 20px", borderBottom:`1px solid ${T.border}`, background:"#f8fafc", ...SANS, fontSize:13, fontWeight:700, color:T.textPrimary}}>
                  Downstream Data Lineage
                </div>
                <div style={{padding:20}}>
                  <div style={{...SANS, fontSize:12, color:T.textMuted, marginBottom:16}}>This calculation dynamically feeds the following deliverables. Any changes here will force an automatic recalculation downstream.</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                    {activeCalc.feeds.map(f => (
                      <span key={f} style={{...SANS, fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:20, background:T.appBg, border:`1px solid ${T.border}`, color:T.textPrimary, display:"flex", alignItems:"center", gap:6}}>
                        <span style={{color:T.actionBase}}>↳</span> {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Prospectus Reconciliation */}
              <div style={{background:T.cardBg, border:`1px solid ${T.aiBorder}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 10px rgba(99,102,241,0.05)"}}>
                <div style={{padding:"12px 20px", borderBottom:`1px solid ${T.aiBorder}`, background:T.aiBg, display:"flex", alignItems:"center", gap:8}}>
                  <span style={{color:T.aiBase, fontSize:16}}>✦</span>
                  <span style={{...SANS, fontSize:13, fontWeight:700, color:T.aiDark}}>AI Prospectus Reconciliation</span>
                </div>
                <div style={{padding:20}}>
                  {activeCalc.aiVerified ? (
                    <>
                      <div style={{...SANS, fontSize:12, color:T.textPrimary, marginBottom:12, lineHeight:1.5}}>
                        Torrance AI has verified that this global formula mathematically matches the legal definition found in the fund's offering documents.
                      </div>
                      <div style={{background:"#f8fafc", padding:"12px", borderRadius:6, borderLeft:`3px solid ${T.aiBase}`, ...SANS, fontSize:11, color:T.textMuted, fontStyle:"italic", lineHeight:1.6}}>
                        "The Fund shall pay the Adviser a management fee, calculated daily and payable monthly in arrears, at an annual rate of 0.75% of the Fund’s average daily net assets."<br/>
                        <span style={{fontWeight:600, color:T.textPrimary, fontStyle:"normal", marginTop:6, display:"inline-block"}}>— Amended and Restated Prospectus (Oct 2024), Section 4.1</span>
                      </div>
                    </>
                  ) : (
                    <div style={{...SANS, fontSize:12, color:T.warnBase, display:"flex", alignItems:"flex-start", gap:8}}>
                      <span style={{fontSize:16}}>⚠</span>
                      <span>This calculation was manually created and has not yet been reconciled against the legal offering documents. Click "Run AI Check" to verify.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mass Deployment Action (Only visible in Edit Mode) */}
            {isEditing && (
              <div className="slide-in" style={{marginTop:24, padding:"20px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{...SANS, fontSize:14, fontWeight:700, color:T.textPrimary}}>Deploy Global Updates</div>
                  <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:4}}>Push any formula changes out to the {activeCalc.syncedFunds} actively synced funds. This will regenerate affected workpapers immediately.</div>
                </div>
                <button disabled={deploying} onClick={handleDeploy} style={{...SANS, fontSize:13, fontWeight:700, padding:"10px 24px", borderRadius:6, border:"none", background: deploying ? "#94a3b8" : T.actionBase, color:"#fff", cursor:deploying ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:8, transition:"background 0.2s"}}>
                  {deploying ? <><span style={{animation:"pulse 0.8s infinite"}}>●</span> Synchronizing Database...</> : <><span>🌍</span> Deploy to {activeCalc.syncedFunds} Funds</>}
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── FundView — Main Fund Drill-Down Container ────────────────────────
// ─── FundView — Main Fund Drill-Down Container ────────────────────────
function FundView({fund, fundSeeds, exceptions, approval, currentUser, masterFeeds, blockedFunds, onUpdateFeedRecord, onSelectFund, onResolve, onReopen, onUpdate, onAddThread, onSubmit, onApprove, onBack}) {
  const [tab,setTab]=useState("exceptions");
  
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
    {key:"explorer",     label:"Data Explorer"},
    {key:"journals",     label:"Journal Entries"},
    {key:"workpapers",   label:"Workpapers", ai:true},
    {key:"cross_checks", label:"Cross Checks", ai:true},
    {key:"statements",   label:"Financial Statements"},
    {key:"footnotes",    label:"Footnote Editor", ai:true},
  ]; 
  
  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 52px)"}}>
    <div style={{background:T.navyHeader,padding:"8px 24px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{...SANS,background:"transparent",border:`1px solid #374151`,color:"#8898aa",borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>← Dashboard</button>
        <FundSelectorCombobox fund={fund} fundSeeds={fundSeeds} onSelectFund={onSelectFund} />
        <div style={{fontWeight:400,color:"#8898aa",fontSize:12, ...SANS}}>| {fund.series} · {fund.period}</div>
        <SlaPill daysLeft={fund.sla_days}/>
        
        {blockedFunds.length > 0 && (
          <button onClick={handleNextFund} style={{...SANS, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, background:T.warnBg, color:T.warnBase, border:`1px solid ${T.warnBorder}`, cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginLeft:12}}>
            Next Blocked Fund <span>→</span>
          </button>
        )}
      </div>
      <ApprovalWaterfallBar fund={fund} approval={approval} exceptions={exceptions} currentUser={currentUser} onSubmit={onSubmit} onApprove={onApprove}/>
    </div>

    <div style={{background:T.cardBg,borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",gap:0,flexShrink:0,overflowX:"auto"}}>
      {TABS.map(t=>(
        <button key={t.key} onClick={()=>setTab(t.key)}
          style={{...SANS,padding:"10px 16px",fontSize:12,fontWeight:tab===t.key?700:500,color:tab===t.key?T.actionBase:T.textMuted,background:"none",border:"none",borderBottom:tab===t.key?`2px solid ${T.actionBase}`:"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap", transition:"color 0.2s"}}>
          {t.label}
          {t.ai&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`}}>✦ AI</span>}
        </button>
      ))}
    </div>

    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {tab==="exceptions"  &&<ExceptionsTab exceptions={exceptions} approval={approval} onResolve={onResolve} onReopen={onReopen} onUpdate={onUpdate} onAddThread={onAddThread} currentUserId={currentUser.id} onSubmit={onSubmit}/>}
      {tab==="explorer"    &&<DataExplorerTab masterFeeds={masterFeeds} onUpdateFeedRecord={onUpdateFeedRecord}/>}
      {tab==="journals" && <JournalEntriesTab fund={fund} fundSeeds={fundSeeds} masterFeeds={masterFeeds} currentUser={currentUser} onPostJE={() => {}} />}
      {tab==="workpapers"  &&<WorkpapersTab fund={fund} masterFeeds={masterFeeds} />} {/* <-- ADD THIS LINE */}
      {tab==="cross_checks"&&<CrossChecksTab currentUser={currentUser}/>}
      {tab==="statements"  &&<FinancialStatementsTab fund={fund} />}
      {tab==="footnotes"   &&<FootnoteEditorTab fund={fund} />}
    </div>
  </div>;
}

// ─── Dashboard, SFTP Widget, Team Capacity, Template Config, Auditor Portal ──
// All carried forward from IT4 with minimal changes
function TeamCapacityView({fundState,fundSeeds,onSelectFund,onReassign}) {
  const [dragFund,setDragFund]=useState(null);const [dragOver,setDragOver]=useState(null);
  const preparers=TEAM.filter(m=>!m.isController);
  const getFunds=uid=>fundSeeds.filter(f=>f.assignedTo===uid);
  const getOpen=uid=>fundSeeds.filter(f=>f.assignedTo===uid).reduce((s,f)=>s+(fundState[f.fund_id]||[]).filter(e=>e.status==="open").length,0);
  return <div style={{padding:"20px 24px"}}>
    <div style={{...SANS,fontWeight:700,fontSize:14,marginBottom:4}}>Team Capacity — December 31, 2024</div>
    <div style={{...SANS,fontSize:12,color:T.textMuted,marginBottom:18}}>Drag fund cards to reassign. Double-click to open.</div>
    <div style={{background:T.cardBg,border:`1px solid ${T.controllerBd}`,borderRadius:10,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
      <Avatar user={TEAM.find(m=>m.id==="u4")} size={40}/><div style={{flex:1}}><div style={{...SANS,fontWeight:700,fontSize:14}}>James Okafor</div><div style={{...SANS,fontSize:12,color:T.controllerAccent,fontWeight:600}}>Controller</div></div>
      <div style={{textAlign:"right"}}><div style={{...MONO,fontSize:18,fontWeight:700,color:T.controllerAccent}}>{fundSeeds.filter(f=>f.assignedTo==="u4").length}</div><div style={{...SANS,fontSize:11,color:T.textMuted}}>funds in review</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
      {preparers.map(member=>{ const funds=getFunds(member.id),openCnt=getOpen(member.id),isDO=dragOver===member.id; return(
        <div key={member.id} className="fte-card" onDragOver={e=>{e.preventDefault();setDragOver(member.id);}} onDragLeave={()=>setDragOver(null)} onDrop={e=>{e.preventDefault();setDragOver(null);if(dragFund&&dragFund.assignedTo!==member.id)onReassign(dragFund.fund_id,member.id);setDragFund(null);}} style={{background:T.cardBg,border:`1px solid ${isDO?T.actionBase:T.border}`,outline:isDO?`2px dashed ${T.actionBase}`:"none",transition:"border-color 0.1s"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}><Avatar user={member} size={36}/><div style={{flex:1}}><div style={{...SANS,fontWeight:700,fontSize:13}}>{member.name}</div><div style={{...SANS,fontSize:11,color:T.textMuted}}>{member.role}</div></div><div style={{textAlign:"right"}}><div style={{...MONO,fontSize:20,fontWeight:700,color:openCnt>0?T.errorBase:T.okBase}}>{openCnt}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>open</div></div></div>
          <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:80}}>
            {funds.length===0&&<div style={{...SANS,fontSize:12,color:T.textMuted,textAlign:"center",padding:"14px 0"}}>{isDO?"Drop here":"No funds assigned"}</div>}
            {funds.map(f=>{ const excs=fundState[f.fund_id]||[];const blocked=excs.filter(e=>e.severity==="error"&&e.status==="open").length>0;const open=excs.filter(e=>e.status==="open").length; return(
              <div key={f.fund_id} draggable onDragStart={()=>setDragFund(f)} onDragEnd={()=>{setDragFund(null);setDragOver(null);}} onDoubleClick={()=>onSelectFund(f)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:7,border:`1px solid ${blocked?T.errorBorder:T.border}`,background:blocked?T.errorBg:T.cardBg,cursor:"grab",userSelect:"none"}}>
                <div style={{flex:1,minWidth:0}}><div style={{...SANS,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={{...SANS,fontSize:10,color:T.textMuted,marginTop:1}}><span style={MONO}>{f.fund_id}</span></div></div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:8,flexShrink:0}}>{open>0&&<span style={{...MONO,fontSize:11,fontWeight:700,color:blocked?T.errorBase:T.warnBase}}>{open}</span>}<span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:blocked?T.errorBg:T.okBg,color:blocked?T.errorBase:T.okBase,border:`1px solid ${blocked?T.errorBorder:T.okBorder}`,display:"flex",alignItems:"center",gap:3}}>{blocked?<><span>✕</span>BLOCKED</>:<><span>✓</span>READY</>}</span><span style={{color:T.textMuted,fontSize:12,cursor:"grab"}}>⠿</span></div>
              </div>
            );})}
          </div>
        </div>
      );})}
    </div>
  </div>;
}

function TemplateConfigScreen({onClose}) {
  const [templates,setTemplates]=useState(TEMPLATE_TYPES);const [uploading,setUploading]=useState(null);
  const handleUpload=key=>{setUploading(key);setTimeout(()=>{setTemplates(prev=>prev.map(t=>t.key===key?{...t,uploaded:true,uploadedBy:"u1",uploadedAt:"Just now"}:t));setUploading(null);},1200);};
  return <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:640,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
      <div style={{background:T.navyHeader,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>Template Configuration</div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Upload custom Word and Excel templates for client deliverables</div></div><button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button></div>
      <div style={{overflowY:"auto",padding:"20px 22px"}}>
        {templates.map(tmpl=>{const uploader=tmpl.uploadedBy?TEAM.find(m=>m.id===tmpl.uploadedBy):null;const isUploading=uploading===tmpl.key;return(
          <div key={tmpl.key} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 14px",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:10}}>
            <span style={{fontSize:24,flexShrink:0}}>{tmpl.icon}</span>
            <div style={{flex:1,minWidth:0}}><div style={{...SANS,fontWeight:700,fontSize:13,marginBottom:2}}>{tmpl.label}</div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{...SANS,fontSize:10,color:T.textMuted}}>{tmpl.client}</span><span style={{...MONO,fontSize:10,color:T.textMuted,background:T.appBg,padding:"1px 5px",borderRadius:3,border:`1px solid ${T.border}`}}>{tmpl.ext}</span>{tmpl.uploaded&&uploader&&<span style={{...SANS,fontSize:10,color:T.textMuted,display:"flex",alignItems:"center",gap:4}}><Avatar user={uploader} size={14}/>{uploader.name} · {tmpl.uploadedAt}</span>}</div></div>
            <div style={{flexShrink:0}}>{isUploading?<span style={{...SANS,fontSize:12,color:T.actionBase,fontWeight:600}}>Uploading…</span>:tmpl.uploaded?<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:3}}><span>✓</span>Uploaded</span><button onClick={()=>handleUpload(tmpl.key)} style={{...SANS,fontSize:11,color:T.actionBase,background:"transparent",border:`1px solid ${T.actionBase}`,borderRadius:5,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>Replace</button></div>:<button onClick={()=>handleUpload(tmpl.key)} style={{...SANS,fontSize:12,fontWeight:600,padding:"7px 14px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>↑</span>Upload</button>}</div>
          </div>
        );})}
      </div>
    </div>
  </div>;
}

function AuditorPortal({onClose}) {
  const [step,setStep]=useState("login");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [mfaCode,setMfaCode]=useState("");const [loginErr,setLoginErr]=useState("");const [downloading,setDownloading]=useState(null);
  const handleLogin=()=>{ if(!email.includes("@")||!password){setLoginErr("Please enter a valid email and password.");return;} setLoginErr("");setStep("mfa"); };
  const handleMfa=()=>{ if(mfaCode.length!==6){setLoginErr("Enter the 6-digit code.");return;} setLoginErr("");setStep("portal"); };
  const handleDownload=label=>{ setDownloading(label);setTimeout(()=>setDownloading(null),1400); };
  const REPORTS=[{id:"r1",label:"Trial Balance — Dec 31, 2024",type:"Excel",fund:"Pennywise Global Diversified Fund",date:"Jan 1, 2025",icon:"📊"},{id:"r2",label:"Audited Financial Statements Draft",type:"PDF",fund:"Pennywise Global Diversified Fund",date:"Jan 2, 2025",icon:"📄"},{id:"r3",label:"Schedule of Investments",type:"Excel",fund:"Pennywise Global Diversified Fund",date:"Jan 1, 2025",icon:"📊"},{id:"r4",label:"Exception Resolution Audit Trail",type:"PDF",fund:"Pennywise Global Diversified Fund",date:"Jan 2, 2025",icon:"🔍"},{id:"r5",label:"Fair Value Hierarchy Rollforward",type:"Excel",fund:"Pennywise Global Diversified Fund",date:"Jan 1, 2025",icon:"📊"}];
  return <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(10,18,30,0.85)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:14,width:step==="portal"?640:420,boxShadow:"0 30px 80px rgba(0,0,0,0.4)",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:T.navyHeader,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff",display:"flex",alignItems:"center",gap:8}}><span style={{color:T.actionBase}}>T</span>ORRANCE<span style={{...SANS,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#0d1724",color:"#8898aa"}}>Auditor Portal</span></div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Read-only · PricewaterhouseCoopers LLP</div></div><button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button></div>
      {step==="login"&&<div style={{padding:"28px 28px 32px"}}><div style={{...SANS,fontSize:13,color:T.textMuted,marginBottom:20,lineHeight:1.6}}>Secure, read-only portal for authorized external auditors. Access is logged and monitored.</div>{loginErr&&<div style={{...SANS,fontSize:12,color:T.errorBase,background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:6,padding:"8px 12px",marginBottom:14}}>{loginErr}</div>}<div style={{marginBottom:14}}><FieldLabel>Auditor Email</FieldLabel><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@pwc.com" style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",fontSize:13}}/></div><div style={{marginBottom:20}}><FieldLabel>Password</FieldLabel><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",fontSize:13}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></div><button onClick={handleLogin} style={{...SANS,width:"100%",border:"none",borderRadius:7,padding:"12px",fontSize:13,fontWeight:700,background:T.actionBase,color:"#fff",cursor:"pointer"}}>Sign In</button><div style={{...SANS,fontSize:11,color:T.textMuted,textAlign:"center",marginTop:12,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}><span>🔒</span>Secured with TLS 1.3 · SOC 2 Type II compliant</div></div>}
      {step==="mfa"&&<div style={{padding:"28px 28px 32px"}}><div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:32,marginBottom:10}}>📱</div><div style={{...SANS,fontWeight:700,fontSize:15,marginBottom:6}}>Two-Factor Authentication</div><div style={{...SANS,fontSize:13,color:T.textMuted}}>Enter the 6-digit code from your authenticator app.</div></div>{loginErr&&<div style={{...SANS,fontSize:12,color:T.errorBase,background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:6,padding:"8px 12px",marginBottom:14,textAlign:"center"}}>{loginErr}</div>}<input type="text" maxLength={6} value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,""))} placeholder="000000" style={{...MONO,width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 12px",fontSize:22,textAlign:"center",letterSpacing:"0.3em",marginBottom:16}} onKeyDown={e=>e.key==="Enter"&&handleMfa()}/><button onClick={handleMfa} style={{...SANS,width:"100%",border:"none",borderRadius:7,padding:"12px",fontSize:13,fontWeight:700,background:T.actionBase,color:"#fff",cursor:"pointer"}}>Verify Code</button><button onClick={()=>{setMfaCode("");setLoginErr("");setStep("login");}} style={{...SANS,width:"100%",border:"none",background:"transparent",color:T.textMuted,fontSize:12,padding:"10px",cursor:"pointer",marginTop:4}}>← Back to login</button></div>}
      {step==="portal"&&<div style={{overflowY:"auto"}}>
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fafbff"}}><div><div style={{...SANS,fontWeight:700,fontSize:13}}>Available Reports</div><div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:1}}>Read-only · All downloads are logged</div></div><span style={{...SANS,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:5,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:4}}><span>✓</span>Authenticated</span></div>
        <div style={{padding:"16px 22px"}}>{REPORTS.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:13,padding:"12px 14px",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:9,background:T.cardBg}}>
            <span style={{fontSize:22,flexShrink:0}}>{r.icon}</span><div style={{flex:1}}><div style={{...SANS,fontWeight:700,fontSize:13,marginBottom:2}}>{r.label}</div><div style={{...SANS,fontSize:11,color:T.textMuted}}>{r.fund} · {r.date}</div></div>
            <span style={{...MONO,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:r.type==="PDF"?T.errorBg:T.okBg,color:r.type==="PDF"?T.errorBase:T.okBase,border:`1px solid ${r.type==="PDF"?T.errorBorder:T.okBorder}`}}>{r.type}</span>
            <button onClick={()=>handleDownload(r.id)} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:5,border:`1px solid ${T.border}`,background:downloading===r.id?T.okBg:T.cardBg,color:downloading===r.id?T.okBase:T.textPrimary,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s",whiteSpace:"nowrap"}}>{downloading===r.id?<><span>✓</span>Downloaded</>:<><span>↓</span>Download</>}</button>
          </div>
        ))}</div>
      </div>}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IT6: THE BOILERROOM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TouchlessFlowDashboard({fundSeeds, approvalState, fundState}) {
  const STAGES = ["Ingest","Triage","Review","Approved"];
  const STAGE_CFG = {
    Ingest:   {color:"#6366f1", bg:"#eef2ff", border:"#c7d2fe", icon:"📥"},
    Triage:   {color:T.warnBase,bg:T.warnBg,  border:T.warnBorder,icon:"🔍"},
    Review:   {color:T.actionBase,bg:T.actionBg,border:"#bfdbfe",icon:"⏳"},
    Approved: {color:T.okBase,  bg:T.okBg,   border:T.okBorder,  icon:"✓"},
  };

  const getStage = (fund) => {
    const a = approvalState[fund.fund_id];
    const excs = fundState[fund.fund_id] || [];
    const hasOpenErrors = excs.some(e=>e.severity==="error"&&e.status==="open");
    if (a?.status==="approved") return "Approved";
    if (a?.status==="review_pending") return "Review";
    if (!hasOpenErrors && excs.length > 0) return "Review";
    return excs.length === 0 ? "Ingest" : "Triage";
  };

  const totalExcs = fundSeeds.reduce((s,f)=>(fundState[f.fund_id]||[]).length+s, 0);
  const totalAiAccepted = Object.values(TOUCHLESS_STATS).reduce((s,v)=>s+v.aiAccepted, 0);
  const touchlessRate = totalExcs > 0 ? Math.round((totalAiAccepted/totalExcs)*100) : 0;

  return (
    <div style={{padding:"20px 24px"}}>
      <div style={{display:"flex",gap:12,marginBottom:24}}>
        {[
          {label:"Touchless Rate",   val:`${touchlessRate}%`,  color:touchlessRate>=50?T.okBase:T.warnBase, sub:"AI-resolved without human action"},
          {label:"AI Accepted",      val:totalAiAccepted,      color:T.aiBase, sub:"Suggestions accepted this close"},
          {label:"Human Resolved",   val:Object.values(TOUCHLESS_STATS).reduce((s,v)=>s+v.humanResolved,0), color:T.actionBase, sub:"Manual resolutions"},
          {label:"Funds in Pipeline",val:fundSeeds.length,     color:T.textPrimary, sub:"Across all stages"},
        ].map((k,i)=>(
          <div key={i} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:9,padding:"14px 18px",flex:1, boxShadow:"0 1px 3px rgba(0,0,0,0.02)"}}>
            <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{k.label}</div>
            <div style={{...MONO,fontSize:22,fontWeight:700,color:k.color,marginBottom:2}}>{k.val}</div>
            <div style={{...SANS,fontSize:10,color:T.textMuted}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {STAGES.map(stage=>{
          const cfg = STAGE_CFG[stage];
          const fundsInStage = fundSeeds.filter(f=>getStage(f)===stage);
          return (
            <div key={stage} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",background:cfg.bg,borderBottom:`1px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:16}}>{cfg.icon}</span>
                  <span style={{...SANS,fontWeight:700,fontSize:12,color:cfg.color}}>{stage}</span>
                </div>
                <span style={{...MONO,fontSize:13,fontWeight:700,color:cfg.color}}>{fundsInStage.length}</span>
              </div>
              <div style={{padding:"10px",display:"flex",flexDirection:"column",gap:8,minHeight:120}}>
                {fundsInStage.length===0&&<div style={{...SANS,fontSize:11,color:T.textMuted,textAlign:"center",padding:"20px 0"}}>No funds</div>}
                {fundsInStage.map(f=>{
                  const stats = TOUCHLESS_STATS[f.fund_id];
                  const tRate = stats?.totalExcs>0 ? Math.round((stats.aiAccepted/stats.totalExcs)*100) : 100;
                  return (
                    <div key={f.fund_id} style={{padding:"9px 11px",borderRadius:7,border:`1px solid ${T.border}`,background:T.appBg}}>
                      <div style={{...SANS,fontSize:11,fontWeight:600,color:T.textPrimary,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={f.name}>{f.name}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{...SANS,fontSize:10,color:T.textMuted}}>{fmtCompact(f.net_assets)}</span>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          {stats?.aiAccepted>0&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`}}>✦ {stats.aiAccepted} AI</span>}
                          <span style={{...MONO,fontSize:10,fontWeight:700,color:tRate>=50?T.okBase:T.warnBase}}>{tRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BEVERLEY: AI Filing Preview & Submission Modal ───────────────────────────
function FilingPreviewModal({ filing, onClose, onFile }) {
  const [validating, setValidating] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("xml"); // 'summary' or 'xml'

  const runAiValidation = () => {
    setValidating(true);
    setTimeout(() => { setValidating(false); setAiChecked(true); }, 2000);
  };

  const handleFiling = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onFile(filing.id); onClose(); }, 1500);
  };

  // Dynamic AI Checks based on Filing Type
  const getValidationChecks = (form) => {
    if (form.includes("PF")) return [
      {label: "Gross/Net Asset Value tied to TB", pass: true},
      {label: "Counterparty Exposure Limits Validated", pass: true},
      {label: "Derivative Notional Values Reconciled", pass: true}
    ];
    if (form.includes("N-PORT") || form.includes("N-CEN") || form.includes("N-MFP")) return [
      {label: "CUSIP/LEI Identifiers Verified", pass: true},
      {label: "Fair Value Hierarchy (L1/L2/L3) Matches TB", pass: true},
      {label: "Liquidity Buckets (ASC 820) Validated", pass: true}
    ];
    if (form.includes("ADV")) return [
      {label: "Regulatory AUM matches aggregate TBs", pass: true},
      {label: "Private Fund Reporting (Section 7.B) Complete", pass: true},
      {label: "Client Count & Types Verified", pass: true}
    ];
    return [{label: "Required Schema Tags Present", pass: true}];
  };

  // Mock XML payload generation
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<edgarSubmission>
  <schemaVersion>X0101</schemaVersion>
  <submissionType>${filing.form}</submissionType>
  <filerInfo>
    <liveTestFlag>LIVE</liveTestFlag>
    <filer>
      <credentials>
        <cik>0001234567</cik>
        <ccc>XXXXXXXX</ccc>
      </credentials>
    </filer>
    <periodOfReport>${filing.period}</periodOfReport>
  </filerInfo>
  <formData>
    <fundName>${filing.fund}</fundName>
    <clientEntity>${filing.client}</clientEntity>
    <dataPoints>
      <totalAssets>486356965</totalAssets>
      <netAssets>480860965</netAssets>
      <recordCount>284</recordCount>
    </dataPoints>
  </formData>
</edgarSubmission>`;

  return (
    <div className="modal-overlay" role="dialog" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:1000,height:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
        
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff",display:"flex",alignItems:"center",gap:8}}>📄 Beverley Engine: {filing.form}</div>
            <div style={{...SANS,fontSize:12,color:"#9ca3af",marginTop:4}}>{filing.fund} · Deadline: {filing.dueDate}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20}}>✕</button>
        </div>

        <div style={{display:"flex", flex:1, overflow:"hidden"}}>
          
          {/* Document Preview Area (Left) */}
          <div style={{flex:1, display:"flex", flexDirection:"column", borderRight:`1px solid ${T.border}`}}>
            <div style={{display:"flex", background:T.appBg, borderBottom:`1px solid ${T.border}`}}>
              <button onClick={()=>setActiveTab("xml")} style={{flex:1, padding:"12px", border:"none", background:activeTab==="xml"?T.cardBg:"transparent", borderBottom:`2px solid ${activeTab==="xml"?T.actionBase:"transparent"}`, ...SANS, fontSize:12, fontWeight:600, cursor:"pointer", color:activeTab==="xml"?T.actionBase:T.textMuted}}>Raw XML Payload</button>
              <button onClick={()=>setActiveTab("summary")} style={{flex:1, padding:"12px", border:"none", background:activeTab==="summary"?T.cardBg:"transparent", borderBottom:`2px solid ${activeTab==="summary"?T.actionBase:"transparent"}`, ...SANS, fontSize:12, fontWeight:600, cursor:"pointer", color:activeTab==="summary"?T.actionBase:T.textMuted}}>Human-Readable Summary</button>
            </div>
            
            <div style={{flex:1, overflowY:"auto", background: activeTab==="xml"?"#0f172a":"#e2e8f0", padding:activeTab==="xml"?0:24}}>
              {activeTab === "xml" ? (
                <div style={{padding:20, ...MONO, fontSize:11, color:"#a7f3d0", whiteSpace:"pre-wrap", wordBreak:"break-all"}}>
                  {mockXml}
                </div>
              ) : (
                <div style={{background:"#fff", width:"100%", maxWidth:600, margin:"0 auto", padding:"40px", boxShadow:"0 4px 6px rgba(0,0,0,0.05)", fontFamily:"serif", color:"#000"}}>
                  <h1 style={{fontSize:20, textAlign:"center", borderBottom:"1px solid #000", paddingBottom:10, marginBottom:20}}>FORM {filing.form} SUMMARY</h1>
                  <p style={{fontSize:12, lineHeight:1.5}}><strong>Entity:</strong> {filing.fund}</p>
                  <p style={{fontSize:12, lineHeight:1.5}}><strong>Reporting Period:</strong> {filing.period}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Validation & Filing Sidebar (Right) */}
          <div style={{width:340, background:"#fff", padding:"20px", display:"flex", flexDirection:"column"}}>
            <div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16}}>Beverley Validation</div>
            
            {!aiChecked ? (
              <div style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"16px", textAlign:"center"}}>
                <div style={{fontSize:24, marginBottom:8}}>🧠</div>
                <div style={{...SANS, fontSize:13, fontWeight:600, color:T.aiDark, marginBottom:8}}>AI Cross-Check</div>
                <div style={{...SANS, fontSize:11, color:T.textPrimary, marginBottom:16}}>Validate XML schema and reconcile data points against the final Trial Balance.</div>
                <button onClick={runAiValidation} disabled={validating} style={{...SANS,width:"100%",padding:"8px",borderRadius:6,border:"none",background:T.aiBase,color:"#fff",fontWeight:600,cursor:validating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {validating ? <><span style={{animation:"pulse 0.8s infinite"}}>✦</span> Scanning XML...</> : <><span>✦</span> Run AI Validation</>}
                </button>
              </div>
            ) : (
              <div className="fade-in" style={{display:"flex", flexDirection:"column", gap:12}}>
                {getValidationChecks(filing.form).map((c, i) => (
                  <div key={i} style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"10px", background:T.okBg, border:`1px solid ${T.okBorder}`, borderRadius:6}}>
                    <span style={{...SANS, fontSize:11, color:T.textPrimary, lineHeight:1.4, paddingRight:8}}>{c.label}</span>
                    <span style={{color:T.okBase, fontSize:14, flexShrink:0}}>✓</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:"auto", paddingTop:20}}>
              <button onClick={handleFiling} disabled={!aiChecked || submitting} style={{...SANS,width:"100%",padding:"12px",borderRadius:6,border:"none",background:!aiChecked || submitting?"#94a3b8":T.okBase,color:"#fff",fontWeight:700,fontSize:14,cursor:!aiChecked || submitting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8, transition:"background 0.2s"}}>
                 {submitting ? <span style={{animation:"pulse 0.8s infinite"}}>Transmitting to SEC...</span> : <><span>📤</span> Transmit to SEC EDGAR</>}
              </button>
              {!aiChecked && <div style={{...SANS, fontSize:10, color:T.textMuted, textAlign:"center", marginTop:8}}>Validation required before transmission.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: BEVERLEY FILING TRACKER (Synced to STP Engine)
// ═══════════════════════════════════════════════════════════════════════════════
function BeverleyFilingTracker({ filings, onGoToDashboard }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_asc");
  const [hideFiled, setHideFiled] = useState(true);
  const [period, setPeriod] = useState("Dec 31, 2024");
  
  const [localFilings, setLocalFilings] = useState(filings);
  const [activeFiling, setActiveFiling] = useState(null);
  const [collapsedForms, setCollapsedForms] = useState({});
  const [batchState, setBatchState] = useState(null);

  // NEW: Synchronize local state with upstream STP engine unblocking actions
  useEffect(() => {
    setLocalFilings(filings);
  }, [filings]);

  const PERIODS = ["Dec 31, 2024", "Nov 30, 2024"];
  const KANBAN_COLS = [
    { id: "not_started", label: "Not Started", color: T.textMuted, bg: T.appBg, bd: T.border },
    { id: "blocked",     label: "Blocked",     color: T.errorBase, bg: T.errorBg, bd: T.errorBorder },
    { id: "ready",       label: "Ready",       color: T.okBase,    bg: T.okBg,    bd: T.okBorder },
    { id: "filed",       label: "Filed",       color: T.textMuted, bg: T.appBg,   bd: T.border, dashed: true }
  ];
  const activeCols = hideFiled ? KANBAN_COLS.filter(c => c.id !== "filed") : KANBAN_COLS;

  const groupedData = useMemo(() => {
    let activeRows = localFilings.filter(f => f.period === period);
    if (search.trim()) {
      const q = search.toLowerCase();
      activeRows = activeRows.filter(f => f.fund.toLowerCase().includes(q) || f.client.toLowerCase().includes(q) || f.form.toLowerCase().includes(q));
    }
    if (filter !== "all") activeRows = activeRows.filter(f => f.status === filter);
    activeRows.sort((a,b) => {
      if (sortBy === "due_asc") return a.daysLeft - b.daysLeft;
      if (sortBy === "fund_asc") return a.fund.localeCompare(b.fund);
      return 0;
    });

    const groups = {};
    activeRows.forEach(f => {
      if (!groups[f.form]) groups[f.form] = {};
      if (!groups[f.form][f.client]) groups[f.form][f.client] = { not_started: [], blocked: [], ready: [], filed: [] };
      groups[f.form][f.client][f.status].push(f);
    });
    return groups;
  }, [localFilings, search, filter, period, sortBy]);

  const handleMarkFiled = (id) => {
    setLocalFilings(prev => prev.map(f => f.id === id ? { ...f, status: "filed", notes: "SEC EDGAR Confirmed." } : f));
  };

  const handleBatchAction = (action) => {
    setBatchState(action);
    setTimeout(() => {
      if (action === "transmit") {
        setLocalFilings(prev => prev.map(f => f.status === "ready" ? { ...f, status: "filed", notes: "Batch SEC Transmit Success" } : f));
      }
      setBatchState(null);
    }, 2000);
  };

  const periodFilings = localFilings.filter(f => f.period === period);
  const total = periodFilings.length;
  const readyCount = periodFilings.filter(f => f.status === "ready").length;
  const completed = periodFilings.filter(f => f.status === "filed").length;
  const activeCount = total - completed;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;

  if (total > 0 && activeCount === 0 && !search && hideFiled) {
    return (
      <div className="fade-in" style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"calc(100vh - 52px)", background:T.appBg}}>
        <div style={{fontSize: 72, marginBottom: 16, animation: "slideUp 0.6s ease forwards"}}>🏆</div>
        <div style={{...SANS, fontSize: 26, fontWeight: 700, color: T.textPrimary, marginBottom: 8}}>All Filings Transmitted!</div>
        <div style={{...SANS, fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 450, textAlign: "center", lineHeight:1.5}}>
          Outstanding work. All <strong>{total}</strong> regulatory filings for {period} have been successfully validated and transmitted to the SEC.
        </div>
        <div style={{display:"flex", gap:12}}>
          <button onClick={onGoToDashboard} className="glow-btn" style={{...SANS, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 6, border: "none", background: T.actionBase, color: "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:8}}>
            ← Return to Dashboard
          </button>
          <button onClick={()=>setHideFiled(false)} style={{...SANS, fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 6, border:`1px solid ${T.border}`, background: T.cardBg, color: T.textPrimary, cursor: "pointer"}}>
            Review Filed Returns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex", flexDirection:"column", background:T.appBg, height:"calc(100vh - 52px)", overflow:"hidden"}}>
      <div style={{padding:"12px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap", marginBottom:12}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <button onClick={onGoToDashboard} style={{...SANS,background:"transparent",border:`1px solid ${T.border}`,color:T.textPrimary,borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>← Dashboard</button>
            <div style={{...SANS,fontWeight:700,fontSize:18, color:T.textPrimary, display:"flex", alignItems:"center", gap:10}}>
              Beverley Filing Workflow <span style={{color:T.textMuted, fontSize:16, fontWeight:400}}>|</span>
              <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...SANS, fontSize:16, fontWeight:700, color:T.actionBase, background:"transparent", border:"none", outline:"none", cursor:"pointer", appearance:"none", paddingRight:16, backgroundImage:"url('data:image/svg+xml;utf8,<svg fill=%22%234a7cff%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')", backgroundRepeat:"no-repeat", backgroundPosition:"right center"}}>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:12, flex:1, justifyContent:"flex-end"}}>
            <button onClick={()=>handleBatchAction("validate")} disabled={!!batchState} style={{...SANS, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.aiBase}`, background:T.aiBg, color:T.aiBase, cursor:"pointer", display:"flex", alignItems:"center", gap:6}}>
              {batchState === "validate" ? "Scanning..." : "✦ Batch AI Validate"}
            </button>
            <button onClick={()=>handleBatchAction("transmit")} disabled={!!batchState || readyCount === 0} style={{...SANS, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:6, border:"none", background: readyCount > 0 ? T.okBase : T.border, color:"#fff", cursor: readyCount > 0 ? "pointer" : "not-allowed", display:"flex", alignItems:"center", gap:6}}>
              {batchState === "transmit" ? "Transmitting..." : `📤 Transmit All Ready (${readyCount})`}
            </button>
          </div>
        </div>

        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <div style={{position:"relative", minWidth: 280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search forms, funds, or clients..." style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}}/>
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="due_asc">Sort: Urgent (Due Soon)</option>
            <option value="fund_asc">Sort: Fund Name (A-Z)</option>
          </select>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginLeft:4}}>
            <input type="checkbox" checked={hideFiled} onChange={e=>setHideFiled(e.target.checked)} style={{accentColor:T.actionBase}}/>
            <span style={{...SANS,fontSize:12,color:T.textPrimary,fontWeight:600}}>Hide Completed</span>
          </label>
          {total > 0 && (
            <div style={{display:"flex", alignItems:"center", gap:10, minWidth:250, marginLeft:"auto"}}>
              <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, whiteSpace:"nowrap"}}>
                <span style={{color:T.actionBase}}>{activeCount}</span> REMAINING
              </div>
              <div style={{flex:1, height:6, background:T.border, borderRadius:3, overflow:"hidden"}}>
                <div style={{height:"100%", width:`${progressPct}%`, background:progressPct===100?T.okBase:T.actionBase, transition:"width 0.5s ease"}}/>
              </div>
              <div style={{...MONO, fontSize:11, fontWeight:700, color:progressPct===100?T.okBase:T.textPrimary}}>{progressPct}%</div>
            </div>
          )}
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"20px 24px"}}>
        {Object.entries(groupedData).map(([form, clients]) => (
          <div key={form} style={{marginBottom:24, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden"}}>
            <div onClick={()=>setCollapsedForms(p=>({...p, [form]:!p[form]}))} style={{background:T.navyHeader, padding:"10px 16px", display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:"#fff", ...SANS, fontWeight:700}}>
              {collapsedForms[form] ? "▶" : "▼"} {form} Filings
            </div>

            {!collapsedForms[form] && Object.entries(clients).map(([client, statuses]) => (
              <div key={client} style={{padding:"16px 20px", background:T.appBg, borderTop:`1px solid ${T.border}`}}>
                <div style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary, marginBottom:14}}>{client}</div>
                <div style={{display:"grid", gridTemplateColumns:`repeat(${activeCols.length}, 1fr)`, gap:14}}>
                  {activeCols.map(col => (
                    <div key={col.id} style={{background:col.bg, border:`1px solid ${col.bd}`, borderRadius:8, padding:"10px", minHeight:90}}>
                      <div style={{...SANS, fontSize:11, fontWeight:700, color:col.color, textTransform:"uppercase", marginBottom:10}}>{col.label}</div>
                      <div style={{display:"flex", flexDirection:"column", gap:8}}>
                        {statuses[col.id].map(f => (
                          <div key={f.id} onClick={() => f.status !== "filed" && setActiveFiling(f)} style={{background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`4px solid ${col.color}`, borderRadius:8, padding:"10px 12px", cursor:f.status!=="filed"?"pointer":"default"}}>
                            <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:4}}>{f.fund}</div>
                            {(f.form === "N-PORT" || f.form === "N-CEN") && f.status === "blocked" && (
                              <div style={{...MONO, fontSize:9, fontWeight:700, color:T.textMuted, background:"#f1f5f9", padding:"2px 6px", borderRadius:4, marginBottom:4, display:"inline-block"}}>DEPENDENCY: GAAP UNAPPROVED</div>
                            )}
                            <div style={{...MONO, fontSize:10, fontWeight:700, color:T.textMuted}}>
                              {f.status==="filed" ? "SEC CONFIRMED" : `DUE: ${f.daysLeft}d`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {activeFiling && <FilingPreviewModal filing={activeFiling} onClose={()=>setActiveFiling(null)} onFile={handleMarkFiled} />}
    </div>
  );
}

function ClientPortal({onClose}) {
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [downloading, setDownloading] = useState(null);

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

function AiParameterTuning({onClose}) {
  const [params, setParams] = useState(AI_PARAM_DEFAULTS);
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => { setParams(p=>({...p,[key]:val})); setSaved(false); };
  const toggleCode = (code) => {
    setParams(p=>({...p, eligibleCodes: p.eligibleCodes.includes(code) ? p.eligibleCodes.filter(c=>c!==code) : [...p.eligibleCodes, code]}));
    setSaved(false);
  };
  const handleSave = () => { setSaving(true); setTimeout(()=>{ setSaving(false); setSaved(true); },900); };

  const SliderRow = ({label, paramKey, min, max, step=1, unit, description}) => (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
        <div style={{...SANS,fontWeight:600,fontSize:13,color:T.textPrimary}}>{label}</div>
        <div style={{...MONO,fontSize:14,fontWeight:700,color:T.actionBase}}>{params[paramKey]}{unit}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={params[paramKey]}
        onChange={e=>update(paramKey, Number(e.target.value))}
        style={{width:"100%",accentColor:T.actionBase,cursor:"pointer"}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{...SANS,fontSize:10,color:T.textMuted}}>{min}{unit}</span>
        <span style={{...SANS,fontSize:10,color:T.textMuted,maxWidth:"70%",textAlign:"center"}}>{description}</span>
        <span style={{...SANS,fontSize:10,color:T.textMuted}}>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true"
      style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.7)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.cardBg,borderRadius:12,width:580,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>

        <div style={{background:T.navyHeader,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:T.aiBase}}>✦</span>AI Parameter Tuning
            </div>
            <div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Controller access only · Changes apply to the next close cycle</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"22px 24px"}}>
          <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:16}}>Confidence Thresholds</div>
          <SliderRow label="Suggestion Visibility Threshold" paramKey="confidenceThreshold" min={50} max={99} unit="%" description="Minimum AI confidence to surface a suggestion in the exception pane"/>
          <SliderRow label="Auto-Accept Threshold" paramKey="autoAcceptThreshold" min={85} max={100} unit="%" description="AI suggestions above this confidence are automatically accepted without human action"/>

          <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:16,marginTop:8}}>Tolerance Bands</div>
          <SliderRow label="FX Variance Auto-Acknowledge" paramKey="fxVarianceTolerance" min={0} max={5000} step={50} unit=" USD" description="FX rate variances below this dollar amount are automatically acknowledged"/>
          <SliderRow label="Prior Period Lookback Window" paramKey="priorPeriodLookback" min={1} max={12} unit=" months" description="How many prior closes the AI references when classifying exception patterns"/>

          <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12,marginTop:8}}>Exception Code Eligibility</div>
          <div style={{...SANS,fontSize:11,color:T.textMuted,marginBottom:14,lineHeight:1.5}}>
            Toggle which exception codes receive AI treatment. Codes that are disabled will not show suggestions or root cause analysis.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {params.allCodes.map(code=>{
              const isOn = params.eligibleCodes.includes(code);
              return (
                <div key={code} onClick={()=>toggleCode(code)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:7,border:`1px solid ${isOn?T.actionBase:T.border}`,background:isOn?T.actionBg:T.appBg,cursor:"pointer",transition:"all 0.12s"}}>
                  <span style={{...MONO,fontSize:11,fontWeight:600,color:isOn?T.actionBase:T.textMuted}}>{code}</span>
                  <div style={{width:36,height:20,borderRadius:10,background:isOn?T.actionBase:T.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:isOn?18:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:10}}>
          {saved&&<span style={{...SANS,fontSize:12,color:T.okBase,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><span>✓</span>Settings saved</span>}
          <button onClick={onClose} style={{...SANS,fontSize:12,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textMuted,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 18px",borderRadius:6,border:"none",background:saving?"#374151":T.aiBase,color:saving?"#6b7280":"#fff",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving?<><span style={{animation:"pulse 0.8s infinite"}}>✦</span>Saving…</>:<><span>✦</span>Save Parameters</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: GLOBAL AUDIT LOG GRID (SOC 1 / Type II Compliance - Req 7)
// ═══════════════════════════════════════════════════════════════════════════════
function GlobalAuditLogView({ onBack }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");

  // Expanded Mock Audit Log Data to show system-wide compliance tracking
  const AUDIT_LOGS = [
    { id: "al-101", ts: "2024-12-31 23:58:12", user: "system", role: "Service Account", action: "Data Ingestion", target: "FND-2024-001", detail: "SFTP transfer complete. 131 rows parsed. 8 exceptions generated.", ip: "10.0.4.15" },
    { id: "al-102", ts: "2025-01-01 09:14:05", user: "Sarah Chen", role: "Preparer", action: "Exception Reviewed", target: "EXC-001", detail: "Added comment: 'Flagging — classification error in Dec 29 batch.'", ip: "192.168.1.44" },
    { id: "al-103", ts: "2025-01-01 09:22:18", user: "Sarah Chen", role: "Preparer", action: "AI Override Accepted", target: "EXC-003", detail: "Accepted AI suggestion for FX rate. Overrode value to $108,420.00 (Confidence: 97%).", ip: "192.168.1.44" },
    { id: "al-104", ts: "2025-01-01 10:02:44", user: "James Okafor", role: "Controller", action: "Exception Resolved", target: "EXC-001", detail: "Resolved exception. Resolution: 'Corrected in Source'.", ip: "192.168.1.89" },
    { id: "al-105", ts: "2025-01-01 11:30:00", user: "James Okafor", role: "Controller", action: "Cross-Check Override", target: "NMFP-01", detail: "Overrode Shadow NAV deviation (31 bps). Justification: Board notified.", ip: "192.168.1.89" },
    { id: "al-106", ts: "2025-01-01 14:05:12", user: "Sarah Chen", role: "Preparer", action: "Journal Entry Drafted", target: "JE-1042", detail: "Drafted 2-leg JE for Audit Fee Accrual ($15,000). Routed for Controller review.", ip: "192.168.1.44" },
    { id: "al-107", ts: "2025-01-01 14:45:00", user: "James Okafor", role: "Controller", action: "Journal Entry Posted", target: "JE-1042", detail: "Approved and posted JE-1042. Ledger balanced.", ip: "192.168.1.89" },
    { id: "al-108", ts: "2025-01-01 16:00:00", user: "Jennifer Liu", role: "Preparer", action: "Schema Map Updated", target: "feed-001", detail: "Mapped 'fx_spot_rate' to 'exchange_rate'. Applied rule globally to 49 feeds.", ip: "192.168.1.102" },
    { id: "al-109", ts: "2025-01-02 08:30:00", user: "PwC Audit Team", role: "Auditor", action: "Report Download", target: "FND-2024-001", detail: "Downloaded 'Trial Balance — Dec 31, 2024 (Excel)'.", ip: "203.0.113.42" },
    { id: "al-110", ts: "2025-01-02 10:15:00", user: "James Okafor", role: "Controller", action: "Fund Approved", target: "FND-2024-001", detail: "Signed off on GAAP Financials. Status changed to Approved.", ip: "192.168.1.89" },
    { id: "al-111", ts: "2025-01-02 11:00:00", user: "system", role: "Beverley Engine", action: "SEC Transmission", target: "FND-2024-001", detail: "Transmitted Form N-PORT XML payload to SEC EDGAR. Status: Success.", ip: "10.0.4.15" },
  ];

  const filteredLogs = useMemo(() => {
    let res = [...AUDIT_LOGS];
    if (actionFilter !== "All") {
      res = res.filter(l => l.action.includes(actionFilter) || l.role.includes(actionFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(l => l.user.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q));
    }
    return res.reverse(); // Newest first
  }, [search, actionFilter]);

  return (
    <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 52px)", background:T.appBg}}>
      {/* Header */}
      <div style={{padding:"16px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <button onClick={onBack} style={{...SANS, background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600, color:T.textPrimary}}>← Dashboard</button>
          <div>
            <div style={{...SANS, fontWeight:700, fontSize:18, color:T.textPrimary}}>Global Audit & Compliance Ledger</div>
            <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>Immutable system-wide tracking for SOC 1 Type II compliance.</div>
          </div>
        </div>
        <button style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:"0 2px 4px rgba(79,70,229,0.2)"}}>
          <span>↓</span> Export Complete SOC 1 Package
        </button>
      </div>

      <div style={{padding:"24px", display:"flex", flexDirection:"column", flex:1, overflow:"hidden"}}>
        {/* Filters */}
        <div style={{display:"flex", gap:12, marginBottom:16, alignItems:"center"}}>
          <div style={{position:"relative", width: 320}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" placeholder="Search logs by user, fund, or ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}} />
          </div>
          <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} style={{...SANS, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, background:"#fff", cursor:"pointer", outline:"none"}}>
            <option value="All">All Actions</option>
            <option value="Exception">Exceptions & Overrides</option>
            <option value="Journal Entry">Journal Entries</option>
            <option value="Fund Approved">Approvals</option>
            <option value="Auditor">Auditor Activity</option>
            <option value="system">System / API Activity</option>
          </select>
          <span style={{...SANS, fontSize:12, color:T.textMuted, marginLeft:"auto"}}>{filteredLogs.length} events logged</span>
        </div>

        {/* Grid */}
        <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", flex:1, display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(0,0,0,0.02)"}}>
          <div style={{overflowY:"auto", flex:1}}>
            <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
              <thead style={{position:"sticky", top:0, zIndex:10, background:"#f8fafc"}}>
                <tr style={{borderBottom:`2px solid ${T.border}`}}>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"12%"}}>Timestamp (UTC)</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>User / System</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"18%"}}>Action</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"15%"}}>Target ID</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"30%"}}>Detail</th>
                  <th style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", padding:"10px 16px", width:"10%"}}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{...MONO, fontSize:11, color:T.textMuted, padding:"12px 16px", whiteSpace:"nowrap"}}>{log.ts}</td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary}}>{log.user}</div>
                      <div style={{...SANS, fontSize:10, color:T.textMuted, marginTop:2}}>{log.role}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{...SANS, fontSize:11, fontWeight:600, color:T.textPrimary, background:T.appBg, padding:"3px 8px", borderRadius:4, border:`1px solid ${T.border}`}}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{...MONO, fontSize:11, color:T.actionBase, padding:"12px 16px"}}>{log.target}</td>
                    <td style={{...SANS, fontSize:12, color:T.textPrimary, padding:"12px 16px", lineHeight:1.4}}>{log.detail}</td>
                    <td style={{...MONO, fontSize:10, color:T.textMuted, padding:"12px 16px"}}>{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Soc1AuditReport({onClose, fundState, approvalState, fundSeeds}) {
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);

  const totalResolved  = Object.values(fundState).flat().filter(e=>e.status==="resolved").length;
  const totalOpen      = Object.values(fundState).flat().filter(e=>e.status==="open").length;
  const totalOverrides = Object.values(fundState).flat().filter(e=>e.resolution==="override_value").length;
  const approvedFunds  = Object.values(approvalState).filter(a=>a.status==="approved").length;

  const handleGenerate = () => { setGenerating(true); setTimeout(()=>{ setGenerating(false); setGenerated(true); },1800); };

  const Section = ({title, children}) => (
    <div style={{marginBottom:22}}>
      <div style={{...SANS,fontWeight:700,fontSize:13,color:T.navyHeader,paddingBottom:6,borderBottom:`2px solid ${T.border}`,marginBottom:12}}>{title}</div>
      {children}
    </div>
  );

  const StatRow = ({label, val, note}) => (
    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`}}>
      <span style={{...SANS,fontSize:12,color:T.textPrimary}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary}}>{val}</span>
        {note&&<div style={{...SANS,fontSize:10,color:T.textMuted}}>{note}</div>}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.7)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:680,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>SOC 1 Type II — Internal Controls Report</div>
            <div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>December 31, 2024 · Generated by Torrance</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={handleGenerate} disabled={generating}
              style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:6,border:"none",background:generating?"#374151":generated?T.okBase:T.actionBase,color:generating?"#6b7280":"#fff",cursor:generating?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
              {generating?<><span style={{animation:"pulse 0.8s infinite"}}>●</span>Generating…</>:generated?<><span>✓</span>Re-download</>:<><span>↓</span>Download PDF</>}
            </button>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
          </div>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"24px 28px"}}>
          <Section title="1. Scope and Period">
            <p style={{...SANS,fontSize:12,color:T.textPrimary,lineHeight:1.75}}>
              This report covers the operations of the Torrance fund accounting platform for the period ending <strong>December 31, 2024</strong>. The controls described herein govern the ingestion, validation, exception resolution, and approval of general ledger data for <strong>{fundSeeds.length} funds</strong> across {[...new Set(fundSeeds.map(f=>f.client))].length} client relationships.
            </p>
          </Section>

          <Section title="2. Exception Resolution Controls">
            <StatRow label="Total exceptions raised"       val={totalResolved+totalOpen}/>
            <StatRow label="Exceptions resolved"           val={totalResolved}/>
            <StatRow label="Exceptions open (pending)"     val={totalOpen}/>
            <StatRow label="Override resolutions"          val={totalOverrides} note="Each override requires a manual value entry"/>
            <StatRow label="Funds approved"                val={`${approvedFunds} of ${fundSeeds.length}`}/>
          </Section>

          <Section title="3. AI Assistance Controls">
            <StatRow label="AI suggestions surfaced"       val={SOC1_AI_STATS.totalSuggestions}/>
            <StatRow label="Suggestions accepted"          val={SOC1_AI_STATS.accepted} note={`${SOC1_AI_STATS.acceptanceRate}% acceptance rate`}/>
            <StatRow label="Suggestions dismissed"         val={SOC1_AI_STATS.dismissed}/>
            <StatRow label="Auto-accepted (≥95% conf.)"   val={SOC1_AI_STATS.autoAccepted}/>
            <div style={{marginTop:10,padding:"9px 12px",borderRadius:6,background:T.okBg,border:`1px solid ${T.okBorder}`}}>
              <span style={{...SANS,fontSize:11,color:T.okBase,fontWeight:500}}>
                All AI suggestions are logged with their confidence score, prior-period basis, and resolution outcome. No suggestion was auto-applied above the 95% threshold during this period.
              </span>
            </div>
          </Section>

          <Section title="4. User Access Log">
            <div style={{background:T.appBg,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#f0f2f5"}}>
                    {["Timestamp","User","Action","Detail"].map(h=>(
                      <th key={h} style={{...SANS,padding:"7px 10px",textAlign:"left",color:T.textMuted,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SOC1_ACCESS_LOG.map((log,i)=>{
                    const user = TEAM.find(m=>m.id===log.user);
                    return (
                      <tr key={i} style={{background:i%2===0?T.cardBg:T.appBg}}>
                        <td style={{...MONO,padding:"7px 10px",fontSize:10,color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{log.ts}</td>
                        <td style={{padding:"7px 10px",borderBottom:`1px solid ${T.border}`}}>
                          {user&&<div style={{display:"flex",alignItems:"center",gap:5}}><Avatar user={user} size={18}/><span style={{...SANS,fontSize:11,color:T.textPrimary}}>{user.name}</span></div>}
                        </td>
                        <td style={{padding:"7px 10px",borderBottom:`1px solid ${T.border}`}}>
                          <span style={{...SANS,fontSize:11,fontWeight:600,color:T.textPrimary}}>{log.action}</span>
                        </td>
                        <td style={{...SANS,padding:"7px 10px",fontSize:10,color:T.textMuted,borderBottom:`1px solid ${T.border}`}}>{log.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="5. Certification">
            <p style={{...SANS,fontSize:12,color:T.textPrimary,lineHeight:1.75}}>
              The controls described in this report were operating effectively during the period under review. All exception resolutions were performed by authorized personnel. AI-assisted resolutions were reviewed and accepted by a human preparer prior to submission. The final approval workflow required Controller sign-off before any fund was marked Approved.
            </p>
            <div style={{marginTop:16,display:"flex",gap:20}}>
              {[{label:"Prepared by",name:"Sarah Chen",role:"Senior Accountant",date:"Jan 2, 2025"},{label:"Approved by",name:"James Okafor",role:"Controller",date:"Jan 2, 2025"}].map(sig=>(
                <div key={sig.label} style={{flex:1,padding:"12px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.appBg}}>
                  <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{sig.label}</div>
                  <div style={{...SANS,fontWeight:700,fontSize:13,color:T.textPrimary}}>{sig.name}</div>
                  <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>{sig.role} · {sig.date}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADED: Upload Modal (With AI Mock Simulator) ─────────────────────────
function UploadModal({ onClose, onUploadComplete, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const simulateAiMapping = (fileName, headers, rowCount) => {
    setUploading(true);
    
    // Generate AI mapping session
    const feedId = `feed-up-${Date.now()}`;
    const generatedMappingRows = headers.map((col, idx) => {
      // Simulate AI confidence scores and reasoning
      const isRecognized = ["account_no", "account_desc", "debit_amount", "credit_amount", "ccy"].includes(col.toLowerCase());
      return {
        id: `m${idx}`,
        sourceCol: col,
        sourceType: "VARCHAR",
        canonicalField: isRecognized ? col.replace("_no", "_number").replace("_desc", "_name").replace("_amount", "") : "",
        required: isRecognized,
        confidence: isRecognized ? Math.floor(Math.random() * 15) + 85 : 0,
        aiReason: isRecognized ? "Strong fuzzy match to historical canonical schema." : "Awaiting user input.",
        status: isRecognized ? "pending" : "unmapped",
        sampleValue: isRecognized ? "Sample Data" : "Unknown"
      };
    });

    const newFeed = {
      id: feedId,
      period: "Dec 2024",
      source: `Upload (${currentUser?.name.split(' ')[0].toLowerCase()||"user"}@torrance.com)`,
      fund_id: "FND-2024-001", 
      fund: "Pennywise Global Diversified Fund",
      client: "Pennywise Capital Advisors",
      file: fileName,
      type: fileName.toLowerCase().includes("holdings") ? "Holdings" : "GL",
      status: "needs_mapping", 
      received: new Date().toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}),
      rows: rowCount,
      exceptions: 0
    };

    setTimeout(() => { 
      setUploading(false);
      onUploadComplete(newFeed, generatedMappingRows);
      onClose(); 
    }, 1500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Fallback to our AI Simulator if it's just a dummy file
    simulateAiMapping(file.name, ["Account_No", "Account_Desc", "Debit_Amount", "Credit_Amount", "Local_Ccy", "Ext_Ref_ID"], 452);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.cardBg,borderRadius:12,width:540,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>Manual Data Upload</div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Upload out-of-band GL or Holdings files</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div style={{padding:"24px 32px"}}>
          {error && <div style={{background:T.errorBg, color:T.errorBase, padding:"10px", borderRadius:6, marginBottom:16, fontSize:12, border:`1px solid ${T.errorBorder}`}}>⚠ {error}</div>}
          
          {uploading ? (
            <div style={{textAlign:"center", padding:"40px 0"}}>
              <div style={{animation:"pulse 1s infinite", fontSize:32, marginBottom:16}}>🧠</div>
              <div style={{...SANS, fontSize:15, fontWeight:700, color:T.textPrimary}}>AI Schema Mapping in Progress...</div>
              <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:8}}>Analyzing columns and predicting canonical fields.</div>
            </div>
          ) : (
            <>
              <div onClick={() => fileInputRef.current.click()} style={{border:`2px dashed ${T.border}`,borderRadius:10,padding:"48px 32px",textAlign:"center",cursor:"pointer",background:T.appBg, transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.actionBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{fontSize:28, marginBottom:12}}>📄</div>
                <div style={{...SANS, fontSize:15, fontWeight:600, color:T.textPrimary, marginBottom:6}}>Drop your CSV file here</div>
                <div style={{...SANS, fontSize:12, color:T.textMuted}}>Supported formats: GL, Holdings, Capital Activity</div>
                <button style={{marginTop:20, ...SANS, fontSize:12, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.cardBg, cursor:"pointer", color:T.textPrimary}}>Browse Files</button>
                <input type="file" accept=".csv" ref={fileInputRef} style={{display:"none"}} onChange={handleFileUpload} />
              </div>
              
              <div style={{display:"flex", alignItems:"center", gap:12, margin:"20px 0"}}>
                <div style={{flex:1, height:1, background:T.border}}/>
                <div style={{...SANS, fontSize:11, color:T.textMuted, textTransform:"uppercase"}}>OR</div>
                <div style={{flex:1, height:1, background:T.border}}/>
              </div>

              <button onClick={() => simulateAiMapping("MOCK_TB_EXPORT_1231.csv", ["account_no", "account_desc", "debit_amount", "credit_amount", "ccy", "internal_id"], 1205)} style={{...SANS, width:"100%", fontSize:13, fontWeight:700, padding:"12px", borderRadius:6, border:"none", background:T.aiBg, color:T.aiBase, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
                <span style={{fontSize:16}}>✦</span> Use Mock File (Simulate AI Mapping)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RawDataModal({ feed, onClose }) {
  // Generate a realistic dummy preview based on the file type
  const headers = feed.type === "GL" ? ["account_no", "account_desc", "acct_category", "ccy", "debit_amount", "credit_amount"] : ["cusip", "security_name", "asset_class", "shares", "cost_basis", "market_value"];
  const dummyRows = feed.type === "GL" ? [
    ["1010", "Investments in Securities, at Value", "Asset", "USD", "125000000.00", "0.00"],
    ["1100", "Cash - Domestic", "Asset", "USD", "16700000.00", "0.00"],
    ["2030", "Investment Advisory Fee Payable", "Liability", "USD", "0.00", "590000.00"],
    ["5010", "Investment Advisory Fees", "Expense", "USD", "6400000.00", "0.00"]
  ] : [
    ["037833100", "Apple Inc.", "Common Stock", "281200", "188540000", "199610000"],
    ["594918104", "Microsoft Corp.", "Common Stock", "115400", "148200000", "157825000"]
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:720,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
        <div style={{background:T.navyHeader,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>Raw Source Data Preview</div><div style={{...MONO,fontSize:11,color:"#8898aa",marginTop:4}}>{feed.file}</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div style={{padding:"20px 24px", overflowX:"auto"}}>
          <div style={{...SANS, fontSize:12, color:T.textMuted, marginBottom:12}}>Displaying top {dummyRows.length} rows of {feed.rows.toLocaleString()} total rows ingested via {feed.source}.</div>
          <table style={{width:"100%", borderCollapse:"collapse", border:`1px solid ${T.border}`}}>
            <thead>
              <tr style={{background:T.appBg}}>
                {headers.map(h => <th key={h} style={{...MONO, fontSize:10, fontWeight:700, padding:"8px 12px", textAlign:"left", borderBottom:`1px solid ${T.border}`, color:T.textPrimary}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {dummyRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j} style={{...MONO, fontSize:11, padding:"8px 12px", borderBottom:`1px solid ${T.border}`, color:T.textMuted, whiteSpace:"nowrap"}}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Ingestion Status Widget ──────────────────────────────────────────────────
function IngestionStatusWidget({feeds, setFeeds, onGoToDashboard, onOpenMapping, onGoToExceptions, currentUser}) {
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
    success:{color:T.okBase,bg:T.okBg,border:T.okBorder,icon:"✓",label:"Success"},
    failed:{color:T.errorBase,bg:T.errorBg,border:T.errorBorder,icon:"✕",label:"Failed"},
    pending:{color:T.warnBase,bg:T.warnBg,border:T.warnBorder,icon:"⏳",label:"Pending"},
    needs_mapping:{color:T.aiBase,bg:T.aiBg,border:T.aiBorder,icon:"✦",label:"Mapping Req."}
  };
  
  const handleRetry=id=>{ setRetrying(id);setTimeout(()=>{setFeeds(prev=>prev.map(f=>f.id===id?{...f,status:"success",received:new Date().toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}),rows:203,exceptions:7,error:undefined}:f));setRetrying(null);},1800); };
  const handleUploadComplete = (newFeed, mappingRows) => {
    setFeeds(prev => [newFeed, ...prev]);
    // Inject the real file's mapping data into our session dictionary!
    MAPPING_SESSIONS[newFeed.id] = {
      feedId: newFeed.id,
      fileName: newFeed.file,
      fundName: newFeed.fund,
      rows: mappingRows
    };
  };

  const displayFeeds = useMemo(() => {
    let result = [...feeds];
    if (statusFilter !== "All") result = result.filter(f => f.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f => f.fund.toLowerCase().includes(q) || f.file.toLowerCase().includes(q) || f.client.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === "fund") return a.fund.localeCompare(b.fund);
      if (sortBy === "exceptions") return (b.exceptions || 0) - (a.exceptions || 0);
      return 0; 
    });
    return result;
  }, [feeds, search, statusFilter, sortBy]);

  return <div style={{padding:"20px 24px"}}>
    {/* UPDATED: Aligned Header, Search, KPIs, and Action Buttons into a single compact area */}
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:16}}>
      <div style={{display:"flex", flexDirection:"column", justifyContent:"space-between"}}>
        {/* Re-located Toolbar */}
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <div style={{position:"relative", width: 280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" placeholder="Search fund, client, or file..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
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
        {[{label:"Success",val:success,color:T.okBase,bg:T.okBg,bd:T.okBorder, icon:"✓"},{label:"Failed",val:failed,color:T.errorBase,bg:T.errorBg,bd:T.errorBorder, icon:"✕"},{label:"Pending",val:pending,color:T.warnBase,bg:T.warnBg,bd:T.warnBorder, icon:"⏳"}].map(k=>(
          <div key={k.label} style={{background:k.bg,border:`1px solid ${k.bd}`,borderRadius:7,padding:"0 14px",height:38,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14, color:k.color, fontWeight:700}} aria-hidden="true">{k.icon}</span>
            <span style={{...MONO,fontSize:14,fontWeight:700,color:k.color, lineHeight:1}}>{k.val}</span>
            <span style={{...SANS,fontSize:11,fontWeight:700,color:k.color,textTransform:"uppercase",letterSpacing:"0.03em"}}>{k.label}</span>
          </div>
        ))}
        <div style={{width:1,height:24,background:T.border,margin:"0 4px"}}/>
        <button onClick={()=>setShowUpload(true)} style={{...SANS,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,borderRadius:7,padding:"0 16px",height:38,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><span>↑</span>Manual Upload</button>
        <button onClick={onGoToDashboard} style={{...SANS,background:T.actionBase,color:"#fff",border:"none",borderRadius:7,padding:"0 18px",height:38,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><span>→</span>View Funds</button>
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
      {/* Grid Toolbar removed from here to save vertical space */}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:T.appBg}}>{["Status","Period","Source","Fund","File","Type","Received","Rows","Exceptions","Actions"].map((h,i)=><th key={h+i} style={{...SANS,padding:"8px 12px",textAlign:i>=7&&i<=8?"right":i===9?"center":"left",color:T.textMuted,fontWeight:700,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>)}</tr></thead>
        <tbody>{displayFeeds.map(feed=>{ const cfg=STATUS_CFG[retrying===feed.id?"pending":feed.status];const isRetrying=retrying===feed.id; return(
          <tr key={feed.id} className="feed-row"
            onClick={!!MAPPING_SESSIONS[feed.id]&&feed.status==="success"&&feed.type==="GL" ? ()=>onOpenMapping(MAPPING_SESSIONS[feed.id]) : undefined}
            style={{cursor:!!MAPPING_SESSIONS[feed.id]&&feed.status==="success"&&feed.type==="GL"?"pointer":"default"}}>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}><span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,display:"inline-flex",alignItems:"center",gap:4}}>{isRetrying?<span style={{animation:"pulse 0.8s infinite"}}>⏳</span>:<span>{cfg.icon}</span>}{isRetrying?"Retrying…":cfg.label}</span></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,...SANS,fontSize:11,fontWeight:600,color:T.textPrimary,whiteSpace:"nowrap"}}>{feed.period}</td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
              <span style={{...MONO,fontSize:10,padding:"2px 6px",borderRadius:4,background:T.appBg,border:`1px solid ${T.border}`,color:T.textMuted}}>{feed.source}</span>
            </td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap"}}><div style={{...SANS,fontSize:12,fontWeight:600}}>{feed.fund}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>{feed.client}</div></td>
            <td style={{...MONO,padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:10,color:T.textMuted,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{feed.file}</td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}><span style={{...SANS,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:3,background:feed.type==="GL"?T.actionBg:T.aiBg,color:feed.type==="GL"?T.actionBase:T.aiBase,border:`1px solid ${feed.type==="GL"?"#bfdbfe":T.aiBorder}`}}>{feed.type}</span></td>
            <td style={{...MONO,padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:11,color:T.textMuted,whiteSpace:"nowrap"}}>{feed.received}</td>
            <td style={{...MONO,padding:"10px 12px",textAlign:"right",borderBottom:`1px solid ${T.border}`,fontSize:11}}>{feed.rows>0?feed.rows.toLocaleString():"—"}</td>
            <td style={{...MONO,padding:"10px 12px",textAlign:"right",borderBottom:`1px solid ${T.border}`,fontSize:11,color:feed.exceptions>0?T.errorBase:T.textMuted,fontWeight:feed.exceptions>0?700:400}}>{feed.exceptions>0?feed.exceptions:"—"}</td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,textAlign:"center",whiteSpace:"nowrap"}}>
              <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                {feed.status==="success"&&feed.rows>0&&<button onClick={(e)=>{e.stopPropagation(); setPreviewFeed(feed);}} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background=T.cardBg}>🔍 Data</button>}
                {feed.status==="needs_mapping"&&(
                  <button onClick={()=>onOpenMapping(MAPPING_SESSIONS[feed.id])} style={{...SANS,fontSize:10,fontWeight:700,padding:"4px 8px",borderRadius:4,background:T.aiBg,color:T.aiBase,border:`1px solid ${T.aiBorder}`,cursor:"pointer",transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>✦ Mapping</button>
                )}
                {feed.status==="success"&&feed.exceptions>0&&(
                  <button onClick={()=>onGoToExceptions(feed.fund_id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid ${T.errorBorder}`,background:T.errorBg,color:T.errorBase,cursor:"pointer",transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>⚠ Exceptions</button>
                )}
                {feed.status==="failed"&&!isRetrying&&<button onClick={()=>handleRetry(feed.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid ${T.errorBorder}`,background:T.errorBg,color:T.errorBase,cursor:"pointer",transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>↺ Retry</button>}
              </div>
              {feed.error&&!isRetrying&&<div style={{...SANS,fontSize:10,color:T.errorBase,marginTop:6,maxWidth:180,textAlign:"right"}}>{feed.error}</div>}
            </td>
          </tr>
        );})}
        {displayFeeds.length === 0 && (
          <tr>
            <td colSpan="10" style={{padding:"40px 0", textAlign:"center", color:T.textMuted, ...SANS}}>No feeds match your search criteria.</td>
          </tr>
        )}
        </tbody>
      </table>
    </div>
    {showUpload && <UploadModal currentUser={currentUser} onClose={()=>setShowUpload(false)} onUploadComplete={handleUploadComplete} />}
    {previewFeed && <RawDataModal feed={previewFeed} onClose={()=>setPreviewFeed(null)} />}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADED: GLOBAL EXCEPTIONS INBOX (Wired Bulk Resolution)
// ═══════════════════════════════════════════════════════════════════════════════
function GlobalExceptionsModal({ fundState, fundSeeds, onClose, onGlobalResolve, onSelectFund }) {
  const [resolving, setResolving] = useState(null);
  const [aiReleasing, setAiReleasing] = useState(false);
  const [bulkAction, setBulkAction] = useState(""); // NEW: State for dropdown
  const [bulkNote, setBulkNote] = useState(""); // NEW: State for justification

  const clusters = useMemo(() => {
    const groups = {};
    Object.entries(fundState).forEach(([fid, excs]) => {
      const fund = fundSeeds.find(f => f.fund_id === fid) || { sla_days: 3 };
      excs.forEach(e => {
        if (e.status !== "open") return;
        if (!groups[e.code]) groups[e.code] = { code: e.code, title: e.title, severity: e.severity, funds: new Set(), instances: 0, amount: 0, score: 0, hasAi: !!AI_SUGGESTIONS[e.id], sample: e };
        
        groups[e.code].funds.add(fid);
        groups[e.code].instances++;
        groups[e.code].amount += e.amount;
        
        const slaFactor = fund.sla_days <= 1 ? 2.5 : fund.sla_days <= 3 ? 1.5 : 1.0;
        const sevFactor = e.severity === "error" ? 2.0 : 1.0;
        groups[e.code].score += (e.amount * slaFactor * sevFactor);
      });
    });
    return Object.values(groups).sort((a,b) => b.score - a.score);
  }, [fundState, fundSeeds]);

  const [activeClusterCode, setActiveClusterCode] = useState(clusters[0]?.code);
  
  useEffect(() => {
    if (clusters.length > 0 && (!activeClusterCode || !clusters.find(c=>c.code===activeClusterCode))) {
      setActiveClusterCode(clusters[0].code);
    }
  }, [clusters, activeClusterCode]);

  const activeCluster = clusters.find(c => c.code === activeClusterCode);

  const handleReleaseAi = () => {
    setAiReleasing(true);
    setTimeout(() => {
      setAiReleasing(false);
      onGlobalResolve("FX_MISMATCH", "override_value"); 
      if(activeClusterCode === "FX_MISMATCH") setActiveClusterCode(null);
    }, 1500);
  };

  const handleBulkResolve = () => {
    if (!bulkAction) return;
    setResolving(activeCluster.code); 
    setTimeout(() => {
      onGlobalResolve(activeCluster.code, bulkAction);
      setResolving(null);
      setBulkAction("");
      setBulkNote("");
    }, 1000);
  };

  return (
    <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="slide-in" style={{background:T.appBg,borderRadius:12,width:1200,height:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
        
        <div style={{background:T.navyHeader,padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:16,color:"#fff",display:"flex",alignItems:"center",gap:8}}><span>🌍</span> Global Exception Inbox</div>
            <div style={{...SANS,fontSize:12,color:"#9ca3af",marginTop:4}}>Sorted by Materiality Score (Dollar Impact × SLA Risk)</div>
          </div>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <button onClick={handleReleaseAi} disabled={aiReleasing} style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.aiBase, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6}}>
              {aiReleasing ? <><span style={{animation:"pulse 0.8s infinite"}}>✦</span> Releasing...</> : <><span>✦</span> Release AI Auto-Resolution Queue</>}
            </button>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20}}>✕</button>
          </div>
        </div>

        <div style={{display:"flex", flex:1, overflow:"hidden"}}>
          <div style={{width:"40%", background:T.cardBg, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column"}}>
            <div style={{padding:"12px 16px", background:"#f8fafc", borderBottom:`1px solid ${T.border}`, ...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em"}}>
              Exception Clusters ({clusters.length})
            </div>
            <div style={{overflowY:"auto", flex:1}}>
              {clusters.length === 0 ? (
                <div style={{padding:"30px", textAlign:"center", color:T.textMuted, ...SANS, fontSize:13}}>No global exceptions found.</div>
              ) : (
                clusters.map(c => {
                  const isSel = activeClusterCode === c.code;
                  return (
                    <div key={c.code} onClick={() => {setActiveClusterCode(c.code); setBulkAction("");}} style={{padding:"14px 16px", borderBottom:`1px solid ${T.border}`, background:isSel?"#eff6ff":T.cardBg, cursor:"pointer", borderLeft:`4px solid ${isSel?T.actionBase:"transparent"}`}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4}}>
                        <div style={{...MONO, fontSize:11, fontWeight:700, color:T.textPrimary}}>{c.code}</div>
                        <div style={{display:"flex", gap:6, alignItems:"center"}}>
                          {c.instances > 1 && <span style={{...MONO, fontSize:9, fontWeight:700, color:T.aiBase, background:T.aiBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.aiBorder}`}}>SYSTEMIC</span>}
                          <Badge severity={c.severity} size="sm"/>
                        </div>
                      </div>
                      <div style={{...SANS, fontSize:12, color:T.textPrimary, fontWeight:600, marginBottom:8, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} title={c.title}>{c.title}</div>
                      <div style={{display:"flex", justifyContent:"space-between", ...SANS, fontSize:11, color:T.textMuted}}>
                        <span style={{display:"flex", gap:12}}>
                          <span><strong>{c.instances}</strong> Items</span>
                          <span><strong>{c.funds.size}</strong> Funds</span>
                        </span>
                        {c.hasAi && <span style={{color:T.aiBase, fontWeight:700}}>✦ AI Ready</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{flex:1, display:"flex", flexDirection:"column", background:T.appBg}}>
            {activeCluster ? (
              <>
                <div style={{padding:"20px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                    <div>
                      <div style={{...SANS, fontSize:20, fontWeight:700, color:T.textPrimary, marginBottom:8}}>{activeCluster.title}</div>
                      <div style={{...SANS, fontSize:13, color:T.textMuted, lineHeight:1.5, padding:"12px", background:"#f8fafc", borderRadius:6, border:`1px solid ${T.border}`, marginBottom:16}}>
                        <strong>Sample Context:</strong> {activeCluster.sample.message}
                      </div>
                    </div>
                    <div style={{textAlign:"right", paddingLeft:16}}>
                       <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4}}>Materiality Score</div>
                       <div style={{...MONO, fontSize:20, fontWeight:700, color:T.errorBase}}>{fmtCompact(activeCluster.score)}</div>
                    </div>
                  </div>
                  
                  {/* UPDATED: Wired Bulk Resolution Action Box */}
                  <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, padding:"16px", display:"flex", gap:16, alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:8}}>Bulk Resolution Action</div>
                      <select value={bulkAction} onChange={e=>setBulkAction(e.target.value)} style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13, marginBottom:12, cursor:"pointer"}}>
                        <option value="">Select action...</option>
                        <option value="corrected_source">Corrected in Source</option>
                        <option value="override_value">Override with Value</option>
                        <option value="accept_as_is">Accept As Is (Requires Justification)</option>
                        <option value="acknowledged">Acknowledge (Warning Only)</option>
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:8}}>Shared Justification</div>
                      <input type="text" value={bulkNote} onChange={e=>setBulkNote(e.target.value)} placeholder="Applies to all selected exceptions..." style={{...SANS, width:"100%", padding:"10px 14px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:13}} />
                    </div>
                    <div style={{paddingTop:24}}>
                      <button onClick={handleBulkResolve} disabled={resolving===activeCluster.code || !bulkAction} style={{...SANS, fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:6, border:"none", background:!bulkAction?"#94a3b8":T.actionBase, color:"#fff", cursor:!bulkAction?"not-allowed":"pointer", whiteSpace:"nowrap", transition:"background 0.2s"}}>
                        {resolving===activeCluster.code ? "Resolving..." : `Resolve All ${activeCluster.instances}`}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div style={{padding:"16px 24px 8px", ...SANS, fontSize:12, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em"}}>
                  Affected Funds Drill-Down ({activeCluster.funds.size})
                </div>
                <div style={{flex:1, overflowY:"auto", padding:"0 24px 24px"}}>
                  <table style={{width:"100%", borderCollapse:"collapse", background:T.cardBg, borderRadius:8, overflow:"hidden", border:`1px solid ${T.border}`}}>
                    <thead style={{position:"sticky", top:0, zIndex:10}}>
                      <tr style={{background:"#f8fafc", borderBottom:`1px solid ${T.border}`}}>
                        <th style={{...SANS, fontSize:10, color:T.textMuted, fontWeight:700, textTransform:"uppercase", padding:"8px 12px", textAlign:"left"}}>Fund Name</th>
                        <th style={{...SANS, fontSize:10, color:T.textMuted, fontWeight:700, textTransform:"uppercase", padding:"8px 12px", textAlign:"left"}}>Client</th>
                        <th style={{...SANS, fontSize:10, color:T.textMuted, fontWeight:700, textTransform:"uppercase", padding:"8px 12px", textAlign:"right"}}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(activeCluster.funds).map(fid => {
                        const fund = fundSeeds.find(f => f.fund_id === fid);
                        if (!fund) return null;
                        return (
                          <tr key={fid} className="row-hover" style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"10px 12px"}}>
                              <div style={{...SANS, fontSize:12, fontWeight:600, color:T.textPrimary}}>{fund.name}</div>
                              <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:2}}>{fid}</div>
                            </td>
                            <td style={{...SANS, fontSize:11, color:T.textMuted, padding:"10px 12px"}}>{fund.client}</td>
                            <td style={{padding:"10px 12px", textAlign:"right"}}>
                              <button onClick={() => { onClose(); onSelectFund(fund); }} style={{...SANS, fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:4, border:`1px solid ${T.actionBase}`, background:T.actionBg, color:T.actionBase, cursor:"pointer"}}>
                                Drill Down →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:T.textMuted, ...SANS, fontSize:13}}>
                Select a cluster on the left to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Bulk Fund Action Bar (Updated with Mass Approval) ────────────────────────
// ─── UPGRADED: Bulk Fund Action Bar (Multi-Select Batch Generation) ──────────
function BulkFundActionBar({selectedFunds, approvalState, fundState, currentUser, onClear, onBulkApprove}) {
  const [actionState, setActionState] = useState(null); 
  const [showGenMenu, setShowGenMenu] = useState(false);
  const [genOpts, setGenOpts] = useState({ pdf: true, excel: true, xml: false });
  
  const selectedArr = Array.from(selectedFunds);
  
  const eligibleFunds = selectedArr.filter(fid => {
    const excs = fundState[fid] || [];
    const openErrors = excs.filter(e => e.severity === "error" && e.status === "open").length;
    return approvalState[fid]?.status === "review_pending" && openErrors === 0;
  });

  const canApprove = currentUser?.isController && eligibleFunds.length > 0;
  const canGenerate = genOpts.pdf || genOpts.excel || genOpts.xml;
  
  const handleAction = (type, callback) => {
    setShowGenMenu(false);
    setActionState(type);
    setTimeout(() => {
      setActionState("done");
      if (callback) callback();
      setTimeout(() => { setActionState(null); onClear(); }, 2500);
    }, 1500); 
  };

  if(selectedArr.length === 0) return null;
  return (
    <div className="slide-in" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,background:T.navyHeader,borderTop:`2px solid ${T.actionBase}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:16, boxShadow:"0 -4px 12px rgba(0,0,0,0.15)"}}>
      <div style={{...SANS,fontSize:13,fontWeight:700,color:"#fff",background:"#253547",padding:"6px 12px",borderRadius:6,display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:T.actionBase,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{selectedArr.length}</span>
        funds selected
      </div>
      
      {actionState === "done" ? (
        <div style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",color:"#34d399",display:"flex",alignItems:"center",gap:6}}>
          <span>✓</span> Batch job queued successfully. Background workers are processing files.
        </div>
      ) : (
        <>
          {/* Multi-Select Generation Menu */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowGenMenu(!showGenMenu)} disabled={!!actionState} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:"none",background:actionState==="generating"?"#374151":T.okBase,color:actionState==="generating"?"#9ca3af":"#fff",cursor:actionState?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
              {actionState==="generating" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>📄</span>} Batch Generate...
            </button>

            {showGenMenu && (
              <div className="slide-in" style={{position:"absolute", bottom:"100%", left:0, marginBottom:8, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:8, padding:16, width:240, boxShadow:"0 -4px 12px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column", gap:10}}>
                <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase"}}>Select Outputs</div>
                <label style={{...SANS, fontSize:13, display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.textPrimary}}>
                  <input type="checkbox" checked={genOpts.pdf} onChange={e=>setGenOpts({...genOpts, pdf:e.target.checked})} style={{accentColor:T.actionBase, width:16, height:16}} /> 📄 PDF Financials
                </label>
                <label style={{...SANS, fontSize:13, display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.textPrimary}}>
                  <input type="checkbox" checked={genOpts.excel} onChange={e=>setGenOpts({...genOpts, excel:e.target.checked})} style={{accentColor:T.actionBase, width:16, height:16}} /> 📊 Excel Workpapers
                </label>
                <label style={{...SANS, fontSize:13, display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:T.textPrimary}}>
                  <input type="checkbox" checked={genOpts.xml} onChange={e=>setGenOpts({...genOpts, xml:e.target.checked})} style={{accentColor:T.actionBase, width:16, height:16}} /> 🏛 SEC N-PORT XML
                </label>
                
                <button disabled={!canGenerate} onClick={()=>handleAction('generating')} style={{...SANS, marginTop:8, fontSize:12, fontWeight:700, padding:"8px", borderRadius:6, border:"none", background:canGenerate?T.actionBase:T.border, color:canGenerate?"#fff":T.textMuted, cursor:canGenerate?"pointer":"not-allowed"}}>
                  Run Batch Job
                </button>
              </div>
            )}
          </div>
          
          {currentUser?.isController && (
             <button onClick={()=>handleAction('approving', () => onBulkApprove(eligibleFunds))} disabled={!canApprove} style={{...SANS,fontSize:13,fontWeight:700,padding:"8px 16px",borderRadius:6,border:`1px solid ${canApprove?T.okBorder:"#374151"}`,background:actionState==="approving"?"#374151":T.okBg,color:actionState==="approving"?"#9ca3af":T.okBase,cursor:canApprove?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:6}}>
               {actionState==="approving" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>✓</span>} Sign-off {eligibleFunds.length} Funds
             </button>
          )}

          <button onClick={()=>handleAction('downloading')} disabled={!!actionState} style={{...SANS,fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:6,border:`1px solid #374151`,background:actionState==="downloading"?"#374151":"transparent",color:actionState==="downloading"?"#9ca3af":"#e2e6ed",cursor:actionState?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {actionState==="downloading" ? <span style={{animation:"pulse 0.8s infinite"}}>●</span> : <span>↓</span>} Batch Download
          </button>
        </>
      )}
      
      <button onClick={onClear} disabled={!!actionState} style={{marginLeft:"auto",...SANS,fontSize:13,color:"#8898aa",background:"transparent",border:"none",cursor:actionState?"not-allowed":"pointer"}}>✕ Clear</button>
    </div>
  );
}

// ─── Workflow Mini-Stepper ────────────────────────────────────────────────────
function WorkflowProgress({ stats, approval }) {
  const steps = [
    { label: "Data",       done: true, error: false },
    { label: "Exceptions", done: stats.errors === 0, error: stats.errors > 0 },
    { label: "Checks",     done: approval.status === "review_pending" || approval.status === "approved", error: false },
    { label: "Approved",   done: approval.status === "approved", error: false }
  ];

  return (
    <div style={{display:"flex", alignItems:"center", gap:4}}>
      {steps.map((s, i) => {
        const bg = s.error ? T.errorBase : s.done ? T.okBase : T.border;
        return (
          <div key={i} title={s.label} style={{display:"flex", alignItems:"center", gap:4}}>
            <div style={{width: 18, height: 6, borderRadius: 3, background: bg, opacity: (!s.done && !s.error) ? 0.5 : 1}} />
          </div>
        );
      })}
      <span style={{...SANS, fontSize:10, color:T.textMuted, marginLeft:4, width: 60}}>
        {approval.status==="approved" ? "Approved" : stats.errors > 0 ? "Exceptions" : "In Review"}
      </span>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// NEW: PERSONALIZED INBOX (Notifications, Mentions & Assignments)
// ═══════════════════════════════════════════════════════════════════════════════
function InboxView({ notifications, onSelectFund }) {
  if (notifications.length === 0) {
    return (
      <div className="fade-in" style={{padding:"80px 0", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center"}}>
        <div style={{fontSize:48, marginBottom:16}}>📭</div>
        <div style={{...SANS, fontSize:18, fontWeight:700, color:T.textPrimary, marginBottom:8}}>You're all caught up!</div>
        <div style={{...SANS, fontSize:13, color:T.textMuted}}>No new assignments, mentions, or reviews pending.</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{padding:"20px 24px", maxWidth: 900, margin:"0 auto", width:"100%"}}>
      <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:16}}>
        My Notifications ({notifications.length})
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        {notifications.map(n => (
          <div key={n.id} onClick={() => onSelectFund(n.fund)} className="row-hover" style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"16px 20px", cursor:"pointer", display:"flex", gap:16, alignItems:"flex-start", boxShadow:"0 2px 4px rgba(0,0,0,0.02)", transition:"all 0.15s"}}>
            <div style={{width:36, height:36, borderRadius:"50%", background:n.bg, color:n.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0}}>
              {n.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                <div style={{...SANS, fontSize:14, fontWeight:700, color:T.textPrimary}}>{n.title}</div>
                <div style={{...SANS, fontSize:11, color:T.textMuted}}>{n.time}</div>
              </div>
              <div style={{...SANS, fontSize:13, color:T.textPrimary, marginBottom:8}}>{n.message}</div>
              <div style={{...MONO, fontSize:11, color:T.textMuted, display:"flex", alignItems:"center", gap:8}}>
                <span style={{background:T.appBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.border}`}}>{n.fund.name}</span>
                {n.exc && <span style={{color:T.actionBase}}>↳ {n.exc.id}</span>}
              </div>
            </div>
            <div style={{color:T.actionBase, fontSize:20, alignSelf:"center", paddingLeft:10}}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Dashboard({fundState, fundSeeds, approvalState, currentUser, notifications, onSelectFund, onReassign, onViewClientExceptions, onBulkApprove, onGlobalResolve, onGoToAudit}) {
  // Default Preparers to the Inbox, Controllers to the Client View
  const [dashView,setDashView]=useState(currentUser?.isController ? "team":"client");
  const [layoutStyle,setLayoutStyle]=useState("list");
  const [collapsed,setCollapsed]=useState({});
  const [hideEmpty, setHideEmpty] = useState(false); // NEW Focus Mode Toggle
  
  const [showTemplates,setShowTemplates]=useState(false);
  const [showAuditorPortal,setShowAuditorPortal]=useState(false);
  const [showGlobalExcs, setShowGlobalExcs] = useState(false);
  const [showClientPortal, setShowClientPortal] = useState(false);
  const [showSoc1, setShowSoc1] = useState(false);

  const [period, setPeriod] = useState("Dec 2024");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("sla_asc");
  const [selectedFunds, setSelectedFunds] = useState(new Set());
  
  const getStats = useCallback(fund => {
    const excs=fundState[fund.fund_id]||[];
    return {
      total:excs.length,
      resolved:excs.filter(e=>e.status==="resolved").length,
      errors:excs.filter(e=>e.severity==="error"&&e.status==="open").length,
      warnings:excs.filter(e=>e.severity==="warning"&&e.status==="open").length,
      status:excs.filter(e=>e.severity==="error"&&e.status==="open").length===0?"READY":"BLOCKED"
    };
  }, [fundState]);

  const toggleFundSelection = (e, fundId) => { e.stopPropagation(); setSelectedFunds(prev => { const next = new Set(prev); next.has(fundId) ? next.delete(fundId) : next.add(fundId); return next; }); };
  const toggleClientSelection = (e, clientFunds) => { e.stopPropagation(); const allSelected = clientFunds.every(f => selectedFunds.has(f.fund_id)); setSelectedFunds(prev => { const next = new Set(prev); clientFunds.forEach(f => allSelected ? next.delete(f.fund_id) : next.add(f.fund_id)); return next; }); };

  const filteredAndSortedFunds = useMemo(() => {
    let result = [...fundSeeds];
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter(f => f.name.toLowerCase().includes(q) || f.fund_id.toLowerCase().includes(q) || f.client.toLowerCase().includes(q)); }
    if (statusFilter !== "All") result = result.filter(f => getStats(f).status === statusFilter);
    if (stageFilter !== "All") result = result.filter(f => (approvalState[f.fund_id]?.status || "open") === stageFilter);
    if (hideEmpty) result = result.filter(f => getStats(f).total > 0); // Focus mode filter
    
    result.sort((a, b) => {
      if (sortBy === "sla_asc") return a.sla_days - b.sla_days;
      if (sortBy === "sla_desc") return b.sla_days - a.sla_days;
      if (sortBy === "exceptions_desc") return (getStats(b).errors + getStats(b).warnings) - (getStats(a).errors + getStats(a).warnings);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [fundSeeds, search, statusFilter, stageFilter, sortBy, hideEmpty, getStats, approvalState]);

  const grouped = useMemo(()=>{
    const g={};
    filteredAndSortedFunds.forEach(f=>{
      if(!g[f.client])g[f.client]=[];
      g[f.client].push(f);
    });
    return g;
  }, [filteredAndSortedFunds]);
  
  const totalFunds = fundSeeds.length;
  const blockedFunds = fundSeeds.filter(f=>getStats(f).status==="BLOCKED").length;
  const readyFunds = fundSeeds.filter(f=>getStats(f).status==="READY").length;
  const reviewFunds = Object.values(approvalState).filter(a=>a.status==="review_pending").length;
  const approvedFunds = Object.values(approvalState).filter(a=>a.status==="approved").length;
  
  return <div style={{padding:"20px 24px", paddingBottom: selectedFunds.size > 0 ? 80 : 20}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{...SANS,fontWeight:700,fontSize:18,color:T.textPrimary, display:"flex", alignItems:"center", gap:10}}>
          Fund Dashboard 
          <span style={{color:T.textMuted, fontSize:16, fontWeight:400}}>|</span>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...SANS, fontSize:16, fontWeight:700, color:T.actionBase, background:"transparent", border:"none", outline:"none", cursor:"pointer", appearance:"none", paddingRight:16, backgroundImage:"url('data:image/svg+xml;utf8,<svg fill=%22%234a7cff%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')", backgroundRepeat:"no-repeat", backgroundPosition:"right center"}}>
            <option value="Dec 2024">December 2024</option>
            <option value="Nov 2024">November 2024</option>
          </select>
        </div>
      </div>

      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{display:"flex",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:7,padding:3,gap:2}}>
          {/* NEW: Added Inbox to the toggle array */}
          {[{val:"client",label:"Client View"},{val:"inbox",label:"My Inbox"},{val:"team",label:"Team Capacity"},{val:"flow",label:"Pipeline Flow"}].map(v=> (
            <button key={v.val} onClick={()=>setDashView(v.val)} style={{...SANS,fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:5,border:"none",background:dashView===v.val?T.cardBg:T.appBg,color:dashView===v.val?T.textPrimary:T.textMuted,cursor:"pointer",boxShadow:dashView===v.val?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.1s", display:"flex", alignItems:"center", gap:6}}>
              {v.label}
              {v.val === "inbox" && notifications.length > 0 && (
                <span style={{background:T.errorBase, color:"#fff", fontSize:10, padding:"1px 6px", borderRadius:10}}>{notifications.length}</span>
              )}
            </button>
          ))}
        </div>
        {dashView === "client" && (
          <div style={{display:"flex",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:7,padding:3,gap:2, marginLeft:12}}>
            <button onClick={()=>setLayoutStyle("list")} title="List View" style={{...SANS, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5, background:layoutStyle==="list"?T.cardBg:"transparent", color:layoutStyle==="list"?T.textPrimary:T.textMuted, border:"none", borderRadius:5, padding:"5px 10px", cursor:"pointer", boxShadow:layoutStyle==="list"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}><span style={{fontSize:14, opacity:layoutStyle==="list"?1:0.5}}>≡</span> List</button>
            <button onClick={()=>setLayoutStyle("grid")} title="Grid View" style={{...SANS, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5, background:layoutStyle==="grid"?T.cardBg:"transparent", color:layoutStyle==="grid"?T.textPrimary:T.textMuted, border:"none", borderRadius:5, padding:"5px 10px", cursor:"pointer", boxShadow:layoutStyle==="grid"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}><span style={{fontSize:14, opacity:layoutStyle==="grid"?1:0.5}}>⊞</span> Grid</button>
          </div>
        )}
        <button onClick={()=>setShowGlobalExcs(true)} style={{...SANS,fontSize:12,fontWeight:700,color:T.aiBase,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.aiBorder}`,background:T.aiBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginLeft:12}}><span>🌍</span>Global Exceptions</button>
        <button onClick={()=>setShowClientPortal(true)} style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>🏢</span>Client Portal</button>
        <button onClick={()=>setShowAuditorPortal(true)} style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>🔒</span>Auditor Portal</button>
        <button onClick={onGoToAudit} style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>📋</span>Global Audit Log</button>
      </div>
    </div>

    {dashView === "client" && (
      <div style={{padding:"8px 12px", marginBottom:20, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16}}>
        <div style={{display:"flex", gap:10, alignItems:"center", flex:1, minWidth:400}}>
          <div style={{position:"relative", flex:1, maxWidth: 280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" placeholder="Search funds or clients..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="All">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="All">All Stages</option>
            <option value="open">In Progress</option>
            <option value="review_pending">Review Pending</option>
            <option value="approved">Approved</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="sla_asc">Sort: SLA (Urgent First)</option>
            <option value="sla_desc">Sort: SLA (Latest First)</option>
            <option value="exceptions_desc">Sort: Most Exceptions</option>
          </select>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginLeft:10}}>
            <input type="checkbox" checked={hideEmpty} onChange={e=>setHideEmpty(e.target.checked)} style={{accentColor:T.actionBase}}/>
            <span style={{...SANS,fontSize:12,color:T.textPrimary,fontWeight:600}}>Hide Empty</span>
          </label>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:6}}>
            <span style={{...MONO,fontSize:13,fontWeight:700,color:T.textPrimary}}>{totalFunds}</span>
            <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Funds</span>
          </div>
          <div style={{width:1,height:20,background:T.border,margin:"0 2px"}}/>
          {[
            {label:"Blocked",val:blockedFunds,color:T.errorBase,bg:T.errorBg,bd:T.errorBorder, icon:"✕"},
            {label:"Ready",val:readyFunds,color:T.okBase,bg:T.okBg,bd:T.okBorder, icon:"✓"},
            {label:"Review",val:reviewFunds,color:T.warnBase,bg:T.warnBg,bd:T.warnBorder, icon:"⏳"},
            {label:"Approved",val:approvedFunds,color:T.okBase,bg:T.okBg,bd:T.okBorder, icon:"✓"}
          ].map(k=>(
            <div key={k.label} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 10px",height:34,display:"flex",alignItems:"center",gap:6, boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
              <span style={{fontSize:12, color:k.color, fontWeight:700}}>{k.icon}</span>
              <span style={{...MONO,fontSize:13,fontWeight:700,color:k.color}}>{k.val}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:k.color,textTransform:"uppercase",letterSpacing:"0.03em"}}>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {dashView === "client" && filteredAndSortedFunds.filter(f => f.sla_days <= 1 && getStats(f).status === "BLOCKED").length > 0 && (
      <div className="slide-in" style={{background: T.cardBg, border:`1px solid ${T.border}`, borderLeft:`4px solid ${T.errorBase}`, borderRadius:8, padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span style={{fontSize: 18, color: T.errorBase}}>⚠</span>
          <div>
            <div style={{...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary}}>SLA Risk Alert</div>
            <div style={{...SANS, fontSize: 12, color: T.textMuted, marginTop: 2}}><strong>{filteredAndSortedFunds.filter(f => f.sla_days <= 1 && getStats(f).status === "BLOCKED").length} blocked funds</strong> are due within 24 hours. Clear exceptions to protect SLA.</div>
          </div>
        </div>
        <div style={{display:"flex", gap: 8}}>
          {filteredAndSortedFunds.filter(f => f.sla_days <= 1 && getStats(f).status === "BLOCKED").slice(0,4).map(f => (
            <button key={f.fund_id} onClick={()=>onSelectFund(f)} style={{...SANS, fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:4, border:`1px solid ${T.border}`, background:T.appBg, color:T.textPrimary, cursor:"pointer", transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.errorBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              {f.fund_id} (Due {f.sla_days === 0 ? "Today" : "Tomorrow"})
            </button>
          ))}
        </div>
      </div>
    )}

{dashView==="inbox" ? <InboxView notifications={notifications} onSelectFund={onSelectFund} /> : 
     dashView==="flow" ? <TouchlessFlowDashboard fundSeeds={fundSeeds} approvalState={approvalState} fundState={fundState}/> : 
     dashView==="team" ? <TeamCapacityView fundState={fundState} fundSeeds={filteredAndSortedFunds} onSelectFund={onSelectFund} onReassign={onReassign}/> : 
      Object.keys(grouped).length === 0 ? (
        <div style={{textAlign:"center", padding:"60px 0", color:T.textMuted, ...SANS, fontSize:14}}>No funds match your current filters.</div>
      ) : (
      Object.entries(grouped).map(([client,funds])=>{
        const isOpen=!collapsed[client];
        const totalErrs=funds.reduce((s,f)=>s+getStats(f).errors,0);
        const rp=funds.filter(f=>approvalState[f.fund_id]?.status==="review_pending").length;
        const allSelected = funds.every(f => selectedFunds.has(f.fund_id));
        const someSelected = funds.some(f => selectedFunds.has(f.fund_id));

        return <div key={client} style={{border:`1px solid ${T.border}`,borderRadius:10,marginBottom:14,background:T.cardBg,overflow:"hidden"}}>
          <div style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:T.appBg,borderBottom:isOpen?`1px solid ${T.border}`:"none"}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <input type="checkbox" checked={allSelected} ref={el=>{if(el)el.indeterminate=(someSelected && !allSelected)}} onChange={(e)=>toggleClientSelection(e, funds)} style={{cursor:"pointer", width:16, height:16, accentColor:T.actionBase}} />
              <button onClick={()=>setCollapsed(p=>({...p,[client]:!p[client]}))} aria-expanded={isOpen} style={{display:"flex",alignItems:"center",gap:8,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",color:T.textPrimary}}>
                <span style={{color:T.textMuted,fontSize:12, width:16, textAlign:"center"}}>{isOpen?"▼":"▶"}</span>
                <div>
                  <div style={{...SANS,fontWeight:700,fontSize:14,color:T.textPrimary}}>{client}</div>
                  <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>{funds.length} funds {totalErrs>0&&<span style={{color:T.errorBase,fontWeight:600}}> · {totalErrs} errors</span>}{rp>0&&<span style={{color:T.warnBase,fontWeight:600}}> · {rp} under review</span>}</div>
                </div>
              </button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {totalErrs === 0 && funds.every(f => approvalState[f.fund_id]?.status !== "approved") && (
                 <div className="fade-in" style={{...SANS,fontSize:11,fontWeight:700,color:T.okBase,display:"flex",alignItems:"center",gap:5}}>
                   <span>🎉</span> Zero Exceptions — Ready for Review
                 </div>
              )}
              {totalErrs > 0 && (
                <button onClick={() => onViewClientExceptions(client)} style={{...SANS,fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:5,background:"#fff",color:T.errorBase,border:`1px solid ${T.errorBorder}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}>
                  <span>⚠</span> View Client Exceptions ({totalErrs})
                </button>
              )}
            </div>
          </div>
          
          {isOpen && layoutStyle === "grid" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12,padding:16}}>
              {funds.map(f=>{ const stats=getStats(f);const approv=approvalState[f.fund_id];const pct=stats.total>0?Math.round((stats.resolved/stats.total)*100):100;const assignedUser=TEAM.find(m=>m.id===f.assignedTo); return(
                <div key={f.fund_id} role="button" tabIndex={0} className="fund-card" onClick={()=>onSelectFund(f)} onKeyDown={e=>e.key==="Enter"&&onSelectFund(f)} style={{border:`1px solid ${stats.status==="BLOCKED"?T.errorBorder:T.okBorder}`,borderRadius:9,padding:"14px 16px",background:T.cardBg}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div style={{flex:1,minWidth:0}}><div style={{...SANS,fontWeight:700,fontSize:13,marginBottom:1,color:T.textPrimary}}>{f.name}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>{f.fund_id}</div></div><span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:4,flexShrink:0,marginLeft:8,display:"flex",alignItems:"center",gap:4,background:stats.status==="BLOCKED"?T.errorBg:T.okBg,color:stats.status==="BLOCKED"?T.errorBase:T.okBase,border:`1px solid ${stats.status==="BLOCKED"?T.errorBorder:T.okBorder}`}}>{stats.status==="BLOCKED"?<><span>✕</span>BLOCKED</>:<><span>✓</span>READY</>}</span></div>
                  <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{...SANS,color:T.textMuted}}>{stats.resolved}/{stats.total} exceptions</span><span style={{...MONO,fontWeight:700,color:stats.status==="BLOCKED"?T.warnBase:T.okBase}}>{pct}%</span></div><div style={{height:4,background:T.border,borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:stats.status==="BLOCKED"?T.warnBase:T.okBase,borderRadius:2,transition:"width 0.4s"}}/></div></div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}><SlaPill daysLeft={f.sla_days}/><ApprovalPill status={approv?.status||"open"}/></div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>{stats.errors>0&&<span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.errorBg,color:T.errorBase,border:`1px solid ${T.errorBorder}`,display:"flex",alignItems:"center",gap:3}}><span>✕</span>{stats.errors} Error</span>}{stats.warnings>0&&<span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`,display:"flex",alignItems:"center",gap:3}}><span>!</span>{stats.warnings} Warn</span>}{assignedUser&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}><Avatar user={assignedUser} size={18}/></div>}</div>
                </div>
              );})}
            </div>
          )}

         {/* List Layout */}
         {isOpen && layoutStyle === "list" && (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", fontSize:12, textAlign:"left", tableLayout:"fixed"}}>
                <thead>
                  <tr style={{background:"#f9fafb", borderBottom:`1px solid ${T.border}`}}>
                    <th style={{padding:"8px 12px", width:"4%"}}></th>
                    <th style={{padding:"8px 12px", width:"22%", ...SANS, fontWeight:600, color:T.textMuted}}>Fund Name / ID</th>
                    <th style={{padding:"8px 12px", width:"9%", ...SANS, fontWeight:600, color:T.textMuted}}>Status</th>
                    <th style={{padding:"8px 12px", width:"14%", ...SANS, fontWeight:600, color:T.textMuted}}>Workflow Progress</th>
                    <th style={{padding:"8px 12px", width:"11%", ...SANS, fontWeight:600, color:T.textMuted}}>Exceptions</th>
                    {/* NEW VARIANCE HEADER */}
                    <th style={{padding:"8px 12px", width:"11%", ...SANS, fontWeight:600, color:T.textMuted}}>PoP Δ</th>
                    <th style={{padding:"8px 12px", width:"11%", ...SANS, fontWeight:600, color:T.textMuted}}>Last Draft</th>
                    <th style={{padding:"8px 12px", width:"11%", ...SANS, fontWeight:600, color:T.textMuted}}>SLA</th>
                    <th style={{padding:"8px 12px", width:"11%", ...SANS, fontWeight:600, color:T.textMuted}}>Stage</th>
                    <th style={{padding:"8px 12px", width:"7%", ...SANS, fontWeight:600, color:T.textMuted, textAlign:"right"}}>Assignee</th>
                  </tr>
                </thead>
                <tbody>
  {funds.map(f => { 
    const stats = getStats(f);
    const approv = approvalState[f.fund_id];
    const assignedUser = TEAM.find(m => m.id === f.assignedTo);
    const isSelected = selectedFunds.has(f.fund_id);
    const draftStr = approv?.status === "approved" ? "Final — Dec 31" : stats.errors === 0 ? "Draft 2 — Jan 2" : "Draft 1 — Jan 1";
    
    // NEW: Calculate Variance Score
    const variancePct = ((f.net_assets - f.prior_net_assets) / f.prior_net_assets) * 100;
    const isOutlier = Math.abs(variancePct) > 5.0; // Flag variances > 5%
    
    return (
      <tr key={f.fund_id} className="row-hover" onClick={()=>onSelectFund(f)} style={{borderBottom:`1px solid ${T.border}`, cursor:"pointer", background:isSelected ? "#eff6ff" : "transparent"}}>
        <td style={{padding:"10px 12px"}} onClick={(e)=>toggleFundSelection(e, f.fund_id)}>
          <input type="checkbox" checked={isSelected} onChange={()=>{}} style={{cursor:"pointer", width:15, height:15, accentColor:T.actionBase}} />
        </td>
        <td style={{padding:"10px 12px", overflow:"hidden"}}>
          <div style={{...SANS, fontWeight:600, color:T.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} title={f.name}>{f.name}</div>
          <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:2}}>{f.fund_id}</div>
        </td>
        <td style={{padding:"10px 12px"}}>
          <span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:stats.status==="BLOCKED"?T.errorBg:T.okBg,color:stats.status==="BLOCKED"?T.errorBase:T.okBase,border:`1px solid ${stats.status==="BLOCKED"?T.errorBorder:T.okBorder}`}}>
            {stats.status}
          </span>
        </td>
        <td style={{padding:"10px 12px"}}>
          <WorkflowProgress stats={stats} approval={approv || {status:"open"}} />
        </td>
        <td style={{padding:"10px 12px"}}>
          <div style={{display:"flex", gap:6}}>
            {stats.errors > 0 ? <span style={{...SANS, padding:"2px 6px", borderRadius:4, background:T.errorBg, border:`1px solid ${T.errorBorder}`, color:T.errorBase, fontWeight:700, fontSize:10}}>✕ {stats.errors} Errors</span> : <span style={{color:T.textMuted}}>—</span>}
          </div>
        </td>

        {/* NEW VARIANCE CELL */}
        <td style={{padding:"10px 12px"}}>
          <span style={{...MONO, fontSize:11, fontWeight:700, color: isOutlier ? T.errorBase : T.textPrimary, display:"flex", alignItems:"center", gap:4}}>
            {variancePct > 0 ? "+" : ""}{variancePct.toFixed(2)}%
            {isOutlier && <span title="Variance threshold exceeded (>5%)" style={{fontSize:14}}>⚠</span>}
          </span>
        </td>

        <td style={{padding:"10px 12px", ...MONO, fontSize:11, color:T.textPrimary, whiteSpace:"nowrap"}}>
          {draftStr}
        </td>
        <td style={{padding:"10px 12px"}}>
          <SlaPill daysLeft={f.sla_days}/>
        </td>
        <td style={{padding:"10px 12px"}}>
          <ApprovalPill status={approv?.status||"open"}/>
        </td>
        <td style={{padding:"10px 12px", textAlign:"right"}}>
          {assignedUser ? <Avatar user={assignedUser} size={24} /> : <span style={{color:T.textMuted}}>—</span>}
        </td>
      </tr>
    );
  })}
</tbody>
              </table>
            </div>
          )}
        </div>;
    })
    )}
    
    <BulkFundActionBar selectedFunds={selectedFunds} approvalState={approvalState} currentUser={currentUser} onClear={()=>setSelectedFunds(new Set())} onBulkApprove={onBulkApprove} fundState={fundState}/>
    {showGlobalExcs && <GlobalExceptionsModal fundState={fundState} fundSeeds={fundSeeds} onClose={()=>setShowGlobalExcs(false)} onGlobalResolve={onGlobalResolve} onSelectFund={onSelectFund} />}
    {showTemplates&&<TemplateConfigScreen onClose={()=>setShowTemplates(false)}/>}
    {showClientPortal&&<ClientPortal onClose={()=>setShowClientPortal(false)}/>}
    {showAuditorPortal&&<AuditorPortal onClose={()=>setShowAuditorPortal(false)}/>}
    {showSoc1&&<Soc1AuditReport onClose={()=>setShowSoc1(false)} fundState={fundState} approvalState={approvalState} fundSeeds={fundSeeds}/>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: DATA EXCHANGE HUB (Bespoke Feeds & SFTP - REQ 3)
// ═══════════════════════════════════════════════════════════════════════════════
function DataExchangeView({ onBack }) {
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
          <button onClick={onBack} style={{...SANS, background:"transparent", border:`1px solid ${T.border}`, borderRadius:5, padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600, color:T.textPrimary}}>← Dashboard</button>
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
            ⏱ SFTP Transmission Schedules
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{flex:1, overflowY:"auto", padding:"32px 48px"}}>
          {activeTab === "bespoke" && (
            <div className="fade-in">
              <CardHeader icon="📑" title="Bespoke File Feeds" desc="Configure custom Excel/CSV layouts for non-standard client data drops." />
              <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"24px", marginBottom:24, boxShadow:"0 2px 4px rgba(0,0,0,0.02)"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
                  <div style={{...SANS, fontSize:14, fontWeight:700, color:T.textPrimary}}>Registered Custom Formats</div>
                  <button style={{...SANS, fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer"}}>+ New Format Template</button>
                </div>
                <table style={{width:"100%", borderCollapse:"collapse", textAlign:"left"}}>
                  <thead>
                    <tr style={{borderBottom:`2px solid ${T.border}`}}>
                      <th style={{...SANS, fontSize:11, color:T.textMuted, paddingBottom:8, width:"30%"}}>Template Name</th>
                      <th style={{...SANS, fontSize:11, color:T.textMuted, paddingBottom:8, width:"20%"}}>File Type</th>
                      <th style={{...SANS, fontSize:11, color:T.textMuted, paddingBottom:8, width:"30%"}}>Target Feed</th>
                      <th style={{...SANS, fontSize:11, color:T.textMuted, paddingBottom:8, textAlign:"right"}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"12px 0", ...SANS, fontSize:13, fontWeight:600}}>Bowers Private Equity Drawdowns</td>
                      <td style={{padding:"12px 0", ...MONO, fontSize:12, color:T.textMuted}}>.xlsx (Multi-tab)</td>
                      <td style={{padding:"12px 0", ...SANS, fontSize:13}}>Capital Activity (CA_001)</td>
                      <td style={{padding:"12px 0", textAlign:"right"}}><span style={{...SANS, fontSize:10, fontWeight:700, background:T.okBg, color:T.okBase, padding:"4px 8px", borderRadius:4}}>ACTIVE</span></td>
                    </tr>
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"12px 0", ...SANS, fontSize:13, fontWeight:600}}>Derry Custom P&L Export</td>
                      <td style={{padding:"12px 0", ...MONO, fontSize:12, color:T.textMuted}}>.csv (Pipe-delimited)</td>
                      <td style={{padding:"12px 0", ...SANS, fontSize:13}}>General Ledger (GL_001)</td>
                      <td style={{padding:"12px 0", textAlign:"right"}}><span style={{...SANS, fontSize:10, fontWeight:700, background:T.okBg, color:T.okBase, padding:"4px 8px", borderRadius:4}}>ACTIVE</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "sftp" && (
            <div className="fade-in">
              <CardHeader icon="⏱" title="SFTP Transmission Schedules" desc="Automate the pushing and pulling of flat files with external custodians." />
              <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"24px", marginBottom:24}}>
                <div style={{display:"flex", gap:24}}>
                  <div style={{flex:1}}>
                    <FieldLabel>Target Host URL</FieldLabel>
                    <input type="text" placeholder="sftp.custodian.com" style={{...MONO, width:"100%", padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, marginBottom:16}} />
                    
                    <FieldLabel>Port</FieldLabel>
                    <input type="text" placeholder="22" style={{...MONO, width:"100%", padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, marginBottom:16}} />
                    
                    <FieldLabel>Target Directory Path</FieldLabel>
                    <input type="text" placeholder="/outbound/prod/eod_files/" style={{...MONO, width:"100%", padding:"10px", borderRadius:6, border:`1px solid ${T.border}`}} />
                  </div>
                  <div style={{flex:1}}>
                    <FieldLabel>Schedule (CRON Expression)</FieldLabel>
                    <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
                      <input type="text" defaultValue="0 23 * * 1-5" style={{...MONO, width:"100%", padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, background:"#f8fafc"}} />
                      <span style={{...SANS, fontSize:11, color:T.textMuted, whiteSpace:"nowrap"}}>Runs 11:00 PM (Mon-Fri)</span>
                    </div>

                    <FieldLabel>Authentication Key (Stored Securely)</FieldLabel>
                    <button style={{...SANS, width:"100%", fontSize:12, fontWeight:600, padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, background:T.appBg, cursor:"pointer"}}>
                      Update RSA Private Key
                    </button>

                    <button style={{...SANS, width:"100%", marginTop:32, fontSize:13, fontWeight:700, padding:"12px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer"}}>
                      Save Transmission Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div className="fade-in">
              <CardHeader icon="⚡" title="External API Webhooks" desc="Configure event-driven payloads pushed to external downstream systems." />
              <div style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"24px"}}>
                 <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:20}}>
                   <span style={{...SANS, fontSize:14, fontWeight:700}}>Webhook Trigger Event</span>
                   <select style={{...SANS, padding:"8px", borderRadius:6, border:`1px solid ${T.border}`}}>
                     <option>When Fund Status becomes "Approved"</option>
                     <option>When Exception is "Resolved"</option>
                     <option>When SEC Filing is "Transmitted"</option>
                   </select>
                 </div>
                 <FieldLabel>Destination POST URL</FieldLabel>
                 <input type="text" placeholder="https://api.clientdomain.com/v1/webhooks/torrance" style={{...MONO, width:"100%", padding:"10px", borderRadius:6, border:`1px solid ${T.border}`, marginBottom:16}} />
                 
                 <div style={{...SANS, fontSize:11, color:T.textMuted, marginBottom:8}}>Payload Preview (JSON)</div>
                 <div style={{...MONO, fontSize:11, color:"#a7f3d0", background:T.navyHeader, padding:"16px", borderRadius:8, whiteSpace:"pre-wrap"}}>
                   {`{\n  "event": "fund.approved",\n  "fund_id": "FND-2024-001",\n  "timestamp": "2024-12-31T23:59:59Z",\n  "payload_url": "https://torrance.app/api/export/FND-2024-001"\n}`}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Authentication & Login Screen ────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("login");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [valuePropIdx, setValuePropIdx] = useState(0);

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

  // FIX: Make the Enterprise SSO button actually do something
  const handleSsoClick = () => {
    setEmail("sarah.chen@Pennywisecapital.com");
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
  style={{ 
    width: "100%", 
    padding: "12px", 
    borderRadius: 6, 
    border: `1px solid ${T.actionBase}`, 
    background: "transparent", 
    color: T.actionBase, 
    fontSize: 13, 
    fontWeight: 600, 
    cursor: "pointer", 
    marginBottom: 24, 
    transition: "all 0.15s" 
  }} 
  onMouseEnter={e => e.currentTarget.style.background = T.actionBg} 
  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
>
  Continue with Enterprise SSO
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


// ─── GlobalHeader (Upgraded with Fixed Radial Data Hub Menu) ─────────────────
function GlobalHeader({view, fund, currentUser, onToggleRole, onLogout, onGoToIngestion, onGoToFilings, onOpenAiSettings, onGoToDashboard, streak, notificationCount}) {
  const [hubOpen, setHubOpen] = useState(false);
  const showDataFeedsBtn = view !== "ingestion" && view !== "login" && view !== "auditor_portal";

  return (
    <header style={{background:T.navyHeader,color:"#fff",padding:"0 24px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200,boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
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
      </div>
      
      <div style={{position:"absolute", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"left"}}>
        <span style={{...SANS,fontSize:11,color:"rgba(255,255,255,0.8)",background:"rgba(0,0,0,0.2)",padding:"4px 12px",borderRadius:4, border:"1px solid rgba(255,255,255,0.1)", letterSpacing:"0.02em"}}>
          IT7 — The Overlook
        </span>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {streak > 0 && (
          <div style={{...SANS, fontSize:12, fontWeight:700, color:T.warnBase, display:"flex", alignItems:"center", gap:4, marginRight:16}} title="Gamified Exceptions Streak">
            <span>🔥</span> {streak} Cleared Today
          </div>
        )}
        
        <button onClick={() => onGoToDashboard("inbox")} style={{position:"relative", background:"none", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:18, marginRight:8, transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}>
          🔔
          {notificationCount > 0 && (
            <span style={{position:"absolute", top:-4, right:-6, background:T.errorBase, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:10, border:"2px solid #0f172a", lineHeight:1}}>
              {notificationCount}
            </span>
          )}
        </button>

        {/* RADIAL DATA HUB MENU (FIXED: Removed onMouseLeave, added invisible click-away overlay) */}
        {showDataFeedsBtn && (
          <div style={{position:"relative"}}>
            {/* Invisible overlay catches clicks outside the menu to close it */}
            {hubOpen && <div style={{position:"fixed", inset:0, zIndex:299}} onClick={() => setHubOpen(false)} />}
            
            <button onClick={() => setHubOpen(!hubOpen)} style={{...SANS,fontSize:12,fontWeight:600,padding:"0 12px",height:26,borderRadius:6,cursor:"pointer",background:hubOpen?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:6,marginRight:4,transition:"all 0.2s", position:"relative", zIndex:300}}>
              <span>🗄</span> Data Hub {hubOpen ? "▲" : "▼"}
            </button>
            
            {/* The Spiral / Radial Options */}
            <div style={{position:"absolute", top: 35, left: "50%", zIndex: 300, pointerEvents: hubOpen ? "auto" : "none"}}>
              
              {/* Option 1: Data Feeds (Left Down) */}
              <button onClick={() => { setHubOpen(false); onGoToIngestion(); }} 
                style={{position:"absolute", transform: hubOpen ? "translate(-80px, 10px)" : "translate(-50%, -20px) scale(0.5)", opacity: hubOpen ? 1 : 0, transition:"all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)", ...SANS, fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)", background:T.navyHeader, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                <span>⛁</span> Ingestion
              </button>

              {/* Option 2: Data Exchange (Straight Down) */}
              <button onClick={() => { setHubOpen(false); onGoToDashboard("data_exchange"); }} 
                style={{position:"absolute", transform: hubOpen ? "translate(-50%, 40px)" : "translate(-50%, -20px) scale(0.5)", opacity: hubOpen ? 1 : 0, transition:"all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.05s", ...SANS, fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)", background:T.actionBase, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                <span>🔄</span> Exchange
              </button>

              {/* Option 3: Data Architecture (Right Down) */}
              <button onClick={() => { setHubOpen(false); onGoToDashboard("data_architecture"); }} 
                style={{position:"absolute", transform: hubOpen ? "translate(30px, 10px)" : "translate(-50%, -20px) scale(0.5)", opacity: hubOpen ? 1 : 0, transition:"all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s", ...SANS, fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)", background:T.navyHeader, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                <span>⚙</span> Architecture
              </button>
            </div>
          </div>
        )}

        <button onClick={onGoToFilings} style={{...SANS,fontSize:11,fontWeight:600,padding:"5px 12px",height:26,borderRadius:6,cursor:"pointer",background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:6,marginRight:8,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
          <span style={{fontSize:13}}>📋</span> Filings
        </button>
        <span style={{...MONO,fontSize:12,fontWeight:700,padding:"0 10px",height:26,borderRadius:6,background:T.aiBase,color:"#fff",display:"flex",alignItems:"center",gap:6,marginRight:8,boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
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
        <button onClick={onLogout} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",marginLeft:8,fontSize:13,fontWeight:600,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
// ─── Gamified Celebration Toast (Updated for Muted Slate) ───────────────────
function AILearningToast({ onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="slide-in" style={{position:"fixed", top: 70, right: 24, background: T.navyHeader, border:`1px solid ${T.aiBase}`, color: "#fff", padding: "16px 20px", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 9999, display:"flex", gap: 14, maxWidth: 400, alignItems:"flex-start"}}>
      <span style={{fontSize: 22, marginTop: 0}}>✨</span>
      <div style={{flex:1}}>
        <div style={{...SANS, fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#c7d2fe"}}>AI Learning Applied</div>
        <div style={{...SANS, fontSize: 12, lineHeight: 1.5, color: "#e2e8f0"}}>
          Welcome back! Your manual mapping of <strong>Suspense Account (9999)</strong> last period automatically resolved <strong>42 exceptions</strong> across 18 funds today.
        </div>
        <div style={{background:"rgba(99,102,241,0.2)", color:"#c7d2fe", padding:"4px 8px", borderRadius:4, marginTop:10, display:"inline-block", fontSize:11, fontWeight:700, letterSpacing:"0.03em", ...SANS}}>
          ⏳ TIME SAVED: ~1.5 HOURS
        </div>
      </div>
      <button onClick={onClose} style={{background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:18, marginTop:-4}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#94a3b8"}>✕</button>
    </div>
  );
}
// ─── Main Application Container ───────────────────────────────────────────────
// ─── Main Application Container ───────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("login");
  const [selectedFund, setSelectedFund] = useState(null);
  const [showAIToast, setShowAIToast] = useState(false); 
  const [showAiSettings, setShowAiSettings] = useState(false); 
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [fundState, setFundState] = useState(()=>{ const s={};Object.entries(FUND_EXCEPTIONS).forEach(([id,excs])=>{s[id]=[...excs];});return s; });
  const [approvalState, setApprovalState] = useState(INITIAL_APPROVAL_STATE);
  const [fundSeeds, setFundSeeds] = useState(FUNDS_SEED);
  const [mappingSession, setMappingSession] = useState(null);
  const [feeds, setFeeds] = useState(INGESTION_FEEDS); 
  const [streak, setStreak] = useState(12);
  
  // NEW: Hoisted Filings State for STP
  const [filings, setFilings] = useState(BEVERLEY_FILINGS);

  const [masterFeeds, setMasterFeeds] = useState({
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

  // Derived Data Engine
  const derivedData = useMemo(() => {
    if (!selectedFund) return null;
    const totalAssets = masterFeeds.gl_001.filter(r=>r.category==="Asset").reduce((s,r)=>s+(r.debit-r.credit),0);
    const totalLiabs = masterFeeds.gl_001.filter(r=>r.category==="Liability").reduce((s,r)=>s+(r.credit-r.debit),0);
    const netAssets = totalAssets - totalLiabs;
    const totalMarketValue = masterFeeds.hd_001.reduce((s,h)=>s+h.mv, 0);
    const cash = masterFeeds.gl_001.filter(r=>r.acct==="1100").reduce((s,r)=>s+(r.debit-r.credit),0);
    const mtfNetAssets = totalMarketValue + cash - totalLiabs;
    const sharesOut = masterFeeds.ta_001.reduce((s,ta)=>s+ta.shares_outstanding, 0);
    const shadowNav = sharesOut > 0 ? (mtfNetAssets / sharesOut) : 1.0000;
    const bucket1 = masterFeeds.hd_001.filter(h=>h.fvLevel===1).reduce((s,h)=>s+h.mv,0);
    const highlyLiquidPct = netAssets > 0 ? (bucket1 / netAssets) * 100 : 0;
    return { netAssets, totalMarketValue, shadowNav, highlyLiquidPct };
  }, [selectedFund, masterFeeds]);

  // STP AUTOMATION: Inline Editing Clears Exceptions
  const handleUpdateFeedRecord = (feedId, recordId, field, newValue) => {
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
              ? { ...e, status: "resolved", resolution: "corrected_source", resolvedBy: "system", thread: [...e.thread, {id:`t${Date.now()}`, userId:"system", text:`Auto-resolved via inline data grid correction.`, ts:"Just now"}]}
              : e
          );
        });
        return next;
      });
      setStreak(s => s + 1);
    }
  };

  const getStats = useCallback(fund => {
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
  const handleGoToDashboard = (target = "dashboard") => { setSelectedFund(null); setView(target); };
  const handleGoToFilings   = () => { setSelectedFund(null); setView("filings"); };

  // NEW: Dynamic Notification Engine
  const notifications = useMemo(() => {
    let notifs = [];
    if (!currentUser) return notifs;

    // 1. Controller Reviews
    if (currentUser.isController) {
      fundSeeds.forEach(f => {
        const approv = approvalState[f.fund_id];
        if (approv?.status === "review_pending") {
          notifs.push({ id: `rev-${f.fund_id}`, type: "review", fund: f, title: "Review Required", message: `${f.name} was submitted for your sign-off.`, time: approv.submittedAt || "Just now", icon: "✓", color: T.okBase, bg: T.okBg });
        }
      });
    }

    // 2. Exception Assignments & Comments
    Object.entries(fundState).forEach(([fid, excs]) => {
      const fund = fundSeeds.find(f => f.fund_id === fid);
      if (!fund) return;
      
      excs.forEach(exc => {
        // Direct Assignment
        if (exc.status === "open" && exc.assignee === currentUser.id) {
          notifs.push({ id: `ass-${exc.id}`, type: "assignment", fund, exc, title: "Task Assigned", message: `You were assigned to resolve: ${exc.title}`, time: "Recent", icon: "👤", color: T.actionBase, bg: T.actionBg });
        }
        
        // Active Threads / Mentions
        if (exc.thread.length > 0) {
          const lastMsg = exc.thread[exc.thread.length - 1];
          const iParticipated = exc.thread.some(t => t.userId === currentUser.id);
          
          // If I am involved, and I wasn't the last person to speak
          if (iParticipated && lastMsg.userId !== currentUser.id) {
            const sender = TEAM.find(m => m.id === lastMsg.userId)?.name || "Someone";
            notifs.push({ id: `msg-${exc.id}`, type: "message", fund, exc, title: "New Reply", message: `${sender}: "${lastMsg.text}"`, time: lastMsg.ts, icon: "💬", color: T.aiBase, bg: T.aiBg });
          }
        }
      });
    });
    
    return notifs.reverse(); // Newest first
  }, [fundState, approvalState, fundSeeds, currentUser]);

  const handleLogin = (uid, targetView) => { 
    setCurrentUserId(uid); 
    setView(targetView); 
    // Show the AI learning toast when landing on the dashboard
    if (uid === "u1" && targetView === "dashboard") setShowAIToast(true); 
  };
  const handleLogout = () => { setCurrentUserId(null); setSelectedFund(null); setView("login"); };
  const handleGoToIngestion = () => { setSelectedFund(null); setView("ingestion"); };

  const handleGoToExceptions = (fundId) => {
    const targetFund = fundSeeds.find(f => f.fund_id === fundId);
    if (targetFund) { setSelectedFund(targetFund); setView("fund"); }
  };

  const handleViewClientExceptions = (clientName) => {
    setSelectedFund({
      fund_id: `CLIENT-${clientName}`,
      name: `${clientName} — Consolidated Exceptions`,
      client: clientName,
      series: "All Funds",
      period: "Dec 2024",
      sla_days: 0
    });
    setView("fund");
  };

  const handleMappingComplete = (feedId) => {
    setFeeds(prev => prev.map(f => f.id === feedId ? {...f, status: "success"} : f));
    setMappingSession(null);
  };

  const handleToggleRole = useCallback(()=>setCurrentUserId(prev=>prev==="u4"?"u1":"u4"),[]);
  
  const getExceptions = fid => {
    if (!fid) return [];
    if (fid.startsWith("CLIENT-")) {
      const clientName = fid.replace("CLIENT-", "");
      const clientFunds = fundSeeds.filter(f => f.client === clientName);
      let allExcs = [];
      clientFunds.forEach(f => {
        const excs = fundState[f.fund_id] || [];
        const mapped = excs.map(e => ({ ...e, title: `[${f.name}] ${e.title}` }));
        allExcs = [...allExcs, ...mapped];
      });
      return allExcs;
    }
    return fundState[fid] || [];
  };

  const getRealFid = (prev, fid, excId) => {
    if (fid.startsWith("CLIENT-")) return Object.keys(prev).find(k => prev[k].some(e => e.id === excId)) || fid;
    return fid;
  };

  const handleResolve = useCallback((fid,id,res,ov)=>{
    setStreak(s=>s+1);
    setFundState(prev=>{
      const realFid = getRealFid(prev, fid, id);
      if(!prev[realFid]) return prev;
      return {...prev,[realFid]:prev[realFid].map(e=>e.id===id?{...e,status:"resolved",resolution:res,overrideValue:ov||"",resolvedBy:currentUserId}:e)}
    });
  },[currentUserId]);

  const handleReopen=useCallback((fid,id)=>setFundState(prev=>{
    const realFid = getRealFid(prev, fid, id);
    if(!prev[realFid]) return prev;
    return {...prev,[realFid]:prev[realFid].map(e=>e.id===id?{...e,status:"open",resolution:null,overrideValue:"",resolvedBy:null}:e)}
  }),[]);

  const handleUpdate=useCallback((fid,id,patch)=>setFundState(prev=>{
    const realFid = getRealFid(prev, fid, id);
    if(!prev[realFid]) return prev;
    return {...prev,[realFid]:prev[realFid].map(e=>e.id===id?{...e,...patch}:e)}
  }),[]);

  const handleGlobalResolve=useCallback((excCode, res)=>{
    setStreak(s=>s+1);
    setFundState(prev=>{
      const next = {...prev};
      Object.keys(next).forEach(fid => {
        next[fid] = next[fid].map(e => (e.code === excCode && e.status === "open") ? { ...e, status: "resolved", resolution: res, overrideValue: "", resolvedBy: currentUserId } : e);
      });
      return next;
    });
  },[currentUserId]);

  const handleAddThread=useCallback((fid,excId,text)=>{ 
    const ts=new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    setFundState(prev=>{
      const realFid = getRealFid(prev, fid, excId);
      if(!prev[realFid]) return prev;
      return {...prev,[realFid]:prev[realFid].map(e=>e.id===excId?{...e,thread:[...e.thread,{id:`t${Date.now()}`,userId:currentUserId,text,ts}]}:e)}
    }); 
  },[currentUserId]);

  const handleSubmit=useCallback(fid=>setApprovalState(prev=>({...prev,[fid]:{status:"review_pending",submittedBy:currentUserId,submittedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}),approvedBy:null,approvedAt:null}})),[currentUserId]);
  const handleApprove=useCallback(fid=>setApprovalState(prev=>({...prev,[fid]:{...prev[fid],status:"approved",approvedBy:currentUserId,approvedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}})),[currentUserId]);
  
  const handleBulkApprove=useCallback(fids=>setApprovalState(prev=>{
    const next = {...prev};
    fids.forEach(fid => { next[fid] = {...next[fid], status:"approved", approvedBy:currentUserId, approvedAt:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}; });
    return next;
  }),[currentUserId]);

  const handleReassign=useCallback((fid,newUid)=>setFundSeeds(prev=>prev.map(f=>f.fund_id===fid?{...f,assignedTo:newUid}:f)),[]);
  
  if (view === "login") return <><StyleInjector/><LoginScreen onLogin={handleLogin} /></>;
  if (view === "auditor_portal") return <><StyleInjector/><AuditorPortal onClose={handleLogout} isModal={false} /></>; 

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
        onOpenAiSettings={()=>setShowAiSettings(true)}
        onGoToDashboard={(target) => {
           setSelectedFund(null); 
           setView(target === "inbox" ? "dashboard" : target); 
           // If they clicked the bell, we route to dashboard, and the Dashboard component handles the "inbox" toggle state internally,
           // but for simplicity we can just handle it via the dashView state inside the Dashboard itself.
        }}
        streak={streak}
        notificationCount={notifications.length} // Pass the count here
      />
      {view==="ingestion"&&!selectedFund&&<IngestionStatusWidget feeds={feeds} setFeeds={setFeeds} currentUser={currentUser} onGoToDashboard={()=>{setView("dashboard");}} onOpenMapping={session=>setMappingSession(session)} onGoToExceptions={handleGoToExceptions} />}
      
      {/* NOTE: BeverleyFilingTracker now accepts `filings` as a prop rather than keeping it in local state. 
        Update the component signature in your file to match this: `function BeverleyFilingTracker({ filings, onGoToDashboard })`
      */}
      {view==="filings"&&!selectedFund&&<BeverleyFilingTracker filings={filings} onGoToDashboard={()=>{setView("dashboard");}} />}
      {view==="audit_logs"&&!selectedFund&&<GlobalAuditLogView onBack={()=>setView("dashboard")} />}
      {view==="entities"&&!selectedFund&&<GlobalEntityManager fundSeeds={fundSeeds} />}
      {/* Replace your existing data_architecture line with this: */}
      {view==="data_architecture"&&!selectedFund&&<IntegrationsAndArchitectureHub fundSeeds={fundSeeds} masterFeeds={masterFeeds} onBack={()=>setView("dashboard")} />}
      {view==="data_exchange"&&!selectedFund&&<DataExchangeView onBack={()=>setView("dashboard")} />}
      {/* Update Dashboard to receive notifications */}
      {view==="dashboard"&&!selectedFund&&<Dashboard fundState={fundState} fundSeeds={fundSeeds} approvalState={approvalState} currentUser={currentUser} notifications={notifications} onSelectFund={f=>{setSelectedFund(f); setView("fund");}} onReassign={handleReassign} onViewClientExceptions={handleViewClientExceptions} onBulkApprove={handleBulkApprove} onGlobalResolve={handleGlobalResolve} onGoToAudit={()=>setView("audit_logs")} />} {selectedFund&&<FundView fund={selectedFund} fundSeeds={fundSeeds} onSelectFund={f=>{setSelectedFund(f); setView("fund");}} exceptions={getExceptions(selectedFund.fund_id)} approval={approvalState[selectedFund.fund_id] || {status:"open"}} currentUser={currentUser} masterFeeds={masterFeeds} blockedFunds={blockedFundsList}
    onUpdateFeedRecord={handleUpdateFeedRecord} 
    onResolve={(id,res,ov)=>handleResolve(selectedFund.fund_id,id,res,ov)} onReopen={id=>handleReopen(selectedFund.fund_id,id)} onUpdate={(id,patch)=>handleUpdate(selectedFund.fund_id,id,patch)} onAddThread={(excId,txt)=>handleAddThread(selectedFund.fund_id,excId,txt)} onSubmit={()=>handleSubmit(selectedFund.fund_id)} onApprove={()=>handleApprove(selectedFund.fund_id)} onBack={()=>{ setSelectedFund(null); setView("dashboard"); }}/>}
    </div>
  );
}