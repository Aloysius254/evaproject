// =============================
// 🔐 FIREBASE INIT
// =============================
const firebaseConfig = {
  apiKey: "AIzaSyCDjfXhTYoAqhUCTMbrOB5uiZeU7dDqgbo",
  authDomain: "aloeva-chatbot.firebaseapp.com",
  databaseURL: "https://aloeva-chatbot-default-rtdb.firebaseio.com",
  projectId: "aloeva-chatbot",
  storageBucket: "aloeva-chatbot.firebasestorage.app"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();
const statusRef = db.ref("status");

// =============================
// 👤 USERNAME
// =============================
if(!localStorage.getItem("username")){
  const name = prompt("Enter your name ❤️");
  localStorage.setItem("username", name || "Anonymous");
}

// =============================
// 🔄 AUTH
// =============================
function register(){
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(()=> alert("Account created ❤️"))
    .catch(err => alert(err.message));
}

function login(){
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .catch(err => alert(err.message));
}

auth.onAuthStateChanged(user=>{
  document.getElementById("loginBox").style.display = user ? "none" : "block";
  document.getElementById("chat").style.display = user ? "block" : "none";

  if(user){
    setOnline();
    loadMessages();
  }
});

// =============================
// 💬 LOAD MESSAGES (FAST)
// =============================
function loadMessages(){
  const chatBox = document.getElementById("chatBox");
  const currentUser = localStorage.getItem("username");

  db.ref("messages").limitToLast(50).on("child_added", snapshot=>{
    const msg = snapshot.val();
    const key = snapshot.key;

    const div = document.createElement("div");
    div.className = msg.user === currentUser ? "sent" : "received";

    // NAME
    const name = document.createElement("small");
    name.innerText = msg.user || "Anonymous";
    name.style.fontWeight = "bold";

    // TEXT
    const text = document.createElement("span");
    text.innerText = decryptSafe(msg.text);

    div.appendChild(name);
    div.appendChild(text);

    // ✔✔
    if(msg.user === currentUser){
      const tick = document.createElement("small");
      tick.innerText = msg.seen ? "✔✔" : "✔";
      div.appendChild(tick);
    }

    // seen
    if(msg.user !== currentUser && !msg.seen){
      db.ref("messages/"+key).update({seen:true});
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// =============================
// 📤 SEND MESSAGE
// =============================
function sendMessage(){
  if(!auth.currentUser) return alert("Login first");

  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if(!text) return;

  db.ref("messages").push({
    text: encrypt(text),
    user: localStorage.getItem("username"),
    seen: false,
    time: Date.now()
  });

  input.value = "";
}

// =============================
// 🔐 ENCRYPTION SAFE
// =============================
const KEY = "aloeva123";

function encrypt(txt){
  return CryptoJS.AES.encrypt(txt, KEY).toString();
}

function decryptSafe(txt){
  try{
    return CryptoJS.AES.decrypt(txt, KEY).toString(CryptoJS.enc.Utf8) || txt;
  }catch{
    return txt;
  }
}

// =============================
// 🌐 ONLINE STATUS
// =============================
function setOnline(){
  const key = auth.currentUser.email.replace(/[.#$[\]]/g, "-");

  statusRef.child(key).set({
    online:true,
    lastSeen:Date.now()
  });

  window.addEventListener("beforeunload", ()=>{
    statusRef.child(key).set({
      online:false,
      lastSeen:Date.now()
    });
  });
}

// =============================
// ✍️ TYPING
// =============================
const typingRef = db.ref("typing");

chatInput.addEventListener("input", ()=>{
  const user = localStorage.getItem("username");

  typingRef.set({user, typing:true});

  setTimeout(()=>{
    typingRef.set({user, typing:false});
  },1500);
});

typingRef.on("value", snap=>{
  const data = snap.val();
  const div = document.getElementById("typingStatus");

  if(data && data.typing && data.user !== localStorage.getItem("username")){
    div.innerText = data.user + " is typing...";
  } else {
    div.innerText = "";
  }
});

// =============================
// 🖼️ SLIDESHOW (FIXED)
// =============================
let images = [];
let index = 0;

function openLightbox(img){
  images = Array.from(document.querySelectorAll(".gallery img"));
  index = images.indexOf(img);

  if(index < 0) index = 0;

  const box = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-img");

  box.style.display = "flex";
  image.src = images[index].src;
}

function nextImage(){
  if(images.length === 0) return;

  index = (index + 1) % images.length;
  document.getElementById("lightbox-img").src = images[index].src;
}

function prevImage(){
  if(images.length === 0) return;

  index = (index - 1 + images.length) % images.length;
  document.getElementById("lightbox-img").src = images[index].src;
}

function closeLightbox(){
  document.getElementById("lightbox").style.display = "none";
}

// =============================
// ❤️ PERFORMANCE FIX
// =============================
setInterval(createHeart,1500);

function createHeart(){
  const heart = document.createElement("div");
  heart.innerHTML = "❤️";
  heart.className = "heart";
  heart.style.left = Math.random()*100 + "vw";

  document.body.appendChild(heart);

  setTimeout(()=>heart.remove(),4000);
}
