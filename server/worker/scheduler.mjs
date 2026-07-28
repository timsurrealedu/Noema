import {deliverDueReminders,runScheduledAutomations} from "../modules.mjs";
import {deliverOne} from "../push.mjs";

export async function runScheduledWork(config,db){const now=new Date();deliverDueReminders(now,db);runScheduledAutomations(now,db);return deliverOne(config,db)}
