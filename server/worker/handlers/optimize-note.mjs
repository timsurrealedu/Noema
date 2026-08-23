import {resolve} from "node:path";
import {runAI} from "../../ai.mjs";
import {failNoteOptimization,finishNoteOptimization} from "../../core.mjs";
import {assertNotCancelled,failJob,finishJob} from "../../jobs.mjs";
import {aiEventHandler} from "../job-events.mjs";

const schema={type:"object",additionalProperties:false,required:["baseVersion","summary","operations"],properties:{baseVersion:{type:"integer",minimum:1},summary:{type:"string",minLength:1,maxLength:2000},operations:{type:"array",minItems:1,maxItems:100,items:{type:"object",additionalProperties:false,required:["type","start","end","replacement","reason"],properties:{type:{enum:["replace_range"]},start:{type:"integer",minimum:0},end:{type:"integer",minimum:0},replacement:{type:"string",maxLength:100000},reason:{type:"string",minLength:1,maxLength:1000}}}}}};
const instructions={light:"Fix grammar and formatting only.",organize:"Improve headings, order, and readability.",study:"Turn this into clear study notes with summaries and examples.",technical:"Improve technical structure and precision.",voice:"Preserve the author's voice while improving clarity."};

export async function handleOptimizeNote({job,config,db}){
  try{
    const note=db.prepare("SELECT title,content,version FROM notes WHERE id=? AND trashed=0").get(job.input.noteId);
    if(!note)throw new Error("Note not found");
    const output=await runAI({prompt:`Propose non-overlapping edits to this note. ${instructions[job.input.mode]} Preserve facts, formulas, code, and meaning. Offsets are zero-based JavaScript string offsets into Content. Return only replace_range operations; unchanged text must not be repeated.\n\nBase version: ${note.version}\nTitle: ${note.title}\nContent:\n${note.content}`,cwd:resolve(config.jobsDir,job.id),schema,config,workload:"note",onEvent:aiEventHandler(job.id,db)});
    assertNotCancelled(job.id,db);
    if(output.result.baseVersion!==note.version)throw new Error("Optimization base version does not match the note");
    finishNoteOptimization(job.input.optimizationId,output.result,output.provider,db);
    finishJob(job.id,{optimizationId:job.input.optimizationId,provider:output.provider},db);
  }catch(error){failNoteOptimization(job.input.optimizationId,error,db);failJob(job.id,error,db)}
}
