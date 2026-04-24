import type { TeamMember } from '../types';

export const TEAM: TeamMember[] = [
  {id:"u1",name:"Sarah Chen",  role:"Senior Accountant",initials:"SC",color:"#6366f1",isController:false},
  {id:"u2",name:"Marcus Reid", role:"Accountant",       initials:"MR",color:"#0891b2",isController:false},
  {id:"u3",name:"Priya Nair",  role:"Accountant",       initials:"PN",color:"#d97706",isController:false},
  {id:"u4",name:"James Okafor",role:"Controller",       initials:"JO",color:"#059669",isController:true },
  {id:"u5",name:"Jennifer Liu",role:"Senior Accountant",initials:"JL",color:"#e11d48",isController:false},
  {id:"u_ai",name:"Torrance AI",role:"AI Agent",        initials:"AI",color:"#6366f1",isController:false},
];
export const CURRENT_USER_ID = "u1";
export const SLA_CONFIGS = [
  {color:"#dc3545",bg:"#fef2f2",border:"#fecaca",icon:"🔴"},
  {color:"#d97706",bg:"#fffbeb",border:"#fde68a",icon:"🟡"},
  {color:"#059669",bg:"#ecfdf5",border:"#a7f3d0",icon:"🟢"},
];
