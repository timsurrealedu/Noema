const terms=value=>[...new Set(String(value||"").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].slice(0,8);
const excerpt=value=>String(value||"").replace(/\s+/g," ").slice(0,800);
const score=(row,words)=>{const title=String(row.title||"").toLowerCase(),body=String(row.excerpt||"").toLowerCase(),hits=words.reduce((total,word)=>total+(title.includes(word)?2:0)+(body.includes(word)?1:0),0);return Math.min(1,Number((hits/(words.length*2)).toFixed(2)))};

export function retrieveSkillContext({query,skill,projectId=null,courseId=null,limit=12,db,workspaceId}){
  if(!workspaceId)throw new Error("Skill context requires a workspace");
  const words=terms(typeof query==="string"?query:JSON.stringify(query));if(!words.length)return {items:[]};
  const fts=words.map(word=>`"${word.replaceAll('"','')}"`).join(" OR "),likes=words.map(word=>`%${word}%`),matches=words.map(()=>"lower(title) LIKE ?").join(" OR "),cap=Math.max(1,Math.min(Number(limit)||12,12));
  const notes=courseId?[]:db.prepare(`SELECT n.id,n.title,substr(n.content,1,800) excerpt FROM notes_fts f JOIN notes n ON n.id=f.id WHERE notes_fts MATCH ? AND n.trashed=0 AND n.workspace_id=?${projectId?" AND EXISTS(SELECT 1 FROM project_links l WHERE l.object_type='note' AND l.object_id=n.id AND l.project_id=?)":""} ORDER BY rank LIMIT ?`).all(fts,workspaceId,...(projectId?[projectId]:[]),cap*2);
  const tasks=db.prepare(`SELECT id,title,coalesce(due_at,'')||CASE WHEN status='' THEN '' ELSE ' · '||status END excerpt FROM tasks WHERE archived=0 AND workspace_id=? AND (${matches})${projectId?" AND project_id=?":""}${courseId?" AND course_id=?":""} ORDER BY updated_at DESC LIMIT ?`).all(workspaceId,...likes,...(projectId?[projectId]:[]),...(courseId?[courseId]:[]),cap*2);
  const captures=courseId?[]:db.prepare(`SELECT c.id,substr(c.text,1,120) title,substr(c.text,1,800) excerpt FROM captures c WHERE c.workspace_id=? AND (${matches.replaceAll("title","c.text")})${projectId?" AND EXISTS(SELECT 1 FROM project_links l WHERE l.object_type='capture' AND l.object_id=c.id AND l.project_id=?)":""} ORDER BY c.updated_at DESC LIMIT ?`).all(workspaceId,...likes,...(projectId?[projectId]:[]),cap*2);
  const items=[["note",notes],["task",tasks],["capture",captures]].flatMap(([objectType,rows])=>rows.map(row=>{const matched=words.filter(word=>`${row.title} ${row.excerpt}`.toLowerCase().includes(word));return {objectType,objectId:row.id,title:row.title,excerpt:excerpt(row.excerpt),retrievalReason:`${objectType==="note"?"FTS":"text"} match for ${skill}: ${matched.join(", ")}`,score:score(row,words)}}));
  return {items:items.sort((a,b)=>b.score-a.score||a.objectType.localeCompare(b.objectType)||a.objectId.localeCompare(b.objectId)).slice(0,cap)};
}
