import {createHash,randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
import {getDatabase} from "./db.mjs";

const scrypt=promisify(scryptCallback);
const now=()=>new Date().toISOString();
const hashToken=token=>createHash("sha256").update(token).digest("hex");

export async function hashPassword(password){
  if(typeof password!=="string"||password.length<12)throw new Error("Password must contain at least 12 characters");
  const salt=randomBytes(16);const key=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt$32768$${salt.toString("base64")}$${Buffer.from(key).toString("base64")}`;
}

export async function verifyPassword(password,encoded){
  const [name,n,salt,key]=String(encoded).split("$");if(name!=="scrypt"||!n||!salt||!key)return false;
  const expected=Buffer.from(key,"base64");const actual=Buffer.from(await scrypt(password,Buffer.from(salt,"base64"),expected.length,{N:Number(n),r:8,p:1,maxmem:64*1024*1024}));
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

export async function ensureOwner({email,password},db=getDatabase()){
  const normalized=email.trim().toLowerCase();if(!normalized||!password)return null;
  const found=db.prepare("SELECT id,email FROM users WHERE email=?").get(normalized);if(found)return found;
  const id=randomUUID(),stamp=now();db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES(?,?,?,?,?)").run(id,normalized,await hashPassword(password),stamp,stamp);return {id,email:normalized};
}

export async function login({email,password,device=""},db=getDatabase(),hours=720){
  const user=db.prepare("SELECT * FROM users WHERE email=?").get(email.trim().toLowerCase());if(!user||!await verifyPassword(password,user.password_hash))return null;
  const token=randomBytes(32).toString("base64url"),stamp=now(),expires=new Date(Date.now()+hours*3600000).toISOString();
  db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,device,created_at) VALUES(?,?,?,?,?,?)").run(randomUUID(),user.id,hashToken(token),expires,String(device).slice(0,200),stamp);
  return {token,expiresAt:expires,user:{id:user.id,email:user.email}};
}

export function authenticate(token,db=getDatabase()){
  if(!token)return null;return db.prepare("SELECT u.id,u.email,s.id session_id,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").get(hashToken(token),now())||null;
}

export function revokeSession(token,db=getDatabase()){return db.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").run(now(),hashToken(token)).changes===1}
