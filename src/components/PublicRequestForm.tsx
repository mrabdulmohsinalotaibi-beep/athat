import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { submitPublicRequestFallback } from "@/lib/public-request.functions";

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
  schoolSlug?: string | undefined;
  portalToken?: string | undefined;
  feedbackToken?: string | undefined;
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
  schoolSlug,
  portalToken,
  feedbackToken,
}: PublicRequestFormProps) {
  const [anonymous, setAnonymous] = useState(false);
  const [requestNo, setRequestNo] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const args = {
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
        p_slug: schoolSlug?.trim() || null,
        p_portal_token: portalToken?.trim() || null,
      };

      const v3 = await (supabase as any).rpc("submit_public_request_v3", args);
      if (!v3.error && v3.data && typeof v3.data === "object") {
        return {
          requestNo: String(v3.data.request_no || "تم الاستلام"),
          trackingCode:
            typeof v3.data.tracking_code === "string" ? v3.data.tracking_code : null,
        };
      }

      const v3Missing =
        !v3.error ||
        /Could not find the function|schema cache|PGRST202|PGRST205|public_requests/i.test(
          v3.error.message,
        );
      if (!v3Missing && v3.error) throw v3.error;

      const { data, error } = await (supabase as any).rpc("submit_public_request_v2", args);
      if (!error) {
        return {
          requestNo: typeof data === "string" ? data : "تم الاستلام",
          trackingCode: null,
        };
      }

      const missingRequestChannel =
        /Could not find the function|schema cache|PGRST202|PGRST205|public_requests/i.test(error.message);

      if (!missingRequestChannel) throw error;

      // Backward-compatible attempt for deployments where the first request RPC exists.
      const legacyArgs = {
        p_kind: args.p_kind,
        p_details: args.p_details,
        p_requester_name: args.p_requester_name,
        p_requester_role: args.p_requester_role,
        p_requester_contact: args.p_requester_contact,
        p_student_name: args.p_student_name,
        p_student_grade: args.p_student_grade,
        p_classroom: args.p_classroom,
        p_topic: args.p_topic,
        p_urgency: args.p_urgency,
        p_preferred_time: args.p_preferred_time,
        p_is_anonymous: args.p_is_anonymous,
        p_slug: args.p_slug,
      };
      const legacy = await (supabase as any).rpc("submit_public_request", legacyArgs);
      if (!legacy.error) {
        return {
          requestNo: typeof legacy.data === "string" ? legacy.data : "تم الاستلام",
          trackingCode: null,
        };
      }

      const legacyMissing =
        /Could not find the function|schema cache|PGRST202|PGRST205|public_requests/i.test(
          legacy.error.message,
        );

      // Production compatibility: the existing feedback_messages channel is already
      // deployed. Use it as the guaranteed inbox until public_requests is deployed.
      if (legacyMissing && feedbackToken?.trim()) {
        const lines = [
          `[نوع الطلب] ${kind}`,
          args.p_topic ? `[الموضوع] ${args.p_topic}` : "",
          args.p_student_name ? `[الطالب] ${args.p_student_name}` : "",
          args.p_student_grade ? `[الصف] ${args.p_student_grade}` : "",
          args.p_classroom ? `[الفصل] ${args.p_classroom}` : "",
          args.p_urgency ? `[الأهمية] ${args.p_urgency}` : "",
          args.p_preferred_time ? `[الوقت المفضل] ${args.p_preferred_time}` : "",
          "",
          args.p_details,
        ]
          .filter(Boolean)
          .join("\n");

        const feedback = await (supabase as any).rpc("submit_public_feedback", {
          p_token: feedbackToken.trim(),
          p_sender_name: anonymous ? "مجهول" : args.p_requester_name || "مستفيد",
          p_sender_contact: anonymous ? "" : args.p_requester_contact || "",
          p_sender_role: args.p_requester_role || (anonymous ? "مجهول" : "مستفيد"),
          p_category: kind,
          p_satisfaction: null,
          p_message: lines,
        });

        if (!feedback.error) {
          return { requestNo: "تم الاستلام", trackingCode: null };
        }
      }

      const fallback = await submitPublicRequestFallback({
        data: {
          kind,
          details: args.p_details,
          requesterName: args.p_requester_name,
          requesterRole: args.p_requester_role,
          requesterContact: args.p_requester_contact,
          studentName: args.p_student_name,
          studentGrade: args.p_student_grade,
          classroom: args.p_classroom,
          topic: args.p_topic,
          urgency:
            args.p_urgency === "مهم" || args.p_urgency === "عاجل"
              ? args.p_urgency
              : "عادي",
          preferredTime: args.p_preferred_time,
          isAnonymous: anonymous,
          schoolSlug: args.p_slug,
          portalToken: args.p_portal_token,
        },
      });

      if (typeof fallback === "string") {
        return { requestNo: fallback, trackingCode: null };
      }
      if (fallback && typeof fallback === "object" && "requestNo" in fallback) {
        const value = (fallback as { requestNo?: unknown }).requestNo;
        return {
          requestNo: typeof value === "string" ? value : "تم الاستلام",
          trackingCode: null,
        };
      }
      return { requestNo: "تم الاستلام", trackingCode: null };
    },
    onSuccess: (result) => {
      setSubmitted(true);
      setRequestNo(result.requestNo?.trim() || "تم الاستلام");
      setTrackingCode(result.trackingCode?.trim() || null);
      toast.success("تم إرسال الاستمارة بنجاح");
    },
    onError: (error: Error) => {
      const message =
        /Missing Supabase environment variable|SUPABASE_SERVICE_ROLE_KEY/i.test(error.message)
          ? "تعذّر إرسال الاستمارة لأن خدمة استقبال الطلبات لم تُربط بقاعدة البيانات على الخادم."
          : error.message;
      toast.error(message);
    },
  });

  if (!schoolSlug?.trim() && !portalToken?.trim() && !feedbackToken?.trim()) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <ShieldCheck className="mx-auto size-10 text-amber-700" />
        <h2 className="mt-4 text-xl font-black">رابط الاستمارة غير مرتبط بمدرسة</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          افتح هذه الاستمارة من مدونة الموجه الطلابي أو رابط المدرسة حتى يصل الطلب إلى
          الموجه الصحيح.
        </p>
      </div>
    );
  }

  if (requestNo) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-[#E4ECDF]/70 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-xl font-black">تم استلام طلبك</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          وصل الطلب إلى صندوق الطلبات لدى الموجه الطلابي وسيتم التعامل معه وفق الأولوية.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <p className="inline-flex rounded-full bg-card px-4 py-2 text-sm font-bold">
            رقم الطلب: {requestNo}
          </p>
          {trackingCode && (
            <p className="inline-flex rounded-full bg-card px-4 py-2 text-sm font-bold">
              رمز التتبع: {trackingCode}
            </p>
          )}
        </div>
        {trackingCode && (
          <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-muted-foreground">
            احتفظ برقم الطلب ورمز التتبع. لا يمكن الاطلاع على حالة الطلب من الصفحة العامة بدونهما.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {trackingCode && (
            <Button asChild>
              <Link
                to="/request-status"
                search={{ request: requestNo, code: trackingCode }}
              >
                تتبع حالة الطلب
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setRequestNo(null);
              setTrackingCode(null);
              setSubmitted(false);
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

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-[#E4ECDF]/70 p-4 text-xs leading-6 text-muted-foreground">
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
          if (submit.isPending || submitted) return;
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
              className="h-9 w-full rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
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
            className="h-9 w-full rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
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
            className="h-9 w-full rounded-md border border-[#D9C0A3]/45 bg-[#FFFDF9] px-3 text-sm"
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
          <Button type="submit" disabled={submit.isPending || submitted} className="font-bold">
            {submit.isPending ? "جارٍ الإرسال…" : submitted ? "تم الإرسال" : "إرسال الاستمارة"}
          </Button>
        </div>
      </form>
    </div>
  );
}
