import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROLES = ["مدير","وكيل","إداري","معلم","موجه طلابي","ولي أمر","أخرى"];

export function SendForSignatureDialog({
  open,onOpenChange,recordTable,recordId,recordType,title,snapshot,
}: {
  open:boolean; onOpenChange:(open:boolean)=>void; recordTable:string; recordId:string;
  recordType:string; title:string; snapshot:Record<string,unknown>;
}) {
  const [name,setName]=useState("");
  const [role,setRole]=useState("مدير");
  const [customRole,setCustomRole]=useState("");
  const [phone,setPhone]=useState("");
  const [busy,setBusy]=useState(false);
  const [link,setLink]=useState("");
  const requests=useQuery({
    queryKey:["document-signatures",recordTable,recordId],
    enabled:open,
    refetchInterval:10000,
    queryFn:async()=>{
      const {data,error}=await (supabase as any).from("document_signature_requests")
        .select("id,signer_name,signer_role,status,signed_at,created_at,signature_data,signer_note")
        .eq("record_table",recordTable).eq("record_id",recordId)
        .order("created_at",{ascending:false});
      if(error)throw error;
      return data??[];
    },
  });

  async function createRequest() {
    const finalRole=role==="أخرى"?customRole.trim():role;
    if(name.trim().length<2){toast.error("أدخل اسم الشخص المطلوب توقيعه.");return;}
    if(!finalRole){toast.error("اكتب صفة الموقّع.");return;}
    setBusy(true);
    try {
      const {data,error}=await (supabase as any).rpc("create_document_signature_request",{
        p_record_table:recordTable,p_record_id:recordId,p_record_type:recordType,
        p_document_title:title,p_document_snapshot:snapshot,p_signer_name:name.trim(),
        p_signer_role:finalRole,p_signer_phone:phone.trim()||null,
      });
      if(error) throw error;
      const url=`${window.location.origin}/approve/${data}`;
      setLink(url);
      await requests.refetch();
      toast.success("تم إنشاء طلب الاعتماد والتوقيع.");
    } catch(error){toast.error((error as Error).message);}
    finally{setBusy(false);}
  }

  const message=link?`السلام عليكم،\n\nلديك مستند «${title}» من الذات | ATHAT للقراءة والاعتماد والتوقيع الإلكتروني.\n\nالاسم: ${name}\nالصفة: ${role==="أخرى"?customRole:role}\n\nافتح الرابط التالي:\n${link}`:"";

  function whatsapp(){
    if(!link)return;
    const normalized=phone.replace(/\D/g,"").replace(/^0/,"966");
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent dir="rtl" className="max-w-lg">
      <DialogHeader><DialogTitle>إرسال للاعتماد والتوقيع</DialogTitle></DialogHeader>
      {!link ? <div className="space-y-4">
        <div><Label>اسم الموقّع</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم الكامل" /></div>
        <div><Label>الصفة</Label><select value={role} onChange={e=>setRole(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3">{ROLES.map(x=><option key={x}>{x}</option>)}</select></div>
        {role==="أخرى"&&<div><Label>اكتب الصفة</Label><Input value={customRole} onChange={e=>setCustomRole(e.target.value)} /></div>}
        <div><Label>رقم الجوال (اختياري)</Label><Input dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05xxxxxxxx" /></div>
        <div className="rounded-xl border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">سيُحفظ محتوى المستند الحالي كلقطة ثابتة، ويُنشأ رابط خاص لهذا الموقّع. الرابط يسمح بالقراءة والتوقيع فقط ولا يسمح بتعديل المستند.</div>
        <Button className="w-full" disabled={busy} onClick={createRequest}><Send className="size-4"/>{busy?"جارٍ الإنشاء...":"إنشاء رابط التوقيع"}</Button>
      </div>:<div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4"><p className="flex items-center gap-2 font-black"><CheckCircle2 className="size-5"/>تم إنشاء رابط التوقيع</p><p dir="ltr" className="mt-2 break-all text-xs">{link}</p></div>
        <Button className="w-full" onClick={whatsapp}><Share2 className="size-4"/>إرسال عبر واتساب</Button>
        <Button variant="outline" className="w-full" onClick={async()=>{await navigator.clipboard.writeText(link);toast.success("تم نسخ الرابط.");}}><Copy className="size-4"/>نسخ الرابط</Button>
      </div>}
      {(requests.data?.length ?? 0)>0&&<div className="mt-4 border-t pt-4">
        <p className="mb-2 text-sm font-black">حالة الاعتمادات لهذا المستند</p>
        <div className="space-y-2">{requests.data!.map((item:any)=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div><p className="text-sm font-bold">{item.signer_name}</p><p className="text-xs text-muted-foreground">{item.signer_role}</p></div>
          <div className="text-left">{item.status==="signed"?<><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700">تم التوقيع</span><p className="mt-1 text-[10px] text-muted-foreground">{item.signed_at?new Date(item.signed_at).toLocaleString("ar-SA"):""}</p></>:<span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-700">بانتظار التوقيع</span>}</div>
        </div>)}</div>
      </div>}
    </DialogContent>
  </Dialog>;
}
