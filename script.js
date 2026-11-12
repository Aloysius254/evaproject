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
  function login() {
    const u = (el("loginUser")?.value||"").trim().toLowerCase();
    const p =  el("loginPass")?.value||"";
    err("");
    if (!u||!p){ err("Enter username and password."); return; }
    const user = USERS[u];
    if (!user){ err("Unknown username. Use: Mr Aloeva or Mrs Aloeva"); return; }
    if (CryptoJS.SHA256(p).toString() !== user.hash){ err("Wrong password."); return; }
    Session.save(u);
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
    startH(); startC();
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
  function updateC(){ const c=el("counter"); if(!c) return; const diff=Date.now()-START.getTime(); if(diff<0){c.textContent="Our love story begins soon 💕";return;} const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000); c.textContent=`Loved each other for ${d}d ${h}h ${m}m ${s}s ❤️`; }

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

  /* ── GAME ── */
  function checkHeart(box){ const boxes=Array.from(document.querySelectorAll("#level1 .box")); if(boxes.indexOf(box)===lucky){box.textContent="💖";setTimeout(()=>{alert("You found my heart ❤️");el("level1").style.display="none";el("level2").style.display="block";},200);}else{box.textContent="💔";box.style.pointerEvents="none";} }
  function startQuiz(){ const a=prompt("Where did we first meet?"); if(a&&a.trim().toLowerCase()==="school"){alert("Correct ❤️");el("level2").style.display="none";el("level3").style.display="block";buildMemory();}else{alert("Try again 💕");} }

  let flipped=[],matched=0,lock=false;
  function buildMemory(){ const g=el("memoryGrid");if(!g) return; const sh=[...PAIRS].sort(()=>Math.random()-0.5); g.innerHTML="";matched=0;flipped=[];lock=false; sh.forEach(e=>{const b=document.createElement("div");b.className="box";b.dataset.v=e;b.textContent="💌";b.setAttribute("role","button");b.setAttribute("tabindex","0");b.addEventListener("click",()=>flip(b));b.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" ")flip(b);});g.appendChild(b);}); }
  function flip(b){ if(lock||b.classList.contains("matched")||flipped.includes(b)) return; b.textContent=b.dataset.v;flipped.push(b); if(flipped.length===2){lock=true; if(flipped[0].dataset.v===flipped[1].dataset.v){flipped.forEach(c=>c.classList.add("matched"));matched++;flipped=[];lock=false;if(matched===PAIRS.length/2){setTimeout(()=>{el("level3").style.display="none";el("gameFinal").style.display="block";},500);}}else{setTimeout(()=>{flipped.forEach(c=>c.textContent="💌");flipped=[];lock=false;},900);}}}

  /* ── PWA ── */
  function sw(){ if("serviceWorker"in navigator) navigator.serviceWorker.register("./service-worker.js").catch(()=>{}); }
  function pwaBtn(){ const btn=document.createElement("button");btn.id="installBtn";btn.textContent="📲 Install";btn.setAttribute("aria-label","Install app");document.body.appendChild(btn); if(window.matchMedia("(display-mode: standalone)").matches){btn.style.display="none";return;} window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();pwa=e;}); window.addEventListener("appinstalled",()=>{btn.style.display="none";pwa=null;}); btn.addEventListener("click",()=>{if(pwa){pwa.prompt();pwa.userChoice.then(()=>{pwa=null;btn.style.display="none"});}else{const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);alert(ios?"iPhone: tap Share → Add to Home Screen":"Android: tap ⋮ → Add to Home screen");}}); }

  /* ── DOM READY ── */
  document.addEventListener("DOMContentLoaded",()=>{
    const saved=Session.load();
    if(saved&&USERS[saved]){ boot(saved); }
    else{ Session.clear(); el("loginScreen").style.display="flex"; el("app").style.display="none"; }

    ["loginUser","loginPass"].forEach(id=>{ const i=el(id);if(i) i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();login();}}); });
    document.addEventListener("keydown",e=>{ if(e.key!=="Escape") return; closeLightbox();closeProfile();closeAdmin();closePopup(); });
    document.addEventListener("click",e=>{ if(e.target===el("profileModal")) closeProfile(); if(e.target===el("adminPanel")) closeAdmin(); if(e.target===el("popup")) closePopup(); if(e.target===el("lightbox")) closeLightbox(); });
    const lb=el("lightbox"); if(lb){ let sx=0; lb.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;},{passive:true}); lb.addEventListener("touchend",e=>{const dx=sx-e.changedTouches[0].clientX;if(dx>50)nextImg();if(dx<-50)prevImg();},{passive:true}); }
  });

  return { login,logout,togglePass, go,toggleMusic,showPopup,closePopup,rate, openLightbox,closeLightbox,nextImg,prevImg, headerTap,openProfile,closeProfile,changePhoto, sendMsg, openAdmin,closeAdmin,adminTab,clearMsgs,setSetting, checkHeart,startQuiz };
})();
