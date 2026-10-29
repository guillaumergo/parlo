/*
 * Parlo — vocabulaire de base en français.
 * Chaque case : [libellé, emoji de secours, mot-clé ARASAAC, catégorie, texte prononcé (optionnel)]
 * Les mots-clés ARASAAC sont en espagnol : c'est la base la plus complète, et le résultat
 * (un pictogramme) est indépendant de la langue.
 * Catégories (code couleur inspiré de la clé de Fitzgerald) :
 *   P pronoms/personnes (jaune)  V verbes (vert)  A descriptifs (bleu)  N noms (orange)
 *   S social / phrases (rose)    Q questions (violet)  M petits mots (gris)
 * Ce fichier est utilisé par l'appli ET par scripts/fetch-assets.mjs (téléchargement des pictos).
 */
(function (root) {
  const CATEGORIES = {
    P: { name: 'Personnes / pronoms', color: '#FFF1A6' },
    V: { name: 'Verbes / actions', color: '#C9F0C1' },
    A: { name: 'Descriptifs', color: '#C9DDFB' },
    N: { name: 'Noms / objets', color: '#FFD9B3' },
    S: { name: 'Social / phrases', color: '#FAD0E2' },
    Q: { name: 'Questions', color: '#E1D3F8' },
    T: { name: 'Temps (hier / demain)', color: '#B2EBE0' },
    M: { name: 'Petits mots', color: '#ECEFF3' },
    F: { name: 'Dossier', color: '#D5E8F0' },
    C: { name: 'Commande', color: '#E3E7EB' },
  };

  // Les dossiers de l'accueil : [libellé, emoji, mot-clé ARASAAC, id de page]
  const FOLDERS = [
    ['Phrases', '💬', 'conversation', 'phrases'],
    ['Manger / boire', '🍽️', 'comer', 'manger'],
    ['Émotions', '😊', 'emociones', 'emotions'],
    ['Corps', '🧍', 'cuerpo', 'corps'],
    ['Jeux', '🧸', 'jugar', 'jeux'],
    ['Personnes', '👨‍👩‍👧', 'personas', 'personnes'],
    ['Lieux', '🏠', 'lugar', 'lieux'],
    ['Actions', '🏃', 'acción', 'actions'],
    ['Décrire', '🎨', 'colores', 'decrire'],
    ['Clavier', '⌨️', 'teclado', 'clavier'],
  ];

  const PAGES = {
    accueil: {
      name: 'Accueil', rows: 6, cols: 10,
      cells: [
        ['je', '🙋', 'yo', 'P'], ['tu', '👉', 'tú', 'P'], ['il', '👦', 'él', 'P'], ['elle', '👧', 'ella', 'P'],
        ['nous', '👥', 'nosotros', 'P'], ['vous', '🧑‍🤝‍🧑', 'vosotros', 'P'], ['ils', '👬', 'ellos', 'P'],
        ['elles', '👭', 'ellas', 'P'], ['oui', '👍', 'sí', 'S'], ['non', '👎', 'no', 'S'],

        ['vouloir', '🤲', 'querer', 'V'], ['aimer', '❤️', 'gustar', 'V'], ['aller', '🚶', 'ir', 'V'],
        ['être', '🧍', 'ser', 'V'], ['avoir', '✋', 'tener', 'V'], ['faire', '🛠️', 'hacer', 'V'],
        ['pouvoir', '💪', 'poder', 'V'], ['regarder', '👀', 'mirar', 'V'], ['jouer', '🧸', 'jugar', 'V'],
        ['manger', '🍴', 'comer', 'V'],

        ['boire', '🥤', 'beber', 'V'], ['prendre', '✊', 'coger', 'V'], ['donner', '🤝', 'dar', 'V'],
        ['aider', '🆘', 'ayudar', 'V'], ['arrêter', '✋', 'parar', 'V'], ['encore', '🔁', 'más', 'M'],
        ['fini', '🏁', 'terminar', 'M'], ['ne', '🚫', 'no', 'M'], ['pas', '🚫', 'no', 'M'],
        ['aussi', '➕', 'también', 'M'],

        ['hier', '⏪', 'ayer', 'T'], ['maintenant', '⏺️', 'ahora', 'T'], ['demain', '⏩', 'mañana', 'T'],
        ["c'est", '☝️', 'es', 'M'], ['à', '➡️', 'a', 'M'], ['avec', '🤝', 'con', 'M'], ['dans', '📥', 'dentro', 'M'],
        ['de', '↩️', 'de', 'M'], ['et', '➕', 'y', 'M'], ['mais', '↔️', 'pero', 'M'],

        ['quoi ?', '❓', 'qué', 'Q', 'quoi'], ['qui ?', '🧑', 'quién', 'Q', 'qui'],
        ['où ?', '📍', 'dónde', 'Q', 'où'], ['quand ?', '⏰', 'cuándo', 'Q', 'quand'],
        ['pourquoi ?', '🤔', 'por qué', 'Q', 'pourquoi'], ['comment ?', '🔧', 'cómo', 'Q', 'comment'],
        ['bien', '😀', 'bien', 'A'], ['mal', '😣', 'mal', 'A'], ['grand', '🦒', 'grande', 'A'],
        ['petit', '🐭', 'pequeño', 'A'],
        // dernière ligne : dossiers (générés plus bas)
      ],
    },
    phrases: {
      name: 'Phrases', rows: 5, cols: 6, addToMessage: false,
      cells: [
        ['Bonjour', '👋', 'hola', 'S'], ['Au revoir', '👋', 'adiós', 'S'], ['Merci', '🙏', 'gracias', 'S'],
        ["S'il te plaît", '🙏', 'por favor', 'S'], ['Ça va', '🙂', 'bien', 'S'], ['Ça ne va pas', '🙁', 'mal', 'S'],
        ["J'ai besoin d'aide", '🆘', 'ayudar', 'S'], ['Je veux faire une pause', '⏸️', 'descansar', 'S'],
        ['Arrête, s\'il te plaît', '✋', 'parar', 'S'], ["J'ai mal", '🤕', 'dolor', 'S'],
        ['Je veux aller aux toilettes', '🚽', 'váter', 'S'], ["J'ai soif", '🥤', 'sed', 'S'],
        ["J'ai faim", '🍽️', 'hambre', 'S'], ['Je suis fatigué', '🥱', 'cansado', 'S'],
        ['Je ne sais pas', '🤷', 'no saber', 'S'], ['Je ne comprends pas', '😕', 'no entender', 'S'],
        ['Encore, s\'il te plaît', '🔁', 'más', 'S'], ["C'est fini", '🏁', 'terminar', 'S'],
        ['Attends', '⏳', 'esperar', 'S'], ["C'est à moi", '🙋', 'mi turno', 'S'],
        ["C'est à toi", '👉', 'tu turno', 'S'], ['Regarde !', '👀', 'mirar', 'S'], ['Bravo !', '👏', 'aplaudir', 'S'],
        ["Je t'aime", '❤️', 'querer', 'S'], ['Oui', '👍', 'sí', 'S'], ['Non', '👎', 'no', 'S'],
        ['Je veux autre chose', '🔀', 'otro', 'S'], ['Laisse-moi tranquille', '🙅', 'solo', 'S'],
        ['Viens', '🫴', 'venir', 'S'], ["Comment tu t'appelles ?", '❓', 'nombre', 'S'],
      ],
    },
    manger: {
      name: 'Manger / boire', rows: 5, cols: 8,
      cells: [
        ['manger', '🍴', 'comer', 'V'], ['boire', '🥤', 'beber', 'V'], ['encore', '🔁', 'más', 'M'],
        ['fini', '🏁', 'terminar', 'M'], ['bon', '😋', 'rico', 'A'], ['pas bon', '🤢', 'asco', 'A'],
        ['chaud', '🔥', 'caliente', 'A'], ['froid', '🧊', 'frío', 'A'],
        ['eau', '💧', 'agua', 'N'], ['lait', '🥛', 'leche', 'N'], ['jus', '🧃', 'zumo', 'N'],
        ['pain', '🥖', 'pan', 'N'], ['pâtes', '🍝', 'pasta', 'N'], ['riz', '🍚', 'arroz', 'N'],
        ['frites', '🍟', 'patatas fritas', 'N'], ['viande', '🍖', 'carne', 'N'],
        ['poisson', '🐟', 'pescado', 'N'], ['œuf', '🥚', 'huevo', 'N'], ['légumes', '🥦', 'verdura', 'N'],
        ['soupe', '🍲', 'sopa', 'N'], ['fromage', '🧀', 'queso', 'N'], ['yaourt', '🥣', 'yogur', 'N'],
        ['pomme', '🍎', 'manzana', 'N'], ['banane', '🍌', 'plátano', 'N'],
        ['compote', '🥣', 'compota', 'N'], ['gâteau', '🍰', 'pastel', 'N'], ['biscuit', '🍪', 'galleta', 'N'],
        ['chocolat', '🍫', 'chocolate', 'N'], ['glace', '🍦', 'helado', 'N'], ['bonbon', '🍬', 'caramelo', 'N'],
        ['céréales', '🥣', 'cereales', 'N'], ['pizza', '🍕', 'pizza', 'N'],
        ['assiette', '🍽️', 'plato', 'N'], ['verre', '🥛', 'vaso', 'N'], ['cuillère', '🥄', 'cuchara', 'N'],
        ['fourchette', '🍴', 'tenedor', 'N'], ['couteau', '🔪', 'cuchillo', 'N'], ['serviette', '🧻', 'servilleta', 'N'],
        ['petit-déjeuner', '🌅', 'desayuno', 'N'], ['goûter', '🧁', 'merienda', 'N'],
      ],
    },
    emotions: {
      name: 'Émotions', rows: 4, cols: 6,
      cells: [
        ['je', '🙋', 'yo', 'P'], ['être', '🧍', 'ser', 'V'], ['avoir', '✋', 'tener', 'V'],
        ['se sentir', '💭', 'sentir', 'V'], ['très', '➕', 'mucho', 'M'], ['pas', '🚫', 'no', 'M'],
        ['content', '😀', 'contento', 'A'], ['triste', '😢', 'triste', 'A'], ['en colère', '😠', 'enfadado', 'A'],
        ['peur', '😨', 'miedo', 'N'], ['fatigué', '🥱', 'cansado', 'A'], ['malade', '🤒', 'enfermo', 'A'],
        ['calme', '😌', 'tranquilo', 'A'], ['surpris', '😮', 'sorprendido', 'A'], ['énervé', '😤', 'nervioso', 'A'],
        ['fier', '😎', 'orgulloso', 'A'], ['gêné', '😳', 'vergüenza', 'A'], ['ennuyé', '😑', 'aburrido', 'A'],
        ['amoureux', '😍', 'enamorado', 'A'], ['inquiet', '😟', 'preocupado', 'A'], ['bien', '🙂', 'bien', 'A'],
        ['mal', '😣', 'mal', 'A'], ['un câlin', '🤗', 'abrazar', 'N'], ['une pause', '⏸️', 'descansar', 'N'],
      ],
    },
    corps: {
      name: 'Corps', rows: 4, cols: 7,
      cells: [
        ["j'ai mal", '🤕', 'dolor', 'S'], ['je', '🙋', 'yo', 'P'], ['avoir', '✋', 'tener', 'V'], ['mal', '😣', 'dolor', 'M'],
        ['ça gratte', '🫳', 'picar', 'S'], ['ça pique', '📍', 'pinchar', 'S'], ['ça brûle', '🔥', 'quemar', 'S'],
        ['tête', '🙂', 'cabeza', 'N'], ['ventre', '🫃', 'barriga', 'N'], ['dents', '🦷', 'dientes', 'N'],
        ['gorge', '🗣️', 'garganta', 'N'], ['oreille', '👂', 'oreja', 'N'], ['yeux', '👀', 'ojos', 'N'],
        ['nez', '👃', 'nariz', 'N'], ['bouche', '👄', 'boca', 'N'], ['dos', '🔙', 'espalda', 'N'],
        ['bras', '💪', 'brazo', 'N'], ['main', '✋', 'mano', 'N'], ['jambe', '🦵', 'pierna', 'N'],
        ['pied', '🦶', 'pie', 'N'], ['genou', '🦵', 'rodilla', 'N'], ['cou', '🧣', 'cuello', 'N'],
        ['toilettes', '🚽', 'váter', 'N'], ['se laver', '🧼', 'lavar', 'V'], ['se moucher', '🤧', 'sonarse', 'V'],
        ['changer de position', '🔄', 'cambiar', 'V'], ["j'ai chaud", '🥵', 'calor', 'S'], ["j'ai froid", '🥶', 'frío', 'S'],
      ],
    },
    jeux: {
      name: 'Jeux', rows: 4, cols: 8,
      cells: [
        ['jouer', '🧸', 'jugar', 'V'], ['encore', '🔁', 'más', 'M'], ['fini', '🏁', 'terminar', 'M'],
        ["c'est à moi", '🙋', 'mi turno', 'S'], ["c'est à toi", '👉', 'tu turno', 'S'], ['on joue ?', '🎲', 'jugar', 'S'],
        ['j\'ai gagné', '🏆', 'ganar', 'S'], ["j'ai perdu", '😕', 'perder', 'S'],
        ['ballon', '⚽', 'pelota', 'N'], ['voiture', '🚗', 'coche', 'N'], ['poupée', '🪆', 'muñeca', 'N'],
        ['puzzle', '🧩', 'puzle', 'N'], ['livre', '📖', 'libro', 'N'], ['musique', '🎵', 'música', 'N'],
        ['tablette', '📱', 'tableta', 'N'], ['télé', '📺', 'televisión', 'N'],
        ['dessin', '🖍️', 'dibujar', 'N'], ['peinture', '🎨', 'pintar', 'N'], ['cubes', '🧱', 'bloques', 'N'],
        ['pâte à modeler', '🟠', 'plastilina', 'N'], ['bulles', '🫧', 'pompas de jabón', 'N'],
        ['chanson', '🎤', 'cantar', 'N'], ['jeu vidéo', '🎮', 'videojuego', 'N'], ['cartes', '🃏', 'cartas', 'N'],
        ['balançoire', '🛝', 'columpio', 'N'], ['toboggan', '🛝', 'tobogán', 'N'], ['vélo', '🚲', 'bicicleta', 'N'],
        ['cache-cache', '🙈', 'escondite', 'N'], ['piscine', '🏊', 'piscina', 'N'], ['trampoline', '🤸', 'cama elástica', 'N'],
        ['animaux', '🐶', 'animales', 'N'], ['dehors', '🌳', 'fuera', 'N'],
      ],
    },
    personnes: {
      name: 'Personnes', rows: 4, cols: 6,
      cells: [
        ['maman', '👩', 'madre', 'P'], ['papa', '👨', 'padre', 'P'], ['frère', '👦', 'hermano', 'P'],
        ['sœur', '👧', 'hermana', 'P'], ['bébé', '👶', 'bebé', 'P'], ['mamie', '👵', 'abuela', 'P'],
        ['papi', '👴', 'abuelo', 'P'], ['copain', '🧒', 'amigo', 'P'], ['copine', '👧', 'amiga', 'P'],
        ['maîtresse', '👩‍🏫', 'maestra', 'P'], ['maître', '👨‍🏫', 'maestro', 'P'], ['docteur', '🧑‍⚕️', 'médico', 'P'],
        ['ergothérapeute', '🧑‍⚕️', 'terapeuta ocupacional', 'P'], ['orthophoniste', '🗣️', 'logopeda', 'P'],
        ['kiné', '🤸', 'fisioterapeuta', 'P'], ['éducatrice', '🧑‍🏫', 'educadora', 'P'], ['AESH', '🧑‍🤝‍🧑', 'acompañante', 'P'],
        ['chauffeur', '🚐', 'conductor', 'P'], ['moi', '🙋', 'yo', 'P'], ['toi', '👉', 'tú', 'P'],
        ['tout le monde', '👥', 'todos', 'P'], ['personne', '🚫', 'nadie', 'P'], ['chien', '🐶', 'perro', 'N'],
        ['chat', '🐱', 'gato', 'N'],
      ],
    },
    lieux: {
      name: 'Lieux', rows: 4, cols: 6,
      cells: [
        ['je', '🙋', 'yo', 'P'], ['vouloir', '🤲', 'querer', 'V'], ['aller', '🚶', 'ir', 'V'], ['rester', '🧍', 'quedarse', 'V'],
        ['dedans', '📥', 'dentro', 'M'], ['dehors', '🌳', 'fuera', 'M'],
        ['maison', '🏠', 'casa', 'N'], ['école', '🏫', 'escuela', 'N'], ['chambre', '🛏️', 'dormitorio', 'N'],
        ['cuisine', '🍳', 'cocina', 'N'], ['salle de bain', '🛁', 'cuarto de baño', 'N'], ['toilettes', '🚽', 'váter', 'N'],
        ['salon', '🛋️', 'salón', 'N'], ['jardin', '🌻', 'jardín', 'N'], ['parc', '🌳', 'parque', 'N'],
        ['piscine', '🏊', 'piscina', 'N'], ['magasin', '🛒', 'tienda', 'N'], ['cantine', '🍽️', 'comedor', 'N'],
        ['cour', '⛹️', 'patio', 'N'], ['voiture', '🚗', 'coche', 'N'], ['bus', '🚌', 'autobús', 'N'],
        ['hôpital', '🏥', 'hospital', 'N'], ['lit', '🛏️', 'cama', 'N'], ['chez mamie', '👵', 'abuela', 'N'],
      ],
    },
    actions: {
      name: 'Actions', rows: 5, cols: 8,
      cells: [
        ['manger', '🍴', 'comer', 'V'], ['boire', '🥤', 'beber', 'V'], ['dormir', '😴', 'dormir', 'V'],
        ['jouer', '🧸', 'jugar', 'V'], ['regarder', '👀', 'mirar', 'V'], ['écouter', '👂', 'escuchar', 'V'],
        ['aller', '🚶', 'ir', 'V'], ['venir', '🫴', 'venir', 'V'],
        ['ouvrir', '📂', 'abrir', 'V'], ['fermer', '📁', 'cerrar', 'V'], ['mettre', '📥', 'poner', 'V'],
        ['enlever', '📤', 'quitar', 'V'], ['laver', '🧼', 'lavar', 'V'], ['lire', '📖', 'leer', 'V'],
        ['écrire', '✍️', 'escribir', 'V'], ['dessiner', '🖍️', 'dibujar', 'V'],
        ['chanter', '🎤', 'cantar', 'V'], ['danser', '💃', 'bailar', 'V'], ['courir', '🏃', 'correr', 'V'],
        ['marcher', '🚶', 'andar', 'V'], ['sauter', '🤸', 'saltar', 'V'], ['tomber', '🤕', 'caer', 'V'],
        ['faire', '🛠️', 'hacer', 'V'], ['avoir', '✋', 'tener', 'V'],
        ['être', '🧍', 'ser', 'V'], ['aimer', '❤️', 'gustar', 'V'], ['vouloir', '🤲', 'querer', 'V'],
        ['pouvoir', '💪', 'poder', 'V'], ['aider', '🆘', 'ayudar', 'V'], ['attendre', '⏳', 'esperar', 'V'],
        ['chercher', '🔍', 'buscar', 'V'], ['trouver', '🎯', 'encontrar', 'V'],
        ['donner', '🤝', 'dar', 'V'], ['prendre', '✊', 'coger', 'V'], ['montrer', '👆', 'señalar', 'V'],
        ['parler', '🗣️', 'hablar', 'V'], ['rire', '😂', 'reír', 'V'], ['pleurer', '😭', 'llorar', 'V'],
        ["s'asseoir", '🪑', 'sentarse', 'V'], ['se lever', '🧍', 'levantarse', 'V'],
      ],
    },
    decrire: {
      name: 'Décrire', rows: 4, cols: 8,
      cells: [
        ['rouge', '🟥', 'rojo', 'A'], ['bleu', '🟦', 'azul', 'A'], ['vert', '🟩', 'verde', 'A'],
        ['jaune', '🟨', 'amarillo', 'A'], ['orange', '🟧', 'naranja', 'A'], ['violet', '🟪', 'morado', 'A'],
        ['rose', '🌸', 'rosa', 'A'], ['noir', '⬛', 'negro', 'A'],
        ['blanc', '⬜', 'blanco', 'A'], ['marron', '🟫', 'marrón', 'A'], ['grand', '🦒', 'grande', 'A'],
        ['petit', '🐭', 'pequeño', 'A'], ['chaud', '🔥', 'caliente', 'A'], ['froid', '🧊', 'frío', 'A'],
        ['beau', '✨', 'bonito', 'A'], ['gentil', '😇', 'amable', 'A'],
        ['méchant', '😈', 'malo', 'A'], ['rapide', '⚡', 'rápido', 'A'], ['lent', '🐢', 'lento', 'A'],
        ['facile', '👌', 'fácil', 'A'], ['difficile', '🧗', 'difícil', 'A'], ['propre', '✨', 'limpio', 'A'],
        ['sale', '💩', 'sucio', 'A'], ['mouillé', '💦', 'mojado', 'A'],
        ['beaucoup', '➕', 'mucho', 'M'], ['un peu', '🤏', 'poco', 'M'], ['plus', '⬆️', 'más', 'M'],
        ['moins', '⬇️', 'menos', 'M'], ['vide', '🫙', 'vacío', 'A'], ['plein', '🧺', 'lleno', 'A'],
        ['ouvert', '📂', 'abierto', 'A'], ['fermé', '📁', 'cerrado', 'A'],
      ],
    },
  };

  // Clavier AZERTY (5 × 10)
  const KEYBOARD_ROWS = [
    'azertyuiop'.split(''),
    'qsdfghjklm'.split(''),
    ['w', 'x', 'c', 'v', 'b', 'n', "'", 'é', 'è', 'à'],
    ['ç', 'ê', 'ù', '-', ',', '.', '?', '!', '1', '2'],
  ];

  function uid() {
    return 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function makeCell(def, page) {
    const [label, emoji, picto, cat, speak] = def;
    return {
      id: uid(), type: 'word', label, speak: speak || '', emoji, picto,
      color: CATEGORIES[cat] ? CATEGORIES[cat].color : '#FFFFFF', cat,
      addToMessage: page.addToMessage !== false, image: null, linkTo: null,
    };
  }

  function buildDefaultBoards() {
    const boards = {};
    for (const [id, page] of Object.entries(PAGES)) {
      const total = page.rows * page.cols;
      const cells = new Array(total).fill(null);
      page.cells.forEach((def, i) => { if (i < total) cells[i] = makeCell(def, page); });
      boards[id] = { id, name: page.name, rows: page.rows, cols: page.cols, cells };
    }
    // Ligne de dossiers en bas de l'accueil
    const home = boards.accueil;
    FOLDERS.forEach(([label, emoji, picto, target], i) => {
      home.cells[50 + i] = {
        id: uid(), type: 'folder', label, speak: '', emoji, picto, color: CATEGORIES.F.color,
        cat: 'F', addToMessage: false, image: null, linkTo: target,
      };
    });
    // Clavier
    const kb = { id: 'clavier', name: 'Clavier', rows: 5, cols: 10, cells: new Array(50).fill(null) };
    KEYBOARD_ROWS.forEach((row, r) => row.forEach((ch, c) => {
      kb.cells[r * 10 + c] = {
        id: uid(), type: 'letter', label: ch === "'" ? '’' : ch, value: ch, speak: '', emoji: '', picto: null,
        color: '#FFFFFF', cat: 'M', addToMessage: true, image: null, linkTo: null,
      };
    }));
    const cmd = (label, emoji, command) => ({
      id: uid(), type: 'command', command, label, speak: '', emoji, picto: null,
      color: CATEGORIES.C.color, cat: 'C', addToMessage: false, image: null, linkTo: null,
    });
    kb.cells[40] = cmd('espace', '␣', 'space');
    kb.cells[42] = cmd('⌫ lettre', '⌫', 'backspaceLetter');
    kb.cells[44] = cmd('dire le mot', '🔈', 'speakLastWord');
    kb.cells[47] = cmd('effacer tout', '🗑️', 'clear');
    kb.cells[48] = cmd('lire', '🔊', 'speak');
    kb.cells[49] = cmd('accueil', '🏠', 'home');
    boards.clavier = kb;
    return boards;
  }

  function allPictoKeywords() {
    const set = new Set();
    for (const page of Object.values(PAGES)) page.cells.forEach((d) => d[2] && set.add(d[2]));
    FOLDERS.forEach((f) => set.add(f[2]));
    return [...set];
  }

  const VOCAB_VERSION = 2; // à augmenter quand le vocabulaire de base change
  const api = { VOCAB_VERSION, CATEGORIES, PAGES, FOLDERS, buildDefaultBoards, allPictoKeywords, uid };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParloVocab = api;
})(typeof self !== 'undefined' ? self : this);
