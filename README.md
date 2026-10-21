# Wish List — mise en ligne

## 1. Créer le projet Firebase
1. https://console.firebase.google.com → **Ajouter un projet** → nom (ex. `wishlist-fanny`) → Google Analytics : désactivable → Créer.
2. **Build > Firestore Database > Créer une base de données** → édition Standard → région `eur3 (europe-west)` ou `europe-west9 (Paris)` → mode **production** → Activer.
3. **Onglet Règles** : remplace tout par le contenu de `firestore.rules` → **Publier**.
4. **Paramètres du projet (roue dentée) > Général > Vos applications > icône `</>` (Web)** → nom → Enregistrer l'application (ne pas cocher Firebase Hosting).
5. Copie l'objet `firebaseConfig` affiché et colle ses valeurs dans `firebase-config.js`.

## 2. Publier sur Netlify
- Netlify > **Add new site > Deploy manually** → glisse-dépose tout le dossier (ou le zip dézippé).
- Optionnel : *Site configuration > Change site name* pour une URL propre.

## 3. Tester
Ouvre le site, réserve un cadeau, recharge, puis ouvre-le sur un autre navigateur : le message « déjà réservé » doit s'afficher.

## Gérer les réservations
- Voir / annuler une réservation : Firebase > Firestore > collection `reservations` > supprimer le document du cadeau (à éviter de consulter pour garder la surprise).
- Nouveau cadeau : ajouter une entrée dans `wishes.js` ET son `id` dans la liste de `firestore.rules` (puis re-publier les règles).
