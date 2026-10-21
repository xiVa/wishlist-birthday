import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { WISHES } from "./wishes.js";

const $ = (id) => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let gifts = [];            // cadeaux Firestore, triés
let giftsLoaded = false;
let editingId = null;
let formImg = "";          // image du formulaire (data URL, chemin ou "")
let unsub = null;

function banner(msg, err=false){ const b=$("banner"); b.textContent=msg; b.className="banner"+(err?" err":""); b.hidden=false; b.scrollIntoView({behavior:"smooth",block:"nearest"}); }
function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }

// ---------- Connexion ----------
$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  try{ await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value); $("password").value=""; $("banner").hidden=true; }
  catch(err){
    console.error(err);
    banner(["auth/invalid-credential","auth/wrong-password","auth/user-not-found","auth/invalid-email"].includes(err.code)
      ? "E-mail ou mot de passe incorrect." : "Connexion impossible : " + (err.code || "erreur inconnue"), true);
  }
};
$("logout").onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  $("loginPanel").hidden = !!user;
  $("adminArea").hidden = !user;
  if(unsub){ unsub(); unsub = null; }
  giftsLoaded = false; gifts = [];
  if(user){
    unsub = onSnapshot(collection(db, "gifts"), (snap) => {
      gifts = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (a.order||0)-(b.order||0));
      giftsLoaded = true; renderAll();
    }, (err) => { console.error(err); banner("Impossible de lire la liste : " + err.code, true); });
  }
});

// ---------- Import des cadeaux actuels ----------
$("importBtn").onclick = async () => {
  try{
    const batch = writeBatch(db);
    WISHES.forEach((w, i) => batch.set(doc(db, "gifts", w.id), {
      title:w.title, note:w.note||"", price:w.price||"", link:w.link||"", multi:!!w.multi, img:w.img||"", order:(i+1)*10
    }));
    await batch.commit();
    banner("Tes cadeaux ont été importés. Tu peux maintenant les modifier ici.");
  }catch(e){ console.error(e); banner("Import impossible : " + (e.code||e.message) + ". Vérifie que les règles Firestore sont à jour.", true); }
};
let skipImport = false;
$("emptyBtn").onclick = () => { skipImport = true; renderAll(); };

// ---------- Rendu ----------
function renderAll(){
  const empty = giftsLoaded && gifts.length === 0;
  $("importPanel").hidden = !(empty && !skipImport);
  const showForm = giftsLoaded && (!empty || skipImport);
  $("formPanel").hidden = !showForm;
  $("listPanel").hidden = !(giftsLoaded && gifts.length > 0);
  $("count").textContent = gifts.length ? `(${gifts.length})` : "";
  const ul = $("adminList"); ul.textContent = "";
  gifts.forEach((g, i) => {
    const li = el("li","adminitem");
    if(g.img){ const im = el("img"); im.src=g.img; im.alt=""; li.appendChild(im); }
    else { const d = el("div","noimg"); d.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>'; li.appendChild(d); }
    const txt = el("div"); txt.appendChild(el("div","t",g.title));
    txt.appendChild(el("div","s",[g.price, g.multi ? "non réservable" : ""].filter(Boolean).join(" · ") || " "));
    li.appendChild(txt);
    const btns = el("div","btns");
    const mk = (label, cls, fn, dis) => { const b = el("button", cls, label); b.type="button"; b.disabled=!!dis; b.onclick=fn; return b; };
    btns.append(
      mk("↑","ghost",() => move(i,-1), i===0),
      mk("↓","ghost",() => move(i,1), i===gifts.length-1),
      mk("Modifier","ghost",() => startEdit(g)),
      mk("Supprimer","ghost danger",() => remove(g))
    );
    li.appendChild(btns);
    ul.appendChild(li);
  });
}

// ---------- Formulaire ----------
function setPreview(){ $("preview").hidden = !formImg; if(formImg) $("previewImg").src = formImg; }
function resetForm(){
  editingId = null; formImg = ""; $("giftForm").reset(); setPreview();
  $("formTitle").textContent = "Ajouter un cadeau"; $("saveBtn").textContent = "Ajouter à la liste"; $("cancelEdit").hidden = true;
}
function startEdit(g){
  editingId = g.id; formImg = g.img || "";
  $("title").value = g.title||""; $("note").value = g.note||""; $("price").value = g.price||""; $("link").value = g.link||""; $("multi").checked = !!g.multi;
  $("photo").value = ""; setPreview();
  $("formTitle").textContent = "Modifier le cadeau"; $("saveBtn").textContent = "Enregistrer"; $("cancelEdit").hidden = false;
  $("formPanel").scrollIntoView({behavior:"smooth"});
}
$("cancelEdit").onclick = resetForm;
$("removePhoto").onclick = () => { formImg = ""; $("photo").value = ""; setPreview(); };

// Réduit la photo (400 px max, JPEG) pour qu'elle tienne dans la base sans service de stockage.
async function shrink(file){
  const url = URL.createObjectURL(file);
  try{
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const max = 400, k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
    const ctx = c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height);
    let q = 0.82, out = c.toDataURL("image/jpeg", q);
    while(out.length > 300000 && q > 0.4){ q -= 0.1; out = c.toDataURL("image/jpeg", q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
$("photo").onchange = async (e) => {
  const f = e.target.files[0]; if(!f) return;
  try{ formImg = await shrink(f); setPreview(); }
  catch{ banner("Cette image n'a pas pu être lue. Essaie un autre fichier (JPG ou PNG).", true); }
};

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30) || "cadeau";

$("giftForm").onsubmit = async (e) => {
  e.preventDefault();
  const title = $("title").value.trim();
  if(!title){ banner("Le nom du cadeau est obligatoire.", true); $("title").focus(); return; }
  let link = $("link").value.trim();
  if(link && !/^https?:\/\//i.test(link)) link = "https://" + link;
  const prev = gifts.find(g => g.id === editingId);
  const id = editingId || slug(title) + "-" + Math.random().toString(36).slice(2,6);
  const order = prev ? (prev.order||0) : ((gifts.at(-1)?.order || 0) + 10);
  try{
    await setDoc(doc(db, "gifts", id), { title, note:$("note").value.trim(), price:$("price").value.trim(), link, multi:$("multi").checked, img:formImg, order });
    banner(editingId ? `« ${title} » a été mis à jour.` : `« ${title} » a été ajouté à ta liste.`);
    resetForm();
  }catch(err){ console.error(err); banner("Enregistrement impossible : " + (err.code||err.message) + ". Vérifie les règles Firestore et ton e-mail propriétaire.", true); }
};

async function move(i, d){
  const a = gifts[i], b = gifts[i+d]; if(!a || !b) return;
  const batch = writeBatch(db);
  let oa = a.order||0, ob = b.order||0;
  if(oa === ob) ob = oa + d;               // sécurité si deux ordres identiques
  batch.set(doc(db,"gifts",a.id), { ...strip(a), order: ob });
  batch.set(doc(db,"gifts",b.id), { ...strip(b), order: oa });
  try{ await batch.commit(); }catch(err){ console.error(err); banner("Déplacement impossible.", true); }
}
const strip = ({id, ...rest}) => rest;

async function remove(g){
  if(!confirm(`Supprimer « ${g.title} » de la liste ?`)) return;
  try{ await deleteDoc(doc(db,"gifts",g.id)); banner(`« ${g.title} » a été supprimé.`); if(editingId===g.id) resetForm(); }
  catch(err){ console.error(err); banner("Suppression impossible.", true); }
}
