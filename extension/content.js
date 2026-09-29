(() => {
  const ROOT_ID = "athat-bridge-panel";

  function platform() {
    const host = location.hostname.toLowerCase();
    if (host === "noor.moe.gov.sa" || host.endsWith(".noor.moe.gov.sa")) return "noor";
    if (host === "schools.madrasati.sa" || host.endsWith(".madrasati.sa")) return "madrasati";
    return "unknown";
  }

  function normalize(value) {
    return String(value || "")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/ـ/g, "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function visibleTables() {
    return [...document.querySelectorAll("table")].filter((table) => {
      const rect = table.getBoundingClientRect();
      return rect.width > 100 && rect.height > 40;
    });
  }

  function tableMatrix(table) {
    return [...table.querySelectorAll("tr")]
      .map((tr) => [...tr.querySelectorAll("th,td")].map((cell) => cell.textContent?.trim() || ""))
      .filter((row) => row.some(Boolean));
  }

  function headerIndex(headers, patterns) {
    return headers.findIndex((header) => {
      const n = normalize(header);
      return patterns.some((pattern) => n.includes(normalize(pattern)));
    });
  }

  function scanStudents() {
    const candidates = [];
    for (const table of visibleTables()) {
      const matrix = tableMatrix(table);
      if (matrix.length < 2) continue;
      const headers = matrix[0];
      const nameIndex = headerIndex(headers, ["اسم الطالب", "الطالب", "الاسم"]);
      if (nameIndex < 0) continue;
      const idIndex = headerIndex(headers, ["رقم الهوية", "السجل المدني", "الهوية"]);
      const classIndex = headerIndex(headers, ["الفصل", "الصف"]);
      const gradeIndex = headerIndex(headers, ["الصف", "المرحلة"]);
      for (const row of matrix.slice(1)) {
        const full_name = String(row[nameIndex] || "").trim();
        if (!full_name) continue;
        candidates.push({
          full_name,
          national_id: idIndex >= 0 ? String(row[idIndex] || "").replace(/\D/g, "") : null,
          classroom: classIndex >= 0 ? String(row[classIndex] || "").trim() || null : null,
          grade: gradeIndex >= 0 ? String(row[gradeIndex] || "").trim() || null : null,
        });
      }
    }
    const unique = new Map(candidates.map((row) => [`${normalize(row.full_name)}:${row.national_id || ""}`, row]));
    return [...unique.values()];
  }

  function rowStudentName(row) {
    const cells = [...row.querySelectorAll("td")];
    const text = cells.map((cell) => cell.textContent?.trim() || "").filter(Boolean);
    return text.find((value) => /[\u0600-\u06FF]/.test(value) && value.length >= 5) || "";
  }

  function applyAttendance(absences) {
    const names = new Set(
      absences
        .map((item) => normalize(item.student_name))
        .filter(Boolean),
    );
    const matched = [];
    const unmatched = new Set(names);

    for (const table of visibleTables()) {
      for (const row of table.querySelectorAll("tr")) {
        const name = normalize(rowStudentName(row));
        if (!name || !names.has(name)) continue;
        const checkbox = row.querySelector('input[type="checkbox"]:not(:disabled)');
        if (!checkbox) continue;
        if (!checkbox.checked) checkbox.click();
        matched.push(name);
        unmatched.delete(name);
        row.style.outline = "2px solid #8b5736";
        row.style.outlineOffset = "-2px";
      }
    }

    return { matched: matched.length, unmatched: [...unmatched] };
  }

  function runtime(message) {
    return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  }

  function setPanelMessage(text, tone = "normal") {
    const el = document.getElementById("athat-bridge-message");
    if (!el) return;
    el.textContent = text;
    el.style.color =
      tone === "error" ? "#b42318" : tone === "success" ? "#2f6f4e" : "#6e655d";
  }

  async function importVisibleStudents() {
    const students = scanStudents();
    const valid = students.filter(
      (student) => student.full_name && student.national_id?.length === 10,
    );
    if (!valid.length) {
      setPanelMessage("لم أجد طلابًا باسم وهوية من 10 أرقام في الجدول الظاهر.", "error");
      return;
    }

    setPanelMessage(`تمت قراءة ${valid.length} طالب. جارٍ الإضافة إلى الذات…`);
    const response = await runtime({ type: "ATHAT_IMPORT_STUDENTS", payload: valid });
    if (!response?.ok) {
      setPanelMessage(response?.error || "تعذر استيراد الطلاب.", "error");
      return;
    }

    setPanelMessage(
      `تمت إضافة ${response.inserted ?? 0} طالب إلى الذات، وتجاوز ${response.skipped ?? 0} موجود/مكرر.`,
      "success",
    );
  }

  async function syncTodayAttendance() {
    if (platform() !== "noor") {
      setPanelMessage("مزامنة غياب اليوم متاحة داخل صفحة المواظبة في نظام نور فقط.", "error");
      return;
    }
    setPanelMessage("جارٍ سحب مواظبة اليوم من الذات…");
    const response = await runtime({ type: "ATHAT_TODAY_ATTENDANCE" });
    if (!response?.ok) {
      setPanelMessage(response?.error || "تعذر سحب مواظبة اليوم.", "error");
      return;
    }

    const attendance = Array.isArray(response.data) ? response.data : [];
    if (!attendance.length) {
      setPanelMessage("لا توجد سجلات مواظبة لليوم في الذات.", "error");
      return;
    }

    const applied = applyAttendance(attendance);
    setPanelMessage(
      `طابقت ${applied.matched} طالب في الصفحة. غير المطابق: ${applied.unmatched.length}. راجع ثم اضغط حفظ في نور.`,
      applied.matched ? "success" : "error",
    );
  }

  function ensurePanel() {
    if (document.getElementById(ROOT_ID)) return;

    const currentPlatform = platform();
    if (currentPlatform === "unknown") return;
    const platformLabel = currentPlatform === "noor" ? "نور" : "مدرستي";

    const panel = document.createElement("div");
    panel.id = ROOT_ID;
    panel.style.cssText = [
      "position:fixed","left:18px","bottom:18px","z-index:2147483647",
      "width:300px","background:#fff","color:#29241f","border:1px solid #cfc4b6",
      "border-radius:16px","box-shadow:0 14px 38px rgba(0,0,0,.20)",
      "font:13px Arial,Tahoma,sans-serif","direction:rtl","overflow:hidden"
    ].join(";");

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;background:#3d3833;color:#fff;padding:10px 12px">
        <div><b style="color:#d6a477">الذات | THAT</b><div style="font-size:10px;opacity:.8;margin-top:2px">مساعد ${platformLabel}</div></div>
        <button id="athat-bridge-toggle" type="button" style="border:0;background:transparent;color:#fff;cursor:pointer;font-size:18px">−</button>
      </div>
      <div id="athat-bridge-body" style="padding:12px">
        <div style="font-size:11px;color:#6e655d;line-height:1.7;margin-bottom:10px">
          يعمل داخل جلستك الحالية في ${platformLabel}. لا يقرأ كلمة المرور ولا رمز التحقق.
        </div>
        <button id="athat-import-students" type="button" style="width:100%;border:1px solid #8b5736;background:#fff;color:#8b5736;border-radius:9px;padding:8px;cursor:pointer;font-weight:bold;margin-bottom:7px">
          سحب الطلاب الظاهرين إلى الذات
        </button>
        ${
          currentPlatform === "noor"
            ? `<button id="athat-sync-attendance" type="button" style="width:100%;border:0;background:#8b5736;color:#fff;border-radius:9px;padding:9px;cursor:pointer;font-weight:bold">
          مزامنة غياب اليوم من الذات
        </button>`
            : ""
        }
        <div id="athat-bridge-message" style="font-size:11px;color:#6e655d;line-height:1.7;margin-top:9px">
          ${currentPlatform === "noor"
            ? "جاهز. افتح صفحة الطلاب أو المواظبة المطلوبة في نور."
            : "جاهز. افتح كشف الطلاب أو الصفحة المدرسية المطلوبة في مدرستي."}
        </div>
      </div>
    `;

    document.documentElement.appendChild(panel);

    const body = panel.querySelector("#athat-bridge-body");
    const toggle = panel.querySelector("#athat-bridge-toggle");
    toggle?.addEventListener("click", () => {
      if (!(body instanceof HTMLElement) || !(toggle instanceof HTMLElement)) return;
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "block" : "none";
      toggle.textContent = hidden ? "−" : "+";
    });

    panel.querySelector("#athat-import-students")?.addEventListener("click", () => {
      void importVisibleStudents().catch((error) =>
        setPanelMessage(error instanceof Error ? error.message : String(error), "error"),
      );
    });

    panel.querySelector("#athat-sync-attendance")?.addEventListener("click", () => {
      void syncTodayAttendance().catch((error) =>
        setPanelMessage(error instanceof Error ? error.message : String(error), "error"),
      );
    });
  }

  ensurePanel();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.type === "NOOR_SCAN_STUDENTS") {
        sendResponse({ ok: true, data: scanStudents() });
        return;
      }
      if (message.type === "NOOR_APPLY_ATTENDANCE") {
        sendResponse({ ok: true, data: applyAttendance(message.payload || []) });
        return;
      }
      sendResponse({ ok: false, error: "أمر صفحة غير معروف." });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
})();