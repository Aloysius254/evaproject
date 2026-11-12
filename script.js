/* =============================================================
   FIREBASE INIT
   ============================================================= */
const firebaseConfig = {
  apiKey:            "AIzaSyCDjfXhTYoAqhUCTMbrOB5uiZeU7dDqgbo",
  authDomain:        "aloeva-chatbot.firebaseapp.com",
  databaseURL:       "https://aloeva-chatbot-default-rtdb.firebaseio.com",
  projectId:         "aloeva-chatbot",
  storageBucket:     "aloeva-chatbot.firebasestorage.app",
  messagingSenderId: "216931642104",
  appId:             "1:216931642104:web:68522fe6c57aa79565a90d"
};
firebase.initializeApp(firebaseConfig);
const db      = firebase.database();
const auth    = firebase.auth();
const storage = firebase.storage();

/* =============================================================
   CONSTANTS
   ============================================================= */
const ADMIN_EMAIL = "aloysiusmworia@gmail.com";
const SECRET_KEY  = "aloeva123.";
const START_DATE  = new Date("2025-06-13T00:00:00");
const CARD_PAIRS  = ["🌹","🌹","💋","💋","🎁","🎁","💍","💍"];

/* =============================================================
   HELPERS
   ============================================================= */
/** Get element by id — always check result before use */
function el(id) { return document.getElementById(id); }

/** Replace Firebase-illegal characters in email for use as a DB key */
function sanitizeKey(email) {
  return (email || "").replace(/[.#$[\]]/g, "-");
}

/** Show an error message in the login form */
function showLoginError(msg) {
  const div = el("loginError");
  if (!div) return;
  div.textContent = msg;
  div.style.display = msg ? "block" : "none";
}

/* =============================================================
   ENCRYPTION
   ============================================================= */
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}
function decrypt(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    return plain || cipher; // fall back to raw if decryption fails
  } catch {
    return cipher;
  }
}

/* =============================================================
   APP NAMESPACE  — all public functions hang off window.App
   so onclick="App.foo()" in HTML always resolves correctly
   ============================================================= */
const App = (() => {
  /* ── private state ── */
  let currentUser    = null;
  let isAdmin        = false;
  let heartsEnabled  = true;
  let heartsTimer    = null;
  let counterTimer   = null;
  let lightboxIndex  = 0;
  let luckyBox       = 0;
  let tapCount       = 0;
  let tapTimer       = null;
  let deferredPrompt = null;

  // voice recording
  let mediaRecorder  = null;
  let audioChunks    = [];

  // realtime listeners — stored so we can detach on logout
  const listeners = [];

  /* ─────────────────────────────────────────────────────────────
     AUTH
  ───────────────────────────────────────────────────────────── */
  auth.onAuthStateChanged(user => {
    if (user) {
      // Check ban before showing the app
      const key = sanitizeKey(user.email);
      db.ref("settings/bannedEmails/" + key).once("value").then(snap => {
        if (snap.val() === true && user.email !== ADMIN_EMAIL) {
          auth.signOut();
          showLoginError("❌ Your account has been banned from this site.");
          return;
        }
        currentUser = user;
        isAdmin     = user.email === ADMIN_EMAIL;
        showApp();
        onLogin();
      }).catch(err => {
        showLoginError("⚠️ Connection error. Please try again.");
        console.error(err);
      });
    } else {
      currentUser = null;
      isAdmin     = false;
      showLoginScreen();
      detachListeners();
      stopHearts();
      stopCounter();
    }
  });

  function showApp() {
    el("loginScreen").style.display = "none";
    el("app").style.display = "block";
    showLoginError("");
  }

  function showLoginScreen() {
    el("loginScreen").style.display = "flex";
    el("app").style.display = "none";
  }

  function onLogin() {
    // 1. Load profile from Firebase, prompt for name if first time
    db.ref("users/" + currentUser.uid).once("value").then(snap => {
      const data = snap.val() || {};

      let name = data.name || localStorage.getItem("username");
      if (!name) {
        name = window.prompt("Enter your display name ❤️") || "Anonymous";
      }
      name = name.trim() || "Anonymous";
      localStorage.setItem("username", name);

      // Always persist name + email
      db.ref("users/" + currentUser.uid).update({ name, email: currentUser.email });

      const nameEl = el("displayName");
      if (nameEl) nameEl.textContent = name;

      if (data.photo) {
        const p = el("profilePhoto");
        if (p) p.src = data.photo;
      }
    });

    // 2. Mark online presence
    setOnline();

    // 3. Subscribe to global settings
    attachSettingsListeners();

    // 4. Admin vs regular user
    if (isAdmin) {
      grantChatAccess();
    } else {
      attachChatGrantListener();
      attachBlockListener();
    }

    // 5. Start UI
    startHearts();
    startCounter();
    attachOnlineStatusListener();
    initSwipeNav();
    registerServiceWorker();
    initInstallPrompt();
    showSection(localStorage.getItem("currentPage") || "home");
  }

  /* ─────────────────────────────────────────────────────────────
     REALTIME LISTENERS  (tracked so we can detach on logout)
  ───────────────────────────────────────────────────────────── */
  function track(ref, event, cb) {
    ref.on(event, cb);
    listeners.push({ ref, event, cb });
  }

  function detachListeners() {
    listeners.forEach(({ ref, event, cb }) => ref.off(event, cb));
    listeners.length = 0;
  }

  function attachSettingsListeners() {
    track(db.ref("settings/heartsEnabled"), "value", snap => {
      heartsEnabled = snap.val() !== false;
      const cb = el("toggleHearts");
      if (cb) cb.checked = heartsEnabled;
    });

    track(db.ref("settings/memoriesEnabled"), "value", snap => {
      const on   = snap.val() !== false;
      const lock = el("memoriesLock");
      if (lock) lock.style.display = (on || isAdmin) ? "none" : "flex";
      const cb = el("toggleMemories");
      if (cb) cb.checked = on;
    });

    track(db.ref("settings/chatEnabled"), "value", snap => {
      const on   = snap.val() !== false;
      const lock = el("chatLock");
      if (lock) lock.style.display = (on || isAdmin) ? "none" : "flex";
      const cb = el("toggleChat");
      if (cb) cb.checked = on;
      // disable inputs for non-admins when chat is off
      if (!isAdmin) {
        const inp  = el("chatInput");
        const send = document.querySelector(".chat-input button");
        if (inp)  inp.disabled  = !on;
        if (send) send.disabled = !on;
      }
    });
  }

  function attachChatGrantListener() {
    track(db.ref("settings/chatGranted/" + currentUser.uid), "value", snap => {
      const granted  = snap.val() === true;
      const chatSec  = el("chatSection");
      const pending  = el("chatPending");
      if (chatSec) chatSec.style.display = granted ? "block" : "none";
      if (pending) pending.style.display = granted ? "none"  : "block";
      if (granted) loadMessages();
    });
  }

  function grantChatAccess() {
    // Admin always has chat open
    const chatSec = el("chatSection");
    const pending = el("chatPending");
    if (chatSec) chatSec.style.display = "block";
    if (pending) pending.style.display = "none";
    loadMessages();
    attachChatInputListeners();
  }

  function attachBlockListener() {
    track(db.ref("settings/blockedUsers/" + currentUser.uid), "value", snap => {
      const blocked = snap.val() === true;
      const inp     = el("chatInput");
      const send    = document.querySelector(".chat-input button");
      const rec     = el("recordBtn");
      const msg     = el("chatBlockedMsg");
      if (inp)  inp.disabled  = blocked;
      if (send) send.disabled = blocked;
      if (rec)  rec.disabled  = blocked;
      if (msg)  msg.style.display = blocked ? "block" : "none";
    });
  }

  function attachOnlineStatusListener() {
    track(db.ref("status"), "value", snap => {
      const data     = snap.val() || {};
      const me       = sanitizeKey(currentUser ? currentUser.email : "");
      const statusEl = el("userStatus");
      if (!statusEl) return;
      // find the other user's status
      for (const key of Object.keys(data)) {
        if (key !== me) {
          const s = data[key];
          statusEl.textContent = s.online
            ? key.replace(/-/g, ".") + " is online 🟢"
            : "Last seen " + new Date(s.lastSeen).toLocaleTimeString();
          return;
        }
      }
      statusEl.textContent = "";
    });
  }

  /* ─────────────────────────────────────────────────────────────
     ONLINE PRESENCE
  ───────────────────────────────────────────────────────────── */
  function setOnline() {
    if (!currentUser || !currentUser.email) return;
    const key = sanitizeKey(currentUser.email);
    const ref = db.ref("status/" + key);
    ref.set({ online: true, lastSeen: Date.now() });
    // Use onDisconnect so Firebase handles it even on tab close
    ref.onDisconnect().set({ online: false, lastSeen: Date.now() });
  }

  /* ─────────────────────────────────────────────────────────────
     SECTION NAVIGATION
  ───────────────────────────────────────────────────────────── */
  const PAGES = ["home", "story", "memories", "game"];

  function showSection(id) {
    if (!PAGES.includes(id)) id = "home";

    document.querySelectorAll("#app > section").forEach(s => {
      if (s.id !== "site-rating") s.style.display = "none";
    });

    const target = el(id);
    if (target) target.style.display = "block";

    document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
    const link = el("nav-" + id);
    if (link) link.classList.add("active");

    // Rating widget — hide on mobile except on home
    const rating = el("site-rating");
    if (rating) {
      rating.style.display = (window.innerWidth <= 768 && id !== "home") ? "none" : "block";
    }

    localStorage.setItem("currentPage", id);
  }

  function initSwipeNav() {
    let sx = 0, sy = 0;
    document.addEventListener("touchstart", e => {
      if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener("touchend", e => {
      if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
      const dx = sx - e.changedTouches[0].clientX;
      const dy = sy - e.changedTouches[0].clientY;
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 100) return;
      const cur = PAGES.find(id => {
        const s = el(id);
        return s && s.style.display !== "none";
      }) || "home";
      const i = PAGES.indexOf(cur);
      if (dx > 0 && i < PAGES.length - 1) showSection(PAGES[i + 1]);
      if (dx < 0 && i > 0)                showSection(PAGES[i - 1]);
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────────────────────
     LOVE COUNTER
  ───────────────────────────────────────────────────────────── */
  function startCounter() {
    updateCounter();
    counterTimer = setInterval(updateCounter, 1000);
  }

  function stopCounter() {
    clearInterval(counterTimer);
    counterTimer = null;
  }

  function updateCounter() {
    const counterEl = el("counter");
    if (!counterEl) return;
    const diff = Date.now() - START_DATE.getTime();
    if (diff < 0) { counterEl.textContent = "Our love story begins soon 💕"; return; }
    const days = Math.floor(diff / 86400000);
    const hrs  = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000)  / 60000);
    const secs = Math.floor((diff % 60000)    / 1000);
    counterEl.textContent = `We have loved each other for ${days}d ${hrs}h ${mins}m ${secs}s ❤️`;
  }

  /* ─────────────────────────────────────────────────────────────
     MUSIC
  ───────────────────────────────────────────────────────────── */
  function toggleMusic() {
    const music = el("bgMusic");
    const btn   = el("musicBtn");
    if (!music || !btn) return;
    if (music.paused) {
      music.play().catch(() => {}); // browser may block autoplay
      btn.textContent = "🎵 Pause Music";
    } else {
      music.pause();
      btn.textContent = "🎵 Play Music";
    }
  }

  /* ─────────────────────────────────────────────────────────────
     POPUP
  ───────────────────────────────────────────────────────────── */
  function showPopup() {
    const p = el("popup");
    if (p) p.style.display = "flex";
  }
  function closePopup() {
    const p = el("popup");
    if (p) p.style.display = "none";
  }

  /* ─────────────────────────────────────────────────────────────
     FLOATING HEARTS
  ───────────────────────────────────────────────────────────── */
  function startHearts() {
    if (heartsTimer) return;
    heartsTimer = setInterval(() => {
      if (!heartsEnabled) return;
      const h = document.createElement("div");
      h.className   = "heart";
      h.textContent = "❤️";
      h.style.left     = (Math.random() * 100) + "vw";
      h.style.fontSize = (14 + Math.random() * 22) + "px";
      h.setAttribute("aria-hidden", "true");
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 6000);
    }, 600);
  }

  function stopHearts() {
    clearInterval(heartsTimer);
    heartsTimer = null;
    document.querySelectorAll(".heart").forEach(h => h.remove());
  }

  /* ─────────────────────────────────────────────────────────────
     RATING
  ───────────────────────────────────────────────────────────── */
  function rateSite(rating) {
    const stars = document.querySelectorAll(".rating-stars span");
    stars.forEach((s, i) => s.classList.toggle("active", i < rating));
    const msgs = ["", "💔 We can do better", "😊 Getting stronger", "❤️ Beautiful love", "💖 Almost perfect", "💞 Perfect love"];
    const r = el("ratingResult");
    if (r) r.textContent = msgs[rating] || "";
    localStorage.setItem("loveRating", rating);
  }

  /* ─────────────────────────────────────────────────────────────
     LIGHTBOX
  ───────────────────────────────────────────────────────────── */
  function openLightbox(img) {
    const box = el("lightbox");
    const lbImg = el("lightbox-img");
    if (!box || !lbImg) return;
    const allImgs = Array.from(document.querySelectorAll(".gallery img"));
    lightboxIndex = allImgs.indexOf(img);
    lbImg.src     = img.src;
    lbImg.alt     = img.alt;
    box.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    const box = el("lightbox");
    if (box) box.style.display = "none";
    document.body.style.overflow = "";
  }

  function nextImage() { moveLight(1); }
  function prevImage() { moveLight(-1); }

  function moveLight(dir) {
    const imgs = document.querySelectorAll(".gallery img");
    if (!imgs.length) return;
    lightboxIndex = (lightboxIndex + dir + imgs.length) % imgs.length;
    const lbImg = el("lightbox-img");
    if (lbImg) {
      lbImg.src = imgs[lightboxIndex].src;
      lbImg.alt = imgs[lightboxIndex].alt;
    }
  }

  // Swipe inside lightbox
  (function initLightboxSwipe() {
    document.addEventListener("DOMContentLoaded", () => {
      const box = el("lightbox");
      if (!box) return;
      let sx = 0;
      box.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
      box.addEventListener("touchend", e => {
        const dx = sx - e.changedTouches[0].clientX;
        if (dx > 50)  nextImage();
        if (dx < -50) prevImage();
      }, { passive: true });
    });
  })();

  /* ─────────────────────────────────────────────────────────────
     PROFILE
  ───────────────────────────────────────────────────────────── */
  function handleProfileTap() {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      if (tapCount >= 3 && isAdmin) {
        openAdminPanel();
      } else {
        openProfileModal();
      }
      tapCount = 0;
    }, 400);
  }

  function openProfileModal() {
    const modal    = el("profileModal");
    const mPhoto   = el("profileModalPhoto");
    const mName    = el("profileModalName");
    const pPhoto   = el("profilePhoto");
    const pName    = el("displayName");
    if (!modal) return;
    if (mPhoto && pPhoto) mPhoto.src = pPhoto.src;
    if (mName  && pName)  mName.textContent = pName.textContent;
    modal.style.display = "flex";
  }

  function closeProfileModal() {
    const modal = el("profileModal");
    if (modal) modal.style.display = "none";
  }

  function changeUsername() {
    if (!currentUser) return;
    const name = window.prompt("Enter new display name ❤️");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    localStorage.setItem("username", trimmed);
    db.ref("users/" + currentUser.uid).update({ name: trimmed });
    const dn = el("displayName");
    if (dn) dn.textContent = trimmed;
  }

  function changePhoto() {
    if (!currentUser) return;
    const fileInput = el("photoInput");
    if (!fileInput) return;
    fileInput.click();
    fileInput.onchange = async () => {
      const file   = fileInput.files[0];
      const status = el("recordStatus");
      if (!file) return;
      if (status) status.textContent = "Uploading…";
      try {
        const ref = storage.ref("photos/" + currentUser.uid + ".jpg");
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.ref("users/" + currentUser.uid).update({ photo: url });
        const pp = el("profilePhoto");
        const mp = el("profileModalPhoto");
        if (pp) pp.src = url;
        if (mp) mp.src = url;
        if (status) status.textContent = "Photo updated ✔";
        setTimeout(() => { if (status) status.textContent = ""; }, 2500);
      } catch (err) {
        console.error(err);
        if (status) status.textContent = "Upload failed ❌";
      } finally {
        fileInput.value = "";
      }
    };
  }

  /* ─────────────────────────────────────────────────────────────
     CHAT
  ───────────────────────────────────────────────────────────── */
  function loadMessages() {
    const box = el("chatBox");
    if (!box) return;

    track(db.ref("messages"), "value", snap => {
      box.innerHTML = "";
      const me = localStorage.getItem("username") || "";
      snap.forEach(child => {
        const msg = child.val();
        const key = child.key;
        const div = document.createElement("div");
        div.className = msg.user === me ? "msg sent" : "msg received";

        const name = document.createElement("small");
        name.className   = "msg-name";
        name.textContent = msg.user || "Anonymous";
        div.appendChild(name);

        if (msg.voice) {
          const audio = document.createElement("audio");
          audio.controls = true;
          audio.src      = msg.voice;
          div.appendChild(audio);
        } else if (msg.text) {
          const span = document.createElement("span");
          span.textContent = decrypt(msg.text);
          div.appendChild(span);
        }

        if (msg.user === me) {
          const tick = document.createElement("small");
          tick.className   = "msg-tick";
          tick.textContent = msg.seen ? "✔✔" : "✔";
          div.appendChild(tick);
        }

        // Mark as seen
        if (msg.user !== me && !msg.seen) {
          db.ref("messages/" + key).update({ seen: true }).catch(() => {});
        }

        box.appendChild(div);
      });
      box.scrollTop = box.scrollHeight;
    });

    attachChatInputListeners();
  }

  let chatListenersAttached = false;
  function attachChatInputListeners() {
    if (chatListenersAttached) return;
    chatListenersAttached = true;

    const input = el("chatInput");
    const rec   = el("recordBtn");

    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      input.addEventListener("input", () => {
        if (!currentUser) return;
        const u = localStorage.getItem("username") || "Someone";
        db.ref("typing").set({ user: u, typing: true });
        clearTimeout(input._typingTimer);
        input._typingTimer = setTimeout(() => {
          db.ref("typing").set({ user: u, typing: false });
        }, 1500);
      });
    }

    track(db.ref("typing"), "value", snap => {
      const d   = snap.val();
      const me  = localStorage.getItem("username") || "";
      const div = el("typingStatus");
      if (div) {
        div.textContent = (d && d.typing && d.user !== me) ? d.user + " is typing…" : "";
      }
    });

    if (rec) {
      rec.addEventListener("mousedown",  startRecording);
      rec.addEventListener("mouseup",    stopRecording);
      rec.addEventListener("touchstart", e => { e.preventDefault(); startRecording(); }, { passive: false });
      rec.addEventListener("touchend",   e => { e.preventDefault(); stopRecording();  }, { passive: false });
    }
  }

  function sendMessage() {
    if (!currentUser) return;
    const inp  = el("chatInput");
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;

    const chatLock = el("chatLock");
    if (chatLock && chatLock.style.display !== "none") {
      window.alert("Chat is locked by admin 🔒");
      return;
    }
    if (inp.disabled) {
      window.alert("You are restricted from chatting 🚫");
      return;
    }

    db.ref("messages").push({
      text: encrypt(text),
      user: localStorage.getItem("username") || "Anonymous",
      time: Date.now(),
      seen: false
    }).catch(err => console.error("Send failed:", err));

    inp.value = "";
  }

  /* ─────────────────────────────────────────────────────────────
     VOICE RECORDING
  ───────────────────────────────────────────────────────────── */
  function startRecording() {
    if (!currentUser) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioChunks  = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      const rec    = el("recordBtn");
      const status = el("recordStatus");
      if (rec)    { rec.style.background = "#c62828"; rec.textContent = "🔴 Recording…"; }
      if (status) status.textContent = "Release to send";
    }).catch(() => window.alert("Microphone access denied ❌"));
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    mediaRecorder.stop();
    const rec    = el("recordBtn");
    const status = el("recordStatus");
    if (rec)    { rec.style.background = ""; rec.textContent = "🎤 Hold to Record"; }
    if (status) status.textContent = "Uploading…";

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      try {
        const ref = storage.ref("voices/" + Date.now() + ".webm");
        await ref.put(blob);
        const url = await ref.getDownloadURL();
        await db.ref("messages").push({
          voice: url,
          user:  localStorage.getItem("username") || "Anonymous",
          time:  Date.now()
        });
        if (status) status.textContent = "Voice sent ✔";
        setTimeout(() => { if (status) status.textContent = ""; }, 2500);
      } catch (err) {
        console.error(err);
        if (status) status.textContent = "Upload failed ❌";
      }
    };
  }

  /* ─────────────────────────────────────────────────────────────
     AUTH FORMS
  ───────────────────────────────────────────────────────────── */
  function login() {
    const email = (el("email").value || "").trim();
    const pass  = (el("password").value || "");
    showLoginError("");
    if (!email || !pass) { showLoginError("Please enter email and password."); return; }
    auth.signInWithEmailAndPassword(email, pass)
      .catch(err => showLoginError(friendlyAuthError(err.code)));
  }

  function register() {
    const email = (el("email").value || "").trim();
    const pass  = (el("password").value || "");
    showLoginError("");
    if (!email || !pass) { showLoginError("Please enter email and password."); return; }
    if (pass.length < 6)  { showLoginError("Password must be at least 6 characters."); return; }
    auth.createUserWithEmailAndPassword(email, pass)
      .then(() => showLoginError("✅ Account created! You can now login."))
      .catch(err => showLoginError(friendlyAuthError(err.code)));
  }

  function resetPassword() {
    const email = (el("email").value || "").trim();
    showLoginError("");
    if (!email) { showLoginError("Enter your email address first 📧"); return; }
    auth.sendPasswordResetEmail(email)
      .then(() => showLoginError("✅ Reset email sent to " + email))
      .catch(err => showLoginError(friendlyAuthError(err.code)));
  }

  function logout() {
    detachListeners();
    stopHearts();
    stopCounter();
    chatListenersAttached = false;
    localStorage.removeItem("username");
    auth.signOut();
  }

  function togglePassword() {
    const inp = el("password");
    const btn = el("eyeBtn");
    if (!inp || !btn) return;
    inp.type        = inp.type === "password" ? "text" : "password";
    btn.textContent = inp.type === "password" ? "👁️" : "🙈";
  }

  function friendlyAuthError(code) {
    const map = {
      "auth/user-not-found":       "No account found with that email.",
      "auth/wrong-password":       "Incorrect password. Try again.",
      "auth/invalid-email":        "That doesn't look like a valid email.",
      "auth/email-already-in-use": "An account with that email already exists.",
      "auth/weak-password":        "Password must be at least 6 characters.",
      "auth/too-many-requests":    "Too many attempts. Please wait a moment.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/invalid-credential":   "Invalid email or password."
    };
    return map[code] || "Something went wrong. Please try again.";
  }

  // Allow Enter key to submit login
  document.addEventListener("DOMContentLoaded", () => {
    ["email", "password"].forEach(id => {
      const inp = el(id);
      if (inp) inp.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); login(); }
      });
    });

    // Close modals on backdrop click
    document.addEventListener("click", e => {
      if (e.target === el("profileModal")) closeProfileModal();
      if (e.target === el("adminPanel"))   closeAdminPanel();
      if (e.target === el("popup"))        closePopup();
      if (e.target === el("lightbox"))     closeLightbox();
    });

    // Keyboard close for lightbox
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        closeLightbox();
        closeProfileModal();
        closeAdminPanel();
        closePopup();
      }
    });
  });

  /* ─────────────────────────────────────────────────────────────
     ADMIN PANEL
  ───────────────────────────────────────────────────────────── */
  function openAdminPanel() {
    if (!isAdmin) return;
    const panel = el("adminPanel");
    if (!panel) return;
    panel.style.display = "flex";
    const badge = el("adminEmail");
    if (badge) badge.textContent = currentUser.email;
    loadAdminUsers();
    loadAdminMsgCount();
  }

  function closeAdminPanel() {
    const panel = el("adminPanel");
    if (panel) panel.style.display = "none";
  }

  function switchAdminTab(tab, btn) {
    document.querySelectorAll(".admin-tab-content").forEach(t => t.style.display = "none");
    document.querySelectorAll(".admin-tab").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    const content = el("adminTab-" + tab);
    if (content) content.style.display = "block";
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    if (tab === "users") loadAdminUsers();
    if (tab === "chats") loadAdminMsgCount();
  }

  function loadAdminUsers() {
    const list = el("adminUserList");
    if (!list) return;
    list.innerHTML = '<p class="admin-loading">Loading…</p>';

    Promise.all([
      db.ref("settings/blockedUsers").once("value"),
      db.ref("settings/chatGranted").once("value"),
      db.ref("settings/bannedEmails").once("value"),
      db.ref("users").once("value"),
      db.ref("status").once("value")
    ]).then(([blockedSnap, grantedSnap, bannedSnap, usersSnap, statusSnap]) => {
      const blocked  = blockedSnap.val()  || {};
      const granted  = grantedSnap.val()  || {};
      const banned   = bannedSnap.val()   || {};
      const users    = usersSnap.val()    || {};
      const statuses = statusSnap.val()   || {};

      if (!Object.keys(users).length) {
        list.innerHTML = '<p class="admin-loading">No users found.</p>';
        return;
      }

      list.innerHTML = "";
      Object.entries(users).forEach(([uid, user]) => {
        const eKey        = user.email ? sanitizeKey(user.email) : null;
        const online      = eKey && statuses[eKey] && statuses[eKey].online;
        const lastSeen    = eKey && statuses[eKey] ? new Date(statuses[eKey].lastSeen).toLocaleTimeString() : "Unknown";
        const isBlocked   = !!blocked[uid];
        const isGranted   = !!granted[uid];
        const isBanned    = eKey ? !!banned[eKey] : false;
        const isAdminUser = user.email === ADMIN_EMAIL;

        const card = document.createElement("div");
        card.className = "admin-user-card";

        // Sanitize to avoid XSS in admin-generated HTML
        const safeName  = (user.name  || "Unnamed").replace(/</g, "&lt;");
        const safeEmail = (user.email || uid).replace(/</g, "&lt;");
        const safePhoto = (user.photo || "images/icon.png").replace(/"/g, "");

        card.innerHTML = `
          <img src="${safePhoto}" alt="${safeName} photo" onerror="this.src='images/icon.png'">
          <div class="admin-user-info">
            <strong>${safeName}</strong>
            <span>${safeEmail}</span>
            <span style="color:${isBanned ? "#ff7070" : online ? "#4caf50" : "var(--muted)"}">
              ${isBanned ? "🚫 Banned" : online ? "🟢 Online" : "⚫ " + lastSeen}
            </span>
          </div>
          ${isAdminUser
            ? '<span class="admin-badge">👑 Admin</span>'
            : `<div class="admin-user-actions">
                 <button class="admin-user-toggle ${isGranted ? "unblock" : "block"}"
                   data-action="grant" data-uid="${uid}" data-granted="${isGranted}">
                   ${isGranted ? "💬 Revoke" : "✅ Grant Chat"}
                 </button>
                 <button class="admin-user-toggle ${isBlocked ? "unblock" : "block"}"
                   data-action="block" data-uid="${uid}" data-blocked="${isBlocked}">
                   ${isBlocked ? "🔓 Unblock" : "🚫 Block"}
                 </button>
                 <button class="admin-user-toggle ${isBanned ? "unblock" : "block"}"
                   data-action="ban" data-uid="${uid}" data-email="${safeEmail}" data-name="${safeName}" data-banned="${isBanned}">
                   ${isBanned ? "✅ Unban" : "⛔ Ban Email"}
                 </button>
                 <button class="admin-user-toggle block"
                   data-action="remove" data-uid="${uid}" data-name="${safeName}">
                   🗑️ Remove
                 </button>
               </div>`
          }`;

        // Attach event listeners via data attributes (no inline onclick with user data)
        card.querySelectorAll("[data-action]").forEach(btn => {
          btn.addEventListener("click", handleAdminUserAction);
        });

        list.appendChild(card);
      });
    }).catch(err => {
      list.innerHTML = `<p class="admin-loading" style="color:#ff6b6b">❌ ${err.message}</p>`;
    });
  }

  function handleAdminUserAction(e) {
    const btn     = e.currentTarget;
    const action  = btn.dataset.action;
    const uid     = btn.dataset.uid;
    const email   = btn.dataset.email;
    const name    = btn.dataset.name;
    const granted = btn.dataset.granted === "true";
    const blocked = btn.dataset.blocked === "true";
    const banned  = btn.dataset.banned  === "true";

    if (action === "grant") toggleChatGrant(uid, granted);
    if (action === "block") toggleBlock(uid, blocked);
    if (action === "ban")   banned ? unbanEmail(email) : banEmail(email, name);
    if (action === "remove") removeUser(uid, name);
  }

  function toggleChatGrant(uid, currently) {
    if (!isAdmin) return;
    const ref = db.ref("settings/chatGranted/" + uid);
    (currently ? ref.remove() : ref.set(true))
      .then(() => loadAdminUsers())
      .catch(err => window.alert(err.message));
  }

  function toggleBlock(uid, currently) {
    if (!isAdmin) return;
    const ref = db.ref("settings/blockedUsers/" + uid);
    (currently ? ref.remove() : ref.set(true))
      .then(() => loadAdminUsers())
      .catch(err => window.alert(err.message));
  }

  function removeUser(uid, name) {
    if (!isAdmin) return;
    if (!window.confirm(`Remove "${name}"? They lose profile data but can still log in.`)) return;
    Promise.all([
      db.ref("users/" + uid).remove(),
      db.ref("settings/chatGranted/" + uid).remove(),
      db.ref("settings/blockedUsers/" + uid).set(true)
    ]).then(() => { window.alert("User removed ✔"); loadAdminUsers(); })
      .catch(err => window.alert(err.message));
  }

  function banEmail(email, name) {
    if (!isAdmin) return;
    if (!window.confirm(`Ban "${name}" (${email})? They will be signed out.`)) return;
    db.ref("settings/bannedEmails/" + sanitizeKey(email)).set(true)
      .then(() => { window.alert("Email banned ✔"); loadAdminUsers(); })
      .catch(err => window.alert(err.message));
  }

  function unbanEmail(email) {
    if (!isAdmin) return;
    db.ref("settings/bannedEmails/" + sanitizeKey(email)).remove()
      .then(() => loadAdminUsers())
      .catch(err => window.alert(err.message));
  }

  function loadAdminMsgCount() {
    const stat = el("adminMsgCount");
    if (!stat) return;
    db.ref("messages").once("value")
      .then(snap => { stat.textContent = "📨 Total messages: " + snap.numChildren(); })
      .catch(() => { stat.textContent = "Could not load count."; });
  }

  function adminDeleteChats() {
    if (!isAdmin) return;
    if (!window.confirm("Delete ALL messages permanently?")) return;
    db.ref("messages").remove()
      .then(() => { window.alert("All messages deleted ✔"); loadAdminMsgCount(); })
      .catch(err => window.alert(err.message));
  }

  function toggleSetting(key, val) {
    if (!isAdmin) return;
    db.ref("settings/" + key).set(val)
      .catch(err => console.error("Setting update failed:", err));
  }

  /* ─────────────────────────────────────────────────────────────
     LOVE GAME
  ───────────────────────────────────────────────────────────── */
  function initGame() {
    luckyBox = Math.floor(Math.random() * 6);
  }
  initGame();

  function checkHeart(boxEl) {
    const boxes = Array.from(document.querySelectorAll("#level1 .box"));
    const i     = boxes.indexOf(boxEl);
    if (i === luckyBox) {
      boxEl.textContent = "💖";
      setTimeout(() => {
        window.alert("You found my heart ❤️");
        el("level1").style.display = "none";
        el("level2").style.display = "block";
      }, 200);
    } else {
      boxEl.textContent = "💔";
      boxEl.style.pointerEvents = "none";
    }
  }

  function startQuiz() {
    const ans = window.prompt("Where did we first meet?");
    if (ans && ans.trim().toLowerCase() === "school") {
      window.alert("Correct ❤️");
      el("level2").style.display = "none";
      el("level3").style.display = "block";
      buildMemoryGame();
    } else {
      window.alert("Hmm, try again 💕");
    }
  }

  let flipped   = [];
  let matched   = 0;
  let lockBoard = false;

  function buildMemoryGame() {
    const grid = el("memoryGrid");
    if (!grid) return;
    const shuffled = [...CARD_PAIRS].sort(() => Math.random() - 0.5);
    grid.innerHTML = "";
    matched = 0; flipped = []; lockBoard = false;
    shuffled.forEach(emoji => {
      const b         = document.createElement("div");
      b.className     = "box";
      b.dataset.value = emoji;
      b.textContent   = "💌";
      b.setAttribute("role", "button");
      b.setAttribute("tabindex", "0");
      b.addEventListener("click", () => flipCard(b));
      b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") flipCard(b); });
      grid.appendChild(b);
    });
  }

  function flipCard(b) {
    if (lockBoard || b.classList.contains("matched") || flipped.includes(b)) return;
    b.textContent = b.dataset.value;
    flipped.push(b);
    if (flipped.length === 2) {
      lockBoard = true;
      if (flipped[0].dataset.value === flipped[1].dataset.value) {
        flipped.forEach(c => c.classList.add("matched"));
        matched++;
        flipped    = [];
        lockBoard  = false;
        if (matched === CARD_PAIRS.length / 2) {
          setTimeout(() => {
            el("level3").style.display    = "none";
            el("gameFinal").style.display = "block";
          }, 500);
        }
      } else {
        setTimeout(() => {
          flipped.forEach(c => c.textContent = "💌");
          flipped   = [];
          lockBoard = false;
        }, 900);
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     PWA
  ───────────────────────────────────────────────────────────── */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js")
        .catch(err => console.warn("SW registration failed:", err));
    }
  }

  function initInstallPrompt() {
    // Create install button
    const btn = document.createElement("button");
    btn.id          = "installBtn";
    btn.textContent = "📲 Install";
    btn.setAttribute("aria-label", "Install this app");
    document.body.appendChild(btn);

    // Hide if already running as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      btn.style.display = "none";
      return;
    }

    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
    });

    window.addEventListener("appinstalled", () => {
      btn.style.display = "none";
      deferredPrompt    = null;
    });

    btn.addEventListener("click", () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt    = null;
          btn.style.display = "none";
        });
      } else {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isIOS) {
          window.alert("To install on iPhone/iPad:\n\n1. Tap the Share button (□↑)\n2. Tap \"Add to Home Screen\"\n3. Tap \"Add\"");
        } else {
          window.alert("To install:\n\n1. Tap the ⋮ menu in Chrome\n2. Tap \"Add to Home screen\"\n3. Tap \"Add\"");
        }
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────────────────────── */
  return {
    // auth
    login,
    register,
    resetPassword,
    logout,
    togglePassword,
    // navigation
    showSection,
    // ui
    showPopup,
    closePopup,
    toggleMusic,
    rateSite,
    // lightbox
    openLightbox,
    closeLightbox,
    nextImage,
    prevImage,
    // profile
    handleProfileTap,
    openProfileModal,
    closeProfileModal,
    changeUsername,
    changePhoto,
    // chat
    sendMessage,
    // admin
    openAdminPanel,
    closeAdminPanel,
    switchAdminTab,
    adminDeleteChats,
    toggleSetting,
    // game
    checkHeart,
    startQuiz,
  };
})();
