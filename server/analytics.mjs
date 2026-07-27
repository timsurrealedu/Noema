import {randomUUID} from "node:crypto";
import {getDatabase} from "./db.mjs";

const schemas={
  navigation:{area:["today","capture","tasks","calendar","vault","graph","study","projects","coding","automations","dashboards","plugins","collaboration","settings"]},
  operation:{kind:["create","update","delete","search","export","sync"],outcome:["success","failure","cancelled"],durationMs:"number"},
  sync:{provider:["google_calendar","offline_queue"],outcome:["success","failure","partial"],itemCount:"number"},
};
const validate=(event,properties)=>{
  const schema=schemas[event];
  if(!schema)throw new Error("Analytics event is not allowlisted");
  if(!properties||typeof properties!=="object"||Array.isArray(properties))throw new Error("Analytics properties must be an object");
  for(const key of Object.keys(properties))if(!(key in schema))throw new Error(`Analytics property is not allowlisted: ${key}`);
  for(const [key,value] of Object.entries(properties)){
    const rule=schema[key];
    if(rule==="number"&&(!Number.isFinite(value)||value<0))throw new Error(`Invalid analytics property: ${key}`);
    if(Array.isArray(rule)&&!rule.includes(value))throw new Error(`Invalid analytics property: ${key}`);
  }
  return properties;
};

export function analyticsStatus(userId,db=getDatabase()){
  const preference=db.prepare("SELECT enabled FROM analytics_preferences WHERE user_id=?").get(userId);
  return {enabled:!!preference?.enabled,eventCount:db.prepare("SELECT COUNT(*) count FROM analytics_events WHERE user_id=?").get(userId).count};
}
export function setAnalyticsEnabled(userId,enabled,db=getDatabase()){
  if(typeof enabled!=="boolean")throw new Error("enabled must be a boolean");
  db.prepare("INSERT INTO analytics_preferences(user_id,enabled,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at").run(userId,Number(enabled),new Date().toISOString());
  return analyticsStatus(userId,db);
}
export function recordAnalytics(userId,input,db=getDatabase()){
  if(!input||Object.keys(input).some(key=>!["event","properties"].includes(key)))throw new Error("Analytics input is not allowlisted");
  const properties=validate(input?.event,input?.properties);
  if(!analyticsStatus(userId,db).enabled)return {recorded:false};
  db.prepare("INSERT INTO analytics_events(id,user_id,event,properties_json,created_at) VALUES(?,?,?,?,?)").run(randomUUID(),userId,input.event,JSON.stringify(properties),new Date().toISOString());
  return {recorded:true};
}
export function deleteAnalytics(userId,db=getDatabase()){
  return {deleted:db.prepare("DELETE FROM analytics_events WHERE user_id=?").run(userId).changes};
}
