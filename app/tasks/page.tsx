"use client";

import {FormEvent, useMemo, useState} from "react";
import {Check, Circle, DotsThree, Plus} from "@phosphor-icons/react";
import {Task, useAppState} from "../components/AppState";
import {ModuleShell} from "../components/ModuleShell";
import {createId} from "../lib/id";
import {dateValue, overdueDays} from "../lib/taskTime";

const groups=["Overdue","Today","Upcoming","Inbox","Completed"] as const;

export default function TasksPage(){
  const {tasks,toggleTask,saveTask}=useAppState();
  const [quickAdd,setQuickAdd]=useState("");
  const [editing,setEditing]=useState<Task|null>(null);
  const [expandedSubtasks,setExpandedSubtasks]=useState<Set<string>>(new Set());
  const todayStr=dateValue(new Date().toISOString());

  const visible=useMemo(()=>tasks.filter(task=>!task.archived),[tasks]);
  function matches(task:Task,label:(typeof groups)[number]){
    if(label==="Completed")return !!task.completed;
    if(task.completed)return false;
    const due=task.dueAt?dateValue(task.dueAt):null;
    if(label==="Overdue")return !!due&&due<todayStr;
    if(label==="Today")return due===todayStr;
    if(label==="Upcoming")return !!due&&due>todayStr;
    if(label==="Inbox")return !due;
    return true;
  }

  function submitQuickAdd(event:FormEvent){
    event.preventDefault();
    const title=quickAdd.trim();
    if(!title)return;
    saveTask({id:createId(),title,project:"Inbox",due:"",dueAt:null,priority:"Medium",completed:false,status:"open"});
    setQuickAdd("");
  }

  const subtasksByParent=new Map<string,Task[]>();
  for(const task of visible)if(task.parentTaskId){
    const list=subtasksByParent.get(task.parentTaskId)||[];
    list.push(task);
    subtasksByParent.set(task.parentTaskId,list);
  }
  const dueLabel=(task:Task)=>task.dueAt?new Date(task.dueAt).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}):"No date";

  const renderRow=(task:Task,isSubtask=false)=>(
    <article className={`${task.completed?"completed ":""}${isSubtask?"task-subtask":""}`} key={task.id}>
      <button className="task-check" aria-label={`${task.completed?"Reopen":"Complete"} ${task.title}`} aria-pressed={!!task.completed} onClick={()=>toggleTask(task.id)}>
        {task.completed?<Check weight="bold"/>:<Circle/>}
      </button>
      <button className="task-copy" onClick={()=>setEditing({...task})}>
        <strong>{task.title}</strong>
        <span>{dueLabel(task)}</span>
      </button>
      <span className="task-row-meta">{task.priority}</span>
      {!isSubtask&&<button className="row-menu" aria-label={`Edit ${task.title}`} onClick={()=>setEditing({...task})}><DotsThree weight="bold"/></button>}
    </article>
  );

  return (
    <ModuleShell active="Tasks" title="Tasks">
      <section className="tasks-page" aria-label="Task checklist">
        <form className="tasks-quick-add" onSubmit={submitQuickAdd}>
          <input value={quickAdd} onChange={event=>setQuickAdd(event.target.value)} placeholder="Add a task…" aria-label="Quick add task"/>
          <button type="submit" className="primary" disabled={!quickAdd.trim()}><Plus/>Add</button>
        </form>
        {groups.map(group=>{
          const parents=visible.filter(task=>matches(task,group)&&!task.parentTaskId);
          return (
            <details className="task-group" key={group} open={group!=="Completed"}>
              <summary>{group}<span>{parents.length}</span></summary>
              {parents.length?parents.map(task=>(
                <div key={task.id} className="task-with-subtasks">
                  {renderRow(task)}
                  {(subtasksByParent.get(task.id)?.length||0)>0&&(
                    <>
                      <button type="button" className="subtask-toggle" aria-expanded={expandedSubtasks.has(task.id)} onClick={()=>{
                        setExpandedSubtasks(current=>{const next=new Set(current);next.has(task.id)?next.delete(task.id):next.add(task.id);return next});
                      }}>
                        {expandedSubtasks.has(task.id)?"Hide":"Show"} {subtasksByParent.get(task.id)!.length} subtask{subtasksByParent.get(task.id)!.length===1?"":"s"}
                      </button>
                      {expandedSubtasks.has(task.id)&&subtasksByParent.get(task.id)!.map(subtask=>renderRow(subtask,true))}
                    </>
                  )}
                </div>
              )):<p className="task-group-empty">Nothing here.</p>}
            </details>
          );
        })}
        {editing&&(
          <form className="tasks-editor" onSubmit={(event:FormEvent)=>{event.preventDefault();saveTask(editing);setEditing(null)}}>
            <label>Title<input value={editing.title} onChange={event=>setEditing({...editing,title:event.target.value})} required/></label>
            <label>Due<input type="datetime-local" value={editing.dueAt?dateValue(editing.dueAt):""} onChange={event=>setEditing({...editing,dueAt:event.target.value?new Date(event.target.value).toISOString():null})}/></label>
            <div className="inspector-actions"><button type="button" onClick={()=>setEditing(null)}>Cancel</button><button type="submit" className="primary">Save</button></div>
          </form>
        )}
      </section>
    </ModuleShell>
  );
}
