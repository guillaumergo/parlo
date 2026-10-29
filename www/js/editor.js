/* Parlo — éditeur : cases, pages, pictogrammes ARASAAC, photos, sauvegarde. */
(function (root) {
  const App = root.ParloApp;
  const DB = root.ParloDB;
  const TTS = root.ParloTTS;
  const Vocab = root.ParloVocab;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => App.escapeHtml(s);

  const ARASAAC_API = 'https://api.arasaac.org/v1/pictograms';
  const ARASAAC_IMG = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

  let moveMode = false;
  let moveFrom = null;

  const Editor = {};
  root.ParloEditor = Editor;

  /* ---------------- Mode édition ---------------- */

  Editor.handleMenu = function (act) {
    if (act === 'edit') Editor.enter();
    else if (act === 'pages') openPages();
    else if (act === 'data') openData();
  };

  Editor.enter = function () {
    App.editMode = true;
    TTS.stop();
    $('#editbar').hidden = false;
    App.render();
  };

  Editor.exit = function () {
    App.editMode = false;
    setMove(false);
    $('#editbar').hidden = true;
    App.render();
  };

  Editor.onRender = function () {
    const sel = $('#ebPage');
    sel.innerHTML = sortedBoards().map((b) =>
      `<option value="${esc(b.id)}">${b.id === App.homeId ? '🏠 ' : ''}${esc(b.name)}</option>`).join('');
    sel.value = App.currentId;
    if (moveMode && moveFrom != null) {
      const el = document.querySelector(`#grid .cell[data-i="${moveFrom}"]`);
      el && el.classList.add('move-src');
    }
  };

  function sortedBoards() {
    return Object.values(App.boards).sort((a, b) =>
      (a.id === App.homeId ? -1 : b.id === App.homeId ? 1 : a.name.localeCompare(b.name, 'fr')));
  }

  function setMove(on) {
    moveMode = on; moveFrom = null;
    $('#ebMove').classList.toggle('on', on);
    $('#ebHint').textContent = on ? 'Touchez une case, puis l\'endroit où la placer' : 'Touchez une case pour la modifier';
  }

  Editor.onCellTap = function (index, el) {
    const b = App.board();
    if (moveMode) {
      if (moveFrom == null) {
        if (!b.cells[index]) return;
        moveFrom = index;
        el.classList.add('move-src');
      } else {
        const tmp = b.cells[index];
        b.cells[index] = b.cells[moveFrom];
        b.cells[moveFrom] = tmp;
        moveFrom = null;
        App.saveEdited(b);
        App.render();
      }
      return;
    }
    openCell(index);
  };

  $('#ebDone').addEventListener('click', () => Editor.exit());
  $('#ebMove').addEventListener('click', () => setMove(!moveMode));
  $('#ebPage').addEventListener('change', (e) => App.navigate(e.target.value));
  $('#ebPageProps').addEventListener('click', () => openPageProps(App.currentId));
  $('#ebNewPage').addEventListener('click', () => newPage(true));

  /* ---------------- Éditeur de case ---------------- */

  let draft = null;
  let draftIndex = -1;

  const PALETTE = [
    ...Object.entries(Vocab.CATEGORIES).map(([k, c]) => ({ color: c.color, name: c.name, cat: k })),
    { color: '#FFFFFF', name: 'Blanc' }, { color: '#FFB4A8', name: 'Rouge clair' },
    { color: '#A8E6E0', name: 'Turquoise' }, { color: '#2E3A46', name: 'Sombre' },
  ];

  function openCell(index) {
    const b = App.board();
    draftIndex = index;
    const existing = b.cells[index];
    draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: Vocab.uid(), type: 'word', label: '', speak: '', emoji: '', picto: null, image: null,
      color: '#FFFFFF', cat: null, addToMessage: true, linkTo: null,
    };
    draft._pendingImage = null;
    $('#ceLabel').value = draft.label || '';
    $('#ceSpeak').value = draft.speak || '';
    $('#ceType').value = draft.type;
    $('#ceCmd').value = draft.command || 'speak';
    $('#ceLetter').value = draft.value || '';
    $('#ceAdd').checked = draft.addToMessage !== false;
    $('#ceHidden').checked = !!draft.hidden;
    $('#ceGram').value = draft.gram || '';
    $('#ceDelete').hidden = !existing;
    fillLinkSelect();
    $('#ceColors').innerHTML = PALETTE.map((p) =>
      `<button class="sw" title="${esc(p.name)}" data-c="${p.color}" data-cat="${p.cat || ''}" style="background:${p.color}"></button>`).join('') +
      '<label class="sw custom" title="Autre couleur">🎨<input type="color" id="ceColorCustom"></label>';
    syncCellForm();
    $('#dlgCell').showModal();
  }

  function fillLinkSelect() {
    $('#ceLink').innerHTML = sortedBoards().map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('') +
      '<option value="__new">＋ Créer une nouvelle page…</option>';
    $('#ceLink').value = draft.linkTo && App.boards[draft.linkTo] ? draft.linkTo : App.homeId;
  }

  function draftImageSrc() {
    if (draft._pendingImage === '') return null;
    if (draft._pendingImage) return draft._pendingImage;
    return App.imageSrc(draft);
  }

  function syncCellForm() {
    const t = draft.type;
    $('#ceLinkRow').hidden = t !== 'folder';
    $('#ceCmdRow').hidden = t !== 'command';
    $('#ceLetterRow').hidden = t !== 'letter';
    $('#ceAddRow').hidden = t !== 'word';
    $('#ceGramRow').hidden = t !== 'word';
    const prev = $('#cePreview');
    prev.className = 'cell t-' + t;
    App.applyCellStyle(prev, draft);
    const src = draftImageSrc();
    prev.innerHTML = `<span class="lbl">${esc(draft.label || '')}</span>` +
      (src ? `<img class="sym" src="${src}" alt="">` : (draft.emoji ? `<span class="sym emoji">${draft.emoji}</span>` : ''));
    $('#ceColors').querySelectorAll('.sw[data-c]').forEach((s) =>
      s.classList.toggle('on', s.dataset.c.toLowerCase() === (draft.color || '').toLowerCase()));
  }

  $('#ceLabel').addEventListener('input', (e) => { draft.label = e.target.value; syncCellForm(); });
  $('#ceSpeak').addEventListener('input', (e) => { draft.speak = e.target.value; });
  $('#ceType').addEventListener('change', (e) => {
    draft.type = e.target.value;
    if (draft.type === 'folder') { draft.color = Vocab.CATEGORIES.F.color; draft.linkTo = $('#ceLink').value; }
    syncCellForm();
  });
  $('#ceLink').addEventListener('change', (e) => {
    if (e.target.value === '__new') {
      const nb = newPage(false, draft.label || 'Nouvelle page');
      fillLinkSelect();
      $('#ceLink').value = nb.id;
    }
    draft.linkTo = $('#ceLink').value;
  });
  $('#ceCmd').addEventListener('change', (e) => { draft.command = e.target.value; });
  $('#ceLetter').addEventListener('input', (e) => { draft.value = e.target.value; });
  $('#ceAdd').addEventListener('change', (e) => { draft.addToMessage = e.target.checked; });
  $('#ceHidden').addEventListener('change', (e) => { draft.hidden = e.target.checked; });
  $('#ceGram').addEventListener('change', (e) => { draft.gram = e.target.value; });
  $('#ceColors').addEventListener('click', (e) => {
    const s = e.target.closest('.sw[data-c]'); if (!s) return;
    draft.color = s.dataset.c;
    if (s.dataset.cat) draft.cat = s.dataset.cat;
    syncCellForm();
  });
  $('#ceColors').addEventListener('input', (e) => {
    if (e.target.id === 'ceColorCustom') { draft.color = e.target.value; syncCellForm(); }
  });
  $('#ceTest').addEventListener('click', () => TTS.speak(($('#ceSpeak').value || $('#ceLabel').value)));
  $('#ceNoImg').addEventListener('click', () => { draft._pendingImage = ''; draft.emoji = ''; syncCellForm(); });
  $('#ceEmoji').addEventListener('click', openEmoji);
  $('#cePhoto').addEventListener('click', () => $('#ceFile').click());
  $('#ceFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      draft._pendingImage = await resizeImage(f, 480);
      syncCellForm();
    } catch (err) { App.toast("Impossible de lire l'image", 'error'); }
  });
  $('#ceArasaac').addEventListener('click', () => openArasaac(draft.label));

  $('#ceDelete').addEventListener('click', () => {
    if (!confirm('Vider cette case ?')) return;
    const b = App.board();
    b.cells[draftIndex] = null;
    App.saveEdited(b);
    $('#dlgCell').close();
    App.render();
  });

  $('#ceSave').addEventListener('click', async () => {
    const b = App.board();
    if (draft.type === 'folder') draft.linkTo = $('#ceLink').value;
    if (draft.type === 'command') draft.command = $('#ceCmd').value;
    if (draft.type === 'letter') { draft.value = $('#ceLetter').value || draft.label; if (!draft.label) draft.label = draft.value; }
    if (draft._pendingImage === '') { draft.image = null; draft.picto = null; }
    else if (draft._pendingImage) {
      const id = Vocab.uid();
      await DB.put('images', id, draft._pendingImage);
      App.images.set(id, draft._pendingImage);
      draft.image = 'img:' + id;
      draft.picto = null;
    }
    delete draft._pendingImage;
    if (!draft.label && !draft.image && !draft.emoji && !draft.picto) {
      App.toast('Ajoutez au moins un libellé ou une image', 'warn');
      return;
    }
    b.cells[draftIndex] = draft;
    await App.saveEdited(b);
    $('#dlgCell').close();
    App.render();
  });

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ---------------- Emoji ---------------- */

  const QUICK_EMOJI = '😀😢😠😨🥱🤒👍👎❤️⭐🍎🍌🥖🍝🥤💧🚽🛏️🏠🏫🚗🚌⚽🧸📖🎵📺🎨🐶🐱👋🙏🆘⏸️✋👀'.match(/\p{Extended_Pictographic}️?/gu);

  function openEmoji() {
    const d = $('#dlgEmoji');
    $('#emojiInput').value = draft.emoji || '';
    $('#emojiQuick').innerHTML = QUICK_EMOJI.map((e) => `<button>${e}</button>`).join('');
    d.showModal();
  }
  $('#emojiQuick').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (b) $('#emojiInput').value = b.textContent;
  });
  $('#emojiOk').addEventListener('click', () => {
    draft.emoji = $('#emojiInput').value.trim();
    draft._pendingImage = '';
    syncCellForm();
    $('#dlgEmoji').close();
  });

  /* ---------------- ARASAAC ---------------- */

  function openArasaac(q) {
    $('#arQuery').value = q || '';
    $('#arResults').innerHTML = '';
    $('#dlgArasaac').showModal();
    if (q) searchArasaac();
  }

  async function searchArasaac() {
    const q = $('#arQuery').value.trim();
    if (!q) return;
    const box = $('#arResults');
    box.innerHTML = '<p class="hint">Recherche…</p>';
    try {
      const res = await fetch(`${ARASAAC_API}/fr/search/${encodeURIComponent(q)}`);
      if (res.status === 404) { box.innerHTML = '<p class="hint">Aucun résultat.</p>'; return; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = (await res.json()).slice(0, 48);
      box.innerHTML = list.map((p) => {
        const kw = (p.keywords && p.keywords[0] && p.keywords[0].keyword) || '';
        return `<button data-id="${p._id}" title="${esc(kw)}"><img loading="lazy" src="${ARASAAC_IMG(p._id)}" alt="${esc(kw)}"></button>`;
      }).join('') || '<p class="hint">Aucun résultat.</p>';
    } catch (e) {
      box.innerHTML = '<p class="hint err">Recherche impossible : vérifiez la connexion internet.</p>';
    }
  }
  $('#arGo').addEventListener('click', searchArasaac);
  $('#arQuery').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchArasaac(); });
  $('#arResults').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    b.classList.add('loading');
    try {
      draft._pendingImage = await urlToDataUrl(ARASAAC_IMG(b.dataset.id));
      syncCellForm();
      $('#dlgArasaac').close();
    } catch (err) {
      App.toast('Téléchargement du picto impossible', 'error');
    } finally { b.classList.remove('loading'); }
  });

  async function urlToDataUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  /* ---------------- Pages ---------------- */

  function newPage(open, name) {
    const id = 'p' + Vocab.uid();
    const b = { id, name: name || 'Nouvelle page', rows: 4, cols: 6, cells: new Array(24).fill(null) };
    App.boards[id] = b;
    App.saveEdited(b);
    if (open) { App.navigate(id); openPageProps(id); }
    return b;
  }

  let pageEditing = null;
  function openPageProps(id) {
    const b = App.boards[id];
    pageEditing = b;
    $('#pgTitle').textContent = 'Page « ' + b.name + ' »';
    $('#pgName').value = b.name;
    $('#pgRows').value = b.rows;
    $('#pgCols').value = b.cols;
    $('#pgWarn').textContent = '';
    $('#pgDelete').hidden = id === App.homeId;
    $('#dlgPage').showModal();
  }

  function lostCells(b, rows, cols) {
    let n = 0;
    b.cells.forEach((c, i) => { if (c && (Math.floor(i / b.cols) >= rows || i % b.cols >= cols)) n++; });
    return n;
  }
  const warnResize = () => {
    const n = lostCells(pageEditing, +$('#pgRows').value, +$('#pgCols').value);
    $('#pgWarn').textContent = n ? `⚠ ${n} case(s) seront supprimées par ce redimensionnement.` : '';
  };
  $('#pgRows').addEventListener('input', warnResize);
  $('#pgCols').addEventListener('input', warnResize);

  $('#pgSave').addEventListener('click', () => {
    const b = pageEditing;
    const rows = Math.max(1, Math.min(12, +$('#pgRows').value || b.rows));
    const cols = Math.max(1, Math.min(16, +$('#pgCols').value || b.cols));
    if (rows !== b.rows || cols !== b.cols) {
      const cells = new Array(rows * cols).fill(null);
      b.cells.forEach((c, i) => {
        const r = Math.floor(i / b.cols), k = i % b.cols;
        if (c && r < rows && k < cols) cells[r * cols + k] = c;
      });
      Object.assign(b, { rows, cols, cells });
    }
    b.name = $('#pgName').value.trim() || b.name;
    App.saveEdited(b);
    $('#dlgPage').close();
    App.render();
    if ($('#dlgPages').open) openPages();
  });

  async function deletePage(id) {
    if (id === App.homeId) return;
    const b = App.boards[id];
    if (!confirm(`Supprimer la page « ${b.name} » ? Les dossiers qui y mènent seront désactivés.`)) return false;
    delete App.boards[id];
    await DB.del('boards', id);
    for (const other of Object.values(App.boards)) {
      let changed = false;
      other.cells.forEach((c) => { if (c && c.type === 'folder' && c.linkTo === id) { c.linkTo = App.homeId; changed = true; } });
      if (changed) App.saveEdited(other);
    }
    App.history = App.history.filter((h) => h !== id);
    if (App.currentId === id) App.currentId = App.homeId;
    App.render();
    return true;
  }
  $('#pgDelete').addEventListener('click', async () => {
    if (await deletePage(pageEditing.id)) $('#dlgPage').close();
  });

  function openPages() {
    const list = $('#pagesList');
    list.innerHTML = sortedBoards().map((b) => `
      <li data-id="${esc(b.id)}">
        <span class="pname">${b.id === App.homeId ? '🏠 ' : ''}${esc(b.name)} <small>${b.rows}×${b.cols}</small></span>
        <button data-a="open">Ouvrir</button>
        <button data-a="props">Modifier</button>
        <button data-a="dup">Dupliquer</button>
        ${b.id === App.homeId ? '' : '<button data-a="home">Accueil</button><button data-a="del" class="danger">Supprimer</button>'}
      </li>`).join('');
    if (!$('#dlgPages').open) $('#dlgPages').showModal();
  }
  $('#pagesList').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-a]'); if (!btn) return;
    const id = btn.closest('li').dataset.id;
    const a = btn.dataset.a;
    if (a === 'open') { $('#dlgPages').close(); App.navigate(id); }
    else if (a === 'props') openPageProps(id);
    else if (a === 'dup') {
      const src = App.boards[id];
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = 'p' + Vocab.uid(); copy.name = src.name + ' (copie)';
      copy.cells.forEach((c) => { if (c) c.id = Vocab.uid(); });
      App.boards[copy.id] = copy; await App.saveEdited(copy); openPages();
    } else if (a === 'home') {
      App.homeId = id; await DB.put('kv', 'home', id); App.history = []; App.render(); openPages();
    } else if (a === 'del') { if (await deletePage(id)) openPages(); }
  });
  $('#pagesNew').addEventListener('click', () => { $('#dlgPages').close(); Editor.enter(); newPage(true); });

  /* ---------------- Sauvegarde / restauration ---------------- */

  function openData() { $('#dataStatus').textContent = ''; $('#dlgData').showModal(); }
  const status = (t) => { $('#dataStatus').textContent = t; };

  $('#dataExport').addEventListener('click', async () => {
    status('Préparation…');
    const payload = {
      app: 'parlo', version: 1, date: new Date().toISOString(),
      settings: App.settings, home: App.homeId,
      boards: Object.values(App.boards),
      images: await DB.entries('images'),
    };
    const json = JSON.stringify(payload);
    const name = 'parlo-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json';
    if (TTS.IS_NATIVE) {
      try {
        const { uri } = await App.native('Filesystem', 'writeFile', { path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
        await App.native('Share', 'share', { title: 'Sauvegarde Parlo', files: [uri] });
        status('Sauvegarde prête : choisissez où l\'enregistrer (Drive, Fichiers, e-mail…).');
        DB.put('kv', 'lastBackup', Date.now());
      } catch (e) { status('Export impossible : ' + (e.message || e)); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status('Sauvegarde enregistrée dans « Téléchargements » ✔');
    DB.put('kv', 'lastBackup', Date.now());
  });

  $('#dataImport').addEventListener('click', () => $('#dataFile').click());
  $('#dataFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'parlo' || !Array.isArray(data.boards)) throw new Error('fichier non reconnu');
      if (!confirm(`Remplacer toutes les pages actuelles par cette sauvegarde (${data.boards.length} pages) ?`)) return;
      await DB.clear('boards'); await DB.clear('images');
      for (const b of data.boards) await DB.put('boards', b.id, b);
      for (const [k, v] of data.images || []) await DB.put('images', k, v);
      await DB.put('kv', 'edited', true);
      await DB.put('kv', 'vocabVersion', Vocab.VOCAB_VERSION);
      if (data.settings) { Object.assign(App.settings, data.settings); await DB.put('kv', 'settings', App.settings); }
      App.boards = Object.fromEntries(data.boards.map((b) => [b.id, b]));
      App.homeId = App.boards[data.home] ? data.home : data.boards[0].id;
      await DB.put('kv', 'home', App.homeId);
      await App.loadImages();
      App.history = []; App.currentId = App.homeId;
      App.render();
      status('Sauvegarde restaurée ✔');
    } catch (err) { status('Restauration impossible : ' + err.message); }
  });

  $('#dataResetVocab').addEventListener('click', async () => {
    if (!confirm('Remplacer toutes les pages par le vocabulaire de base ? Vos modifications seront perdues (pensez à exporter une sauvegarde).')) return;
    await App.resetVocabulary();
    status('Vocabulaire de base restauré.');
  });

  $('#dataPictos').addEventListener('click', async () => {
    const kws = Vocab.allPictoKeywords().filter((k) => !App.images.has('kw:' + k) && !App.bundledPictos[k]);
    if (!kws.length) { status('Tous les pictos du vocabulaire de base sont déjà sur la tablette ✔'); return; }
    let done = 0, failed = 0;
    status(`Téléchargement de ${kws.length} pictos…`);
    const queue = kws.slice();
    async function worker() {
      while (queue.length) {
        const kw = queue.shift();
        try {
          const res = await fetch(`${ARASAAC_API}/es/bestsearch/${encodeURIComponent(kw)}`);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const [first] = await res.json();
          const dataUrl = await urlToDataUrl(ARASAAC_IMG(first._id));
          await DB.put('images', 'kw:' + kw, dataUrl);
          App.images.set('kw:' + kw, dataUrl);
        } catch (e) { failed++; }
        done++;
        status(`Pictos : ${done} / ${kws.length}${failed ? ` (${failed} introuvables)` : ''}`);
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    App.render();
    status(failed === kws.length ? 'Échec : la tablette est-elle connectée à internet ?' : `Terminé ✔ ${done - failed} pictos enregistrés sur la tablette.`);
  });
})(self);
