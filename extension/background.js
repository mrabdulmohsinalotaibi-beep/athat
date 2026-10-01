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
  if (!session?.access_token) throw new Error("سجّل الدخول إلى الذات أولاً.");
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

      if (message.type === "ATHAT_READY_NOOR_JOBS") {
        const response = await authFetch(
          "/rest/v1/noor_export_jobs?select=id,source_table,source_id,payload,status,noor_reference&status=eq.ready&order=updated_at.desc&limit=200",
        );
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data?.message || "تعذر جلب السجلات الجاهزة لنور.");
        sendResponse({ ok: true, data: Array.isArray(data) ? data : [] });
        return;
      }

      if (message.type === "ATHAT_MARK_NOOR_JOB") {
        const { id, status = "submitted", noor_reference = null } = message.payload || {};
        if (!id) throw new Error("معرف عملية نور مفقود.");
        const response = await authFetch(
          `/rest/v1/noor_export_jobs?id=eq.${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              status,
              noor_reference,
              submitted_at: status === "submitted" ? new Date().toISOString() : null,
              last_error: null,
              pause_reason: null,
            }),
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "تعذر تحديث حالة عملية نور.");
        }
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "ATHAT_IMPORT_STUDENTS") {
        const rows = Array.isArray(message.payload) ? message.payload : [];
        if (!rows.length) throw new Error("لا توجد بيانات طلاب صالحة.");

        const ids = rows
          .map((row) => String(row.national_id || "").replace(/\D/g, ""))
          .filter((id) => id.length === 10);

        const uniqueIds = [...new Set(ids)];
        const existingResponse = await authFetch(
          `/rest/v1/students?select=national_id&national_id=in.(${uniqueIds.map(encodeURIComponent).join(",")})`,
        );
        const existingData = await existingResponse.json().catch(() => []);
        if (!existingResponse.ok) {
          throw new Error(existingData?.message || "تعذر التحقق من الطلاب الموجودين.");
        }

        const existingIds = new Set(
          (Array.isArray(existingData) ? existingData : [])
            .map((row) => String(row.national_id || ""))
            .filter(Boolean),
        );

        const seen = new Set();
        const fresh = rows.filter((row) => {
          const id = String(row.national_id || "").replace(/\D/g, "");
          if (id.length !== 10 || existingIds.has(id) || seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        if (!fresh.length) {
          sendResponse({ ok: true, data: [], inserted: 0, skipped: rows.length });
          return;
        }

        const response = await authFetch("/rest/v1/students", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(fresh),
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data?.message || "تعذر استيراد الطلاب.");

        sendResponse({
          ok: true,
          data,
          inserted: fresh.length,
          skipped: rows.length - fresh.length,
        });
        return;
      }

      throw new Error("أمر غير معروف.");
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  })();
  return true;
});