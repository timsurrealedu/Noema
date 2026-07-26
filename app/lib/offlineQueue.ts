"use client";

export type QueueStatus="pending"|"replaying"|"failed"|"conflict";
export type QueuedRequest={id:string;path:string;method:string;body:unknown;idempotencyKey:string;dependencies:string[];retryCount:number;status:QueueStatus;createdAt:string;error?:string};

const databaseName="lifeos-offline-v1",storeName="mutations",changedEvent="lifeos:queue-changed";

function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(storeName)){const store=db.createObjectStore(storeName,{keyPath:"id"});store.createIndex("createdAt","createdAt")}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function requestResult<T>(request:IDBRequest<T>){return new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function store(mode:IDBTransactionMode){const db=await database(),transaction=db.transaction(storeName,mode);transaction.oncomplete=()=>db.close();return transaction.objectStore(storeName)}
function announce(){dispatchEvent(new Event(changedEvent));try{const channel=new BroadcastChannel(changedEvent);channel.postMessage("changed");channel.close()}catch{}}

export async function listQueued(){return requestResult<QueuedRequest[]>((await store("readonly")).index("createdAt").getAll())}
export async function queueRequest(input:Omit<QueuedRequest,"id"|"retryCount"|"status"|"createdAt">){const item:QueuedRequest={...input,id:crypto.randomUUID(),retryCount:0,status:"pending",createdAt:new Date().toISOString()};await requestResult((await store("readwrite")).add(item));announce();try{const registration=await navigator.serviceWorker?.ready;await (registration as ServiceWorkerRegistration&{sync?:{register(tag:string):Promise<void>}})?.sync?.register("lifeos-mutations")}catch{}return item.id}
export async function retryQueued(id:string){const item=await requestResult<QueuedRequest|undefined>((await store("readonly")).get(id));if(!item)return;await requestResult((await store("readwrite")).put({...item,status:"pending",error:undefined}));announce();await flushQueue()}

async function replay(){const items=(await listQueued()).map(item=>item.status==="replaying"?{...item,status:"pending" as const}:item),ids=new Set(items.map(item=>item.id));for(const item of items){if(item.status!=="pending"||item.dependencies.some(id=>ids.has(id)))continue;await requestResult((await store("readwrite")).put({...item,status:"replaying"}));announce();try{const response=await fetch(`/api/v1${item.path}`,{method:item.method,headers:{"Content-Type":"application/json","Idempotency-Key":item.idempotencyKey},body:JSON.stringify(item.body)});if(response.ok)await requestResult((await store("readwrite")).delete(item.id));else{const message=(await response.json().catch(()=>null))?.error?.message||`Request failed (${response.status})`;await requestResult((await store("readwrite")).put({...item,retryCount:item.retryCount+1,status:response.status===409?"conflict":response.status>=500?"pending":"failed",error:message}))}}catch(error){await requestResult((await store("readwrite")).put({...item,retryCount:item.retryCount+1,status:"pending",error:error instanceof Error?error.message:"Network unavailable"}));break}announce()}}

export async function flushQueue(){if(!navigator.onLine)return;const locks=(navigator as Navigator&{locks?:LockManager}).locks;if(locks)await locks.request("lifeos-offline-replay",replay);else await replay()}
export function observeQueue(callback:(items:QueuedRequest[])=>void){const update=()=>void listQueued().then(callback);addEventListener(changedEvent,update);let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(changedEvent);channel.onmessage=update}catch{}update();return()=>{removeEventListener(changedEvent,update);channel?.close()}}
