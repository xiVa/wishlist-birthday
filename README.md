# Wish List — version sans e-mail (Netlify statique + Firestore)

Aucun serveur : un simple dossier à glisser-déposer sur Netlify.

- L'invité saisit "Prénom Nom" pour réserver. Le cadeau devient "déjà réservé" pour tout le monde.
- Le nom n'est jamais enregistré en clair : seulement une empreinte (SHA-256) dans une collection `private` illisible depuis le site.
- Pour annuler, il faut retaper le même prénom et nom (accents, majuscules et ordre des mots sans importance). Les règles Firestore vérifient.

## 1. Firestore > Règles
Colle le contenu de `firestore.rules` (vider l'éditeur avec Ctrl+A / Suppr avant) puis **Publier**.
Attention : onglet Firestore Database (pas Realtime Database).

## 2. firebase-config.js
Déjà rempli avec ta config. (Pas d'`import`, juste `export const firebaseConfig = {...}`.)

## 3. Netlify
Add new site > Deploy manually > glisse le dossier complet.

## 4. Tester (important)
1. Réserve un cadeau avec "Test Utilisateur" -> message de confirmation, le cadeau passe "réservé".
2. Ouvre le site dans une fenêtre privée : le cadeau est "déjà réservé", sans bouton "Je l'offre".
3. "Annuler ma réservation" avec un MAUVAIS nom -> refusé. Avec "utilisateur test" -> annulé.
4. Si les réservations échouent avec une erreur : ouvre la console du navigateur (F12) et regarde si c'est "permission-denied" (règles non publiées ou mal collées).

## Page admin : ajouter / modifier / supprimer des cadeaux (admin.html)
Adresse : https://TON-SITE.netlify.app/admin.html (non référencée, protégée par connexion).

Mise en place (une seule fois) :
1. Firebase > **Authentication** > Commencer > onglet **Sign-in method** > **Adresse e-mail/Mot de passe** > Activer > Enregistrer.
2. Onglet **Users** > **Ajouter un utilisateur** : ton e-mail + un mot de passe (c'est ta connexion admin).
3. Dans `firestore.rules`, remplace `REMPLACE_PAR_TON_EMAIL` par cet e-mail EXACT, puis republie les règles (Firestore > Règles > Publier).
4. Redéploie le dossier sur Netlify, ouvre `/admin.html`, connecte-toi.
5. Clique sur **Importer mes cadeaux actuels** (une fois), puis ajoute / modifie / réordonne / supprime depuis la page.

Les photos sont réduites automatiquement (400 px) et stockées dans la base : pas besoin de service de stockage payant.
Supprimer un cadeau le retire de la liste publique. Seul ton e-mail peut modifier la liste (règle `isOwner`).

## Notes
- Nouveaux cadeaux : utilise `admin.html` (plus besoin de toucher `wishes.js` ni aux règles). `wishes.js` ne sert plus que de liste de départ.
- Libérer un cadeau à la main : Firestore > supprime `reservations/<id>` (le document `private/<id>` peut rester).
- Si un invité oublie son nom saisi : tu supprimes `reservations/<id>` dans la console.
