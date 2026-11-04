# Publier « Citation du jour » sur le Microsoft Store

Guide complet, étape par étape. Comptez **2 à 3 heures** la première fois, réparties sur 2 jours
(la vérification du compte développeur peut prendre quelques heures).

**Coût total : 0 €.** Compte développeur individuel gratuit, hébergement GitHub Pages gratuit,
signature du package offerte par Microsoft.

**Prérequis sur votre PC**
- Windows 11 à jour
- Un compte Microsoft personnel (celui de Windows convient)
- Un navigateur récent (Edge recommandé)
- Optionnel mais utile : activer le **mode développeur**
  (Paramètres → Système → Pour les développeurs) pour tester le widget avant publication

---

## Étape 1 — Héberger l'application en ligne (≈ 20 min)

PWABuilder exige une URL **publique en HTTPS**. Le plus simple et gratuit : GitHub Pages.

1. Créez un compte sur <https://github.com> si besoin (gratuit).
2. Créez un dépôt **public** nommé `citation-du-jour`.
3. Envoyez le contenu du dossier `widget-citation/` à la racine du dépôt.
   Deux façons :
   - **Sans rien installer** : sur la page du dépôt, *Add file → Upload files*,
     glissez-déposez tout le contenu du dossier (y compris le dossier caché `.github`).
   - **Avec Git** :
     ```powershell
     cd widget-citation
     git init
     git add .
     git commit -m "Citation du jour v1"
     git branch -M main
     git remote add origin https://github.com/VOTRE-PSEUDO/citation-du-jour.git
     git push -u origin main
     ```
4. Activez GitHub Pages : **Settings → Pages → Source : Deploy from a branch →
   Branch : main / (root) → Save**.
5. Après 1 à 2 minutes, votre application est en ligne sur :
   **`https://VOTRE-PSEUDO.github.io/citation-du-jour/`**
6. Vérifiez dans le navigateur que ces adresses répondent :
   - `https://VOTRE-PSEUDO.github.io/citation-du-jour/` (l'application)
   - `https://VOTRE-PSEUDO.github.io/citation-du-jour/manifest.webmanifest`
   - `https://VOTRE-PSEUDO.github.io/citation-du-jour/confidentialite.html` ← **URL de la politique
     de confidentialité à déclarer dans Partner Center**

### Étape 1b — Activer la mise à jour quotidienne du widget

Le widget Windows lit `widgets/widget-data.json`. Un robot GitHub (déjà inclus dans
`.github/workflows/widget-quotidien.yml`) le régénère chaque matin.

1. Ouvrez `.github/workflows/widget-quotidien.yml` dans le dépôt (bouton crayon sur GitHub).
2. Remplacez `https://VOTRE-PSEUDO.github.io/citation-du-jour` par votre URL réelle (ligne `APP_BASE_URL`).
3. Validez (*Commit changes*).
4. Testez : **Actions → Widget quotidien → Run workflow**. Après quelques secondes, un commit
   automatique met à jour `widgets/widget-data.json` avec la citation du jour.
5. Dans **Settings → Actions → General → Workflow permissions**, vérifiez que
   *Read and write permissions* est coché (nécessaire pour que le robot puisse publier).

---

## Étape 2 — Créer le compte développeur Microsoft (≈ 15 min + attente)

1. Allez sur <https://storedeveloper.microsoft.com> → **Get started for free**.
2. Choisissez **Individual developer (free)**.
3. Connectez-vous avec votre compte Microsoft, laissez-vous guider
   (vérification d'identité possible, généralement rapide).
4. Vous arrivez dans **Partner Center**.

---

## Étape 3 — Réserver le nom et récupérer les identifiants (≈ 10 min)

1. Dans Partner Center : **Applications et jeux → Vue d'ensemble → Nouveau produit → Application MSIX ou PWA**.
2. Nom : **`Citation du jour`** → Réserver.
3. Sur la page du produit : **Gestion du produit → Identité du produit**.
4. Copiez et gardez ces trois valeurs :
   - **ID de package** (ressemble à `1234VotreNom.CitationDuJour_abc123def456`)
   - **ID d'éditeur** (ressemble à `CN=12345678-ABCD-...`)
   - **Nom d'affichage de l'éditeur**

---

## Étape 4 — Générer le package avec PWABuilder (≈ 15 min)

1. Allez sur <https://www.pwabuilder.com>.
2. Collez votre URL `https://VOTRE-PSEUDO.github.io/citation-du-jour` → **Start**.
3. PWABuilder analyse le manifeste (icônes, service worker, widget).
   Si un point est signalé, corrigez-le dans le dépôt puis relancez l'analyse.
4. Cliquez **Package for Stores** → sous **Windows**, **Generate Package**.
5. Collez les trois valeurs de l'étape 3 (Package ID, Publisher ID, Publisher display name).
6. **Download Package** : vous obtenez un `.zip` contenant un **`.msixbundle`**
   (et un `.classic.appxbundle` pour les anciennes versions de Windows).

### Tester en local avant de soumettre (recommandé)

- Décompressez le zip, double-cliquez le `.msixbundle` → **Installer**.
- L'application « Citation du jour » apparaît dans le menu Démarrer.
- Ouvrez le **Widgets Board** (`Win + W`) → **+** → épinglez **Citation du jour**.
- Vérifiez : citation du jour affichée, bouton « Partager la fiche » ouvre l'application sur la bonne date.

---

## Étape 5 — Remplir la fiche Store (≈ 45 min)

Dans Partner Center, ouvrez votre produit → **Commencer la soumission**.
Tout le contenu est prêt dans le dossier `store/` :

| Section | Que faire |
|---|---|
| **Tarification et disponibilité** | Gratuit · tous les marchés |
| **Propriétés** | Catégorie : *Personnel et style de vie* ; sous-catégorie *Éducation* ; politique de confidentialité : `https://VOTRE-PSEUDO.github.io/citation-du-jour/confidentialite.html` |
| **Classement de l'âge** | Remplir le questionnaire (réponse : contenu adapté à tous) |
| **Packages** | Charger le `.msixbundle` (pas le `.sideload.msix` s'il est présent) |
| **Descriptions du Store (français)** | Copier depuis `store/fiche-store.md` : nom, description courte et longue, fonctionnalités |
| **Captures d'écran** | `store/screenshots/ms-01…ms-04.png` (1920 × 1080), légendes fournies dans `fiche-store.md` |
| **Logos** | `store/icons/icon-300.png` |
| **Langues** | Français (ajouter l'anglais plus tard si souhaité) |

Puis **Soumettre pour certification**. Délai habituel : quelques heures à 3 jours.

---

## Étape 6 — Après publication : faire connaître le widget

1. Une fois l'application en ligne, demandez son inclusion dans la **collection Widgets du Store**
   (formulaire indiqué dans la documentation Microsoft « Windows Widgets ») :
   c'est le principal levier de découverte pour un widget.
2. Vérifiez que le widget apparaît bien dans le sélecteur du Widgets Board après installation
   depuis le Store (testez sur un second PC ou un profil propre si possible).
3. Surveillez les avis : répondez vite aux premiers, ils pèsent sur le classement.

---

## Mises à jour ultérieures

- **Contenu ou interface** : modifiez le dépôt GitHub → c'est en ligne immédiatement.
  L'application installée se met à jour toute seule (c'est une PWA).
  Incrémentez la constante `CACHE` dans `sw.js` pour forcer le rechargement du cache.
- **Repackage** : nécessaire seulement si vous changez le manifeste (nom, icônes, widget).
  Refaites alors l'étape 4 et soumettez une nouvelle version dans Partner Center.
- **Version** : PWABuilder gère le numéro ; choisissez une version supérieure à chaque nouvelle soumission.

## Dépannage

| Problème | Solution |
|---|---|
| PWABuilder : « manifest not found » | L'URL doit être celle de la racine du site, en HTTPS, et le manifeste accessible publiquement |
| Le widget n'apparaît pas dans le sélecteur | Installez l'application via le package (pas depuis le navigateur), puis rouvrez le Widgets Board |
| Le widget affiche une ancienne citation | Le robot GitHub n'a pas tourné : onglet Actions → vérifier les exécutions ; lancer *Run workflow* |
| Notification absente | Windows : Paramètres → Système → Notifications → vérifier que l'application est autorisée |
| Certification refusée pour la politique de confidentialité | L'URL doit répondre publiquement (testez-la dans un navigateur privé) et nommer un responsable |
