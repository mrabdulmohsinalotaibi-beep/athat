import { cn } from "@/lib/utils";

export const COPYRIGHT_TEXT = "جميع الحقوق محفوظة لـ Abdulmo7sin Alotaibi";

export function Copyright({ className }: { className?: string }) {
  return <p className={cn("text-center text-[10px] text-muted-foreground", className)}>{COPYRIGHT_TEXT}</p>;
}
