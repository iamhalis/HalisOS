// =========================================================================
// 6. ANALYTICS.JS — TÍNH NĂNG BIỂU ĐỒ ĐƯỜNG NĂNG SUẤT HỌC TẬP (SVG CHARTS)
// =========================================================================
function createSVGLineChart(labels, values, gradientId) {
  const width = 760;
  const height = 250;
  const padLeft = 48;
  const padRight = 32;
  const padTop = 32;
  const padBottom = 42;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxVal = Math.max(4, ...values);

  const points = values.map((v, i) => {
    const x = padLeft + (labels.length > 1 ? (i * plotW) / (labels.length - 1) : plotW / 2);
    const y = padTop + plotH - (v / maxVal) * plotH;
    return { x, y, v, label: labels[i] };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${points[0].x.toFixed(1)},${padTop + plotH} ${polylinePoints} ${points[points.length - 1].x.toFixed(1)},${padTop + plotH}`;

  let gridLines = "";
  for (let step = 0; step <= 4; step++) {
    const val = Math.round((maxVal * step) / 4);
    const y = padTop + plotH - (step / 4) * plotH;
    gridLines += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
      <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${val}</text>
    `;
  }

  let nodesAndLabels = "";
  points.forEach(p => {
    nodesAndLabels += `
      <circle cx="${p.x}" cy="${p.y}" r="5" class="chart-point">
        <title>${p.label}: ${p.v} nhiệm vụ</title>
      </circle>
      <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" class="chart-value-label">${p.v}</text>
      <text x="${p.x}" y="${height - 12}" text-anchor="middle" class="chart-axis-label">${p.label}</text>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="line-chart-svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.38" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <polygon points="${areaPoints}" fill="url(#${gradientId})" />
      <polyline points="${polylinePoints}" class="chart-line-path" />
      ${nodesAndLabels}
    </svg>
  `;
}

function renderAnalyticsCharts() {
  const weeklyContainer = document.getElementById("weekly-line-chart");
  const monthlyContainer = document.getElementById("monthly-line-chart");
  if (!weeklyContainer || !monthlyContainer) return;

  const now = new Date();

  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weekLabels = [];
  const weekValues = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = formatDateKey(d);
    const shortDate = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    weekLabels.push(`${dayNames[i]} (${shortDate})`);

    const count = tasks.filter(t => t.done && toInputDateStr(t.date) === key).length;
    weekValues.push(count);
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekTotal = weekValues.reduce((a, b) => a + b, 0);

  document.getElementById("weekly-chart-subtitle").textContent =
    `Tuần hiện tại: ${formatDisplayDate(monday)} đến ${formatDisplayDate(sunday)}`;
  document.getElementById("weekly-chart-total").textContent = `Tổng tuần: ${weekTotal} task`;
  weeklyContainer.innerHTML = createSVGLineChart(weekLabels, weekValues, "gradWeek");

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const ranges = [
    { label: "Tuần 1 (01-07)", start: 1, end: 7 },
    { label: "Tuần 2 (08-14)", start: 8, end: 14 },
    { label: "Tuần 3 (15-21)", start: 15, end: 21 },
    { label: "Tuần 4 (22-28)", start: 22, end: Math.min(28, daysInMonth) }
  ];
  if (daysInMonth > 28) {
    ranges.push({ label: `Tuần 5 (29-${daysInMonth})`, start: 29, end: daysInMonth });
  }

  const monthLabels = ranges.map(r => r.label);
  const monthValues = ranges.map(() => 0);

  tasks.forEach(t => {
    if (!t.done || !t.date) return;
    const d = new Date(toInputDateStr(t.date) + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      const bucketIdx = Math.min(ranges.length - 1, Math.floor((dayNum - 1) / 7));
      monthValues[bucketIdx]++;
    }
  });

  const monthTotal = monthValues.reduce((a, b) => a + b, 0);
  document.getElementById("monthly-chart-subtitle").textContent =
    `Tháng ${String(month + 1).padStart(2, "0")}-${year} (Thống kê theo từng tuần)`;
  document.getElementById("monthly-chart-total").textContent = `Tổng tháng: ${monthTotal} task`;
  monthlyContainer.innerHTML = createSVGLineChart(monthLabels, monthValues, "gradMonth");
}