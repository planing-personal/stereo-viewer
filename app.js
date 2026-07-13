const state = {
  panels: [
    { id: 'p0', wrapId: 'w0', src: null },
    { id: 'p1', wrapId: 'w1', src: null },
  ],
  zoom: 1,
  ox: 50,
  oy: 50,
};

const MIN_Z = 1, MAX_Z = 50;
const HISTORY_KEY = 'stereo-viewer-history';

const $ = id => document.getElementById(id);
const pw = $('pw');
const sizeVal = $('sizeVal');
const zoomVal = $('zoomVal');

function render() {
  document.querySelectorAll('.image-wrap img').forEach(el => {
    el.style.setProperty('--zoom', state.zoom);
    el.style.transformOrigin = `${state.ox}% ${state.oy}%`;
  });
  zoomVal.textContent = state.zoom.toFixed(2);
}

function setImage(idx, src) {
  const panel = state.panels[idx];
  const wrap = $(panel.wrapId);
  wrap.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.draggable = false;
  wrap.appendChild(img);
  panel.src = src;

  const p = $(panel.id);
  const hintContainer = p.querySelector('.hint-container');
  if (hintContainer) hintContainer.style.display = 'none';

  render();
}

function loadImage(idx, file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    setImage(idx, e.target.result);
    checkSaveHistory();
  };
  r.readAsDataURL(file);
}

function loadFromInput(idx, input) {
  if (!input.files?.[0]) return;
  loadImage(idx, input.files[0]);
  input.value = '';
}

function swap() {
  const p0 = state.panels[0], p1 = state.panels[1];
  [p0.src, p1.src] = [p1.src, p0.src];

  const w0 = $(p0.wrapId), w1 = $(p1.wrapId);
  const img0 = w0.firstElementChild;
  const img1 = w1.firstElementChild;

  w0.innerHTML = '';
  w1.innerHTML = '';

  if (img1) w0.appendChild(img1);
  if (img0) w1.appendChild(img0);

  state.panels.forEach(p => {
    const el = $(p.id);
    const hasImg = !!el.querySelector('img');
    const hintContainer = el.querySelector('.hint-container');
    if (hintContainer) hintContainer.style.display = hasImg ? 'none' : '';
  });

  render();
}

function setSize(v) {
  sizeVal.textContent = v + '%';
  pw.style.width = v + '%';
}

function resizeImage(dataUrl, maxDim, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } }
      else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function checkSaveHistory() {
  if (state.panels[0].src && state.panels[1].src) {
    saveHistory();
  }
}

async function saveHistory() {
  try {
    const [thumb, leftImg, rightImg] = await Promise.all([
      resizeImage(state.panels[0].src, 120, 0.5),
      resizeImage(state.panels[0].src, 800, 0.7),
      resizeImage(state.panels[1].src, 800, 0.7),
    ]);
    const history = getHistory();
    history.unshift({
      id: Date.now().toString(),
      thumbnail: thumb,
      leftImageUrl: leftImg,
      rightImageUrl: rightImg,
      description: '',
      timestamp: Date.now(),
    });
    while (history.length > 3) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  } catch (e) {
    console.warn('Failed to save history:', e);
  }
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function deleteHistoryItem(id) {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function updateHistoryDescription(id, desc) {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (item) { item.description = desc; localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
}

function renderHistory() {
  const list = $('historyList');
  const history = getHistory();
  list.innerHTML = '';
  if (!history.length) {
    list.innerHTML = '<div class="menu-empty">No history yet</div>';
    return;
  }
  history.forEach(h => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.innerHTML = `
      <img src="${h.thumbnail}" alt="" class="menu-item-thumb">
      <div class="menu-item-info">
        <input class="menu-item-desc-input" value="${escapeHtml(h.description)}" placeholder="Add description...">
        <span class="menu-item-time">${new Date(h.timestamp).toLocaleString()}</span>
      </div>
      <button class="menu-item-del" data-id="${h.id}">×</button>
    `;
    item.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      setImage(0, h.leftImageUrl);
      setImage(1, h.rightImageUrl);
      closeMenu();
    });
    const input = item.querySelector('.menu-item-desc-input');
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('change', () => updateHistoryDescription(h.id, input.value));
    const delBtn = item.querySelector('.menu-item-del');
    delBtn.addEventListener('click', e => { e.stopPropagation(); deleteHistoryItem(h.id); });
    list.appendChild(item);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderSamples(samples) {
  const list = $('samplesList');
  list.innerHTML = '';
  if (!samples.length) {
    list.innerHTML = '<div class="menu-empty">No samples available</div>';
    return;
  }
  samples.forEach(s => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.innerHTML = `
      <img src="${s.thumbnail}" alt="" class="menu-item-thumb">
      <div class="menu-item-info">
        <span class="menu-item-desc">${escapeHtml(s.description)}</span>
      </div>
    `;
    item.addEventListener('click', () => {
      setImage(0, s.leftImageUrl);
      setImage(1, s.rightImageUrl);
      closeMenu();
    });
    list.appendChild(item);
  });
}

function loadSamples() {
  renderSamples(typeof SAMPLES !== 'undefined' ? SAMPLES : []);
}

let menuOpen = false;

function toggleMenu() {
  menuOpen = !menuOpen;
  $('menuPanel').classList.toggle('open', menuOpen);
}

function closeMenu() {
  menuOpen = false;
  $('menuPanel').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  $('loadLeftBtn').addEventListener('click', () => $('inpL').click());
  $('loadRightBtn').addEventListener('click', () => $('inpR').click());
  $('inpL').addEventListener('change', e => loadFromInput(0, e.target));
  $('inpR').addEventListener('change', e => loadFromInput(1, e.target));
  $('swapBtn').addEventListener('click', swap);
  $('sizeRng').addEventListener('input', e => setSize(e.target.value));
  $('menuBtn').addEventListener('click', e => { e.stopPropagation(); toggleMenu(); });

  document.addEventListener('click', e => {
    if (menuOpen && !e.target.closest('#menuPanel') && e.target.id !== 'menuBtn') closeMenu();
  });

  const openSection = (headerId, listId, actionsId) => {
    $(headerId).classList.add('open');
    $(listId).classList.add('open');
    if (actionsId) $(actionsId).classList.add('open');
  };
  openSection('samplesHeader', 'samplesList');

  $('samplesHeader').addEventListener('click', () => {
    $('samplesHeader').classList.toggle('open');
    $('samplesList').classList.toggle('open');
  });
  $('historyHeader').addEventListener('click', () => {
    $('historyHeader').classList.toggle('open');
    $('historyList').classList.toggle('open');
    $('historyActions').classList.toggle('open');
  });
  $('clearHistoryBtn').addEventListener('click', clearHistory);

  state.panels.forEach(p => {
    const el = $(p.id);

    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      state.ox = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      state.oy = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
      render();
    });

    el.addEventListener('wheel', e => {
      e.preventDefault();
      state.zoom = Math.max(MIN_Z, Math.min(MAX_Z, state.zoom * (1 - e.deltaY * 0.001)));
      render();
    }, { passive: false });

    el.addEventListener('dblclick', () => { state.zoom = 1; render(); });

    el.addEventListener('dragenter', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const idx = state.panels.indexOf(p);
      loadImage(idx, file);
    });
  });

  const wheel = $('scrollWheel');
  let wheelLastY = 0;

  wheel.addEventListener('touchstart', e => {
    wheelLastY = e.touches[0].clientY;
  }, { passive: true });

  wheel.addEventListener('touchmove', e => {
    e.preventDefault();
    const deltaY = wheelLastY - e.touches[0].clientY;
    wheelLastY = e.touches[0].clientY;
    state.zoom = Math.max(MIN_Z, Math.min(MAX_Z, state.zoom * (1 + deltaY * 0.005)));
    state.ox = 50;
    state.oy = 50;
    render();
  }, { passive: false });

  wheel.addEventListener('mousedown', e => {
    e.preventDefault();
    let lastY = e.clientY;
    const onMove = e => {
      const deltaY = lastY - e.clientY;
      lastY = e.clientY;
      state.zoom = Math.max(MIN_Z, Math.min(MAX_Z, state.zoom * (1 + deltaY * 0.005)));
      state.ox = 50;
      state.oy = 50;
      render();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  const fullscreenBtn = $('fullscreenBtn');
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Exit' : 'Fullscreen';
  });

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) return;
    if (e.key === '+' || e.key === '=') {
      state.zoom = Math.min(MAX_Z, state.zoom * 1.1);
      render();
      e.preventDefault();
    } else if (e.key === '-') {
      state.zoom = Math.max(MIN_Z, state.zoom / 1.1);
      render();
      e.preventDefault();
    } else if (e.key === '0') {
      state.zoom = 1;
      render();
      e.preventDefault();
    }
  });

  renderHistory();
  loadSamples();
  setSize(50);
  render();
});
