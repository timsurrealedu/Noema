import {handleInterpretCapture} from "./handlers/interpret-capture.mjs";
import {handleOptimizeNote} from "./handlers/optimize-note.mjs";
import {handleRunSkill} from "./handlers/run-skill.mjs";

const handlers={"interpret-capture":handleInterpretCapture,"note-optimize":handleOptimizeNote,"skill-run":handleRunSkill};
export class UnsupportedJobKindError extends Error{constructor(kind){super(`Unsupported job kind: ${kind}`);this.name="UnsupportedJobKindError"}}
export function processClaimedJob(context){const handler=handlers[context.job.kind];if(!handler)throw new UnsupportedJobKindError(context.job.kind);return handler(context)}
