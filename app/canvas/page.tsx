"use client";
import dynamic from "next/dynamic";
import {ModuleShell} from "../components/ModuleShell";
const InfiniteCanvas=dynamic(()=>import("../components/InfiniteCanvas"),{ssr:false,loading:()=> <p role="status">Loading canvas…</p>});
export default function CanvasPage(){return <ModuleShell active="Canvas" title="Canvas"><p className="legacy-feature-notice" role="status"><strong>Discontinued.</strong> This legacy workspace remains available for existing canvas data; new visual annotation belongs in Vault notes.</p><InfiniteCanvas/></ModuleShell>}
