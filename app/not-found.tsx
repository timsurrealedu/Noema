import Link from "next/link";
import {Compass} from "@phosphor-icons/react/dist/ssr";
export default function NotFound(){return <main className="route-state centered"><Compass/><h1>Page not found</h1><p>The page may have moved, or the link is incomplete.</p><Link className="primary" href="/">Return to Today</Link></main>}
