// =========================================================================
// 11. MAIN.JS — ĐIỀU HƯỚNG TAB, RENDER TỔNG THỂ & KHỞI CHẠY ỨNG DỤNG
// =========================================================================
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
});