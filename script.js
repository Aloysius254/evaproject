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
const PAGES       = ["home","story","memories","game"];

/* =============================================================
   HELPERS
   ============================================================= */
const el = id => document.getElementById(id);

/** Make a string safe as a Firebase key (no . # $ [ ] ) */
const dbKey = s => (s || "").replace(/[.#$[\]]/g, "-");

/** Show / hide the login error banner */
function setLoginError(msg) {
  const div = el("loginError");
  if (!div) return;
  div.textContent   = msg || "";
  div.style.display = msg ? "block" : "none";
}

/** Human-friendly Firebase Auth error messages */
function authMsg(code) {
  return ({
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Wrong password. Try again.",
    "auth/invalid-credential":    "Wrong email or password.",
    "auth/invalid-email":         "That email address isn't valid.",
    "auth/email-already-in-use":  "An account already exists with that email.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/too-many-requests":     "Too many attempts — wait a moment then try again.",
    "auth/network-request-failed":"Network error. Check your connection.",
  })[code] || "Something went wrong. Please try again.";
}

/* =============================================================
   ENCRYPTION  (messages stored encrypted in Firebase)
   ============================================================= */
const encrypt = t => CryptoJS.AES.encrypt(t, SECRET_KEY).toString();
const decrypt = c => {
  try {
    const b = CryptoJS.AES.decrypt(c, SECRET_KEY).toString(CryptoJS.enc.Utf8);
    return b || c;
  } catch { return c; }
};

/* =============================================================
   APP  — everything lives inside this IIFE so there are
          no accidental globals and no "already defined" crashes
   ============================================================= */
const App = (() => {

  /* ── private state ───────────────────────────────────────── */
  let currentUser   = null;
  let isAdmin       = false;
  let heartsEnabled = true;
  let heartsTimer   = null;
  let counterTimer  = null;
  let lightboxIdx   = 0;
  let luckyBox      = Math.floor(Math.random() * 6);
  let tapCount      = 0, tapTimer = null;
  let deferredPWA   = null;

  // voice recording
  let recorder    = null;
  let audioChunks = [];

  // chat input listeners attached flag
  let chatListenersReady = false;

  // Firebase realtime listener refs — detach on logout
  const liveRefs = [];
  function track(ref, event, cb) {
    ref.on(event, cb);
    liveRefs.push({ ref, event, cb });
  }
  function detachAll() {
    liveRefs.forEach(({ ref, event, cb }) => ref.off(event, cb));
    liveRefs.length = 0;
  }

  /* ================================================================
     AUTH
  ================================================================ */

  /**
   * FIX: Use SESSION persistence so Firebase does NOT restore the
   * login after the browser/tab is closed on mobile.
   * This eliminates the "auto-login on phone" issue.
   */
  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
      // Only AFTER persistence is set do we listen for auth changes
      auth.onAuthStateChanged(handleAuthChange);
    })
    .catch(err => {
      // Fallback: even if setPersistence fails, still listen
      console.warn("setPersistence failed:", err.message);
      auth.onAuthStateChanged(handleAuthChange);
    });

  function handleAuthChange(user) {
    if (!user) {
      currentUser = null;
      isAdmin     = false;
      showLoginScreen();
      detachAll();
      stopHearts();
      stopCounter();
      chatListenersReady = false;
      return;
    }

    // Check ban BEFORE showing the app
    const key = dbKey(user.email);
    db.ref("settings/bannedEmails/" + key).once("value")
      .then(snap => {
        if (snap.val() === true && user.email !== ADMIN_EMAIL) {
          auth.signOut();
          setLoginError("❌ Your account has been banned from this site.");
          return;
        }
        currentUser = user;
        isAdmin     = user.email === ADMIN_EMAIL;
        showApp();
        onLogin();
      })
      .catch(err => {
        // DB read failed (rules?) — still let the user in,
        // ban check will re-run on next load
        console.warn("Ban check failed:", err.message);
        currentUser = user;
        isAdmin     = user.email === ADMIN_EMAIL;
        showApp();
        onLogin();
      });
  }

  function showApp() {
    el("loginScreen").style.display = "none";
    el("app").style.display         = "block";
    setLoginError("");
  }
  function showLoginScreen() {
    el("loginScreen").style.display = "flex";
    el("app").style.display         = "none";
  }

  function onLogin() {
    // Load / create user profile
    db.ref("users/" + currentUser.uid).once("value")
      .then(snap => {
        const data = snap.val() || {};
        let name   = data.name || localStorage.getItem("username");

        if (!name || name === "Anonymous") {
          // Ask only once; default to first part of email if cancelled
          const asked = window.prompt("What's your display name? ❤️",
            currentUser.email.split("@")[0]);
          name = (asked || "").trim() || currentUser.email.split("@")[0];
        }

        localStorage.setItem("username", name);
        db.ref("users/" + currentUser.uid)
          .update({ name, email: currentUser.email })
          .catch(() => {}); // silent — rules may not allow this yet

        const dn = el("displayName");
        if (dn) dn.textContent = name;

        if (data.photo) {
          const pp = el("profilePhoto");
          if (pp) pp.src = data.photo;
        }
      })
      .catch(err => console.warn("Profile load failed:", err.message));

    setOnline();
    attachSettingsListeners();

    if (isAdmin) {
      openChatSection();
      loadMessages();
    } else {
      attachChatGrantListener();
      attachBlockListener();
    }

    startHearts();
    startCounter();
    attachOnlineStatusListener();
    initSwipe();
    registerSW();
    initInstallBtn();

    const saved = localStorage.getItem("currentPage") || "home";
    showSection(PAGES.includes(saved) ? saved : "home");
  }

  /* ================================================================
     PRESENCE
  ================================================================ */
  function setOnline() {
    if (!currentUser?.email) return;
    const ref = db.ref("status/" + dbKey(currentUser.email));
    ref.set({ online: true, lastSeen: Date.now() }).catch(() => {});
    ref.onDisconnect().set({ online: false, lastSeen: Date.now() });
  }

  /* ================================================================
     SETTINGS LISTENERS
  ================================================================ */
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
      const granted = snap.val() === true;
      const cs      = el("chatSection");
      const cp      = el("chatPending");
      if (cs) cs.style.display = granted ? "block" : "none";
      if (cp) cp.style.display = granted ? "none"  : "block";
      if (granted) { loadMessages(); }
    });
  }

  function attachBlockListener() {
    track(db.ref("settings/blockedUsers/" + currentUser.uid), "value", snap => {
      const blocked = snap.val() === true;
      const inp  = el("chatInput");
      const send = document.querySelector(".chat-input button");
      const rec  = el("recordBtn");
      const msg  = el("chatBlockedMsg");
      if (inp)  inp.disabled  = blocked;
      if (send) send.disabled = blocked;
      if (rec)  rec.disabled  = blocked;
      if (msg)  msg.style.display = blocked ? "block" : "none";
    });
  }

  function attachOnlineStatusListener() {
    track(db.ref("status"), "value", snap => {
      const data     = snap.val() || {};
      const meKey    = dbKey(currentUser?.email || "");
      const statusEl = el("userStatus");
      if (!statusEl) return;
      for (const k of Object.keys(data)) {
        if (k !== meKey) {
          const s = data[k];
          statusEl.textContent = s.online
            ? "🟢 Online"
            : "⚫ Last seen " + new Date(s.lastSeen).toLocaleTimeString();
          return;
        }
      }
      statusEl.textContent = "";
    });
  }

  function openChatSection() {
    const cs = el("chatSection");
    const cp = el("chatPending");
    if (cs) cs.style.display = "block";
    if (cp) cp.style.display = "none";
  }

  /* ================================================================
     SECTION SWITCHING
  ================================================================ */
  function showSection(id) {
    if (!PAGES.includes(id)) id = "home";
    document.querySelectorAll("#app > section").forEach(s => {
      if (s.id !== "site-rating") s.style.display = "none";
    });
    const t = el(id);
    if (t) t.style.display = "block";

    document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
    const lnk = el("nav-" + id);
    if (lnk) lnk.classList.add("active");

    const rating = el("site-rating");
    if (rating) {
      rating.style.display = (window.innerWidth <= 768 && id !== "home") ? "none" : "block";
    }
    localStorage.setItem("currentPage", id);
  }

  function initSwipe() {
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
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 80) return;
      const cur = PAGES.find(id => {
        const s = el(id); return s && s.style.display !== "none";
      }) || "home";
      const i = PAGES.indexOf(cur);
      if (dx > 0 && i < PAGES.length - 1) showSection(PAGES[i + 1]);
      if (dx < 0 && i > 0)                showSection(PAGES[i - 1]);
    }, { passive: true });
  }

  /* ================================================================
     COUNTER
  ================================================================ */
  function startCounter() {
    updateCounter();
    counterTimer = setInterval(updateCounter, 1000);
  }
  function stopCounter() { clearInterval(counterTimer); counterTimer = null; }
  function updateCounter() {
    const c = el("counter");
    if (!c) return;
    const diff = Date.now() - START_DATE.getTime();
    if (diff < 0) { c.textContent = "Our love story begins soon 💕"; return; }
    const d  = Math.floor(diff / 86400000);
    const h  = Math.floor((diff % 86400000) / 3600000);
    const m  = Math.floor((diff % 3600000)  / 60000);
    const s  = Math.floor((diff % 60000)    / 1000);
    c.textContent = `We have loved each other for ${d}d ${h}h ${m}m ${s}s ❤️`;
  }

  /* ================================================================
     MUSIC
  ================================================================ */
  function toggleMusic() {
    const m   = el("bgMusic");
    const btn = el("musicBtn");
    if (!m || !btn) return;
    if (m.paused) { m.play().catch(()=>{}); btn.textContent = "🎵 Pause Music"; }
    else          { m.pause();              btn.textContent = "🎵 Play Music";  }
  }

  /* ================================================================
     POPUP
  ================================================================ */
  function showPopup()  { const p = el("popup"); if (p) p.style.display = "flex"; }
  function closePopup() { const p = el("popup"); if (p) p.style.display = "none"; }

  /* ================================================================
     FLOATING HEARTS
  ================================================================ */
  function startHearts() {
    if (heartsTimer) return;
    heartsTimer = setInterval(() => {
      if (!heartsEnabled) return;
      const h = document.createElement("div");
      h.className   = "heart";
      h.textContent = "❤️";
      h.style.left     = Math.random() * 100 + "vw";
      h.style.fontSize = (13 + Math.random() * 20) + "px";
      h.setAttribute("aria-hidden","true");
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 6000);
    }, 700);
  }
  function stopHearts() {
    clearInterval(heartsTimer);
    heartsTimer = null;
    document.querySelectorAll(".heart").forEach(h => h.remove());
  }

  /* ================================================================
     RATING
  ================================================================ */
  function rateSite(n) {
    document.querySelectorAll(".rating-stars span")
      .forEach((s, i) => s.classList.toggle("active", i < n));
    const msgs = ["","💔 We can do better","😊 Getting stronger","❤️ Beautiful love","💖 Almost perfect","💞 Perfect love"];
    const r = el("ratingResult");
    if (r) r.textContent = msgs[n] || "";
    localStorage.setItem("loveRating", n);
  }

  /* ================================================================
     LIGHTBOX
  ================================================================ */
  function openLightbox(img) {
    const box = el("lightbox");
    const lbi = el("lightbox-img");
    if (!box || !lbi) return;
    const all = Array.from(document.querySelectorAll(".gallery img"));
    lightboxIdx  = all.indexOf(img);
    lbi.src = img.src; lbi.alt = img.alt;
    box.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    const box = el("lightbox");
    if (box) box.style.display = "none";
    document.body.style.overflow = "";
  }
  function nextImage() { moveLight(1);  }
  function prevImage() { moveLight(-1); }
  function moveLight(dir) {
    const all = document.querySelectorAll(".gallery img");
    if (!all.length) return;
    lightboxIdx = (lightboxIdx + dir + all.length) % all.length;
    const lbi = el("lightbox-img");
    if (lbi) { lbi.src = all[lightboxIdx].src; lbi.alt = all[lightboxIdx].alt; }
  }

  /* ================================================================
     PROFILE
  ================================================================ */
  function handleProfileTap() {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      if (tapCount >= 3 && isAdmin) openAdminPanel();
      else openProfileModal();
      tapCount = 0;
    }, 400);
  }
  function openProfileModal() {
    const m = el("profileModal");
    if (!m) return;
    const pp = el("profilePhoto");
    const dn = el("displayName");
    const mp = el("profileModalPhoto");
    const mn = el("profileModalName");
    if (mp && pp) mp.src = pp.src;
    if (mn && dn) mn.textContent = dn.textContent;
    m.style.display = "flex";
  }
  function closeProfileModal() { const m = el("profileModal"); if (m) m.style.display = "none"; }

  function changeUsername() {
    if (!currentUser) return;
    const n = window.prompt("New display name ❤️");
    if (!n || !n.trim()) return;
    const name = n.trim();
    localStorage.setItem("username", name);
    db.ref("users/" + currentUser.uid).update({ name })
      .catch(err => console.warn("Name update:", err.message));
    const dn = el("displayName");
    if (dn) dn.textContent = name;
  }

  function changePhoto() {
    if (!currentUser) return;
    const fi = el("photoInput");
    if (!fi) return;
    fi.click();
    fi.onchange = async () => {
      const file = fi.files[0];
      if (!file) return;
      const st = el("recordStatus");
      if (st) st.textContent = "Uploading…";
      try {
        const ref = storage.ref("photos/" + currentUser.uid + ".jpg");
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.ref("users/" + currentUser.uid).update({ photo: url });
        [el("profilePhoto"), el("profileModalPhoto")]
          .forEach(p => { if (p) p.src = url; });
        if (st) st.textContent = "Photo updated ✔";
        setTimeout(() => { if (st) st.textContent = ""; }, 2500);
      } catch (err) {
        if (st) st.textContent = "Upload failed ❌";
        console.error(err);
      }
      fi.value = "";
    };
  }

  /* ================================================================
     CHAT
  ================================================================ */
  function loadMessages() {
    const box = el("chatBox");
    if (!box) return;

    track(db.ref("messages"), "value", snap => {
      box.innerHTML = "";
      const me = localStorage.getItem("username") || "";
      snap.forEach(child => {
        const msg = child.val();
        const key = child.key;
        const wrap = document.createElement("div");
        wrap.className = "msg " + (msg.user === me ? "sent" : "received");

        const name = document.createElement("small");
        name.className   = "msg-name";
        name.textContent = msg.user || "?";
        wrap.appendChild(name);

        if (msg.voice) {
          const a = document.createElement("audio");
          a.controls = true; a.src = msg.voice;
          wrap.appendChild(a);
        } else if (msg.text) {
          const sp = document.createElement("span");
          sp.textContent = decrypt(msg.text);
          wrap.appendChild(sp);
        }

        if (msg.user === me) {
          const tk = document.createElement("small");
          tk.className   = "msg-tick";
          tk.textContent = msg.seen ? "✔✔" : "✔";
          wrap.appendChild(tk);
        }
        if (msg.user !== me && !msg.seen) {
          db.ref("messages/" + key).update({ seen: true }).catch(() => {});
        }
        box.appendChild(wrap);
      });
      box.scrollTop = box.scrollHeight;
    });

    attachChatListeners();
  }

  function attachChatListeners() {
    if (chatListenersReady) return;
    chatListenersReady = true;

    const inp = el("chatInput");
    const rec = el("recordBtn");

    if (inp) {
      inp.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
      inp.addEventListener("input", () => {
        const u = localStorage.getItem("username") || "Someone";
        db.ref("typing").set({ user: u, typing: true }).catch(() => {});
        clearTimeout(inp._tt);
        inp._tt = setTimeout(() => db.ref("typing").set({ user: u, typing: false }).catch(() => {}), 1500);
      });
    }

    track(db.ref("typing"), "value", snap => {
      const d  = snap.val();
      const me = localStorage.getItem("username") || "";
      const ts = el("typingStatus");
      if (ts) ts.textContent = (d?.typing && d.user !== me) ? d.user + " is typing…" : "";
    });

    if (rec) {
      rec.addEventListener("mousedown",  startRec);
      rec.addEventListener("mouseup",    stopRec);
      rec.addEventListener("touchstart", e => { e.preventDefault(); startRec();  }, { passive: false });
      rec.addEventListener("touchend",   e => { e.preventDefault(); stopRec();   }, { passive: false });
    }
  }

  function sendMessage() {
    if (!currentUser) return;
    const inp = el("chatInput");
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    if (inp.disabled) { window.alert("You are restricted from chatting 🚫"); return; }
    db.ref("messages").push({
      text: encrypt(text),
      user: localStorage.getItem("username") || "Anonymous",
      time: Date.now(),
      seen: false
    }).catch(err => window.alert("Could not send: " + err.message));
    inp.value = "";
  }

  /* ================================================================
     VOICE RECORDING
  ================================================================ */
  function startRec() {
    if (!currentUser) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioChunks = [];
      recorder = new MediaRecorder(stream);
      recorder.start();
      recorder.ondataavailable = e => audioChunks.push(e.data);
      const rec = el("recordBtn");
      const st  = el("recordStatus");
      if (rec) { rec.style.background = "#c62828"; rec.textContent = "🔴 Recording…"; }
      if (st)  st.textContent = "Release to send";
    }).catch(() => window.alert("Microphone access denied ❌"));
  }
  function stopRec() {
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    const rec = el("recordBtn");
    const st  = el("recordStatus");
    if (rec) { rec.style.background = ""; rec.textContent = "🎤 Hold to Record"; }
    if (st)  st.textContent = "Uploading…";
    recorder.onstop = async () => {
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
        if (st) st.textContent = "Voice sent ✔";
        setTimeout(() => { if (st) st.textContent = ""; }, 2500);
      } catch (err) {
        if (st) st.textContent = "Upload failed ❌";
        console.error(err);
      }
    };
  }

  /* ================================================================
     AUTH FORMS
  ================================================================ */
  function login() {
    const email = (el("email")?.value || "").trim();
    const pass  =  el("password")?.value || "";
    setLoginError("");
    if (!email || !pass) { setLoginError("Please enter your email and password."); return; }
    auth.signInWithEmailAndPassword(email, pass)
      .catch(err => setLoginError(authMsg(err.code)));
  }

  function register() {
    const email = (el("email")?.value || "").trim();
    const pass  =  el("password")?.value || "";
    setLoginError("");
    if (!email || !pass) { setLoginError("Please enter your email and password."); return; }
    if (pass.length < 6)  { setLoginError("Password must be at least 6 characters."); return; }
    auth.createUserWithEmailAndPassword(email, pass)
      .then(() => setLoginError("✅ Account created! Logging you in…"))
      .catch(err => setLoginError(authMsg(err.code)));
  }

  function resetPassword() {
    const email = (el("email")?.value || "").trim();
    setLoginError("");
    if (!email) { setLoginError("Enter your email address first."); return; }
    auth.sendPasswordResetEmail(email)
      .then(() => setLoginError("✅ Reset email sent to " + email))
      .catch(err => setLoginError(authMsg(err.code)));
  }

  function logout() {
    detachAll();
    stopHearts();
    stopCounter();
    chatListenersReady = false;
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

  /* ================================================================
     ADMIN PANEL
  ================================================================ */
  function openAdminPanel() {
    if (!isAdmin) return;
    const p = el("adminPanel");
    if (!p) return;
    p.style.display = "flex";
    const badge = el("adminEmail");
    if (badge) badge.textContent = currentUser.email;
    loadAdminUsers();
    loadAdminMsgCount();
  }
  function closeAdminPanel() { const p = el("adminPanel"); if (p) p.style.display = "none"; }

  function switchAdminTab(tab, btn) {
    document.querySelectorAll(".admin-tab-content").forEach(t => t.style.display = "none");
    document.querySelectorAll(".admin-tab").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-selected","false");
    });
    const c = el("adminTab-" + tab);
    if (c) c.style.display = "block";
    btn.classList.add("active");
    btn.setAttribute("aria-selected","true");
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
    ]).then(([blk, gnt, ban, usr, sts]) => {
      const blocked  = blk.val() || {};
      const granted  = gnt.val() || {};
      const banned   = ban.val() || {};
      const users    = usr.val() || {};
      const statuses = sts.val() || {};

      if (!Object.keys(users).length) {
        list.innerHTML = '<p class="admin-loading">No users registered yet.</p>';
        return;
      }

      list.innerHTML = "";
      Object.entries(users).forEach(([uid, user]) => {
        const eKey    = user.email ? dbKey(user.email) : null;
        const online  = !!(eKey && statuses[eKey]?.online);
        const lastSeen = eKey && statuses[eKey]
          ? new Date(statuses[eKey].lastSeen).toLocaleTimeString()
          : "Unknown";
        const isBlocked   = !!blocked[uid];
        const isGranted   = !!granted[uid];
        const isBanned    = eKey ? !!banned[eKey] : false;
        const isAdminUser = user.email === ADMIN_EMAIL;

        const safeName  = (user.name  || "Unnamed").replace(/</g,"&lt;");
        const safeEmail = (user.email || uid).replace(/</g,"&lt;");
        const safePhoto = (user.photo || "images/icon.png").replace(/"/g,"");

        const card = document.createElement("div");
        card.className = "admin-user-card";
        card.innerHTML = `
          <img src="${safePhoto}" alt="" onerror="this.src='images/icon.png'">
          <div class="admin-user-info">
            <strong>${safeName}</strong>
            <span>${safeEmail}</span>
            <span style="color:${isBanned?"#ff7070":online?"#4caf50":"var(--muted)"}">
              ${isBanned ? "🚫 Banned" : online ? "🟢 Online" : "⚫ "+lastSeen}
            </span>
          </div>
          ${isAdminUser
            ? '<span class="admin-badge">👑 Admin</span>'
            : `<div class="admin-user-actions">
                 <button class="admin-user-toggle ${isGranted?"unblock":"block"}"
                   data-action="grant" data-uid="${uid}" data-state="${isGranted}">
                   ${isGranted ? "💬 Revoke" : "✅ Grant Chat"}
                 </button>
                 <button class="admin-user-toggle ${isBlocked?"unblock":"block"}"
                   data-action="block" data-uid="${uid}" data-state="${isBlocked}">
                   ${isBlocked ? "🔓 Unblock" : "🚫 Block"}
                 </button>
                 <button class="admin-user-toggle ${isBanned?"unblock":"block"}"
                   data-action="ban" data-uid="${uid}" data-email="${safeEmail}"
                   data-name="${safeName}" data-state="${isBanned}">
                   ${isBanned ? "✅ Unban" : "⛔ Ban Email"}
                 </button>
                 <button class="admin-user-toggle block"
                   data-action="remove" data-uid="${uid}" data-name="${safeName}">
                   🗑️ Remove
                 </button>
               </div>`
          }`;

        // Wire actions via data attributes — no inline onclick with user-supplied strings
        card.querySelectorAll("[data-action]").forEach(btn => {
          btn.addEventListener("click", () => {
            const a     = btn.dataset.action;
            const uid_  = btn.dataset.uid;
            const state = btn.dataset.state === "true";
            if (a === "grant")  adminGrant(uid_, state);
            if (a === "block")  adminBlock(uid_, state);
            if (a === "ban")    state
              ? adminUnban(btn.dataset.email)
              : adminBan(btn.dataset.email, btn.dataset.name);
            if (a === "remove") adminRemove(uid_, btn.dataset.name);
          });
        });

        list.appendChild(card);
      });
    }).catch(err => {
      list.innerHTML = `<p class="admin-loading" style="color:#ff6b6b">
        ❌ ${err.message}<br><small>Check Firebase Database rules.</small></p>`;
    });
  }

  function adminGrant(uid, currently) {
    if (!isAdmin) return;
    const ref = db.ref("settings/chatGranted/" + uid);
    (currently ? ref.remove() : ref.set(true))
      .then(() => loadAdminUsers())
      .catch(err => window.alert("Failed: " + err.message + "\nCheck Firebase rules."));
  }
  function adminBlock(uid, currently) {
    if (!isAdmin) return;
    const ref = db.ref("settings/blockedUsers/" + uid);
    (currently ? ref.remove() : ref.set(true))
      .then(() => loadAdminUsers())
      .catch(err => window.alert("Failed: " + err.message + "\nCheck Firebase rules."));
  }
  function adminRemove(uid, name) {
    if (!isAdmin) return;
    if (!window.confirm(`Remove "${name}"? They lose profile data but can still log in.`)) return;
    Promise.all([
      db.ref("users/" + uid).remove(),
      db.ref("settings/chatGranted/" + uid).remove(),
      db.ref("settings/blockedUsers/" + uid).set(true)
    ]).then(() => { window.alert("Removed ✔"); loadAdminUsers(); })
      .catch(err => window.alert("Failed: " + err.message + "\nCheck Firebase rules."));
  }
  function adminBan(email, name) {
    if (!isAdmin) return;
    if (!window.confirm(`Ban "${name}" (${email})?`)) return;
    db.ref("settings/bannedEmails/" + dbKey(email)).set(true)
      .then(() => { window.alert("Banned ✔"); loadAdminUsers(); })
      .catch(err => window.alert("Failed: " + err.message + "\nCheck Firebase rules."));
  }
  function adminUnban(email) {
    if (!isAdmin) return;
    db.ref("settings/bannedEmails/" + dbKey(email)).remove()
      .then(() => loadAdminUsers())
      .catch(err => window.alert("Failed: " + err.message));
  }

  function loadAdminMsgCount() {
    const s = el("adminMsgCount");
    if (!s) return;
    db.ref("messages").once("value")
      .then(snap => { s.textContent = "📨 Total messages: " + snap.numChildren(); })
      .catch(() => { s.textContent = "Could not load count — check Firebase rules."; });
  }
  function adminDeleteChats() {
    if (!isAdmin) return;
    if (!window.confirm("Delete ALL messages permanently?")) return;
    db.ref("messages").remove()
      .then(() => { window.alert("Cleared ✔"); loadAdminMsgCount(); })
      .catch(err => window.alert("Failed: " + err.message + "\nCheck Firebase rules."));
  }
  function toggleSetting(key, val) {
    if (!isAdmin) return;
    db.ref("settings/" + key).set(val).catch(err => console.error(err));
  }

  /* ================================================================
     LOVE GAME
  ================================================================ */
  function checkHeart(box) {
    const boxes = Array.from(document.querySelectorAll("#level1 .box"));
    if (boxes.indexOf(box) === luckyBox) {
      box.textContent = "💖";
      setTimeout(() => {
        window.alert("You found my heart ❤️");
        el("level1").style.display = "none";
        el("level2").style.display = "block";
      }, 200);
    } else {
      box.textContent = "💔";
      box.style.pointerEvents = "none";
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
      window.alert("Hmm… try again 💕");
    }
  }

  let flipped = [], matched = 0, lockBoard = false;
  function buildMemoryGame() {
    const grid = el("memoryGrid");
    if (!grid) return;
    const shuffled = [...CARD_PAIRS].sort(() => Math.random() - 0.5);
    grid.innerHTML = ""; matched = 0; flipped = []; lockBoard = false;
    shuffled.forEach(emoji => {
      const b         = document.createElement("div");
      b.className     = "box";
      b.dataset.value = emoji;
      b.textContent   = "💌";
      b.setAttribute("role","button"); b.setAttribute("tabindex","0");
      b.addEventListener("click", () => flipCard(b));
      b.addEventListener("keydown", e => { if (e.key==="Enter"||e.key===" ") flipCard(b); });
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
        matched++; flipped = []; lockBoard = false;
        if (matched === CARD_PAIRS.length / 2) {
          setTimeout(() => {
            el("level3").style.display    = "none";
            el("gameFinal").style.display = "block";
          }, 500);
        }
      } else {
        setTimeout(() => {
          flipped.forEach(c => c.textContent = "💌");
          flipped = []; lockBoard = false;
        }, 900);
      }
    }
  }

  /* ================================================================
     PWA — Service Worker + Install Prompt
  ================================================================ */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js")
        .catch(err => console.warn("SW reg failed:", err));
    }
  }
  function initInstallBtn() {
    const btn = document.createElement("button");
    btn.id = "installBtn"; btn.textContent = "📲 Install";
    btn.setAttribute("aria-label","Install this app");
    document.body.appendChild(btn);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      btn.style.display = "none"; return;
    }
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault(); deferredPWA = e;
    });
    window.addEventListener("appinstalled", () => {
      btn.style.display = "none"; deferredPWA = null;
    });
    btn.addEventListener("click", () => {
      if (deferredPWA) {
        deferredPWA.prompt();
        deferredPWA.userChoice.then(() => { deferredPWA = null; btn.style.display = "none"; });
      } else {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        window.alert(ios
          ? "To install on iPhone/iPad:\n1. Tap the Share button (□↑)\n2. Tap \"Add to Home Screen\"\n3. Tap \"Add\""
          : "To install:\n1. Tap ⋮ menu in Chrome\n2. Tap \"Add to Home screen\"\n3. Tap \"Add\"");
      }
    });
  }

  /* ================================================================
     DOM READY — global keyboard / backdrop handlers
  ================================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    // Enter key on login form
    ["email","password"].forEach(id => {
      const inp = el(id);
      if (inp) inp.addEventListener("keydown", e => { if (e.key==="Enter") { e.preventDefault(); login(); } });
    });

    // Close any open modal on Escape
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      closeLightbox(); closeProfileModal(); closeAdminPanel(); closePopup();
    });

    // Lightbox swipe
    const lb = el("lightbox");
    if (lb) {
      let sx = 0;
      lb.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive:true });
      lb.addEventListener("touchend",   e => {
        const dx = sx - e.changedTouches[0].clientX;
        if (dx > 50) nextImage();
        if (dx < -50) prevImage();
      }, { passive:true });
    }

    // Backdrop clicks close modals
    document.addEventListener("click", e => {
      if (e.target === el("profileModal")) closeProfileModal();
      if (e.target === el("adminPanel"))   closeAdminPanel();
      if (e.target === el("popup"))        closePopup();
      if (e.target === el("lightbox"))     closeLightbox();
    });
  });

  /* ================================================================
     PUBLIC API  — these are what index.html onclick= calls
  ================================================================ */
  return {
    login, register, resetPassword, logout, togglePassword,
    showSection,
    showPopup, closePopup, toggleMusic, rateSite,
    openLightbox, closeLightbox, nextImage, prevImage,
    handleProfileTap, openProfileModal, closeProfileModal,
    changeUsername, changePhoto,
    sendMessage,
    openAdminPanel, closeAdminPanel, switchAdminTab,
    adminDeleteChats, toggleSetting,
    checkHeart, startQuiz,
  };
})();
