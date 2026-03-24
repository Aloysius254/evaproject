
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
  console.log(error); // 👈 shows real error in console
  alert(error.message); // 👈 shows exact reason
});
}

if(!localStorage.getItem("user")){
  let name = prompt("Enter your name ❤️");
  localStorage.setItem("user", name || "me");
}

// =============================
// 🚀 SAFE START (NO CRASHES)
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
    if(sec.id !== "site-rating"){
      sec.style.display = "none";
    }
  });

  const target = document.getElementById(id);
  if(target) target.style.display = "block";

  handleRatingVisibility(id);

  // 🧠 SAVE CURRENT PAGE
  localStorage.setItem("currentPage", id);
}

// load page
window.addEventListener("load", () => {
  const savedPage = localStorage.getItem("currentPage") || "home";
  showSection(savedPage);
}); 


// =============================
// 👉 IMPROVED SWIPE NAVIGATION
// =============================

let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;

// Sections order
const pages = ["home", "story", "memories", "game"];

// Get current section
function getCurrentPage() {
  let current = "home";
  pages.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.style.display === "block") {
      current = id;
    }
  });
  return current;
}

// Touch start
document.addEventListener("touchstart", (e) => {
  // 🚫 Don't swipe if user is typing in input or textarea
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA"
  ) return;

  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});

// Touch end
document.addEventListener("touchend", (e) => {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA"
  ) return;

  endX = e.changedTouches[0].clientX;
  endY = e.changedTouches[0].clientY;

  handleSwipe();
});

function handleSwipe() {
  const diffX = startX - endX;
  const diffY = startY - endY;

  // 🎯 Ignore vertical scrolls (important!)
  if (Math.abs(diffY) > Math.abs(diffX)) return;

  // 🎯 Require strong swipe (not small touch)
  if (Math.abs(diffX) < 120) return;

  const current = getCurrentPage();
  const index = pages.indexOf(current);

  // 👉 Swipe LEFT
  if (diffX > 0 && index < pages.length - 1) {
    showSection(pages[index + 1]);
  }

  // 👉 Swipe RIGHT
  else if (diffX < 0 && index > 0) {
    showSection(pages[index - 1]);
  }
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

  let now = new Date();
  let days = Math.floor((now - startDate)/(1000*60*60*24));

  el.innerHTML = `We have loved each other for ${days} days ❤️`;
}

setInterval(updateCounter,1000);

// =============================
// 💌 POPUP
// =============================
function showPopup(){
  const p = document.getElementById("popup");
  if(p) p.style.display="block";
}

function closePopup(){
  const p = document.getElementById("popup");
  if(p) p.style.display="none";
}

// =============================
// 💬 COMMENTS
// =============================
function initComments(){
  const form = document.getElementById("commentForm");
  const list = document.getElementById("commentList");

  if(!form || !list) return;

  form.addEventListener("submit",(e)=>{
    e.preventDefault();

    const name = document.getElementById("name").value;
    const comment = document.getElementById("comment").value;

    const div = document.createElement("div");
    div.innerHTML = `<p><strong>${name}:</strong> ${comment}</p>`;

    list.appendChild(div);
    form.reset();
  });
}

// =============================
// ❤️ FLOATING HEARTS
// =============================
function createHeart(){
  let heart = document.createElement("div");
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

  if(!box || !image) return;

  box.style.display="flex";
  image.src=img.src;

  const images=document.querySelectorAll(".gallery img");
  currentIndex=Array.from(images).indexOf(img);
}

function closeLightbox(){
  const box=document.getElementById("lightbox");
  if(box) box.style.display="none";
}

function nextImage(){
  const images=document.querySelectorAll(".gallery img");
  currentIndex=(currentIndex+1)%images.length;
  document.getElementById("lightbox-img").src=images[currentIndex].src;
}

function prevImage(){
  const images=document.querySelectorAll(".gallery img");
  currentIndex=(currentIndex-1+images.length)%images.length;
  document.getElementById("lightbox-img").src=images[currentIndex].src;
}

// Swipe (mobile)
function initLightboxSwipe(){
  const box=document.getElementById("lightbox");
  if(!box) return;

  let startX=0;

  box.addEventListener("touchstart",e=>{
    startX=e.touches[0].clientX;
  });

  box.addEventListener("touchend",e=>{
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
    if(i<rating){
      star.classList.add("active");
    }
  });

  const messages=[
    "",
    "💔 We can do better",
    "😊 Getting stronger",
    "❤️ Beautiful love",
    "💖 Almost perfect",
    "💞 Perfect love"
  ];

  result.innerHTML=messages[rating];
  localStorage.setItem("loveRating",rating);
}

// =============================
// 💬 CHAT (WORKING + EMOJIS)
// =============================
// =============================
// 🔥 FIREBASE INIT
// =============================
const firebaseConfig = {
  apiKey: "AIzaSyCDjfXhTYoAqhUCTMbrOB5uiZeU7dDqgbo",
  authDomain: "aloeva-chatbot.firebaseapp.com",
  databaseURL: "https://aloeva-chatbot-default-rtdb.firebaseio.com",
  projectId: "aloeva-chatbot",
  storageBucket: "aloeva-chatbot.firebasestorage.app",
  messagingSenderId: "216931642104",
  appId: "1:216931642104:web:68522fe6c57aa79565a90d",
  measurementId: "G-4E0TY3ZF1G"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 🔐 AUTH INIT
const auth = firebase.auth();

// 🔄 CHECK LOGIN STATE
auth.onAuthStateChanged(user => {
  const loginBox = document.getElementById("loginBox");
  const chat = document.getElementById("chat");

  if(user){
    if(loginBox) loginBox.style.display = "none";
    if(chat) chat.style.display = "block";
    
    // ✅ use email as identity
    localStorage.setItem("user", user.email);

// 🔥 START CHAT HERE
setTimeout(() => {
  loadMessages();
  setOnline();
}, 300);
  } else {
    if(loginBox) loginBox.style.display = "block";
    if(chat) chat.style.display = "none";
  }
});

// =============================
// 💬 LOAD MESSAGES (REAL TIME)
// =============================
function loadMessages() {
  const chatBox = document.getElementById("chatBox");

  db.ref("messages").on("value", (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((child) => {
      const msg = child.val();
      const key = child.key;

     const currentUser = auth.currentUser.email;

      // ✅ MAIN MESSAGE DIV
      const div = document.createElement("div");
      div.className = (msg.user === currentUser) ? "sent" : "received";

      // 👤 SENDER NAME
      const name = document.createElement("small");
      name.style.fontWeight = "bold";
      name.style.display = "block";
      name.innerText = msg.user || "Unknown";

      div.appendChild(name);

      // 💬 MESSAGE CONTENT (text or voice)
      if(msg.voice){
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = msg.voice;
        div.appendChild(audio);
      } else {
        const text = document.createElement("span");
        text.innerText = msg.text ? decrypt(msg.text) : "";
        div.appendChild(text);
      }

      // ✔✔ TICKS FOR CURRENT USER
      if(msg.user === currentUser){
        const tick = document.createElement("small");
        tick.style.marginLeft = "5px";
        tick.innerText = msg.seen ? "✔✔" : "✔";
        div.appendChild(tick);
      }

      // MARK OTHER USERS' MESSAGES AS SEEN
      if(msg.user !== currentUser && !msg.seen){
        db.ref("messages/" + key).update({ seen: true });
      }

      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}
// online/offline status
const statusRef = db.ref("status");

function setOnline(){
  if(!auth.currentUser) return;
const user = auth.currentUser.email;

  statusRef.child(user).set({
    online: true,
    lastSeen: Date.now()
  });

  window.addEventListener("beforeunload", () => {
    statusRef.child(user).set({
      online: false,
      lastSeen: Date.now()
    });
  });
}
// show status online or offline
statusRef.on("value", (snapshot) => {
  const data = snapshot.val();
  const currentUser = localStorage.getItem("user");
  const statusDiv = document.getElementById("userStatus");

  for(let user in data){
    if(user !== currentUser){
      if(data[user].online){
        statusDiv.innerText = user + " is online 🟢";
      } else {
        let time = new Date(data[user].lastSeen).toLocaleTimeString();
        statusDiv.innerText = "Last seen: " + time;
      }
    }
  }
});

// =============================
// 🔐 ENCRYPTION message
const SECRET_KEY = "aloeva123."; // change this

function encrypt(text){
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decrypt(cipher){
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// 📤 SEND MESSAGE
// =============================

function sendMessage(){
  
  if(!auth.currentUser){
    alert("Login first 🔒");
    return;
  }
    
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (text === "") return;

 const user = auth.currentUser ? auth.currentUser.email : "me";
  db.ref("messages").push({
    text: encrypt(text),
    user: user,
    time: Date.now(),
    seen: false
  });

  input.value = "";
}
// =============================
// 🚀 LOAD CHAT
// =============================

//user tying
const typingRef = db.ref("typing");

const chatInput = document.getElementById("chatInput");

if(chatInput){
  chatInput.addEventListener("input", () => {
    const user = localStorage.getItem("user");
    typingRef.set({ user: user, typing: true });

    setTimeout(() => {
      typingRef.set({ user: user, typing: false });
    }, 1500);
  });
}

//show typing on screen
typingRef.on("value", (snapshot) => {
  const data = snapshot.val();
  const typingDiv = document.getElementById("typingStatus");

  const currentUser = localStorage.getItem("user");

  if (data && data.typing && data.user !== currentUser) {
    typingDiv.innerText = data.user + " is typing...";
  } else {
    typingDiv.innerText = "";
  }
});

//voice record
let mediaRecorder;
let audioChunks = [];

const recordBtn = document.getElementById("recordBtn");

recordBtn.addEventListener("mousedown", startRecording);
recordBtn.addEventListener("mouseup", stopRecording);

recordBtn.addEventListener("touchstart", startRecording);
recordBtn.addEventListener("touchend", stopRecording);

function startRecording(){
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    audioChunks = [];

    mediaRecorder.ondataavailable = e => {
      audioChunks.push(e.data);
    };
  });
}

function stopRecording(){
  if(!mediaRecorder) {
    console.log("Recorder not started ❌");
    return;
  }

  mediaRecorder.stop();

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });

    try {
      const storageRef = firebase.storage().ref("voices/" + Date.now() + ".webm");
      await storageRef.put(blob);

      const url = await storageRef.getDownloadURL();

      db.ref("messages").push({
        voice: url,
        user: localStorage.getItem("user") || "me",
        time: Date.now()
      });

    } catch(err) {
      console.error("Upload failed:", err);
    }
  };
}



// =============================
// 🎮 LOVE GAME
// =============================
let lucky=Math.floor(Math.random()*6);

function checkHeart(el){
  let boxes=document.querySelectorAll("#level1 .box");
  let index=Array.from(boxes).indexOf(el);

  if(index===lucky){
    el.innerHTML="💖";
    alert("You found my heart ❤️");
    document.getElementById("level1").style.display="none";
    document.getElementById("level2").style.display="block";
  } else {
    el.innerHTML="💔";
  }
}

function startQuiz(){
  let q=prompt("Where did we first meet?");
  if(q && q.toLowerCase()==="school"){
    alert("Correct ❤️");
    document.getElementById("level2").style.display="none";
    document.getElementById("level3").style.display="block";
  } else {
    alert("Try again 💕");
  }
}

let firstCard=null;

function flipCard(el){
  el.innerHTML="❤️";

  if(!firstCard){
    firstCard=el;
  } else {
    setTimeout(()=>{
      firstCard.innerHTML="💌";
      el.innerHTML="💌";
      firstCard=null;

      document.getElementById("level3").style.display="none";
      document.getElementById("final").style.display="block";
    },1000);
  }
}

// =============================
// 📲 SERVICE WORKER
// =============================
function initServiceWorker(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js');
  }
}

// =============================
// 📥 INSTALL BUTTON
// =============================
function initInstallPrompt(){
  let deferred;

  window.addEventListener("beforeinstallprompt",(e)=>{
    e.preventDefault();
    deferred=e;

    const btn=document.createElement("button");
    btn.innerText="Install ❤️";
    btn.style.position="fixed";
    btn.style.bottom="20px";
    btn.style.right="20px";

    document.body.appendChild(btn);

    btn.onclick=()=>{
      deferred.prompt();
    };
  });
}
