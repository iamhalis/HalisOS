async function processAvatarFile(file) {
  if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.validateUploadFile) {
    await HaliosSecurity.validateUploadFile(file);
  } else {
    if (!file) throw new Error("Vui lòng chọn một file ảnh!");
    if (!ALLOWED_AVATAR_TYPES.includes(file.type.toLowerCase())) {
      throw new Error("Chỉ chấp nhận định dạng ảnh PNG, JPG, JPEG hoặc WebP!");
    }
  }

  return new Promise((resolve, reject) => {
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
        profileLicenseTag.textContent = "⭐ Member";
      } else {
        profileLicenseTag.className = "profile-license-badge free";
        profileLicenseTag.textContent = "⚠️ Free Trial";
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

    const submitBtn = document.getElementById("register-form").querySelector("button[type='submit']");
    const originalBtnText = submitBtn ? submitBtn.textContent : "Tạo tài khoản";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang kiểm tra...";
    }

    try {
      // BẮT BUỘC PHẢI CÓ KEY ĐỂ TẠO TÀI KHOẢN (Nếu không có key thì dùng Chế độ Khách, không lưu tk trial lên Firebase)
      if (!rawKey) {
        showToast("Bắt buộc phải có mã Key kích hoạt để tạo tài khoản! Nếu chưa có Key, vui lòng sử dụng Chế độ Khách.", true);
        return;
      }

      // Kiểm tra username trên Cloud xem đã có ai đăng ký chưa
      if (CLOUD_DB_URL) {
        const cloudAcc = await fetchAccountFromCloud(username);
        if (cloudAcc && cloudAcc.profile) {
          showToast("Username này đã được đăng ký trên hệ thống! Vui lòng chọn tên khác hoặc Đăng nhập.", true);
          return;
        }
      }

      // Xác thực và kích hoạt mã Key với API máy chủ bản quyền
      showToast("Đang kiểm tra và kích hoạt mã Key...");
      const keyPattern = /^HASHX-[A-F0-9]{4}-[A-F0-9]{4}$/i;
      if (!keyPattern.test(rawKey)) {
        showToast("Định dạng key không đúng (Chuẩn: HASHX-XXXX-XXXX, VD: HASHX-A1B2-C3D4)!", true);
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
          showToast(data.error || "Mã Key không hợp lệ hoặc đã qua sử dụng!", true);
          return;
        }
      } catch {
        showToast("Không thể kết nối đến máy chủ xác thực key! Vui lòng kiểm tra mạng.", true);
        return;
      }

      const isActivated = true;
      const activatedKey = rawKey;

      const isFirstAccountEver = Object.keys(users).length === 0;

      // Hash mật khẩu với PBKDF2-SHA256 (không lưu plaintext)
      let securePasswordHash = password;
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.hashPassword) {
        securePasswordHash = await HaliosSecurity.hashPassword(password);
      }

      users[username] = {
        username,
        email,
        password: securePasswordHash,
        avatar: null,
        createdAt: getTodayStr(),
        is_activated: true,
        license_key: activatedKey,
        activated_at: new Date().toISOString()
      };
      saveUsersDB();

      currentUser = username;
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.SessionManager) {
        HaliosSecurity.SessionManager.createSession(currentUser);
      } else {
        localStorage.setItem("studyos_current_user", currentUser);
      }

      if (isFirstAccountEver && tasks.length > 0) {
        localStorage.setItem(`studyos_tasks_${username}`, JSON.stringify(tasks));
        localStorage.setItem(`studyos_config_${username}`, JSON.stringify(config));
      }

      loadActiveUserData();

      // Lưu tài khoản Member chính thức lên Cloud (Firebase)
      if (CLOUD_DB_URL) {
        try {
          const initialPayload = {
            profile: users[username],
            config,
            tasks,
            futureMails,
            updatedAt: Date.now()
          };
          await fetch(getCloudEndpoint(username), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(initialPayload)
          });
        } catch (err) {
          if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.Logger) {
            HaliosSecurity.Logger.warn("Lỗi lưu tài khoản lên Cloud:", err);
          }
        }
      }

      showToast(`⭐ Đăng ký & kích hoạt thành công tài khoản Member @${username}! Đã bật Cloud Sync.`);
      renderAll();
      document.getElementById("register-form").reset();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });

  // ĐĂNG NHẬP
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();

    // 1. Kiểm tra Rate Limit chống Brute-Force
    if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.RateLimiter) {
      const remaining = HaliosSecurity.RateLimiter.getLockoutRemainingSeconds();
      if (remaining > 0) {
        showToast(`⚠️ Quá nhiều lần thử sai! Đã tạm khóa đăng nhập trong ${remaining}s để bảo vệ tài khoản.`, true);
        return;
      }
    }

    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const submitBtn = document.getElementById("login-form").querySelector("button[type='submit']");
    const originalBtnText = submitBtn ? submitBtn.textContent : "Đăng nhập";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang kiểm tra...";
    }

    const checkPasswordMatch = async (inputPass, targetHash) => {
      if (!targetHash) return false;
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.verifyPassword) {
        return await HaliosSecurity.verifyPassword(inputPass, targetHash);
      }
      return inputPass === targetHash;
    };

    const handleLoginFailure = () => {
      let failMessage = "Sai Username hoặc Mật khẩu!";
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.RateLimiter) {
        const rateState = HaliosSecurity.RateLimiter.recordFailedAttempt();
        if (rateState.isLocked) {
          failMessage = `⚠️ Bạn đã nhập sai ${rateState.attempts} lần! Khóa đăng nhập 60 giây để phòng chống tấn công.`;
        } else {
          failMessage = `Sai Username hoặc Mật khẩu! (Còn ${Math.max(0, 5 - rateState.attempts)} lần thử)`;
        }
      }
      showToast(failMessage, true);
    };

    try {
      let account = users[username];

      // Nếu chưa có trên máy này (ví dụ sau khi xoá cookie/dữ liệu trình duyệt), lấy từ Cloud
      if (!account && CLOUD_DB_URL) {
        const cloudData = await fetchAccountFromCloud(username);
        if (cloudData && cloudData.profile) {
          const isCloudMatch = await checkPasswordMatch(password, cloudData.profile.password);
          if (!isCloudMatch) {
            handleLoginFailure();
            return;
          }
          // Thiết lập currentUser TRƯỚC khi saveLocalOnly để lưu đúng key của tài khoản đó
          currentUser = username;
          if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.SessionManager) {
            HaliosSecurity.SessionManager.createSession(currentUser);
          } else {
            localStorage.setItem("studyos_current_user", currentUser);
          }
          users[username] = cloudData.profile;
          if (typeof isAccountActivated === "function" && isAccountActivated(username)) {
            users[username].is_activated = true;
          }
          saveUsersDB();
          account = users[username];
          config = { ...DEFAULT_CONFIG, ...(cloudData.config || {}) };
          tasks = Array.isArray(cloudData.tasks) ? cloudData.tasks : [];
          futureMails = Array.isArray(cloudData.futureMails) ? cloudData.futureMails : [];
          saveLocalOnly();
        }
      }

      if (!account) {
        handleLoginFailure();
        return;
      }

      const isLocalMatch = await checkPasswordMatch(password, account.password);
      if (!isLocalMatch) {
        handleLoginFailure();
        return;
      }

      // Đăng nhập thành công -> Reset Rate Limit & Tạo session có thời hạn
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.RateLimiter) {
        HaliosSecurity.RateLimiter.reset();
      }

      currentUser = username;
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.SessionManager) {
        HaliosSecurity.SessionManager.createSession(currentUser);
      } else {
        localStorage.setItem("studyos_current_user", currentUser);
      }

      // Tự động nâng cấp mật khẩu plaintext cũ sang PBKDF2 hash nếu cần
      if (account.password && !account.password.startsWith("pbkdf2:") && typeof HaliosSecurity !== "undefined") {
        account.password = await HaliosSecurity.hashPassword(password);
        saveUsersDB();
      }

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
    } catch (err) {
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.Logger) {
        HaliosSecurity.Logger.error("Lỗi đăng nhập:", err);
      }
      showToast("Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại!", true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
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
    if (isCloudEnabled()) {
      await syncToCloud();
    } else if (CLOUD_DB_URL) {
      try {
        await fetch(getCloudEndpoint(currentUser), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: users[currentUser], updatedAt: Date.now() })
        });
      } catch (err) {
        if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.Logger) {
          HaliosSecurity.Logger.warn("Lỗi đồng bộ hồ sơ lên Cloud:", err);
        }
      }
    }
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

    let isCurrentMatch = false;
    if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.verifyPassword) {
      isCurrentMatch = await HaliosSecurity.verifyPassword(currentPasswordInput, users[currentUser].password);
    } else {
      isCurrentMatch = (users[currentUser].password === currentPasswordInput);
    }

    if (!isCurrentMatch) {
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

    // Băm mật khẩu mới bằng PBKDF2
    let hashedNewPassword = newPasswordInput;
    if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.hashPassword) {
      hashedNewPassword = await HaliosSecurity.hashPassword(newPasswordInput);
    }

    users[currentUser].password = hashedNewPassword;
    saveUsersDB();
    if (isCloudEnabled()) {
      await syncToCloud();
    } else if (CLOUD_DB_URL) {
      try {
        await fetch(getCloudEndpoint(currentUser), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: users[currentUser], updatedAt: Date.now() })
        });
      } catch (err) {
        if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.Logger) {
          HaliosSecurity.Logger.warn("Lỗi đồng bộ hồ sơ lên Cloud:", err);
        }
      }
    }
    document.getElementById("password-change-form").reset();
    showToast("Đổi mật khẩu thành công!");
  });

  // Đăng xuất
  document.getElementById("logout-btn").addEventListener("click", () => {
    currentUser = null;
    if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.SessionManager) {
      HaliosSecurity.SessionManager.destroySession();
    } else {
      localStorage.removeItem("studyos_current_user");
    }
    loadActiveUserData();
    renderAll();
    showToast("Đã đăng xuất về chế độ Khách.");
  });

  // Chuyển nhanh sang Chế độ Khách từ form Đăng ký / Đăng nhập
  const handleGuestMode = () => {
    if (typeof switchTab === "function") switchTab("dashboard");
    showToast("Bạn đang sử dụng Chế độ Khách (Dữ liệu lưu nội bộ trên máy này).");
  };
  const guestBtn = document.getElementById("guest-mode-btn");
  if (guestBtn) guestBtn.addEventListener("click", handleGuestMode);
  const loginGuestBtn = document.getElementById("login-guest-btn");
  if (loginGuestBtn) loginGuestBtn.addEventListener("click", handleGuestMode);

  // ========================================================
  // TÍNH NĂNG XÓA TÀI KHOẢN VĨNH VIỄN (DELETE ACCOUNT)
  // ========================================================
  const openDeleteModalBtn = document.getElementById("open-delete-account-modal-btn");
  const deleteModal = document.getElementById("delete-account-modal-overlay");
  const deleteUsernameLabel = document.getElementById("delete-modal-username");
  const deletePasswordInput = document.getElementById("delete-account-password");
  const deleteAlert = document.getElementById("delete-account-alert");

  const closeDeleteModal = () => {
    if (deleteModal) deleteModal.classList.add("hidden");
    if (deletePasswordInput) deletePasswordInput.value = "";
    if (deleteAlert) {
      deleteAlert.className = "license-alert hidden";
      deleteAlert.textContent = "";
    }
  };

  if (openDeleteModalBtn && deleteModal) {
    openDeleteModalBtn.addEventListener("click", () => {
      if (!currentUser || !users[currentUser]) return;
      if (deleteUsernameLabel) deleteUsernameLabel.textContent = `@${currentUser}`;
      if (deletePasswordInput) deletePasswordInput.value = "";
      if (deleteAlert) {
        deleteAlert.className = "license-alert hidden";
        deleteAlert.textContent = "";
      }
      deleteModal.classList.remove("hidden");
      setTimeout(() => {
        if (deletePasswordInput) deletePasswordInput.focus();
      }, 100);
    });
  }

  const closeDeleteModalBtn = document.getElementById("close-delete-modal-btn");
  if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
  const cancelDeleteModalBtn = document.getElementById("cancel-delete-modal-btn");
  if (cancelDeleteModalBtn) cancelDeleteModalBtn.addEventListener("click", closeDeleteModal);

  if (deleteModal) {
    deleteModal.addEventListener("click", e => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  const deleteForm = document.getElementById("delete-account-form");
  if (deleteForm) {
    deleteForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!currentUser || !users[currentUser]) return;

      const confirmBtn = document.getElementById("confirm-delete-account-btn");
      const passInput = document.getElementById("delete-account-password");
      const passVal = passInput ? passInput.value : "";

      if (!passVal) {
        if (deleteAlert) {
          deleteAlert.className = "license-alert error";
          deleteAlert.textContent = "Vui lòng nhập mật khẩu tài khoản để xác nhận!";
        }
        return;
      }

      // Xác thực mật khẩu
      let isPasswordCorrect = false;
      if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.verifyPassword) {
        isPasswordCorrect = await HaliosSecurity.verifyPassword(passVal, users[currentUser].password);
      } else {
        isPasswordCorrect = (users[currentUser].password === passVal);
      }

      if (!isPasswordCorrect) {
        if (deleteAlert) {
          deleteAlert.className = "license-alert error";
          deleteAlert.textContent = "Mật khẩu xác nhận không chính xác! Không thể xóa tài khoản.";
        }
        return;
      }

      const userToDelete = currentUser;
      const originalConfirmText = confirmBtn ? confirmBtn.textContent : "Xác nhận xóa vĩnh viễn";
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Đang xóa tài khoản trên Cloud...";
      }

      try {
        // 1. Gửi request DELETE lên Cloud (Firebase RTDB)
        if (CLOUD_DB_URL) {
          try {
            await fetch(getCloudEndpoint(userToDelete), {
              method: "DELETE"
            });
          } catch (cloudErr) {
            if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.Logger) {
              HaliosSecurity.Logger.warn("Lỗi khi xóa trên Firebase Cloud:", cloudErr);
            }
          }
        }

        // 2. Dọn dẹp dữ liệu cục bộ của tài khoản
        localStorage.removeItem(`studyos_tasks_${userToDelete}`);
        localStorage.removeItem(`studyos_config_${userToDelete}`);
        localStorage.removeItem(`studyos_mails_${userToDelete}`);

        // 3. Xóa khỏi danh sách users
        delete users[userToDelete];
        saveUsersDB();

        // 4. Hủy session phiên làm việc
        if (typeof HaliosSecurity !== "undefined" && HaliosSecurity.SessionManager) {
          HaliosSecurity.SessionManager.destroySession();
        } else {
          localStorage.removeItem("studyos_current_user");
        }
        currentUser = null;

        // 5. Thu hồi cookie server nếu có
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (_) {}

        closeDeleteModal();

        // 6. Nạp lại dữ liệu về Chế độ Khách và cập nhật toàn bộ giao diện
        loadActiveUserData();
        renderAll();
        showToast(`Đã xóa vĩnh viễn tài khoản @${userToDelete} và toàn bộ dữ liệu trên Cloud!`);
      } catch (err) {
        if (deleteAlert) {
          deleteAlert.className = "license-alert error";
          deleteAlert.textContent = "Có lỗi xảy ra khi xóa tài khoản. Vui lòng thử lại!";
        }
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalConfirmText;
        }
      }
    });
  }
}