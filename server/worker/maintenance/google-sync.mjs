import {pullGoogleCalendar} from "../calendar-sync.mjs";
import {log} from "../ops.mjs";

const SYNC_INTERVAL_MS=15*60*1000;
let lastGoogleSync=0;

// F5.8: Google sync runs on a worker interval instead of waiting for a button press.
export async function syncGoogleCalendars(now=new Date(),db=null,config){
  if(!db||now.valueOf()-lastGoogleSync<SYNC_INTERVAL_MS)return {skipped:true};
  lastGoogleSync=now.valueOf();
  const accounts=db.prepare("SELECT DISTINCT a.user_id,m.workspace_id FROM google_accounts a JOIN workspace_members m ON m.user_id=a.user_id AND m.revoked_at IS NULL").all();
  let synced=0,failed=0;
  for(const account of accounts){
    try{await pullGoogleCalendar({id:account.user_id,workspaceId:account.workspace_id},config,db);synced++}
    catch(error){failed++;log("warn","google-sync-failed",{userId:account.user_id,error:String(error?.message||error).slice(0,200)})}
  }
  return {synced,failed};
}
