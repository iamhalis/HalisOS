// =========================================================================
// CALENDAR.JS — LỊCH TUẦN & ĐIỀU HƯỚNG XEM CÁC TUẦN (TUẦN KẾ / TUẦN TRƯỚC)
// =========================================================================

let calendarWeekOffset = 0;

function getCalendarWeekData(offset = 0) {
  const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset * 7 + i);
    days.push({
      dateObj: d,
      dateKey: formatDateKey(d),
      displayDate: formatDisplayDate(d),
      dayName: dayNames[d.getDay()]
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
  let titleText = "Lịch trình 7 ngày tới";
  let subText = `${startDate} — ${endDate} • Tự động sắp xếp công việc theo khung giờ mỗi ngày`;

  if (calendarWeekOffset === 0) {
    weekLabel = "Tuần này";
    titleText = "Lịch trình 7 ngày tới (Tuần này)";
    subText = `${startDate} — ${endDate} • Tự động sắp xếp công việc theo khung giờ mỗi ngày`;
  } else if (calendarWeekOffset === 1) {
    weekLabel = "Tuần kế (+1)";
    titleText = "Lịch trình tuần kế tiếp";
    subText = `${startDate} — ${endDate} • Kế hoạch học tập và công việc tuần tới`;
  } else if (calendarWeekOffset > 1) {
    weekLabel = `Tuần sau (+${calendarWeekOffset})`;
    titleText = `Lịch trình tương lai (+${calendarWeekOffset} tuần)`;
    subText = `${startDate} — ${endDate} • Kế hoạch học tập sắp tới`;
  } else if (calendarWeekOffset === -1) {
    weekLabel = "Tuần trước (-1)";
    titleText = "Lịch trình tuần trước";
    subText = `${startDate} — ${endDate} • Nhật ký công việc tuần vừa qua`;
  } else {
    weekLabel = `Tuần trước (${calendarWeekOffset})`;
    titleText = `Lịch trình quá khứ (${Math.abs(calendarWeekOffset)} tuần trước)`;
    subText = `${startDate} — ${endDate} • Nhật ký công việc đã qua`;
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
      shareWeekBtn.innerHTML = `🔗 Chia sẻ tuần đang xem (${startDate.slice(0, 5)} - ${endDate.slice(0, 5)})`;
    }
  }

  // Render từng ngày trong tuần
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
      const weekLabel = calendarWeekOffset === 0 ? "tuần này" : `tuần đang xem (${weekDays[0].displayDate.slice(0, 5)} - ${weekDays[6].displayDate.slice(0, 5)})`;
      if (selectedShareTaskIndices.size > 0) {
        showToast(`Đã chọn toàn bộ ${selectedShareTaskIndices.size} nhiệm vụ trong ${weekLabel}! Nhấn "Tạo mã chia sẻ" để lấy mã.`);
      } else {
        showToast(`Lịch ${weekLabel} hiện chưa có nhiệm vụ nào, hãy thêm nhiệm vụ vào các ngày trong tuần!`, true);
      }
    });
  }
}
