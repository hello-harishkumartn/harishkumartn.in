import { api, Approval } from "@/lib/api";
import { ApprovalsTable } from "@/components/ApprovalsTable";
export default async function Page(){const rows=await api<Approval[]>("/approvals",[]);return <><header className="pageHead"><div><p className="eyebrow">GOVERNANCE</p><h1>Approvals</h1><p>Human gates for consequential or high-risk actions.</p></div></header><ApprovalsTable rows={rows}/></>}
