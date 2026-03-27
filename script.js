function register(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(()=> alert("Account created ❤️"))
    .catch(err => alert(err.message));
}

function login(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(()=>{})
    .catch((error)=> {
      console.log(error);
      alert(error.message);
    });
}

function resetPassword(){
  const email = document.getElementById("email").value.trim();
  if(!email){ alert("Enter your email address first 📧"); return; }
  auth.sendPasswordResetEmail(email)
    .then(()=> alert("Password reset email sent to " + email + " ❤️\nCheck your inbox."))
    .catch(err => alert(err.message));
}

function togglePassword(){
  const input = document.getElementById("password");
  const btn = document.getElementById("eyeBtn");
  if(!input) return;
  if(input.type === "password"){
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

// Enter key on email/password → login
document.addEventListener("DOMContentLoaded", ()=>{
  ["email","password"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener("keydown", e=>{
      if(e.key === "Enter"){ e.preventDefault(); login(); }
    });
  });
});

// Prompt for username once
if(!localStorage.getItem("user")){
  let name = prompt("Enter your name ❤️");
  localStorage.setItem("user", name || "me");
}

// =============================
// 🚀 SAFE START
// =============================
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp(){
  showSection("home");
  updateCounter();
  initComments();
  initLightboxSwipe();
  initServiceWorker();
  initInstallPrompt();
}

// =============================
// 📱 SECTION SWITCHING
// =============================
function handleRatingVisibility(section){
  const rating = document.getElementById("site-rating");
  if(!rating) return;

  if(window.innerWidth <= 768){
    rating.style.display = (section === "game") ? "block" : "none";
  } else {
    rating.style.display = "block";
  }
}

window.showSection = function(id){
  const sections = document.querySelectorAll("section");
  sections.forEach(sec=>{
    if(sec.id !== "site-rating") sec.style.display = "none";
  });
  const target = document.getElementById(id);
  if(target) target.style.display = "block";

  // update active nav link
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  const activeLink = document.getElementById("nav-"+id);
  if(activeLink) activeLink.classList.add("active");

  handleRatingVisibility(id);
  localStorage.setItem("currentPage", id);
}

window.addEventListener("load", () => {
  const savedPage = localStorage.getItem("currentPage") || "home";
  showSection(savedPage);
}); 

// =============================
// 👉 IMPROVED SWIPE NAVIGATION
// =============================
let startX = 0, startY = 0, endX = 0, endY = 0;
const pages = ["home", "story", "memories", "game"];

function getCurrentPage() {
  let current = "home";
  pages.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.style.display === "block") current = id;
  });
  return current;
}

document.addEventListener("touchstart", e => {
  if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});

document.addEventListener("touchend", e => {
  if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
  endX = e.changedTouches[0].clientX;
  endY = e.changedTouches[0].clientY;
  handleSwipe();
});

function handleSwipe() {
  const diffX = startX - endX, diffY = startY - endY;
  if (Math.abs(diffY) > Math.abs(diffX)) return;
  if (Math.abs(diffX) < 120) return;

  const current = getCurrentPage();
  const index = pages.indexOf(current);

  if(diffX > 0 && index < pages.length-1) showSection(pages[index+1]);
  else if(diffX < 0 && index > 0) showSection(pages[index-1]);
}

// =============================
// 🎵 MUSIC
// =============================
function toggleMusic(){
  const music = document.getElementById("bgMusic");
  const btn = document.getElementById("musicBtn");
  if(!music || !btn) return;

  if(music.paused){
    music.play();
    btn.textContent = "🎵 Pause Music";
  } else {
    music.pause();
    btn.textContent = "🎵 Play Music";
  }
}

// =============================
// ❤️ LOVE COUNTER
// =============================
let startDate = new Date("2025-06-13");
function updateCounter(){
  const el = document.getElementById("counter");
  if(!el) return;

  const now = new Date();
  const diff = now - startDate;
  const days = Math.floor(diff / (1000*60*60*24));
  const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
  const secs = Math.floor((diff % (1000*60)) / 1000);
  el.innerHTML = `We have loved each other for ${days} days, ${hours}h ${mins}m ${secs}s ❤️`;
}
setInterval(updateCounter,1000);

// =============================
// 💌 POPUP
// =============================
function showPopup(){ const p=document.getElementById("popup"); if(p){ p.style.display="flex"; p.classList.add("active"); } }
function closePopup(){ const p=document.getElementById("popup"); if(p){ p.style.display="none"; p.classList.remove("active"); } }

// =============================
// 💬 COMMENTS
// =============================
function initComments(){
  const form=document.getElementById("commentForm");
  const list=document.getElementById("commentList");
  if(!form||!list) return;

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const name=document.getElementById("name").value;
    const comment=document.getElementById("comment").value;
    const div=document.createElement("div");
    div.innerHTML=`<p><strong>${name}:</strong> ${comment}</p>`;
    list.appendChild(div);
    form.reset();
  });
}

// =============================
// ❤️ FLOATING HEARTS
// =============================
let heartsEnabled = true;

function createHeart(){
  if(!heartsEnabled) return;
  const heart=document.createElement("div");
  heart.className="heart";
  heart.innerHTML="❤️";
  heart.style.left=Math.random()*100+"vw";
  heart.style.fontSize=(15+Math.random()*25)+"px";
  document.body.appendChild(heart);
  setTimeout(()=>heart.remove(),6000);
}
setInterval(createHeart,500);

// =============================
// 🖼️ LIGHTBOX
// =============================
let currentIndex=0;
function openLightbox(img){
  const box=document.getElementById("lightbox");
  const image=document.getElementById("lightbox-img");
  if(!box||!image) return;
  box.style.display="flex";
  image.src=img.src;
  const images=document.querySelectorAll(".gallery img");
  currentIndex=Array.from(images).indexOf(img);
}
function closeLightbox(){ const box=document.getElementById("lightbox"); if(box) box.style.display="none"; }
function nextImage(){ const images=document.querySelectorAll(".gallery img"); currentIndex=(currentIndex+1)%images.length; document.getElementById("lightbox-img").src=images[currentIndex].src; }
function prevImage(){ const images=document.querySelectorAll(".gallery img"); currentIndex=(currentIndex-1+images.length)%images.length; document.getElementById("lightbox-img").src=images[currentIndex].src; }
function initLightboxSwipe(){
  const box=document.getElementById("lightbox");
  if(!box) return;
  let startX=0;
  box.addEventListener("touchstart", e=>{ startX=e.touches[0].clientX; });
  box.addEventListener("touchend", e=>{
    let endX=e.changedTouches[0].clientX;
    if(startX>endX+50) nextImage();
    else if(startX<endX-50) prevImage();
  });
}

// =============================
// ⭐ RATING
// =============================
function rateSite(rating){
  const container=document.getElementById("site-rating");
  if(!container) return;
  const stars=container.querySelectorAll("span");
  const result=document.getElementById("ratingResult");
  stars.forEach((star,i)=>{
    star.classList.remove("active","glow");
    if(i<rating) star.classList.add("active");
  });
  const messages=["","💔 We can do better","😊 Getting stronger","❤️ Beautiful love","💖 Almost perfect","💞 Perfect love"];
  result.innerHTML=messages[rating];
  localStorage.setItem("loveRating",rating);
}

// =============================
// 🔥 FIREBASE INIT
// =============================
const firebaseConfig = { apiKey:"AIzaSyCDjfXhTYoAqhUCTMbrOB5uiZeU7dDqgbo", authDomain:"aloeva-chatbot.firebaseapp.com", databaseURL:"https://aloeva-chatbot-default-rtdb.firebaseio.com", projectId:"aloeva-chatbot", storageBucket:"aloeva-chatbot.firebasestorage.app", messagingSenderId:"216931642104", appId:"1:216931642104:web:68522fe6c57aa79565a90d", measurementId:"G-4E0TY3ZF1G"};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const statusRef = db.ref("status");

// =============================
// ⚙️ SETTINGS LISTENERS (must be after db is defined)
// =============================
function applySettingChange(key, val){
  if(key === "heartsEnabled"){
    heartsEnabled = val;
    const cb = document.getElementById("toggleHearts");
    if(cb) cb.checked = val;
  }
  if(key === "memoriesEnabled"){
    const lock = document.getElementById("memoriesLock");
    if(lock) lock.style.display = val ? "none" : "flex";
    const cb = document.getElementById("toggleMemories");
    if(cb) cb.checked = val;
  }
  if(key === "chatEnabled"){
    const lock = document.getElementById("chatLock");
    if(lock) lock.style.display = val ? "none" : "flex";
    const cb = document.getElementById("toggleChat");
    if(cb) cb.checked = val;
    const sendBtn = document.querySelector(".chat-input button");
    const inp = document.getElementById("chatInput");
    if(sendBtn) sendBtn.disabled = !val;
    if(inp) inp.disabled = !val;
  }
}

["heartsEnabled","memoriesEnabled","chatEnabled"].forEach(key => {
  db.ref("settings/"+key).on("value", snap => {
    applySettingChange(key, snap.val() !== false);
  });
});

// sanitize Firebase key
function sanitizeKey(key){ return key.replace(/[.#$[\]]/g,"-"); }

// 🔄 CHECK LOGIN STATE
auth.onAuthStateChanged(user=>{
  const loginBox=document.getElementById("loginBox");
  const chat=document.getElementById("chat");
  if(user){
    if(loginBox) loginBox.style.display="none";
    if(chat) chat.style.display="block";

    let username=localStorage.getItem("username");
    if(!username){
      username=prompt("Enter your display name ❤️")||"Anonymous";
      localStorage.setItem("username",username);
      db.ref("users/"+user.uid).set({ name: username, email: user.email });
    } else {
      // always keep email up to date
      db.ref("users/"+user.uid).update({ email: user.email });
    }
    setTimeout(()=>{ loadMessages(); setOnline(); loadProfile(); checkAdminAccess(user); },300);
  } else {
    if(loginBox) loginBox.style.display="block";
    if(chat) chat.style.display="none";
  }
});

// =============================
// 👤 LOAD PROFILE
// =============================
function loadProfile(){
  if(!auth.currentUser) return;
  db.ref("users/"+auth.currentUser.uid).once("value", snap=>{
    const data=snap.val();
    if(!data) return;
    if(data.name){
      localStorage.setItem("username", data.name);
      const nameEl=document.getElementById("displayName");
      if(nameEl) nameEl.textContent=data.name;
    }
    if(data.photo){
      localStorage.setItem("photoURL", data.photo);
      const img=document.getElementById("profilePhoto");
      if(img) img.src=data.photo;
    }
  });
}

// =============================
// 💬 LOAD MESSAGES
// =============================
function loadMessages(){
  const chatBox=document.getElementById("chatBox");
  db.ref("messages").on("value", snapshot=>{
    chatBox.innerHTML="";
    const currentUser=localStorage.getItem("username");
    snapshot.forEach(child=>{
      const msg=child.val(), key=child.key;
      const div=document.createElement("div");
      div.className=(msg.user===currentUser)?"sent":"received";

      const name=document.createElement("small");
      name.style.fontWeight="bold";
      name.style.display="block";
      name.innerText=msg.user||"Anonymous";
      div.appendChild(name);

      if(msg.voice){
        const audio=document.createElement("audio");
        audio.controls=true;
        audio.src=msg.voice;
        div.appendChild(audio);
      } else if(msg.text){
        let decrypted;
        try {
          const bytes = CryptoJS.AES.decrypt(msg.text, SECRET_KEY);
          const result = bytes.toString(CryptoJS.enc.Utf8);
          // if result is empty string, decryption failed (old unencrypted message)
          decrypted = result || msg.text;
        } catch(e){ decrypted = msg.text; }
        const text = document.createElement("span");
        text.innerText = decrypted;
        div.appendChild(text);
      }

      if(msg.user===currentUser){
        const tick=document.createElement("small");
        tick.style.marginLeft="5px";
        tick.innerText=msg.seen?"✔✔":"✔";
        div.appendChild(tick);
      }

      if(msg.user!==currentUser && !msg.seen) db.ref("messages/"+key).update({seen:true});

      chatBox.appendChild(div);
    });
    chatBox.scrollTop=chatBox.scrollHeight;
  });
}

// =============================
// 🌐 ONLINE/OFFLINE STATUS
// =============================
function setOnline(){
  if(!auth.currentUser) return;
  const userKey=sanitizeKey(auth.currentUser.email);
  statusRef.child(userKey).set({ online:true, lastSeen:Date.now() });
  window.addEventListener("beforeunload", ()=>{
    statusRef.child(userKey).set({ online:false, lastSeen:Date.now() });
  });
}
statusRef.on("value", snapshot=>{
  const data=snapshot.val();
  const currentUser=localStorage.getItem("username");
  const statusDiv=document.getElementById("userStatus");
  if(!statusDiv) return;
  for(let user in data){
    if(user!==currentUser){
      if(data[user].online) statusDiv.innerText=user+" is online 🟢";
      else statusDiv.innerText="Last seen: "+new Date(data[user].lastSeen).toLocaleTimeString();
    }
  }
});

// =============================
// 🔐 ENCRYPTION
// =============================
const SECRET_KEY="aloeva123.";
function encrypt(text){ return CryptoJS.AES.encrypt(text,SECRET_KEY).toString(); }
function decrypt(cipher){ return CryptoJS.AES.decrypt(cipher,SECRET_KEY).toString(CryptoJS.enc.Utf8); }

// =============================
// 📤 SEND MESSAGE
// =============================
function sendMessage(){
  if(!auth.currentUser){ alert("Login first 🔒"); return; }
  const chatLock = document.getElementById("chatLock");
  if(chatLock && chatLock.style.display !== "none"){ alert("Chat is locked by admin 🔒"); return; }
  const input=document.getElementById("chatInput");
  const text=input.value.trim();
  if(!text) return;
  const username=localStorage.getItem("username")||"Anonymous";
  db.ref("messages").push({ text:encrypt(text), user:username, time:Date.now(), seen:false });
  input.value="";
}

// =============================
// ✍️ TYPING STATUS
// =============================
const typingRef=db.ref("typing");
const chatInput=document.getElementById("chatInput");
if(chatInput){
  chatInput.addEventListener("input", ()=>{
    const user=localStorage.getItem("username");
    typingRef.set({ user:user, typing:true });
    setTimeout(()=>{ typingRef.set({ user:user, typing:false }); },1500);
  });
  chatInput.addEventListener("keydown", e=>{
    if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  });
}
typingRef.on("value", snapshot=>{
  const data=snapshot.val();
  const typingDiv=document.getElementById("typingStatus");
  const currentUser=localStorage.getItem("username");
  if(data && data.typing && data.user!==currentUser) typingDiv.innerText=data.user+" is typing...";
  else typingDiv.innerText="";
});

// =============================
// 🎤 VOICE RECORD
// =============================
let mediaRecorder, audioChunks=[];
const recordBtn=document.getElementById("recordBtn");
const recordStatus=document.getElementById("recordStatus");

recordBtn.addEventListener("mousedown", startRecording);
recordBtn.addEventListener("mouseup", stopRecording);
recordBtn.addEventListener("touchstart", e=>{ e.preventDefault(); startRecording(); });
recordBtn.addEventListener("touchend", e=>{ e.preventDefault(); stopRecording(); });

function startRecording(){
  if(!auth.currentUser){ alert("Login first 🔒"); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.start();
    audioChunks=[];
    mediaRecorder.ondataavailable=e=>{ audioChunks.push(e.data); };
    recordBtn.style.background="#e53935";
    recordBtn.textContent="🔴 Recording...";
    if(recordStatus) recordStatus.textContent="Release to send";
  }).catch(()=>alert("Microphone access denied ❌"));
}

function stopRecording(){
  if(!mediaRecorder || mediaRecorder.state==="inactive") return;
  mediaRecorder.stop();
  recordBtn.style.background="";
  recordBtn.textContent="🎤 Hold to Record";
  if(recordStatus) recordStatus.textContent="Uploading...";
  mediaRecorder.onstop=async()=>{
    const blob=new Blob(audioChunks,{type:"audio/webm"});
    try{
      const storageRef=firebase.storage().ref("voices/"+Date.now()+".webm");
      await storageRef.put(blob);
      const url=await storageRef.getDownloadURL();
      db.ref("messages").push({ voice:url, user:localStorage.getItem("username")||"me", time:Date.now() });
      if(recordStatus) recordStatus.textContent="Voice sent ✔";
      setTimeout(()=>{ if(recordStatus) recordStatus.textContent=""; },2000);
    } catch(err){
      console.error("Upload failed:", err);
      if(recordStatus) recordStatus.textContent="Upload failed ❌";
    }
  };
}

// =============================
// 👤 PROFILE MODAL
// =============================
function openProfileModal(){
  const modal = document.getElementById("profileModal");
  const modalPhoto = document.getElementById("profileModalPhoto");
  const modalName = document.getElementById("profileModalName");
  const currentPhoto = document.getElementById("profilePhoto");
  const currentName = document.getElementById("displayName");
  if(!modal) return;
  modalPhoto.src = currentPhoto.src;
  modalName.textContent = currentName.textContent;
  modal.style.display = "flex";
}

function closeProfileModal(){
  const modal = document.getElementById("profileModal");
  if(modal) modal.style.display = "none";
}

// close modal on backdrop click
document.addEventListener("click", e => {
  const modal = document.getElementById("profileModal");
  if(modal && e.target === modal) closeProfileModal();
});

// =============================
// 🗑️ ADMIN DELETE CHATS
// =============================
const ADMIN_EMAIL = "aloysiusmworia@gmail.com";

function checkAdminAccess(user){
  const btn = document.getElementById("adminPanelBtn");
  if(!btn) return;
  const isAdmin = user && user.email === ADMIN_EMAIL;
  btn.style.setProperty("display", isAdmin ? "flex" : "none", "important");
}

// =============================
// ⚙️ ADMIN PANEL
// =============================
function openAdminPanel(){
  if(!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL){ return; }
  const panel = document.getElementById("adminPanel");
  if(!panel) return;
  panel.style.display = "flex";
  // set email badge
  const badge = document.getElementById("adminEmail");
  if(badge) badge.textContent = auth.currentUser.email;
  // load users and message count
  loadAdminUsers();
  loadAdminMsgCount();
}

function closeAdminPanel(){
  const panel = document.getElementById("adminPanel");
  if(panel) panel.style.display = "none";
}

// close on backdrop click
document.addEventListener("click", e => {
  const panel = document.getElementById("adminPanel");
  if(panel && e.target === panel) closeAdminPanel();
});

function switchAdminTab(tab, btn){
  // hide all tab contents
  document.querySelectorAll(".admin-tab-content").forEach(t => t.style.display = "none");
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("adminTab-"+tab).style.display = "block";
  btn.classList.add("active");
  if(tab === "users") loadAdminUsers();
  if(tab === "chats") loadAdminMsgCount();
}

function loadAdminUsers(){
  const list = document.getElementById("adminUserList");
  if(!list) return;
  list.innerHTML = '<p class="admin-loading">Loading...</p>';
  db.ref("users").once("value", snap => {
    const data = snap.val();
    if(!data){ list.innerHTML = '<p class="admin-loading">No users found.</p>'; return; }
    list.innerHTML = "";
    db.ref("status").once("value", statusSnap => {
      const statuses = statusSnap.val() || {};
      Object.entries(data).forEach(([uid, user]) => {
        const emailKey = user.email ? sanitizeKey(user.email) : null;
        const isOnline = emailKey && statuses[emailKey] && statuses[emailKey].online;
        const lastSeen = emailKey && statuses[emailKey] ? new Date(statuses[emailKey].lastSeen).toLocaleTimeString() : "Unknown";
        const card = document.createElement("div");
        card.className = "admin-user-card";
        card.innerHTML = `
          <img src="${user.photo || 'images/icon.png'}" alt="User photo">
          <div class="admin-user-info">
            <strong>${user.name || "Unnamed"}</strong>
            <span>${user.email || uid}</span>
            <span style="color:${isOnline ? '#4caf50' : 'var(--text-muted)'}">
              ${isOnline ? "🟢 Online" : "⚫ Last seen: " + lastSeen}
            </span>
          </div>
          <div class="admin-online-dot ${isOnline ? '' : 'offline'}"></div>
        `;
        list.appendChild(card);
      });
    }, err => {
      list.innerHTML = `<p class="admin-loading">Status error: ${err.message}</p>`;
    });
  }, err => {
    list.innerHTML = `<p class="admin-loading" style="color:#ff6b6b;">❌ ${err.message}<br><small>Fix Firebase rules to allow authenticated reads on /users</small></p>`;
  });
}

function loadAdminMsgCount(){
  const stat = document.getElementById("adminMsgCount");
  if(!stat) return;
  stat.textContent = "Counting...";
  db.ref("messages").once("value", snap => {
    const count = snap.numChildren();
    stat.textContent = `📨 Total messages: ${count}`;
  });
}

function adminDeleteChats(){
  if(!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL){
    alert("Access denied ❌"); return;
  }
  if(!confirm("Delete ALL chat messages? This cannot be undone.")) return;
  db.ref("messages").remove()
    .then(()=>{ alert("All chats cleared ✔"); loadAdminMsgCount(); })
    .catch(err => alert("Error: " + err.message));
}

function toggleSetting(key, enabled){
  db.ref("settings/"+key).set(enabled);
}

// =============================
// 🚪 LOGOUT
// =============================
function logout(){
  auth.signOut().then(()=>{
    localStorage.removeItem("username");
    localStorage.removeItem("photoURL");
  });
}

// =============================
// ✏️ CHANGE USERNAME
// =============================
function changeUsername(){
  if(!auth.currentUser){ alert("Login first 🔒"); return; }
  const newName=prompt("Enter new display name ❤️");
  if(!newName || !newName.trim()) return;
  const trimmed=newName.trim();
  localStorage.setItem("username", trimmed);
  db.ref("users/"+auth.currentUser.uid).update({ name: trimmed });
  const nameEl=document.getElementById("displayName");
  if(nameEl) nameEl.textContent=trimmed;
  alert("Name updated to: "+trimmed+" ❤️");
}

// =============================
// 📷 CHANGE PROFILE PHOTO
// =============================
function changePhoto(){
  if(!auth.currentUser){ alert("Login first 🔒"); return; }
  const input=document.getElementById("photoInput");
  input.click();
  input.onchange=async()=>{
    const file=input.files[0];
    if(!file) return;
    const photoStatus=document.getElementById("recordStatus");
    if(photoStatus) photoStatus.textContent="Uploading photo...";
    try{
      const storageRef=firebase.storage().ref("photos/"+auth.currentUser.uid+".jpg");
      await storageRef.put(file);
      const url=await storageRef.getDownloadURL();
      // save to Firebase and localStorage
      localStorage.setItem("photoURL", url);
      db.ref("users/"+auth.currentUser.uid).update({ photo: url });
      // update visible profile photo
      const img=document.getElementById("profilePhoto");
      if(img) img.src=url;
      // also update modal if open
      const modalPhoto=document.getElementById("profileModalPhoto");
      if(modalPhoto) modalPhoto.src=url;
      if(photoStatus) photoStatus.textContent="Photo updated ✔";
      setTimeout(()=>{ if(photoStatus) photoStatus.textContent=""; },2000);
    } catch(err){
      console.error("Photo upload failed:", err);
      if(photoStatus) photoStatus.textContent="Upload failed ❌";
    }
    input.value="";
  };
}

// =============================
// 🎮 LOVE GAME
// =============================
let lucky=Math.floor(Math.random()*6);
function checkHeart(el){
  const boxes=document.querySelectorAll("#level1 .box");
  const index=Array.from(boxes).indexOf(el);
  if(index===lucky){
    el.innerHTML="💖";
    alert("You found my heart ❤️");
    document.getElementById("level1").style.display="none";
    document.getElementById("level2").style.display="block";
  } else el.innerHTML="💔";
}

// quiz answer stored as base64 to avoid plain text in source
const QUIZ_ANSWER = btoa("school"); // "c2Nob29s"
function startQuiz(){
  const q=prompt("Where did we first meet?");
  if(q && btoa(q.toLowerCase().trim()) === QUIZ_ANSWER){
    alert("Correct ❤️");
    document.getElementById("level2").style.display="none";
    document.getElementById("level3").style.display="block";
    buildMemoryGame();
  } else alert("Try again 💕");
}

// =============================
// 🎮 MEMORY MATCH GAME (Level 3)
// =============================
const CARD_PAIRS = ["🌹","🌹","💋","💋","🎁","🎁","💍","💍"];
let flipped=[], matched=0, lockBoard=false;

function buildMemoryGame(){
  const grid=document.querySelector("#level3 .game-grid");
  if(!grid) return;
  const shuffled=[...CARD_PAIRS].sort(()=>Math.random()-0.5);
  grid.innerHTML="";
  matched=0; flipped=[];
  shuffled.forEach(emoji=>{
    const box=document.createElement("div");
    box.className="box";
    box.dataset.value=emoji;
    box.textContent="💌";
    box.onclick=()=>flipCard(box);
    grid.appendChild(box);
  });
}

function flipCard(el){
  if(lockBoard || el.classList.contains("matched") || flipped.includes(el)) return;
  el.textContent=el.dataset.value;
  flipped.push(el);
  if(flipped.length===2){
    lockBoard=true;
    if(flipped[0].dataset.value===flipped[1].dataset.value){
      flipped.forEach(c=>c.classList.add("matched"));
      matched++;
      flipped=[]; lockBoard=false;
      if(matched===CARD_PAIRS.length/2){
        setTimeout(()=>{
          document.getElementById("level3").style.display="none";
          document.getElementById("final").style.display="block";
        },600);
      }
    } else {
      setTimeout(()=>{
        flipped.forEach(c=>c.textContent="💌");
        flipped=[]; lockBoard=false;
      },900);
    }
  }
}

// =============================
// 📲 SERVICE WORKER
// =============================
function initServiceWorker(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
}

// =============================
// 📥 INSTALL BUTTON
// =============================
function initInstallPrompt(){
  let deferred;
  window.addEventListener("beforeinstallprompt", e=>{
    e.preventDefault();
    deferred=e;
    const btn=document.createElement("button");
    btn.innerText="Install ❤️";
    btn.style.position="fixed";
    btn.style.bottom="20px";
    btn.style.right="20px";
    document.body.appendChild(btn);
    btn.onclick=()=>{ deferred.prompt(); };
  });
}
