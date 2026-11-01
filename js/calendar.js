// =========================================================================
// CALENDAR.JS — LỊCH TUẦN CỐ ĐỊNH TỪ THỨ 2 ĐẾN CHỦ NHẬT (PHÂN TRANG TUẦN)
// =========================================================================

let calendarWeekOffset = 0;

/**
 * Lấy danh sách 7 ngày cố định từ Thứ 2 đến Chủ Nhật theo độ lệch tuần (offset).
 * offset = 0: Tuần này (Thứ 2 đến Chủ Nhật tuần này)
 * offset = 1: Tuần kế (Thứ 2 đến Chủ Nhật tuần tới)
 * offset = -1: Tuần trước (Thứ 2 đến Chủ Nhật tuần trước)
 */
function getCalendarWeekData(offset = 0) {
  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Tìm Thứ 2 của tuần hiện tại (chuẩn Thứ 2 -> Chủ Nhật)
  // getDay(): 0 là Chủ Nhật, 1 là Thứ 2, ..., 6 là Thứ 7
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Thứ 2, 1 = Thứ 3, ..., 6 = Chủ Nhật
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - dayOfWeek);

  // Thứ 2 của tuần theo offset
  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(currentMonday.getDate() + offset * 7);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetMonday);
    d.setDate(targetMonday.getDate() + i);
    days.push({
      dateObj: d,
      dateKey: formatDateKey(d),
      displayDate: formatDisplayDate(d),
      dayName: dayNames[i]
    });
  }
  return days;
}

function changeCalendarWeek(delta) {
  calendarWeekOffset += delta;
  renderWeeklyCalendar();
}

function resetCalendarWeek() {
  if (calendarWeekOffset === 0) return;
  calendarWeekOffset = 0;
  renderWeeklyCalendar();
}

function renderWeeklyCalendar() {
  const grid = document.getElementById("weekly-calendar-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const weekDays = getCalendarWeekData(calendarWeekOffset);
  const todayKey = getTodayStr();
  const startDate = weekDays[0].displayDate;
  const endDate = weekDays[6].displayDate;

  // Cập nhật thông tin tiêu đề, mô tả và chỉ báo trang
  const headerTitle = document.getElementById("cal-header-title");
  const headerSubtitle = document.getElementById("cal-header-subtitle");
  const pageIndicator = document.getElementById("cal-page-indicator");
  const topTodayBtn = document.getElementById("cal-today-top-btn");
  const pageTodayBtn = document.getElementById("cal-today-page-btn");
  const shareWeekBtn = document.getElementById("share-entire-week-from-cal-btn");

  let weekLabel = "Tuần này";
  let titleText = "Lịch trình tuần này";
  let subText = `Thứ 2 (${startDate}) — Chủ Nhật (${endDate})`;

  if (calendarWeekOffset === 0) {
    weekLabel = "Tuần này";
    titleText = "Lịch trình tuần này";
    subText = `Thứ 2 (${startDate}) — Chủ Nhật (${endDate}) • Tuần hiện tại`;
  } else if (calendarWeekOffset === 1) {
    weekLabel = "Tuần kế (+1)";
    titleText = "Lịch trình tuần kế tiếp";
    subText = `Thứ 2 (${startDate}) — Chủ Nhật (${endDate}) • Tuần sau`;
  } else if (calendarWeekOffset > 1) {
    weekLabel = `Tuần sau (+${calendarWeekOffset})`;
    titleText = `Lịch trình (+${calendarWeekOffset} tuần)`;
    subText = `Thứ 2 (${startDate}) — Chủ Nhật (${endDate})`;
  } else if (calendarWeekOffset === -1) {
    weekLabel = "Tuần trước (-1)";
    titleText = "Lịch trình tuần trước";
    subText = `Thứ 2 (${startDate}) — Chủ Nhật (${endDate}) • Tuần trước`;
  } else {
    weekLabel = `Tuần trước (${calendarWeekOffset})`;
    titleText = `Lịch trình quá khứ (${Math.abs(calendarWeekOffset)} tuần trước)`;
    subText = `Thứ 2 (${startDate}) — Chủ Nhật (${endDate})`;
  }

  if (headerTitle) headerTitle.textContent = titleText;
  if (headerSubtitle) headerSubtitle.textContent = subText;
  if (pageIndicator) pageIndicator.textContent = `${weekLabel} (${startDate} — ${endDate})`;

  // Trạng thái nút Tuần này
  if (topTodayBtn) {
    topTodayBtn.classList.toggle("active", calendarWeekOffset === 0);
  }
  if (pageTodayBtn) {
    pageTodayBtn.classList.toggle("hidden", calendarWeekOffset === 0);
  }

  // Cập nhật nhãn nút chia sẻ theo tuần đang hiển thị
  if (shareWeekBtn) {
    if (calendarWeekOffset === 0) {
      shareWeekBtn.innerHTML = `🔗 Chia sẻ lịch tuần này`;
    } else {
      shareWeekBtn.innerHTML = `🔗 Chia sẻ tuần (${startDate.slice(0, 5)} - ${endDate.slice(0, 5)})`;
    }
  }

  // Render 7 ngày cố định: Thứ 2 -> Chủ Nhật
  weekDays.forEach(day => {
    const isToday = day.dateKey === todayKey;
    const dayTasks = tasks
      .filter(t => toInputDateStr(t.date) === day.dateKey)
      .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

    const card = document.createElement("div");
    card.className = `day-card ${isToday ? "today" : ""}`;

    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `
      <div>
        <span class="day-name">${day.dayName}</span>
        ${isToday ? '<span class="today-chip">Hôm nay</span>' : ""}
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="day-date">${day.displayDate}</span>
        ${dayTasks.length > 0 ? `<span class="day-count-badge" title="${dayTasks.length} nhiệm vụ">${dayTasks.length} task</span>` : ""}
      </div>
    `;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "day-tasks";

    if (dayTasks.length === 0) {
      body.innerHTML = `<p class="text-muted">Không có task nào.<br><small>Trống (Nghỉ ngơi)</small></p>`;
    } else {
      dayTasks.forEach(t => {
        const item = document.createElement("div");
        item.className = `cal-task ${t.done ? "done" : ""}`;
        item.title = t.done ? "Nhấn để chuyển sang chưa hoàn thành" : "Nhấn để đánh dấu hoàn thành";
        item.innerHTML = `<span>${t.done ? "✓" : "○"} ${t.name}</span><span class="cal-time">${t.time || "--:--"}</span>`;
        item.addEventListener("click", () => {
          t.done = !t.done;
          saveStorage();
          renderAll();
        });
        body.appendChild(item);
      });
    }

    card.appendChild(body);

    // Nút thêm nhiệm vụ nhanh cho ngày này
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "cal-add-btn";
    addBtn.innerHTML = `+ Thêm task`;
    addBtn.title = `Thêm nhiệm vụ cho ngày ${day.displayDate}`;
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dateInput = document.getElementById("task-date-input");
      const dateDisplay = document.getElementById("task-date-display");
      if (dateInput) dateInput.value = day.dateKey;
      if (dateDisplay) dateDisplay.value = day.displayDate;
      if (typeof renderQuickWeekdayPicker === "function") renderQuickWeekdayPicker();
      switchTab("tasks");
      const nameInput = document.getElementById("task-name-input");
      if (nameInput) nameInput.focus();
    });
    card.appendChild(addBtn);

    grid.appendChild(card);
  });
}

function initCalendarFeature() {
  // Nút điều hướng phía trên
  const topPrevBtn = document.getElementById("cal-prev-top-btn");
  const topNextBtn = document.getElementById("cal-next-top-btn");
  const topTodayBtn = document.getElementById("cal-today-top-btn");

  if (topPrevBtn) topPrevBtn.addEventListener("click", () => changeCalendarWeek(-1));
  if (topNextBtn) topNextBtn.addEventListener("click", () => changeCalendarWeek(1));
  if (topTodayBtn) topTodayBtn.addEventListener("click", resetCalendarWeek);

  // Nút phân trang phía dưới (Trang trước / Trang sau)
  const pagePrevBtn = document.getElementById("cal-prev-page-btn");
  const pageNextBtn = document.getElementById("cal-next-page-btn");
  const pageTodayBtn = document.getElementById("cal-today-page-btn");

  if (pagePrevBtn) {
    pagePrevBtn.addEventListener("click", () => {
      changeCalendarWeek(-1);
      const calPane = document.getElementById("tab-calendar");
      if (calPane) calPane.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (pageNextBtn) {
    pageNextBtn.addEventListener("click", () => {
      changeCalendarWeek(1);
      const calPane = document.getElementById("tab-calendar");
      if (calPane) calPane.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (pageTodayBtn) {
    pageTodayBtn.addEventListener("click", () => {
      resetCalendarWeek();
      const calPane = document.getElementById("tab-calendar");
      if (calPane) calPane.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Nút chia sẻ lịch tuần
  const shareWeekFromCalBtn = document.getElementById("share-entire-week-from-cal-btn");
  if (shareWeekFromCalBtn) {
    shareWeekFromCalBtn.addEventListener("click", () => {
      const weekDays = getCalendarWeekData(calendarWeekOffset);
      const weekISOList = new Set(weekDays.map(d => d.dateKey));
      selectedShareTaskIndices.clear();
      tasks.forEach((t, idx) => {
        if (weekISOList.has(toInputDateStr(t.date))) {
          selectedShareTaskIndices.add(idx);
        }
      });
      currentShareViewFilter = calendarWeekOffset === 0 ? "week" : "all";
      document.querySelectorAll("[data-sharefilter]").forEach(b => {
        b.classList.toggle("active", b.dataset.sharefilter === currentShareViewFilter);
      });
      switchTab("share");
      const weekLabel = calendarWeekOffset === 0 ? "tuần này" : `tuần (${weekDays[0].displayDate.slice(0, 5)} - ${weekDays[6].displayDate.slice(0, 5)})`;
      if (selectedShareTaskIndices.size > 0) {
        showToast(`Đã chọn toàn bộ ${selectedShareTaskIndices.size} nhiệm vụ trong ${weekLabel}! Nhấn "Tạo mã chia sẻ" để lấy mã.`);
      } else {
        showToast(`Lịch ${weekLabel} hiện chưa có nhiệm vụ nào, hãy thêm nhiệm vụ vào các ngày trong tuần!`, true);
      }
    });
  }
}
