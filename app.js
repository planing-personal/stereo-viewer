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

function loadImage(idx, file) {
  if (!file) return;

  const r = new FileReader();

  r.onload = e => {
    const panel = state.panels[idx];
    const wrap = $(panel.wrapId);
    wrap.innerHTML = '';
    const img = document.createElement('img');
    img.src = e.target.result;
    img.alt = '';
    img.draggable = false;
    wrap.appendChild(img);
    panel.src = e.target.result;

    const p = $(panel.id);
    const lbl = p.querySelector('.panel-label');
    const hint = p.querySelector('.panel-hint');
    if (lbl) lbl.style.display = 'none';
    if (hint) hint.style.display = 'none';

    render();
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
    el.querySelector('.panel-label').style.display = hasImg ? 'none' : '';
    el.querySelector('.panel-hint').style.display = hasImg ? 'none' : '';
  });

  render();
}

function setSize(v) {
  sizeVal.textContent = v + '%';
  pw.style.width = v + '%';
}

document.addEventListener('DOMContentLoaded', () => {
  $('loadLeftBtn').addEventListener('click', () => $('inpL').click());
  $('loadRightBtn').addEventListener('click', () => $('inpR').click());
  $('inpL').addEventListener('change', e => loadFromInput(0, e.target));
  $('inpR').addEventListener('change', e => loadFromInput(1, e.target));
  $('swapBtn').addEventListener('click', swap);
  $('sizeRng').addEventListener('input', e => setSize(e.target.value));

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
    render();
  }, { passive: false });

  wheel.addEventListener('mousedown', e => {
    e.preventDefault();
    let lastY = e.clientY;
    const onMove = e => {
      const deltaY = lastY - e.clientY;
      lastY = e.clientY;
      state.zoom = Math.max(MIN_Z, Math.min(MAX_Z, state.zoom * (1 + deltaY * 0.005)));
      render();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
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

  setSize(50);
  
  render();
});
