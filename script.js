// SECTION SWITCHING
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/evaproject/service-worker.js')
    .then(() => console.log("Service Worker Registered"));
}

function showSection(id){
  const sections = document.querySelectorAll("section");

  sections.forEach(sec => {
    if(sec.id !== "site-rating"){   // 🚨 don't hide rating
      sec.style.display = "none";
    }
  });

  document.getElementById(id).style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("loveRating");
  if (saved) {
    rateSite(parseInt(saved));
  }
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

const CACHE_NAME = "love-app-v1";
const urlsToCache = [
  "/",
  "/index1.html",
  "/style.css",
  "/script1.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
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
