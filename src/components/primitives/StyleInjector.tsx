import React, { useEffect } from 'react';
import { GLOBAL_CSS } from '../../theme/tokens';

export function StyleInjector() {
  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);

    // Force meta color-scheme to override Chrome
    let meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta') as HTMLMetaElement;
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
