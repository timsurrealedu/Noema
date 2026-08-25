import {existsSync,readdirSync,readFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const sourceDirectory=join(dirname(fileURLToPath(import.meta.url)),"migrations");
const directory=existsSync(sourceDirectory)?sourceDirectory:resolve(process.cwd(),"server","db","migrations");
export function migrate(db){
  const applied=new Set(db.prepare("SELECT version FROM schema_migrations").all().map(row=>row.version));
  for(const file of readdirSync(directory).filter(name=>/^\d+_.+\.sql$/.test(name)).sort()){
    const version=Number.parseInt(file,10);
    if(applied.has(version))continue;
    db.exec("BEGIN IMMEDIATE");
    try{db.exec(readFileSync(join(directory,file),"utf8"));db.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)").run(version,new Date().toISOString());db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}
  }
}
