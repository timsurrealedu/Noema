export type TaskLike={dueAt?:string|null};

const localParts=(value:string)=>Object.fromEntries(new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value)).map(part=>[part.type,part.value]));
export const dateValue=(value?:string|null)=>{if(!value)return "";const part=localParts(value);return `${part.year}-${part.month}-${part.day}`};
export const overdueDays=(task:TaskLike,today:string)=>task.dueAt?Math.max(1,Math.round((new Date(`${today}T00:00:00Z`).valueOf()-new Date(`${dateValue(task.dueAt)}T00:00:00Z`).valueOf())/86_400_000)):0;
