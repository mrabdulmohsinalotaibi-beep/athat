import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

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
        className="no-print border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E]"
      >
        <MessageCircle className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراسلة ولي الأمر عبر واتساب</DialogTitle>
            <DialogDescription>
              الرقم: {number} — يمكنك تعديل نص الرسالة قبل فتح محادثة واتساب.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-[#25D366] text-white hover:bg-[#1da851]"
              onClick={() => {
                window.open(whatsappLink(number, message), "_blank", "noopener");
                setOpen(false);
              }}
            >
              <Send className="size-4" /> فتح واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
