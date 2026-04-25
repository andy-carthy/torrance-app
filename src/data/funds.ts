import type { FundSeed, ApprovalRecord } from '../types';

export const FUNDS_SEED: FundSeed[] = [
  {fund_id:"FND-2024-001",name:"Pennywise Global Diversified Fund",        series:"Series I",  client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:687400000, prior_net_assets: 654541160, sla_days:1,assignedTo:"u1", fundType:"Hedge Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-002",name:"Pennywise Fixed Income Opportunities Fund",series:"Series II", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:312000000, prior_net_assets: 310500000, sla_days:3,assignedTo:"u2", fundType:"Interval Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-007",name:"Pennywise Emerging Markets Fund",          series:"Series III",client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:450000000, prior_net_assets: 395000000, sla_days:2,assignedTo:"u1", fundType:"Interval Fund", requiredFilings:["N-PORT", "N-CEN"]}, // High Variance!
  {fund_id:"FND-2024-008",name:"Pennywise High Yield Fund",                series:"Series IV", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:820000000, prior_net_assets: 818000000, sla_days:4,assignedTo:"u2", fundType:"Hedge Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-009",name:"Pennywise Short Duration Gov Fund",        series:"Series V",  client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:150000000, prior_net_assets: 149500000, sla_days:0,assignedTo:"u3", fundType:"Money Market", requiredFilings:["N-MFP"]},
  {fund_id:"FND-2024-010",name:"Pennywise Municipal Bond Fund",            series:"Series VI", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:290000000, prior_net_assets: 291000000, sla_days:1,assignedTo:"u1", fundType:"Interval Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-011",name:"Pennywise Tech Innovators Fund",           series:"Series VII",client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:560000000, prior_net_assets: 505000000, sla_days:5,assignedTo:"u5", fundType:"ETF", requiredFilings:["N-PORT", "N-CEN"]}, // High Variance!
  {fund_id:"FND-2024-012",name:"Pennywise Dividend Income Fund",           series:"Series I",  client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:340000000, prior_net_assets: 338000000, sla_days:2,assignedTo:"u2", fundType:"Tender Offer Fund", requiredFilings:["N-PORT", "N-CEN"]},
  {fund_id:"FND-2024-013",name:"Pennywise Real Estate Equity Fund",        series:"Series II", client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:210000000, prior_net_assets: 210500000, sla_days:6,assignedTo:"u1", fundType:"Real Estate Fund", requiredFilings:["PF"]},
  {fund_id:"FND-2024-014",name:"Pennywise ESG Leaders Fund",               series:"Series III",client:"Pennywise Capital Advisors", period:"December 31, 2024",net_assets:180000000, prior_net_assets: 179000000, sla_days:3,assignedTo:"u3", fundType:"Closed-End Fund", requiredFilings:["N-PORT", "N-CEN"]},
  
  {fund_id:"FND-2024-003",name:"Bowers Growth Equity Fund",                series:"Series I",  client:"Bowers Asset Management",   period:"December 31, 2024",net_assets:1450000000, prior_net_assets: 1445000000, sla_days:0,assignedTo:"u5", fundType:"Closed-End Fund", requiredFilings:["N-PORT", "N-CEN"]},
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

export const INITIAL_APPROVAL_STATE: Record<string, ApprovalRecord> = {
  "FND-2024-003":{status:"review_pending",submittedBy:"u5",submittedAt:"Dec 31, 2:22 PM",approvedBy:null,approvedAt:null},
  "FND-2024-004":{status:"approved",      submittedBy:"u3",submittedAt:"Dec 31, 9:15 AM",approvedBy:"u4",approvedAt:"Dec 31, 4:04 PM"},
}; // Others default to 'open' dynamically

// ═══════════════════════════════════════════════════════════════════════════════
// IT6: NEW FEATURE DATA (Touchless, EDGAR, AI Params, SOC 1)
// ═══════════════════════════════════════════════════════════════════════════════
export const TOUCHLESS_STATS = {
  "FND-2024-001": { stage:"Triage",    touchlessExcs:3, totalExcs:8,  aiAccepted:3, humanResolved:0, overrides:0  },
  "FND-2024-002": { stage:"Triage",    touchlessExcs:1, totalExcs:1,  aiAccepted:1, humanResolved:0, overrides:0  },
  "FND-2024-003": { stage:"Review",    touchlessExcs:1, totalExcs:4,  aiAccepted:1, humanResolved:1, overrides:0  },
  "FND-2024-004": { stage:"Approved",  touchlessExcs:0, totalExcs:0,  aiAccepted:0, humanResolved:0, overrides:0  },
  "FND-2024-005": { stage:"Triage",    touchlessExcs:0, totalExcs:3,  aiAccepted:0, humanResolved:0, overrides:0  },
  "FND-2024-006": { stage:"Ingest",    touchlessExcs:0, totalExcs:2,  aiAccepted:0, humanResolved:0, overrides:0  },
};
