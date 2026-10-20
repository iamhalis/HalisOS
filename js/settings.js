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
// ========================================================
// TÍNH NĂNG TỰ ĐỘNG NÉN ẢNH NỀN VÀ LƯU LOCALSTORAGE
// ========================================================

const bgInput = document.getElementById('bg-upload-input');
const removeBgBtn = document.getElementById('remove-bg-btn');
const bgStatusText = document.getElementById('bg-status-text');

// 1. Hàm vẽ ảnh lên giao diện kèm lớp phủ tối bảo vệ mắt
function applyWallpaper(imageDataUrl) {
  if (!imageDataUrl) {
    document.body.classList.remove('has-custom-bg');
    document.body.style.backgroundImage = '';
    return;
  }
  
  // Nạp trực tiếp ảnh (không kèm gradient overlay), mọi hiệu ứng mờ tối đã được xử lý bằng kính mờ CSS phía trên
  document.body.classList.add('has-custom-bg');
  document.body.style.backgroundImage = `url("${imageDataUrl}")`;
}

// 2. Hàm nén ảnh bằng HTML5 Canvas (Tối đa Full HD 1920px, chất lượng 72%)
function compressImage(file, callback) {
  const reader = new FileReader();
  
  reader.onload = function(event) {
    const img = new Image();
    
    img.onload = function() {
      // Giới hạn chiều rộng tối đa là 1920px (chuẩn Full HD)
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      let width = img.width;
      let height = img.height;

      // Giữ nguyên tỉ lệ ảnh khi thu nhỏ
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      // Tạo canvas ảo để vẽ lại ảnh
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Xuất ra định dạng JPEG với chất lượng 0.72 (giảm dung lượng còn ~150KB - 250KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      callback(compressedDataUrl);
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

// 3. Lắng nghe sự kiện khi người dùng chọn ảnh
if (bgInput) {
  bgInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (bgStatusText) bgStatusText.innerText = 'Đang tối ưu hóa & nén hình ảnh...';

    // Tiến hành nén
    compressImage(file, function(compressedBase64) {
      try {
        // Lưu vào localStorage
        localStorage.setItem('studyos_custom_bg', compressedBase64);
        
        // Cập nhật ngay lên giao diện
        applyWallpaper(compressedBase64);

        if (bgStatusText) {
          bgStatusText.innerText = '✅ Đã áp dụng hình nền thành công!';
          setTimeout(() => { bgStatusText.innerText = ''; }, 3000);
        }
      } catch (err) {
        console.error('Lỗi khi lưu ảnh:', err);
        alert('Không thể lưu ảnh do dung lượng bộ nhớ trình duyệt đã đầy. Vui lòng chọn ảnh khác.');
      }
    });
  });
}

// 4. Lắng nghe nút Xóa ảnh nền
if (removeBgBtn) {
  removeBgBtn.addEventListener('click', function() {
    localStorage.removeItem('studyos_custom_bg');
    applyWallpaper(null);
    if (bgInput) bgInput.value = '';
    if (bgStatusText) {
      bgStatusText.innerText = 'Đã khôi phục giao diện mặc định.';
      setTimeout(() => { bgStatusText.innerText = ''; }, 2500);
    }
  });
}

// -------------------------------------------------------------
// 5. TÙY CHỈNH ĐỘ TRONG SUỐT VÀ ĐỘ MỜ KÍNH (PRO EXCLUSIVE)
// -------------------------------------------------------------
function applyGlassSettings(opacityPct, blurPx) {
  const opacityVal = Math.min(0.85, Math.max(0.25, opacityPct / 100));
  const blurVal = Math.min(24, Math.max(4, parseInt(blurPx, 10) || 12));

  document.documentElement.style.setProperty('--pro-glass-opacity', opacityVal);
  document.documentElement.style.setProperty('--pro-glass-blur', `${blurVal}px`);

  localStorage.setItem('studyos_glass_opacity', opacityPct);
  localStorage.setItem('studyos_glass_blur', blurVal);

  const opacityLabel = document.getElementById('opacity-val-label');
  const blurLabel = document.getElementById('blur-val-label');
  if (opacityLabel) opacityLabel.textContent = `${opacityPct}%`;
  if (blurLabel) blurLabel.textContent = `${blurVal}px`;
}

function initGlassTunerFeature() {
  const opacitySlider = document.getElementById('glass-opacity-slider');
  const blurSlider = document.getElementById('glass-blur-slider');

  const savedOpacity = parseInt(localStorage.getItem('studyos_glass_opacity'), 10) || 45;
  const savedBlur = parseInt(localStorage.getItem('studyos_glass_blur'), 10) || 12;

  if (opacitySlider) opacitySlider.value = savedOpacity;
  if (blurSlider) blurSlider.value = savedBlur;
  applyGlassSettings(savedOpacity, savedBlur);

  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const curBlur = blurSlider ? blurSlider.value : 12;
      applyGlassSettings(parseInt(e.target.value, 10), curBlur);
    });
  }

  if (blurSlider) {
    blurSlider.addEventListener('input', (e) => {
      const curOpacity = opacitySlider ? opacitySlider.value : 45;
      applyGlassSettings(curOpacity, parseInt(e.target.value, 10));
    });
  }

  // Nút preset cấu hình sẵn
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const op = parseInt(btn.dataset.opacity, 10);
      const bl = parseInt(btn.dataset.blur, 10);
      if (opacitySlider) opacitySlider.value = op;
      if (blurSlider) blurSlider.value = bl;
      applyGlassSettings(op, bl);
    });
  });
}

// 6. Tự động áp dụng ảnh nền & cài đặt kính khi vừa mở trang web
document.addEventListener('DOMContentLoaded', function() {
  const savedBg = localStorage.getItem('studyos_custom_bg');
  if (savedBg) {
    applyWallpaper(savedBg);
  }
  initGlassTunerFeature();
});