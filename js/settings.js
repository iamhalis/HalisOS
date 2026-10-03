// =========================================================================
// 10. SETTINGS.JS — CẤU HÌNH HỆ THỐNG & SAO LƯU / ĐỒNG BỘ FILE JSON
// =========================================================================
function downloadJSON(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 4)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function initSettingsFeature() {
  bindCustomDateInput("setting-target-date-display", "setting-target-date", "setting-date-Trigger");

  document.getElementById("settings-form").addEventListener("submit", e => {
    e.preventDefault();
    const rawTargetStr = document.getElementById("setting-target-date-display").value.trim();
    const validatedISO = parseAndValidateDDMMYYYY(rawTargetStr);

    if (!validatedISO) {
      showToast("Ngày mục tiêu không hợp lệ! Vui lòng nhập đúng định dạng DD-MM-YYYY (VD: 01-06-2027).", true);
      document.getElementById("setting-target-date-display").focus();
      return;
    }

    config.title = document.getElementById("setting-title").value.trim() || "Study OS";
    config.target_date = validatedISO;
    config.aim_week = Math.max(1, parseInt(document.getElementById("setting-aim-week").value, 10) || 20);
    config.aim_month = Math.max(1, parseInt(document.getElementById("setting-aim-month").value, 10) || 80);
    saveStorage();
    renderAll();
    showToast("Đã lưu cấu hình hệ thống!");
  });

  document.getElementById("export-tasks-btn").addEventListener("click", () => downloadJSON("tasks.json", tasks));
  document.getElementById("export-config-btn").addEventListener("click", () => downloadJSON("config.json", config));

  document.getElementById("import-tasks-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed)) {
          tasks = parsed;
          migrateTasks();
          saveStorage();
          renderAll();
          showToast("Đã nhập dữ liệu tasks.json thành công!");
        }
      } catch {
        showToast("File tasks.json không hợp lệ!", true);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("import-config-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && typeof parsed === "object") {
          config = { ...DEFAULT_CONFIG, ...parsed };
          config.target_date = toInputDateStr(config.target_date) || "2027-06-01";
          saveStorage();
          renderAll();
          showToast("Đã nhập dữ liệu config.json thành công!");
        }
      } catch {
        showToast("File config.json không hợp lệ!", true);
      }
    };
    reader.readAsText(file);
  });
}