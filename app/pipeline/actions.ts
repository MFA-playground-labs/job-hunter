"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { JobStatus } from "@/types/database";

const NEXT: Partial<Record<JobStatus, JobStatus[]>> = { interested: ["applied", "closed"], applied: ["interviewing", "rejected", "closed"], interviewing: ["offer", "rejected", "closed"], offer: ["closed"] };
export async function movePipelineJob(formData: FormData) {
  const id=text(formData,"id"), target=text(formData,"status") as JobStatus; if(!id) throw new Error("Job id is required");
  const supabase=await userSupabase(); const current=await supabase.from("jobs").select("status").eq("id",id).single(); if(current.error) throw new Error(current.error.message);
  if(!(NEXT[current.data.status]??[]).includes(target)) throw new Error("That pipeline transition is not allowed");
  const result=await supabase.from("jobs").update({status:target}).eq("id",id); if(result.error) throw new Error(result.error.message); refresh("/pipeline"); refresh("/dashboard"); refresh(`/jobs/${id}`);
}
