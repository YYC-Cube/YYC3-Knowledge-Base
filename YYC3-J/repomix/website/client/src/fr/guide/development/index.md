# Contribuer à Repomix

Merci pour votre intérêt pour **Repomix** ! 🚀 Nous apprécions votre aide pour l'améliorer davantage. Ce guide vous aidera à commencer à contribuer au projet.

## Comment contribuer

- **Mettre une étoile au dépôt** : Montrez votre soutien en [ajoutant une étoile au dépôt](https://github.com/yamadashy/repomix) !
- **Créer un ticket** : Vous avez repéré un bug ? Vous avez une idée pour une nouvelle fonctionnalité ? Faites-le nous savoir en [créant un ticket](https://github.com/yamadashy/repomix/issues).
- **Soumettre une Pull Request** : Vous avez trouvé quelque chose à corriger ou à améliorer ? Soumettez une PR !
- **Faire passer le mot** : Partagez votre expérience avec Repomix sur les réseaux sociaux, les blogs ou avec votre communauté tech.
- **Utiliser Repomix** : Les meilleurs retours viennent de l'utilisation réelle, alors n'hésitez pas à intégrer Repomix dans vos propres projets !
- **Sponsoriser** : Soutenez le développement de Repomix en [devenant sponsor](https://github.com/sponsors/yamadashy).

## Démarrage rapide

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

## Commandes de développement

```bash
# Exécuter le CLI
npm run repomix
# Exécuter les tests
npm run test
npm run test-coverage
# Linter le code
npm run lint
```

## Style de code

- Utiliser [Biome](https://biomejs.dev/) pour le linting et le formatage
- Injection de dépendances pour la testabilité
- Maintenir les fichiers en dessous de 250 lignes
- Ajouter des tests pour les nouvelles fonctionnalités

## Directives pour les Pull Requests

1. Exécuter tous les tests
2. Passer les vérifications de linting
3. Mettre à jour la documentation
4. Suivre le style de code existant

## Configuration de développement

### Prérequis

- Node.js ≥ 20.0.0
- Git
- npm
- Docker (optionnel, pour exécuter le site web ou le développement conteneurisé)

### Développement local

Pour configurer Repomix pour le développement local :

```bash
# Cloner le dépôt
git clone https://github.com/yamadashy/repomix.git
cd repomix

# Installer les dépendances
npm install

# Exécuter le CLI
npm run repomix
```

### Développement avec Docker

Vous pouvez également exécuter Repomix en utilisant Docker :

```bash
# Construire l'image
docker build -t repomix .

# Exécuter le conteneur
docker run -v ./:/app -it --rm repomix
```

### Structure du projet

Le projet est organisé dans les répertoires suivants :

```
src/
├── cli/          # Implémentation CLI
├── config/       # Gestion de la configuration
├── core/         # Fonctionnalités principales
│   ├── file/     # Gestion des fichiers
│   ├── metrics/  # Calcul des métriques
│   ├── output/   # Génération de sortie
│   ├── security/ # Vérifications de sécurité
├── mcp/          # Intégration du serveur MCP
└── shared/       # Utilitaires partagés
tests/            # Tests reflétant la structure src/
website/          # Site web de documentation
├── client/       # Frontend (VitePress)
└── server/       # API Backend
```

## Développement du site web

Le site web Repomix est construit avec [VitePress](https://vitepress.dev/). Pour exécuter le site web localement :

```bash
# Prérequis : Docker doit être installé sur votre système

# Démarrer le serveur de développement du site web
npm run website

# Accéder au site web à http://localhost:5173/
```

Lors de la mise à jour de la documentation, vous devez uniquement mettre à jour la version anglaise en premier. Les mainteneurs s'occuperont des traductions vers d'autres langues.

## Processus de publication

Pour les mainteneurs et les contributeurs intéressés par le processus de publication :

1. Mettre à jour la version
```bash
npm version patch  # ou minor/major
```

2. Exécuter les tests et la construction
```bash
npm run test-coverage
npm run build
```

3. Publier
```bash
npm publish
```

Les nouvelles versions sont gérées par le mainteneur. Si vous pensez qu'une publication est nécessaire, ouvrez un ticket pour en discuter.

## Besoin d'aide?

- [Ouvrir un ticket](https://github.com/yamadashy/repomix/issues)
- [Rejoindre Discord](https://discord.gg/wNYzTwZFku)
