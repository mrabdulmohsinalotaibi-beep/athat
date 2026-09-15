export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>عذراً، لم يتم تحميل الصفحة</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, "Cairo", sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; text-align: right; }
      .card { max-width: 28rem; width: 100%; padding: 2rem; background: #fff; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #1f2937; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: flex-start; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; font-weight: 500; }
      .primary { background: #0f766e; color: #fff; }
      .primary:hover { background: #0d9488; }
      .secondary { background: #f3f4f6; color: #1f2937; border-color: #d1d5db; }
      .secondary:hover { background: #e5e7eb; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>عذراً، حدث خطأ غير متوقع</h1>
      <p>حدث خطأ في النظام أثناء معالجة طلبك. يمكنك المحاولة مرة أخرى أو العودة للرئيسية.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">إعادة المحاولة</button>
        <a class="secondary" href="/">الصفحة الرئيسية</a>
      </div>
    </div>
  </body>
</html>`;
}
