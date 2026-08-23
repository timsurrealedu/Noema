export type InkTool="pen"|"highlighter"|"eraser"|"lasso"|"pan"|"ruler"|"rectangle"|"ellipse"|"arrow";
export type InkPoint={x:number;y:number;pressure:number;time:number;tiltX:number;tiltY:number};
export type InkStroke={id:string;tool:Exclude<InkTool,"lasso"|"pan">;color:string;width:number;points:InkPoint[]};
export function sanitizeStrokes(value:unknown):InkStroke[]{if(!Array.isArray(value))return [];return value.filter((stroke):stroke is InkStroke=>!!stroke&&typeof stroke==="object"&&Array.isArray((stroke as InkStroke).points)&&(stroke as InkStroke).points.length>0&&(stroke as InkStroke).points.every(point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y)))}
export function inkPoint(event:PointerEvent|React.PointerEvent,rect:DOMRect):InkPoint{return{x:Math.max(0,Math.min(rect.width,event.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,event.clientY-rect.top)),pressure:event.pressure>0?event.pressure:event.pointerType==="pen"?.5:1,time:event.timeStamp,tiltX:Number(event.tiltX)||0,tiltY:Number(event.tiltY)||0}}
export function acceptInkPointer(pointerType:string,penActive:boolean){return pointerType==="pen"||!penActive}
export function strokePath(stroke:InkStroke){const a=stroke.points[0],b=stroke.points.at(-1);if(!a||!b)return "";if(stroke.tool==="rectangle")return `M${a.x} ${a.y}H${b.x}V${b.y}H${a.x}Z`;if(stroke.tool==="ellipse"){const rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;return `M${cx-rx} ${cy}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0`}if(stroke.tool==="arrow"){const angle=Math.atan2(b.y-a.y,b.x-a.x),wing=12;return `M${a.x} ${a.y}L${b.x} ${b.y}M${b.x} ${b.y}L${b.x-wing*Math.cos(angle-.5)} ${b.y-wing*Math.sin(angle-.5)}M${b.x} ${b.y}L${b.x-wing*Math.cos(angle+.5)} ${b.y-wing*Math.sin(angle+.5)}`}return stroke.points.map((point,index)=>`${index?"L":"M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")}
export function eraseAt(strokes:InkStroke[],point:InkPoint,radius:number){const squared=radius*radius;return strokes.filter(stroke=>!stroke.points.some(item=>(item.x-point.x)**2+(item.y-point.y)**2<=squared))}
export function scaleStroke(stroke:InkStroke,sx:number,sy=sx,origin=stroke.points[0]){if(!origin)return stroke;return {...stroke,points:stroke.points.map(point=>({...point,x:origin.x+(point.x-origin.x)*sx,y:origin.y+(point.y-origin.y)*sy}))}}
export function rotateStroke(stroke:InkStroke,radians:number,origin=stroke.points[0]){if(!origin)return stroke;const cos=Math.cos(radians),sin=Math.sin(radians);return {...stroke,points:stroke.points.map(point=>{const x=point.x-origin.x,y=point.y-origin.y;return {...point,x:origin.x+x*cos-y*sin,y:origin.y+x*sin+y*cos}})}}
export type InkView={x:number;y:number;zoom:number};
export type ScreenPoint={x:number;y:number};
export const ZOOM_MIN=.25,ZOOM_MAX=4;
export function clampZoom(zoom:number,min=ZOOM_MIN,max=ZOOM_MAX){return Math.max(min,Math.min(max,zoom))}
export function screenToWorld(clientX:number,clientY:number,rect:DOMRect,view:InkView,width:number,height:number):InkPoint{return{x:view.x+(clientX-rect.left)/rect.width*width/view.zoom,y:view.y+(clientY-rect.top)/rect.height*height/view.zoom,pressure:1,time:performance.now(),tiltX:0,tiltY:0}}
function screenToCanvas(point:ScreenPoint,rect:DOMRect|Pick<DOMRect,"left"|"top"|"width"|"height">,width:number,height:number):ScreenPoint{return{x:(point.x-rect.left)/rect.width*width,y:(point.y-rect.top)/rect.height*height}}
function viewAnchor(view:InkView,canvas:ScreenPoint):ScreenPoint{return{x:view.x+canvas.x/view.zoom,y:view.y+canvas.y/view.zoom}}
function anchorToView(anchor:ScreenPoint,canvas:ScreenPoint,zoom:number):InkView{return{x:anchor.x-canvas.x/zoom,y:anchor.y-canvas.y/zoom,zoom}}
export function applyPinch(view:InkView,rect:DOMRect,width:number,height:number,previousCenter:ScreenPoint,nextCenter:ScreenPoint,distRatio:number,min=ZOOM_MIN,max=ZOOM_MAX):InkView{
  const zoom=clampZoom(view.zoom*Math.max(.01,distRatio),min,max);
  if(zoom===view.zoom)return view;
  const previousCanvas=screenToCanvas(previousCenter,rect,width,height);
  return anchorToView(viewAnchor(view,previousCanvas),screenToCanvas(nextCenter,rect,width,height),zoom);
}
export function zoomAtPoint(view:InkView,rect:DOMRect,width:number,height:number,clientX:number,clientY:number,factor:number,min=ZOOM_MIN,max=ZOOM_MAX):InkView{
  const zoom=clampZoom(view.zoom*factor,min,max);
  if(zoom===view.zoom)return view;
  const canvas=screenToCanvas({x:clientX,y:clientY},rect,width,height);
  return anchorToView(viewAnchor(view,canvas),canvas,zoom);
}
export function panBy(view:InkView,dx:number,dy:number):InkView{return{...view,x:view.x-dx/view.zoom,y:view.y-dy/view.zoom}}
export function penRecentlyUp(pointerType:string,penActive:boolean,penUpAt:number,now:number=performance.now(),cooldown=150){return pointerType==="touch"&&(penActive||now-penUpAt<cooldown)}
export function translateStroke(stroke:InkStroke,dx:number,dy:number){return{...stroke,points:stroke.points.map(point=>({...point,x:point.x+dx,y:point.y+dy}))}}
export function snapInkPoint(start:InkPoint,end:InkPoint){const distance=Math.hypot(end.x-start.x,end.y-start.y),angle=Math.round(Math.atan2(end.y-start.y,end.x-start.x)/(Math.PI/4))*(Math.PI/4);return{...end,x:start.x+Math.cos(angle)*distance,y:start.y+Math.sin(angle)*distance}}
export function fitInkView(strokes:InkStroke[],width:number,height:number):InkView{const points=strokes.flatMap(stroke=>stroke.points);if(!points.length)return{x:0,y:0,zoom:1};const left=Math.min(...points.map(point=>point.x)),right=Math.max(...points.map(point=>point.x)),top=Math.min(...points.map(point=>point.y)),bottom=Math.max(...points.map(point=>point.y)),boundingW=Math.max(1,right-left),boundingH=Math.max(1,bottom-top),zoom=Math.max(.01,Math.min(2,.9*Math.min(width/boundingW,height/boundingH)));return{x:(left+right)/2-width/(2*zoom),y:(top+bottom)/2-height/(2*zoom),zoom}}
export function selectionBounds(strokes:InkStroke[],selected:string[]){const points=strokes.filter(stroke=>selected.includes(stroke.id)).flatMap(stroke=>stroke.points);if(!points.length)return null;const left=Math.min(...points.map(point=>point.x)),right=Math.max(...points.map(point=>point.x)),top=Math.min(...points.map(point=>point.y)),bottom=Math.max(...points.map(point=>point.y));return{left,right,top,bottom,cx:(left+right)/2,cy:(top+bottom)/2}}
export function normalizeInk(strokes:InkStroke[],padding=24){const points=strokes.flatMap(stroke=>stroke.points);if(!points.length)return{formatVersion:2,coordinateSpace:"world" as const,width:320,height:240,strokes:[]};const left=Math.min(...points.map(point=>point.x)),top=Math.min(...points.map(point=>point.y)),right=Math.max(...points.map(point=>point.x)),bottom=Math.max(...points.map(point=>point.y));return{formatVersion:2,coordinateSpace:"world" as const,width:Math.max(320,Math.ceil(right-left+padding*2)),height:Math.max(240,Math.ceil(bottom-top+padding*2)),strokes:strokes.map(stroke=>({...stroke,points:stroke.points.map(point=>({...point,x:point.x-left+padding,y:point.y-top+padding}))}))}}
