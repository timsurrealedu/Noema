"use client";
import {Warning} from "@phosphor-icons/react";
import Link from "next/link";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="route-state centered"><Warning/><h1>This page couldn’t load</h1><p>Your saved work is untouched. Retry the page or return to Today.</p><div><button className="primary" onClick={reset}>Try again</button><Link className="secondary" href="/">Go to Today</Link></div></main>}
