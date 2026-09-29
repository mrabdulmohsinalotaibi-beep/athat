(() => {
  const normalize = (value) =>
    String(value ?? "")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const text = (element) => normalize(element?.textContent);

  function visibleRows() {
    return [...document.querySelectorAll("table tr")].filter((row) => {
      const style = getComputedStyle(row);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function findStudentRows() {
    return visibleRows()
      .map((row, index) => {
        const cells = [...row.querySelectorAll("td")];
        if (cells.length < 2) return null;

        const inputs = [...row.querySelectorAll("input,select")];
        const nameCell = cells.find((cell) => {
          const value = text(cell);
          return value.length >= 4 && /[\u0600-\u06FF]/.test(value);
        });
        if (!nameCell || !inputs.length) return null;

        const nationalIdMatch = text(row).match(/\b[12]\d{9}\b/);
        return {
          index,
          name: text(nameCell),
          nationalId: nationalIdMatch?.[0] ?? null,
          row,
          inputs,
        };
      })
      .filter(Boolean);
  }

  function setNativeValue(element, value) {
    if (element instanceof HTMLSelectElement) {
      const option = [...element.options].find(
        (item) => normalize(item.textContent) === normalize(value) || item.value === value,
      );
      if (!option) return false;
      element.value = option.value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = Boolean(value);
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      element.value = String(value ?? "");
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  function fillAttendance(items) {
    const rows = findStudentRows();
    const results = [];

    for (const item of items) {
      const target = rows.find(
        (row) =>
          (item.nationalId && row.nationalId === String(item.nationalId)) ||
          normalize(row.name) === normalize(item.name),
      );

      if (!target) {
        results.push({ name: item.name, ok: false, reason: "لم تتم مطابقة الطالب" });
        continue;
      }

      const checkbox = target.inputs.find(
        (input) => input instanceof HTMLInputElement && input.type === "checkbox",
      );
      if (!checkbox) {
        results.push({ name: item.name, ok: false, reason: "لم يتم العثور على خانة الرصد" });
        continue;
      }

      setNativeValue(checkbox, true);
      results.push({ name: item.name, ok: true });
    }

    return results;
  }

  window.AthatNoorAdapter = {
    page: () => ({
      url: location.href,
      title: document.title,
      studentCount: findStudentRows().length,
    }),
    students: () =>
      findStudentRows().map(({ name, nationalId }) => ({ name, nationalId })),
    fillAttendance,
  };
})();
