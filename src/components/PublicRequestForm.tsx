import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export type PublicRequestKind = "استشارة فردية" | "إحالة طالب" | "إبلاغ سري";

export interface PublicRequestFormProps {
  kind: PublicRequestKind;
  heading: string;
  intro: string;
  detailsLabel: string;
  detailsPlaceholder: string;
  topicLabel: string;
  topicOptions: readonly string[];
  roleLabel?: string;
  roleOptions?: readonly string[];
  requireIdentity?: boolean;
  allowAnonymous?: boolean;
  showStudentFields?: boolean;
  showPreferredTime?: boolean;
  privacyNote: string;
}

const URGENCY_OPTIONS = ["عادي", "مهم", "عاجل"] as const;

export function PublicRequestForm({
  kind,
  heading,
  intro,
  detailsLabel,
  detailsPlaceholder,
  topicLabel,
  topicOptions,
  roleLabel = "الصفة",
  roleOptions,
  requireIdentity = true,
  allowAnonymous = false,
  showStudentFields = true,
  showPreferredTime = false,
  privacyNote,
}: PublicRequestFormProps) {
  const [anonymous, setAnonymous] = useState(false);
  const [requestNo, setRequestNo] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data, error } = await supabase.rpc("submit_public_request", {
        p_kind: kind,
        p_details: values["details"] ?? "",
        p_requester_name: anonymous ? null : (values["requester_name"] ?? null),
        p_requester_role: values["requester_role"] ?? null,
        p_requester_contact: anonymous ? null : (values["requester_contact"] ?? null),
        p_student_name: values["student_name"] ?? null,
        p_student_grade: values["student_grade"] ?? null,
        p_classroom: values["classroom"] ?? null,
        p_topic: values["topic"] ?? null,
        p_urgency: values["urgency"] ?? "عادي",
        p_preferred_time: values["preferred_time"] ?? null,
        p_is_anonymous: anonymous,
      });
      if (error) throw error;
      return typeof data === "string" ? data : null;
    },
    onSuccess: (no) => {
      setRequestNo(no ?? "—");
      toast.success("تم إرسال الاستمارة بنجاح");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (requestNo) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-xl font-black">تم استلام طلبك</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          وصل الطلب إلى صندوق الطلبات لدى الموجه الطلابي وسيتم التعامل معه وفق الأولوية.
        </p>
        <p className="mt-4 inline-flex rounded-full bg-card px-4 py-2 text-sm font-bold">
          رقم الطلب: {requestNo}
        </p>
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setRequestNo(null);
              setAnonymous(false);
            }}
          >
            إرسال طلب آخر
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-black">{heading}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{intro}</p>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-6 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>{privacyNote}</p>
      </div>

      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const values: Record<string, string> = {};
          data.forEach((value, key) => {
            const text = String(value).trim();
            if (text) values[key] = text;
          });
          if ((values["details"]?.length ?? 0) < 10) {
            toast.error("يرجى كتابة تفاصيل أوضح (١٠ أحرف على الأقل)");
            return;
          }
          submit.mutate(values);
        }}
      >
        {allowAnonymous && (
          <label className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
            />
            أرغب بالإبلاغ دون ذكر اسمي أو بيانات التواصل
          </label>
        )}

        {!anonymous && (
          <>
            <div>
              <Label htmlFor="requester_name" className="mb-1.5 block text-xs">
                الاسم
              </Label>
              <Input
                id="requester_name"
                name="requester_name"
                required={requireIdentity}
                placeholder="الاسم الكامل"
              />
            </div>
            <div>
              <Label htmlFor="requester_contact" className="mb-1.5 block text-xs">
                وسيلة التواصل
              </Label>
              <Input
                id="requester_contact"
                name="requester_contact"
                required={requireIdentity}
                placeholder="رقم الجوال أو البريد الإلكتروني"
              />
            </div>
          </>
        )}

        {roleOptions && roleOptions.length > 0 && (
          <div>
            <Label htmlFor="requester_role" className="mb-1.5 block text-xs">
              {roleLabel}
            </Label>
            <select
              id="requester_role"
              name="requester_role"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={roleOptions[0]}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label htmlFor="topic" className="mb-1.5 block text-xs">
            {topicLabel}
          </Label>
          <select
            id="topic"
            name="topic"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={topicOptions[0]}
          >
            {topicOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {showStudentFields && (
          <>
            <div>
              <Label htmlFor="student_name" className="mb-1.5 block text-xs">
                اسم الطالب
              </Label>
              <Input id="student_name" name="student_name" placeholder="اسم الطالب المعني" />
            </div>
            <div>
              <Label htmlFor="student_grade" className="mb-1.5 block text-xs">
                الصف
              </Label>
              <Input id="student_grade" name="student_grade" placeholder="مثال: الثاني المتوسط" />
            </div>
            <div>
              <Label htmlFor="classroom" className="mb-1.5 block text-xs">
                الفصل
              </Label>
              <Input id="classroom" name="classroom" placeholder="مثال: ٢/٣" />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="urgency" className="mb-1.5 block text-xs">
            درجة الأهمية
          </Label>
          <select
            id="urgency"
            name="urgency"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="عادي"
          >
            {URGENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {showPreferredTime && (
          <div>
            <Label htmlFor="preferred_time" className="mb-1.5 block text-xs">
              الوقت المفضل للمقابلة
            </Label>
            <Input
              id="preferred_time"
              name="preferred_time"
              placeholder="مثال: الأحد الحصة الثالثة"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="details" className="mb-1.5 block text-xs">
            {detailsLabel}
          </Label>
          <Textarea
            id="details"
            name="details"
            required
            rows={7}
            placeholder={detailsPlaceholder}
          />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={submit.isPending} className="font-bold">
            {submit.isPending ? "جارٍ الإرسال…" : "إرسال الاستمارة"}
          </Button>
        </div>
      </form>
    </div>
  );
}
