import { useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";

import { useSchool } from "@/lib/school";
import { defaultGuardianMessage, normalizeSaudiPhone, whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WhatsAppButton({
  phone,
  guardian,
  student,
  label,
}: {
  phone: unknown;
  guardian?: string | undefined;
  student?: string | undefined;
  label?: string | undefined;
}) {
  const { data: school } = useSchool();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const number = normalizeSaudiPhone(phone);

  if (!number) return null;

  function start() {
    setMessage(
      defaultGuardianMessage({
        guardian: guardian ?? "",
        student: student ?? "",
        school: school?.school_name ?? "",
      }),
    );
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={label ? "sm" : "icon"}
        onClick={start}
        title={`مراسلة ولي الأمر عبر واتساب (${number})`}
        className="no-print gap-1.5 border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]"
      >
        <MessageCircle className="size-4 shrink-0 text-[#25D366]" />
        {label && <span>{label}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#128C7E]">
                <MessageCircle className="size-5 text-[#25D366]" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold">مراسلة ولي الأمر عبر واتساب</DialogTitle>
                <DialogDescription className="text-xs">
                  الرقم: <span dir="ltr" className="font-semibold text-foreground">{number}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-primary" /> نص الرسالة المقترح (قابلة للتعديل):
              </label>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none font-sans text-sm leading-relaxed"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-[#25D366] text-white hover:bg-[#1da851] gap-2 shadow-sm"
              onClick={() => {
                window.open(whatsappLink(number, message), "_blank", "noopener");
                setOpen(false);
              }}
            >
              <Send className="size-4" /> فتح واتساب وإرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
