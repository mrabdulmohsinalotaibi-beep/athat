async function activeNoorTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/([^.]+\.)?noor\.moe\.gov\.sa\//i.test(tab.url ?? "")) {
    throw new Error("افتح صفحة نظام نور أولاً.");
  }
  return tab;
}

async function send(type, extra = {}) {
  const tab = await activeNoorTab();
  return chrome.tabs.sendMessage(tab.id, { type, ...extra });
}

async function refreshPageStatus() {
  const box = document.getElementById("pageStatus");
  try {
    const result = await send("ATHAT_NOOR_PAGE");
    if (!result?.ok) throw new Error(result?.error || "تعذر قراءة الصفحة.");
    box.className = "status ok";
    box.textContent = `متصل بصفحة نور • ${result.data.studentCount} صف طالب مكتشف`;
  } catch (error) {
    box.className = "status";
    box.textContent = error instanceof Error ? error.message : String(error);
  }
}

document.getElementById("scan").addEventListener("click", async () => {
  const output = document.getElementById("students");
  try {
    const result = await send("ATHAT_NOOR_STUDENTS");
    if (!result?.ok) throw new Error(result?.error || "تعذر قراءة الطلاب.");
    output.textContent = result.data.length
      ? `تمت قراءة ${result.data.length} طالب من الصفحة الحالية.`
      : "لم يتم اكتشاف صفوف طلاب في الصفحة الحالية.";
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
  }
});

document.getElementById("fill").addEventListener("click", async () => {
  const output = document.getElementById("results");
  try {
    const items = JSON.parse(document.getElementById("payload").value || "[]");
    if (!Array.isArray(items)) throw new Error("صيغة البيانات يجب أن تكون قائمة JSON.");
    const result = await send("ATHAT_NOOR_FILL_ATTENDANCE", { items });
    if (!result?.ok) throw new Error(result?.error || "تعذر تجهيز الصفحة.");
    const ok = result.data.filter((item) => item.ok).length;
    const failed = result.data.length - ok;
    output.textContent = `تمت مطابقة وتجهيز ${ok}. غير مطابق: ${failed}. راجع نور ثم اضغط «حفظ» بنفسك.`;
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
  }
});

refreshPageStatus();
