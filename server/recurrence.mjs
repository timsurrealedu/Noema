import {createRequire} from "node:module";
const {rrulestr}=createRequire(`${process.cwd()}/`)("rrule");

const asRules=value=>Array.isArray(value?.rules)?value.rules:value?.frequency?[`RRULE:FREQ=${value.frequency.toUpperCase()}${Number(value.interval)>1?`;INTERVAL=${Number(value.interval)}`:""}`]:[];
export function occurrences(event,rangeStart,rangeEnd,overrides=[]){
  const rules=asRules(event.recurrence);if(!rules.length)return [];
  const start=new Date(event.startAt),duration=new Date(event.endAt)-start;
  const rule=rrulestr(rules.join("\n"),{dtstart:start});
  const byOriginal=new Map(overrides.map(item=>[item.originalStartAt,item]));
  return rule.between(new Date(rangeStart),new Date(rangeEnd),true).flatMap(original=>{
    const override=byOriginal.get(original.toISOString());if(override?.cancelled)return [];
    const instance={...event,startAt:override?.startAt||original.toISOString(),endAt:override?.endAt||new Date(original.getTime()+duration).toISOString(),allDay:override?.allDay??event.allDay,originalStartAt:original.toISOString()};
    return [instance];
  });
}
export function untilRule(recurrence,until){return {rules:asRules(recurrence).map(rule=>rule.startsWith("RRULE:")?`${rule};UNTIL=${until.replace(/[-:]/g,"").replace(/\.\d{3}/,"")}`:rule)}};
