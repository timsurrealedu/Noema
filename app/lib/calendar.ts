export const DAY_MINUTES=1440, SNAP=15;
export const snapMinutes=(value:number)=>Math.max(0,Math.min(DAY_MINUTES-SNAP,Math.round(value/SNAP)*SNAP));
export const minutesAt=(value:string)=>{const date=new Date(value);return date.getHours()*60+date.getMinutes()};
export const withMinutes=(day:Date,minutes:number)=>{const date=new Date(day);date.setHours(Math.floor(minutes/60),minutes%60,0,0);return date};
export type TimedBlock={id:string;start:number;end:number};
export const overlapLayout=<T extends TimedBlock>(items:T[])=>{
  const ordered=[...items].sort((a,b)=>a.start-b.start||a.end-b.end),active:T[]=[];let cluster:T[]=[];
  const finish=()=>{const columns:number[]=[];for(const item of cluster){let lane=0;while(columns[lane]>item.start)lane++;columns[lane]=item.end;(item as T&{lane:number;lanes:number}).lane=lane;(item as T&{lanes:number}).lanes=0}for(const item of cluster)(item as T&{lanes:number}).lanes=columns.length;cluster=[]};
  for(const item of ordered){for(let i=active.length-1;i>=0;i--)if(active[i].end<=item.start)active.splice(i,1);if(!active.length&&cluster.length)finish();active.push(item);cluster.push(item)}if(cluster.length)finish();return ordered as (T&{lane:number;lanes:number})[];
};
