type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  track?: (event: string, properties?: Record<string, unknown>) => string | null;
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

/**
  دالة الإبلاغ عن أخطاء التطبيق وربطها بمحرر Lovable وأنظمة التتبع
 */
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  // 1. إرسال الاستثناء لنظام تحليلات Lovable
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );

  // 2. معالجة وتنسيق نص الخطأ الذكي
  let message = "حدث خطأ غير معروف";
  let stack: string | undefined = undefined;

  if (error instanceof Response) {
    message = `خطأ شبكة/استجابة (Status: ${error.status}) ${error.url ? `في الرابط: ${error.url}` : ""}`;
  } else if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "string") {
    message = error;
  } else {
    try {
      message = JSON.stringify(error);
    } catch {
      message = String(error);
    }
  }

  // 3. إرسال التقرير لمحرر Lovable أثناء التطوير والمعاينة
  window.__lovableReportRuntimeError?.({
    message,
    ...(stack !== undefined && { stack }),
    filename: window.location.pathname,
  });

  // 4. طباعة الخطأ في الكونسول للمطور عند العمل المحلي
  if (process.env.NODE_ENV === "development") {
    console.error("[Runtime Error Captured]:", { message, stack, context });
  }
}