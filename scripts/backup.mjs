import {createBackup,verifyBackup} from "../server/ops.mjs";
const backup=createBackup();console.log(JSON.stringify({...backup,verification:verifyBackup(backup.path)}));
