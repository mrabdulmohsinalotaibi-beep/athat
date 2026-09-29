(() => {
  if (document.getElementById("athat-noor-launcher")) return;

  const button = document.createElement("button");
  button.id = "athat-noor-launcher";
  button.type = "button";
  button.textContent = "ذات";
  Object.assign(button.style, {
    position: "fixed",
    left: "18px",
    bottom: "18px",
    zIndex: "2147483647",
    border: "0",
    borderRadius: "999px",
    padding: "11px 17px",
    fontFamily: "Arial, sans-serif",
    fontWeight: "700",
    cursor: "pointer",
    background: "#3d3833",
    color: "#fff",
    boxShadow: "0 8px 24px rgba(0,0,0,.22)",
  });

  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "ATHAT_OPEN_SIDE_PANEL" });
  });

  document.documentElement.appendChild(button);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const adapter = window.AthatNoorAdapter;
    if (!adapter) {
      sendResponse({ ok: false, error: "تعذر تشغيل محول نور في الصفحة الحالية." });
      return false;
    }

    if (message?.type === "ATHAT_NOOR_PAGE") {
      sendResponse({ ok: true, data: adapter.page() });
      return false;
    }
    if (message?.type === "ATHAT_NOOR_STUDENTS") {
      sendResponse({ ok: true, data: adapter.students() });
      return false;
    }
    if (message?.type === "ATHAT_NOOR_FILL_ATTENDANCE") {
      sendResponse({ ok: true, data: adapter.fillAttendance(message.items ?? []) });
      return false;
    }
    return false;
  });
})();
