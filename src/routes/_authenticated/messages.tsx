import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الآراء والرسائل</h1>
        <p className="text-sm text-muted-foreground">
          إدارة ومتابعة آراء الطلاب والمستفيدين والرسائل الواردة.
        </p>
      </div>

      {/* محتوى الصفحة */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          لا توجد رسائل أو آراء حتى الآن.
        </p>
      </div>
    </div>
  );
}