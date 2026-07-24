import {authenticate} from "./auth.mjs";

export const sessionCookie="lifeos_session";
export function json(data,status=200,headers={}){return Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}})}
export function errorResponse(error,status=400){const message=error instanceof Error?error.message:String(error);return json({error:{code:status===401?"UNAUTHORIZED":"INVALID_REQUEST",message,retryable:false}},status)}
export async function body(request){const value=await request.json();if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("JSON object required");return value}
export function cookie(request,name){return request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1)||""}
export function requireUser(request){const user=authenticate(cookie(request,sessionCookie));if(!user)throw Object.assign(new Error("Authentication required"),{status:401});return user}
export function handle(error){return errorResponse(error,error?.status||400)}
