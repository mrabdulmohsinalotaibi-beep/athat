import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.max(window.devicePixelRatio, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.4;
    context.strokeStyle = "#2d2022";

    if (!value) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
    image.src = value;
  }, [value]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
    setHasInk(true);
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold"><PenLine className="size-4 text-primary" />{label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <Eraser className="size-4" /> مسح
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-md border bg-background cursor-crosshair"
        aria-label={label}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={finish}
        onPointerCancel={finish}
        onPointerLeave={finish}
      />
      <p className="text-xs text-muted-foreground">وقّع داخل المساحة باللمس أو الماوس، ثم احفظ الإعدادات.</p>
    </div>
  );
}