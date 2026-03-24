// =============================
// 🔐 FIREBASE INIT
// =============================
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
const auth = firebase.auth();
const statusRef = db.ref("status");

// =============================
// 🧹 FIX INVALID FIREBASE KEYS
// =============================
function sanitizeKey(key){
  return key.replace(/[.#$[\]]/g, "-");
}

// =============================
// 👤 USERNAME FIX
// =============================
if(!localStorage.getItem("username")){
  let name = prompt("Enter your name ❤️");
  localStorage.setItem("username", name || "Anonymous");
}

// =============================
// 🔄 LOGIN / REGISTER
// =============================
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
    .catch(err => alert(err.message));
}

// =============================
// 🔄 AUTH STATE
// =============================
auth.onAuthStateChanged(user=>{
  const loginBox = document.getElementById("loginBox");
  const chat = document.getElementById("chat");

  if(user){
    loginBox.style.display = "none";
    chat.style.display = "block";

    setOnline();
    loadMessages();
  } else {
    loginBox.style.display = "block";
    chat.style.display = "none";
  }
});

// =============================
// 💬 LOAD MESSAGES
// =============================
function loadMessages(){
  const chatBox = document.getElementById("chatBox");
  const currentUser = localStorage.getItem("username");

  db.ref("messages").on("child_added", snapshot=>{
    const msg = snapshot.val();
    const key = snapshot.key;

    const div = document.createElement("div");
    div.className = (msg.user === currentUser) ? "sent" : "received";

    // NAME
    const name = document.createElement("small");
    name.innerText = msg.user || "Anonymous";
    name.style.fontWeight = "bold";
    name.style.display = "block";

    div.appendChild(name);

    // MESSAGE
    if(msg.voice){
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = msg.voice;
      div.appendChild(audio);
    } else {
      let textValue = msg.text;

      try {
        textValue = decrypt(msg.text);
      } catch {}

      const text = document.createElement("span");
      text.innerText = textValue;
      div.appendChild(text);
    }

    // ✔✔
    if(msg.user === currentUser){
      const tick = document.createElement("small");
      tick.innerText = msg.seen ? "✔✔" : "✔";
      div.appendChild(tick);
    }

    // mark seen
    if(msg.user !== currentUser && !msg.seen){
      db.ref("messages/" + key).update({ seen:true });
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// =============================
// 📤 SEND MESSAGE (FIXED)
// =============================
function sendMessage(){
  if(!auth.currentUser){
    alert("Login first 🔒");
    return;
  }

  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if(!text) return;

  const username = localStorage.getItem("username");

  db.ref("messages").push({
    text: encrypt(text),
    user: username,
    time: Date.now(),
    seen: false
  });

  input.value = "";
}

// =============================
// 🔐 ENCRYPTION
// =============================
const SECRET_KEY = "aloeva123.";

function encrypt(text){
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decrypt(cipher){
  return CryptoJS.AES.decrypt(cipher, SECRET_KEY).toString(CryptoJS.enc.Utf8);
}

// =============================
// 🌐 ONLINE STATUS
// =============================
function setOnline(){
  const email = auth.currentUser.email;
  const userKey = sanitizeKey(email);

  statusRef.child(userKey).set({
    online: true,
    lastSeen: Date.now()
  });

  window.addEventListener("beforeunload", ()=>{
    statusRef.child(userKey).set({
      online: false,
      lastSeen: Date.now()
    });
  });
}

// =============================
// ✍️ TYPING (FIXED)
// =============================
const typingRef = db.ref("typing");

const chatInput = document.getElementById("chatInput");

if(chatInput){
  chatInput.addEventListener("input", ()=>{
    const user = sanitizeKey(localStorage.getItem("username"));

    typingRef.child(user).set({ typing:true });

    setTimeout(()=>{
      typingRef.child(user).set({ typing:false });
    },1500);
  });
}

typingRef.on("value", snapshot=>{
  const data = snapshot.val();
  const typingDiv = document.getElementById("typingStatus");
  const currentUser = sanitizeKey(localStorage.getItem("username"));

  let typingUser = "";

  for(let user in data){
    if(user !== currentUser && data[user].typing){
      typingUser = user;
    }
  }

  typingDiv.innerText = typingUser ? typingUser + " is typing..." : "";
});

// =============================
// 🎤 VOICE (SAFE VERSION)
// =============================
let mediaRecorder, audioChunks = [];

function startRecording(){
  navigator.mediaDevices.getUserMedia({audio:true})
    .then(stream=>{
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      audioChunks = [];

      mediaRecorder.ondataavailable = e=>{
        audioChunks.push(e.data);
      };
    });
}

function stopRecording(){
  if(!mediaRecorder) return;

  mediaRecorder.stop();

  mediaRecorder.onstop = ()=>{
    const blob = new Blob(audioChunks, { type:"audio/webm" });

    // ⚠️ STORAGE DISABLED (FREE PLAN ISSUE)
    alert("Voice upload needs Firebase Blaze plan ⚠️");
  };
}

// =============================
// 🖼️ LIGHTBOX (FIXED)
// =============================
let currentIndex = 0;

function openLightbox(img){
  const box = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-img");

  box.style.display = "flex";
  image.src = img.src;

  const images = document.querySelectorAll(".gallery img");
  currentIndex = Array.from(images).indexOf(img);
}

function closeLightbox(){
  document.getElementById("lightbox").style.display = "none";
}

function nextImage(){
  const images = document.querySelectorAll(".gallery img");

  currentIndex = (currentIndex + 1) % images.length;

  document.getElementById("lightbox-img").src =
    images[currentIndex].src;
}

function prevImage(){
  const images = document.querySelectorAll(".gallery img");

  currentIndex =
    (currentIndex - 1 + images.length) % images.length;

  document.getElementById("lightbox-img").src =
    images[currentIndex].src;
}
