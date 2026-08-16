import {scanConnectedVaults} from "../../vault.mjs";
export const syncVaults=(date,db)=>scanConnectedVaults(db,date);
