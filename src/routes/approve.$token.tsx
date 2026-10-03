import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route=createFileRoute("/approve/$token")({
  head:()=>({meta:[{title:"اعتماد وتوقيع مستند | الذات | ATHAT"},{name:"description",content:"قراءة واعتماد وتوقيع مستند إلكتروني."}]}),
  component:ApprovalPage,
});

function ApprovalPage(){
  const {token}=Route.useParams();
  const [signature,setSignature]=useState("");
  const [note,setNote]=useState("");
  const [confirmedRead,setConfirmedRead]=useState(false);
  const request=useQuery({
    queryKey:["signature-request",token],
    queryFn:async()=>{
      const {data,error}=await (supabase as any).rpc("get_document_signature_request",{p_token:token});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(!row)throw new Error("رابط الاعتماد غير صالح أو لم يعد متاحًا.");
      return row as {document_title:string;record_type:string;document_snapshot:Record<string,unknown>;signer_name:string;signer_role:string;status:string;signed_at?:string};
    }
  });
  const sign=useMutation({
    mutationFn:async()=>{
      const {error}=await (supabase as any).rpc("sign_document_request",{p_token:token,p_signature_data:signature,p_note:note.trim()||null});
      if(error)throw error;
    },
    onSuccess:()=>request.refetch()
  });

  if(request.isLoading)return <main dir="rtl" className="grid min-h-screen place-items-center"><Loader2 className="size-7 animate-spin"/></main>;
  if(request.isError)return <main dir="rtl" className="mx-auto flex min-h-screen max-w-xl items-center px-4"><div className="w-full rounded-2xl border p-6 text-center"><h1 className="font-black">تعذر فتح طلب الاعتماد</h1><p className="mt-2 text-sm text-muted-foreground">{(request.error as Error).message}</p></div></main>;
  const r=request.data!;
  const signed=r.status==="signed";
  const entries=Object.entries(r.document_snapshot||{}).filter(([k,v])=>!["id","user_id","created_at","updated_at"].includes(k)&&v!=null&&String(v).trim()!=="");
  return <main dir="rtl" className="min-h-screen bg-muted/20 px-3 py-6">
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="rounded-2xl border bg-card p-5 text-center shadow-sm">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileCheck2/></div>
        <h1 className="mt-3 text-xl font-black">الذات | ATHAT</h1>
        <p className="mt-1 text-sm font-bold">طلب اعتماد وتوقيع إلكتروني</p>
      </header>
      {signed&&<section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-center"><CheckCircle2 className="mx-auto size-8"/><h2 className="mt-2 font-black">تم اعتماد وتوقيع المستند</h2><p className="mt-1 text-xs text-muted-foreground">تم حفظ الاعتماد بنجاح ولا يلزم إجراء آخر.</p></section>}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-primary"><ShieldCheck className="size-4"/><span className="text-xs font-black">الموقّع المحدد</span></div>
        <h2 className="mt-2 text-lg font-black">{r.signer_name}</h2><p className="text-sm text-muted-foreground">{r.signer_role}</p>
      </section>
      <section className="rounded-2xl border bg-white p-5 text-[#2c2824] shadow-sm">
        <h2 className="border-b pb-3 text-lg font-black">{r.document_title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{r.record_type}</p>
        <div className="mt-5 grid gap-0 border sm:grid-cols-2">{entries.map(([key,value])=><div key={key} className="border-b p-3"><p className="text-[10px] font-bold text-muted-foreground">{key}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-7">{typeof value==="object"?JSON.stringify(value):String(value)}</p></div>)}</div>
      </section>
      {!signed&&<section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="rounded-xl border bg-muted/30 p-3 text-xs leading-6">بتوقيعك وحفظك، فإنك تؤكد أنك قرأت المستند الظاهر أعلاه وتعتمد محتواه بهذه الصفة.</div>
        <SignaturePad label="التوقيع الإلكتروني" value={signature} onChange={setSignature}/>
        <div><p className="mb-2 text-sm font-bold">ملاحظة (اختياري)</p><Textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}/></div>
        <label className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3 text-xs leading-6">
          <input type="checkbox" className="mt-1 size-4 shrink-0" checked={confirmedRead} onChange={e=>setConfirmedRead(e.target.checked)}/>
          <span>أقر بأنني قرأت المستند الظاهر أعلاه، وأن الاسم والصفة المعروضين يخصان طلب التوقيع المرسل إليّ، وأرغب في اعتماد هذه النسخة.</span>
        </label>
        {sign.isError&&<p className="text-sm text-destructive">{(sign.error as Error).message}</p>}
        <Button className="w-full" size="lg" disabled={!signature||!confirmedRead||sign.isPending} onClick={()=>sign.mutate()}>{sign.isPending?<Loader2 className="size-4 animate-spin"/>:<CheckCircle2 className="size-4"/>}اعتماد وتوقيع وحفظ</Button>
      </section>}
      <p className="pb-6 text-center text-[10px] text-muted-foreground">هذا الاعتماد سجل إلكتروني داخل الذات | ATHAT، وليس توقيعًا رقميًا حكوميًا موثقًا ما لم تتم إضافة خدمة توثيق معتمدة.</p>
    </div>
  </main>
}
