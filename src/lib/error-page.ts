export interface ErrorPageOptions {
  title?: string;
  message?: string;
  errorCode?: string | number;
  showSupportLink?: boolean;
}

export function renderErrorPage(options: ErrorPageOptions = {}): string {
  const {
    title = "عذراً، حدث خطأ غير متوقع",
    message = "تعذر تحميل الصفحة المطلوبة أو معالجة طلبك حالياً. يمكنك إعادة المحاولة أو العودة للرئيسية.",
    errorCode = "500",
    showSupportLink = true,
  } = options;

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-color: #f8fafc;
        --card-bg: #ffffff;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --primary-color: #0f766e;
        --primary-hover: #0d9488;
        --border-color: #e2e8f0;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg-color: #0f172a;
          --card-bg: #1e293b;
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --primary-color: #14b8a6;
          --primary-hover: #2dd4bf;
          --border-color: #334155;
        }
      }
      * { box-sizing: border-box; }
      body {
        font-family: 'Tajawal', system-ui, -apple-system, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-primary);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        max-width: 28rem;
        width: 100%;
        padding: 2.5rem 2rem;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 1rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        text-align: center;
      }
      .icon-wrapper {
        width: 4rem;
        height: 4rem;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
      }
      .error-code {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--primary-color);
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }
      h1 { font-size: 1.35rem; margin: 0 0 0.75rem; font-weight: 700; }
      p { color: var(--text-secondary); margin: 0 0 2rem; line-height: 1.6; font-size: 0.95rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        padding: 0.625rem 1.25rem;
        border-radius: 0.5rem;
        font-family: inherit;
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .primary { background: var(--primary-color); color: #fff; }
      .primary:hover { background: var(--primary-hover); }
      .secondary { background: transparent; color: var(--text-primary); border-color: var(--border-color); }
      .secondary:hover { background: rgba(0, 0, 0, 0.05); }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon-wrapper">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="error-code">رمز الخطأ: ${errorCode}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">إعادة المحاولة</button>
        <button class="secondary" onclick="history.back()">الرجوع للخلف</button>
        <a class="secondary" href="/">الصفحة الرئيسية</a>
      </div>
    </div>
  </body>
</html>`;
}