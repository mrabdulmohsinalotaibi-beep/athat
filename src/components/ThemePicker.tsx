import { Check, Palette } from "lucide-react";

import { THEMES, type AppTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SWATCH: Record<AppTheme, string> = {
  thaat: "bg-theme-thaat",
  royal: "bg-theme-royal",
  sage: "bg-theme-sage",
  amber: "bg-theme-amber",
};

export function ThemePicker({ compact = false, onChange }: { compact?: boolean; onChange?: (theme: AppTheme) => void }) {
  const { theme, setTheme } = useTheme();

  function choose(next: AppTheme) {
    setTheme(next);
    onChange?.(next);
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="اختيار ثيم المنصة" title="اختيار ثيم المنصة">
            <Palette className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 text-right">
          <DropdownMenuLabel>ثيم المنصة</DropdownMenuLabel>
          {THEMES.map((item) => (
            <DropdownMenuItem key={item.id} onSelect={() => choose(item.id)} className="min-h-10">
              <span className={cn("size-4 shrink-0 rounded-full", SWATCH[item.id])} />
              <span className="flex-1">{item.name}</span>
              {theme === item.id && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="ثيم المنصة">
      {THEMES.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant="outline"
          role="radio"
          aria-checked={theme === item.id}
          onClick={() => choose(item.id)}
          className={cn("h-auto min-h-20 justify-start whitespace-normal p-3 text-right", theme === item.id && "border-primary ring-2 ring-primary/20")}
        >
          <span className={cn("size-8 shrink-0 rounded-full border-4 border-card shadow-sm", SWATCH[item.id])} />
          <span className="min-w-0 flex-1 font-bold">{item.name}</span>
          {theme === item.id && <Check className="size-4 shrink-0 text-primary" />}
        </Button>
      ))}
    </div>
  );
}