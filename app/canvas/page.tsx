"use client";
import dynamic from "next/dynamic";
import {ModuleShell} from "../components/ModuleShell";
const InfiniteCanvas=dynamic(()=>import("../components/InfiniteCanvas"),{ssr:false,loading:()=> <p role="status">Loading canvas…</p>});
export default function CanvasPage(){return <ModuleShell active="Canvas" title="Canvas"><InfiniteCanvas/></ModuleShell>}
