import {handleInterpretCapture} from "./handlers/interpret-capture.mjs";
import {handleOptimizeNote} from "./handlers/optimize-note.mjs";
import {handleRunSkill} from "./handlers/run-skill.mjs";
import {handleHandwritingOcr} from "./handlers/handwriting-ocr.mjs";
import {handleHandwritingIntake} from "./handlers/handwriting-intake.mjs";
import {handleContinueMath} from "./handlers/continue-math.mjs";
import {handleTranscribeAudio} from "./handlers/transcribe-audio.mjs";

const handlers={"interpret-capture":handleInterpretCapture,"note-optimize":handleOptimizeNote,"skill-run":handleRunSkill,"handwriting-ocr":handleHandwritingOcr,"handwriting-intake":handleHandwritingIntake,"continue-math":handleContinueMath,"transcribe-audio":handleTranscribeAudio};
export class UnsupportedJobKindError extends Error{constructor(kind){super(`Unsupported job kind: ${kind}`);this.name="UnsupportedJobKindError"}}
export function processClaimedJob(context){const handler=handlers[context.job.kind];if(!handler)throw new UnsupportedJobKindError(context.job.kind);return handler(context)}
