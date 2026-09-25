import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/upgrade-requests/")({
  head: () => ({ meta: [
    { title: "إدارة طلبات الترقية | الذات" },
    { name: "description", content: "مراجعة وإدارة طلبات الترقية لباقة الموجه المحترف." },
  ] }),
  component: AdminUpgradeRequestsPage,
});

// نموذج تجريبي للطلبات (استبدله لاحقاً بالبيانات القادمة من قاعدة البيانات مثل Supabase)
interface UpgradeRequest {
  id: string;
  userName: string;
  userEmail: string;
  message: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

function AdminUpgradeRequestsPage() {
  const [requests, setRequests] = useState<UpgradeRequest[]>([
    {
      id: "1",
      userName: "محمد العمري",
      userEmail: "mohammed@school.edu",
      message: "أحتاج إلى المساعد الكامل والتقارير المجمعة لمتابعة الحالات بشكل أوسع.",
      createdAt: "2026-09-17 10:30",
      status: "pending",
    },
    {
      id: "2",
      userName: "خالد الشمراني",
      userEmail: "khaled@school.edu",
      message: "أرغب في ترقية الحساب لتفعيل استيراد الطلاب بلا حدود.",
      createdAt: "2026-09-16 14:15",
      status: "pending",
    },
  ]);

  // دالة لتغيير حالة الطلب (قبول أو رفض) وتحديث قاعدة البيانات
  const handleUpdateStatus = (id: string, newStatus: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
    );
    // هنا تقوم بإضافة كود التحديث الفعلي في قاعدة البيانات (مثل Supabase)
    // مثال: supabase.from('upgrade_requests').update({ status: newStatus }).eq('id', id)
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" /> لوحة المشرف
          </Badge>
          <h1 className="mt-3 text-3xl font-extrabold">طلبات ترقية الباقات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            مراجعة طلبات الموجهين للانتقال إلى باقة "الموجه المحترف".
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/40 font-semibold text-sm flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          الطلبات الواردة ({requests.filter(r => r.status === 'pending').length} قيد الانتظار)
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات ترقية حالياً.
          </div>
        ) : (
          <div className="divide-y">
            {requests.map((req) => (
              <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <User className="size-4 text-primary" /> {req.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">({req.userEmail})</span>
                    
                    {req.status === "pending" && <Badge variant="outline" className="text-amber-600 border-amber-300">قيد الانتظار</Badge>}
                    {req.status === "approved" && <Badge variant="default" className="bg-emerald-600">تم القبول</Badge>}
                    {req.status === "rejected"  && <Badge variant="destructive">تم الرفض</Badge>}
                  </div>

                  {req.message && (
                    <div className="rounded-md bg-muted/60 p-3 text-sm text-foreground/90 max-w-xl">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">رسالة الطلب:</p>
                      {req.message}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">تاريخ الإرسال: {req.createdAt}</p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {req.status === "pending" ? (
                    <>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                        onClick={() => handleUpdateStatus(req.id, "approved")}
                      >
                        <CheckCircle2 className="size-4" /> موافقة وترقية
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => handleUpdateStatus(req.id, "rejected")}
                      >
                        <XCircle className="size-4" /> رفض
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {req.status === "approved" ? "تم منح باقة الموجه المحترف" : "تم رفض الطلب"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}