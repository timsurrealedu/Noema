import {createHash} from "node:crypto";
import {getDatabase} from "./db.mjs";

const nodeId=(type,id)=>`${type}:${id}`;
const edgeId=(source,target,kind,provenance)=>createHash("sha256").update(`${source}\0${target}\0${kind}\0${provenance}`).digest("hex");
const href={task:id=>`/tasks?open=${id}`,event:id=>`/calendar?open=${id}`,note:id=>`/vault?open=${id}`,project:id=>`/projects?open=${id}`,capture:id=>`/capture?open=${id}`,asset:id=>`/assets/${id}/annotate`,automation:id=>`/automations?open=${id}`,course:id=>`/study?course=${id}`,assignment:id=>`/study?assignment=${id}`};
const tableSpecs=[
  ["task","tasks","id,title","archived=0",row=>row.title],
  ["event","events","id,title","deleted_at IS NULL",row=>row.title],
  ["note","notes","id,title","trashed=0",row=>row.title],
  ["project","projects","id,name","1=1",row=>row.name],
  ["capture","captures","id,source_label","1=1",row=>`Capture · ${row.source_label}`],
  ["asset","assets","id,name","1=1",row=>row.name],
  ["automation","automations","id,name","1=1",row=>row.name],
  ["course","courses","id,name","archived=0",row=>row.name],
  ["assignment","assignments","id,title","1=1",row=>row.title],
];
const clean=value=>String(value||"Untitled").replace(/[\r\n\t]+/g," ").trim().slice(0,300);

export function syncKnowledgeGraph(db=getDatabase()){
  const nodes=[],edges=[],previous=db.prepare("SELECT MAX(updated_at) value FROM knowledge_nodes").get()?.value,stamp=new Date(Math.max(Date.now(),previous?Date.parse(previous)+1:0)).toISOString(),known=new Set();
  for(const [type,table,columns,where,label] of tableSpecs)for(const row of db.prepare(`SELECT ${columns} FROM ${table} WHERE ${where}`).all()){const id=nodeId(type,row.id);known.add(id);nodes.push({id,type,objectId:row.id,label:clean(label(row)),href:href[type](row.id)})}
  const add=(sourceType,sourceId,targetType,targetId,kind,provenance)=>{const source=nodeId(sourceType,sourceId),target=nodeId(targetType,targetId);if(source!==target&&known.has(source)&&known.has(target))edges.push({id:edgeId(source,target,kind,provenance),source,target,kind,provenance})};
  for(const row of db.prepare("SELECT id,project FROM tasks WHERE archived=0 AND project<>''").all()){const project=db.prepare("SELECT id FROM projects WHERE name=? COLLATE NOCASE").get(row.project);if(project)add("task",row.id,"project",project.id,"belongs-to","tasks.project")}
  for(const row of db.prepare("SELECT project_id,object_type,object_id FROM project_links").all())add("project",row.project_id,row.object_type,row.object_id,"contains","project_links");
  for(const row of db.prepare("SELECT task_id,depends_on_task_id FROM task_dependencies").all())add("task",row.task_id,"task",row.depends_on_task_id,"depends-on","task_dependencies");
  for(const row of db.prepare("SELECT source_note_id,target_note_id FROM note_links").all())add("note",row.source_note_id,"note",row.target_note_id,"links-to","note_links");
  for(const row of db.prepare("SELECT capture_id,asset_id FROM capture_assets").all())add("capture",row.capture_id,"asset",row.asset_id,"has-asset","capture_assets");
  for(const row of db.prepare("SELECT id,course_id FROM assignments").all())add("assignment",row.id,"course",row.course_id,"belongs-to","assignments.course_id");
  const upsertNode=db.prepare("INSERT INTO knowledge_nodes(id,object_type,object_id,label,href,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,href=excluded.href,updated_at=excluded.updated_at"),upsertEdge=db.prepare("INSERT INTO knowledge_edges(id,source_id,target_id,kind,provenance,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at");
  db.exec("BEGIN IMMEDIATE");try{for(const node of nodes)upsertNode.run(node.id,node.type,node.objectId,node.label,node.href,stamp);for(const edge of edges)upsertEdge.run(edge.id,edge.source,edge.target,edge.kind,edge.provenance,stamp);db.prepare("DELETE FROM knowledge_edges WHERE updated_at<>?").run(stamp);db.prepare("DELETE FROM knowledge_nodes WHERE updated_at<>?").run(stamp);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}
  return {nodes:nodes.length,edges:edges.length,updatedAt:stamp};
}

const viewNode=row=>({id:row.id,type:row.object_type,objectId:row.object_id,label:row.label,href:row.href});
export function queryKnowledgeGraph({root="",depth=2,types=[],limit=300,sync=true}={},db=getDatabase()){
  if(sync)syncKnowledgeGraph(db);depth=Math.min(Math.max(Number(depth)||1,1),4);limit=Math.min(Math.max(Number(limit)||300,1),500);const allowed=new Set(types.filter(type=>href[type]));let rows;
  if(root){if(!db.prepare("SELECT id FROM knowledge_nodes WHERE id=?").get(root))throw Object.assign(new Error("Graph root not found"),{status:404});const seen=new Set([root]),frontier=[root];for(let level=0;level<depth&&frontier.length;level++){const current=frontier.splice(0);for(const id of current)for(const edge of db.prepare("SELECT source_id,target_id FROM knowledge_edges WHERE source_id=? OR target_id=? LIMIT 500").all(id,id)){const other=edge.source_id===id?edge.target_id:edge.source_id;if(!seen.has(other)&&seen.size<limit){seen.add(other);frontier.push(other)}}}rows=[...seen].map(id=>db.prepare("SELECT * FROM knowledge_nodes WHERE id=?").get(id))}else rows=db.prepare("SELECT * FROM knowledge_nodes ORDER BY object_type,label LIMIT ?").all(limit);
  if(allowed.size)rows=rows.filter(row=>allowed.has(row.object_type));const ids=new Set(rows.map(row=>row.id)),edges=db.prepare("SELECT * FROM knowledge_edges ORDER BY kind,id").all().filter(edge=>ids.has(edge.source_id)&&ids.has(edge.target_id));return {nodes:rows.map(viewNode),edges:edges.map(edge=>({id:edge.id,source:edge.source_id,target:edge.target_id,kind:edge.kind,provenance:edge.provenance})),meta:{root:root||null,depth,limit,privacy:"Labels and identifiers only; note/capture bodies are excluded."}}
}

export function knowledgePath(source,target,db=getDatabase()){
  syncKnowledgeGraph(db);if(source===target)return {nodes:[viewNode(db.prepare("SELECT * FROM knowledge_nodes WHERE id=?").get(source))],edges:[]};const queue=[source],previous=new Map([[source,null]]),via=new Map();while(queue.length){const id=queue.shift();for(const edge of db.prepare("SELECT * FROM knowledge_edges WHERE source_id=? OR target_id=? LIMIT 500").all(id,id)){const other=edge.source_id===id?edge.target_id:edge.source_id;if(previous.has(other))continue;previous.set(other,id);via.set(other,edge);if(other===target){queue.length=0;break}queue.push(other)}}if(!previous.has(target))throw Object.assign(new Error("No graph path found"),{status:404});const ids=[];for(let id=target;id;id=previous.get(id))ids.push(id);ids.reverse();return {nodes:ids.map(id=>viewNode(db.prepare("SELECT * FROM knowledge_nodes WHERE id=?").get(id))),edges:ids.slice(1).map(id=>{const edge=via.get(id);return {id:edge.id,source:edge.source_id,target:edge.target_id,kind:edge.kind,provenance:edge.provenance}})}}
