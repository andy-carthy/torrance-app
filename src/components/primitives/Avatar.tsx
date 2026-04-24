import React from 'react';
import { SANS } from '../../theme/tokens';
import type { TeamMember } from '../../types';

export function Avatar({user,size=26}) {
  if(!user)return null;
  return <span title={user.name} style={{width:size,height:size,borderRadius:"50%",background:user.color,color:"#fff",fontSize:size*0.38,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,...SANS}}>{user.initials}</span>;
}
