import type { Filing } from '../types';

export const BEVERLEY_FILINGS: Filing[] = [  

  // --- N-PORT Filings ---
  {id:"bev-002",fund_id:"FND-2024-002",fund:"Pennywise Fixed Income Opportunities Fund",   client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"filed",      assignedTo:"u2",notes:"SEC Confirmed: #0001234567."},
  {id:"bev-003",fund_id:"FND-2024-007",fund:"Pennywise Emerging Markets Fund",    client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"blocked",    assignedTo:"u1",notes:"Blocked: Missing CUSIP."},
  {id:"bev-005",fund_id:"FND-2024-010",fund:"Pennywise Municipal Bond Fund",      client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"not_started",assignedTo:"u1",notes:"TB open."},
  {id:"bev-007",fund_id:"FND-2024-012",fund:"Pennywise Dividend Income FUnd",     client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"blocked",    assignedTo:"u2",notes:"Blocked: Stale price."},
  {id:"bev-008",fund_id:"FND-2024-014",fund:"Pennywise ESG Leaders Fund",         client:"Pennywise Capital", form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"filed",      assignedTo:"u3",notes:"SEC Confirmed: #0001234568."},
  {id:"bev-009",fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Mgt",  form:"N-PORT", period:"Dec 31, 2024",dueDate:"Jan 30, 2025",daysLeft:29, status:"blocked",    assignedTo:"u5",notes:"Blocked: NAV mismatch."},
  
  // --- N-CEN Filings ---
  {id:"bev-010",fund_id:"FND-2024-001",fund:"Pennywise Capital",  client:"Pennywise Capital", form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"not_started",assignedTo:"u1",notes:"Awaiting final sign-off."},
  {id:"bev-015",fund_id:"FND-2024-003",fund:"Bowers Asset Managment",     client:"Bowers Asset Mgt",  form:"N-CEN",  period:"Dec 31, 2024",dueDate:"Feb 28, 2025",daysLeft:58, status:"not_started",assignedTo:"u5",notes:""},

  // --- Form PF Filings ---
  {id:"bev-016",fund_id:"FND-2024-008",fund:"Pennywise High Yield Fund Fund",     client:"Pennywise Capital", form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"ready",      assignedTo:"u4",notes:"Risk metrics verified."},
  {id:"bev-017",fund_id:"FND-2024-001",fund:"Pennywise Global Diversified Fund",  client:"Pennywise Capital", form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"blocked",    assignedTo:"u1",notes:"Counterparty exposure calc error."},
  {id:"bev-018",fund_id:"FND-2024-013",fund:"Pennywise Real Estate Equity Fund",  client:"Pennywise Capital", form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"not_started",assignedTo:"u1",notes:""},
  {id:"bev-019",fund_id:"FND-2024-004",fund:"Bowers Multi-Strategy Fund",    client:"Bowers Asset Mgt",  form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"ready",      assignedTo:"u3",notes:"AI validation complete."},
  {id:"bev-020",fund_id:"FND-2024-005",fund:"Derry Credit Opportunities Fund",    client:"Derry Capital Ptrs",form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"not_started",assignedTo:"u3",notes:""},
  {id:"bev-021",fund_id:"FND-2024-006",fund:"Derry Real Assets Fund",        client:"Derry Capital Ptrs",form:"PF",     period:"Dec 31, 2024",dueDate:"Apr 30, 2025",daysLeft:118,status:"filed",      assignedTo:"u1",notes:"SEC Confirmed: #0001234570."},

  // --- N-MFP Filings ---
  {id:"bev-022",fund_id:"FND-2024-009",fund:"Pennywise Short Duration Gov",  client:"Pennywise Capital", form:"N-MFP",  period:"Dec 31, 2024",dueDate:"Jan 07, 2025",daysLeft:6,  status:"blocked",    assignedTo:"u3",notes:"Shadow NAV variance > 0.5%."},

  // --- N-CSR Filings ---
  {id:"bev-023",fund_id:"FND-2024-002",     fund:"Pennywise Fixed Income Opportunities Fund",    client:"Pennywise Capital", form:"N-CSR",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"blocked",    assignedTo:"u4",notes:"Multiple Cross-Checks Failing."},
  {id:"bev-023",fund_id:"FND-2024-007",     fund:"Pennywise Emerging Markets Fund",    client:"Pennywise Capital", form:"N-CSR",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"blocked",    assignedTo:"u4",notes:"Multiple Cross-Checks Failing."},
  {id:"bev-023",fund_id:"FND-2024-010",     fund:"Pennywise Municipal Bond Fund",    client:"Pennywise Capital", form:"N-CSR",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"blocked",    assignedTo:"u4",notes:"Multiple Cross-Checks Failing."},
  {id:"bev-023",fund_id:"FND-2024-012",     fund:"Pennywise Dividend Income Fund",    client:"Pennywise Capital", form:"N-CSR",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"blocked",    assignedTo:"u4",notes:"Multiple Cross-Checks Failing."},
  {id:"bev-023",fund_id:"FND-2024-014",     fund:"Pennywise ESG Leaders Fund",    client:"Pennywise Capital", form:"N-CSR",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"blocked",    assignedTo:"u4",notes:"Multiple Cross-Checks Failing."},
  {id:"bev-023",fund_id:"FND-2024-003",     fund:"Bowers Growth Equity Fund",    client:"Bowers Asset Mgt", form:"N-CSR",    period:"Dec 31, 2024",dueDate:"Mar 31, 2025",daysLeft:90, status:"not_started",    assignedTo:"u4",notes:""},
  


  // --- November Period (For period toggling) ---
  {id:"bev-101",fund_id:"FND-2024-001",fund:"Pennywise Global Diversified",  client:"Pennywise Capital", form:"N-PORT", period:"Nov 30, 2024",dueDate:"Dec 30, 2024",daysLeft:0,  status:"filed",      assignedTo:"u1",notes:"SEC Confirmed: #0001234500."},
  {id:"bev-104",fund_id:"FND-2024-003",fund:"Bowers Growth Equity Fund",     client:"Bowers Asset Mgt",  form:"N-PORT", period:"Nov 30, 2024",dueDate:"Dec 30, 2024",daysLeft:0,  status:"filed",      assignedTo:"u5",notes:"SEC Confirmed: #0001234501."},
];
