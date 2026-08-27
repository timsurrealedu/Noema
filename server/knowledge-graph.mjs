import {createHash} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {reindexNoteLinks} from "./core.mjs";
import {scanVault} from "./vault.mjs";

const nodeId=(type,id)=>`${type}:${id}`;
const edgeId=(source,target,kind,provenance)=>createHash("sha256").update(`${source}\0${target}\0${kind}\0${provenance}`).digest("hex");
const href={note:id=>`/vault?open=${id}`,project:id=>`/projects?open=${id}`,task:id=>`/tasks?open=${id}`,event:id=>`/calendar?open=${id}`,capture:id=>`/capture?open=${id}`,asset:id=>`/assets/${id}/annotate`,automation:id=>`/automations?open=${id}`,course:id=>`/study?course=${id}`,assignment:id=>`/study?assignment=${id}`};

const tableSpecs=[
  ["note","notes","id,title","trashed=0",row=>row.title],
  ["project","projects","id,name","1=1",row=>row.name],
  ["task","tasks","id,title","archived=0",row=>row.title],
  ["course","courses","id,name","archived=0",row=>row.name],
  ["assignment","assignments","id,title","1=1",row=>row.title],
  ["event","events","id,title","deleted_at IS NULL",row=>row.title],
  ["capture","captures","id,source_label","1=1",row=>`Capture · ${row.source_label}`],
  ["asset","assets","id,name","1=1",row=>row.name],
  ["automation","automations","id,name","1=1",row=>row.name],
];
const clean=value=>String(value||"Untitled").replace(/[\r\n\t]+/g," ").trim().slice(0,300);

export function syncKnowledgeGraph(db=getDatabase(),workspaceId=null){
  // Auto-scan vault sources if present so obsidian files on disk are fresh in notes table
  if(workspaceId){
    try{
      const sources=db.prepare("SELECT id FROM vault_sources WHERE workspace_id=?").all(workspaceId);
      for(const s of sources){
        try{scanVault(s.id,{id:"system",workspaceId},db)}catch(_){}
      }
    }catch(_){}
  }

  // Ensure notes with wikilinks are indexed
  try{
    const linkedNotes=db.prepare(`SELECT id,content FROM notes WHERE trashed=0 AND content LIKE '%[[%'${workspaceId?" AND workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]));
    for(const n of linkedNotes){
      reindexNoteLinks(n.id,n.content,db,workspaceId);
    }
  }catch(_){}

  const nodes=[],edges=[],previous=db.prepare(`SELECT MAX(updated_at) value FROM knowledge_nodes${workspaceId?" WHERE workspace_id=?":""}`).get(...(workspaceId?[workspaceId]:[]))?.value,stamp=new Date(Math.max(Date.now(),previous?Date.parse(previous)+1:0)).toISOString(),known=new Set();
  
  for(const [type,table,columns,where,label] of tableSpecs){
    const rows=type==="asset"&&workspaceId?db.prepare(`SELECT ${columns} FROM assets WHERE ${where} AND id IN (SELECT asset_id FROM workspace_assets WHERE workspace_id=?)`).all(workspaceId):db.prepare(`SELECT ${columns} FROM ${table} WHERE ${where}${workspaceId?" AND workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]));
    for(const row of rows){
      const id=nodeId(type,row.id);
      known.add(id);
      nodes.push({id,type,objectId:row.id,label:clean(label(row)),href:href[type](row.id)});
    }
  }

  const add=(sourceType,sourceId,targetType,targetId,kind,provenance)=>{
    const source=nodeId(sourceType,sourceId),target=nodeId(targetType,targetId);
    if(source!==target&&known.has(source)&&known.has(target)){
      edges.push({id:edgeId(source,target,kind,provenance),source,target,kind,provenance});
    }
  };

  // 1. Task -> Project
  for(const row of db.prepare(`SELECT id,project FROM tasks WHERE archived=0 AND project<>''${workspaceId?" AND workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
    const project=db.prepare(`SELECT id FROM projects WHERE name=? COLLATE NOCASE${workspaceId?" AND workspace_id=?":""}`).get(row.project,...(workspaceId?[workspaceId]:[]));
    if(project)add("task",row.id,"project",project.id,"belongs-to","tasks.project");
  }

  // 2. Project links (Project -> Any object)
  for(const row of db.prepare(`SELECT l.project_id,l.object_type,l.object_id FROM project_links l JOIN projects p ON p.id=l.project_id${workspaceId?" WHERE p.workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
    add("project",row.project_id,row.object_type,row.object_id,"contains","project_links");
  }

  // 3. Task dependencies (Task -> Task)
  for(const row of db.prepare(`SELECT d.task_id,d.depends_on_task_id FROM task_dependencies d JOIN tasks t ON t.id=d.task_id${workspaceId?" WHERE t.workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
    add("task",row.task_id,"task",row.depends_on_task_id,"depends-on","task_dependencies");
  }

  // 4. Note links / Wikilinks (Note -> Note)
  for(const row of db.prepare(`SELECT l.source_note_id,l.target_note_id FROM note_links l JOIN notes n ON n.id=l.source_note_id${workspaceId?" WHERE n.workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
    add("note",row.source_note_id,"note",row.target_note_id,"links-to","note_links");
  }

  // 5. Note -> Task links (Tasks defined in notes)
  try{
    for(const row of db.prepare(`SELECT l.task_id,e.note_id FROM vault_task_links l JOIN vault_entries e ON e.source_id=l.source_id AND e.relative_path=l.relative_path WHERE e.deleted_at IS NULL`).all()){
      add("note",row.note_id,"task",row.task_id,"contains-task","vault_task_links");
    }
  }catch(_){}

  // 6. Capture -> Note (Handwriting / voice notes)
  try{
    for(const row of db.prepare(`SELECT capture_id,note_id FROM handwriting_intakes WHERE note_id IS NOT NULL`).all()){
      add("capture",row.capture_id,"note",row.note_id,"created-note","handwriting_intakes");
    }
  }catch(_){}

  // 7. Task -> Event
  try{
    for(const row of db.prepare(`SELECT id,event_id FROM tasks WHERE event_id IS NOT NULL AND archived=0${workspaceId?" AND workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
      add("task",row.id,"event",row.event_id,"scheduled-as","tasks.event_id");
    }
  }catch(_){}

  // 8. Capture -> Asset
  for(const row of db.prepare(`SELECT ca.capture_id,ca.asset_id FROM capture_assets ca JOIN captures c ON c.id=ca.capture_id${workspaceId?" WHERE c.workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
    add("capture",row.capture_id,"asset",row.asset_id,"has-asset","capture_assets");
  }

  // 9. Assignment -> Course
  for(const row of db.prepare(`SELECT id,course_id FROM assignments${workspaceId?" WHERE workspace_id=?":""}`).all(...(workspaceId?[workspaceId]:[]))){
    add("assignment",row.id,"course",row.course_id,"belongs-to","assignments.course_id");
  }

  const upsertNode=db.prepare("INSERT INTO knowledge_nodes(id,object_type,object_id,label,href,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,href=excluded.href,updated_at=excluded.updated_at,workspace_id=excluded.workspace_id");
  const upsertEdge=db.prepare("INSERT INTO knowledge_edges(id,source_id,target_id,kind,provenance,updated_at,workspace_id) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,workspace_id=excluded.workspace_id");
  
  db.exec("BEGIN IMMEDIATE");
  try{
    for(const node of nodes)upsertNode.run(node.id,node.type,node.objectId,node.label,node.href,stamp,workspaceId);
    for(const edge of edges)upsertEdge.run(edge.id,edge.source,edge.target,edge.kind,edge.provenance,stamp,workspaceId);
    db.prepare(`DELETE FROM knowledge_edges WHERE updated_at<>?${workspaceId?" AND workspace_id=?":""}`).run(stamp,...(workspaceId?[workspaceId]:[]));
    db.prepare(`DELETE FROM knowledge_nodes WHERE updated_at<>?${workspaceId?" AND workspace_id=?":""}`).run(stamp,...(workspaceId?[workspaceId]:[]));
    db.exec("COMMIT");
  }catch(error){
    db.exec("ROLLBACK");
    throw error;
  }
  return {nodes:nodes.length,edges:edges.length,updatedAt:stamp};
}

const viewNode=row=>({id:row.id,type:row.object_type,objectId:row.object_id,label:row.label,href:row.href});

export function queryKnowledgeGraph({root="",depth=2,types=[],limit=300,sync=true}={},db=getDatabase(),workspaceId=null){
  if(sync)syncKnowledgeGraph(db,workspaceId);
  depth=Math.min(Math.max(Number(depth)||1,1),4);
  limit=Math.min(Math.max(Number(limit)||300,1),500);
  const allowed=new Set(types.filter(type=>href[type]));
  let rows;

  if(root){
    if(!db.prepare(`SELECT id FROM knowledge_nodes WHERE id=?${workspaceId?" AND workspace_id=?":""}`).get(root,...(workspaceId?[workspaceId]:[]))){
      throw Object.assign(new Error("Graph root not found"),{status:404});
    }
    const seen=new Set([root]),frontier=[root];
    for(let level=0;level<depth&&frontier.length;level++){
      const current=frontier.splice(0);
      for(const id of current){
        for(const edge of db.prepare(`SELECT source_id,target_id FROM knowledge_edges WHERE (source_id=? OR target_id=?)${workspaceId?" AND workspace_id=?":""} LIMIT 500`).all(id,id,...(workspaceId?[workspaceId]:[]))){
          const other=edge.source_id===id?edge.target_id:edge.source_id;
          if(!seen.has(other)&&seen.size<limit){
            seen.add(other);
            frontier.push(other);
          }
        }
      }
    }
    rows=[...seen].map(id=>db.prepare(`SELECT * FROM knowledge_nodes WHERE id=?${workspaceId?" AND workspace_id=?":""}`).get(id,...(workspaceId?[workspaceId]:[])));
  } else {
    // Priority order: Notes & Projects first, then Tasks, Courses, Assignments, Events, Captures, Assets
    rows=db.prepare(`SELECT * FROM knowledge_nodes${workspaceId?" WHERE workspace_id=?":""} ORDER BY CASE object_type WHEN 'note' THEN 1 WHEN 'project' THEN 2 WHEN 'task' THEN 3 WHEN 'course' THEN 4 WHEN 'assignment' THEN 5 WHEN 'event' THEN 6 WHEN 'capture' THEN 7 WHEN 'asset' THEN 8 ELSE 9 END, updated_at DESC, label ASC LIMIT ?`).all(...(workspaceId?[workspaceId]:[]),limit);
  }

  if(allowed.size)rows=rows.filter(row=>allowed.has(row.object_type));
  const ids=new Set(rows.map(row=>row.id));
  const edges=db.prepare(`SELECT * FROM knowledge_edges${workspaceId?" WHERE workspace_id=?":""} ORDER BY kind,id`).all(...(workspaceId?[workspaceId]:[])).filter(edge=>ids.has(edge.source_id)&&ids.has(edge.target_id));
  
  return {
    nodes:rows.map(viewNode),
    edges:edges.map(edge=>({id:edge.id,source:edge.source_id,target:edge.target_id,kind:edge.kind,provenance:edge.provenance})),
    meta:{root:root||null,depth,limit,privacy:"Labels and identifiers only; note/capture bodies are excluded."}
  };
}

export function knowledgePath(source,target,db=getDatabase(),workspaceId=null){
  syncKnowledgeGraph(db,workspaceId);
  const find=id=>db.prepare(`SELECT * FROM knowledge_nodes WHERE id=?${workspaceId?" AND workspace_id=?":""}`).get(id,...(workspaceId?[workspaceId]:[]));
  if(!find(source)||!find(target))throw Object.assign(new Error("Graph node not found"),{status:404});
  if(source===target)return {nodes:[viewNode(find(source))],edges:[]};
  const queue=[source],previous=new Map([[source,null]]),via=new Map();
  while(queue.length){
    const id=queue.shift();
    for(const edge of db.prepare(`SELECT * FROM knowledge_edges WHERE (source_id=? OR target_id=?)${workspaceId?" AND workspace_id=?":""} LIMIT 500`).all(id,id,...(workspaceId?[workspaceId]:[]))){
      const other=edge.source_id===id?edge.target_id:edge.source_id;
      if(previous.has(other))continue;
      previous.set(other,id);
      via.set(other,edge);
      if(other===target){
        queue.length=0;
        break;
      }
      queue.push(other);
    }
  }
  if(!previous.has(target))throw Object.assign(new Error("No graph path found"),{status:404});
  const ids=[];
  for(let id=target;id;id=previous.get(id))ids.push(id);
  ids.reverse();
  return {
    nodes:ids.map(id=>viewNode(find(id))),
    edges:ids.slice(1).map(id=>{
      const edge=via.get(id);
      return {id:edge.id,source:edge.source_id,target:edge.target_id,kind:edge.kind,provenance:edge.provenance};
    })
  };
}
