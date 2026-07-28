export type InkTool="pen"|"highlighter"|"eraser"|"lasso";
export type InkPoint={x:number;y:number;pressure:number;time:number;tiltX:number;tiltY:number};
export type InkStroke={id:string;tool:Exclude<InkTool,"lasso">;color:string;width:number;points:InkPoint[]};
export function inkPoint(event:PointerEvent|React.PointerEvent,rect:DOMRect):InkPoint{return{x:Math.max(0,Math.min(rect.width,event.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,event.clientY-rect.top)),pressure:event.pressure>0?event.pressure:event.pointerType==="pen"?.5:1,time:event.timeStamp,tiltX:Number(event.tiltX)||0,tiltY:Number(event.tiltY)||0}}
export function acceptInkPointer(pointerType:string,penActive:boolean){return pointerType==="pen"||(!penActive&&pointerType!=="touch")}
export function strokePath(stroke:InkStroke){return stroke.points.map((point,index)=>`${index?"L":"M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")}
export function eraseAt(strokes:InkStroke[],point:InkPoint,radius:number){const squared=radius*radius;return strokes.filter(stroke=>!stroke.points.some(item=>(item.x-point.x)**2+(item.y-point.y)**2<=squared))}
