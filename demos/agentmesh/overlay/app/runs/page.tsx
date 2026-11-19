import Link from "next/link";
import { api, Run } from "@/lib/api";
import { Status } from "@/components/Status";
import { RunDemo } from "@/components/RunDemo";
import { SessionRuns } from "@/components/SessionRuns";
export default async function Page(){const rows=await api<Run[]>("/runs",[]);return <><header className="pageHead"><div><p className="eyebrow">EXECUTION</p><h1>Runs</h1><p>Durable workflow instances with full model, context, tool, cost, and evaluation traces.</p></div><RunDemo/></header><section className="panel tablePanel"><table><thead><tr><th>Run</th><th>Status</th><th>Tokens</th><th>Cost</th><th>Created</th></tr></thead><tbody><SessionRuns variant="runs"/>{rows.map(r=><tr key={r.id}><td><Link className="runLink" href={`/runs/${r.id}/`}>{r.goal}</Link><small>{r.id}</small></td><td><Status value={r.status}/></td><td>{r.tokens_used}</td><td>${r.estimated_cost_usd.toFixed(4)}</td><td>{new Date(r.created_at).toLocaleString("en-GB", {timeZone: "UTC"})} UTC</td></tr>)}{!rows.length&&<tr><td className="empty" colSpan={5}>No executions recorded.</td></tr>}</tbody></table></section></>}
