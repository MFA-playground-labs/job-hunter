"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { JobStatus } from "@/types/database";
import { canMovePipeline } from "@/lib/workflow-transitions";
export type PipelineActionState={ok:boolean;message:string};
export async function movePipelineJob(_:PipelineActionState,formData:FormData):Promise<PipelineActionState>{
  const id=text(formData,"id"),target=text(formData,"status") as JobStatus;if(!id)return{ok:false,message:"Job id is required."};
  try{const supabase=await userSupabase();const current=await supabase.from("jobs").select("status").eq("id",id).single();if(current.error)return{ok:false,message:"This job could not be loaded."};if(!canMovePipeline(current.data.status,target))return{ok:false,message:"That pipeline transition is not allowed."};const result=await supabase.from("jobs").update({status:target}).eq("id",id).eq("status",current.data.status).select("id").maybeSingle();if(result.error)return{ok:false,message:"The status could not be saved."};if(!result.data)return{ok:false,message:"This job changed elsewhere. Refresh and try again."};refresh("/pipeline");refresh("/dashboard");refresh(`/jobs/${id}`);return{ok:true,message:`Moved to ${target}.`};}catch{return{ok:false,message:"The status could not be saved."};}
}
