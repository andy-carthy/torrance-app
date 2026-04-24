import React, { useState, useRef, useEffect } from 'react';
import { T, SANS, MONO } from '../../theme/tokens';
import type { FundSeed } from '../../types';

export function FundSelectorCombobox({fund, fundSeeds, onSelectFund}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
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


