// SECTION SWITCHING
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/evaproject/service-worker.js')
      .then(reg => console.log("Service Worker Registered ✅", reg))
      .catch(err => console.log("Service Worker Failed ❌", err));
  });
}

function handleRatingVisibility(currentSection){
  const rating = document.getElementById("site-rating");

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

  document.getElementById(id).style.display = "block";

  handleRatingVisibility(id);
}

// 👇 RUN ON LOAD
window.addEventListener("load", () => {
  showSection("home");
});

// MUSIC TOGGLE
function toggleMusic() {
  const music = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (music.paused) {
      music.play();
      btn.textContent = "🎵 Pause Music";
  } else {
      music.pause();
      btn.textContent = "🎵 Play Music";
  }
}

// LOVE COUNTER
let startDate = new Date("2025-06-13");
function updateCounter(){
  let now = new Date();
  let diff = now - startDate;
  let days = Math.floor(diff / (1000*60*60*24));
  document.getElementById("counter").innerText = "We have loved each other for " + days + " days ❤️";
}
setInterval(updateCounter,1000);

// POPUP
function showPopup(){ document.getElementById('popup').style.display = 'block'; }
function closePopup(){ document.getElementById('popup').style.display = 'none'; }

// COMMENTS
const form = document.getElementById('commentForm');
const commentList = document.getElementById('commentList');
form.addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('name').value;
  const comment = document.getElementById('comment').value;
  const div = document.createElement('div');
  div.innerHTML = `<p><strong>${name}:</strong> ${comment}</p>`;
  commentList.appendChild(div);
  form.reset();
});

// FLOATING HEARTS
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

// LIGHTBOX
let currentIndex=0;
let images=document.querySelectorAll(".gallery img");
function openLightbox(img){
  document.getElementById("lightbox").style.display="flex";
  document.getElementById("lightbox-img").src=img.src;
  images=document.querySelectorAll(".gallery img");
  currentIndex=Array.from(images).indexOf(img);
}
function closeLightbox(){ document.getElementById("lightbox").style.display="none"; }
function nextImage(){ currentIndex++; if(currentIndex>=images.length) currentIndex=0; document.getElementById("lightbox-img").src=images[currentIndex].src; }
function prevImage(){ currentIndex--; if(currentIndex<0) currentIndex=images.length-1; document.getElementById("lightbox-img").src=images[currentIndex].src; }

// AUTO SLIDESHOW
setInterval(()=>{
  if(document.getElementById("lightbox").style.display==="flex"){ nextImage(); }
},3000);

// SWIPE FOR MOBILE
let startX=0;
document.getElementById("lightbox").addEventListener("touchstart", e=>{ startX=e.touches[0].clientX; });
document.getElementById("lightbox").addEventListener("touchend", e=>{
  let endX=e.changedTouches[0].clientX;
  if(startX>endX+50){ nextImage(); } else if(startX<endX-50){ prevImage(); }
});

function rateSite(rating) {
  const container = document.getElementById("site-rating");
  const stars = container.querySelectorAll(".rating-stars span");
  const result = container.querySelector("#ratingResult");

  stars.forEach((star, index) => {
    star.classList.remove("active", "glow");

    if (index < rating) {
      star.classList.add("active");

      // 🔥 trigger glow animation
      setTimeout(() => {
        star.classList.add("glow");
      }, index * 100); // stagger effect
    }
  });

  const messages = [
    "",
    "💔 Oh no... we can do better",
    "😊 It's growing stronger",
    "❤️ Beautiful love",
    "💖 Almost perfect!",
    "💞 Perfect love story!"
  ];

  result.innerText = messages[rating];

  localStorage.setItem("loveRating", rating);
}

// LOAD SAVED RATING ON EVERY PAGE
window.addEventListener("load", () => {
  const saved = localStorage.getItem("loveRating");
  if (saved) {
    rateSite(parseInt(saved));
  }
});

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show your install button
  const installBtn = document.createElement("button");
  installBtn.innerText = "Install App ❤️";
  installBtn.style.position = "fixed";
  installBtn.style.bottom = "20px";
  installBtn.style.right = "20px";
  installBtn.style.padding = "10px 20px";
  installBtn.style.background = "#ff4b7d";
  installBtn.style.color = "white";
  installBtn.style.border = "none";
  installBtn.style.borderRadius = "20px";

  document.body.appendChild(installBtn);

  installBtn.addEventListener("click", () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
    });
  });
});

// LEVEL 1
let lucky = Math.floor(Math.random()*6);

function checkHeart(el){
  let boxes = document.querySelectorAll("#level1 .box");
  let index = Array.from(boxes).indexOf(el);

  if(index === lucky){
    el.innerHTML = "💖";
    alert("You found my heart ❤️");

    document.getElementById("level1").style.display="none";
    document.getElementById("level2").style.display="block";
  } else {
    el.innerHTML = "💔";
  }
}

// LEVEL 2
function startQuiz(){
  let q1 = prompt("Where did we first meet?");
  
  if(q1 && q1.toLowerCase() === "school"){
    alert("Correct ❤️");

    document.getElementById("level2").style.display="none";
    document.getElementById("level3").style.display="block";
  } else {
    alert("Try again my love 💕");
  }
}

// LEVEL 3
let firstCard = null;

function flipCard(el){
  el.innerHTML = "❤️";

  if(!firstCard){
    firstCard = el;
  } else {
    setTimeout(()=>{
      firstCard.innerHTML="💌";
      el.innerHTML="💌";
      firstCard = null;

      document.getElementById("level3").style.display="none";
      document.getElementById("final").style.display="block";

      startHearts(); // shared effect
      toggleMusic(); // shared music
    },1000);
  }
}

function loadMessages(){
  const chatBox = document.getElementById("chatBox");
  const messages = JSON.parse(localStorage.getItem("loveChat")) || [];

  chatBox.innerHTML = "";

  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = msg.type;
    div.innerText = msg.text;
    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage(){
  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if(text === "") return;

  let messages = JSON.parse(localStorage.getItem("loveChat")) || [];

  messages.push({ type: "sent", text: text });

  // 💖 AUTO REPLY (ROMANTIC)
  setTimeout(() => {
  const typing = document.createElement("div");
  typing.className = "received";
  typing.innerText = "Typing...";
  document.getElementById("chatBox").appendChild(typing);

  setTimeout(() => {
    typing.remove();

    const replies = [
      "I love you more ❤️",
      "You make me so happy 🥰",
      "You’re my world 🌍❤️",
      "Forever yours 💕"
    ];

    const randomReply = replies[Math.floor(Math.random() * replies.length)];

    messages.push({ type: "received", text: randomReply });

    localStorage.setItem("loveChat", JSON.stringify(messages));
    loadMessages();
  }, 1000);

}, 500);

// LOAD ON START
window.addEventListener("load", loadMessages);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/evaproject/service-worker.js')
      .then(reg => console.log("Service Worker Registered ✅", reg))
      .catch(err => console.log("Service Worker Failed ❌", err));
  });
}

window.addEventListener('appinstalled', () => {
  gtag('event', 'app_installed', {
    event_category: 'PWA',
    event_label: 'Love App'
  });
});
