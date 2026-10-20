// ========================================================
// HỆ THỐNG QUẢN LÝ BẢN QUYỀN & KÍCH HOẠT KEY (STUDY OS)
// Tích hợp API từ hệ thống: https://halis-bio.vercel.app
// Cần key kích hoạt liên hệ: "https://halis-bio.vercel.app/iamhalis"
// ========================================================

const LICENSE_API_BASE = "https://halis-bio.vercel.app";
const CONTACT_BIO_URL = "https://halis-bio.vercel.app/iamhalis";
const LICENSE_STORAGE_KEY = "studyos_license_info";

/**
 * Lấy thông tin bản quyền hiện tại từ tài khoản đang đăng nhập hoặc LocalStorage
 */
function getLicenseInfo() {
  if (typeof currentUser !== "undefined" && currentUser && typeof users !== "undefined" && users[currentUser]) {
    const u = users[currentUser];
    const isAct = typeof isAccountActivated === "function" ? isAccountActivated(currentUser) : Boolean(u.is_activated);
    return {
      isActivated: isAct,
      key: u.license_key || (isAct ? "MEMBER-ACTIVE" : null),
      activatedAt: u.activated_at || null,
      source: "account",
      isGuest: false,
      username: currentUser
    };
  }
  // Acc khách luôn là Free Trial (chưa kích hoạt)
  return {
    isActivated: false,
    key: null,
    activatedAt: null,
    source: "guest",
    isGuest: true,
    username: null
  };
}

/**
 * Lưu thông tin bản quyền vào LocalStorage
 */
function saveLicenseInfo(info) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(info));
}

/**
 * Xóa bản quyền (Hủy kích hoạt trên tài khoản)
 */
function removeLicenseInfo() {
  if (typeof currentUser !== "undefined" && currentUser && typeof users !== "undefined" && users[currentUser]) {
    users[currentUser].is_activated = false;
    users[currentUser].license_key = null;
    users[currentUser].activated_at = null;
    if (typeof saveUsersDB === "function") saveUsersDB();
  }
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

/**
 * Kiểm tra xem ứng dụng/tài khoản đã được kích hoạt hay chưa
 */
function isLicenseActivated() {
  if (typeof currentUser !== "undefined" && currentUser && typeof users !== "undefined" && users[currentUser]) {
    return typeof isAccountActivated === "function" ? isAccountActivated(currentUser) : Boolean(users[currentUser].is_activated);
  }
  // Acc khách luôn là Free Trial
  return false;
}

/**
 * Rút gọn / Che một phần key để hiển thị an toàn (VD: HASHX-****-996B)
 */
function maskLicenseKey(key) {
  if (!key) return "";
  const parts = key.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  return key.slice(0, 4) + "****" + key.slice(-4);
}

/**
 * Chuẩn hóa và định dạng key người dùng nhập thành HASHX-XXXX-XXXX
 */
function formatKeyInput(value) {
  // Loại bỏ khoảng trắng và chuyển thành chữ hoa
  let clean = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  
  // Nếu người dùng không nhập tiền tố HASHX, tự động thêm hoặc xử lý
  if (!clean.startsWith("HASHX")) {
    const hexOnly = clean.replace(/[^A-Z0-9]/g, "");
    if (hexOnly.length <= 4) {
      clean = `HASHX-${hexOnly}`;
    } else {
      clean = `HASHX-${hexOnly.slice(0, 4)}-${hexOnly.slice(4, 8)}`;
    }
  } else {
    // Có HASHX rồi, chuẩn hóa phần đuôi
    const afterPrefix = clean.replace(/^HASHX-?/, "").replace(/-/g, "");
    if (afterPrefix.length <= 4) {
      clean = `HASHX-${afterPrefix}`;
    } else {
      clean = `HASHX-${afterPrefix.slice(0, 4)}-${afterPrefix.slice(4, 8)}`;
    }
  }
  return clean;
}

/**
 * Gửi yêu cầu kích hoạt Key lên Web Server
 */
async function redeemKeyOnline(key) {
  const cleanKey = key.trim().toUpperCase();
  
  // Kiểm tra định dạng cơ bản: HASHX-XXXX-XXXX (X: 0-9, A-F)
  const keyPattern = /^HASHX-[A-F0-9]{4}-[A-F0-9]{4}$/i;
  if (!keyPattern.test(cleanKey)) {
    return {
      success: false,
      error: "Định dạng key không đúng! Định dạng chuẩn: HASHX-XXXX-XXXX (VD: HASHX-A1B2-C3D4)"
    };
  }

  // 1. Nếu đang là KHÁCH (chưa có tài khoản) -> Kiểm tra key và nhắc đăng ký
  if (!currentUser || !users[currentUser]) {
    try {
      const verifyRes = await fetch(`${LICENSE_API_BASE}/api/external/verify-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: cleanKey })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.valid) {
        return {
          success: false,
          error: verifyData.error || "Mã key không hợp lệ hoặc đã qua sử dụng!"
        };
      }
      return {
        success: false,
        requireAccount: true,
        verifiedKey: cleanKey,
        error: "Mã key hợp lệ! Tuy nhiên tài khoản Khách luôn là Free Trial (chỉ lưu trên máy). Vui lòng Đăng nhập hoặc Tạo tài khoản để kích hoạt và mở khóa Cloud Sync."
      };
    } catch {
      return {
        success: false,
        error: `Không thể kết nối đến máy chủ xác thực (${LICENSE_API_BASE}). Vui lòng kiểm tra mạng!`
      };
    }
  }

  // 2. Nếu ĐÃ ĐĂNG NHẬP -> Gọi API redeem cho tài khoản hiện tại
  try {
    const response = await fetch(`${LICENSE_API_BASE}/api/external/redeem-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: cleanKey,
        app_name: `Halios - @${currentUser}`
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      users[currentUser].is_activated = true;
      users[currentUser].license_key = cleanKey;
      users[currentUser].activated_at = new Date().toISOString();
      if (typeof saveUsersDB === "function") saveUsersDB();

      // Bật Cloud Sync và sync ngay lập tức lên Cloud
      if (typeof syncToCloud === "function") {
        await syncToCloud();
      }

      return {
        success: true,
        message: `Kích hoạt tài khoản @${currentUser} thành công! Đã bật Đồng bộ Đám mây.`
      };
    } else {
      return {
        success: false,
        error: data.error || "Mã kích hoạt không hợp lệ hoặc đã qua sử dụng!"
      };
    }
  } catch (networkError) {
    if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.Logger) {
      HaliosSecurity.Logger.warn("Không thể kết nối API xác thực trực tuyến:", networkError);
    }
    return {
      success: false,
      error: `Không thể kết nối đến máy chủ xác thực (${LICENSE_API_BASE}). Vui lòng kiểm tra kết nối mạng!`
    };
  }
}

/**
 * Mở Modal kích hoạt
 */
function openLicenseModal() {
  const modal = document.getElementById("license-modal-overlay");
  if (!modal) return;
  modal.classList.remove("hidden");
  const input = document.getElementById("modal-license-input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 100);
  }
  const alertEl = document.getElementById("modal-license-alert");
  if (alertEl) {
    alertEl.className = "license-alert hidden";
    alertEl.textContent = "";
  }
}

/**
 * Đóng Modal kích hoạt
 */
function closeLicenseModal() {
  const modal = document.getElementById("license-modal-overlay");
  if (modal) modal.classList.add("hidden");
}

/**
 * Cập nhật toàn bộ giao diện liên quan đến trạng thái bản quyền
 */
function renderLicenseUI() {
  const info = getLicenseInfo();
  const isAct = info.isActivated;
  const isGuest = info.isGuest;

  // 0. Cập nhật class is-member-mode (và is-pro-mode để tương thích) cùng is-trial-mode lên thẻ body
  document.body.classList.toggle("is-pro-mode", isAct);
  document.body.classList.toggle("is-member-mode", isAct);
  document.body.classList.toggle("is-trial-mode", !isAct);

  // Điều khiển tính năng chỉnh kính Ultra-Glass trong Cài đặt
  const glassLocked = document.getElementById("glass-tuner-locked");
  const glassControls = document.getElementById("glass-tuner-controls");
  const glassBadge = document.getElementById("glass-tuner-badge");

  if (glassLocked) glassLocked.classList.toggle("hidden", isAct);
  if (glassControls) glassControls.classList.toggle("disabled", !isAct);
  if (glassBadge) {
    if (isAct) {
      glassBadge.className = "pro-tag-badge active";
      glassBadge.textContent = "⭐ Member Đã mở khóa";
    } else {
      glassBadge.className = "pro-tag-badge locked";
      glassBadge.textContent = "🔒 Khóa (Cần Member)";
    }
  }

  // 1. Cập nhật Badge trên Sidebar
  const sidebarBadge = document.getElementById("sidebar-license-badge");
  if (sidebarBadge) {
    if (isAct) {
      sidebarBadge.className = "license-status-pill activated";
      sidebarBadge.innerHTML = `<span class="pill-dot"></span> Member Active`;
      sidebarBadge.setAttribute("title", `Đã kích hoạt Member (@${info.username} • ${maskLicenseKey(info.key)})`);
    } else {
      sidebarBadge.className = "license-status-pill unactivated";
      sidebarBadge.innerHTML = `<span class="pill-dot"></span> Free Trial`;
      sidebarBadge.setAttribute("title", isGuest ? "Chế độ Khách (Free Trial — Lưu nội bộ)" : "Tài khoản Dùng thử (Chưa kích hoạt Cloud)");
    }
  }

  // 2. Cập nhật nút trên Topbar
  const topbarBtn = document.getElementById("topbar-license-btn");
  if (topbarBtn) {
    if (isAct) {
      topbarBtn.className = "btn btn-license-pro";
      topbarBtn.innerHTML = `⭐ Member Active`;
      topbarBtn.setAttribute("title", `Tài khoản @${info.username} đã kích hoạt Member & Cloud`);
    } else {
      topbarBtn.className = "btn btn-license-activate";
      topbarBtn.innerHTML = `🔑 Kích hoạt`;
      topbarBtn.setAttribute("title", isGuest ? "Khách (Free Trial) — Nhấn để kích hoạt" : "Nhấn để kích hoạt tài khoản");
    }
  }

  // 3. Cập nhật Badge trong Hồ sơ cá nhân (Tab Profile)
  const profileBadge = document.getElementById("profile-license-tag");
  if (profileBadge) {
    if (isAct) {
      profileBadge.className = "profile-license-badge pro";
      profileBadge.textContent = "⭐ Member (Đã bật Cloud Sync ☁️)";
    } else {
      profileBadge.className = "profile-license-badge free";
      profileBadge.textContent = isGuest ? "Bản dùng thử (Free Trial)" : "⚠️ Free Trial (Chưa kích hoạt Cloud)";
    }
  }

  // 4. Cập nhật Thẻ Quản lý Bản quyền trong Cài đặt (Tab Settings)
  const statusText = document.getElementById("settings-license-status-text");
  const keyDisplay = document.getElementById("settings-license-key-display");
  const dateDisplay = document.getElementById("settings-license-date-display");
  const activateFormWrapper = document.getElementById("settings-license-form-wrapper");
  const activeDetailsWrapper = document.getElementById("settings-license-active-wrapper");

  if (statusText && activateFormWrapper && activeDetailsWrapper) {
    if (isAct) {
      statusText.innerHTML = `<span class="badge-text pro">⭐ TÀI KHOẢN MEMBER (@${info.username}) — ĐÃ BẬT CLOUD SYNC</span>`;
      if (keyDisplay) keyDisplay.textContent = maskLicenseKey(info.key);
      if (dateDisplay) {
        const d = info.activatedAt ? new Date(info.activatedAt) : new Date();
        dateDisplay.textContent = formatDisplayDate(d) + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      activateFormWrapper.classList.add("hidden");
      activeDetailsWrapper.classList.remove("hidden");
    } else {
      if (isGuest) {
        statusText.innerHTML = `<span class="badge-text free">👤 CHẾ ĐỘ KHÁCH — FREE TRIAL (CHỈ LƯU NỘI BỘ TRÊN MÁY)</span>`;
      } else {
        statusText.innerHTML = `<span class="badge-text free">⚠️ TÀI KHOẢN @${info.username} — FREE TRIAL (CHƯA KÍCH HOẠT CLOUD)</span>`;
      }
      activateFormWrapper.classList.remove("hidden");
      activeDetailsWrapper.classList.add("hidden");
    }
  }
}

/**
 * Khởi tạo toàn bộ sự kiện cho hệ thống License
 */
function initLicenseFeature() {
  // Lắng nghe click mở Modal từ Sidebar và Topbar
  const sidebarBadge = document.getElementById("sidebar-license-badge");
  if (sidebarBadge) {
    sidebarBadge.addEventListener("click", () => {
      if (isLicenseActivated()) {
        if (typeof switchTab === "function") switchTab("settings");
      } else {
        openLicenseModal();
      }
    });
  }

  const topbarBtn = document.getElementById("topbar-license-btn");
  if (topbarBtn) {
    topbarBtn.addEventListener("click", () => {
      if (isLicenseActivated()) {
        if (typeof switchTab === "function") switchTab("settings");
      } else {
        openLicenseModal();
      }
    });
  }

  // Nút đóng modal
  const closeModalBtn = document.getElementById("close-license-modal-btn");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeLicenseModal);

  const cancelModalBtn = document.getElementById("cancel-license-modal-btn");
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeLicenseModal);

  // Đóng modal khi bấm vào vùng nền mờ
  const modalOverlay = document.getElementById("license-modal-overlay");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeLicenseModal();
    });
  }

  // Tự động định dạng và viết hoa mã key trong ô nhập Modal
  const modalKeyInput = document.getElementById("modal-license-input");
  if (modalKeyInput) {
    modalKeyInput.addEventListener("input", (e) => {
      const cur = e.target.value;
      if (cur) {
        e.target.value = formatKeyInput(cur);
      }
    });
  }

  // Xử lý nộp form kích hoạt từ Modal
  const modalForm = document.getElementById("license-modal-form");
  if (modalForm) {
    modalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("modal-license-input");
      const submitBtn = document.getElementById("modal-license-submit-btn");
      const alertEl = document.getElementById("modal-license-alert");

      const rawKey = (input ? input.value : "").trim();
      if (!rawKey) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Đang xác thực...";
      alertEl.className = "license-alert hidden";
      alertEl.textContent = "";

      const res = await redeemKeyOnline(rawKey);

      submitBtn.disabled = false;
      submitBtn.textContent = "Kích hoạt ngay";

      if (res.success) {
        alertEl.className = "license-alert success";
        alertEl.textContent = "Kích hoạt bản quyền thành công! Đang tải lại giao diện...";
        if (typeof showToast === "function") showToast("⭐ Đã kích hoạt bản quyền Study OS thành công!");
        renderLicenseUI();
        setTimeout(() => {
          closeLicenseModal();
        }, 1200);
      } else {
        alertEl.className = "license-alert error";
        alertEl.textContent = res.error;
        if (res.requireAccount) {
          setTimeout(() => {
            closeLicenseModal();
            if (typeof switchTab === "function") switchTab("profile");
            const regKeyInput = document.getElementById("reg-key");
            if (regKeyInput) regKeyInput.value = rawKey;
            const regTabBtn = document.querySelector('.auth-tab-btn[data-auth="register"]');
            if (regTabBtn) regTabBtn.click();
          }, 2000);
        }
        if (typeof showToast === "function") showToast(res.error, true);
      }
    });
  }

  // Tự động định dạng trong ô nhập Settings
  const settingsKeyInput = document.getElementById("settings-license-input");
  if (settingsKeyInput) {
    settingsKeyInput.addEventListener("input", (e) => {
      const cur = e.target.value;
      if (cur) {
        e.target.value = formatKeyInput(cur);
      }
    });
  }

  // Xử lý nộp form kích hoạt từ Settings
  const settingsForm = document.getElementById("settings-license-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("settings-license-input");
      const submitBtn = document.getElementById("settings-license-submit-btn");
      const alertEl = document.getElementById("settings-license-alert");

      const rawKey = (input ? input.value : "").trim();
      if (!rawKey) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Đang kiểm tra...";
      if (alertEl) {
        alertEl.className = "license-alert hidden";
        alertEl.textContent = "";
      }

      const res = await redeemKeyOnline(rawKey);

      submitBtn.disabled = false;
      submitBtn.textContent = "Kích hoạt bản quyền";

      if (res.success) {
        if (alertEl) {
          alertEl.className = "license-alert success";
          alertEl.textContent = "Kích hoạt bản quyền thành công!";
        }
        if (typeof showToast === "function") showToast("⭐ Kích hoạt bản quyền thành công!");
        input.value = "";
        renderLicenseUI();
      } else {
        if (alertEl) {
          alertEl.className = "license-alert error";
          alertEl.textContent = res.error;
        }
        if (res.requireAccount) {
          setTimeout(() => {
            if (typeof switchTab === "function") switchTab("profile");
            const regKeyInput = document.getElementById("reg-key");
            if (regKeyInput) regKeyInput.value = rawKey;
            const regTabBtn = document.querySelector('.auth-tab-btn[data-auth="register"]');
            if (regTabBtn) regTabBtn.click();
          }, 2000);
        }
        if (typeof showToast === "function") showToast(res.error, true);
      }
    });
  }

  // Nút Hủy kích hoạt trên máy này (trong Settings)
  const deactivateBtn = document.getElementById("settings-license-deactivate-btn");
  if (deactivateBtn) {
    deactivateBtn.addEventListener("click", () => {
      if (confirm("Bạn có chắc chắn muốn hủy kích hoạt bản quyền trên trình duyệt này không?")) {
        removeLicenseInfo();
        renderLicenseUI();
        if (typeof showToast === "function") showToast("Đã hủy kích hoạt bản quyền trên máy này.");
      }
    });
  }

  // Vẽ giao diện License lần đầu
  renderLicenseUI();
}
