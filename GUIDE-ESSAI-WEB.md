# Essayer Parlo sur la tablette (version web)

Durée : environ 15 minutes la première fois, dont 10 minutes d'attente automatique.
Il faut : un ordinateur, la tablette Android avec Chrome, et le wifi.

---

## Étape 1 — Créer un compte GitHub (gratuit)

1. Allez sur **github.com** et cliquez sur **Sign up**.
2. Choisissez un nom d'utilisateur (il apparaîtra dans l'adresse de l'appli, par exemple `prenom-ergo`).

## Étape 2 — Créer le dépôt « parlo »

1. Une fois connecté, cliquez sur **+** en haut à droite → **New repository**.
2. Repository name : `parlo`
3. Cochez **Public** (obligatoire pour la publication gratuite).
   Seul le programme est public : les grilles, photos et réglages de l'enfant restent
   uniquement sur la tablette et ne sont jamais envoyés sur GitHub.
4. Cliquez sur **Create repository**.

## Étape 3 — Envoyer les fichiers

1. Sur la page du dépôt, cliquez sur le lien **uploading an existing file**.
2. Décompressez `Parlo-CAA.zip` sur l'ordinateur, ouvrez le dossier `parlo`,
   sélectionnez **tout son contenu** et glissez-le dans la page.
3. En bas, cliquez sur **Commit changes**.

**Vérification importante :** dans la liste des fichiers du dépôt, vous devez voir un dossier
`.github`. S'il n'apparaît pas (fréquent sur Mac, où les dossiers commençant par un point sont cachés) :

1. Cliquez sur **Add file → Create new file**.
2. Dans le nom du fichier, tapez exactement : `.github/workflows/deploy-web.yml`
3. Ouvrez sur l'ordinateur le fichier `parlo/.github/workflows/deploy-web.yml` avec un éditeur de texte
   (sur Mac, Cmd+Maj+. affiche les fichiers cachés), copiez tout son contenu et collez-le.
4. Cliquez sur **Commit changes**.

## Étape 4 — Activer la publication

1. Dans le dépôt : **Settings** (onglet en haut) → **Pages** (menu de gauche).
2. Sous « Build and deployment », Source : choisissez **GitHub Actions**.

## Étape 5 — Lancer la publication

1. Onglet **Actions**. Si GitHub demande d'activer les workflows, acceptez.
2. Cliquez sur **Publier la version web** → **Run workflow** → **Run workflow**.
3. Attendez la coche verte (environ 10 minutes). Le robot télécharge la voix et les pictos ARASAAC,
   **vérifie que la voix fonctionne**, puis met l'appli en ligne.
4. Cliquez sur le travail terminé : l'adresse de l'appli est affichée, du type
   `https://votre-nom.github.io/parlo/`

## Étape 6 — Installer sur la tablette

1. Sur la tablette, **avec le wifi**, ouvrez l'adresse dans **Chrome**.
2. Un message indique « Préparation du mode hors ligne… ». **Laissez l'appli ouverte 2 à 3 minutes**
   (environ 90 Mo à télécharger une seule fois : la voix et les pictos).
   Pour vérifier : maintenez ⚙️ 2 secondes → **À propos** → « Fonctionnement hors ligne : prêt ✔ ».
3. Menu de Chrome **⋮** → **Ajouter à l'écran d'accueil** (ou **Installer l'application**).
4. Parlo apparaît avec son icône ; il s'ouvre en plein écran comme une application.

## Étape 7 — Tester

- **Mode avion** : activez-le, fermez Parlo, rouvrez-le depuis l'icône. Tout doit fonctionner, voix comprise.
- **Voix** : ⚙️ (appui long) → Réglages → Voix → testez « Voix embarquée » et « Voix du système ».
- **Enregistrement** : modifiez une case, fermez Chrome, redémarrez la tablette : la modification doit être là.

---

## Au quotidien

- **Sauvegarde** : Menu → Sauvegarde → Exporter. Le fichier va dans « Téléchargements ».
  Le menu vous le rappelle si les grilles ont été modifiées sans sauvegarde récente.
  **N'effacez pas les données de Chrome** sur la tablette : cela supprimerait les grilles.
- **Mises à jour** : quand vous recevez de nouveaux fichiers, renvoyez-les dans le dépôt GitHub
  (étape 3) : la publication se relance seule. La tablette se met à jour quand on revient sur l'appli
  après une pause, ou tout de suite via Menu → À propos → **Rechercher une mise à jour**.
  Une mise à jour ne s'applique jamais pendant qu'un message est en cours de composition.
- **Recherche de pictos ARASAAC** dans l'éditeur : demande internet au moment de la recherche ;
  les pictos choisis restent ensuite sur la tablette.

## Plus tard : la version Android (APK)

Le même dépôt peut fabriquer l'APK : onglet Actions → **Construire l'APK Android** → Run workflow.
Les grilles se transfèrent de la version web à l'APK avec Exporter / Restaurer une sauvegarde.
(Si l'APK devait être diffusée à des familles, il faudrait alors générer une clé de signature
personnelle, la clé fournie étant visible dans un dépôt public.)
