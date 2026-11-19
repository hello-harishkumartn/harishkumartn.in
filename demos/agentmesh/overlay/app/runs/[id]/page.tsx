import { api, fixtureRunIds, Approval, Run } from "@/lib/api";
import { RecordedRun } from "@/components/RunView";

export const dynamicParams = false;
export function generateStaticParams() { return fixtureRunIds().map(id => ({ id })); }

export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const run=await api<Run|null>(`/runs/${id}`,null);if(!run)return <section className="panel empty">Run not found.</section>;const approval=(await api<Approval[]>("/approvals",[])).find(a=>a.run_id===run.id&&a.status==="pending");return <RecordedRun run={run} approvalId={approval?.id}/>}
