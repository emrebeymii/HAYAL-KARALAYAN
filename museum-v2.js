/* Hayal Karalayan — curator-built rooms, silent guided tour, accessible artwork notes.
   No third-party tracking, audio, external links or executable data from artwork metadata. */
(() => {
  'use strict';
  let booted = false;
  let museumSignageAdded = false;
  let autoTour = {active:false, paused:false, timer:null, expected:0, startedAt:0};
  let statusTimeout;
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const api = () => window.HayalMuseum;
  const findRoom = (index) => api().rooms.find(room => room.id === api().artworks[index]?.roomId) || api().rooms[0];

  function announceRoom(index) {
    const box = $('roomStatus');
    const room = findRoom(index);
    if (!box) return;
    box.querySelector('strong').textContent = room.name;
    box.querySelector('small').textContent = room.caption;
    box.classList.add('is-visible');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => box.classList.remove('is-visible'), 2150);
  }

  function configureTabs() {
    const scroller = document.querySelector('.museum-detail-scroll');
    if (!scroller || scroller.querySelector('.art-tablist')) return;
    const facts = $('museumFacts'), story = $('museumDescription');
    const nav = document.createElement('div');
    nav.className = 'art-tablist';
    nav.setAttribute('role','tablist');
    nav.setAttribute('aria-label','Eser bilgileri');
    const entries = [
      {id:'fact',title:'Künye',content:facts},
      {id:'story',title:'Hikâye',content:story}
    ];
    for (const entry of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'art-tab';
      button.id = `art-tab-${entry.id}`;
      button.textContent = entry.title;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls',`art-panel-${entry.id}`);
      button.setAttribute('aria-selected',String(entry.id === 'fact'));
      button.tabIndex = entry.id === 'fact' ? 0 : -1;
      const panel = document.createElement('div');
      panel.className = 'art-tab-panel';
      panel.id = `art-panel-${entry.id}`;
      panel.setAttribute('role','tabpanel');
      panel.setAttribute('aria-labelledby',button.id);
      if(entry.id !== 'fact') panel.hidden = true;
      panel.appendChild(entry.content);
      scroller.appendChild(panel);
      nav.appendChild(button);
    }
    scroller.prepend(nav);
    const tabs = Array.from(nav.querySelectorAll('button'));
    function choose(i, focus = false) {
      tabs.forEach((tab,j) => {
        const selected = i === j;
        tab.setAttribute('aria-selected',String(selected));
        tab.tabIndex = selected ? 0 : -1;
        $(tab.getAttribute('aria-controls')).hidden = !selected;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach((tab,i) => {
      tab.addEventListener('click', () => choose(i));
      tab.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          choose((i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length,true);
        }
      });
    });
    window.addEventListener('hk:artwork', () => choose(0));
  }

  function roomStart(room) { return api().artworks.findIndex(art => art.roomId === room.id); }

  function buildRoomCards() {
    const grid = $('classicGrid');
    if (!grid || !api()) return;
    const cards = Array.from(grid.querySelectorAll('.art-card'));
    if (cards.length !== api().artworks.length) return;
    const sections = document.createDocumentFragment();
    api().rooms.forEach((room, roomNumber) => {
      const section = document.createElement('section');
      section.className = 'room-gallery-section';
      section.id = `salon-${room.id}`;
      section.setAttribute('aria-label',room.name);
      const heading = document.createElement('div');
      heading.className = 'room-gallery-head';
      heading.innerHTML = `<div><span class="room-kicker">SALON ${String(roomNumber+1).padStart(2,'0')} / ${String(api().rooms.length).padStart(2,'0')}</span><h2>${escapeHtml(room.name)}</h2><p>${escapeHtml(room.caption)}</p></div>`;
      const button = document.createElement('button');
      button.className = 'room-enter';
      button.type = 'button';
      button.textContent = '3D salonda gez';
      button.setAttribute('aria-label',`${room.name} salonuna 3D galeride git`);
      button.addEventListener('click',() => {
        api().goImmersive();
        if(api().isReady()) api().goTo(roomStart(room));
      });
      heading.appendChild(button);
      section.appendChild(heading);
      const content = document.createElement('div');
      content.className = 'room-gallery-cards';
      cards.forEach(card => {
        const index = Number(card.dataset.cardIndex);
        if (api().artworks[index]?.roomId === room.id) content.appendChild(card);
      });
      section.appendChild(content);
      sections.appendChild(section);
    });
    grid.replaceChildren(sections);
  }

  function showTourUi() {
    const play = $('guidedTourToggle'), stop = $('guidedTourStop');
    if (!play || !stop) return;
    const state = autoTour;
    play.querySelector('span').textContent = !state.active ? 'Rehberli tur' : state.paused ? 'Devam et' : 'Duraklat';
    play.setAttribute('aria-pressed',String(state.active && !state.paused));
    stop.disabled = !state.active;
  }
  function cancelTourTimer() { if(autoTour.timer !== null) clearTimeout(autoTour.timer); autoTour.timer = null; }
  function stopTour({freeze = false} = {}) {
    cancelTourTimer();
    const wasActive = autoTour.active;
    autoTour.active = false;
    autoTour.paused = false;
    if (freeze && wasActive && api()?.isReady()) api().stopCamera();
    showTourUi();
  }
  function stepTour(index) {
    if (!autoTour.active || autoTour.paused || !api()?.isReady()) return;
    if (index >= api().artworks.length) { stopTour(); announceRoom(api().artworks.length-1); return; }
    autoTour.expected = index;
    api().goTo(index);
    const room = findRoom(index);
    if (index === roomStart(room)) announceRoom(index);
    const hold = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 4500 : 6800;
    autoTour.startedAt = performance.now();
    autoTour.timer = setTimeout(() => stepTour(index + 1), hold);
    showTourUi();
  }
  function startTour() {
    if (!api()?.isReady()) { api()?.goImmersive(); if(!api()?.isReady()) return; }
    stopTour();
    autoTour.active = true;
    autoTour.paused = false;
    stepTour(0);
  }
  function toggleTour() {
    if(!autoTour.active) { startTour(); return; }
    if (!autoTour.paused) {
      autoTour.paused = true;
      cancelTourTimer();
      api().stopCamera();
    } else {
      autoTour.paused = false;
      stepTour(autoTour.expected);
    }
    showTourUi();
  }

  function addMuseumSignage() {
    if (museumSignageAdded) return;
    const items = api()?.sceneObjects();
    if(!items) return;
    const { THREE, scene } = items;
    api().rooms.forEach((room, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#211b16';ctx.fillRect(0,0,720,160);
      ctx.strokeStyle = '#8c6a42';ctx.lineWidth = 6;ctx.strokeRect(6,6,708,148);
      ctx.fillStyle = '#ecd8b6';ctx.font = '600 56px Georgia';ctx.textAlign = 'center';
      const title = room.name;
      let size = 56; while (ctx.measureText(title).width > 650 && size > 28) {size -= 2;ctx.font = `600 ${size}px Georgia`;}
      ctx.fillText(title,360,97);
      ctx.fillStyle = '#bb9a72';ctx.font = '21px Arial';
      ctx.fillText(`SALON ${String(i + 1).padStart(2,'0')}`,360,128);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.9,.65),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
      mesh.position.set(0,4.3,3.0 - roomStart(room)*5.6);
      scene.add(mesh);
      // Architectural accent, not an artwork label.
      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.25,.045,.08),new THREE.MeshStandardMaterial({color:room.color,roughness:.45,metalness:.18}));
      trim.position.set(0,3.92,2.93 - roomStart(room)*5.6);
      scene.add(trim);
    });
    museumSignageAdded = true;
  }

  const foxMarkup = `<svg class="fox-drawing" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path class="fox-tail" d="M65 66c10-5 23-4 24 6 1 10-12 18-29 16-12-1-17-5-23-9"/>
  <path d="M23 35 18 9l22 18c7-4 15-4 22 0L84 9l-5 26c4 10 1 22-6 29-8 8-18 13-22 14-5-1-17-6-25-14-8-8-10-19-3-29Z"/>
  <path d="M34 56c8 4 12 5 17 5s11-2 17-6L51 77 34 56Z"/>
  <path d="M23 35 35 27M79 35 66 27" opacity=".64"/>
  <path class="fox-eyes-closed" d="m35 47 7 1m18 0 7-1"/>
  <g class="fox-eyes-open"><path d="M35 47q4-7 8 0-4 5-8 0ZM59 47q4-7 8 0-4 5-8 0Z"/><circle cx="39" cy="47" r="1.1" fill="currentColor" stroke="none"/><circle cx="63" cy="47" r="1.1" fill="currentColor" stroke="none"/></g>
  <path d="m48 58 3 2 3-2" fill="currentColor"/><path d="M51 60v4m-5 0q5 4 10 0"/>
</svg>`;

  function installFoxSecret() {
    const aboutButton = $('aboutFoxButton');
    if (aboutButton) {
      aboutButton.addEventListener('click', () => {
        const isAwake = aboutButton.classList.toggle('is-awake');
        aboutButton.setAttribute('aria-pressed', String(isAwake));
        aboutButton.setAttribute('aria-label', isAwake ? 'Tilkiyi yeniden uyut' : 'Uyuyan tilkiyi uyandır');
      });
    }

    const layer = $('immersiveView')?.querySelector('.immersive-ui');
    if (!layer || !api()) return;
    const secret = document.createElement('div');
    secret.className = 'museum-fox';
    secret.innerHTML = `<button type="button" class="museum-fox-button" aria-label="Koridordaki gizli tilkiyi keşfet">${foxMarkup}</button><span class="museum-fox-note" role="status" aria-live="polite">Her müzenin küçük bir sırrı vardır.</span>`;
    layer.append(secret);
    const button = secret.querySelector('button');
    let noteTimer = null;
    function dismiss() {secret.classList.remove('is-found');}
    function update(index) {
      const hidden = index > 1 || api().currentMode() !== 'immersive';
      secret.classList.toggle('is-unavailable', hidden);
      if (hidden) { clearTimeout(noteTimer); dismiss(); }
    }
    button.addEventListener('click', () => {
      clearTimeout(noteTimer);
      secret.classList.remove('is-found');
      // Restart the discovery shimmer on repeated visits.
      void secret.offsetWidth;
      secret.classList.add('is-found');
      noteTimer = setTimeout(dismiss, 4600);
    });
    window.addEventListener('hk:artwork', (event) => update(event.detail.index));
    window.addEventListener('hk:mode', () => update(api().currentIndex()));
    document.addEventListener('visibilitychange', () => { if (document.hidden) {clearTimeout(noteTimer); dismiss();} });
    update(api().currentIndex());
  }

  function boot() {
    if(booted || !api()) return;
    booted = true;
    configureTabs();
    installFoxSecret();
    const meta = document.querySelector('.museum-meta');
    const roomName = document.createElement('span');
    roomName.id='museumRoomName'; roomName.className='museum-room-name';
    meta.prepend(roomName);
    const panel = document.createElement('div');
    panel.className = 'room-toolbar';
    panel.setAttribute('aria-label','Sergi bölümleri ve rehberli tur');
    panel.innerHTML = `<div class="room-picker"><label for="roomSelect">Salonlar</label><select id="roomSelect" aria-label="Sergi salonu seç">${api().rooms.map((room,i)=>`<option value="${escapeHtml(room.id)}">${i+1}. ${escapeHtml(room.name)}</option>`).join('')}</select></div><div class="guided-tour-panel"><button id="guidedTourToggle" class="tour-btn" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg><span>Rehberli tur</span></button><button id="guidedTourStop" class="tour-btn secondary" type="button" aria-label="Rehberli turu durdur" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg></button></div>`;
    $('immersiveView').querySelector('.immersive-ui').append(panel);
    const status = document.createElement('div');
    status.id='roomStatus'; status.className='room-status';
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    status.innerHTML = '<strong></strong><small></small>';
    $('immersiveView').querySelector('.immersive-ui').append(status);
    $('guidedTourToggle').addEventListener('click',toggleTour);
    $('guidedTourStop').addEventListener('click',()=>stopTour({freeze:true}));
    $('roomSelect').addEventListener('change',event => {
      stopTour();
      const room = api().rooms.find(item => item.id === event.target.value);
      if (!room) return;
      if(api().currentMode()!=='immersive')api().goImmersive();
      api().goTo(roomStart(room));
      announceRoom(roomStart(room));
    });
    let lastRoomId = '';
    window.addEventListener('hk:artwork',event => {
      const idx=event.detail.index;
      const room = findRoom(idx);
      roomName.textContent = `SALON · ${room.name}`;
      $('roomSelect').value=room.id;
      if(lastRoomId && lastRoomId!==room.id && !autoTour.active) announceRoom(idx);
      lastRoomId=room.id;
      if(autoTour.active && !autoTour.paused && autoTour.expected!==idx) stopTour();
    });
    window.addEventListener('hk:renderclassic',buildRoomCards);
    window.addEventListener('hk:museumready',addMuseumSignage);
    window.addEventListener('hk:mode',event=>{if(event.detail.mode !== 'immersive')stopTour();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden && autoTour.active && !autoTour.paused)toggleTour();});
    buildRoomCards();
    roomName.textContent=`SALON · ${findRoom(api().currentIndex()).name}`;
    showTourUi();
    if(api().isReady())addMuseumSignage();
  }
  window.addEventListener('hk:ready',boot,{once:true});
  if (api()) boot();
})();
