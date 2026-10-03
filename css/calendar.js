// =========================================================================
// 4. CALENDAR.JS — TÍNH NĂNG LỊCH TRÌNH 7 NGÀY TỚI (WEEKLY CALENDAR)
// =========================================================================
function renderWeeklyCalendar() {
  const grid = document.getElementById("weekly-calendar-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateKey = formatDateKey(d);
    const displayDate = formatDisplayDate(d);

    const dayTasks = tasks
      .filter(t => toInputDateStr(t.date) === dateKey)
      .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

    const card = document.createElement("div");
    card.className = `day-card ${i === 0 ? "today" : ""}`;

    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `<span class="day-name">${dayNames[d.getDay()]}</span><span class="day-date">${displayDate}</span>`;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "day-tasks";

    if (dayTasks.length === 0) {
      body.innerHTML = `<p class="text-muted">Không có task nào.<br><small>Trống (Nghỉ ngơi)</small></p>`;
    } else {
      dayTasks.forEach(t => {
        const item = document.createElement("div");
        item.className = `cal-task ${t.done ? "done" : ""}`;
        item.innerHTML = `<span>${t.done ? "✓" : "○"} ${t.name}</span><span class="cal-time">${t.time}</span>`;
        body.appendChild(item);
      });
    }

    card.appendChild(body);
    grid.appendChild(card);
  }
}

function initCalendarFeature() {
  const shareWeekFromCalBtn = document.getElementById("share-entire-week-from-cal-btn");
  if (!shareWeekFromCalBtn) return;

  shareWeekFromCalBtn.addEventListener("click", () => {
    const weekISOList = new Set(getUpcoming7DaysISOList());
    selectedShareTaskIndices.clear();
    tasks.forEach((t, idx) => {
      if (weekISOList.has(toInputDateStr(t.date))) {
        selectedShareTaskIndices.add(idx);
      }
    });
    currentShareViewFilter = "week";
    document.querySelectorAll("[data-sharefilter]").forEach(b => {
      b.classList.toggle("active", b.dataset.sharefilter === "week");
    });
    switchTab("share");
    if (selectedShareTaskIndices.size > 0) {
      showToast(`Đã chọn toàn bộ ${selectedShareTaskIndices.size} nhiệm vụ trong tuần! Nhấn "Tạo mã chia sẻ" để lấy mã.`);
    } else {
      showToast("Lịch 7 ngày tới hiện chưa có nhiệm vụ nào, hãy thêm nhiệm vụ vào các ngày trong tuần!", true);
    }
  });
}