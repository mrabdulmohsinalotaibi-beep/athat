import { FileText, HeartHandshake, MessageSquareText, PhoneCall, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

const TEMPLATES = [
  {
    title: "خطة مقابلة إرشادية",
    description: "هيكل مختصر لإدارة المقابلة وتوثيق الإجراء القادم.",
    icon: HeartHandshake,
    to: "/interviews",
    content: "موضوع المقابلة:\nالهدف الإرشادي:\nأبرز الملاحظات:\nالإجراء المتفق عليه:\nموعد المتابعة:",
  },
  {
    title: "رسالة متابعة ولي أمر",
    description: "صياغة مهنية قابلة للتخصيص قبل الإرسال.",
    icon: PhoneCall,
    to: "/messages",
    content: "السلام عليكم ورحمة الله وبركاته،\nنود إشعاركم بأنه تمت متابعة ابنكم/ابنتكم بشأن الموضوع محل الاهتمام، ونأمل تعاونكم في تنفيذ التوصيات التالية:\n\nالتوصيات:\nموعد المتابعة القادم:\nشاكرين لكم تعاونكم.",
  },
  {
    title: "محضر إجراء إرشادي",
    description: "قالب لتوثيق الإجراء والنتيجة والشاهد المرتبط.",
    icon: FileText,
    to: "/evidences",
    content: "التاريخ:\nاسم الطالب/الفئة:\nنوع الإجراء:\nالجهة المشاركة:\nالنتيجة:\nالشاهد أو المرفق:\nملاحظات:",
  },
  {
    title: "خطة نشاط وقائي",
    description: "عناصر جاهزة لبناء برنامج توعوي قابل للقياس.",
    icon: Sparkles,
    to: "/programs",
    content: "اسم النشاط:\nالفئة المستهدفة:\nالهدف:\nمحاور التنفيذ:\nمؤشر النجاح:\nالشواهد المطلوبة:\nتاريخ التنفيذ:",
  },
];

export function GuidanceTemplates() {
  async function copy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("تم نسخ القالب، ويمكنك تخصيصه في السجل المناسب");
    } catch {
      toast.error("تعذّر نسخ القالب من المتصفح");
    }
  }

  return (
    <section className="dashboard-panel rounded-3xl border border-primary/12 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <MessageSquareText className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-black">مكتبة القوالب الإرشادية</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            نماذج عملية تساعدك على بدء التوثيق بسرعة وبصياغة مهنية موحدة.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="group rounded-2xl border bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <Icon className="size-4" />
                <h3 className="text-xs font-black text-foreground">{item.title}</h3>
              </div>
              <p className="mt-2 min-h-10 text-[11px] leading-5 text-muted-foreground">{item.description}</p>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8 flex-1 text-[10px]" onClick={() => void copy(item.content)}>
                  نسخ القالب
                </Button>
                <Button asChild type="button" size="sm" className="h-8 px-2 text-[10px]">
                  <Link to={item.to as never}>فتح</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
