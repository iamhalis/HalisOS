function switchTab(tabId) {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tabId}`);
  });
  if (tabId === "analytics") {
    renderAnalyticsCharts();
  }
  if (tabId === "future-messages") {
    syncAllDirectoryUsersFromCloud();
    pullSharedLettersFromCloud();
    renderSealedLettersList();
    renderSocialLettersList();
  }
  if (tabId === "share") {
    renderShareTaskSelector();
  }
}

function renderAll() {
  document.getElementById("app-title").textContent = config.title;
  document.title = `${config.title} — Web Dashboard`;
  document.getElementById("days-left-display").textContent = `${calculateDaysLeft()} ngày`;
  document.getElementById("target-date-display").textContent = `Mục tiêu: ${formatDisplayDate(config.target_date)}`;

  const pendingCount = tasks.filter(t => !t.done).length;
  document.getElementById("pending-badge").textContent = pendingCount;

  const { doneToday, doneWeek, doneMonth, doneTotal } = getTaskStats();
  const aimWeek = Number(config.aim_week) || 20;
  const aimMonth = Number(config.aim_month) || 80;
  const weekPct = Math.min(100, Math.round((doneWeek / aimWeek) * 100));
  const monthPct = Math.min(100, Math.round((doneMonth / aimMonth) * 100));

  document.getElementById("stat-today").textContent = doneToday;
  document.getElementById("stat-week-done").textContent = doneWeek;
  document.getElementById("stat-week-aim").textContent = aimWeek;
  document.getElementById("stat-week-pct").textContent = `${weekPct}%`;
  document.getElementById("progress-week").style.width = `${weekPct}%`;

  document.getElementById("stat-month-done").textContent = doneMonth;
  document.getElementById("stat-month-aim").textContent = aimMonth;
  document.getElementById("stat-month-pct").textContent = `${monthPct}%`;
  document.getElementById("progress-month").style.width = `${monthPct}%`;

  document.getElementById("stat-total").textContent = doneTotal;

  document.getElementById("quick-aim-week").value = aimWeek;
  document.getElementById("quick-aim-month").value = aimMonth;
  document.getElementById("setting-title").value = config.title;

  const normalizedTargetISO = toInputDateStr(config.target_date) || "2027-06-01";
  document.getElementById("setting-target-date").value = normalizedTargetISO;
  document.getElementById("setting-target-date-display").value = formatDisplayDate(normalizedTargetISO);

  document.getElementById("setting-aim-week").value = aimWeek;
  document.getElementById("setting-aim-month").value = aimMonth;

  renderQuickWeekdayPicker();
  renderProfileUI();
  renderSealedLettersList();
  renderSocialLettersList();
  renderDashboardUpcoming();
  renderTasksTab();
  renderWeeklyCalendar();
  renderFocusSelector();
  renderAnalyticsCharts();
  renderShareTaskSelector();
}

document.addEventListener("DOMContentLoaded", () => {
  loadActiveUserData();
  resetTaskForm();
  refreshQuote();
  updateClockAndHeader();
  setInterval(updateClockAndHeader, 1000);

  // Khởi tạo từng module tính năng
  initDashboardFeature();
  initTasksFeature();
  initCalendarFeature();
  initFocusFeature();
  initFutureMessagesFeature();
  initShareFeature();
  initProfileFeature();
  initSettingsFeature();

  renderAll();
  pullCurrentUserFromCloud();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      pullCurrentUserFromCloud();
    }
  });

  // Sự kiện điều hướng chung (Sidebar & Topbar)
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.goto));
  });

  document.getElementById("sidebar-user-btn").addEventListener("click", () => switchTab("profile"));
  document.getElementById("top-profile-btn").addEventListener("click", () => switchTab("profile"));

  document.getElementById("quick-add-btn").addEventListener("click", () => {
    switchTab("tasks");
    resetTaskForm();
    document.getElementById("task-name-input").focus();
  });

  document.getElementById("refresh-quote-btn").addEventListener("click", () => refreshQuote(true));
  
  document.getElementById("theme-toggle-btn").addEventListener("click", () => {
    const html = document.documentElement;
    const nextTheme = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", nextTheme);
  });

  // Khôi phục trạng thái thu gọn thanh bên từ bộ nhớ
  const savedCollapsedState = localStorage.getItem("studyos_sidebar_collapsed") === "true";
  if (savedCollapsedState) {
    const sb = document.querySelector(".sidebar");
    if (sb) sb.classList.add("collapsed");
  }
}); // <-- ĐÓNG DOMContentLoaded DUY NHẤT TẠI ĐÂY

// ==========================================================================
// HÀM ĐÓNG / MỞ THANH BÊN (TOÀN CỤC — CHẮC CHẮN HOẠT ĐỘNG 100%)
// ==========================================================================
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const brandLogoBtn = document.getElementById("brand-logo-btn");
  if (!sidebar) return;

  sidebar.classList.toggle("collapsed");
  const isCol = sidebar.classList.contains("collapsed");
  localStorage.setItem("studyos_sidebar_collapsed", isCol ? "true" : "false");

  if (brandLogoBtn) {
    brandLogoBtn.setAttribute("title", isCol ? "Mở thanh bên" : "Đóng thanh bên");
  }
}
// ==========================================================================
// TÍNH NĂNG DROPDOWN TÙY BIẾN CHO FOCUS MODE & ĐỒNG BỘ TRẠNG THÁI
// ==========================================================================
function syncCustomFocusDropdown() {
  const nativeSelect = document.getElementById("focus-task-select");
  const headerText = document.getElementById("custom-dropdown-selected-text");
  const menu = document.getElementById("custom-dropdown-menu");
  if (!nativeSelect || !headerText || !menu) return;

  menu.innerHTML = "";
  const options = Array.from(nativeSelect.options);

  if (options.length === 0) {
    headerText.textContent = "Chưa có nhiệm vụ nào";
    return;
  }

  const selectedOpt = nativeSelect.options[nativeSelect.selectedIndex] || options[0];
  headerText.textContent = selectedOpt ? selectedOpt.text : "Chọn nhiệm vụ";

  options.forEach((opt, idx) => {
    const item = document.createElement("div");
    item.className = "custom-dropdown-item";
    if (idx === nativeSelect.selectedIndex) item.classList.add("selected");
    item.textContent = opt.text;

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      nativeSelect.selectedIndex = idx;
      nativeSelect.dispatchEvent(new Event("change"));
      headerText.textContent = opt.text;
      menu.classList.add("hidden");
      document.querySelectorAll(".custom-dropdown-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
    });

    menu.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("custom-dropdown-header");
  const menu = document.getElementById("custom-dropdown-menu");
  const focusCard = document.getElementById("focus-card");
  const startBtn = document.getElementById("focus-start-btn");
  const nativeSelect = document.getElementById("focus-task-select");

  // 1. Bật/tắt menu xổ xuống khi bấm vào Dropdown
  if (header && menu) {
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      menu.classList.add("hidden");
    });
  }

  // 2. Tự động đồng bộ mỗi khi danh sách nhiệm vụ thay đổi
  if (nativeSelect) {
    const obs = new MutationObserver(() => syncCustomFocusDropdown());
    obs.observe(nativeSelect, { childList: true, subtree: true });
    syncCustomFocusDropdown();
  }

  // 3. Quản lý trạng thái chuyển đổi giữa [Chọn nhiệm vụ] và [Đang đếm giờ]
  if (startBtn && focusCard) {
    const updateRunningState = () => {
      const isRunning = startBtn.classList.contains("hidden");
      focusCard.classList.toggle("is-running", isRunning);
    };

    const btnObs = new MutationObserver(() => updateRunningState());
    btnObs.observe(startBtn, { attributes: true, attributeFilter: ["class"] });
    updateRunningState();
  }
});