const $ = (id) => document.getElementById(id);
let scannedStudents = [];
let todayAttendance = [];

function runtime(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function activeTabMessage(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("لا توجد صفحة نشطة.");
  return new Promise((resolve) => chrome.tabs.sendMessage(tab.id, message, resolve));
}

function showConnected(connected) {
  $("setup").classList.toggle("hidden", connected);
  $("connected").classList.toggle("hidden", !connected);
}

function result(text, isError = false) {
  $("result").textContent = text;
  $("result").style.color = isError ? "#b42318" : "#2f6f4e";
}

async function bootstrap() {
  const saved = await chrome.storage.local.get(["supabaseUrl", "publishableKey"]);
  $("supabaseUrl").value = saved.supabaseUrl || "";
  $("publishableKey").value = saved.publishableKey || "";
  const status = await runtime({ type: "ATHAT_STATUS" });
  showConnected(Boolean(status?.connected));
}

$("login").addEventListener("click", async () => {
  try {
    const response = await runtime({
      type: "ATHAT_LOGIN",
      payload: {
        supabaseUrl: $("supabaseUrl").value.trim(),
        publishableKey: $("publishableKey").value.trim(),
        email: $("email").value.trim(),
        password: $("password").value,
      },
    });
    if (!response?.ok) throw new Error(response?.error || "فشل تسجيل الدخول.");
    $("password").value = "";
    showConnected(true);
  } catch (error) {
    alert(error.message);
  }
});

$("logout").addEventListener("click", async () => {
  await runtime({ type: "ATHAT_LOGOUT" });
  showConnected(false);
});

$("scanStudents").addEventListener("click", async () => {
  const response = await activeTabMessage({ type: "NOOR_SCAN_STUDENTS" });
  if (!response?.ok) return result(response?.error || "تعذر قراءة الصفحة.", true);
  scannedStudents = response.data || [];
  result(`تمت قراءة ${scannedStudents.length} طالب من الجدول الظاهر.`);
});

$("pushStudents").addEventListener("click", async () => {
  const valid = scannedStudents.filter((student) => student.full_name && student.national_id?.length === 10);
  if (!valid.length) return result("لا توجد سجلات تحمل اسمًا وهوية من 10 أرقام.", true);
  const response = await runtime({ type: "ATHAT_IMPORT_STUDENTS", payload: valid });
  if (!response?.ok) return result(response?.error || "تعذر الاستيراد.", true);
  result(
    `تمت إضافة ${response.inserted ?? valid.length} طالب إلى «الذات». تم تجاوز ${response.skipped ?? 0} سجل موجود أو مكرر.`,
  );
});

$("loadAttendance").addEventListener("click", async () => {
  const response = await runtime({ type: "ATHAT_TODAY_ATTENDANCE" });
  if (!response?.ok) return result(response?.error || "تعذر جلب الغياب.", true);
  todayAttendance = response.data || [];
  result(`تم سحب ${todayAttendance.length} سجل مواظبة لليوم من «الذات».`);
});

$("applyAttendance").addEventListener("click", async () => {
  if (!todayAttendance.length) return result("اسحب غياب اليوم من «الذات» أولاً.", true);
  const response = await activeTabMessage({ type: "NOOR_APPLY_ATTENDANCE", payload: todayAttendance });
  if (!response?.ok) return result(response?.error || "تعذر المطابقة.", true);
  const unmatched = response.data?.unmatched?.length || 0;
  result(`تمت مطابقة ${response.data?.matched || 0} طالب. غير المطابق: ${unmatched}. راجع الصفحة ثم اضغط «حفظ» في نور بنفسك.`);
});

bootstrap().catch((error) => result(error.message, true));