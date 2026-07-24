import {authenticate} from "./auth.mjs";

export const sessionCookie="lifeos_session";
export function json(data,status=200,headers={}){return Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}})}
export function errorResponse(error,status=400){const message=error instanceof Error?error.message:String(error),code={401:"UNAUTHORIZED",403:"FORBIDDEN",429:"RATE_LIMITED"}[status]||"INVALID_REQUEST";return json({error:{code,message,retryable:status===429}},status)}
export async function body(request){const value=await request.json();if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("JSON object required");return value}
export function cookie(request,name){return request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1)||""}
export function requireSameOrigin(request){
  if(["GET","HEAD","OPTIONS"].includes(request.method))return;
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))throw Object.assign(new Error("Cross-origin request rejected"),{status:403});
  if(!origin&&request.headers.get("sec-fetch-site")==="cross-site")throw Object.assign(new Error("Cross-site request rejected"),{status:403});
}
export function requireUser(request){requireSameOrigin(request);const user=authenticate(cookie(request,sessionCookie));if(!user)throw Object.assign(new Error("Authentication required"),{status:401});return user}
export function handle(error){return errorResponse(error,error?.status||400)}
