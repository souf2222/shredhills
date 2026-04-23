# 🏷️ Shredhills — Plateforme de gestion

Application web complète pour Shredhills Impression de vêtements.

---

## 🚀 DÉMARRAGE RAPIDE (5 étapes)

### Prérequis
- Node.js 18+ installé → https://nodejs.org
- Un compte Firebase gratuit → https://firebase.google.com

---

### ÉTAPE 1 — Installer les dépendances

```bash
cd shredhills
npm install
```

### ÉTAPE 2 — Tester en local (sans Firebase)

```bash
npm start
```
L'app s'ouvre sur http://localhost:3000
Les données sont en mémoire (se réinitialisent au refresh).

**Codes de connexion par défaut :**
| Profil       | Code        | NIP  |
|--------------|-------------|------|
| Propriétaire | ADMIN-000   | 1234 |
| Comptable    | COMPTA-000  | 5678 |
| Alexandre    | EMP-001     | 0001 |
| Marika       | EMP-002     | 0002 |
| Jordan       | EMP-003     | 0003 |
| Kevin (Livreur) | LIV-001  | 9999 |

---

### ÉTAPE 3 — Configurer Firebase (données permanentes)

1. Va sur https://console.firebase.google.com
2. **Créer un projet** → nomme-le `shredhills`
3. Dans le projet :
   - Clique l'icône **`</>`** (Web app) → enregistre une app web
   - Copie les valeurs de `firebaseConfig`
4. Ouvre **`src/firebase.js`** et remplace les valeurs :
   ```js
   const firebaseConfig = {
     apiKey: "COLLE-ICI",
     authDomain: "ton-projet.firebaseapp.com",
     projectId: "ton-projet",
     storageBucket: "ton-projet.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. Dans Firebase Console :
   - **Firestore Database** → Créer → Mode production → Choisir une région (us-east1 pour Montréal)
   - **Storage** → Activer (pour photos et signatures)
   - **Firestore → Règles** → Colle le contenu de `firestore.rules`
   - **Storage → Règles** → Colle le contenu de `storage.rules`

6. Dans **`src/index.js`**, change :
   ```js
   // Avant :
   import App from "./App";
   // Après :
   import App from "./AppWithFirebase";
   ```

7. Relance l'app : `npm start`

8. Sur la page de login, clique **"Initialiser la base de données"** (une seule fois)

---

### ÉTAPE 4 — Mettre en ligne (accessible de partout)

#### Option A — Vercel (recommandé, gratuit)

```bash
npm install -g vercel
npm run build
vercel --prod
```
→ Tu obtiendras une URL comme `https://shredhills.vercel.app`

#### Option B — Firebase Hosting (tout-en-un)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Répond : build, yes, no
npm run build
firebase deploy
```
→ URL : `https://ton-projet.web.app`

---

### ÉTAPE 5 — Connecter EmailJS (courriels aux clients)

1. Va sur https://www.emailjs.com → créer un compte gratuit
2. **Email Services** → Add Service → Gmail → connecte ton compte Google
3. **Email Templates** → Create Template :
   ```
   Sujet : ✅ Votre commande {{order_id}} est prête — Shredhills
   
   Bonjour {{client_name}},
   
   Votre commande {{description}} est complétée et prête à être ramassée.
   
   N° commande : {{order_id}}
   Temps de production : {{production_time}}
   
   Merci de faire confiance à Shredhills !
   ```
4. Dans `src/AppWithFirebase.jsx`, trouve la fonction `sendEmailSimulated` et remplace par :
   ```js
   import emailjs from '@emailjs/browser';
   
   async function sendEmail(order) {
     await emailjs.send(
       'service_XXXXX',    // ton Service ID
       'template_XXXXX',   // ton Template ID
       {
         client_name: order.clientName,
         order_id: order.id,
         description: order.description,
         production_time: fmtMs(order.elapsed),
       },
       'ta_PUBLIC_KEY'     // ta Public Key
     );
   }
   ```
5. Installe emailjs : `npm install @emailjs/browser`

---

## 📱 ACCÈS SUR TÉLÉPHONE

Une fois déployée sur Vercel/Firebase :
- Partage l'URL à tous tes employés
- L'app fonctionne comme une app native sur iPhone/Android
- Ajoute-la à l'écran d'accueil : Safari → Partager → "Sur l'écran d'accueil"

---

## 🔑 FONCTIONNALITÉS

### ⚙️ Admin (ADMIN-000)
- Créer/assigner/supprimer des commandes avec deadline
- Gérer la tournée des livreurs
- Voir toutes les commandes actives et terminées
- Gérer l'équipe : modifier noms, NIP, couleurs
- Ajouter employés et livreurs

### 📊 Comptable (COMPTA-000)
- Feuilles de temps de tous les employés et livreurs
- Approuver/refuser les demandes d'achats avec factures
- Voir les heures par journée avec sessions cumulées

### 👷 Employés (EMP-XXX)
- Punch in / Punch out (heures cumulées par journée)
- Voir et exécuter ses tâches avec chronomètre
- Soumettre des demandes d'achats avec photo de facture
- Modifier ses propres pointages (avec note obligatoire)

### 🚐 Livreurs (LIV-XXX)
- Voir sa tournée du jour (livraisons + ramassages)
- Confirmer chaque arrêt avec :
  - 📸 Photo de preuve (caméra du téléphone)
  - ✍️ Signature du client (doigt sur écran)
- Ajouter ses propres arrêts
- Punch in / Punch out

---

## 📁 STRUCTURE DU PROJET

```
shredhills/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx              ← Version locale (démo, pas de Firebase)
│   ├── AppWithFirebase.jsx  ← Version production (Firebase)
│   ├── firebase.js          ← Configuration Firebase ⚠️ À REMPLIR
│   ├── seed.js              ← Données initiales
│   ├── index.js             ← Point d'entrée
│   └── hooks/
│       └── useFirestore.js  ← Toutes les opérations base de données
├── firestore.rules          ← Règles de sécurité Firestore
├── storage.rules            ← Règles Firebase Storage
├── package.json
└── README.md                ← Ce fichier
```

---

## ❓ PROBLÈMES FRÉQUENTS

**L'app ne se lance pas**
→ Vérifie que Node.js est installé : `node --version`
→ Relance `npm install`

**Firebase : "permission denied"**
→ Vérifie que tu as copié les règles dans Firestore et Storage

**Les données disparaissent au refresh**
→ Tu utilises encore `App.jsx` (version locale). Passe à `AppWithFirebase.jsx` dans `index.js`

**Photo ne fonctionne pas sur iPhone**
→ Assure-toi que l'app est en HTTPS (Vercel/Firebase le fait automatiquement)

---

## 📞 SUPPORT

Pour toute question sur le déploiement, consulte :
- Firebase : https://firebase.google.com/docs
- Vercel : https://vercel.com/docs
- EmailJS : https://www.emailjs.com/docs
