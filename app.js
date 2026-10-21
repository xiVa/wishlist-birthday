import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { WISHES } from "./wishes.js";

const listEl = document.getElementById("list");
const bannerEl = document.getElementById("banner");
const noteEl = document.getElementById("note");

// Mémorise sur cet appareil les cadeaux que CETTE personne a réservés (pas de compte nécessaire).
const LS_KEY = "wishlist-mine";
const mine = new Set(readMine());
function readMine(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }catch{ return []; } }
function saveMine(){ try{ localStorage.setItem(LS_KEY, JSON.stringify([...mine])); }catch{} }

let reserved = new Set();   // ids réservés (lus depuis Firestore)
let ready = false, failed = false;
let db = null;

const heart = '<svg class="heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
function banner(msg, err=false){ bannerEl.textContent=msg; bannerEl.className="banner"+(err?" err":""); bannerEl.hidden=false; bannerEl.scrollIntoView({behavior:"smooth",block:"nearest"}); }

function render(){
  listEl.textContent = "";
  for(const w of WISHES){
    const isTaken = reserved.has(w.id);
    const isMine = mine.has(w.id);
    const li = el("li", "gift"+(w.img?" has-img":"")+(isTaken && !isMine && !w.multi ? " taken":""));
    if(w.img){ const im=el("img","thumb"); im.src=w.img; im.alt=w.title; im.loading="lazy"; li.appendChild(im); }
    const body = el("div");
    body.appendChild(el("h2",null,w.title));
    if(w.note) body.appendChild(el("p",null,w.note));
    const meta = el("div","meta");
    if(w.price) meta.appendChild(el("span","price",w.price));
    if(w.link){ const a=el("a","link","Voir le modèle"); a.href=w.link; a.target="_blank"; a.rel="noopener"; meta.appendChild(a); }
    body.appendChild(meta);
    li.appendChild(body);
    if(!w.img){ const h=document.createElement("div"); h.innerHTML=heart; li.appendChild(h.firstChild); }

    const act = el("div","actions");
    if(w.multi){
      act.appendChild(el("span","status","Pas besoin de réserver : chacun peut participer."));
    } else if(isMine){
      act.appendChild(el("span","status mine","Merci ! Tu offres ce cadeau 💝"));
    } else if(isTaken){
      act.appendChild(el("span","status taken-msg","Ce cadeau est déjà réservé. Merci de choisir autre chose 💕"));
    } else if(failed){
      act.appendChild(el("span","status","Réservation indisponible pour le moment."));
    } else if(!ready){
      act.appendChild(el("span","status","Chargement…"));
    } else {
      const b = el("button",null,"Je l'offre");
      b.onclick = () => reserve(w, b);
      act.appendChild(b);
    }
    li.appendChild(act);
    listEl.appendChild(li);
  }
}

async function reserve(w, b){
  b.disabled = true;
  try{
    // Le document est créé une seule fois : les règles Firestore interdisent toute modification
    // ou suppression, donc si deux personnes cliquent en même temps, une seule réussit.
    await setDoc(doc(db, "reservations", w.id), { reserved: true, at: serverTimestamp() });
    mine.add(w.id); saveMine();
    banner(`C'est noté, « ${w.title} » est réservé pour toi. Merci beaucoup ! 💝`);
    render();
  }catch(e){
    if(e && e.code === "permission-denied"){
      banner("Oups, quelqu'un vient de réserver ce cadeau à l'instant. Merci d'en choisir un autre !", true);
    }else{
      b.disabled = false;
      banner("La réservation n'a pas pu être enregistrée. Réessaie dans un instant.", true);
    }
  }
}

render();

try{
  if(firebaseConfig.apiKey.startsWith("REMPLACE")) throw new Error("config manquante");
  db = getFirestore(initializeApp(firebaseConfig));
  onSnapshot(collection(db, "reservations"), snap => {
    reserved = new Set(snap.docs.map(d => d.id));
    ready = true; failed = false; render();
  }, err => {
    console.error(err); failed = true; ready = true; render();
    noteEl.textContent = "Impossible de charger les réservations.";
  });
}catch(e){
  console.error(e); failed = true; ready = true; render();
  noteEl.textContent = "Configuration Firebase manquante (voir firebase-config.js).";
}
