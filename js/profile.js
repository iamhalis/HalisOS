function processAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("Vui lòng chọn một file ảnh!");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type.toLowerCase())) {
      reject("Chỉ chấp nhận định dạng ảnh PNG, JPG, JPEG hoặc WebP!");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject("Không thể đọc file ảnh đã chọn.");
    reader.onload = ev => {
      const img = new Image();
      img.onerror = () => reject("File ảnh không hợp lệ hoặc bị hỏng.");
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        const dataUrl = canvas.toDataURL("image/webp", 0.86);
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderAvatarElement(containerEl, avatarDataUrl, fallbackLetter) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  if (avatarDataUrl) {
    const img = document.createElement("img");
    img.src = avatarDataUrl;
    img.alt = "Avatar";
    containerEl.appendChild(img);
  } else {
    containerEl.textContent = fallbackLetter;
  }
}

function renderProfileUI() {
  const sidebarAvatar = document.getElementById("sidebar-avatar");
  const sidebarUsername = document.getElementById("sidebar-username");
  const sidebarEmail = document.getElementById("sidebar-user-email");
  const topProfileBtn = document.getElementById("top-profile-btn");
  const guestView = document.getElementById("auth-guest-view");
  const userView = document.getElementById("auth-user-view");
  const activeAccountLabel = document.getElementById("settings-active-account");
  const profileBigAvatar = document.getElementById("profile-big-avatar");
  const profileLicenseTag = document.getElementById("profile-license-tag");
  const profileActCard = document.getElementById("profile-activation-card");
  const profileActUsername = document.getElementById("profile-act-username");

  if (currentUser && users[currentUser]) {
    const u = users[currentUser];
    const isAct = isAccountActivated(currentUser);
    const initial = u.username.charAt(0).toUpperCase();
    const syncTag = isAct ? "☁️ Đã đồng bộ Cloud" : "⚠️ Free Trial (Lưu nội bộ)";

    renderAvatarElement(sidebarAvatar, u.avatar, initial);
    renderAvatarElement(profileBigAvatar, u.avatar, initial);

    sidebarUsername.textContent = u.username;
    sidebarEmail.textContent = u.email ? `${u.email} • ${syncTag}` : syncTag;
    topProfileBtn.textContent = `@${u.username}`;
    activeAccountLabel.textContent = u.username;

    guestView.classList.add("hidden");
    userView.classList.remove("hidden");

    document.getElementById("profile-display-username").textContent = `@${u.username}`;
    document.getElementById("profile-display-email").textContent = u.email
      ? `Email: ${u.email} (${syncTag})`
      : `Chưa có email (${syncTag})`;
    document.getElementById("profile-edit-email").value = u.email || "";

    if (profileLicenseTag) {
      if (isAct) {
        profileLicenseTag.className = "profile-license-badge pro";
        profileLicenseTag.textContent = "⭐ PRO Member (Đã bật Cloud Sync ☁️)";
      } else {
        profileLicenseTag.className = "profile-license-badge free";
        profileLicenseTag.textContent = "⚠️ Free Trial (Chưa kích hoạt Cloud)";
      }
    }

    if (profileActCard) {
      profileActCard.classList.toggle("hidden", isAct);
      if (profileActUsername) profileActUsername.textContent = u.username;
    }
  } else {
    renderAvatarElement(sidebarAvatar, null, "G");
    renderAvatarElement(profileBigAvatar, null, "G");
    sidebarUsername.textContent = "Khách (Guest)";
    sidebarEmail.textContent = "Free Trial • Nhấn để đăng nhập";
    topProfileBtn.textContent = "Đăng nhập";
    activeAccountLabel.textContent = "Khách (Guest) — Free Trial";

    if (profileLicenseTag) {
      profileLicenseTag.className = "profile-license-badge free";
      profileLicenseTag.textContent = "Bản dùng thử (Free Trial)";
    }

    guestView.classList.remove("hidden");
    userView.classList.add("hidden");
  }
}

function initProfileFeature() {
  document.querySelectorAll(".auth-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.auth;
      document.getElementById("login-form").classList.toggle("hidden", mode !== "login");
      document.getElementById("register-form").classList.toggle("hidden", mode !== "register");
    });
  });

  // Tự động định dạng mã Key khi gõ trong form đăng ký
  const regKeyInput = document.getElementById("reg-key");
  if (regKeyInput && typeof formatKeyInput === "function") {
    regKeyInput.addEventListener("input", (e) => {
      if (e.target.value) e.target.value = formatKeyInput(e.target.value);
    });
  }

  // Tự động định dạng mã Key khi gõ trong form kích hoạt của tab Profile
  const profileActInput = document.getElementById("profile-act-key-input");
  if (profileActInput && typeof formatKeyInput === "function") {
    profileActInput.addEventListener("input", (e) => {
      if (e.target.value) e.target.value = formatKeyInput(e.target.value);
    });
  }

  // ĐĂNG KÝ
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim().toLowerCase();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const rawKey = (document.getElementById("reg-key") ? document.getElementById("reg-key").value : "").trim().toUpperCase();

    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      showToast("Username từ 3-24 ký tự, viết liền không dấu!", true);
      return;
    }
    if (password.length < 4) {
      showToast("Mật khẩu phải có ít nhất 4 ký tự!", true);
      return;
    }

    if (users[username]) {
      showToast("Username này đã tồn tại trên thiết bị!", true);
      return;
    }

    let isActivated = false;
    let activatedKey = null;

    // Nếu người dùng nhập Key lúc đăng ký ➔ Xác thực với server để kích hoạt ngay
    if (rawKey) {
      showToast("Đang kiểm tra và kích hoạt mã Key...");
      const keyPattern = /^HASHX-[A-F0-9]{4}-[A-F0-9]{4}$/i;
      if (!keyPattern.test(rawKey)) {
        showToast("Định dạng key không đúng (Chuẩn: HASHX-XXXX-XXXX)!", true);
        return;
      }
      try {
        const res = await fetch("https://halis-bio.vercel.app/api/external/redeem-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: rawKey, app_name: `Halios - @${username}` })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || "Key không hợp lệ hoặc đã qua sử dụng!", true);
          return;
        }
        isActivated = true;
        activatedKey = rawKey;
      } catch {
        showToast("Không thể kết nối đến máy chủ xác thực key! Vui lòng kiểm tra mạng.", true);
        return;
      }
    }

    const isFirstAccountEver = Object.keys(users).length === 0;

    users[username] = {
      username,
      email,
      password,
      avatar: null,
      createdAt: getTodayStr(),
      is_activated: isActivated,
      license_key: activatedKey,
      activated_at: isActivated ? new Date().toISOString() : null
    };
    saveUsersDB();

    if (isFirstAccountEver && tasks.length > 0) {
      localStorage.setItem(`studyos_tasks_${username}`, JSON.stringify(tasks));
      localStorage.setItem(`studyos_config_${username}`, JSON.stringify(config));
    }

    currentUser = username;
    localStorage.setItem("studyos_current_user", currentUser);
    loadActiveUserData();

    // Chỉ tài khoản ĐÃ KÍCH HOẠT KEY mới đồng bộ Cloud để chống quá tải server!
    if (isActivated) {
      await syncToCloud();
      showToast(`⭐ Đăng ký & kích hoạt thành công! Đã bật Cloud Sync cho @${username}`);
    } else {
      showToast(`Tạo tài khoản thành công! @${username} (Chế độ Dùng thử - Lưu nội bộ)`);
    }

    renderAll();
    document.getElementById("register-form").reset();
  });

  // ĐĂNG NHẬP
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    let account = users[username];

    // Nếu chưa có trên máy này, thử kiểm tra đơn lẻ trên Cloud
    if (!account && CLOUD_DB_URL) {
      const cloudData = await fetchAccountFromCloud(username);
      if (cloudData && cloudData.profile) {
        if (cloudData.profile.password !== password) {
          showToast("Sai Username hoặc Mật khẩu!", true);
          return;
        }
        users[username] = cloudData.profile;
        saveUsersDB();
        account = users[username];
        config = { ...DEFAULT_CONFIG, ...(cloudData.config || {}) };
        tasks = Array.isArray(cloudData.tasks) ? cloudData.tasks : [];
        futureMails = Array.isArray(cloudData.futureMails) ? cloudData.futureMails : [];
        saveLocalOnly();
      }
    }

    if (!account || account.password !== password) {
      showToast("Sai Username hoặc Mật khẩu!", true);
      return;
    }

    currentUser = username;
    localStorage.setItem("studyos_current_user", currentUser);
    loadActiveUserData();

    // Chỉ kéo dữ liệu Cloud nếu tài khoản này ĐÃ KÍCH HOẠT KEY
    if (isCloudEnabled()) {
      await pullCurrentUserFromCloud();
      showToast(`Chào mừng @${username}! Đã kết nối và đồng bộ Cloud.`);
    } else {
      renderAll();
      showToast(`Chào mừng @${username}! (Chế độ Dùng thử - Lưu nội bộ)`);
    }

    document.getElementById("login-form").reset();
  });

  // KÍCH HOẠT TÀI KHOẢN TỪ THẺ TRONG TAB PROFILE
  const profileActForm = document.getElementById("profile-activate-form");
  if (profileActForm) {
    profileActForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!currentUser || !users[currentUser]) return;

      const input = document.getElementById("profile-act-key-input");
      const submitBtn = document.getElementById("profile-act-submit-btn");
      const alertEl = document.getElementById("profile-act-alert");

      const rawKey = (input ? input.value : "").trim().toUpperCase();
      if (!rawKey) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Đang kiểm tra...";
      if (alertEl) {
        alertEl.className = "license-alert hidden";
        alertEl.textContent = "";
      }

      const keyPattern = /^HASHX-[A-F0-9]{4}-[A-F0-9]{4}$/i;
      if (!keyPattern.test(rawKey)) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kích hoạt tài khoản ngay";
        if (alertEl) {
          alertEl.className = "license-alert error";
          alertEl.textContent = "Định dạng key không đúng (Chuẩn: HASHX-XXXX-XXXX)!";
        }
        return;
      }

      try {
        const res = await fetch("https://halis-bio.vercel.app/api/external/redeem-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: rawKey, app_name: `Halios - @${currentUser}` })
        });
        const data = await res.json();
        submitBtn.disabled = false;
        submitBtn.textContent = "Kích hoạt tài khoản ngay";

        if (res.ok && data.success) {
          users[currentUser].is_activated = true;
          users[currentUser].license_key = rawKey;
          users[currentUser].activated_at = new Date().toISOString();
          saveUsersDB();

          if (alertEl) {
            alertEl.className = "license-alert success";
            alertEl.textContent = "Kích hoạt thành công! Đang đồng bộ lên Cloud...";
          }

          // Bật Cloud Sync và sync ngay lên Cloud
          await syncToCloud();
          renderAll();
          showToast(`⭐ Kích hoạt tài khoản @${currentUser} thành công! Đã bật Cloud Sync.`);
        } else {
          if (alertEl) {
            alertEl.className = "license-alert error";
            alertEl.textContent = data.error || "Key không hợp lệ hoặc đã qua sử dụng!";
          }
          showToast(data.error || "Key không hợp lệ hoặc đã qua sử dụng!", true);
        }
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kích hoạt tài khoản ngay";
        if (alertEl) {
          alertEl.className = "license-alert error";
          alertEl.textContent = "Không thể kết nối đến máy chủ xác thực!";
        }
        showToast("Lỗi kết nối máy chủ xác thực!", true);
      }
    });
  }

  // ĐỔI ẢNH ĐẠI DIỆN (AVATAR)
  document.getElementById("avatar-file-input").addEventListener("change", async e => {
    if (!currentUser || !users[currentUser]) {
      showToast("Tài khoản khách không thể sử dụng tính năng đổi ảnh đại diện!", true);
      e.target.value = "";
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const avatarBase64 = await processAvatarFile(file);
      users[currentUser].avatar = avatarBase64;
      saveUsersDB();
      await syncToCloud();
      renderProfileUI();
      showToast("Đã cập nhật ảnh đại diện mới!");
    } catch (errMsg) {
      showToast(String(errMsg), true);
    } finally {
      e.target.value = "";
    }
  });

  // Cập nhật Email Hồ sơ
  document.getElementById("profile-update-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !users[currentUser]) return;

    const newEmail = document.getElementById("profile-edit-email").value.trim();
    users[currentUser].email = newEmail;

    saveUsersDB();
    await syncToCloud();
    renderAll();
    showToast("Đã lưu địa chỉ Email vào hồ sơ!");
  });

  // ĐỔI MẬT KHẨU BẮT BUỘC 3 BƯỚC
  document.getElementById("password-change-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !users[currentUser]) {
      showToast("Tính năng đổi mật khẩu không áp dụng cho tài khoản Khách!", true);
      return;
    }

    const currentPasswordInput = document.getElementById("pwd-current").value;
    const newPasswordInput = document.getElementById("pwd-new").value;
    const confirmPasswordInput = document.getElementById("pwd-confirm").value;

    if (!currentPasswordInput) {
      showToast("Vui lòng nhập mật khẩu hiện tại (mật khẩu cũ)!", true);
      return;
    }

    if (users[currentUser].password !== currentPasswordInput) {
      showToast("Mật khẩu hiện tại (mật khẩu cũ) không chính xác!", true);
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 4) {
      showToast("Mật khẩu mới phải có ít nhất 4 ký tự!", true);
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      showToast("Mật khẩu mới và xác nhận mật khẩu mới không khớp!", true);
      return;
    }

    users[currentUser].password = newPasswordInput;
    saveUsersDB();
    await syncToCloud();
    document.getElementById("password-change-form").reset();
    showToast("Đổi mật khẩu thành công!");
  });

  // Đăng xuất
  document.getElementById("logout-btn").addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("studyos_current_user");
    loadActiveUserData();
    renderAll();
    showToast("Đã đăng xuất về chế độ Khách.");
  });
}