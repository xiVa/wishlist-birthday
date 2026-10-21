import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, doc, writeBatch, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { WISHES } from "./wishes.js";

const listEl = document.getElementById("list");
const bannerEl = document.getElementById("banner");
const noteEl = document.getElementById("note");

// Mémorise sur cet appareil les cadeaux réservés ici, juste pour afficher « Merci ! ».
const LS_KEY = "wishlist-mine";
const mine = new Set((()=>{ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }catch{ return []; } })());
const saveMine = () => { try{ localStorage.setItem(LS_KEY, JSON.stringify([...mine])); }catch{} };

// Nom normalisé : sans accents ni majuscules, ordre des mots indifférent -> « Marie Dupont » = « dupont marie ».
function nameTokens(s){
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ").filter(Boolean).sort();
}
async function nameHash(s){
  const data = new TextEncoder().encode("wishlist-fanny-2026|" + nameTokens(s).join(" "));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

let reserved = new Set();      // ids réservés (lus en direct depuis Firestore)
let ready = false, failed = false;
let open = null;               // {id, mode:"reserve"|"cancel"} formulaire ouvert
let draft = "";                // nom en cours de saisie (conservé si la liste se rafraîchit)
let busy = false;

const heart = '<svg class="heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
function banner(msg, err=false){ bannerEl.textContent=msg; bannerEl.className="banner"+(err?" err":""); bannerEl.hidden=false; bannerEl.scrollIntoView({behavior:"smooth",block:"nearest"}); }

function buildForm(w){
  const mode = open.mode;
  const f = el("form","form");
  f.noValidate = true;
  const id = "name-"+w.id;
  const lab = el("label",null, mode==="reserve" ? "Ton prénom et ton nom (format : Prénom Nom)" : "Le prénom et nom utilisés pour la réservation");
  lab.htmlFor = id;
  const input = el("input"); input.id=id; input.type="text"; input.autocomplete="name"; input.required=true; input.maxLength=60; input.value=draft; input.placeholder="Marie Dupont";
  input.oninput = () => { draft = input.value; };
  const row = el("div","row");
  const ok = el("button",null, mode==="reserve" ? "Confirmer la réservation" : "Décocher le cadeau"); ok.type="submit"; ok.disabled = busy;
  const no = el("button","ghost","Fermer"); no.type="button"; no.onclick = () => { open=null; render(); };
  row.append(ok,no);
  f.append(lab,input,row);
  if(mode==="reserve") f.appendChild(el("p","hint","Écris ton prénom puis ton nom, par exemple « Fanny Begros ». ⚠️ Si tu veux annuler plus tard, il faudra retaper exactement le même prénom et nom (majuscules et accents sans importance). Ton nom n'est pas affiché et n'est pas enregistré en clair."));
  else f.appendChild(el("p","hint","Saisis le même prénom et nom que lors de la réservation, par exemple « Fanny Begros »."));
  f.onsubmit = (e) => { e.preventDefault(); submit(w, mode); };
  return f;
}

function render(){
  listEl.textContent = "";
  for(const w of WISHES){
    const isTaken = reserved.has(w.id);
    const li = el("li", "gift"+(w.img?" has-img":"")+(isTaken && !w.multi && !mine.has(w.id) ? " taken":""));
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
    const isOpen = open && open.id === w.id;
    if(w.multi){
      act.appendChild(el("span","status","Pas besoin de réserver : chacun peut participer."));
    } else if(isOpen){
      act.appendChild(buildForm(w));
    } else if(isTaken){
      act.appendChild(mine.has(w.id)
        ? el("span","status mine","Merci ! Tu offres ce cadeau 💝")
        : el("span","status taken-msg","Ce cadeau est déjà réservé. Merci de choisir autre chose 💕"));
      const c = el("button","linkbtn","Annuler ma réservation");
      c.type="button"; c.onclick = () => { open={id:w.id,mode:"cancel"}; render(); };
      act.appendChild(c);
    } else if(failed){
      act.appendChild(el("span","status","Réservation indisponible pour le moment."));
    } else if(!ready){
      act.appendChild(el("span","status","Chargement…"));
    } else {
      const b = el("button",null,"Je l'offre");
      b.type="button"; b.onclick = () => { open={id:w.id,mode:"reserve"}; render(); };
      act.appendChild(b);
    }
    li.appendChild(act);
    listEl.appendChild(li);
  }
  if(open){ const i = document.getElementById("name-"+open.id); if(i && !busy) i.focus(); }
}

async function submit(w, mode){
  const name = draft.trim();
  if(nameTokens(name).length < 2){ banner("Merci d'indiquer ton prénom ET ton nom, par exemple « Fanny Begros ».", true); return; }
  busy = true; render();
  try{
    const h = await nameHash(name);
    const resRef = doc(db, "reservations", w.id);
    const privRef = doc(db, "private", w.id);
    const batch = writeBatch(db);
    if(mode === "reserve"){
      // Tout ou rien : si quelqu'un a réservé entre-temps, les règles refusent et rien n'est écrit.
      batch.set(privRef, { nameHash: h });
      batch.set(resRef, { reserved: true, at: serverTimestamp() });
    } else {
      batch.update(privRef, { proof: h });
      batch.delete(resRef);
    }
    await batch.commit();
    open = null; draft = "";
    if(mode === "reserve"){
      mine.add(w.id); saveMine();
      banner(`C'est noté, « ${w.title} » est réservé. Merci ! 💝 Pour annuler, il faudra retaper le même prénom et nom.`);
    } else {
      mine.delete(w.id); saveMine();
      banner(`Ta réservation de « ${w.title} » est annulée : le cadeau est de nouveau disponible.`);
    }
  }catch(e){
    console.error(e);
    if(e && e.code === "permission-denied"){
      if(mode === "reserve"){ open = null; banner("Oups, quelqu'un vient de réserver ce cadeau à l'instant. Merci d'en choisir un autre !", true); }
      else banner("Ce prénom et nom ne correspondent pas à ceux de la réservation. Vérifie l'orthographe.", true);
    } else if(e && e.code === "not-found"){
      open = null; banner("Ce cadeau n'est pas réservé.", true);
    } else {
      banner("Une erreur est survenue, réessaie dans un instant.", true);
    }
  }finally{
    busy = false; render();
  }
}

render();

let db;
try{
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
  noteEl.textContent = "Configuration Firebase invalide (voir firebase-config.js).";
}
