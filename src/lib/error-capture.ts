// آلية متطورة لاقتناص الأخطاء وحفظها في ذاكرة المؤقتة بدون فقدان الـ Stack Trace

interface CapturedError {
  id: string;
  error: unknown;
  at: number;
}

const errorsQueue = new Map<string, CapturedError>();
const TTL_MS = 10_000; // زيادة الصلاحية لـ 10 ثوانٍ لضمان المعالجة
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

/**
 * تسجيل خطأ جديد في الطابور المباشر
 */
export function recordError(error: unknown): string {
  const id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  errorsQueue.set(id, { id, error, at: Date.now() });

  // تنظيف الأخطاء القديمة تلقائياً
  cleanExpiredErrors();
  return id;
}

/**
 * وصف وتحليل الخطأ بجميع مستوياته وحالاته
 */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }
    const label = depth === 0 ? "" : "سبب تابع (Caused by): ";
    const status = describeStatus(current);
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
    current = current.cause;
  }

  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (رمز الحالة: ${value})` : "";
}

function safeStringify(value: unknown): string {
  try {
    const seen = new WeakSet();
    return (
      JSON.stringify(value, (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular Reference]";
          seen.add(val);
        }
        return val;
      }) ?? String(value)
    );
  } catch {
    return String(value);
  }
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error || (typeof value === "object" && value !== null && "message" in value);
}

// تغليف console.error بأمان
const originalConsoleError = console.error.bind(console);
if (!(console.error as any).__isWrappedByErrorCatcher) {
  const wrappedConsoleError = (...args: unknown[]) => {
    const expanded = args.map((arg) => {
      if (!isErrorLike(arg)) return arg;
      recordError(arg);
      return describeError(arg);
    });
    originalConsoleError(...expanded);
  };
  (wrappedConsoleError as any).__isWrappedByErrorCatcher = true;
  console.error = wrappedConsoleError;
}

// الاستماع العام للأخطاء والوعود غير المعالجة
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => recordError((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) => recordError((event as PromiseRejectionEvent).reason));
}

/**
 * استرجاع واستيعاب الخطأ الأخير المنفذ
 */
export function consumeLastCapturedError(): unknown {
  cleanExpiredErrors();
  if (errorsQueue.size === 0) return undefined;

  // جلب أحدث خطأ في القائمة
  const lastKey = Array.from(errorsQueue.keys()).pop();
  if (!lastKey) return undefined;

  const item = errorsQueue.get(lastKey);
  errorsQueue.delete(lastKey);
  return item?.error;
}

/**
 * تنظيف السجلات المنتهية الصلاحية
 */
function cleanExpiredErrors() {
  const now = Date.now();
  for (const [id, item] of errorsQueue.entries()) {
    if (now - item.at > TTL_MS) {
      errorsQueue.delete(id);
    }
  }
}