// =============================
// Initialize Firebase (Realtime Database)
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
const db = firebase.database();

// 🔥 SERVICE WORKER REGISTER
// =============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/evaproject/service-worker.js')
      .then(() => console.log("Service Worker Registered ✅"))
      .catch(() => console.log("Service Worker Failed ❌"));
  });
}

// =============================
// 📱 SECTION SWITCHING
// =============================
function handleRatingVisibility(currentSection){
  const rating = document.getElementById("site-rating");
  if(!rating) return;
  if(window.innerWidth <= 768){
    rating.style.display = (currentSection === "game") ? "block" : "none";
  } else {
    rating.style.display = "block";
  }
}

function showSection(id){
  const sections = document.querySelectorAll("section");
  sections.forEach(sec => {
    if(sec.id !== "site-rating"){
      sec.style.display = "none";
    }
  });

  const target = document.getElementById(id);
  if(target) target.style.display = "block";

  handleRatingVisibility(id);
}

// LOAD DEFAULT PAGE
window.addEventListener("load", () => {
  showSection("home");
  updateCounter();
  loadMessages();
});

// =============================
// 🎵 MUSIC CONTROL
// =============================
function toggleMusic() {
  const music = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!music || !btn) return;

  if (music.paused) {
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
  let diff = now - startDate;
  let days = Math.floor(diff / (1000*60*60*24));
  el.innerText = "We have loved each other for " + days + " days ❤️";
}
setInterval(updateCounter,1000);

// =============================
// 💌 POPUP
// =============================
function showPopup(){
  const p = document.getElementById('popup');
  if(p) p.style.display = 'block';
}
function closePopup(){
  const p = document.getElementById('popup');
  if(p) p.style.display = 'none';
}

// =============================
// ❤️ FLOATING HEARTS
// =============================
function createHeart(){
  let heart = document.createElement('div');
  heart.classList.add('heart');
  heart.innerHTML = "❤️";
  heart.style.left = Math.random()*100+"vw";
  heart.style.fontSize = (15 + Math.random()*25)+"px";
  heart.style.animationDuration = (4+Math.random()*3)+"s";
  document.body.appendChild(heart);
  setTimeout(()=>heart.remove(),6000);
}
setInterval(createHeart,500);

// =============================
// 🖼️ LIGHTBOX
// =============================
let currentIndex=0;
function openLightbox(img){
  const box = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-img");
  if(!box || !image) return;

  box.style.display="flex";
  image.src=img.src;

  const images = document.querySelectorAll(".gallery img");
  currentIndex = Array.from(images).indexOf(img);
}
function closeLightbox(){
  const box = document.getElementById("lightbox");
  if(box) box.style.display="none";
}
function nextImage(){
  const images = document.querySelectorAll(".gallery img");
  currentIndex = (currentIndex+1) % images.length;
  document.getElementById("lightbox-img").src = images[currentIndex].src;
}
function prevImage(){
  const images = document.querySelectorAll(".gallery img");
  currentIndex = (currentIndex-1+images.length)%images.length;
  document.getElementById("lightbox-img").src = images[currentIndex].src;
}
setInterval(()=>{
  const box = document.getElementById("lightbox");
  if(box && box.style.display==="flex"){
    nextImage();
  }
},3000);

// =============================
// ⭐ RATING SYSTEM
// =============================
function rateSite(rating) {
  const container = document.getElementById("site-rating");
  if(!container) return;
  const stars = container.querySelectorAll(".rating-stars span");
  const result = container.querySelector("#ratingResult");
  stars.forEach((star, index) => {
    star.classList.remove("active","glow");
    if(index < rating){
      star.classList.add("active");
      setTimeout(()=>{ star.classList.add("glow"); }, index*100);
    }
  });
  const messages = ["","💔 Oh no... we can do better","😊 It's growing stronger","❤️ Beautiful love","💖 Almost perfect!","💞 Perfect love story!"];
  result.innerText = messages[rating];
  localStorage.setItem("loveRating", rating);
}
window.addEventListener("load", ()=>{
  const saved = localStorage.getItem("loveRating");
  if(saved){
    rateSite(parseInt(saved));
  }
});

// =============================
// 🎮 LOVE GAME
// =============================
let lucky = Math.floor(Math.random()*6);
function checkHeart(el){
  let boxes = document.querySelectorAll("#level1 .box");
  let index = Array.from(boxes).indexOf(el);
  if(index === lucky){
    el.innerHTML="💖";
    alert("You found my heart ❤️");
    document.getElementById("level1").style.display="none";
    document.getElementById("level2").style.display="block";
  } else {
    el.innerHTML="💔";
  }
}
function startQuiz(){
  let q1 = prompt("Where did we first meet?");
  if(q1 && q1.toLowerCase()==="school"){
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
// 💬 FIREBASE CHAT (WORKING VERSION)
// =============================

// Make sure Firebase is initialized before this code
// firebase.initializeApp(firebaseConfig);
// const db = firebase.database();

function loadMessages() {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;

  const messagesRef = db.ref("messages");

  // Listen for changes in realtime
  messagesRef.orderByChild("time").on("value", (snapshot) => {
    chatBox.innerHTML = ""; // clear chat
    snapshot.forEach((child) => {
      const div = document.createElement("div");
      div.className = "received"; // you can style "sent" differently if needed
      div.innerText = child.val().text;
      chatBox.appendChild(div);
    });
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (text === "") return;

  const messagesRef = db.ref("messages");
  messagesRef
    .push({
      text: text,
      time: Date.now(),
    })
    .then(() => {
      input.value = ""; // clear input
    })
    .catch((err) => {
      console.error("Error sending message:", err);
      alert("Failed to send message. Check your database rules!");
    });
}

// Load messages when page is ready
window.addEventListener("load", loadMessages);

// =============================
// 🎤 VOICE RECORDING
// =============================
let mediaRecorder;
let audioChunks = [];
const recordBtn = document.getElementById("recordBtn");
const audioPlayback = document.getElementById("audioPlayback");

if(recordBtn){
  recordBtn.addEventListener("mousedown", startRecording);
  recordBtn.addEventListener("mouseup", stopRecording);
  recordBtn.addEventListener("touchstart", startRecording);
  recordBtn.addEventListener("touchend", stopRecording);
}

function startRecording(){
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
      };
    });
}
function stopRecording(){
  if(mediaRecorder){
    mediaRecorder.stop();
  }
}

// =============================
// 📲 INSTALL BUTTON
// =============================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.createElement("button");
  btn.innerText="Install App ❤️";
  btn.style.position="fixed";
  btn.style.bottom="20px";
  btn.style.right="20px";
  btn.style.padding="10px 20px";
  btn.style.background="#ff4b7d";
  btn.style.color="white";
  btn.style.border="none";
  btn.style.borderRadius="20px";

  document.body.appendChild(btn);
  btn.addEventListener("click", ()=>{
    deferredPrompt.prompt();
  });
});
