import { MONO } from '../theme/tokens';

export const fmtUSD     = (n: number | null | undefined) => n==null?"—":n<0?`($${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})`:`$${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;
export const fmtCompact = (n: number) => n>=1e9?`$${(n/1e9).toFixed(2)}B`:`$${(n/1e6).toFixed(1)}M`;
export const fmtNum     = (n: number) => n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
export const fmtShares  = (n: number, dec=0) => n===0?"—":n.toLocaleString("en-US",{minimumFractionDigits:dec,maximumFractionDigits:dec});
export const fmtPct     = (n: number) => `${n.toFixed(2)}%`;
export const fmtMono    = (n: string | number, neg?: boolean) => <span style={{...MONO,color:neg?"":undefined}}>{n}</span>;

export const fmtPdfUSD = (n: number | null | undefined) => n == null ? "—" : n < 0 ? `($${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2})})` : `$${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;
