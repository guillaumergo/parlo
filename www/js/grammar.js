/*
 * Parlo — moteur de grammaire hors ligne (sans IA, sans internet).
 *
 *  - Sujet + verbe : le premier verbe qui suit un sujet est conjugué, les suivants restent à l'infinitif
 *      je + vouloir + jouer         → je veux jouer
 *  - Temps donné par les cases hier / maintenant / demain :
 *      hier + je + manger           → hier j'ai mangé        (passé composé)
 *      demain + maman + venir       → demain maman va venir  (futur proche)
 *  - Négation : « pas », « jamais », « rien » encadrent le verbe conjugué avec « ne »
 *      je + pas + manger            → je ne mange pas
 *  - Verbes pronominaux : se laver, s'asseoir…   je + se laver → je me lave
 *  - Sans sujet, le mot reste tel quel.
 *  - Élisions : je ai → j'ai, ne aime → n'aime…
 */
(function (root) {
  /* ---------------- Verbes irréguliers ----------------
   * [infinitif, présent (je|tu|il|nous|vous|ils), participe passé, préfixes autorisés]
   * Les préfixes permettent de conjuguer les dérivés (revenir, comprendre…).
   */
  const IRR = [
    ['être', 'suis|es|est|sommes|êtes|sont', 'été'],
    ['avoir', 'ai|as|a|avons|avez|ont', 'eu'],
    ['aller', 'vais|vas|va|allons|allez|vont', 'allé'],
    ['faire', 'fais|fais|fait|faisons|faites|font', 'fait', 're dé satis'],
    ['dire', 'dis|dis|dit|disons|dites|disent', 'dit', 're'],
    ['pouvoir', 'peux|peux|peut|pouvons|pouvez|peuvent', 'pu'],
    ['vouloir', 'veux|veux|veut|voulons|voulez|veulent', 'voulu'],
    ['savoir', 'sais|sais|sait|savons|savez|savent', 'su'],
    ['devoir', 'dois|dois|doit|devons|devez|doivent', 'dû'],
    ['venir', 'viens|viens|vient|venons|venez|viennent', 'venu', 're de sou par inter pré'],
    ['tenir', 'tiens|tiens|tient|tenons|tenez|tiennent', 'tenu', 'ob re main con sou ap at dé'],
    ['prendre', 'prends|prends|prend|prenons|prenez|prennent', 'pris', 'ap com re sur entre'],
    ['mettre', 'mets|mets|met|mettons|mettez|mettent', 'mis', 're per pro ad com sou trans'],
    ['voir', 'vois|vois|voit|voyons|voyez|voient', 'vu', 're'],
    ['boire', 'bois|bois|boit|buvons|buvez|boivent', 'bu'],
    ['lire', 'lis|lis|lit|lisons|lisez|lisent', 'lu', 're é'],
    ['crire', 'cris|cris|crit|crivons|crivez|crivent', 'crit', 'é ré dé ins pres'],
    ['dormir', 'dors|dors|dort|dormons|dormez|dorment', 'dormi', 'en ren'],
    ['partir', 'pars|pars|part|partons|partez|partent', 'parti', 're'],
    ['sortir', 'sors|sors|sort|sortons|sortez|sortent', 'sorti', 'res'],
    ['sentir', 'sens|sens|sent|sentons|sentez|sentent', 'senti', 'res con pres'],
    ['mentir', 'mens|mens|ment|mentons|mentez|mentent', 'menti', 'dé'],
    ['servir', 'sers|sers|sert|servons|servez|servent', 'servi', 'des res'],
    ['courir', 'cours|cours|court|courons|courez|courent', 'couru', 'par se re ac con pour'],
    ['ouvrir', 'ouvre|ouvres|ouvre|ouvrons|ouvrez|ouvrent', 'ouvert', 'r entr'],
    ['couvrir', 'couvre|couvres|couvre|couvrons|couvrez|couvrent', 'couvert', 'dé re'],
    ['offrir', 'offre|offres|offre|offrons|offrez|offrent', 'offert'],
    ['souffrir', 'souffre|souffres|souffre|souffrons|souffrez|souffrent', 'souffert'],
    ['cueillir', 'cueille|cueilles|cueille|cueillons|cueillez|cueillent', 'cueilli', 'ac re'],
    ['rire', 'ris|ris|rit|rions|riez|rient', 'ri', 'sou'],
    ['naître', 'nais|nais|naît|naissons|naissez|naissent', 'né', 're'],
    ['connaître', 'connais|connais|connaît|connaissons|connaissez|connaissent', 'connu', 're'],
    ['paraître', 'parais|parais|paraît|paraissons|paraissez|paraissent', 'paru', 'dis ap re'],
    ['croire', 'crois|crois|croit|croyons|croyez|croient', 'cru'],
    ['vivre', 'vis|vis|vit|vivons|vivez|vivent', 'vécu', 're sur'],
    ['suivre', 'suis|suis|suit|suivons|suivez|suivent', 'suivi', 'pour'],
    ['battre', 'bats|bats|bat|battons|battez|battent', 'battu', 'com dé ab'],
    ['plaire', 'plais|plais|plaît|plaisons|plaisez|plaisent', 'plu', 'dé com'],
    ['taire', 'tais|tais|tait|taisons|taisez|taisent', 'tu'],
    ['asseoir', 'assois|assois|assoit|assoyons|assoyez|assoient', 'assis', 'r'],
    ['mourir', 'meurs|meurs|meurt|mourons|mourez|meurent', 'mort'],
    ['fuir', 'fuis|fuis|fuit|fuyons|fuyez|fuient', 'fui', 's\'en'],
    ['appeler', 'appelle|appelles|appelle|appelons|appelez|appellent', 'appelé', 'r'],
    ['jeter', 'jette|jettes|jette|jetons|jetez|jettent', 'jeté', 're pro'],
    ['envoyer', 'envoie|envoies|envoie|envoyons|envoyez|envoient', 'envoyé', 'r'],
    ['falloir', 'faut|faut|faut|faut|faut|faut', 'fallu'],
    ['pleuvoir', 'pleut|pleut|pleut|pleut|pleut|pleuvent', 'plu'],
    // familles par terminaison (s'appliquent à tout verbe qui finit ainsi)
    ['cevoir', 'çois|çois|çoit|cevons|cevez|çoivent', 'çu', '*'],
    ['uire', 'uis|uis|uit|uisons|uisez|uisent', 'uit', '*'],
    ['indre', 'ins|ins|int|ignons|ignez|ignent', 'int', '*'],
  ].map(([inf, pres, pp, pre]) => ({ inf, pres: pres.split('|'), pp, pre: pre ? pre.split(' ') : [] }));

  // Verbes conjugués avec « être » au passé composé (+ tous les pronominaux)
  const ETRE_AUX = new Set(('aller venir revenir devenir arriver partir repartir sortir entrer rentrer rester ' +
    'tomber retomber monter remonter descendre redescendre retourner naître mourir décéder').split(' '));

  // Verbes du 2e groupe (-ir → -issons)
  const GROUP2 = new Set(('finir choisir grandir remplir réussir rougir salir punir obéir réfléchir guérir nourrir ' +
    'applaudir atterrir bâtir agir ralentir vieillir maigrir grossir saisir avertir établir fournir garantir unir ' +
    'pâlir jaillir rôtir ravir polir bondir frémir accomplir désobéir envahir éblouir étourdir rafraîchir ' +
    'refroidir réjouir démolir épanouir fleurir franchir gémir trahir vomir noircir blanchir jaunir verdir ' +
    'durcir mûrir aplatir arrondir élargir affaiblir assouplir enrichir appauvrir rajeunir enlaidir embellir').split(' '));

  const SUBJECTS = {
    je: { p: 0 }, "j'": { p: 0 }, tu: { p: 1 }, il: { p: 2, g: 'm' }, elle: { p: 2, g: 'f' }, on: { p: 2, g: 'm' },
    nous: { p: 3 }, vous: { p: 4 }, ils: { p: 5, g: 'm' }, elles: { p: 5, g: 'f' },
    'tout le monde': { p: 2, g: 'm' },
  };
  // Personnes : genre (pour l'accord du participe avec « être »)
  const FEMININE = new Set(('maman mère sœur soeur mamie mémé grand-mère tata tante copine amie maîtresse ' +
    'éducatrice infirmière fille dame madame cousine marraine nounou maîtresse').split(' '));
  const NOT_SUBJECT = new Set(['moi', 'toi', 'personne', 'lui', 'eux']);

  const TENSE_MARKERS = {
    hier: 'past', 'avant-hier': 'past', avant: 'past', 'ce matin': 'past', 'tout à l\'heure': null,
    'la semaine dernière': 'past', 'déjà': 'past',
    demain: 'future', 'après-demain': 'future', 'plus tard': 'future', bientôt: 'future', 'tout à l’heure': null,
    'la semaine prochaine': 'future', après: 'future', 'ce soir': 'future',
    maintenant: 'present', "aujourd'hui": 'present', 'tout de suite': 'present',
  };
  const NEG_WORDS = new Set(['pas', 'jamais', 'rien', 'plus jamais']);
  const NE_WORDS = new Set(['ne', "n'"]);
  const COORD = new Set(['et', 'mais', 'puis', 'ou', 'alors', 'après']);

  const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  const VOWEL = /^[aeiouyhàâäéèêëîïôöûüœæ]/i;
  const H_ASPIRE = /^(hurl|hai|haï|hach|hant|hasard|haut|heurt|hiss|hon|hoqu|huer|hutt)/i;

  const norm = (s) => String(s || '').trim().toLowerCase().replace(/’/g, "'");

  /* ---------------- Analyse d'un verbe ---------------- */

  function findIrregular(inf) {
    for (const v of IRR) {
      if (inf === v.inf) return { v, prefix: '' };
      if (inf.endsWith(v.inf) && inf.length > v.inf.length) {
        const prefix = inf.slice(0, -v.inf.length);
        if (v.pre.includes('*') || v.pre.includes(prefix)) return { v, prefix };
      }
    }
    return null;
  }

  /** Conjugue un verbe (sans pronom réfléchi) : renvoie {pres:[6], pp} ou null si inconnu. */
  function paradigm(inf) {
    const irr = findIrregular(inf);
    if (irr) return { pres: irr.v.pres.map((f) => irr.prefix + f), pp: irr.prefix + irr.v.pp };
    if (inf.endsWith('er') && inf.length > 2) {
      const st = inf.slice(0, -2);
      let strong = st; // radical pour je, tu, il, ils
      if (/[ou]y$/.test(st)) strong = st.slice(0, -1) + 'i';
      else if (/e[bcdfgjklmnpqrstvz]$/.test(st)) strong = st.replace(/e([bcdfgjklmnpqrstvz])$/, 'è$1');
      else if (/é[^aeiouyéèêëàâîïôûù]+$/.test(st)) strong = st.replace(/é([^aeiouyéèêëàâîïôûù]+)$/, 'è$1');
      let nous = st;
      if (st.endsWith('g')) nous = st + 'e';
      else if (st.endsWith('c')) nous = st.slice(0, -1) + 'ç';
      return { pres: [strong + 'e', strong + 'es', strong + 'e', nous + 'ons', st + 'ez', strong + 'ent'], pp: st + 'é' };
    }
    if (inf.endsWith('ir')) {
      const st = inf.slice(0, -2);
      // 2e groupe (liste + verbes inconnus en -ir par défaut)
      return { pres: [st + 'is', st + 'is', st + 'it', st + 'issons', st + 'issez', st + 'issent'], pp: st + 'i', guess: !GROUP2.has(inf) };
    }
    if (inf.endsWith('dre')) {
      const st = inf.slice(0, -2);
      return { pres: [st + 's', st + 's', st, st + 'ons', st + 'ez', st + 'ent'], pp: st.slice(0, -1) + (st.endsWith('d') ? 'du' : 'u') };
    }
    return null;
  }

  /** Découpe « se laver les mains » → {refl:true, inf:'laver', rest:' les mains'} */
  function parseVerb(text) {
    let t = norm(text);
    let refl = false;
    const m = /^(se |s')(.+)$/.exec(t);
    if (m) { refl = true; t = m[2]; }
    const sp = t.indexOf(' ');
    const head = sp < 0 ? t : t.slice(0, sp);
    const rest = sp < 0 ? '' : t.slice(sp);
    const para = paradigm(head);
    if (!para) return null;
    return { refl, inf: head, rest, para };
  }

  /** Reconnaît si un mot isolé est un verbe à l'infinitif connu (pour les mots tapés au clavier). */
  function isKnownInfinitive(text) {
    const t = norm(text).replace(/^(se |s')/, '');
    if (/\s/.test(t)) return false;
    if (findIrregular(t)) return true;
    return GROUP2.has(t) || COMMON_ER.has(t);
  }
  const COMMON_ER = new Set(('aimer manger jouer regarder écouter parler marcher chanter danser sauter tomber ' +
    'arrêter donner aider chercher trouver montrer laver fermer enlever pleurer travailler habiter rester ' +
    'arriver entrer rentrer monter acheter penser demander porter passer tourner commencer lever coucher ' +
    'habiller brosser coiffer goûter dessiner colorier découper coller ranger nager rouler pousser tirer ' +
    'attraper lancer gagner continuer changer bouger caresser embrasser câliner téléphoner détester préférer ' +
    'répéter essayer payer nettoyer appeler jeter promener baigner doucher reposer amuser fâcher calmer ' +
    'énerver inquiéter ennuyer réveiller dépêcher sécher cuisiner préparer visiter voyager compter raconter').split(' '));

  /* ---------------- Réalisation d'une forme conjuguée ---------------- */

  function agree(pp, g, plural) {
    let out = pp;
    if (g === 'f' && !out.endsWith('e')) out += 'e';
    if (plural && !/[sx]$/.test(out)) out += 's';
    return out;
  }

  /**
   * Conjugue un verbe pour un sujet.
   * @returns {plain, withNeg} — forme sans négation (affichage) et avec négation (phrase)
   */
  function conjugate(pv, subj, tense, neg) {
    const p = subj.p;
    const plural = p >= 3;
    const rp = pv.refl ? REFL[p] + ' ' : '';
    const ne = neg ? 'ne ' : '';
    const negW = neg ? ' ' + neg : '';
    let plain, withNeg;
    if (tense === 'past') {
      const etre = pv.refl || ETRE_AUX.has(pv.inf);
      const aux = (etre ? paradigm('être') : paradigm('avoir')).pres[p];
      const pp = etre ? agree(pv.para.pp, subj.g, plural) : pv.para.pp;
      plain = `${rp}${aux} ${pp}`;
      withNeg = `${ne}${rp}${aux}${negW} ${pp}`;
    } else if (tense === 'future') {
      const aux = paradigm('aller').pres[p];
      plain = `${aux} ${rp}${pv.inf}`;
      withNeg = `${ne}${aux}${negW} ${rp}${pv.inf}`;
    } else {
      const f = pv.para.pres[p];
      plain = `${rp}${f}`;
      withNeg = `${ne}${rp}${f}${negW}`;
    }
    return { plain: plain + pv.rest, withNeg: withNeg + pv.rest };
  }

  /* ---------------- Analyse de la phrase ---------------- */

  function classify(tok, opts) {
    const t = norm(tok.text);
    const gram = tok.gram || '';
    if (gram === 'fixed') return { type: 'word' };
    if (gram === 'subj-m' || gram === 'subj-f') return { type: 'subj', subj: { p: 2, g: gram === 'subj-f' ? 'f' : 'm' } };
    if (t === "c'est") return { type: 'cest' };
    if (SUBJECTS[t]) {
      const s = { ...SUBJECTS[t] };
      if (s.p === 0 || (s.p === 1 && opts.tuGender)) s.g = s.p === 0 ? opts.gender : opts.tuGender;
      return { type: 'subj', subj: s };
    }
    if (tok.cat === 'P' && !NOT_SUBJECT.has(t)) {
      return { type: 'subj', subj: { p: 2, g: FEMININE.has(t) ? 'f' : 'm' } };
    }
    if (t in TENSE_MARKERS) return { type: 'tense', tense: TENSE_MARKERS[t] };
    if (NEG_WORDS.has(t)) return { type: 'neg' };
    if (NE_WORDS.has(t)) return { type: 'ne' };
    if (COORD.has(t)) return { type: 'coord' };
    if (gram === 'verb' || tok.cat === 'V' || (!tok.cat && isKnownInfinitive(t))) {
      const pv = parseVerb(t);
      if (pv) return { type: 'verb', pv };
    }
    return { type: 'word' };
  }

  /**
   * Compose la phrase.
   * @param tokens [{text, cat, gram}]
   * @param opts {conjugate, elision, gender:'m'|'f'}
   * @returns {text, display:[string]} — display = texte affiché sous chaque picto de la barre
   */
  function compose(tokens, opts = {}) {
    const o = { conjugate: true, elision: true, gender: 'm', ...opts };
    const display = tokens.map((t) => t.text);
    const out = tokens.map((t) => t.text);
    if (!o.conjugate) return finish(out, display, o);

    const info = tokens.map((t) => classify(t, o));
    // Temps par défaut de la phrase : premier marqueur trouvé
    const sentenceTense = (info.find((x) => x.type === 'tense' && x.tense) || {}).tense || 'present';

    let subj = null;          // sujet en cours
    let finiteDone = false;   // un verbe a déjà été conjugué pour ce sujet
    let clause = null;        // {verbIndex, negIndexes:[], neIndexes:[]}
    let tense = null;         // temps explicite le plus récent
    const clauses = [];

    info.forEach((x, i) => {
      if (x.type === 'tense' && x.tense) tense = x.tense;
      if (x.type === 'subj') {
        subj = x.subj; finiteDone = false;
        clause = { subj, verbIndex: -1, neg: [], ne: [], tense: null };
        clauses.push(clause);
      } else if (x.type === 'cest') {
        clause = { subj: { p: 2, g: 'm' }, verbIndex: i, cest: true, neg: [], ne: [], tense: tense || sentenceTense };
        clauses.push(clause);
        subj = clause.subj; finiteDone = true;
      } else if (x.type === 'coord') {
        // « je mange et je bois » ou « je mange et boire » : le verbe suivant est conjugué à nouveau
        if (subj) finiteDone = false;
      } else if (x.type === 'verb' && subj && !finiteDone) {
        finiteDone = true;
        if (clause.verbIndex >= 0) {
          clause = { subj, verbIndex: -1, neg: [], ne: [], tense: null };
          clauses.push(clause);
        }
        clause.verbIndex = i;
        clause.tense = tense || sentenceTense;
      } else if (x.type === 'neg' && clause) clause.neg.push(i);
      else if (x.type === 'ne' && clause) clause.ne.push(i);
    });

    for (const c of clauses) {
      if (c.verbIndex < 0) continue;
      const negWord = c.neg.length ? norm(tokens[c.neg[0]].text) : null;
      let r;
      if (c.cest) {
        const forms = { present: ["c'est", "ce n'est"], past: ["c'était", "ce n'était"], future: ['ça va être', 'ça ne va'] };
        const f = forms[c.tense] || forms.present;
        r = {
          plain: f[0],
          withNeg: negWord ? (c.tense === 'future' ? `ça ne va ${negWord} être` : `${f[1]} ${negWord}`) : f[0],
        };
      } else {
        r = conjugate(info[c.verbIndex].pv, c.subj, c.tense, negWord);
      }
      display[c.verbIndex] = o.elision ? elide(r.plain) : r.plain;
      out[c.verbIndex] = r.withNeg;
      if (negWord) { c.neg.forEach((k) => { out[k] = ''; }); c.ne.forEach((k) => { out[k] = ''; }); }
    }
    return finish(out, display, o);
  }

  function finish(out, display, o) {
    let text = out.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (o.elision) text = elide(text);
    return { text, display };
  }

  const ELIDE = ['je', 'me', 'te', 'se', 'le', 'la', 'ne', 'de', 'que', 'jusque', 'lorsque', 'puisque'];
  function elide(text) {
    let t = ' ' + text + ' ';
    t = t.replace(/ à le (?=[^aeiouyhàâäéèêëîïôöûüœ])/gi, ' au ')
      .replace(/ à les /gi, ' aux ')
      .replace(/ de le (?=[^aeiouyhàâäéèêëîïôöûüœ])/gi, ' du ')
      .replace(/ de les /gi, ' des ')
      .replace(/ si il(s?) /gi, " s'il$1 ");
    const re = new RegExp('(?<=\\s)(' + ELIDE.join('|') + ') (?=(\\S+))', 'gi');
    t = t.replace(re, (m, w, next) => (VOWEL.test(next) && !H_ASPIRE.test(next) ? w.slice(0, -1) + "'" : m));
    return t.trim();
  }

  const api = { compose, conjugate, parseVerb, paradigm, elide, TENSE_MARKERS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParloGrammar = api;
})(typeof self !== 'undefined' ? self : this);
