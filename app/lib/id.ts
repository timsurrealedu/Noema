export function createId(){
  if(typeof crypto.randomUUID==="function")return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  return [...bytes].map((byte,index)=>`${index===4||index===6||index===8||index===10?"-":""}${byte.toString(16).padStart(2,"0")}`).join("");
}
