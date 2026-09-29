(() => {
  const ROOT_ID = "athat-bridge-panel";

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

  function ensurePanel() {
    if (document.getElementById(ROOT_ID)) return;
    const panel = document.createElement("div");
    panel.id = ROOT_ID;
    panel.style.cssText = [
      "position:fixed","left:18px","bottom:18px","z-index:2147483647",
      "background:#fff","color:#29241f","border:1px solid #cfc4b6",
      "border-radius:14px","padding:10px 12px","box-shadow:0 10px 30px rgba(0,0,0,.18)",
      "font:13px Arial,Tahoma,sans-serif","direction:rtl","max-width:280px"
    ].join(";");
    panel.innerHTML = '<b style="color:#8b5736">Athat Bridge</b><div style="font-size:11px;margin-top:4px;color:#6e655d">جاهز داخل الصفحة الحالية — الحفظ النهائي يبقى عليك.</div>';
    document.documentElement.appendChild(panel);
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