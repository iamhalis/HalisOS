// ==========================================================================
// STUDY OS — MAIN ENGINE & APPLICATION CONTROLLER
// ==========================================================================

function switchTab(tabId) {
  // Đưa màn hình về đỉnh trang ngay lập tức khi đổi tab, chống trôi giao diện
  window.scrollTo({ top: 0, behavior: "instant" });
  const mainEl = document.querySelector(".main-content");
  if (mainEl) mainEl.scrollTop = 0;

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
  if (tabId === "focus") {
    syncCustomFocusDropdown();
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
  syncCustomFocusDropdown();
  renderAnalyticsCharts();
  renderShareTaskSelector();
}

// ==========================================================================
// HÀM ĐỒNG BỘ DROPDOWN TÙY BIẾN CỦA FOCUS MODE VỚI DỮ LIỆU GỐC
// ==========================================================================
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

    // Khi chọn 1 nhiệm vụ trong danh sách xổ xuống
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      nativeSelect.selectedIndex = idx;
      nativeSelect.dispatchEvent(new Event("change"));
      headerText.textContent = opt.text;
      
      // Đóng menu và xoay mũi tên chúc xuống dưới trở lại
      menu.classList.add("hidden");
      if (dropdownBox) dropdownBox.classList.remove("open");

      document.querySelectorAll(".custom-dropdown-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
    });

    menu.appendChild(item);
  });
}

// ==========================================================================
// HÀM ĐÓNG / MỞ THANH BÊN (SIDEBAR)
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
// KHỞI CHẠY ỨNG DỤNG KHI DOM SẴN SÀNG (DUY NHẤT 1 LISTENER)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadActiveUserData();
  resetTaskForm();
  refreshQuote();
  updateClockAndHeader();
  setInterval(updateClockAndHeader, 1000);

  // 1. Khởi tạo từng module tính năng
  initDashboardFeature();
  initTasksFeature();
  initCalendarFeature();
  initFocusFeature();
  initFutureMessagesFeature();
  initShareFeature();
  initProfileFeature();
  initSettingsFeature();

  // 2. Nạp dữ liệu và đồng bộ tài khoản từ Cloud
  renderAll();
  pullCurrentUserFromCloud();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      pullCurrentUserFromCloud();
    }
  });

  // 3. Sự kiện điều hướng Sidebar & Topbar
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

  // 4. Khôi phục trạng thái thu gọn thanh bên từ bộ nhớ
  const savedCollapsedState = localStorage.getItem("studyos_sidebar_collapsed") === "true";
  if (savedCollapsedState) {
    const sb = document.querySelector(".sidebar");
    if (sb) sb.classList.add("collapsed");
  }

  // 5. Cấu hình Dropdown Focus Mode & Xoay mũi tên Chevron
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
        dropdownBox.classList.add("open"); // Mũi tên xoay ngược lên trên
      } else {
        menu.classList.add("hidden");
        dropdownBox.classList.remove("open"); // Mũi tên chúc xuống dưới
      }
    });

    // Bấm ra ngoài màn hình thì tự đóng menu và trả mũi tên về vị trí cũ
    document.addEventListener("click", () => {
      menu.classList.add("hidden");
      dropdownBox.classList.remove("open");
    });
  }

  // Tự động cập nhật menu tùy biến khi danh sách task trong thẻ select gốc thay đổi
  if (nativeSelect) {
    const obs = new MutationObserver(() => syncCustomFocusDropdown());
    obs.observe(nativeSelect, { childList: true, subtree: true });
    syncCustomFocusDropdown();
  }

  // Tự động chuyển đổi giữa [Màn hình Chọn Task] và [Khung Chữ Nhật Đếm Giờ]
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