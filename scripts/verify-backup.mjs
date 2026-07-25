import {verifyBackup} from "../server/ops.mjs";
if(!process.argv[2])throw new Error("Usage: npm run verify:backup -- <backup-file>");console.log(JSON.stringify(verifyBackup(process.argv[2])));
