# Parlo — communication alternative pour tablette Android

Parlo est un outil de CAA (communication alternative et augmentée) inspiré de Grid 3 et TD Snap :
grilles de pictogrammes, barre de message, dossiers thématiques, clavier, éditeur intégré —
et une **voix de synthèse qui fonctionne sans internet**.

## Ce que fait l'appli

- **Grilles** : page d'accueil de 60 mots noyau (pronoms, verbes, petits mots, questions) + 10 dossiers
  (Phrases, Manger/boire, Émotions, Corps, Jeux, Personnes, Lieux, Actions, Décrire, Clavier).
  Couleurs selon la clé de Fitzgerald : jaune = personnes, vert = verbes, bleu = descriptifs,
  orange = noms, rose = social, violet = questions, gris = petits mots.
- **Barre de message** : les mots s'ajoutent avec leur picto ; « Parler » lit la phrase.
  Élisions et contractions automatiques (*je + aime → j'aime*, *à + le → au*, *de + le → du*…).
- **Conjugaison automatique, hors ligne** : les verbes sont sur les cases à l'infinitif et se conjuguent
  selon le sujet choisi avant eux (*je + vouloir + jouer → je veux jouer*). Les cases **hier / maintenant /
  demain** donnent le passé composé, le présent ou le futur proche (*hier + je + aller → hier je suis allé*).
  « pas » place « ne… pas » autour du verbe. Sans sujet, le mot reste tel quel. Les articles ne sont pas
  proposés : communication simplifiée (*demain maman va venir piscine*). Réglage fille/garçon pour l'accord.
  Dans l'éditeur, « Rôle dans la phrase » permet d'indiquer qu'un nouveau mot est un verbe ou une personne
  (ex. le prénom d'une sœur → personne féminine).
- **Deux voix hors ligne** :
  - *Voix embarquée (Piper)* : voix neuronale française incluse dans l'APK (~60 Mo), identique sur
    toutes les tablettes, aucune installation. Chaque mot est mis en mémoire après la première écoute ;
    le bouton « Préparer toutes les cases » pré-calcule tout le vocabulaire.
  - *Voix du système Android* : utilise le moteur de synthèse de la tablette. L'appli n'affiche que
    les voix françaises et signale celles qui exigent internet.
- **Accès tactile réglable** : activation au toucher, au relâchement (on peut glisser pour changer
  d'avis) ou par appui maintenu (durée réglable, jauge visuelle), anti-rebond, appuis multiples ignorés.
- **Éditeur** : modifier une case (libellé, texte prononcé, couleur, type), pictos ARASAAC (recherche
  en ligne, puis stockés sur la tablette), photos depuis la galerie ou l'appareil photo, emoji,
  déplacer/échanger les cases, créer/dupliquer/redimensionner des pages, choisir la page d'accueil.
- **Sécurité** : le menu s'ouvre par appui long de 2 s sur ⚙️ (ou par code), pour éviter les
  modifications involontaires. Le bouton retour Android ne ferme pas l'appli.
- **Sauvegarde** : export/restauration de toutes les pages, images et réglages (fichier .json).

## Essayer tout de suite : version web installable

Le plus simple pour un essai : Parlo mis en ligne gratuitement sur GitHub Pages, puis installé sur la
tablette depuis Chrome (« Ajouter à l'écran d'accueil »). Il fonctionne ensuite **sans internet**
(voix comprise) et enregistre les modifications sur la tablette.
Le pas à pas complet est dans **GUIDE-ESSAI-WEB.md**.

## Obtenir l'APK — méthode la plus simple (GitHub, sans rien installer)

1. Créez un compte sur [github.com](https://github.com) puis un **dépôt privé** (bouton « New »).
2. Envoyez tout le contenu de ce dossier dans le dépôt (« Add file → Upload files », glisser-déposer
   le contenu du dossier `parlo`, y compris les dossiers cachés `.github` et `android-signing`).
   L'outil **GitHub Desktop** est plus pratique si l'envoi par le site pose problème avec les dossiers cachés.
3. Onglet **Actions** → « Construire l'APK Android » → **Run workflow**. Compter 10 à 15 minutes.
   La construction télécharge la voix, les pictos ARASAAC, **teste la voix** puis compile l'APK.
4. À la fin, en bas de la page du workflow, téléchargez l'artefact **Parlo-apk** (un .zip contenant
   `Parlo.apk`). L'artefact **exemple-voix** contient un enregistrement pour écouter la voix.
5. Copiez `Parlo.apk` sur la tablette et ouvrez-le (autoriser « installer des applis inconnues »).

Les mises à jour se font de la même façon : modifiez, relancez le workflow, réinstallez par-dessus.
La signature est fixe (dossier `android-signing`), donc **les grilles de l'enfant sont conservées**.
Gardez le dépôt privé.

### Ajouter une voix masculine

Dans « Run workflow », remplacez la voix par `fr_FR-siwis-medium,fr_FR-tom-medium`
(chaque voix ajoute ~60 Mo à l'APK). Autres voix françaises Piper : `fr_FR-upmc-medium`,
`fr_FR-gilles-low`, `fr_FR-siwis-low` (plus légère, ~28 Mo, un peu moins naturelle).

## Autre méthode : Android Studio sur votre PC

Prérequis : Node.js 22, Android Studio (avec SDK Android), Java 21.

```bash
npm install
npm run assets          # voix + moteur ONNX + pictos
npm run test:voice      # facultatif : vérifie la voix (nécessite: npx playwright install chromium)
npx cap add android     # une seule fois
npx cap sync android
npx cap open android    # puis ▶ Run sur la tablette branchée en USB
```

Pour essayer l'interface dans Chrome sur le PC : `npm run serve` puis http://localhost:8080.

## Voix Android hors ligne (si vous utilisez la voix système)

Paramètres Android → Accessibilité (ou Système) → Synthèse vocale → moteur Google →
Installer les données vocales → Français (France). Le bouton « Installer des voix Android hors ligne »
dans les réglages de Parlo ouvre directement cet écran.

## Organisation du code

```
www/                    l'application (HTML/CSS/JS, sans framework)
  index.html
  css/app.css
  js/app.js             grilles, barre de message, accès tactile, réglages
  js/editor.js          éditeur, pages, ARASAAC, photos, sauvegarde
  js/tts.js             voix système + voix embarquée, cache audio
  js/piper-worker.js    synthèse Piper (WebAssembly) en arrière-plan
  js/vocab.js           vocabulaire de base (à adapter librement)
  js/grammar.js         conjugaison, temps, négation, élisions (sans IA)
  voices/piper/         phonétiseur espeak-ng compilé en WebAssembly
scripts/
  fetch-assets.mjs      télécharge voix, moteur ONNX, pictos
  test-voice.mjs        teste la voix embarquée et produit un .wav d'exemple
.github/workflows/      construction automatique de l'APK
android-signing/        clé de signature (mises à jour sans perte de données)
```

Pour modifier le vocabulaire livré par défaut : `www/js/vocab.js` (chaque case :
libellé, emoji de secours, mot-clé ARASAAC en espagnol, catégorie de couleur).

## Licences

- **Pictogrammes ARASAAC** : propriété du Gouvernement d'Aragon, créés par Sergio Palao pour
  ARASAAC (arasaac.org), licence CC BY-NC-SA — **usage non commercial**.
- **Piper** et **ONNX Runtime** : MIT. **espeak-ng** (phonétiseur) : GPL-3.0.
- Modèle de voix : voir le fichier `MODEL_CARD` de chaque voix, inclus dans l'APK.

Si l'outil devait un jour être diffusé ou vendu (par exemple dans le cadre d'une prestation),
il faudra vérifier ces licences : ARASAAC interdit l'usage commercial, et la GPL d'espeak-ng
impose de fournir le code source de l'application à qui la reçoit.
