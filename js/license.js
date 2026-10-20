// ========================================================
// HỆ THỐNG QUẢN LÝ BẢN QUYỀN & KÍCH HOẠT KEY (STUDY OS)
// Tích hợp API từ hệ thống: https://halis-bio.vercel.app
// Cần key kích hoạt liên hệ: "https://halis-bio.vercel.app/iamhalis"
// ========================================================

const LICENSE_API_BASE = "https://halis-bio.vercel.app";
const CONTACT_BIO_URL = "https://halis-bio.vercel.app/iamhalis";
const LICENSE_STORAGE_KEY = "studyos_license_info";

/**
 * Lấy thông tin bản quyền hiện tại từ LocalStorage
 */
function getLicenseInfo() {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return { isActivated: false, key: null, activatedAt: null, source: null };
    const data = JSON.parse(raw);
    return {
      isActivated: Boolean(data && data.isActivated),
      key: data.key || null,
      activatedAt: data.activatedAt || null,
      source: data.source || "online"
    };
  } catch (e) {
    return { isActivated: false, key: null, activatedAt: null, source: null };
  }
}

/**
 * Lưu thông tin bản quyền vào LocalStorage
 */
function saveLicenseInfo(info) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(info));
}

/**
 * Xóa bản quyền (Hủy kích hoạt trên máy)
 */
function removeLicenseInfo() {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

/**
 * Kiểm tra xem ứng dụng đã được kích hoạt hay chưa
 */
function isLicenseActivated() {
  return getLicenseInfo().isActivated;
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

  try {
    const response = await fetch(`${LICENSE_API_BASE}/api/external/redeem-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: cleanKey,
        app_name: "Halios (Study OS)"
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const licenseData = {
        isActivated: true,
        key: cleanKey,
        activatedAt: new Date().toISOString(),
        source: "online"
      };
      saveLicenseInfo(licenseData);
      return { success: true, message: data.message || "Kích hoạt thành công!" };
    } else {
      return {
        success: false,
        error: data.error || "Mã kích hoạt không hợp lệ hoặc đã qua sử dụng!"
      };
    }
  } catch (networkError) {
    console.warn("Không thể kết nối API xác thực trực tuyến:", networkError);
    return {
      success: false,
      error: `Không thể kết nối đến máy chủ xác thực (${LICENSE_API_BASE}). Vui lòng kiểm tra kết nối mạng!`
    };
  }
}

/**
 * Sinh key mới từ Web API (Dành cho Quản trị viên có ADMIN_API_KEY)
 */
async function generateKeyOnline(adminApiKey) {
  if (!adminApiKey) {
    throw new Error("Vui lòng nhập Admin API Key để sinh key!");
  }

  const response = await fetch(`${LICENSE_API_BASE}/api/admin/generate-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": adminApiKey.trim()
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Admin API Key không chính xác (Unauthorized)!");
    }
    throw new Error(`Máy chủ từ chối yêu cầu (Mã lỗi HTTP ${response.status}).`);
  }

  const data = await response.json();
  return data.key;
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

  // 1. Cập nhật Badge trên Sidebar
  const sidebarBadge = document.getElementById("sidebar-license-badge");
  if (sidebarBadge) {
    if (isAct) {
      sidebarBadge.className = "license-status-pill activated";
      sidebarBadge.innerHTML = `<span class="pill-dot"></span> PRO Active`;
      sidebarBadge.setAttribute("title", `Đã kích hoạt PRO (${maskLicenseKey(info.key)})`);
    } else {
      sidebarBadge.className = "license-status-pill unactivated";
      sidebarBadge.innerHTML = `<span class="pill-dot"></span> Free Trial`;
      sidebarBadge.setAttribute("title", "Chưa kích hoạt bản quyền — Nhấn để kích hoạt");
    }
  }

  // 2. Cập nhật nút trên Topbar
  const topbarBtn = document.getElementById("topbar-license-btn");
  if (topbarBtn) {
    if (isAct) {
      topbarBtn.className = "btn btn-license-pro";
      topbarBtn.innerHTML = `⭐ PRO Active`;
      topbarBtn.setAttribute("title", `Bản quyền đã kích hoạt (${maskLicenseKey(info.key)})`);
    } else {
      topbarBtn.className = "btn btn-license-activate";
      topbarBtn.innerHTML = `🔑 Kích hoạt`;
      topbarBtn.setAttribute("title", "Nhấn để nhập key kích hoạt");
    }
  }

  // 3. Cập nhật Badge trong Hồ sơ cá nhân (Tab Profile)
  const profileBadge = document.getElementById("profile-license-tag");
  if (profileBadge) {
    if (isAct) {
      profileBadge.className = "profile-license-badge pro";
      profileBadge.textContent = "⭐ PRO Member (Đã kích hoạt)";
    } else {
      profileBadge.className = "profile-license-badge free";
      profileBadge.textContent = "Bản dùng thử (Free Member)";
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
      statusText.innerHTML = `<span class="badge-text pro">⭐ ĐÃ KÍCH HOẠT BẢN QUYỀN PRO</span>`;
      if (keyDisplay) keyDisplay.textContent = maskLicenseKey(info.key);
      if (dateDisplay) {
        const d = info.activatedAt ? new Date(info.activatedAt) : new Date();
        dateDisplay.textContent = formatDisplayDate(d) + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      activateFormWrapper.classList.add("hidden");
      activeDetailsWrapper.classList.remove("hidden");
    } else {
      statusText.innerHTML = `<span class="badge-text free">⚠️ CHƯA KÍCH HOẠT BẢN QUYỀN (FREE TRIAL)</span>`;
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

  // Bật/tắt khung Công cụ Quản trị viên (Sinh Key)
  const toggleAdminGenBtn = document.getElementById("toggle-admin-gen-btn");
  const adminGenBox = document.getElementById("admin-keygen-box");
  if (toggleAdminGenBtn && adminGenBox) {
    toggleAdminGenBtn.addEventListener("click", () => {
      adminGenBox.classList.toggle("hidden");
      toggleAdminGenBtn.textContent = adminGenBox.classList.contains("hidden")
        ? "+ Mở công cụ tạo Key (Dành cho Quản trị viên)"
        : "- Đóng công cụ tạo Key";
    });
  }

  // Form sinh Key Quản trị viên
  const adminGenForm = document.getElementById("admin-keygen-form");
  if (adminGenForm) {
    adminGenForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const apiKeyInput = document.getElementById("admin-api-key-input");
      const submitBtn = document.getElementById("admin-gen-submit-btn");
      const resultBox = document.getElementById("admin-keygen-result");
      const keyTextEl = document.getElementById("admin-generated-key-text");

      const apiKey = (apiKeyInput ? apiKeyInput.value : "").trim();
      if (!apiKey) {
        if (typeof showToast === "function") showToast("Vui lòng nhập Admin API Key!", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Đang tạo...";
      if (resultBox) resultBox.classList.add("hidden");

      try {
        const newKey = await generateKeyOnline(apiKey);
        if (resultBox && keyTextEl) {
          keyTextEl.textContent = newKey;
          resultBox.classList.remove("hidden");
        }
        if (typeof showToast === "function") showToast(`Đã tạo key mới: ${newKey}`);
      } catch (err) {
        if (typeof showToast === "function") showToast(err.message, true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Tạo Key mới ngay";
      }
    });
  }

  // Nút sao chép Key Quản trị viên vừa tạo
  const copyKeyBtn = document.getElementById("copy-generated-key-btn");
  if (copyKeyBtn) {
    copyKeyBtn.addEventListener("click", () => {
      const keyTextEl = document.getElementById("admin-generated-key-text");
      if (keyTextEl && keyTextEl.textContent) {
        navigator.clipboard.writeText(keyTextEl.textContent.trim()).then(() => {
          if (typeof showToast === "function") showToast("Đã sao chép mã Key vào bộ nhớ tạm!");
        }).catch(() => {
          if (typeof showToast === "function") showToast("Không thể sao chép tự động.", true);
        });
      }
    });
  }

  // Vẽ giao diện License lần đầu
  renderLicenseUI();
}
