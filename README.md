# 🏷️ Shredhills — Plateforme de gestion

Application web de gestion interne pour Shredhills Impression de vêtements :
commandes, tâches, événements, livraisons, pointage, dépenses.

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
4. **Functions** → passer au plan Blaze et activer Cloud Functions
5. **Project Settings** → **Your apps** → enregistrer une **Web app** et copier la config

Coller les valeurs dans un fichier `.env` à la racine (voir `.env.example`) :

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=ton-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ton-projet
VITE_FIREBASE_STORAGE_BUCKET=ton-projet.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_DB=
```

The Functions environment is generated from the same root `.env` file before deployment: `VITE_FIREBASE_DB` (or legacy `REACT_APP_FIREBASE_DB`) selects the single Firestore database used by the app **and** by Cloud Functions. One knob per environment: `dev-db` in dev, `prod` in production.

**Important** : après avoir changé `VITE_FIREBASE_DB` dans `.env`, redéployer les fonctions pour qu'elles suivent :
```bash
firebase deploy --only functions
```
Le dernier déploiement fait foi — une app pointant sur une base différente de celle des fonctions déployées verra ses appels serveur rejetés (`Unknown database`).

### 3. Initialiser l'administrateur

Créer le premier compte avec un mot de passe unique de 12 caractères ou plus dans Firebase Authentication. Depuis un environnement de confiance disposant des identifiants Admin SDK, lui attribuer les claims :

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json
node functions/scripts/bootstrap-admin.mjs admin@exemple.com
```

L'administrateur doit se déconnecter puis se reconnecter. Les administrateurs créent ensuite les autres comptes dans l'application par Cloud Functions; cette action ne peut pas être exécutée par le navigateur seul.

Pour forcer **tous** les utilisateurs à se reconnecter (ex. après un changement de rôles/permissions) :

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json
node functions/scripts/revoke-all-sessions.mjs --dry-run  # compter d'abord
node functions/scripts/revoke-all-sessions.mjs            # déconnecter tout le monde
```

Les sessions actives sont invalidées au prochain rafraîchissement du token (sous 1 heure).

Si la modification d'un pointage échoue avec `INVALID_SESSION` (données créées avant le durcissement du modèle), migrer les sessions sans id vers le nouveau schéma :

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json
node functions/scripts/migrate-punch-ids.mjs --dry-run  # compter d'abord
node functions/scripts/migrate-punch-ids.mjs            # migrer
```

Le script est idempotent et cible la base sélectionnée par `VITE_FIREBASE_DB` dans `.env`.

### 4. Déployer les contrôles de sécurité

```bash
firebase deploy --only firestore:rules,storage,functions
```

Avant de déployer ces règles sur un projet existant, inspecter chaque profil utilisateur puis migrer les permissions vers les custom claims :

```bash
node functions/scripts/migrate-claims.mjs --confirm-reviewed
```

Ce script efface les anciens NIP enregistrés en clair. Les champs `role` et `permissions` restent disponibles comme métadonnées d'affichage; les Rules et l'autorisation cliente utilisent uniquement les custom claims. Le script doit être exécuté uniquement après avoir confirmé que les rôles existants sont légitimes, car les anciens profils pouvaient être modifiés par tout utilisateur authentifié.

---

## 🔑 Modèle de droits

L'app combine trois axes :

- **`role`** : `admin` (super-utilisateur) ou `user`.
- **`jobs`** : un ou plusieurs métiers — `admin`, `accountant`, `employee`, `driver`.
  Détermine quelle interface est affichée.
- **`permissions`** : flags fins (`canManageOrders`, `canManageEvents`, `canViewReports`, `canViewTasks`, `canClockIn`, `canSubmitExpenses`, …).
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
- Approuver / refuser les demandes de dépenses avec factures jointes
- Soumettre ses propres dépenses et pointer

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

### 🔒 Pointage (Punch In/Out) - Système Bulletproof
Le système de pointage a été renforcé pour éviter toute perte de données :

- **Transactions atomiques** : Toutes les opérations de pointage se font via des transactions Firestore
- **Prévention des doubles pointages** : Impossible de pointer deux fois sans avoir pointé out
- **Anti-chevauchement** : Une session (manuelle ou modifiée) ne peut pas chevaucher une session existante — les heures ne sont jamais comptées deux fois
- **Erreurs explicites** : `SESSION_NOT_FOUND` si la session visée a disparu (plus de faux « succès » silencieux)
- **Validation des règles Firestore** : `firestore.rules` vérifie la structure du document (`sessions` uniquement, liste plafonnée) et réserve la suppression du document aux gestionnaires de rapports
- **Sauvegarde automatique** : Une sauvegarde est créée avant chaque modification des données de pointage (dans la même base de données)
- **Restauration d'urgence** : Fonction d'administration `restorePunchFromBackup` pour restaurer les données depuis la dernière sauvegarde
- **Détection intelligente** : Le système détecte automatiquement les sessions orphelines et les ferme à la fin de la journée
- **Logique partagée et testée** : La logique pure vit dans `src/utils/punchLogic.js` (testée par `npm test`)

Les données de pointage sont stockées dans la collection `punches` avec une structure sécurisée :
```javascript
{
  sessions: [
    {
      id: "P-UNIQUE_ID",
      punchIn: 1787141014031,  // timestamp en millisecondes
      punchOut: 1787145600000, // null si session active
      note: "Diner"            // obligatoire pour les modifications
    }
  ]
}
```

Tests : `npm test` (logique pure), `npm run test:punches` (courses/emulator),
`npm run test:punches-rules` (règles de sécurité, emulator).

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
│   │   │   ├── NewExpenseModal.jsx
│   │   │   ├── RefuseExpenseModal.jsx
│   │   │   └── DeleteExpenseModal.jsx
│   │   └── sections/
│   │       ├── DashboardStatStrip.jsx
│   │       ├── CommandesSection.jsx
│   │       ├── MaTachesSection.jsx
│   │       ├── EquipeSection.jsx
│   │       ├── TourneesSection.jsx
│   │       ├── ExpensesSubmitView.jsx
│   │       ├── ExpensesAdminView.jsx
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

## 💾 Sauvegarde des données de pointage

Le système inclut une fonctionnalité de sauvegarde automatique des données de pointage :
- **Collection de sauvegarde** : `punch_backups` 
- **Conservation** : Les 10 dernières sauvegardes sont conservées par utilisateur
- **Déclenchement** : Une sauvegarde est créée avant chaque modification des données de pointage
- **Restauration** : Utilisez la fonction Cloud `restorePunchFromBackup` pour restaurer les données

Pour restaurer manuellement les données de pointage d'un utilisateur :
```javascript
// Appel depuis un environnement admin
const restoreFunction = functions.httpsCallable('restorePunchFromBackup');
await restoreFunction({ userId: "USER_ID" }); // databaseId optionnel, lu depuis la config des fonctions
```
La sauvegarde est lue et restaurée dans la même base de données que les pointages.

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

**`Unknown database` sur les actions admin / fournisseurs**
→ Les fonctions ont été déployées avec un autre `VITE_FIREBASE_DB` que le `.env` actuel.
   Redéployer : `firebase deploy --only functions`.

**Caméra non fonctionnelle sur iPhone**
→ L'app doit être servie en **HTTPS** (Vercel / Firebase Hosting le font automatiquement).

---

## 📞 Ressources

- Firebase : https://firebase.google.com/docs
- Vercel   : https://vercel.com/docs
- React    : https://react.dev
