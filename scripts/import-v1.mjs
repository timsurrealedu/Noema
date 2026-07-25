import {importV1} from "../server/ops.mjs";
if(!process.argv[2])throw new Error("Usage: npm run import:v1 -- <v1-export-directory>");console.log(JSON.stringify(await importV1(process.argv[2])));
