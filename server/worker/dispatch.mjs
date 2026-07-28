import {handleInterpretCapture} from "./interpret-capture.mjs";
import {handleOptimizeNote} from "./optimize-note.mjs";
import {handleRunSkill} from "./run-skill.mjs";

const handlers={"interpret-capture":handleInterpretCapture,"note-optimize":handleOptimizeNote,"skill-run":handleRunSkill};
export function dispatchJob(context){const handler=handlers[context.job.kind];if(!handler)throw new Error(`Unsupported job kind: ${context.job.kind}`);return handler(context)}
