import {authenticate} from "./auth.mjs";
import {createHash} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {loadConfig} from "./config.mjs";

export const sessionCookie="lifeos_session";
export function json(data,status=200,headers={}){return Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}})}
export function errorResponse(error,status=400){const message=error instanceof Error?error.message:String(error),code=error?.code||{401:"UNAUTHORIZED",403:"FORBIDDEN",404:"NOT_FOUND",409:"CONFLICT",429:"RATE_LIMITED"}[status]||"INVALID_REQUEST";return json({error:{code,message,retryable:status===429}},status)}
export async function body(request){const value=await request.json();if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("JSON object required");return value}
export function cookie(request,name){return request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1)||""}
export function requireSameOrigin(request){
  if(["GET","HEAD","OPTIONS"].includes(request.method))return;
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))throw Object.assign(new Error("Cross-origin request rejected"),{status:403});
  if(!origin&&request.headers.get("sec-fetch-site")==="cross-site")throw Object.assign(new Error("Cross-site request rejected"),{status:403});
}
export function requireUser(request){requireSameOrigin(request);const user=authenticate(cookie(request,sessionCookie));if(!user)throw Object.assign(new Error("Authentication required"),{status:401});return user}
export function requireMfa(request){const user=requireUser(request),db=getDatabase(),record=db.prepare("SELECT totp_secret_enc,totp_env_disabled FROM users WHERE id=?").get(user.id),enabled=!!record?.totp_secret_enc||(!record?.totp_env_disabled&&!!loadConfig().totpSecret),fresh=user.mfa_verified_at&&Date.now()-Date.parse(user.mfa_verified_at)<=10*60_000;if(enabled&&!fresh)throw Object.assign(new Error("Sign in again with your authenticator code to continue"),{status:403,code:"MFA_REQUIRED"});return user}
export function idempotent(request,actor,input,work,db=getDatabase()){
  const key=request.headers.get("idempotency-key");if(!key)return {value:work(),replayed:false};if(key.length>200)throw new Error("Idempotency-Key is too long");
  const hash=createHash("sha256").update(JSON.stringify(input)).digest("hex"),prior=db.prepare("SELECT request_hash,response_json FROM idempotency_keys WHERE actor_id=? AND key=?").get(actor,key);
  if(prior){if(prior.request_hash!==hash)throw Object.assign(new Error("Idempotency-Key was already used for a different request"),{status:409,code:"IDEMPOTENCY_CONFLICT"});return {value:JSON.parse(prior.response_json),replayed:true}}
  const value=work();db.prepare("INSERT INTO idempotency_keys(actor_id,key,request_hash,response_json,created_at) VALUES(?,?,?,?,?)").run(actor,key,hash,JSON.stringify(value),new Date().toISOString());return {value,replayed:false};
}
export function handle(error){return errorResponse(error,error?.status||400)}
