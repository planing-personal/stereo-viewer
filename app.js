const S = { src: [null, null], zoom: 1, ox: 50, oy: 50 };
const MIN_Z = 1, MAX_Z = 50;
const $ = id => document.getElementById(id);
const w0 = $('w0'), w1 = $('w1'), p0 = $('p0'), p1 = $('p1'), pw = $('pw');

function imgs() { return [...document.querySelectorAll('.image-wrap img')]; }

function apply() {
  imgs().forEach(el => {
    el.style.setProperty('--zoom', S.zoom);
    el.style.transformOrigin = S.ox + '% ' + S.oy + '%';
  });
  $('zoomVal').textContent = S.zoom.toFixed(2);
}

function load(idx, inp) {
  if (!inp.files?.[0]) return;
  const r = new FileReader();
  r.onload = e => {
    const w = idx === 0 ? w0 : w1;
    w.innerHTML = `<img src="${e.target.result}" alt="" draggable="false">`;
    S.src[idx] = e.target.result;
    const lbl = w.parentNode.querySelector('.panel-label');
    if (lbl) lbl.style.display = 'none';
    const hint = w.parentNode.querySelector('.panel-hint');
    if (hint) hint.style.display = 'none';
    apply();
    inp.value = '';
  };
  r.readAsDataURL(inp.files[0]);
}

function swap() {
  [S.src[0], S.src[1]] = [S.src[1], S.src[0]];
  [w0.innerHTML, w1.innerHTML] = [w1.innerHTML, w0.innerHTML];
  [p0, p1].forEach(p => {
    p.querySelector('.panel-label').style.display = p.querySelector('img') ? 'none' : '';
    p.querySelector('.panel-hint').style.display = p.querySelector('img') ? 'none' : '';
  });
  apply();
}

[p0, p1].forEach(p => {
  p.addEventListener('mousemove', e => {
    const r = p.getBoundingClientRect();
    S.ox = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    S.oy = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    apply();
  });
  p.addEventListener('wheel', e => {
    e.preventDefault();
    S.zoom = Math.max(MIN_Z, Math.min(MAX_Z, S.zoom * (1 - e.deltaY * 0.001)));
    apply();
  }, { passive: false });
  p.addEventListener('dblclick', () => { S.zoom = 1; apply(); });

  p.addEventListener('dragenter', e => { e.preventDefault(); p.classList.add('drag-over'); });
  p.addEventListener('dragover', e => { e.preventDefault(); });
  p.addEventListener('dragleave', () => { p.classList.remove('drag-over'); });
  p.addEventListener('drop', e => {
    e.preventDefault();
    p.classList.remove('drag-over');
    const idx = p.id === 'p0' ? 0 : 1;
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = ev => {
      const w = idx === 0 ? w0 : w1;
      w.innerHTML = `<img src="${ev.target.result}" alt="" draggable="false">`;
      S.src[idx] = ev.target.result;
      const lbl = p.querySelector('.panel-label');
      if (lbl) lbl.style.display = 'none';
      const hint = p.querySelector('.panel-hint');
      if (hint) hint.style.display = 'none';
      apply();
    };
    r.readAsDataURL(file);
  });
});

function setSize(v) {
  $('sizeVal').textContent = v + '%';
  pw.style.width = v + '%';
}

document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) {
    if (e.key === '+' || e.key === '=') { S.zoom = Math.min(MAX_Z, S.zoom * 1.1); apply(); e.preventDefault(); }
    else if (e.key === '-') { S.zoom = Math.max(MIN_Z, S.zoom / 1.1); apply(); e.preventDefault(); }
    else if (e.key === '0') { S.zoom = 1; apply(); e.preventDefault(); }
  }
});

setSize(50);
apply();
