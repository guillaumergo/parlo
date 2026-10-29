/* Parlo — cœur de l'application : grilles, barre de message, accès tactile, réglages. */
(function (root) {
  const DB = root.ParloDB;
  const TTS = root.ParloTTS;
  const Vocab = root.ParloVocab;
  const Grammar = root.ParloGrammar;
  const $ = (s) => document.querySelector(s);
  const cap = root.Capacitor;
  const IS_NATIVE = TTS.IS_NATIVE;

  const DEFAULTS = {
    engine: 'piper', piperVoice: null, systemVoice: null, rate: 1, pitch: 1, volume: 1,
    activation: 'release', holdTime: 600, debounce: 250, ignoreMulti: true,
    speakOnSelect: true, autoHome: false,
    fontScale: 1, gap: 6, labelPos: 'top', outline: 'medium', outlinePictos: false, showEmpty: false, msgPictos: true, pageTitle: false,
    grammar: true, conjugate: true, childGender: 'm', clearAfter: false, tapMsgToSpeak: true,
    lock: 'hold', pin: '1234',
  };

  const App = {
    settings: { ...DEFAULTS },
    boards: {},
    homeId: 'accueil',
    currentId: 'accueil',
    history: [],
    message: [],
    editMode: false,
    images: new Map(), // id -> dataURL
    bundledPictos: {}, // mot-clé -> fichier
  };
  root.ParloApp = App;

  /* ---------------- Utilitaires ---------------- */

  let toastTimer = null;
  App.toast = function (msg, type = 'info', ms = 3000) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, ms);
  };

  let saveSettingsTimer = null;
  App.saveSettings = function () {
    clearTimeout(saveSettingsTimer);
    saveSettingsTimer = setTimeout(() => DB.put('kv', 'settings', App.settings), 300);
  };
  App.saveBoard = (b) => DB.put('boards', b.id, b);
  /** Enregistre une page modifiée par l'adulte (elle ne sera plus remplacée par les mises à jour du vocabulaire). */
  App.saveEdited = (b) => { DB.put('kv', 'edited', true); return App.saveBoard(b); };
  App.board = () => App.boards[App.currentId] || App.boards[App.homeId] || Object.values(App.boards)[0];
  App.speakText = (cell) => (cell.speak && cell.speak.trim()) || cell.label || '';
  App.uid = Vocab.uid;

  App.native = (plugin, method, opts) =>
    (IS_NATIVE ? cap.nativePromise(plugin, method, opts || {}) : Promise.reject(new Error('web')));

  /** Source de l'image d'une case (ou null → emoji). */
  App.imageSrc = function (cell) {
    if (!cell) return null;
    if (cell.image) {
      if (cell.image.startsWith('img:')) return App.images.get(cell.image.slice(4)) || null;
      return cell.image;
    }
    if (cell.picto) {
      const dl = App.images.get('kw:' + cell.picto);
      if (dl) return dl;
      const f = App.bundledPictos[cell.picto];
      if (f) return 'pictos/' + f;
    }
    return null;
  };

  /* ---------------- Rendu de la grille ---------------- */

  function cellInner(cell) {
    const src = App.imageSrc(cell);
    const label = cell.label || '';
    const isPicto = !!(src && ((cell.picto && !cell.image) || cell.imageKind === 'arasaac'));
    const img = src
      ? `<img class="sym${isPicto ? ' picto' : ''}" src="${src}" alt="" draggable="false">`
      : (cell.emoji ? `<span class="sym emoji">${cell.emoji}</span>` : '');
    return `<span class="lbl">${escapeHtml(label)}</span>${img}`;
  }
  App.cellInner = cellInner;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  App.escapeHtml = escapeHtml;

  function darken(hex, f = 0.72) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#9AA5B1';
    const n = parseInt(m[1], 16);
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return `rgb(${r},${g},${b})`;
  }
  App.darken = darken;

  App.applyCellStyle = function (el, cell) {
    el.style.setProperty('--bg', cell.color || '#FFFFFF');
    el.style.setProperty('--bd', darken(cell.color || '#FFFFFF'));
  };

  App.render = function () {
    const b = App.board();
    if (!b) return;
    App.currentId = b.id;
    const s = App.settings;
    const grid = $('#grid');
    const root2 = document.documentElement.style;
    root2.setProperty('--font-scale', s.fontScale);
    root2.setProperty('--gap', s.gap + 'px');
    document.body.dataset.labelpos = s.labelPos;
    document.body.dataset.outline = s.outline || 'none';
    document.body.dataset.outlinePictos = s.outlinePictos ? '1' : '0';
    document.body.classList.toggle('show-empty', !!s.showEmpty);
    document.body.classList.toggle('editing', App.editMode);
    grid.style.gridTemplateColumns = `repeat(${b.cols}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${b.rows}, minmax(0, 1fr))`;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < b.rows * b.cols; i++) {
      const cell = b.cells[i];
      const el = document.createElement('div');
      el.dataset.i = i;
      if (!cell) {
        el.className = 'cell empty';
        if (App.editMode) el.innerHTML = '<span class="plus">+</span>';
      } else {
        el.className = 'cell t-' + cell.type + (cell.hidden ? ' hidden-cell' : '');
        App.applyCellStyle(el, cell);
        el.innerHTML = cellInner(cell);
      }
      frag.appendChild(el);
    }
    grid.innerHTML = '';
    grid.appendChild(frag); // (replaceChildren n'existe pas sur les navigateurs anciens)

    const title = $('#pageTitle');
    title.textContent = b.name;
    title.hidden = !(s.pageTitle || App.editMode);
    $('#btnBack').disabled = App.history.length === 0;
    $('#btnHome').disabled = App.currentId === App.homeId;

    if (App.editMode && root.ParloEditor) root.ParloEditor.onRender();
    else TTS.prefetch(b.cells.filter((c) => c && !c.hidden && (c.type === 'word' || (c.type === 'folder' && c.speak))).map(App.speakText));
  };

  /* ---------------- Navigation ---------------- */

  App.navigate = function (id, push = true) {
    if (!App.boards[id]) { App.toast('Page introuvable', 'error'); return; }
    if (id === App.currentId) return;
    if (push) { App.history.push(App.currentId); if (App.history.length > 50) App.history.shift(); }
    App.currentId = id;
    App.render();
  };
  App.back = function () {
    const id = App.history.pop();
    if (id && App.boards[id]) { App.currentId = id; App.render(); }
  };
  App.home = function () {
    if (App.currentId !== App.homeId) { App.history = []; App.currentId = App.homeId; App.render(); }
  };

  /* ---------------- Message ---------------- */

  App.composeMessage = () => Grammar.compose(App.message, {
    conjugate: App.settings.conjugate, elision: App.settings.grammar, gender: App.settings.childGender,
  });
  App.messageText = () => App.composeMessage().text;

  function renderMessage() {
    const box = $('#messageTokens');
    const showPictos = App.settings.msgPictos;
    const { display } = App.composeMessage();
    box.innerHTML = App.message.map((t, i) => {
      const pic = showPictos && t.kind !== 'typing'
        ? (t.src ? `<img${t.picto ? ' class="picto"' : ''} src="${t.src}" alt="">` : (t.emoji ? `<span class="emoji">${t.emoji}</span>` : ''))
        : '';
      const shown = display[i] || t.text;
      const changed = t.kind !== 'typing' && shown !== t.text;
      return `<span class="tok ${t.kind}${changed ? ' conj' : ''}">${pic}<span>${escapeHtml(shown)}</span></span>`;
    }).join('');
    $('#messageHint').hidden = App.message.length > 0;
    box.scrollLeft = box.scrollWidth;
  }
  App.renderMessage = renderMessage;

  function addWord(cell) {
    App.finishTyping();
    App.message.push({
      kind: 'word', text: App.speakText(cell), src: App.imageSrc(cell), emoji: cell.emoji,
      picto: !!((cell.picto && !cell.image) || cell.imageKind === 'arasaac'),
      cat: cell.cat || null, gram: cell.gram || '',
    });
    renderMessage();
  }

  /** Forme affichée du dernier mot (ex. « veux » après « je » + « vouloir »). */
  App.lastWordShown = function () {
    const { display } = App.composeMessage();
    return display[display.length - 1] || '';
  };

  App.finishTyping = function () {
    const last = App.message[App.message.length - 1];
    if (last && last.kind === 'typing') last.kind = 'word';
  };

  function typeLetter(ch) {
    const last = App.message[App.message.length - 1];
    if (last && last.kind === 'typing') last.text += ch;
    else App.message.push({ kind: 'typing', text: ch });
    renderMessage();
  }

  App.speakMessage = function () {
    const text = App.messageText();
    if (!text) return;
    App.finishTyping();
    TTS.speak(text);
    const bar = $('#message');
    bar.classList.remove('spoken'); void bar.offsetWidth; bar.classList.add('spoken');
    if (App.settings.clearAfter) { App.message = []; }
    renderMessage();
  };

  const COMMANDS = {
    speak: () => App.speakMessage(),
    clear: () => { App.message = []; renderMessage(); TTS.stop(); },
    backspace: () => { App.message.pop(); renderMessage(); },
    backspaceLetter: () => {
      const last = App.message[App.message.length - 1];
      if (!last) return;
      last.kind = 'typing';
      last.text = last.text.slice(0, -1);
      if (!last.text) App.message.pop();
      renderMessage();
    },
    space: () => {
      const last = App.message[App.message.length - 1];
      if (last && last.kind === 'typing') {
        last.kind = 'word';
        if (App.settings.speakOnSelect) TTS.speak(last.text);
      }
      renderMessage();
    },
    speakLastWord: () => { const last = App.message[App.message.length - 1]; if (last) TTS.speak(last.text); },
    home: () => App.home(),
    back: () => App.back(),
    stop: () => TTS.stop(),
  };
  App.COMMANDS = COMMANDS;

  /* ---------------- Activation d'une case ---------------- */

  let lastActivation = 0;

  function activate(index, el) {
    if (App.editMode) { root.ParloEditor.onCellTap(index, el); return; }
    const b = App.board();
    const cell = b.cells[index];
    if (!cell || cell.hidden) return;
    const now = performance.now();
    if (now - lastActivation < App.settings.debounce) return;
    lastActivation = now;

    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

    switch (cell.type) {
      case 'folder':
        if (cell.speak && App.settings.speakOnSelect) TTS.speak(cell.speak);
        App.navigate(cell.linkTo);
        break;
      case 'letter':
        typeLetter(cell.value || cell.label);
        if (App.settings.speakOnSelect) TTS.speak(cell.value || cell.label);
        break;
      case 'command':
        (COMMANDS[cell.command] || (() => {}))();
        break;
      default: {
        const text = App.speakText(cell);
        if (cell.addToMessage !== false) {
          addWord(cell);
          if (App.settings.speakOnSelect) TTS.speak(App.settings.conjugate ? App.lastWordShown() : text);
        } else {
          TTS.speak(text); // phrase toute faite : dite immédiatement
        }
        if (App.settings.autoHome && App.currentId !== App.homeId) App.home();
      }
    }
  }

  /* ---------------- Gestion du toucher ---------------- */

  function setupPointer() {
    const grid = $('#grid');
    const pointers = new Set();
    let press = null; // {id, el, timer}

    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const c = el && el.closest('#grid .cell');
      return c && (App.editMode || (!c.classList.contains('empty') && !c.classList.contains('hidden-cell'))) ? c : null;
    };

    function clearPress() {
      if (!press) return;
      clearTimeout(press.timer);
      press.el && press.el.classList.remove('pressed', 'holding');
      press = null;
    }

    function startHold(el) {
      el.style.setProperty('--hold', App.settings.holdTime + 'ms');
      el.classList.remove('holding'); void el.offsetWidth; el.classList.add('holding');
      press.timer = setTimeout(() => {
        if (!press || press.el !== el) return;
        press.done = true;
        el.classList.remove('holding');
        activate(+el.dataset.i, el);
      }, App.settings.holdTime);
    }

    grid.addEventListener('pointerdown', (e) => {
      pointers.add(e.pointerId);
      if (App.settings.ignoreMulti && pointers.size > 1 && !App.editMode) { clearPress(); return; }
      const el = cellAt(e.clientX, e.clientY);
      if (!el) return;
      clearPress();
      press = { id: e.pointerId, el, timer: null, done: false };
      el.classList.add('pressed');
      const mode = App.editMode ? 'release' : App.settings.activation;
      if (mode === 'press') { press.done = true; activate(+el.dataset.i, el); }
      else if (mode === 'hold') startHold(el);
    });

    grid.addEventListener('pointermove', (e) => {
      if (!press || press.id !== e.pointerId || press.done) return;
      const el = cellAt(e.clientX, e.clientY);
      if (el === press.el) return;
      press.el.classList.remove('pressed', 'holding');
      clearTimeout(press.timer);
      press.el = el;
      if (!el) return;
      el.classList.add('pressed');
      if (!App.editMode && App.settings.activation === 'hold') startHold(el);
    });

    const end = (e, cancel) => {
      pointers.delete(e.pointerId);
      if (!press || press.id !== e.pointerId) return;
      const mode = App.editMode ? 'release' : App.settings.activation;
      if (!cancel && mode === 'release' && !press.done) {
        const el = cellAt(e.clientX, e.clientY);
        if (el && el === press.el) activate(+el.dataset.i, el);
      }
      clearPress();
    };
    grid.addEventListener('pointerup', (e) => end(e, false));
    grid.addEventListener('pointercancel', (e) => end(e, true));
    grid.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') end(e, true); });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* ---------------- Barre du haut et menu ---------------- */

  function setupTopbar() {
    $('#btnHome').addEventListener('click', () => App.home());
    $('#btnBack').addEventListener('click', () => App.back());
    $('#btnBackspace').addEventListener('click', () => COMMANDS.backspace());
    $('#btnClear').addEventListener('click', () => COMMANDS.clear());
    $('#btnSpeak').addEventListener('click', () => App.speakMessage());
    $('#message').addEventListener('click', () => { if (App.settings.tapMsgToSpeak) App.speakMessage(); });

    // Bouton menu protégé
    const gear = $('#btnMenu');
    let holdTimer = null;
    gear.addEventListener('pointerdown', () => {
      if (App.settings.lock !== 'hold') return;
      gear.classList.add('holding');
      holdTimer = setTimeout(() => { gear.classList.remove('holding'); openMenu(); }, 2000);
    });
    const cancelHold = () => { clearTimeout(holdTimer); gear.classList.remove('holding'); };
    gear.addEventListener('pointerup', cancelHold);
    gear.addEventListener('pointerleave', cancelHold);
    gear.addEventListener('pointercancel', cancelHold);
    gear.addEventListener('click', () => {
      if (App.settings.lock === 'none') openMenu();
      else if (App.settings.lock === 'pin') askPin().then((ok) => ok && openMenu());
      else App.toast('Maintenez ⚙️ appuyé 2 secondes', 'info', 1800);
    });

    // Fermeture générique des boîtes de dialogue
    document.querySelectorAll('dialog').forEach((d) => {
      d.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) d.close();
        else if (e.target === d) d.close(); // clic en dehors
      });
    });

    $('#dlgMenu').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      $('#dlgMenu').close();
      const act = b.dataset.act;
      if (act === 'settings') openSettings();
      else if (act === 'about') openAbout();
      else root.ParloEditor.handleMenu(act);
    });
  }

  async function openMenu() {
    const hint = $('#menuBackupHint');
    hint.hidden = true;
    $('#dlgMenu').showModal();
    try {
      const [edited, last] = await Promise.all([DB.get('kv', 'edited'), DB.get('kv', 'lastBackup')]);
      if (!edited) return;
      const days = last ? Math.floor((Date.now() - last) / 864e5) : null;
      if (days === null || days >= 7) {
        hint.textContent = days === null
          ? '💾 Les grilles ont été modifiées et aucune sauvegarde n\'a encore été faite : pensez à exporter une sauvegarde.'
          : `💾 Dernière sauvegarde il y a ${days} jours : pensez à en exporter une nouvelle.`;
        hint.hidden = false;
      }
    } catch (e) { /* rien */ }
  }

  function askPin() {
    return new Promise((resolve) => {
      const d = $('#dlgPin');
      const input = $('#pinInput');
      input.value = ''; $('#pinErr').textContent = '';
      d.showModal(); input.focus();
      const ok = () => {
        if (input.value === String(App.settings.pin)) { cleanup(); d.close(); resolve(true); }
        else { $('#pinErr').textContent = 'Code incorrect'; input.value = ''; }
      };
      const onKey = (e) => { if (e.key === 'Enter') ok(); };
      const onClose = () => { cleanup(); resolve(false); };
      function cleanup() {
        $('#pinOk').removeEventListener('click', ok);
        input.removeEventListener('keydown', onKey);
        d.removeEventListener('close', onClose);
      }
      $('#pinOk').addEventListener('click', ok);
      input.addEventListener('keydown', onKey);
      d.addEventListener('close', onClose);
    });
  }

  /* ---------------- Réglages ---------------- */

  function bindRange(id, key, fmt, after) {
    const input = $(id); const out = $('#out' + id.slice(4));
    const show = () => { if (out) out.textContent = fmt(App.settings[key]); };
    input.value = App.settings[key]; show();
    input.oninput = () => { App.settings[key] = +input.value; show(); App.saveSettings(); after && after(); };
  }
  function bindCheck(id, key, after) {
    const input = $(id);
    input.checked = !!App.settings[key];
    input.onchange = () => { App.settings[key] = input.checked; App.saveSettings(); after && after(); };
  }
  function bindSeg(id, key, after) {
    const box = $(id);
    const sync = () => box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === App.settings[key]));
    sync();
    box.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      App.settings[key] = b.dataset.v; sync(); App.saveSettings(); after && after();
    };
  }

  function voiceUi() {
    const s = App.settings;
    const piper = TTS.piperVoices();
    const sys = TTS.systemVoices();
    $('#setPiperRow').hidden = s.engine !== 'piper';
    $('#setSystemRow').hidden = s.engine !== 'system';
    $('#setPitchRow').hidden = s.engine !== 'system';
    $('#setPrefetchAll').hidden = s.engine !== 'piper';
    $('#setPiperVoice').innerHTML = piper.length
      ? piper.map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('')
      : '<option value="">(aucune voix embarquée dans cette version)</option>';
    $('#setPiperVoice').value = s.piperVoice || (piper[0] && piper[0].id) || '';
    $('#setSystemVoice').innerHTML = '<option value="">Automatique (voix française hors ligne)</option>' +
      sys.map((v) => `<option value="${escapeHtml(v.key)}">${escapeHtml(v.name)} — ${v.lang}${v.local ? ' · hors ligne' : ' · ⚠ internet'}</option>`).join('');
    $('#setSystemVoice').value = s.systemVoice || '';
    let hint = '';
    if (s.engine === 'piper') {
      hint = piper.length ? 'Voix neuronale incluse dans l\'appli : fonctionne toujours sans internet. Le premier mot peut prendre une seconde, ensuite tout est mis en mémoire.'
        : 'Cette version ne contient pas de voix embarquée : la voix système est utilisée.';
    } else {
      const offline = sys.filter((v) => v.local).length;
      hint = sys.length
        ? `${offline} voix française(s) hors ligne trouvée(s). Les voix marquées « internet » ne fonctionnent pas sans connexion.`
        : 'Aucune voix française trouvée. Utilisez « Installer des voix Android hors ligne ».';
    }
    $('#setVoiceHint').textContent = hint;
  }

  function openSettings() {
    const s = App.settings;
    const d = $('#dlgSettings');
    // Onglets
    $('#setTabs').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $('#setTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      d.querySelectorAll('section[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    };

    bindSeg('#setEngine', 'engine', () => { voiceUi(); TTS.warmUp(); });
    $('#setPiperVoice').onchange = (e) => { s.piperVoice = e.target.value || null; App.saveSettings(); TTS.warmUp(); };
    $('#setSystemVoice').onchange = (e) => { s.systemVoice = e.target.value || null; App.saveSettings(); };
    bindRange('#setRate', 'rate', (v) => '×' + v.toFixed(2));
    bindRange('#setPitch', 'pitch', (v) => '×' + v.toFixed(2));
    bindRange('#setVolume', 'volume', (v) => Math.round(v * 100) + ' %');
    $('#setTest').onclick = () => TTS.speak($('#setTestText').value);
    $('#setInstallVoices').onclick = () => TTS.openSystemInstall();
    $('#setPrefetchAll').onclick = () => {
      const texts = new Set();
      Object.values(App.boards).forEach((b) => b.cells.forEach((c) => {
        if (c && (c.type === 'word' || c.speak)) texts.add(App.speakText(c));
      }));
      TTS.prefetch([...texts]);
      App.toast(`Préparation de ${texts.size} mots en arrière-plan…`, 'info');
    };
    TTS.reloadSystemVoices().then(voiceUi);
    voiceUi();

    const accessUi = () => { $('#setHoldRow').hidden = s.activation !== 'hold'; };
    bindSeg('#setActivation', 'activation', accessUi); accessUi();
    bindRange('#setHold', 'holdTime', (v) => (v / 1000).toFixed(2) + ' s');
    bindRange('#setDebounce', 'debounce', (v) => (v / 1000).toFixed(2) + ' s');
    bindCheck('#setIgnoreMulti', 'ignoreMulti');
    bindCheck('#setSpeakOnSelect', 'speakOnSelect');
    bindCheck('#setAutoHome', 'autoHome');

    bindRange('#setFont', 'fontScale', (v) => '×' + v.toFixed(2), App.render);
    bindRange('#setGap', 'gap', (v) => v + ' px', App.render);
    bindSeg('#setLabelPos', 'labelPos', App.render);
    bindSeg('#setOutline', 'outline', App.render);
    bindCheck('#setOutlinePictos', 'outlinePictos', () => { App.render(); renderMessage(); });
    bindCheck('#setShowEmpty', 'showEmpty', App.render);
    bindCheck('#setMsgPictos', 'msgPictos', renderMessage);
    bindCheck('#setPageTitle', 'pageTitle', App.render);

    bindCheck('#setConjugate', 'conjugate', renderMessage);
    bindSeg('#setGender', 'childGender', renderMessage);
    bindCheck('#setGrammar', 'grammar', renderMessage);
    bindCheck('#setClearAfter', 'clearAfter');
    bindCheck('#setSpeakOnTapMsg', 'tapMsgToSpeak');

    const lockUi = () => { $('#setPinRow').hidden = s.lock !== 'pin'; };
    bindSeg('#setLock', 'lock', lockUi); lockUi();
    $('#setPin').value = s.pin;
    $('#setPin').oninput = (e) => { s.pin = e.target.value.replace(/\D/g, '') || '1234'; App.saveSettings(); };

    d.showModal();
  }
  App.openSettings = openSettings;

  function openAbout() {
    const v = TTS.piperVoices();
    $('#aboutVoices').textContent = v.length
      ? 'Voix embarquées : ' + v.map((x) => x.name + (x.license ? ' (' + x.license + ')' : '')).join(', ')
      : 'Aucune voix embarquée dans cette version.';
    $('#aboutOffline').textContent = offlineStatusText();
    $('#aboutDiag').textContent = 'Navigateur : ' + (root.parloBrowser ? root.parloBrowser() : navigator.userAgent) +
      (App.lastVoiceError ? ' — Dernière erreur de voix : ' + App.lastVoiceError : '');
    $('#aboutUpdate').hidden = !swReg;
    $('#dlgAbout').showModal();
  }

  /* ---------------- Version web installable (hors application Android) ---------------- */

  let swReg = null;
  let offline = { done: 0, total: 0, finished: false, error: false };

  function offlineStatusText() {
    if (IS_NATIVE) return 'Application Android : tout est inclus, aucune connexion nécessaire.';
    if (!swReg) return 'Fonctionnement hors ligne indisponible (ouvrez l\'appli depuis son adresse https).';
    if (offline.finished && !offline.error) return 'Fonctionnement hors ligne : prêt ✔ (voix et pictos enregistrés sur cet appareil).';
    if (offline.total) return `Fonctionnement hors ligne : préparation ${Math.round((offline.done / offline.total) * 100)} %… Laissez l'appli ouverte avec internet.`;
    return 'Fonctionnement hors ligne : appli enregistrée ✔';
  }

  function applyUpdate() {
    if (!swReg || !swReg.waiting) return false;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    swReg.waiting.postMessage({ type: 'skipWaiting' });
    return true;
  }

  async function setupWeb() {
    if (IS_NATIVE) return;

    // Garder les données (grilles, voix) à l'abri du nettoyage automatique du navigateur
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

    // Écran toujours allumé pendant l'utilisation
    let lock = null;
    const keepAwake = async () => {
      try { if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); } catch (e) { /* refusé */ }
    };
    keepAwake();

    // Bouton / geste retour d'Android : reste dans l'appli
    try {
      history.replaceState({ parlo: 0 }, '');
      history.pushState({ parlo: 1 }, '');
      root.addEventListener('popstate', () => {
        const open = document.querySelector('dialog[open]');
        if (open) open.close();
        else if (App.editMode) root.ParloEditor.exit();
        else App.back();
        history.pushState({ parlo: 1 }, '');
      });
    } catch (e) { /* rien */ }

    // Fonctionnement hors ligne
    const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!('serviceWorker' in navigator) || !secure) return;
    try {
      swReg = await navigator.serviceWorker.register('sw.js');
    } catch (e) { console.warn('Service worker refusé', e); return; }

    navigator.serviceWorker.addEventListener('message', (e) => {
      const m = e.data || {};
      if (m.type !== 'warm') return;
      const first = !offline.total;
      offline = { done: m.done, total: m.total, finished: !!m.finished, error: offline.error || !!m.error };
      if (m.finished) {
        DB.put('kv', 'offlineReady', !offline.error);
        if (m.total && !offline.error && first === false) App.toast('Prêt à fonctionner sans internet ✔', 'ok');
        if (offline.error) App.toast('Certains fichiers n\'ont pas pu être enregistrés : rouvrez l\'appli avec internet.', 'warn', 5000);
      } else if (first && m.done < m.total) {
        App.toast('Préparation du mode hors ligne (voix, pictos)… laissez l\'appli ouverte.', 'info', 4000);
      }
      if ($('#dlgAbout').open) $('#aboutOffline').textContent = offlineStatusText();
    });

    const warm = () => {
      const c = navigator.serviceWorker.controller || (swReg.active);
      if (c) c.postMessage({ type: 'warm' });
    };
    await navigator.serviceWorker.ready;
    warm();

    // Mise à jour : appliquée au retour sur l'appli après une pause, jamais en pleine utilisation
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      keepAwake();
      swReg.update().catch(() => {});
      const idle = !document.querySelector('dialog[open]') && !App.editMode && App.message.length === 0;
      if (hiddenAt && Date.now() - hiddenAt > 60000 && idle) applyUpdate();
    });

    $('#aboutUpdate').addEventListener('click', async () => {
      $('#aboutOffline').textContent = 'Recherche d\'une mise à jour…';
      try { await swReg.update(); } catch (e) { /* hors ligne */ }
      await new Promise((r) => setTimeout(r, 2500));
      if (!applyUpdate()) {
        $('#aboutOffline').textContent = navigator.onLine ? 'Parlo est à jour ✔' : 'Pas de connexion internet : impossible de vérifier.';
        warm();
      }
    });
  }

  /* ---------------- Démarrage ---------------- */

  App.loadImages = async function () {
    const entries = await DB.entries('images');
    App.images = new Map(entries);
  };

  App.resetVocabulary = async function () {
    const boards = Vocab.buildDefaultBoards();
    await DB.clear('boards');
    for (const b of Object.values(boards)) await App.saveBoard(b);
    App.boards = boards;
    App.homeId = 'accueil';
    await DB.put('kv', 'home', App.homeId);
    await DB.put('kv', 'vocabVersion', Vocab.VOCAB_VERSION);
    await DB.put('kv', 'edited', false);
    App.history = []; App.currentId = App.homeId;
    App.render();
  };

  function setupAndroid() {
    if (!IS_NATIVE) return;
    // Écran toujours allumé pendant l'utilisation
    App.native('KeepAwake', 'keepAwake').catch(() => {});
    // Bouton retour Android : ne ferme pas l'appli par accident
    try {
      cap.nativeCallback('App', 'addListener', { eventName: 'backButton' }, () => {
        const open = document.querySelector('dialog[open]');
        if (open) open.close();
        else if (App.editMode) root.ParloEditor.exit();
        else App.back();
      });
    } catch (e) { /* plugin absent */ }
  }

  async function init() {
    const saved = await DB.get('kv', 'settings');
    App.settings = { ...DEFAULTS, ...(saved || {}) };
    App.homeId = (await DB.get('kv', 'home')) || 'accueil';
    const ttsReady = TTS.init(App.settings, (msg, type) => {
      if (type === 'error') App.lastVoiceError = msg;
      App.toast(msg, type, type === 'error' ? 6000 : 2500);
    });

    try {
      const res = await fetch('pictos/index.json', { cache: 'no-store' });
      if (res.ok) App.bundledPictos = await res.json();
    } catch (e) { /* pas de pictos intégrés */ }

    await App.loadImages();
    const list = await DB.all('boards');
    const vocabVersion = await DB.get('kv', 'vocabVersion');
    const edited = await DB.get('kv', 'edited');
    if (!list.length || (vocabVersion !== Vocab.VOCAB_VERSION && !edited)) {
      // Première ouverture, ou nouveau vocabulaire de base et grilles jamais modifiées : on (ré)installe
      await App.resetVocabulary();
    } else {
      App.boards = Object.fromEntries(list.map((b) => [b.id, b]));
    }
    if (!App.boards[App.homeId]) App.homeId = Object.keys(App.boards)[0];
    App.currentId = App.homeId;

    setupPointer();
    setupTopbar();
    setupAndroid();
    setupWeb();
    App.render();
    renderMessage();

    await ttsReady;
    TTS.warmUp();
    App.render(); // relance le pré-calcul audio une fois la voix prête
  }

  root.addEventListener('DOMContentLoaded', () => {
    init().catch((e) => { console.error(e); App.toast('Erreur au démarrage : ' + e.message, 'error', 8000); });
  });
})(self);
