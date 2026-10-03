// =========================================================================
// 9. PROFILE.JS — ĐĂNG KÝ, ĐĂNG NHẬP, AVATAR & ĐỔI MẬT KHẨU 3 BƯỚC
// =========================================================================
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

  if (currentUser && users[currentUser]) {
    const u = users[currentUser];
    const initial = u.username.charAt(0).toUpperCase();
    const syncTag = isCloudEnabled() ? "☁️️ Đã đồng bộ" : "Lưu nội bộ";

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
  } else {
    renderAvatarElement(sidebarAvatar, null, "G");
    renderAvatarElement(profileBigAvatar, null, "G");
    sidebarUsername.textContent = "Khách (Guest)";
    sidebarEmail.textContent = "Nhấn để đăng nhập";
    topProfileBtn.textContent = "Đăng nhập";
    activeAccountLabel.textContent = "Khách (Guest)";

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

  // ĐĂNG KÝ
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim().toLowerCase();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      showToast("Username từ 3-24 ký tự, viết liền không dấu!", true);
      return;
    }
    if (password.length < 4) {
      showToast("Mật khẩu phải có ít nhất 4 ký tự!", true);
      return;
    }

    if (isCloudEnabled()) {
      const existingCloud = await fetchAccountFromCloud(username);
      if (existingCloud && existingCloud.profile) {
        showToast("Username này đã tồn tại trên hệ thống Cloud!", true);
        return;
      }
    } else if (users[username]) {
      showToast("Username này đã tồn tại!", true);
      return;
    }

    const isFirstAccountEver = Object.keys(users).length === 0;

    users[username] = {
      username,
      email,
      password,
      avatar: null,
      createdAt: getTodayStr()
    };
    saveUsersDB();

    if (isFirstAccountEver && tasks.length > 0) {
      localStorage.setItem(`studyos_tasks_${username}`, JSON.stringify(tasks));
      localStorage.setItem(`studyos_config_${username}`, JSON.stringify(config));
    }

    currentUser = username;
    localStorage.setItem("studyos_current_user", currentUser);
    loadActiveUserData();
    await syncToCloud();
    renderAll();
    document.getElementById("register-form").reset();
    showToast(`Đăng ký & đồng bộ thành công! Chào mừng @${username}`);
  });

  // ĐĂNG NHẬP
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    if (isCloudEnabled()) {
      const cloudData = await fetchAccountFromCloud(username);
      if (cloudData && cloudData.profile) {
        if (cloudData.profile.password !== password) {
          showToast("Sai Username hoặc Mật khẩu!", true);
          return;
        }
        users[username] = cloudData.profile;
        saveUsersDB();
        currentUser = username;
        localStorage.setItem("studyos_current_user", currentUser);

        config = { ...DEFAULT_CONFIG, ...(cloudData.config || {}) };
        tasks = Array.isArray(cloudData.tasks) ? cloudData.tasks : [];
        futureMails = Array.isArray(cloudData.futureMails) ? cloudData.futureMails : [];
        saveLocalOnly();
        await pullSharedLettersFromCloud();
        renderAll();
        document.getElementById("login-form").reset();
        showToast(`Đã đồng bộ dữ liệu của @${username} từ Cloud!`);
        return;
      }
    }

    const account = users[username];
    if (!account || account.password !== password) {
      showToast("Sai Username hoặc Mật khẩu!", true);
      return;
    }

    currentUser = username;
    localStorage.setItem("studyos_current_user", currentUser);
    loadActiveUserData();
    await syncToCloud();
    renderAll();
    document.getElementById("login-form").reset();
    showToast(`Chào mừng trở lại, @${username}!`);
  });

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