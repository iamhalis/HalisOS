// Hàm đồng bộ thu nhỏ Topbar & Focus Card khi đang bấm giờ ở tab Focus
function syncFocusLayoutState() {
  const startBtn = document.getElementById("focus-start-btn");
  const focusCard = document.getElementById("focus-card");
  const focusTabPane = document.getElementById("tab-focus");

  const isRunning = startBtn ? startBtn.classList.contains("hidden") : false;
  const isFocusTabActive = focusTabPane ? focusTabPane.classList.contains("active") : false;

  if (focusCard) {
    focusCard.classList.toggle("is-running", isRunning);
  }
  // Chỉ thu nhỏ Topbar khi đang đếm giờ VÀ đang đứng ở tab Focus Mode
  document.body.classList.toggle("focus-mode-running", isRunning && isFocusTabActive);
}

function switchTab(tabId) {
  window.scrollTo({ top: 0, behavior: "instant" });
  const mainEl = document.querySelector(".main-content");
  if (mainEl) mainEl.scrollTop = 0;

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tabId}`);
  });

  if (tabId === "analytics" && typeof renderAnalyticsCharts === "function") renderAnalyticsCharts();
  if (tabId === "future-messages") {
    if (typeof syncAllDirectoryUsersFromCloud === "function") syncAllDirectoryUsersFromCloud();
    if (typeof pullSharedLettersFromCloud === "function") pullSharedLettersFromCloud();
    if (typeof renderSealedLettersList === "function") renderSealedLettersList();
    if (typeof renderSocialLettersList === "function") renderSocialLettersList();
  }
  if (tabId === "share" && typeof renderShareTaskSelector === "function") renderShareTaskSelector();
  if (tabId === "focus") syncCustomFocusDropdown();
  syncFocusLayoutState();
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

  // Render bảo vệ đa lớp (Không để lỗi thẻ làm ảnh hưởng đến hiển thị tài khoản)
  try { if (typeof renderProfileUI === "function") renderProfileUI(); } catch (e) { console.error(e); }
  try { if (typeof renderQuickWeekdayPicker === "function") renderQuickWeekdayPicker(); } catch (e) { console.error(e); }
  try { if (typeof renderSealedLettersList === "function") renderSealedLettersList(); } catch (e) { console.error(e); }
  try { if (typeof renderSocialLettersList === "function") renderSocialLettersList(); } catch (e) { console.error(e); }
  try { if (typeof renderDashboardUpcoming === "function") renderDashboardUpcoming(); } catch (e) { console.error(e); }
  try { if (typeof renderTasksTab === "function") renderTasksTab(); } catch (e) { console.error(e); }
  try { if (typeof renderWeeklyCalendar === "function") renderWeeklyCalendar(); } catch (e) { console.error(e); }
  try { if (typeof renderFocusSelector === "function") renderFocusSelector(); } catch (e) { console.error(e); }
  try { syncCustomFocusDropdown(); } catch (e) { console.error(e); }
  try { if (typeof renderAnalyticsCharts === "function") renderAnalyticsCharts(); } catch (e) { console.error(e); }
  try { if (typeof renderShareTaskSelector === "function") renderShareTaskSelector(); } catch (e) { console.error(e); }
}

function syncCustomFocusDropdown() {
  const nativeSelect = document.getElementById("focus-task-select");
  const headerText = document.getElementById("custom-dropdown-selected-text");
  const menu = document.getElementById("custom-dropdown-menu");
  const dropdownBox = document.getElementById("custom-focus-dropdown");
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
      if (dropdownBox) dropdownBox.classList.remove("open");

      document.querySelectorAll(".custom-dropdown-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
    });

    menu.appendChild(item);
  });
}

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

document.addEventListener("DOMContentLoaded", () => {
  loadActiveUserData();
  resetTaskForm();
  refreshQuote();
  updateClockAndHeader();
  setInterval(updateClockAndHeader, 1000);

  // Khởi tạo các module tính năng với cơ chế bắt lỗi an toàn
  const safeInit = (fnName, fn) => {
    try { if (typeof fn === "function") fn(); } 
    catch (err) { console.warn(`Module ${fnName} bỏ qua lỗi DOM:`, err); }
  };

  safeInit("Dashboard", initDashboardFeature);
  safeInit("Tasks", initTasksFeature);
  safeInit("Calendar", initCalendarFeature);
  safeInit("Focus", initFocusFeature);
  safeInit("FutureMessages", initFutureMessagesFeature);
  safeInit("Share", initShareFeature);
  safeInit("Profile", initProfileFeature);
  safeInit("Settings", initSettingsFeature);

  // Hiển thị giao diện & đồng bộ Cloud
  renderAll();
  pullCurrentUserFromCloud();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullCurrentUserFromCloud();
  });

  // Điều hướng
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.goto));
  });

  const sidebarUserBtn = document.getElementById("sidebar-user-btn");
  if (sidebarUserBtn) sidebarUserBtn.addEventListener("click", () => switchTab("profile"));

  const topProfileBtn = document.getElementById("top-profile-btn");
  if (topProfileBtn) topProfileBtn.addEventListener("click", () => switchTab("profile"));

  const quickAddBtn = document.getElementById("quick-add-btn");
  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", () => {
      switchTab("tasks");
      resetTaskForm();
      document.getElementById("task-name-input").focus();
    });
  }

  const refreshQuoteBtn = document.getElementById("refresh-quote-btn");
  if (refreshQuoteBtn) refreshQuoteBtn.addEventListener("click", () => refreshQuote(true));

// Khôi phục và điều khiển Giao diện Sáng / Tối (Lưu vào localStorage)
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const applyThemeUI = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("studyos_theme", theme);
    if (themeToggleBtn) {
      const icon = theme === "dark" ? "🌙" : "☀️";
      const label = theme === "dark" ? "Chế độ Tối" : "Chế độ Sáng";
      themeToggleBtn.innerHTML = `<span class="theme-icon">${icon}</span><span class="theme-text">${label}</span>`;
      themeToggleBtn.setAttribute("title", `Đang dùng ${label} (Nhấn để đổi)`);
    }
  };

  const savedTheme = localStorage.getItem("studyos_theme") || "dark";
  applyThemeUI(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyThemeUI(nextTheme);
    });
  }

  const savedCollapsedState = localStorage.getItem("studyos_sidebar_collapsed") === "true";
  if (savedCollapsedState) {
    const sb = document.querySelector(".sidebar");
    if (sb) sb.classList.add("collapsed");
  }

  // Khởi tạo tương tác Dropdown Focus Mode
  const header = document.getElementById("custom-dropdown-header");
  const menu = document.getElementById("custom-dropdown-menu");
  const dropdownBox = document.getElementById("custom-focus-dropdown");
  const nativeSelect = document.getElementById("focus-task-select");
  const focusCard = document.getElementById("focus-card");
  const startBtn = document.getElementById("focus-start-btn");

  if (header && menu && dropdownBox) {
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      const isClosed = menu.classList.contains("hidden");
      if (isClosed) {
        menu.classList.remove("hidden");
        dropdownBox.classList.add("open");
      } else {
        menu.classList.add("hidden");
        dropdownBox.classList.remove("open");
      }
    });

    document.addEventListener("click", () => {
      menu.classList.add("hidden");
      dropdownBox.classList.remove("open");
    });
  }

  if (nativeSelect) {
    const obs = new MutationObserver(() => syncCustomFocusDropdown());
    obs.observe(nativeSelect, { childList: true, subtree: true });
    syncCustomFocusDropdown();
  }

if (startBtn && focusCard) {
    const btnObs = new MutationObserver(() => syncFocusLayoutState());
    btnObs.observe(startBtn, { attributes: true, attributeFilter: ["class"] });
    syncFocusLayoutState();
  }
});