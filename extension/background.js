const SESSION_KEY = "athatSession";

async function getConfig() {
  const { supabaseUrl, publishableKey } = await chrome.storage.local.get([
    "supabaseUrl",
    "publishableKey",
  ]);
  if (!supabaseUrl || !publishableKey) throw new Error("أكمل إعداد رابط Supabase والمفتاح العام.");
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), publishableKey };
}

async function getSession() {
  const data = await chrome.storage.session.get(SESSION_KEY);
  return data[SESSION_KEY] || null;
}

async function authFetch(path, init = {}) {
  const config = await getConfig();
  const session = await getSession();
  if (!session?.access_token) throw new Error("سجّل الدخول إلى منصة الذات أولاً.");
  const headers = new Headers(init.headers || {});
  headers.set("apikey", config.publishableKey);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${config.supabaseUrl}${path}`, { ...init, headers });
  if (response.status === 401) throw new Error("انتهت جلسة الذات. سجّل الدخول من جديد.");
  return response;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "ATHAT_LOGIN") {
        const { supabaseUrl, publishableKey, email, password } = message.payload;
        await chrome.storage.local.set({ supabaseUrl, publishableKey });
        const base = supabaseUrl.replace(/\/$/, "");
        const response = await fetch(`${base}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { apikey: publishableKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json?.msg || json?.error_description || "فشل تسجيل الدخول.");
        await chrome.storage.session.set({ [SESSION_KEY]: json });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "ATHAT_LOGOUT") {
        await chrome.storage.session.remove(SESSION_KEY);
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "ATHAT_STATUS") {
        sendResponse({ ok: true, connected: Boolean((await getSession())?.access_token) });
        return;
      }

      if (message.type === "ATHAT_TODAY_ATTENDANCE") {
        const today = new Date().toISOString().slice(0, 10);
        const response = await authFetch(
          `/rest/v1/attendance?select=id,student_id,student_name,student_no,adate,case_type,action&adate=eq.${encodeURIComponent(today)}`,
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "تعذر جلب المواظبة.");
        sendResponse({ ok: true, data });
        return;
      }

      if (message.type === "ATHAT_IMPORT_STUDENTS") {
        const rows = Array.isArray(message.payload) ? message.payload : [];
        if (!rows.length) throw new Error("لا توجد بيانات طلاب صالحة.");
        const response = await authFetch("/rest/v1/students?on_conflict=national_id", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify(rows),
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data?.message || "تعذر استيراد الطلاب.");
        sendResponse({ ok: true, data });
        return;
      }

      throw new Error("أمر غير معروف.");
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  })();
  return true;
});