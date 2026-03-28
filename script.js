// ============================================================
// FIREBASE INIT
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCDjfXhTYoAqhUCTMbrOB5uiZeU7dDqgbo",
  authDomain: "aloeva-chatbot.firebaseapp.com",
  databaseURL: "https://aloeva-chatbot-default-rtdb.firebaseio.com",
  projectId: "aloeva-chatbot",
  storageBucket: "aloeva-chatbot.firebasestorage.app",
  messagingSenderId: "216931642104",
  appId: "1:216931642104:web:68522fe6c57aa79565a90d"
};
firebase.initializeApp(firebaseConfig);
const db      = firebase.database();
const auth    = firebase.auth();
const storage = firebase.storage();

// ============================================================
// CONSTANTS
// ============================================================
const ADMIN_UID    = "kaoSNHGn7vZhhsSpfeUv6w6UkCw1";
const ADMIN_EMAIL  = "aloysiusmworia@gmail.com";
const SECRET_KEY   = "aloeva123.";
const QUIZ_ANSWER  = btoa("school");
const CARD_PAIRS   = ["🌹","🌹","💋","💋","🎁","🎁","💍","💍"];

// ============================================================
// STATE
// ============================================================
let currentUser   = null;
let isAdmin       = false;
let heartsEnabled = true;
let heartsInterval = null;

// ============================================================
// AUTH — single entry point, everything flows from here
// ============================================================
auth.onAuthStateChanged(user => {
  currentUser = user;
  isAdmin     = user ? user.uid === ADMIN_UID : false;

  const loginScreen = document.getElementById("loginScreen");
  const app         = document.getElementById("app");

  if (user) {
    loginScreen.style.display = "none";
    app.style.display         = "block";
    onLogin(user);
  } else {
    loginScreen.style.display = "flex";
    app.style.display         = "none";
    stopHearts();
  }
});

function onLogin(user) {
  // always load profile from Firebase first, then check localStorage
  db.ref("users/" + user.uid).once("value", snap => {
    const data = snap.val();
    if (data && data.name) {
      localStorage.setItem("username", data.name);
    } else if (!localStorage.getItem("username")) {
      const name = prompt("Enter your display name ❤️") || "Anonymous";
      localStorage.setItem("username", name);
      db.ref("users/" + user.uid).set({ name, email: user.email });
    }
    // always keep email updated
    db.ref("users/" + user.uid).update({ email: user.email });

    // update display name in UI
    const nameEl = el("displayName");
    if (nameEl) nameEl.textContent = localStorage.getItem("username");

    // load photo
    if (data && data.photo) {
      const p = el("profilePhoto");
      if (p) p.src = data.photo;
    }
  });

  setOnline();
  startHearts();
  initSettingsListeners();
  initApp();

  if (isAdmin) {
    hideAdminUI(); // hide first, showAdminUI called after section renders
  } else {
    hideAdminUI();
    listenChatGrant(user.uid);
    listenBlockStatus(user.uid);
  }
}

// ============================================================
// ADMIN UI — show/hide gear and unlock everything
// ============================================================
function showAdminUI() {
  const cs = el("chatSection");
  const cp = el("chatPending");
  const cl = el("chatLock");
  const ml = el("memoriesLock");
  if (cs) cs.style.display = "block";
  if (cp) cp.style.display = "none";
  if (cl) cl.style.display = "none";
  if (ml) ml.style.display = "none";
  loadMessages();
}

function hideAdminUI() { /* no button to hide */ }

// ============================================================
// CHAT GRANT — per user
// ============================================================
function listenChatGrant(uid) {
  db.ref("settings/chatGranted/" + uid).on("value", snap => {
    const granted = snap.val() === true;
    el("chatSection").style.display = granted ? "block" : "none";
    el("chatPending").style.display = granted ? "none"  : "block";
    if (granted) loadMessages();
  });
}

// ============================================================
// BLOCK STATUS — per user
// ============================================================
function listenBlockStatus(uid) {
  db.ref("settings/blockedUsers/" + uid).on("value", snap => {
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

// ============================================================
// SETTINGS LISTENERS — hearts, memories, chat (global)
// ============================================================
function initSettingsListeners() {
  db.ref("settings/heartsEnabled").on("value", snap => {
    heartsEnabled = snap.val() !== false;
    const cb = el("toggleHearts");
    if (cb) cb.checked = heartsEnabled;
  });

  db.ref("settings/memoriesEnabled").on("value", snap => {
    const on   = snap.val() !== false;
    const lock = el("memoriesLock");
    if (lock) lock.style.display = (on || isAdmin) ? "none" : "flex";
    const cb = el("toggleMemories");
    if (cb) cb.checked = on;
  });

  db.ref("settings/chatEnabled").on("value", snap => {
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

// ============================================================
// APP INIT
// ============================================================
function initApp() {
  const saved = localStorage.getItem("currentPage") || "home";
  showSection(saved);
  updateCounter();
  initLightboxSwipe();
  initServiceWorker();
  initInstallPrompt();
  // if admin lands on game section, apply admin UI after DOM is ready
  if (isAdmin) setTimeout(() => showAdminUI(), 0);
}

// ============================================================
// SECTION SWITCHING
// ============================================================
window.showSection = function(id) {
  document.querySelectorAll("#app section").forEach(s => {
    if (s.id !== "site-rating") s.style.display = "none";
  });
  const t = el(id);
  if (t) t.style.display = "block";

  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  const link = el("nav-" + id);
  if (link) link.classList.add("active");

  // re-apply admin UI every time game section is shown (chat lives there)
  if (id === "game" && currentUser) {
    if (isAdmin) showAdminUI();
  }

  handleRatingVisibility(id);
  localStorage.setItem("currentPage", id);
};

function handleRatingVisibility(id) {
  const r = el("site-rating");
  if (!r) return;
  r.style.display = (window.innerWidth <= 768 && id !== "game") ? "none" : "block";
}

// swipe navigation
let swipeStartX = 0, swipeStartY = 0;
const pages = ["home","story","memories","game"];
document.addEventListener("touchstart", e => {
  if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
});
document.addEventListener("touchend", e => {
  if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
  const dx = swipeStartX - e.changedTouches[0].clientX;
  const dy = swipeStartY - e.changedTouches[0].clientY;
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 120) return;
  const cur = pages.find(id => { const s = el(id); return s && s.style.display === "block"; }) || "home";
  const i = pages.indexOf(cur);
  if (dx > 0 && i < pages.length - 1) showSection(pages[i + 1]);
  if (dx < 0 && i > 0)                showSection(pages[i - 1]);
});

// ============================================================
// COUNTER
// ============================================================
const startDate = new Date("2025-06-13");
function updateCounter() {
  const el_ = el("counter");
  if (!el_) return;
  const d    = Date.now() - startDate;
  const days = Math.floor(d / 86400000);
  const hrs  = Math.floor((d % 86400000) / 3600000);
  const mins = Math.floor((d % 3600000)  / 60000);
  const secs = Math.floor((d % 60000)    / 1000);
  el_.textContent = `We have loved each other for ${days}d ${hrs}h ${mins}m ${secs}s ❤️`;
}
setInterval(updateCounter, 1000);

// ============================================================
// MUSIC
// ============================================================
function toggleMusic() {
  const m   = el("bgMusic");
  const btn = el("musicBtn");
  if (!m || !btn) return;
  if (m.paused) { m.play();  btn.textContent = "🎵 Pause Music"; }
  else          { m.pause(); btn.textContent = "🎵 Play Music";  }
}

// ============================================================
// POPUP
// ============================================================
function showPopup() { const p = el("popup"); if (p) { p.style.display = "flex"; } }
function closePopup(){ const p = el("popup"); if (p) { p.style.display = "none"; } }

// ============================================================
// FLOATING HEARTS
// ============================================================
function startHearts() {
  if (heartsInterval) return;
  heartsInterval = setInterval(() => {
    if (!heartsEnabled) return;
    const h = document.createElement("div");
    h.className   = "heart";
    h.textContent = "❤️";
    h.style.left     = Math.random() * 100 + "vw";
    h.style.fontSize = (15 + Math.random() * 25) + "px";
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 6000);
  }, 500);
}
function stopHearts() {
  clearInterval(heartsInterval);
  heartsInterval = null;
}

// ============================================================
// RATING
// ============================================================
function rateSite(rating) {
  const stars = document.querySelectorAll(".rating-stars span");
  stars.forEach((s, i) => {
    s.classList.toggle("active", i < rating);
  });
  const msgs = ["","💔 We can do better","😊 Getting stronger","❤️ Beautiful love","💖 Almost perfect","💞 Perfect love"];
  const r = el("ratingResult");
  if (r) r.textContent = msgs[rating];
  localStorage.setItem("loveRating", rating);
}

// ============================================================
// LIGHTBOX
// ============================================================
let lightboxIndex = 0;
function openLightbox(img) {
  const box = el("lightbox");
  if (!box) return;
  box.style.display = "flex";
  el("lightbox-img").src = img.src;
  lightboxIndex = Array.from(document.querySelectorAll(".gallery img")).indexOf(img);
}
function closeLightbox() { el("lightbox").style.display = "none"; }
function nextImage() { moveLight(1); }
function prevImage() { moveLight(-1); }
function moveLight(dir) {
  const imgs = document.querySelectorAll(".gallery img");
  lightboxIndex = (lightboxIndex + dir + imgs.length) % imgs.length;
  el("lightbox-img").src = imgs[lightboxIndex].src;
}
function initLightboxSwipe() {
  const box = el("lightbox");
  if (!box) return;
  let sx = 0;
  box.addEventListener("touchstart", e => { sx = e.touches[0].clientX; });
  box.addEventListener("touchend",   e => {
    const dx = sx - e.changedTouches[0].clientX;
    if (dx > 50) nextImage();
    if (dx < -50) prevImage();
  });
}

// ============================================================
// PROFILE
// ============================================================
function loadProfile() {
  if (!currentUser) return;
  db.ref("users/" + currentUser.uid).once("value", snap => {
    const d = snap.val();
    if (!d) return;
    if (d.name) {
      localStorage.setItem("username", d.name);
      const n = el("displayName");
      if (n) n.textContent = d.name;
    }
    if (d.photo) {
      const p = el("profilePhoto");
      if (p) p.src = d.photo;
    }
  });
}

function openProfileModal() {
  const m = el("profileModal");
  if (!m) return;
  el("profileModalPhoto").src       = el("profilePhoto").src;
  el("profileModalName").textContent = el("displayName").textContent;
  m.style.display = "flex";
}

// ============================================================
// SECRET ADMIN TRIGGER — triple-tap profile photo
// ============================================================
let tapCount = 0, tapTimer = null;
function handleProfileTap() {
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { tapCount = 0; }, 600);
  if (tapCount >= 3) {
    tapCount = 0;
    if (isAdmin) openAdminPanel();
    else openProfileModal();
  } else if (tapCount === 1) {
    // single tap opens profile after short delay (cancelled if more taps come)
    tapTimer = setTimeout(() => {
      if (tapCount === 1) openProfileModal();
      tapCount = 0;
    }, 600);
  }
}
function closeProfileModal() { el("profileModal").style.display = "none"; }
document.addEventListener("click", e => {
  if (e.target === el("profileModal")) closeProfileModal();
  if (e.target === el("adminPanel"))   closeAdminPanel();
});

function changeUsername() {
  if (!currentUser) return;
  const name = prompt("Enter new display name ❤️");
  if (!name || !name.trim()) return;
  const n = name.trim();
  localStorage.setItem("username", n);
  db.ref("users/" + currentUser.uid).update({ name: n });
  el("displayName").textContent = n;
}

function changePhoto() {
  if (!currentUser) return;
  el("photoInput").click();
  el("photoInput").onchange = async () => {
    const file = el("photoInput").files[0];
    if (!file) return;
    const status = el("recordStatus");
    if (status) status.textContent = "Uploading...";
    try {
      const ref = storage.ref("photos/" + currentUser.uid + ".jpg");
      await ref.put(file);
      const url = await ref.getDownloadURL();
      db.ref("users/" + currentUser.uid).update({ photo: url });
      el("profilePhoto").src = url;
      const mp = el("profileModalPhoto");
      if (mp) mp.src = url;
      if (status) status.textContent = "Photo updated ✔";
      setTimeout(() => { if (status) status.textContent = ""; }, 2000);
    } catch(e) {
      if (status) status.textContent = "Upload failed ❌";
    }
    el("photoInput").value = "";
  };
}

// ============================================================
// ONLINE STATUS
// ============================================================
function setOnline() {
  if (!currentUser) return;
  const key = sanitize(currentUser.email);
  db.ref("status/" + key).set({ online: true, lastSeen: Date.now() });
  window.addEventListener("beforeunload", () => {
    db.ref("status/" + key).set({ online: false, lastSeen: Date.now() });
  });
}
db.ref("status").on("value", snap => {
  const data    = snap.val() || {};
  const me      = localStorage.getItem("username");
  const statusEl = el("userStatus");
  if (!statusEl) return;
  for (const key in data) {
    if (key !== me) {
      statusEl.textContent = data[key].online
        ? key + " is online 🟢"
        : "Last seen: " + new Date(data[key].lastSeen).toLocaleTimeString();
    }
  }
});

// ============================================================
// CHAT
// ============================================================
const encrypt = t => CryptoJS.AES.encrypt(t, SECRET_KEY).toString();
const decrypt = c => {
  try {
    const b = CryptoJS.AES.decrypt(c, SECRET_KEY).toString(CryptoJS.enc.Utf8);
    return b || c;
  } catch { return c; }
};

function loadMessages() {
  const box = el("chatBox");
  if (!box) return;
  db.ref("messages").on("value", snap => {
    box.innerHTML = "";
    const me = localStorage.getItem("username");
    snap.forEach(child => {
      const msg = child.val(), key = child.key;
      const div = document.createElement("div");
      div.className = msg.user === me ? "sent" : "received";

      const name = document.createElement("small");
      name.style.cssText = "font-weight:bold;display:block;";
      name.textContent = msg.user || "Anonymous";
      div.appendChild(name);

      if (msg.voice) {
        const a = document.createElement("audio");
        a.controls = true; a.src = msg.voice;
        div.appendChild(a);
      } else if (msg.text) {
        const s = document.createElement("span");
        s.textContent = decrypt(msg.text);
        div.appendChild(s);
      }

      if (msg.user === me) {
        const t = document.createElement("small");
        t.style.marginLeft = "5px";
        t.textContent = msg.seen ? "✔✔" : "✔";
        div.appendChild(t);
      }
      if (msg.user !== me && !msg.seen) db.ref("messages/" + key).update({ seen: true });
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  });
}

function sendMessage() {
  if (!currentUser) return;
  const inp  = el("chatInput");
  const text = inp.value.trim();
  if (!text) return;
  const lock = el("chatLock");
  if (lock && lock.style.display !== "none") { alert("Chat is locked 🔒"); return; }
  if (inp.disabled) { alert("You are restricted from chatting 🚫"); return; }
  db.ref("messages").push({
    text: encrypt(text),
    user: localStorage.getItem("username") || "Anonymous",
    time: Date.now(),
    seen: false
  });
  inp.value = "";
}

// typing
const typingRef = db.ref("typing");
const chatInput = el("chatInput");
if (chatInput) {
  chatInput.addEventListener("input", () => {
    const u = localStorage.getItem("username");
    typingRef.set({ user: u, typing: true });
    setTimeout(() => typingRef.set({ user: u, typing: false }), 1500);
  });
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}
typingRef.on("value", snap => {
  const d   = snap.val();
  const me  = localStorage.getItem("username");
  const div = el("typingStatus");
  if (!div) return;
  div.textContent = (d && d.typing && d.user !== me) ? d.user + " is typing..." : "";
});

// ============================================================
// VOICE RECORDING
// ============================================================
let mediaRecorder, audioChunks = [];
const recordBtn    = el("recordBtn");
const recordStatus = el("recordStatus");

if (recordBtn) {
  recordBtn.addEventListener("mousedown",  startRec);
  recordBtn.addEventListener("mouseup",    stopRec);
  recordBtn.addEventListener("touchstart", e => { e.preventDefault(); startRec(); });
  recordBtn.addEventListener("touchend",   e => { e.preventDefault(); stopRec();  });
}

function startRec() {
  if (!currentUser) return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    recordBtn.style.background = "#e53935";
    recordBtn.textContent = "🔴 Recording...";
    if (recordStatus) recordStatus.textContent = "Release to send";
  }).catch(() => alert("Microphone access denied ❌"));
}

function stopRec() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  mediaRecorder.stop();
  recordBtn.style.background = "";
  recordBtn.textContent = "🎤 Hold to Record";
  if (recordStatus) recordStatus.textContent = "Uploading...";
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    try {
      const ref = storage.ref("voices/" + Date.now() + ".webm");
      await ref.put(blob);
      const url = await ref.getDownloadURL();
      db.ref("messages").push({ voice: url, user: localStorage.getItem("username") || "me", time: Date.now() });
      if (recordStatus) recordStatus.textContent = "Voice sent ✔";
      setTimeout(() => { if (recordStatus) recordStatus.textContent = ""; }, 2000);
    } catch (e) {
      if (recordStatus) recordStatus.textContent = "Upload failed ❌";
    }
  };
}

// ============================================================
// AUTH FORMS
// ============================================================
function login() {
  const email = el("email").value.trim();
  const pass  = el("password").value;
  auth.signInWithEmailAndPassword(email, pass)
    .catch(e => alert(e.message));
}

function register() {
  const email = el("email").value.trim();
  const pass  = el("password").value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => alert("Account created ❤️"))
    .catch(e => alert(e.message));
}

function resetPassword() {
  const email = el("email").value.trim();
  if (!email) { alert("Enter your email first 📧"); return; }
  auth.sendPasswordResetEmail(email)
    .then(() => alert("Reset email sent to " + email + " ❤️"))
    .catch(e => alert(e.message));
}

function logout() {
  auth.signOut().then(() => {
    localStorage.removeItem("username");
    stopHearts();
  });
}

function togglePassword() {
  const inp = el("password");
  const btn = el("eyeBtn");
  if (!inp) return;
  inp.type = inp.type === "password" ? "text" : "password";
  btn.textContent = inp.type === "password" ? "👁️" : "🙈";
}

// enter key on login fields
document.addEventListener("DOMContentLoaded", () => {
  ["email","password"].forEach(id => {
    const e = el(id);
    if (e) e.addEventListener("keydown", ev => {
      if (ev.key === "Enter") { ev.preventDefault(); login(); }
    });
  });
});

// ============================================================
// ADMIN PANEL
// ============================================================
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

function closeAdminPanel() {
  const p = el("adminPanel");
  if (p) p.style.display = "none";
}

function switchAdminTab(tab, btn) {
  document.querySelectorAll(".admin-tab-content").forEach(t => t.style.display = "none");
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  el("adminTab-" + tab).style.display = "block";
  btn.classList.add("active");
  if (tab === "users") loadAdminUsers();
  if (tab === "chats") loadAdminMsgCount();
}

function loadAdminUsers() {
  const list = el("adminUserList");
  if (!list) return;
  list.innerHTML = '<p class="admin-loading">Loading...</p>';

  Promise.all([
    db.ref("settings/blockedUsers").once("value"),
    db.ref("settings/chatGranted").once("value"),
    db.ref("users").once("value"),
    db.ref("status").once("value")
  ]).then(([blockedSnap, grantedSnap, usersSnap, statusSnap]) => {
    const blocked  = blockedSnap.val()  || {};
    const granted  = grantedSnap.val()  || {};
    const users    = usersSnap.val()    || {};
    const statuses = statusSnap.val()   || {};

    if (!Object.keys(users).length) {
      list.innerHTML = '<p class="admin-loading">No users found.</p>';
      return;
    }

    list.innerHTML = "";
    Object.entries(users).forEach(([uid, user]) => {
      const eKey     = user.email ? sanitize(user.email) : null;
      const online   = eKey && statuses[eKey] && statuses[eKey].online;
      const lastSeen = eKey && statuses[eKey] ? new Date(statuses[eKey].lastSeen).toLocaleTimeString() : "Unknown";
      const isBlocked  = !!blocked[uid];
      const isGranted  = !!granted[uid];
      const isAdminUser = uid === ADMIN_UID;

      const card = document.createElement("div");
      card.className = "admin-user-card";
      card.innerHTML = `
        <img src="${user.photo || 'images/icon.png'}" alt="">
        <div class="admin-user-info">
          <strong>${user.name || "Unnamed"}</strong>
          <span>${user.email || uid}</span>
          <span style="color:${online ? '#4caf50' : 'var(--text-muted)'}">
            ${online ? "🟢 Online" : "⚫ " + lastSeen}
          </span>
        </div>
        ${isAdminUser
          ? '<span class="admin-badge">👑 Admin</span>'
          : `<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
               <button class="admin-user-toggle ${isGranted ? 'unblock':'block'}"
                 onclick="toggleChatGrant('${uid}',${isGranted})">
                 ${isGranted ? '💬 Revoke' : '✅ Grant Chat'}
               </button>
               <button class="admin-user-toggle ${isBlocked ? 'unblock':'block'}"
                 onclick="toggleBlock('${uid}',${isBlocked})">
                 ${isBlocked ? '🔓 Unblock' : '🚫 Block'}
               </button>
             </div>`
        }`;
      list.appendChild(card);
    });
  }).catch(e => {
    list.innerHTML = `<p class="admin-loading" style="color:#ff6b6b">❌ ${e.message}</p>`;
  });
}

function toggleChatGrant(uid, currently) {
  if (!isAdmin) return;
  const ref = db.ref("settings/chatGranted/" + uid);
  (currently ? ref.remove() : ref.set(true))
    .then(() => loadAdminUsers())
    .catch(e => alert(e.message));
}

function toggleBlock(uid, currently) {
  if (!isAdmin) return;
  const ref = db.ref("settings/blockedUsers/" + uid);
  (currently ? ref.remove() : ref.set(true))
    .then(() => loadAdminUsers())
    .catch(e => alert(e.message));
}

function loadAdminMsgCount() {
  const s = el("adminMsgCount");
  if (!s) return;
  db.ref("messages").once("value", snap => {
    s.textContent = "📨 Total messages: " + snap.numChildren();
  });
}

function adminDeleteChats() {
  if (!isAdmin) return;
  if (!confirm("Delete ALL messages? Cannot be undone.")) return;
  db.ref("messages").remove()
    .then(() => { alert("Cleared ✔"); loadAdminMsgCount(); })
    .catch(e => alert(e.message));
}

function toggleSetting(key, val) {
  if (!isAdmin) return;
  db.ref("settings/" + key).set(val);
}

// ============================================================
// LOVE GAME
// ============================================================
let lucky = Math.floor(Math.random() * 6);
function checkHeart(el_) {
  const boxes = document.querySelectorAll("#level1 .box");
  const i = Array.from(boxes).indexOf(el_);
  if (i === lucky) {
    el_.innerHTML = "💖";
    alert("You found my heart ❤️");
    el("level1").style.display = "none";
    el("level2").style.display = "block";
  } else el_.innerHTML = "💔";
}

function startQuiz() {
  const q = prompt("Where did we first meet?");
  if (q && btoa(q.toLowerCase().trim()) === QUIZ_ANSWER) {
    alert("Correct ❤️");
    el("level2").style.display = "none";
    el("level3").style.display = "block";
    buildMemoryGame();
  } else alert("Try again 💕");
}

let flipped = [], matched = 0, lockBoard = false;
function buildMemoryGame() {
  const grid = document.querySelector("#level3 .game-grid");
  if (!grid) return;
  const shuffled = [...CARD_PAIRS].sort(() => Math.random() - 0.5);
  grid.innerHTML = "";
  matched = 0; flipped = [];
  shuffled.forEach(emoji => {
    const b = document.createElement("div");
    b.className = "box";
    b.dataset.value = emoji;
    b.textContent = "💌";
    b.onclick = () => flipCard(b);
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
        setTimeout(() => { el("level3").style.display = "none"; el("final").style.display = "block"; }, 600);
      }
    } else {
      setTimeout(() => { flipped.forEach(c => c.textContent = "💌"); flipped = []; lockBoard = false; }, 900);
    }
  }
}

// ============================================================
// PWA
// ============================================================
function initServiceWorker() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js");
}

function initInstallPrompt() {
  let deferred;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); deferred = e;
    const btn = document.createElement("button");
    btn.textContent = "Install ❤️";
    btn.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999";
    document.body.appendChild(btn);
    btn.onclick = () => deferred.prompt();
  });
}

// ============================================================
// HELPERS
// ============================================================
function el(id) { return document.getElementById(id); }
function sanitize(s) { return s.replace(/[.#$[\]]/g, "-"); }
