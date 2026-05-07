# 🏷️ Shredhills — Plateforme de gestion

Application web de gestion interne pour Shredhills Impression de vêtements :
commandes, tâches, événements, livraisons, pointage, achats.

Stack : **React 18** + **Firebase** (Auth Email/Password, Firestore, Storage).

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js **18+** → https://nodejs.org
- Un projet **Firebase** (gratuit) → https://console.firebase.google.com

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer Firebase

Créer un projet sur la [Firebase Console](https://console.firebase.google.com), puis :

1. **Authentication** → activer le provider **Email/Password**
2. **Firestore Database** → créer en mode production (région `us-east1` pour Montréal)
3. **Storage** → activer (photos de preuves de livraison, signatures, factures)
4. **Project Settings** → **Your apps** → enregistrer une **Web app** et copier la config

Coller les valeurs dans un fichier `.env` à la racine (voir `.env.example`) :

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=ton-projet.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=ton-projet
REACT_APP_FIREBASE_STORAGE_BUCKET=ton-projet.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> ℹ️ Des valeurs de fallback pointant vers le projet `shredhills-dev` sont câblées
> dans `src/firebase.js` pour faciliter les tests, mais en production **utilise toujours `.env`**.

Déployer ensuite les règles de sécurité (contenu des fichiers à la racine) :
- `firestore.rules` → **Firestore → Rules**
- `storage.rules`   → **Storage → Rules**

### 3. Initialiser les comptes de démo (une seule fois)

Lancer l'app en local :
```bash
npm start
```
→ ouvre http://localhost:3000

Dans la console du navigateur (F12) :
```js
window.seedDatabase()
```

Cela crée les comptes Firebase Auth et les profils Firestore initiaux,
ainsi que quelques événements et commandes d'exemple.

### 4. Comptes par défaut

| Rôle              | Email                       | Mot de passe |
|-------------------|-----------------------------|--------------|
| Propriétaire      | `admin@shredhills.com`      | `admin123`   |
| Comptable         | `compta@shredhills.com`     | `compta123`  |
| Employé (Alex)    | `alexandre@shredhills.com`  | `emp1234`    |
| Employé (Marika)  | `marika@shredhills.com`     | `emp1234`    |
| Employé (Jordan)  | `jordan@shredhills.com`     | `emp1234`    |
| Livreur (Kevin)   | `kevin@shredhills.com`      | `driver123`  |

> ⚠️ **Change tous les mots de passe** avant la mise en production.

---

## 🔑 Modèle de droits

L'app combine trois axes :

- **`role`** : `admin` (super-utilisateur) ou `user`.
- **`jobs`** : un ou plusieurs métiers — `admin`, `accountant`, `employee`, `driver`.
  Détermine quelle interface est affichée.
- **`permissions`** : flags fins (`canManageOrders`, `canManageEvents`, `canViewReports`, `canViewTasks`, `canClockIn`, `canSubmitPurchases`, …).
  Un `admin` les a toutes implicitement.

Le routage est unifié dans `src/App.jsx` :
- Quel que soit le rôle, tout le monde arrive sur **DashboardPage**
- Seuls les onglets et les actions correspondant aux permissions de l'utilisateur s'affichent
- `can()` décide dynamiquement : pas de page séparée admin / employé / livreur

---

## 🧩 Fonctionnalités

### ⚙️ Admin / gestion
- CRUD des commandes (assignation, deadline, statut, chronométrage)
- Gestion des événements (calendrier d'équipe)
- Gestion des utilisateurs : rôles, jobs, permissions, NIP, couleur
- Tournée des livreurs
- Vue feuilles de temps

### 📊 Comptable
- Feuilles de temps de l'équipe (sessions cumulées par journée)
- Approuver / refuser les demandes d'achats avec factures jointes
- Soumettre ses propres achats et pointer

### 👷 Employé
- Punch in / Punch out
- Liste des tâches assignées avec chronomètre
- Soumettre des achats (photo de facture)
- Modifier ses propres pointages avec note obligatoire

### 🚐 Livreur
- Tournée du jour (livraisons + ramassages)
- Confirmation d'arrêt avec :
  - 📸 Photo (caméra)
  - ✍️ Signature client (canvas tactile)
- Ajout d'arrêts ad‑hoc
- Punch in / Punch out

### 📅 Événements
Calendrier partagé avec assignations utilisateurs (voir `src/pages/EventsPage.jsx`).

---

## 📁 Structure du projet

```
shredhills/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx                  ← Routeur racine (Auth → DashboardPage)
│   ├── index.js                 ← Point d'entrée React
│   ├── firebase.js              ← Init Firebase (Auth, Firestore, Storage)
│   ├── seed.js                  ← window.seedDatabase() — comptes/données initiales
│   ├── contexts/
│   │   └── AuthContext.jsx      ← État auth + helpers can() / isAdmin() / hasJob()
│   ├── hooks/
│   │   └── useFirestore.js      ← Toutes les opérations CRUD Firestore
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx    ← Page unique, onglets selon permissions
│   │   ├── EventsPage.jsx
│   │   ├── GestionRoutesSection.jsx
│   │   ├── MesRoutesSection.jsx
│   │   └── SettingsPage.jsx
│   ├── dashboard/               ← Sections & modals extraits du monolithe
│   │   ├── constants.js         ← PERMISSION_LABELS, JOB_OPTIONS, COLORS
│   │   ├── modals/
│   │   │   ├── UserModal.jsx
│   │   │   ├── OrderModal.jsx
│   │   │   ├── NewStopModal.jsx
│   │   │   ├── EditStopModal.jsx
│   │   │   ├── NewPurchaseModal.jsx
│   │   │   ├── RefusePurchaseModal.jsx
│   │   │   └── DeletePurchaseModal.jsx
│   │   └── sections/
│   │       ├── DashboardStatStrip.jsx
│   │       ├── CommandesSection.jsx
│   │       ├── MaTachesSection.jsx
│   │       ├── EquipeSection.jsx
│   │       ├── TourneesSection.jsx
│   │       ├── PurchasesSubmitView.jsx
│   │       ├── PurchasesAdminView.jsx
│   │       ├── FeuillesTempsSection.jsx
│   │       └── PointageSection.jsx
│   ├── components/              ← Logo, Nav, PunchSection, SignatureCanvas, Toast
│   ├── utils/helpers.js
│   └── styles/globals.css
├── firestore.rules              ← Règles Firestore
├── storage.rules                ← Règles Firebase Storage
├── .env.example                 ← Modèle de variables d'environnement
├── Dockerfile / docker-compose.yml / nginx.conf
├── UNRAID.md                    ← Guide de déploiement UnRAID
├── package.json
└── README.md
```

---

## 🛠️ Scripts npm

| Commande         | Description                              |
|------------------|------------------------------------------|
| `npm start`      | Lance l'app en dev sur http://localhost:3000 |
| `npm run build`  | Build de production dans `build/`        |
| `npm test`       | Lance les tests (CRA / react-scripts)    |

---

## 🚢 Déploiement

### Option A — Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # dossier public : build, SPA : yes
npm run build
firebase deploy
```
URL : `https://<projet>.web.app`

### Option B — Vercel

```bash
npm install -g vercel
npm run build
vercel --prod
```
Déclarer les variables `REACT_APP_FIREBASE_*` dans **Project Settings → Environment Variables**.

### Option C — Docker / UnRAID

`Dockerfile` + `docker-compose.yml` sont fournis :

```bash
cp .env.example .env       # remplir les variables
docker compose up -d
```

Pour un déploiement détaillé sur **UnRAID**, voir [`UNRAID.md`](./UNRAID.md).

---

## 📱 Accès mobile

Une fois en HTTPS (Firebase Hosting / Vercel), l'app s'installe en PWA :
- **iOS** : Safari → Partager → *Sur l'écran d'accueil*
- **Android** : Chrome → menu → *Installer l'application*

La caméra et la signature tactile nécessitent **HTTPS**.

---

## ❓ Problèmes fréquents

**`auth/invalid-credential` au login**
→ Le compte n'existe pas. Lance `window.seedDatabase()` une fois, ou crée le compte
   manuellement dans Firebase Console → Authentication.

**`Missing or insufficient permissions` (Firestore)**
→ Les règles `firestore.rules` n'ont pas été déployées, ou l'utilisateur n'est pas connecté.

**Les images / signatures ne s'uploadent pas**
→ Vérifier que **Storage** est activé et que `storage.rules` est déployé.

**L'app affiche le projet `shredhills-dev`**
→ Le fichier `.env` n'est pas chargé. Vérifier qu'il est à la racine et **redémarrer** `npm start`
   (les variables `REACT_APP_*` ne sont lues qu'au démarrage).

**Caméra non fonctionnelle sur iPhone**
→ L'app doit être servie en **HTTPS** (Vercel / Firebase Hosting le font automatiquement).

---

## 📞 Ressources

- Firebase : https://firebase.google.com/docs
- Vercel   : https://vercel.com/docs
- React    : https://react.dev
