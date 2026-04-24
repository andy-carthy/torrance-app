import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { AI_DECISION_LOG } from '../../data/aiData';

export function AiDecisionDetailPane({ log }) {
  if (!log) return null;
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      
      {/* 1. Header (Mimicking the standard Exception DetailPane) */}
      <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ padding: '4px 8px', borderRadius: 4, background: log.type === 'autonomous' ? T.okBg : T.actionBg, color: log.type === 'autonomous' ? T.okBase : T.actionBase, ...SANS, fontSize: 11, fontWeight: 700, border: `1px solid ${log.type === 'autonomous' ? T.okBorder : '#bfdbfe'}` }}>
                {log.type === 'autonomous' ? '🛡 Autonomously Resolved' : '👤 Human-Certified'}
              </span>
              <div style={{ ...MONO, fontSize: 12, color: T.textMuted }}>{log.exceptionId}</div>
            </div>
            <h2 style={{ ...SANS, fontSize: 24, fontWeight: 700, color: T.textPrimary, margin: 0 }}>
              {log.details.split('.')[0]}
            </h2>
          </div>
        </div>

        {/* Metadata Strip */}
        <div style={{ display: 'flex', gap: 32, ...SANS, fontSize: 12 }}>
          <div><span style={{ color: T.textMuted, marginRight: 8 }}>Time:</span><span style={{ fontWeight: 600, color: T.textPrimary }}>{log.timestamp}</span></div>
          <div><span style={{ color: T.textMuted, marginRight: 8 }}>Impact:</span><span style={{ fontWeight: 600, color: T.textPrimary }}>{log.impact}</span></div>
          <div><span style={{ color: T.textMuted, marginRight: 8 }}>Model Confidence:</span><span style={{ fontWeight: 600, color: T.aiBase }}>{log.confidence}%</span></div>
        </div>
      </div>

      <div style={{ padding: '32px', flex: 1, overflowY: 'auto', background: '#f8fafc' }}>

        {/* 2. Auto-Correction Execution (Before & After) */}
        <div style={{ ...SANS, fontSize: 13, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12, letterSpacing: '0.05em' }}>Auto-Correction Execution</div>
        <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, padding: '20px', marginBottom: 32, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ flex: 1 }}>
               <div style={{ ...SANS, fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Original Payload Value</div>
               <div style={{ ...MONO, fontSize: 15, color: T.errorBase, textDecoration: 'line-through', background: T.errorBg, padding: '6px 12px', borderRadius: 4, display: 'inline-block' }}>{log.originalValue}</div>
             </div>
             <div style={{ fontSize: 24, color: T.textMuted, padding: '0 20px' }}>→</div>
             <div style={{ flex: 1, textAlign: 'right' }}>
               <div style={{ ...SANS, fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Corrected Ledger Value</div>
               <div style={{ ...MONO, fontSize: 15, color: T.okBase, fontWeight: 700, background: T.okBg, padding: '6px 12px', borderRadius: 4, border: `1px solid ${T.okBorder}`, display: 'inline-block' }}>{log.correctedValue}</div>
             </div>
           </div>
        </div>

        {/* 3. Applied Rule Logic */}
        <div style={{ ...SANS, fontSize: 13, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12, letterSpacing: '0.05em' }}>Applied Rule Logic</div>
        <div style={{ background: T.aiBg, border: `1px solid ${T.aiBorder}`, padding: '20px', borderRadius: 8, marginBottom: 32 }}>
          <div style={{ ...SANS, fontSize: 14, fontWeight: 700, color: T.aiBase, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{fontSize: 18}}>✦</span> {log.rule}
          </div>
          <div style={{ ...SANS, fontSize: 13, color: T.aiDark, lineHeight: 1.6 }}>
            {log.details}
          </div>
        </div>
        
        {/* 4. Activity Thread (Mimics the user audit thread) */}
        <div style={{ ...SANS, fontSize: 13, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12, letterSpacing: '0.05em' }}>Activity & Resolution</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.aiBase, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
          <div>
            <div style={{ ...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Torrance Autonomous Engine</div>
            <div style={{ ...SANS, fontSize: 12, color: T.textMuted, marginTop: 2 }}>{log.timestamp}</div>
            <div style={{ ...SANS, fontSize: 13, color: T.textPrimary, marginTop: 8, background: '#fff', padding: '12px 16px', borderRadius: 8, border: `1px solid ${T.border}` }}>
              Exception flagged, matched to established resolution rule, and auto-resolved with {log.confidence}% confidence. 
              Audit trace locked.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
// ─── SPRINT 4: AI Decision Log Tab (Updated for C-19) ──────────────────────
export function AIDecisionLogTab() {
  const [filter, setFilter] = useState('all');
  const filteredLogs = AI_DECISION_LOG.filter(log => filter === 'all' || log.type === filter);

  const aiCount = AI_DECISION_LOG.filter(l => l.type === 'autonomous').length;
  const humanCount = AI_DECISION_LOG.filter(l => l.type === 'human-certified').length;
  const footingCount = AI_DECISION_LOG.filter(l => l.type === 'footing').length;
  const totalCount = AI_DECISION_LOG.length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.appBg }}>
      <div style={{ padding: '16px 24px', background: T.cardBg, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...SANS, fontSize: 13, color: T.textMuted }}>
          <span style={{ fontWeight: 700, color: T.textPrimary }}>{totalCount} decisions this close period</span> — {aiCount} AI autonomous, {humanCount} human-certified, {footingCount} footing adjustments (LR).
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...SANS, padding: '6px 12px', borderRadius: 4, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }}>
            <option value="all">All Decisions</option>
            <option value="autonomous">Autonomous Only</option>
            <option value="human-certified">Human-Certified Only</option>
            <option value="footing">Footing Adjustments (LR)</option>
          </select>
          <button style={{ ...SANS, padding: '6px 12px', background: T.actionBase, color: '#fff', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Export PDF</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: T.cardBg, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <thead style={{ background: T.appBg }}>
            <tr>
              {['Timestamp', 'Exception', 'Decision Type', 'Rule / Basis', 'Impact', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', ...SANS, fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', borderBottom: `2px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.15s" }} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding: '12px 16px', ...MONO, fontSize: 11, color: T.textMuted, whiteSpace:"nowrap" }}>{log.timestamp}</td>
                <td style={{ padding: '12px 16px', ...MONO, fontSize: 12, fontWeight: 700, color: T.textPrimary }}>{log.exceptionId}</td>
                <td style={{ padding: '12px 16px', ...SANS, fontSize: 11 }}>
                  <span style={{ 
                    color: log.type === 'footing' ? T.warnBase : (log.type === 'autonomous' ? T.okBase : T.actionBase), 
                    fontWeight: 700, 
                    background: log.type === 'footing' ? T.warnBg : (log.type === 'autonomous' ? T.okBg : T.actionBg), 
                    padding: "2px 6px", borderRadius: 4, 
                    border: `1px solid ${log.type === 'footing' ? T.warnBorder : (log.type === 'autonomous' ? T.okBorder : '#bfdbfe')}` 
                  }}>
                    {log.type === 'footing' ? '◈ Algorithmic' : (log.type === 'autonomous' ? '🛡 Autonomous' : '👤 Suggested')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ ...SANS, fontSize: 12, color: T.textPrimary, fontWeight: 600 }}>{log.rule}</div>
                  <div style={{ ...MONO, fontSize: 10, color: log.type === 'footing' ? T.warnBase : T.aiBase, marginTop: 4, background: log.type === 'footing' ? T.warnBg : T.aiBg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${log.type === 'footing' ? T.warnBorder : T.aiBorder}`, display:"inline-block" }}>
                    {log.type === 'footing' ? '◈' : '✦'} Conf: {log.confidence}%
                  </div>
                </td>
                <td style={{ padding: '12px 16px', ...SANS, fontSize: 11, color: T.textMuted }}>{log.impact}</td>
                <td style={{ padding: '12px 16px' }}>
                   <span style={{ padding: '4px 8px', borderRadius: 4, background: T.okBg, color: T.okBase, ...SANS, fontSize: 10, fontWeight: 700, border: `1px solid ${T.okBorder}` }}>
                     ✓ {log.status}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ─── SPRINT 1: Provenance Drilldown Panel (C-06) ─────────────────────────────
export function ProvenancePanel({ trace, onClose }) {
  if (!trace) return null;
  return (
    <div className="slide-in" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 500, background: T.cardBg, borderLeft: `1px solid ${T.border}`, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px', background: T.navyHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <div style={{ ...SANS, color: '#fff', fontSize: 16, fontWeight: 700 }}>Data Provenance</div>
           <div style={{ ...SANS, color: '#8898aa', fontSize: 11, marginTop: 2 }}>Cryptographic lineage trace</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <div style={{ ...SANS, fontSize: 12, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Financial Statement Line</div>
        <div style={{ ...SANS, fontSize: 18, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>{trace.lineItem}</div>
        <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color: T.okBase, marginBottom: 32 }}>{trace.value}</div>

        <div style={{ ...SANS, fontSize: 12, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Derived Target</div>
        <div style={{ ...MONO, fontSize: 12, padding: '10px 12px', background: T.appBg, borderRadius: 6, border: `1px solid ${T.border}`, marginBottom: 24, color: T.textPrimary }}>
          {trace.derivedField}
        </div>

        <div style={{ ...SANS, fontSize: 12, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>AI Decisions & Interventions</div>
        <div style={{ background: T.aiBg, border: `1px solid ${T.aiBorder}`, padding: '16px', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ ...SANS, fontSize: 12, fontWeight: 700, color: T.aiBase, marginBottom: 8, display:"flex", alignItems:"center", gap:6 }}>
            <span>✦</span> Exception {trace.exception.id} — {trace.exception.status}
          </div>
          <div style={{ ...SANS, fontSize: 12, color: T.aiDark, lineHeight: 1.6 }}>
            {trace.aiDecision}
          </div>
        </div>

        <div style={{ ...SANS, fontSize: 12, color: T.textMuted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Raw Payload Source</div>
        {trace.rawRows.map(row => (
           <div key={row.id} style={{ background: T.appBg, border: `1px solid ${T.border}`, padding: '14px', borderRadius: 8 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
               <span style={{ ...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{row.source}</span>
               <span style={{ ...MONO, fontSize: 10, color: T.textMuted, background: T.cardBg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${T.border}` }}>Row {row.id}</span>
             </div>
             <div style={{ ...MONO, fontSize: 11, color: T.textMuted, marginBottom: 8 }}>File: {row.payload}</div>
             <div style={{ ...MONO, fontSize: 12, color: T.errorBase, textDecoration: 'line-through', background: T.errorBg, padding: "4px 8px", borderRadius: 4, display: "inline-block" }}>Original Value: {row.originalValue}</div>
           </div>
        ))}
      </div>
    </div>
  );
}
