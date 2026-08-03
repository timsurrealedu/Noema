"use client";
import {useRouter} from "next/navigation";
import {useEffect} from "react";

const routes=["/capture","/calendar","/vault","/settings","/activity","/notifications"];

export function NavigationWarmup(){const router=useRouter();useEffect(()=>{for(const route of routes)router.prefetch(route)},[router]);return null}
