# Friperie Live - Frontend React

Interface web moderne pour la gestion de vente de friperie en live.

## 🚀 Technologies

- **React 18** - Interface utilisateur
- **Vite** - Build tool ultra-rapide
- **React Router** - Navigation
- **Axios** - Requêtes HTTP
- **Zustand** - Gestion d'état
- **React Icons** - Icônes
- **React Toastify** - Notifications
- **date-fns** - Manipulation de dates
- **Recharts** - Graphiques

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Modifier l'URL de l'API si nécessaire

# Démarrer le serveur de développement
npm run dev
```

L'application démarre sur `http://localhost:3000`

## 🏗️ Structure du Projet

```
src/
├── components/         # Composants réutilisables
│   ├── Sidebar.jsx    # Barre latérale de navigation
│   └── ...
├── pages/             # Pages de l'application
│   ├── Login.jsx      # Page de connexion
│   ├── Dashboard.jsx  # Tableau de bord
│   ├── Balles.jsx     # Gestion des balles
│   └── ...
├── stores/            # Stores Zustand
│   ├── authStore.js   # Gestion auth
│   ├── balleStore.js  # Gestion balles
│   ├── venteStore.js  # Gestion ventes
│   └── ...
├── utils/             # Utilitaires
│   └── api.js         # Configuration Axios
├── App.jsx            # Composant principal
├── main.jsx           # Point d'entrée
└── index.css          # Styles globaux
```

## 🔐 Fonctionnalités

### Authentification
- Connexion sécurisée avec JWT
- 2 rôles : Admin et Investisseur
- Protection des routes

### Tableau de Bord
- Vue d'ensemble des statistiques
- Ventes récentes
- Balles en stock
- Métriques clés

### Gestion des Balles
- Créer, modifier, supprimer des balles
- Vue détaillée avec produits, ventes et dépenses
- Calcul automatique du bénéfice
- Filtrage et recherche

### Gestion des Ventes
- Vente avec ou sans produit préexistant
- Association à un livreur
- Suivi du statut de livraison
- Annulation avec remise en stock

### Gestion des Dépenses
- Dépenses globales ou par balle
- Catégorisation
- Impact sur les bénéfices

### Rapports
- Rapport global
- Rapports par jour/semaine/mois
- Rapport par balle
- Filtrage par période
- Accès investisseur (lecture seule)

## 📝 Scripts Disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Linting
npm run lint
```

## 🎨 Personnalisation

Les couleurs principales peuvent être modifiées dans `src/index.css` :

```css
:root {
  --primary-color: #2563eb;
  --success-color: #10b981;
  --danger-color: #ef4444;
  /* ... */
}
```

## 🔧 Configuration

### Variables d'Environnement

Créer un fichier `.env` à la racine :

```env
VITE_API_URL=http://localhost:5000/api
```

### Proxy API

Le fichier `vite.config.js` configure un proxy pour éviter les problèmes CORS en développement.

## 🚦 Comptes de Test

```
Admin:
  Email: admin@friperie.com
  Password: admin123

Investisseur:
  Email: investisseur@friperie.com
  Password: invest123
```

## 📱 Responsive

L'interface est entièrement responsive et s'adapte aux :
- Desktop (>1024px)
- Tablet (768px - 1024px)
- Mobile (<768px)

## 🌐 Déploiement

### Build de Production

```bash
npm run build
```

Les fichiers optimisés seront dans le dossier `dist/`.

### Déploiement sur Netlify/Vercel

1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Commande de build : `npm run build`
4. Dossier de publication : `dist`

## 🔗 Intégration Backend

Le frontend communique avec le backend via Axios. Tous les appels API sont centralisés dans `src/utils/api.js`.

### Intercepteurs

- **Request** : Ajoute automatiquement le token JWT
- **Response** : Gère les erreurs d'authentification (401)

## 🎯 Workflows Utilisateur

### Workflow Admin

1. Connexion
2. Créer une balle
3. (Option A) Lister les produits → Vendre
4. (Option B) Vendre directement
5. Ajouter des dépenses
6. Voir les rapports

### Workflow Investisseur

1. Connexion
2. Voir le dashboard
3. Consulter les rapports uniquement

## 🐛 Dépannage

### Erreur de connexion API

Vérifier que :
- Le backend est démarré
- L'URL dans `.env` est correcte
- CORS est configuré sur le backend

### Token expiré

Le token JWT expire après 30 jours. Se reconnecter si nécessaire.

## 📄 Licence

MIT

## 🤝 Support

Pour toute question, consulter la documentation du backend ou ouvrir une issue.
