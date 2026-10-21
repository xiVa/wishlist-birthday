// La liste des envies. Modifie ici (titre, note, prix, lien, image).
// "id" : identifiant unique, sans espace — c'est la clé enregistrée dans Firebase. Ne le change plus une fois le site en ligne.
// "multi: true" : cadeau non réservable (carte cadeau, plusieurs personnes peuvent participer).
export const WISHES = [
  {id:"rituals-avent", img:"assets/rituals-avent.jpg", title:"Calendrier de l'Avent Rituals", note:"Le modèle « le train », édition 2026. Parfois en rupture sur le site.", price:"149,90 €", link:"https://www.rituals.com/fr-fr/premium-advent-calendar-2026-1121936.html"},
  {id:"sephora-avent", img:"assets/sephora-avent.jpg", title:"Calendrier de l'Avent Sephora", note:"Édition 2026, 24 surprises beauté.", price:"169,00 €", link:"https://www.sephora.fr/p/advent-calendar-2026---calendrier-de-l%E2%80%99avent-P10064522.html"},
  {id:"typology-avent", img:"assets/typology-avent.jpg", title:"Calendrier de l'Avent Typology", note:"Édition 2026.", price:"184,90 €", link:"https://www.typology.com/products/calendrier-de-l-avent-3665467011616"},
  {id:"new-balance", img:"assets/new-balance.jpg", title:"New Balance 530 marron", note:"Pointure 38.", price:"Environ 95 €", link:"https://www.sportsdirect.fr/new-balance-nb-530-womens-122507#colcode=12250776"},
  {id:"pinceaux-sephora", img:"assets/pinceaux-sephora.jpg", title:"Le Set de Pinceaux Intégral", note:"Sephora Collection.", price:"59,99 €", link:"https://www.sephora.fr/p/697581.html"},
  {id:"diagnostic-peau", title:"Un diagnostic de peau", note:"Chez un chirurgien esthétique à Pau, en vue d'un futur botox.", price:"Tarif à voir avec le cabinet", link:""},
  {id:"carte-mango", img:"assets/carte-mango.jpg", title:"Carte cadeau Mango", note:"", price:"Montant libre", link:"", multi:true},
  {id:"carte-sephora", img:"assets/carte-sephora.jpg", title:"Carte cadeau Sephora", note:"", price:"Montant libre", link:"", multi:true},
  {id:"carte-etam", img:"assets/carte-etam.jpg", title:"Carte cadeau Etam", note:"", price:"Montant libre", link:"", multi:true}
];
