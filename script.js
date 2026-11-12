/* ── Firebase (DB + Storage only, NO Firebase Auth) ── */
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
const storage = firebase.storage();

/* ── 2 hardcoded users, no registration ── */
const USERS = {
  "mr aloeva": {
    display: "Mr Aloeva 👑",
    hash: CryptoJS.SHA256("Aloysius7522").toString(),
    isAdmin: true
  },
  "mrs aloeva": {
    display: "Mrs Aloeva 💕",
    hash: CryptoJS.SHA256("Aloeva").toString(),
    isAdmin: false
  }
};

/* ── Constants ── */
const SECRET   = "aloeva_2025";
const START    = new Date("2025-06-13T00:00:00");
const PAIRS    = ["🌹","🌹","💋","💋","🎁","🎁","💍","💍"];
const PAGES    = ["home","story","memories","game"];

/* ── Session (sessionStorage = dies when tab/browser closes = no auto-login) ── */
const Session = {
  save: u  => sessionStorage.setItem("av_user", u),
  load: () => sessionStorage.getItem("av_user"),
  clear:() => sessionStorage.removeItem("av_user")
};

/* ── Helpers ── */
const el  = id => document.getElementById(id);
const dbk = s  => (s||"").replace(/[.#$[\]]/g,"-");
const enc = t  => CryptoJS.AES.encrypt(t, SECRET).toString();
const dec = c  => { try { return CryptoJS.AES.decrypt(c,SECRET).toString(CryptoJS.enc.Utf8)||c; } catch{return c;} };

/* ══════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════ */
const App = (() => {
  let WHO=null, ME=null, isAdmin=false;
  let refs=[], heartsOn=true, hTmr=null, cTmr=null;
  let lbIdx=0, lucky=Math.floor(Math.random()*6);
  let tapN=0, tapT=null, pwa=null;
  let rec=null, chunks=[], chatOk=false;

  const track=(ref,e,cb)=>{ ref.on(e,cb); refs.push({ref,e,cb}); };
  const detach=()=>{ refs.forEach(({ref,e,cb})=>ref.off(e,cb)); refs=[]; };

  /* ── LOGIN ── */

  /* ── BIOMETRIC (WebAuthn) ──────────────────────────────────
     How it works:
     1. User logs in with password first time
     2. "Save Fingerprint" button appears — tapping registers a
        credential tied to their username on THIS device
     3. Next visit: "Use Fingerprint" button shown — one tap
        verifies biometric and logs them in
     Credentials are stored ONLY on the device — never sent anywhere.
  ───────────────────────────────────────────────────────────── */

  const BIO_KEY = "aloeva_bio_user"; // localStorage key for registered username

  function bioSupported() {
    return !!(window.PublicKeyCredential &&
              navigator.credentials &&
              window.location.protocol === "https:");
  }

  function checkBioOnLoad() {
    const registeredUser = localStorage.getItem(BIO_KEY);
    if (!registeredUser || !bioSupported()) return;
    // Show biometric button, pre-fill username
    const sec = el("biometricSection");
    if (sec) sec.style.display = "block";
    const ui = el("loginUser");
    if (ui) ui.value = registeredUser === "mr aloeva" ? "Mr Aloeva" : "Mrs Aloeva";
  }

  async function registerBiometric() {
    if (!bioSupported()) {
      err("Biometric not supported on this device/browser.");
      return;
    }
    if (!WHO) return;

    const btn = el("registerBioBtn");
    if (btn) btn.textContent = "Registering…";

    try {
      // Create a credential tied to this username
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId    = new TextEncoder().encode(WHO);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Eva & Alovea", id: location.hostname },
          user: { id: userId, name: WHO, displayName: ME.display },
          pubKeyCredParams: [
            { type: "public-key", alg: -7  },  // ES256
            { type: "public-key", alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // device biometric only
            userVerification: "required"
          },
          timeout: 60000
        }
      });

      // Save credential ID + username so we can verify next time
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(BIO_KEY, WHO);
      localStorage.setItem("aloeva_cred_id", credId);

      if (btn) btn.style.display = "none";
      err("✅ Fingerprint saved! Use it next time you log in.");
      // Show bio button for next session awareness
      const sec = el("biometricSection");
      if (sec) sec.style.display = "block";

    } catch (e) {
      if (btn) btn.textContent = "🔐 Save Fingerprint for next time";
      if (e.name === "NotAllowedError") {
        err("Biometric cancelled. You can try again.");
      } else {
        err("Could not save fingerprint: " + e.message);
      }
    }
  }

  async function biometricLogin() {
    if (!bioSupported()) { err("Biometric not supported."); return; }

    const registeredUser = localStorage.getItem(BIO_KEY);
    if (!registeredUser) { err("No fingerprint registered. Please login with password first."); return; }

    const btn = el("bioBtn");
    if (btn) {
      btn.style.pointerEvents = "none";
      btn.querySelector(".bio-text").textContent = "Verifying…";
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: location.hostname,
          userVerification: "required",
          timeout: 60000
        }
      });

      // Verification passed (device confirmed biometric) — log in
      if (assertion) {
        err("");
        Session.save(registeredUser);
        boot(registeredUser);
      }

    } catch (e) {
      if (btn) {
        btn.style.pointerEvents = "";
        btn.querySelector(".bio-text").textContent = "Use Fingerprint / Face ID";
      }
      if (e.name === "NotAllowedError") {
        err("Biometric cancelled or timed out.");
      } else {
        err("Biometric failed. Please use your password.");
      }
    }
  }

  function login() {
    const u = (el("loginUser")?.value||"").trim().toLowerCase();
    const p =  el("loginPass")?.value||"";
    err("");
    if (!u||!p){ err("Enter username and password."); return; }
    const user = USERS[u];
    if (!user){ err("Unknown username. Use: Mr Aloeva or Mrs Aloeva"); return; }
    if (CryptoJS.SHA256(p).toString() !== user.hash){ err("Wrong password."); return; }
    Session.save(u);
    // Show "Save fingerprint" button if biometric supported and not yet registered
    if (bioSupported() && localStorage.getItem(BIO_KEY) !== u) {
      const rb = el("registerBioBtn");
      if (rb) rb.style.display = "flex";
    }
    boot(u);
  }

  function logout() {
    detach(); stopH(); stopC(); chatOk=false;
    Session.clear();
    if(el("loginUser")) el("loginUser").value="";
    if(el("loginPass")) el("loginPass").value="";
    err("");
    el("loginScreen").style.display="flex";
    el("app").style.display="none";
    [el("adminPanel"),el("profileModal"),el("popup")].forEach(m=>{ if(m) m.style.display="none"; });
  }

  function err(msg) {
    const d=el("loginError");
    if(!d) return;
    d.textContent=msg;
    d.style.display=msg?"block":"none";
  }

  function togglePass() {
    const i=el("loginPass"),b=el("eyeBtn");
    if(!i||!b) return;
    i.type=i.type==="password"?"text":"password";
    b.textContent=i.type==="password"?"👁️":"🙈";
  }

  /* ── BOOT after login ── */
  function boot(username) {
    WHO=username; ME=USERS[username]; isAdmin=ME.isAdmin;
    el("loginScreen").style.display="none";
    el("app").style.display="block";
    if(el("displayName")) el("displayName").textContent=ME.display;

    // load saved photo
    db.ref("profiles/"+dbk(WHO)+"/photo").once("value").then(s=>{
      const src=s.val()||"images/icon.png";
      [el("profilePhoto"),el("profileModalPhoto")].forEach(p=>{ if(p) p.src=src; });
    }).catch(()=>{});

    setOnline(true);
    listenSettings();
    listenMood();
    startH(); startC();
    startShootingStars();
    showDailyNote();
    listenStatus();
    swipe();
    sw(); pwaBtn();

    if (isAdmin) {
      setChatVisible(true);
      loadMsgs();
    } else {
      track(db.ref("settings/evaChatGranted"),"value",s=>{
        const g=s.val()===true;
        setChatVisible(g);
        if(g) loadMsgs();
      });
      track(db.ref("settings/blockedUsers/eva"),"value",s=>{
        const blocked=s.val()===true;
        const ci=el("chatInput"), sb=document.querySelector(".chat-input button"), rb=el("recBtn"), bm=el("chatBlockedMsg");
        if(ci) ci.disabled=blocked;
        if(sb) sb.disabled=blocked;
        if(rb) rb.disabled=blocked;
        if(bm) bm.style.display=blocked?"block":"none";
      });
    }

    const pg=localStorage.getItem("av_page")||"home";
    go(PAGES.includes(pg)?pg:"home");
  }

  function setChatVisible(show) {
    ["chatBox","typingStatus","chatBlockedMsg"].forEach(id=>{ const e=el(id); if(e) e.style.display=show?id==="chatBox"?"flex":"block":"none"; });
    [".chat-input",".chat-actions"].forEach(sel=>{ const e=document.querySelector(sel); if(e) e.style.display=show?"flex":"none"; });
  }

  /* ── PRESENCE ── */
  function setOnline(on) {
    if(!WHO) return;
    const r=db.ref("status/"+dbk(WHO));
    r.set({online:on,name:ME.display,lastSeen:Date.now()}).catch(()=>{});
    if(on) r.onDisconnect().set({online:false,name:ME.display,lastSeen:Date.now()});
  }

  function listenStatus() {
    track(db.ref("status"),"value",s=>{
      const data=s.val()||{}, meK=dbk(WHO), el_=el("onlineStatus");
      if(!el_) return;
      for(const k of Object.keys(data)) {
        if(k!==meK){ const d=data[k]; el_.textContent=d.online?"🟢 "+(d.name||k)+" is online":"⚫ Last seen "+new Date(d.lastSeen).toLocaleTimeString(); return; }
      }
      el_.textContent="";
    });
  }

  /* ── SETTINGS ── */
  function listenSettings() {
    track(db.ref("settings/heartsEnabled"),"value",s=>{ heartsOn=s.val()!==false; const c=el("toggleHearts"); if(c) c.checked=heartsOn; });
    track(db.ref("settings/memoriesEnabled"),"value",s=>{ const on=s.val()!==false; const l=el("memoriesLock"); if(l) l.style.display=(on||isAdmin)?"none":"flex"; const c=el("toggleMemories"); if(c) c.checked=on; });
    track(db.ref("settings/chatEnabled"),"value",s=>{ const on=s.val()!==false; const l=el("chatLock"); if(l) l.style.display=(on||isAdmin)?"none":"flex"; const c=el("toggleChat"); if(c) c.checked=on; });
    track(db.ref("settings/evaChatGranted"),"value",s=>{ const c=el("toggleEvaChat"); if(c) c.checked=s.val()===true; });
  }

  function setSetting(key,val) { if(!isAdmin) return; db.ref("settings/"+key).set(val).catch(()=>{}); }

  /* ── NAV ── */
  function go(id) {
    if(!PAGES.includes(id)) id="home";
    document.querySelectorAll("#app > section").forEach(s=>{ if(s.id!=="site-rating") s.style.display="none"; });
    const t=el(id); if(t) t.style.display="block";
    document.querySelectorAll("nav a").forEach(a=>a.classList.remove("active"));
    const lnk=el("nav-"+id); if(lnk) lnk.classList.add("active");
    const rt=el("site-rating"); if(rt) rt.style.display=(window.innerWidth<=768&&id!=="home")?"none":"block";
    localStorage.setItem("av_page",id);
  }

  function swipe() {
    let sx=0,sy=0;
    document.addEventListener("touchstart",e=>{ if(["INPUT","TEXTAREA"].includes(e.target.tagName)) return; sx=e.touches[0].clientX;sy=e.touches[0].clientY; },{passive:true});
    document.addEventListener("touchend",e=>{ if(["INPUT","TEXTAREA"].includes(e.target.tagName)) return; const dx=sx-e.changedTouches[0].clientX,dy=sy-e.changedTouches[0].clientY; if(Math.abs(dy)>Math.abs(dx)||Math.abs(dx)<80) return; const cur=PAGES.find(id=>{const s=el(id);return s&&s.style.display!=="none";})||"home"; const i=PAGES.indexOf(cur); if(dx>0&&i<PAGES.length-1) go(PAGES[i+1]); if(dx<0&&i>0) go(PAGES[i-1]); },{passive:true});
  }

  /* ── COUNTER ── */
  function startC(){ updateC(); cTmr=setInterval(updateC,1000); }
  function stopC(){ clearInterval(cTmr);cTmr=null; }
  function updateC(){
    const c=el("counter"); if(!c) return;
    const diff=Date.now()-START.getTime();
    if(diff<0){c.textContent="Our love story begins soon 💕";return;}
    const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    c.textContent=`Loved each other for ${d}d ${h}h ${m}m ${s}s ❤️`;
    updateCountdown();
  }

  /* ── COUNTDOWN to next anniversary ── */
  function updateCountdown(){
    const now=new Date();
    // Next June 13
    let next=new Date(now.getFullYear(),5,13); // June = month 5
    if(now>=next) next=new Date(now.getFullYear()+1,5,13);
    const diff=next-now;
    if(diff<0) return;
    const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    const f=(n,id)=>{ const e=el(id); if(e) e.textContent=String(n).padStart(2,"0"); };
    f(d,"cdDays"); f(h,"cdHrs"); f(m,"cdMins"); f(s,"cdSecs");
  }

  /* ── DAILY LOVE NOTE ── */
  const NOTES=[
    "Every morning I wake up grateful that you chose me. 💛",
    "You make ordinary days feel like fairy tales. 🌹",
    "I fall in love with you a little more every single day. ❤️",
    "With you, every moment is my favourite moment. ✨",
    "You are the chapter in my life I never want to end. 📖",
    "My heart only knows one direction — towards you. 💕",
    "Thank you for being my safe place in this world. 🏡",
    "You are the most beautiful thing that ever happened to me. 🌸",
    "I would choose you in a hundred lifetimes. 💫",
    "Your smile is my favourite thing to wake up to. ☀️",
    "You are my home, my peace, my everything. 🌙",
    "With you beside me, I need nothing else. 💖",
    "Every love song makes sense now that I have you. 🎵",
    "You have no idea how often I think about you. 💭",
    "Thank you for loving me exactly as I am. 🌿",
    "My life is richer, warmer, and fuller because of you. 🔥",
    "I love the way you make me laugh like no one else can. 😄",
    "You are the best thing I never saw coming. 💫",
    "With you, I am home. 🏡",
    "Every day is a gift when I spend it with you. 🎁",
    "You are my answered prayer. 🙏",
    "In all the world, there is no heart more open to me than yours. 💞",
    "You make love feel like the easiest thing in the world. 🌈",
    "I never knew what I was missing until I found you. 💛",
    "My greatest adventure is loving you. 🗺️",
    "You are the reason behind my smile every day. 😊",
    "I love you more than yesterday, less than tomorrow. 💝",
    "You are my sun on cloudy days. ☀️",
    "Thank you for being my person. 🌟",
    "You are the best love story I have ever lived. 💍",
    "My love for you grows deeper with every heartbeat. 💓",
  ];
  function showDailyNote(){
    const noteEl=el("dailyNoteText"); if(!noteEl) return;
    const day=new Date().getDate()-1; // 0–30
    noteEl.textContent=NOTES[day%NOTES.length];
  }

  /* ── MOOD / STATUS ── */
  function listenMood(){
    track(db.ref("mood"),"value",s=>{
      const data=s.val()||{};
      const disp=el("moodDisplay"), txt=el("moodText"), w=el("moodWidget");
      if(w) w.style.display="flex";
      if(disp) disp.textContent=data.emoji||"💭";
      if(txt)  txt.textContent=data.text||"thinking of you…";
    });
    // Only admin sees edit button
    if(isAdmin){ const b=el("moodBtn"); if(b) b.style.display="inline-flex"; }
  }
  function setMood(){
    if(!isAdmin) return;
    const emojis=["💭","😍","🥰","💕","🌹","✨","😊","🔥","💫","🎵"];
    const emoji=emojis[Math.floor(Math.random()*emojis.length)];
    const text=prompt("Set your mood message for Eva:");
    if(text===null||text.trim()==="") return;
    db.ref("mood").set({emoji,text:text.trim()}).catch(()=>{});
  }

  /* ── SHOOTING STARS ── */
  function startShootingStars(){
    setInterval(()=>{
      const s=document.createElement("div");
      s.className="star";
      const angle=35+Math.random()*20; // degrees
      const dist=200+Math.random()*300;
      s.style.cssText=`
        left:${Math.random()*100}vw;
        top:${Math.random()*40}vh;
        --angle:${angle}deg;
        --tx:${Math.cos(angle*Math.PI/180)*dist}px;
        --ty:${Math.sin(angle*Math.PI/180)*dist}px;
        --dur:${1.2+Math.random()*.8}s;
        --delay:0s;
      `;
      document.body.appendChild(s);
      setTimeout(()=>s.remove(),2200);
    },3000);
  }

  /* ── MUSIC ── */
  function toggleMusic(){ const m=el("bgMusic"),b=el("musicBtn"); if(!m||!b) return; if(m.paused){m.play().catch(()=>{});b.textContent="🎵 Pause Music";}else{m.pause();b.textContent="🎵 Play Music";} }

  /* ── POPUP ── */
  function showPopup(){ const p=el("popup");if(p) p.style.display="flex"; }
  function closePopup(){ const p=el("popup");if(p) p.style.display="none"; }

  /* ── HEARTS ── */
  function startH(){
    if(hTmr) return;
    // 1400ms interval (was 700) + max 8 hearts at once — halves DOM work
    hTmr=setInterval(()=>{
      if(!heartsOn) return;
      if(document.querySelectorAll(".heart").length >= 8) return; // cap
      const h=document.createElement("div");
      h.className="heart"; h.textContent=["❤️","💕","🌹","💗"][Math.floor(Math.random()*4)];
      h.setAttribute("aria-hidden","true");
      h.style.left=Math.random()*100+"vw";
      h.style.fontSize=(12+Math.random()*18)+"px";
      h.style.willChange="transform"; // GPU layer while animating
      document.body.appendChild(h);
      setTimeout(()=>{ h.style.willChange="auto"; h.remove(); },7000);
    },1400);
  }
  function stopH(){ clearInterval(hTmr);hTmr=null;document.querySelectorAll(".heart").forEach(h=>h.remove()); }

  /* ── RATING ── */
  function rate(n){ document.querySelectorAll(".rating-stars span").forEach((s,i)=>s.classList.toggle("active",i<n)); const msgs=["","💔 We can do better","😊 Getting stronger","❤️ Beautiful love","💖 Almost perfect","💞 Perfect love"]; const r=el("ratingResult");if(r) r.textContent=msgs[n]||""; }

  /* ── LIGHTBOX ── */
  function openLightbox(img){ const all=Array.from(document.querySelectorAll(".gallery img")); lbIdx=all.indexOf(img); const li=el("lb-img"); if(li){li.src=img.src;li.alt=img.alt;} const lb=el("lightbox");if(lb) lb.style.display="flex"; document.body.style.overflow="hidden"; }
  function closeLightbox(){ const lb=el("lightbox");if(lb) lb.style.display="none"; document.body.style.overflow=""; }
  function nextImg(){ moveLB(1); }
  function prevImg(){ moveLB(-1); }
  function moveLB(d){ const all=document.querySelectorAll(".gallery img");if(!all.length) return; lbIdx=(lbIdx+d+all.length)%all.length; const li=el("lb-img");if(li){li.src=all[lbIdx].src;li.alt=all[lbIdx].alt;} }

  /* ── PROFILE ── */
  function headerTap(){ tapN++;clearTimeout(tapT);tapT=setTimeout(()=>{ if(tapN>=3&&isAdmin) openAdmin(); else openProfile(); tapN=0; },400); }
  function openProfile(){ const m=el("profileModal");if(!m) return; const pp=el("profilePhoto"),dn=el("displayName"),mp=el("profileModalPhoto"),mn=el("profileModalName"); if(mp&&pp) mp.src=pp.src; if(mn&&dn) mn.textContent=dn.textContent; m.style.display="flex"; }
  function closeProfile(){ const m=el("profileModal");if(m) m.style.display="none"; }

  function changePhoto(){
    if(!WHO) return; const fi=el("photoInput"); if(!fi) return; fi.click();
    fi.onchange=async()=>{
      const file=fi.files[0];if(!file) return; const st=el("recStatus"); if(st) st.textContent="Uploading…";
      try{ const r=storage.ref("photos/"+dbk(WHO)+".jpg"); await r.put(file); const url=await r.getDownloadURL(); await db.ref("profiles/"+dbk(WHO)).update({photo:url}); [el("profilePhoto"),el("profileModalPhoto")].forEach(p=>{if(p)p.src=url;}); if(st) st.textContent="✔ Updated"; setTimeout(()=>{if(st)st.textContent="";},2500); }
      catch(e){ if(st) st.textContent="❌ Failed"; }
      fi.value="";
    };
  }

  /* ── CHAT ── */
  function loadMsgs(){
    const box=el("chatBox");if(!box) return;
    track(db.ref("messages"),"value",snap=>{
      box.innerHTML=""; const me=ME.display;
      snap.forEach(ch=>{ const msg=ch.val(),key=ch.key; const w=document.createElement("div"); w.className="msg "+(msg.user===me?"sent":"received"); const nm=document.createElement("small");nm.className="msg-name";nm.textContent=msg.user||"?";w.appendChild(nm); if(msg.voice){const a=document.createElement("audio");a.controls=true;a.src=msg.voice;w.appendChild(a);}else if(msg.text){const sp=document.createElement("span");sp.textContent=dec(msg.text);w.appendChild(sp);} if(msg.user===me){const tk=document.createElement("small");tk.className="msg-tick";tk.textContent=msg.seen?"✔✔":"✔";w.appendChild(tk);} if(msg.user!==me&&!msg.seen) db.ref("messages/"+key).update({seen:true}).catch(()=>{}); box.appendChild(w); });
      box.scrollTop=box.scrollHeight;
    });
    chatListeners();
  }

  function chatListeners(){
    if(chatOk) return; chatOk=true;
    const inp=el("chatInput"),rb=el("recBtn");
    if(inp){ inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}); inp.addEventListener("input",()=>{ db.ref("typing").set({user:ME.display,typing:true}).catch(()=>{}); clearTimeout(inp._t); inp._t=setTimeout(()=>db.ref("typing").set({user:ME.display,typing:false}).catch(()=>{}),1500); }); }
    track(db.ref("typing"),"value",s=>{ const d=s.val(),ts=el("typingStatus"); if(ts) ts.textContent=(d?.typing&&d.user!==ME.display)?d.user+" is typing…":""; });
    if(rb){ rb.addEventListener("mousedown",startRec); rb.addEventListener("mouseup",stopRec); rb.addEventListener("touchstart",e=>{e.preventDefault();startRec();},{passive:false}); rb.addEventListener("touchend",e=>{e.preventDefault();stopRec();},{passive:false}); }
  }

  function sendMsg(){ if(!WHO||!ME) return; const inp=el("chatInput");if(!inp) return; const t=inp.value.trim();if(!t) return; if(inp.disabled){alert("Restricted 🚫");return;} db.ref("messages").push({text:enc(t),user:ME.display,time:Date.now(),seen:false}).catch(e=>alert(e.message)); inp.value=""; }

  function startRec(){ if(!WHO) return; navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{ chunks=[];rec=new MediaRecorder(stream);rec.start();rec.ondataavailable=e=>chunks.push(e.data); const rb=el("recBtn"),st=el("recStatus"); if(rb){rb.style.background="#c62828";rb.textContent="🔴 Recording…";} if(st) st.textContent="Release to send"; }).catch(()=>alert("Mic denied ❌")); }
  function stopRec(){ if(!rec||rec.state==="inactive") return; rec.stop(); const rb=el("recBtn"),st=el("recStatus"); if(rb){rb.style.background="";rb.textContent="🎤 Hold to Record";} if(st) st.textContent="Uploading…"; rec.onstop=async()=>{ const blob=new Blob(chunks,{type:"audio/webm"}); try{ const r=storage.ref("voices/"+Date.now()+".webm"); await r.put(blob); const url=await r.getDownloadURL(); await db.ref("messages").push({voice:url,user:ME.display,time:Date.now()}); if(st) st.textContent="✔ Sent"; setTimeout(()=>{if(st)st.textContent="";},2500); }catch(e){if(st) st.textContent="❌ Failed";} }; }

  /* ── ADMIN ── */
  function openAdmin(){ if(!isAdmin) return; const p=el("adminPanel");if(!p) return; p.style.display="flex"; const b=el("adminBadge");if(b) b.textContent=ME.display; loadUsers(); loadMsgCnt(); }
  function closeAdmin(){ const p=el("adminPanel");if(p) p.style.display="none"; }

  function adminTab(tab,btn){ document.querySelectorAll(".atab-panel").forEach(t=>t.style.display="none"); document.querySelectorAll(".atab").forEach(t=>t.classList.remove("active")); const c=el("adminTab-"+tab);if(c) c.style.display="block"; btn.classList.add("active"); if(tab==="users") loadUsers(); if(tab==="chats") loadMsgCnt(); }

  function loadUsers(){
    const list=el("adminUserList");if(!list) return; list.innerHTML='<p class="aload">Loading…</p>';
    Promise.all([db.ref("settings/blockedUsers/eva").once("value"),db.ref("settings/evaChatGranted").once("value"),db.ref("status").once("value"),db.ref("profiles").once("value")])
    .then(([blk,gnt,sts,prof])=>{
      const blocked=blk.val()===true, granted=gnt.val()===true, statuses=sts.val()||{}, profiles=prof.val()||{};
      list.innerHTML="";
      Object.entries(USERS).forEach(([uname,user])=>{
        const k=dbk(uname),st=statuses[k]||{},online=!!st.online,last=st.lastSeen?new Date(st.lastSeen).toLocaleTimeString():"Never";
        const photo=profiles[k]?.photo||"images/icon.png";
        const card=document.createElement("div"); card.className="auser-card";
        card.innerHTML=`<img src="${photo}" alt="" onerror="this.src='images/icon.png'"><div class="auser-info"><strong>${user.display}</strong><span style="color:${online?"#4caf50":"var(--muted)"}">${online?"🟢 Online":"⚫ "+last}</span></div>${user.isAdmin?'<span class="admin-badge">👑 Admin</span>':`<div class="auser-btns"><button class="atoggle ${granted?"ung":"blk"}" id="g_${k}">${granted?"💬 Revoke":"✅ Grant Chat"}</button><button class="atoggle ${blocked?"ung":"blk"}" id="b_${k}">${blocked?"🔓 Unblock":"🚫 Block"}</button></div>`}`;
        if(!user.isAdmin){
          card.querySelector("#g_"+k)?.addEventListener("click",()=>{ setSetting("evaChatGranted",!granted); setTimeout(loadUsers,600); });
          card.querySelector("#b_"+k)?.addEventListener("click",()=>{ db.ref("settings/blockedUsers/eva").set(!blocked).then(()=>setTimeout(loadUsers,600)).catch(e=>alert(e.message)); });
        }
        list.appendChild(card);
      });
    }).catch(e=>{ list.innerHTML=`<p class="aload" style="color:#ff7070">❌ ${e.message}<br><small>Update Firebase rules — see instructions.</small></p>`; });
  }

  function loadMsgCnt(){ const s=el("adminMsgCount");if(!s) return; db.ref("messages").once("value").then(sn=>{s.textContent="📨 Total: "+sn.numChildren();}).catch(()=>{s.textContent="Check Firebase rules.";}); }
  function clearMsgs(){ if(!isAdmin||!confirm("Delete ALL messages?")) return; db.ref("messages").remove().then(()=>{alert("Cleared ✔");loadMsgCnt();}).catch(e=>alert(e.message)); }

  /* ── LOVE QUESTIONS GAME ── */
  const qAnswers = {};      // stores answers from each question
  let bouncingBtn = null;   // the roaming NO button for Q2
  let bounceRAF   = null;   // requestAnimationFrame id

  function qAnswer(step, answer) {
    // Save answer
    qAnswers[step] = answer;

    // Kill bouncing button if active
    if (bouncingBtn) {
      cancelAnimationFrame(bounceRAF);
      bouncingBtn.remove();
      bouncingBtn = null;
    }

    // Update progress dots
    const dot = el('dot' + step);
    if (dot) { dot.classList.remove('active'); dot.classList.add('done'); }

    if (step === 2) {
      // Final question answered — stop drift, show date picker
      if (shyRAF) { cancelAnimationFrame(shyRAF); shyRAF = null; }
      el('q2').style.display = 'none';
      el('datePicker').style.display = 'block';
      spawnConfetti();
      return;
    }

    // Move to next question
    el('q' + step).style.display = 'none';
    const next = el('q' + (step + 1));
    if (next) {
      next.style.display = 'block';
      const nd = el('dot' + (step + 1));
      if (nd) nd.classList.add('active');

      // Q2 gets the bouncing NO button
      if (step + 1 === 1) spawnBouncingNo();
      // Q3 gets the shy NO button (cursor-triggered, stays in card)
      if (step + 1 === 2) setTimeout(initShyBtn, 50);
    }
  }

  /* ── SHY BUTTON for Q3: drifts slowly along the top, slides away on click ── */
  let shyRAF = null;
  let shyX = 0, shyVX = 0.4; // slow drift speed

  function initShyBtn() {
    const btn  = el('shyNoBtn');
    const card = el('q2');
    if (!btn || !card) return;

    // Switch to absolute so it can move freely inside the card
    btn.style.position = 'absolute';
    btn.style.top      = '14px';   // stays near the top
    btn.style.left     = '10px';
    btn.style.right    = 'auto';
    btn.style.margin   = '0';
    btn.style.zIndex   = '10';

    shyX  = 10;
    shyVX = 0.5; // pixels per frame — slow drift

    function drift() {
      const cardW = card.offsetWidth  || 300;
      const btnW  = btn.offsetWidth   || 130;
      const margin = 10;
      const maxX   = cardW - btnW - margin;

      shyX += shyVX;

      // Bounce at edges
      if (shyX >= maxX) { shyX = maxX; shyVX = -Math.abs(shyVX); }
      if (shyX <= margin) { shyX = margin; shyVX =  Math.abs(shyVX); }

      btn.style.left = shyX + 'px';
      shyRAF = requestAnimationFrame(drift);
    }

    // Cancel any previous RAF
    if (shyRAF) cancelAnimationFrame(shyRAF);
    shyRAF = requestAnimationFrame(drift);
  }

  function shyMove(btn, event) {
    // On click/touch — burst away horizontally, stay at top
    const card = el('q2');
    if (!card) return;

    const cRect = card.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : (event.clientX || cRect.left + cRect.width/2);
    const px = clientX - cRect.left;
    const btnCentreX = shyX + (btn.offsetWidth / 2);

    // Slide away from cursor — but keep drifting after
    const dx = btnCentreX - px;
    const burst = dx > 0 ? 60 : -60;

    const cardW = card.offsetWidth  || 300;
    const btnW  = btn.offsetWidth   || 130;
    const margin = 10;

    shyX = Math.max(margin, Math.min(shyX + burst, cardW - btnW - margin));
    // Reverse drift direction toward the burst direction
    shyVX = burst > 0 ? Math.abs(shyVX) : -Math.abs(shyVX);
    btn.style.left = shyX + 'px';
  }

  /* Create a NO button that continuously bounces around the viewport */
  function spawnBouncingNo() {    if (bouncingBtn) return;

    const btn = document.createElement('button');
    btn.className   = 'q-no-bounce';
    btn.textContent = "I'll be busy… 😬";
    btn.setAttribute('aria-label', 'No button');

    // Start at a random spot
    let x = window.innerWidth  * 0.6;
    let y = window.innerHeight * 0.5;
    let vx = 3.5 + Math.random() * 2;   // velocity x
    let vy = 2.5 + Math.random() * 2;   // velocity y

    btn.style.left = x + 'px';
    btn.style.top  = y + 'px';
    document.body.appendChild(btn);
    bouncingBtn = btn;

    // Clicking it also saves "no" and continues
    btn.addEventListener('click', () => {
      qAnswers[1] = "I'll be busy… 😬 (but she tried to catch it!)";
      cancelAnimationFrame(bounceRAF);
      btn.remove();
      bouncingBtn = null;
      // advance to Q3
      el('q1').style.display = 'none';
      el('q2').style.display = 'block';
      const nd = el('dot2');
      if (nd) { el('dot1').classList.remove('active'); el('dot1').classList.add('done'); nd.classList.add('active'); }
    });

    function animate() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const bw = btn.offsetWidth  || 160;
      const bh = btn.offsetHeight || 50;

      x += vx;
      y += vy;

      // Bounce off edges
      if (x <= 10)        { x = 10;        vx = Math.abs(vx) + (Math.random() * 0.5); }
      if (x >= W - bw - 10) { x = W - bw - 10; vx = -(Math.abs(vx) + (Math.random() * 0.5)); }
      if (y <= 70)        { y = 70;        vy = Math.abs(vy) + (Math.random() * 0.5); }
      if (y >= H - bh - 10) { y = H - bh - 10; vy = -(Math.abs(vy) + (Math.random() * 0.5)); }

      // Cap speed so it doesn't get insane
      vx = Math.sign(vx) * Math.min(Math.abs(vx), 7);
      vy = Math.sign(vy) * Math.min(Math.abs(vy), 6);

      btn.style.left = x + 'px';
      btn.style.top  = y + 'px';

      bounceRAF = requestAnimationFrame(animate);
    }
    bounceRAF = requestAnimationFrame(animate);
  }

  /* Confetti burst */
  function spawnConfetti() {
    const container = el('confetti');
    if (!container) return;
    const colors = ['#e8b84b','#c0392b','#fff','#f5d78e','#ff6b6b','#ffd700'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.cssText = `left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};--dur:${1.5+Math.random()*2}s;--delay:${Math.random()*1.5}s;width:${5+Math.random()*8}px;height:${5+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};`;
      container.appendChild(p);
    }
    setTimeout(() => { if (container) container.innerHTML = ''; }, 4500);
  }

  /* Confirm date — build WhatsApp message with ALL answers */
  function confirmDate() {
    const dateVal = el('dateInput')?.value;
    const timeVal = el('timeInput')?.value;
    if (!dateVal) { alert('Please pick a date first 📅'); return; }
    if (!timeVal) { alert('Please choose a time ⏰'); return; }

    const d = new Date(dateVal + 'T12:00:00');
    const formatted = d.toLocaleDateString('en-KE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const a0 = qAnswers[0] || 'No answer';
    const a1 = qAnswers[1] || 'No answer';

    const msg = encodeURIComponent(
      `💕 Hey Alovea! I answered your questions!\n\n` +
      `💍 Will you be my girl forever?\n   → ${a0}\n\n` +
      `🎓 Will you attend my graduation?\n   → ${a1}\n\n` +
      `🌹 Will you go on a date with me?\n   → YES! Let's go! 🌹\n\n` +
      `📅 Our date: ${formatted}\n` +
      `⏰ Time: ${timeVal}\n\n` +
      `I can't wait! 🌹❤️`
    );

    window.open(`https://wa.me/254714782090?text=${msg}`, '_blank');
  }

  /* runAway kept for backward compat but no longer used */
  function runAway() {}
  /* ── PWA ── */
  function sw(){ if("serviceWorker"in navigator) navigator.serviceWorker.register("./service-worker.js").catch(()=>{}); }
  function pwaBtn(){ const btn=document.createElement("button");btn.id="installBtn";btn.textContent="📲 Install";btn.setAttribute("aria-label","Install app");document.body.appendChild(btn); if(window.matchMedia("(display-mode: standalone)").matches){btn.style.display="none";return;} window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();pwa=e;}); window.addEventListener("appinstalled",()=>{btn.style.display="none";pwa=null;}); btn.addEventListener("click",()=>{if(pwa){pwa.prompt();pwa.userChoice.then(()=>{pwa=null;btn.style.display="none"});}else{const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);alert(ios?"iPhone: tap Share → Add to Home Screen":"Android: tap ⋮ → Add to Home screen");}}); }

  /* ── DOM READY ── */
  document.addEventListener("DOMContentLoaded",()=>{
    // Check if biometric is registered for this device
    checkBioOnLoad();
    // ── Splash → Login transition ──
    // Splash fades at 1.8s — show login at 2.1s
    setTimeout(() => {
      const ls = el("loginScreen");
      if (ls) ls.classList.add("visible");
      const sp = el("splash");
      if (sp) setTimeout(() => sp.remove(), 300);
    }, 2100);

    const saved=Session.load();
    if(saved&&USERS[saved]){
      // Already logged in — remove splash immediately, go to app
      const sp=el("splash"); if(sp) sp.remove();
      boot(saved);
    }
    else{
      Session.clear();
      // Login screen becomes visible after splash fades (handled by setTimeout above)
    }

    ["loginUser","loginPass"].forEach(id=>{ const i=el(id);if(i) i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();login();}}); });
    document.addEventListener("keydown",e=>{ if(e.key!=="Escape") return; closeLightbox();closeProfile();closeAdmin();closePopup(); });
    document.addEventListener("click",e=>{ if(e.target===el("profileModal")) closeProfile(); if(e.target===el("adminPanel")) closeAdmin(); if(e.target===el("popup")) closePopup(); if(e.target===el("lightbox")) closeLightbox(); });
    const lb=el("lightbox"); if(lb){ let sx=0; lb.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;},{passive:true}); lb.addEventListener("touchend",e=>{const dx=sx-e.changedTouches[0].clientX;if(dx>50)nextImg();if(dx<-50)prevImg();},{passive:true}); }
  });

  return { login,logout,togglePass, registerBiometric, biometricLogin, go,toggleMusic,showPopup,closePopup,rate, openLightbox,closeLightbox,nextImg,prevImg, headerTap,openProfile,closeProfile,changePhoto, sendMsg, openAdmin,closeAdmin,adminTab,clearMsgs,setSetting, qAnswer,shyMove,runAway,confirmDate, setMood };
})();
