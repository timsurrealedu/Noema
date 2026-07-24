"use client";
import {Warning} from "@phosphor-icons/react";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="route-state centered"><Warning/><h1>This page couldn’t load</h1><p>Your saved work is untouched. Retry the page or return to Today.</p><div><button className="primary" onClick={reset}>Try again</button><a className="secondary" href="/">Go to Today</a></div></main>}
