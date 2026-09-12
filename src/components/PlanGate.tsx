import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useSubscription } from "@/lib/subscription";
import { Button } from "@/components/ui/button";

export function PlanGate({ children, feature }: { children: React.ReactNode; feature: string }) {
  const { data } = useSubscription();
  if (data?.plan === "pro") return children;
  return (
    <div className="rounded-lg border border-dashed bg-muted/35 p-4 text-center">
      <LockKeyhole className="mx-auto size-5 text-primary" />
      <p className="mt-2 text-sm font-bold">{feature} ضمن باقة الموجه المحترف</p>
      <p className="mt-1 text-xs text-muted-foreground">رقِّ حسابك للوصول إلى هذه الميزة دون حدود.</p>
      <Button asChild size="sm" variant="outline" className="mt-3">
        <Link to="/subscription">عرض الباقات</Link>
      </Button>
    </div>
  );
}
