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
  loadMessages();
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

function showSection(id){
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
  if (Math.abs(diffX) < 80) return;

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

// =============================
// 💬 LOAD MESSAGES (REAL TIME)
// =============================
function loadMessages() {
  const chatBox = document.getElementById("chatBox");
  const currentUser = localStorage.getItem("user");

  db.ref("messages").on("value", (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((child) => {
      const msg = child.val();

      const div = document.createElement("div");
      div.className = (msg.user === currentUser) ? "sent" : "received";

      // If message has a voice recording
      if (msg.voice) {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = msg.voice;
        div.appendChild(audio);
      } else {
        div.innerText = msg.text;
      }

      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}
// =============================
// 📤 SEND MESSAGE
// =============================
function sendMessage(){
  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if(text==="") return;

  const username = localStorage.getItem("user") || "me";

  db.ref("messages").push({
    text: text,
    user: username,
    time: Date.now()
  });

  input.value="";
}
// =============================
// 🚀 LOAD CHAT
// =============================
window.addEventListener("load", loadMessages);

//user tying
const typingRef = db.ref("typing");

document.getElementById("chatInput").addEventListener("input", () => {
  const user = localStorage.getItem("user");
  typingRef.set({ user: user, typing: true });

  setTimeout(() => {
    typingRef.set({ user: user, typing: false });
  }, 1500);
});

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
  mediaRecorder.stop();

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks);

    const storageRef = firebase.storage().ref("voices/" + Date.now() + ".webm");
    await storageRef.put(blob);

    const url = await storageRef.getDownloadURL();

    db.ref("messages").push({
      voice: url,
      user: localStorage.getItem("user"),
      time: Date.now()
    });
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
