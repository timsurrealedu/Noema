const terms=input=>String(input||"").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.slice(0,8)||[];
const reason=(row,words)=>`Matched: ${words.filter(word=>`${row.title||""} ${row.excerpt||""} ${row.text||""}`.toLowerCase().includes(word)).join(", ")}`;

export function selectSkillContext(input,db,limit=12,workspaceId=null){
  const words=[...new Set(terms(input))];
  if(!words.length)return [];
  const query=words.map(word=>`"${word.replaceAll('"','')}"`).join(" OR ");
  const scope=workspaceId?" AND n.workspace_id=?":"",args=workspaceId?[query,workspaceId]:[query];
  const notes=db.prepare(`SELECT n.id,n.title,substr(n.content,1,800) excerpt FROM notes_fts f JOIN notes n ON n.id=f.id WHERE notes_fts MATCH ? AND n.trashed=0${scope} ORDER BY rank LIMIT 8`).all(...args);
  const pattern=`%${words.join("%")}%`;
  const filter=workspaceId?" AND workspace_id=?":"",likeArgs=workspaceId?[pattern,workspaceId]:[pattern];
  const tasks=db.prepare(`SELECT id,title,project||CASE WHEN due='' THEN '' ELSE ' · due '||due END excerpt FROM tasks WHERE archived=0 AND lower(title||' '||project) LIKE ?${filter} ORDER BY updated_at DESC LIMIT 4`).all(...likeArgs);
  const captures=db.prepare(`SELECT id,substr(text,1,120) title,substr(text,1,800) excerpt FROM captures WHERE lower(text) LIKE ?${filter} ORDER BY updated_at DESC LIMIT 4`).all(...likeArgs);
  return [...notes.map(row=>({...row,type:"note",reason:reason(row,words)})),...tasks.map(row=>({...row,type:"task",reason:reason(row,words)})),...captures.map(row=>({...row,type:"capture",reason:reason(row,words)}))].slice(0,limit);
}
