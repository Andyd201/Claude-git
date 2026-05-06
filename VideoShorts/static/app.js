// VideoShorts v1.6 - Frontend

// ── State ──
let jobId = null, pollTimer = null;
let activeMode = 'normal', activePlat = 'tiktok';
let selectedFile = null, screenshotFile = null;
let generatedClips = [], videoTitle = '';
let videoDuration = 0;

// ── Preview state (Patch 5) ──
let fontSize  = 30;       // pt (sent to backend as font_size)
let subYPct   = 85.0;     // % from top (sent to backend as sub_y_pct)
let neonHex   = '#FF00FF'; // hex (sent to backend as neon_color)
let prevPlat  = 'tiktok';

// ── Platform rules ──
const PLATFORMS = {
  tiktok: {
    infoText: 'Max 2 200 caractères · 5-10 hashtags · #fyp augmente la portée',
    maxCaption: 2200,
    core: ['#fyp','#foryoupage','#foryou','#viral','#trending','#tiktok'],
    extra: ['#explore','#viralvideo','#mustwatch'],
    build(title, transcript, kws, id, total) {
      const lbl = total > 1 ? ` — Partie ${id}/${total}` : '';
      const desc = (transcript||'').slice(0,180) + ((transcript||'').length>180?'…':'');
      const tags = [...this.core,...kws.map(k=>'#'+k),...this.extra].slice(0,10);
      return [title?`${title}${lbl} 🎬`:`Clip ${id}${lbl}`,'',desc,'',tags.join(' ')].join('\n');
    }
  },
  youtube: {
    infoText: 'Titre max 100 chars · #Shorts obligatoire · 3 premiers hashtags visibles au-dessus du titre',
    maxCaption: 5000,
    core: ['#Shorts','#YouTubeShorts','#viral','#trending'],
    extra: ['#video','#content','#subscribe'],
    build(title, transcript, kws, id, total) {
      const lbl = total > 1 ? ` Part ${id}` : '';
      const t = title ? `${title}${lbl}`.slice(0,97)+' #Shorts' : `Clip ${id}${lbl} #Shorts`;
      const desc = (transcript||'').slice(0,400)+((transcript||'').length>400?'…':'');
      const tags = ['#Shorts',...kws.map(k=>'#'+k),...this.core.slice(1),...this.extra].slice(0,15);
      return [`TITRE: ${t}`,'','— DESCRIPTION —',desc||'(description…)','',tags.join('\n')].join('\n');
    }
  },
  instagram: {
    infoText: 'Max 2 200 chars · Jusqu\'à 30 hashtags · Mis après "..." pour ne pas surcharger',
    maxCaption: 2200,
    core: ['#reels','#reelsinstagram','#reelsvideo','#instareels','#explorepage','#viral','#trending'],
    extra: ['#video','#content','#instagood','#fyp','#foryou','#viralreels','#newreel','#reelsofinstagram','#share','#follow'],
    build(title, transcript, kws, id, total) {
      const lbl = total > 1 ? ` 🔖 Partie ${id}/${total}` : '';
      const desc = (transcript||'').slice(0,200)+((transcript||'').length>200?'…':'');
      const tags = [...this.core,...kws.map(k=>'#'+k),...this.extra].slice(0,30);
      return [title?`✨ ${title}${lbl}`:`✨ Clip ${id}${lbl}`,'',desc||'(description…)','','.','.','.', tags.join(' ')].join('\n');
    }
  }
};

function extractKeywords(text, max) {
  if (!text) return [];
  const stops = new Set('the a an is in on at to for of and or but i my was he she it we they that this with be have had has did do not as so if from about get got just me you are were been by what when how its our their qui que dans les des une est pas par sur avec pour tout mais plus bien lui elle ils elles nous vous mon ton son ses mes tes aux'.split(' '));
  const freq = {};
  (text.toLowerCase().match(/\b[a-zà-ÿ]{4,}\b/g)||[]).forEach(w=>{ if(!stops.has(w)) freq[w]=(freq[w]||0)+1; });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,max||5).map(e=>e[0]);
}

function fmtDur(s){ const m=Math.floor(s/60),sc=Math.round(s%60); return m>0?`${m}m${sc.toString().padStart(2,'0')}s`:`${sc}s`; }
function escHtml(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Pre-start ETA estimate (frontend) ──
function estimateETA() {
  const preEta = document.getElementById('pre-eta');
  const preEtaTxt = document.getElementById('pre-eta-text');
  if (!selectedFile) { preEta.style.display='none'; return; }

  if (activeMode === 'normal') {
    const minDur = parseInt(document.getElementById('opt-min').value) || 20;
    const maxDur = parseInt(document.getElementById('opt-max').value) || 90;
    const avgDur = (minDur + maxDur) / 2;
    if (videoDuration > 0) {
      const nClips = Math.ceil(videoDuration / avgDur);
      const eta = Math.round(nClips * (avgDur * 0.5 + 15));
      const m = Math.floor(eta/60), s = eta%60;
      preEtaTxt.textContent = `Durée vidéo: ${fmtDur(videoDuration)} · ~${nClips} clips estimés · temps de traitement ~${m>0?m+'m'+s+'s':s+'s'}`;
    } else {
      preEtaTxt.textContent = 'Temps estimé: dépend de la durée de ta vidéo (~30s-5min)';
    }
    preEta.style.display = 'block';
  } else if (activeMode === 'reddit') {
    const words = (document.getElementById('story-text').value||'').trim().split(/\s+/).filter(Boolean).length;
    const wpc   = parseInt(document.getElementById('opt-wpc').value) || 160;
    if (words > 0) {
      const nParts = Math.max(1, Math.ceil(words/wpc));
      const eta = Math.round(nParts * (5 + wpc/2.5 + 15));
      const m = Math.floor(eta/60), s = eta%60;
      preEtaTxt.textContent = `${words} mots · ~${nParts} partie(s) · temps estimé ~${m>0?m+'m'+s+'s':s+'s'}`;
      preEta.style.display = 'block';
    } else {
      preEta.style.display = 'none';
    }
  } else if (activeMode === 'visual') {
    const visTA = document.getElementById('vis-story-text');
    const words = visTA ? (visTA.value||'').trim().split(/\s+/).filter(Boolean).length : 0;
    const wpc   = parseInt((document.getElementById('vis-opt-wpc')||{}).value) || 160;
    if (words > 0) {
      const nParts = Math.max(1, Math.ceil(words/wpc));
      const eta = Math.round(nParts * (10 + wpc/2.5 + 35));
      const m = Math.floor(eta/60), s = eta%60;
      preEtaTxt.textContent = `${words} mots · ~${nParts} partie(s) · temps estimé ~${m>0?m+'m'+s+'s':s+'s'}`;
      preEta.style.display = 'block';
    } else {
      preEta.style.display = 'none';
    }
  } else {
    preEta.style.display = 'none';
  }
}

// ── DOM refs ──
const $ = id => document.getElementById(id);
const dropZone=$('drop-zone'), fileInput=$('file-input');
const fileNameEl=$('file-name'), fileBarEl=$('file-bar');
const startBtn=$('start-btn'), progSec=$('prog-sec'), barFill=$('bar-fill');
const progStep=$('prog-step'), progPct=$('prog-pct'), progEta=$('prog-eta');
const resSec=$('res-sec'), clipsGrid=$('clips-grid'), clipCount=$('clip-count');
const errBox=$('err-box'), resetBtn=$('reset-btn'), dlAllBtn=$('dl-all-btn');
const storyTA=$('story-text'), wordCount=$('word-count'), partsEst=$('parts-estimate');
const wpcSlider=$('opt-wpc'), wpcVal=$('wpc-val'), resPill=$('res-pill');
const titleInput=$('video-title'), titleLen=$('title-len');
const platInfo=$('plat-info-bar'), capCont=$('cap-clips-container');

// ── Preview DOM refs ──
const subPh      = $('sub-ph');
const previewPhone = $('preview-phone');
const ctrlFs     = $('ctrl-fs');
const fsValEl    = $('fs-val');
const infoFs     = $('info-fs');
const infoYp     = $('info-yp');
const infoClr    = $('info-clr');

// ── Title ──
titleInput.addEventListener('input',()=>{ titleLen.textContent=titleInput.value.length; videoTitle=titleInput.value.trim(); });

// ── Mode tabs ──
document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active'); activeMode=btn.dataset.tab;
  $('panel-'+activeMode).classList.add('active');
  updateStartBtn(); estimateETA();
}));

// ── Platform tabs (captions) ──
document.querySelectorAll('.plat-tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.plat-tab').forEach(b=>b.classList.remove('active-tiktok','active-youtube','active-instagram'));
  activePlat=btn.dataset.plat; btn.classList.add('active-'+activePlat); renderCaptions();
}));

// ── Options change → re-estimate ──
['opt-min','opt-max'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change', estimateETA); });

// ── File selection ──
fileInput.addEventListener('change',()=>{ if(fileInput.files[0]) selectFile(fileInput.files[0]); });
dropZone.addEventListener('dragover',e=>{ e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop',e=>{
  e.preventDefault(); dropZone.classList.remove('drag-over');
  const f=e.dataTransfer.files[0]; if(f&&f.type.startsWith('video/')) selectFile(f);
});

function selectFile(f) {
  selectedFile=f;
  fileNameEl.textContent=`${f.name}  ·  ${(f.size/1048576).toFixed(1)} MB`;
  fileBarEl.classList.add('show');

  const url = URL.createObjectURL(f);
  const vid  = document.createElement('video');
  vid.preload = 'metadata';
  vid.onloadedmetadata = () => {
    videoDuration = vid.duration;
    URL.revokeObjectURL(url);
    estimateETA();
  };
  vid.src = url;

  updateStartBtn();
}

function updateStartBtn(){
  if (activeMode === 'reddit') {
    startBtn.disabled = !(selectedFile && (storyTA.value||'').trim().length > 20);
  } else if (activeMode === 'visual') {
    const visTA = $('vis-story-text');
    startBtn.disabled = !(selectedFile && visTA && (visTA.value||'').trim().length > 20);
  } else {
    startBtn.disabled = !selectedFile;
  }
}

// ── Story word counter ──
storyTA.addEventListener('input',()=>{
  const words=(storyTA.value||'').trim().split(/\s+/).filter(Boolean).length;
  const wpc=+(wpcSlider.value);
  wordCount.textContent=`${words} mots`;
  partsEst.textContent=`→ ~${Math.max(1,Math.ceil(words/wpc))} partie(s)`;
  updateStartBtn(); estimateETA();
});
wpcSlider.addEventListener('input',()=>{ wpcVal.textContent=wpcSlider.value; storyTA.dispatchEvent(new Event('input')); });

// ── Reddit Visuel : story counter + wpc ──
const visStoryTA   = $('vis-story-text');
const visWordCount = $('vis-word-count');
const visPartsEst  = $('vis-parts-estimate');
const visWpcSlider = $('vis-opt-wpc');
const visWpcVal    = $('vis-wpc-val');

if (visStoryTA) {
  visStoryTA.addEventListener('input', () => {
    const words = (visStoryTA.value||'').trim().split(/\s+/).filter(Boolean).length;
    const wpc = +(visWpcSlider ? visWpcSlider.value : 160);
    if (visWordCount) visWordCount.textContent = `${words} mots`;
    if (visPartsEst)  visPartsEst.textContent  = `→ ~${Math.max(1, Math.ceil(words/wpc))} partie(s)`;
    updateStartBtn(); estimateETA();
  });
}
if (visWpcSlider) {
  visWpcSlider.addEventListener('input', () => {
    if (visWpcVal) visWpcVal.textContent = visWpcSlider.value;
    if (visStoryTA) visStoryTA.dispatchEvent(new Event('input'));
  });
}

// ── Screenshot drop zone ──
const ssDrop      = $('ss-drop');
const ssInp       = $('ss-input');
const ssPreviewW  = $('ss-preview-wrap');
const ssPreviewImg= $('ss-preview-img');
const ssRemoveBtn = $('ss-remove-btn');

function selectScreenshot(f) {
  screenshotFile = f;
  if (ssPreviewImg) ssPreviewImg.src = URL.createObjectURL(f);
  if (ssPreviewW)   ssPreviewW.style.display  = 'inline-block';
  if (ssDrop)       ssDrop.style.display      = 'none';
  updateStartBtn();
}
function clearScreenshot() {
  screenshotFile = null;
  if (ssPreviewImg) ssPreviewImg.src = '';
  if (ssPreviewW)   ssPreviewW.style.display  = 'none';
  if (ssDrop)       ssDrop.style.display      = '';
  if (ssInp)        ssInp.value = '';
  updateStartBtn();
}

if (ssInp)   ssInp.addEventListener('change', () => { if (ssInp.files[0]) selectScreenshot(ssInp.files[0]); });
if (ssDrop) {
  ssDrop.addEventListener('click',     () => { if (ssInp) ssInp.click(); });
  ssDrop.addEventListener('dragover',  e  => { e.preventDefault(); ssDrop.classList.add('over'); });
  ssDrop.addEventListener('dragleave', ()  => ssDrop.classList.remove('over'));
  ssDrop.addEventListener('drop', e => {
    e.preventDefault(); ssDrop.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) selectScreenshot(f);
  });
}
if (ssRemoveBtn) ssRemoveBtn.addEventListener('click', clearScreenshot);


// ════════════════════════════════════════════
//  PREVIEW — phone mockup & subtitle controls
// ════════════════════════════════════════════

// Build platform overlays
function buildTiktokOverlay() {
  return `
    <div style="position:absolute;right:7px;bottom:72px;display:flex;flex-direction:column;gap:10px;align-items:center;z-index:8;">
      ${[['❤️','1.2K'],['💬','48'],['📤',''],['🎵','']].map(([ic,n])=>`
        <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
          <span style="font-size:20px;line-height:1;">${ic}</span>
          ${n?`<span style="font-size:7px;color:rgba(255,255,255,.9);font-weight:600;">${n}</span>`:''}
        </div>`).join('')}
    </div>
    <div style="position:absolute;top:0;left:0;right:0;padding:22px 10px 10px;background:linear-gradient(180deg,rgba(0,0,0,.55)0%,transparent100%);z-index:8;display:flex;justify-content:center;gap:22px;font-size:9px;font-weight:600;color:rgba(255,255,255,.75);">
      <span>Abonnements</span>
      <span style="color:#fff;border-bottom:2px solid #fff;padding-bottom:2px;">Pour toi</span>
      <span>LIVE</span>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 10px 16px;background:linear-gradient(0deg,rgba(0,0,0,.7)0%,transparent100%);z-index:8;">
      <div style="font-size:9px;font-weight:700;color:#fff;">@username</div>
      <div style="font-size:8px;color:rgba(255,255,255,.8);margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">Description · #shorts #fyp #viral</div>
      <div style="font-size:7px;color:rgba(255,255,255,.65);margin-top:3px;">♬ Son original — @username</div>
    </div>`;
}

function buildYoutubeOverlay() {
  return `
    <div style="position:absolute;top:0;left:0;right:0;padding:22px 10px 10px;background:linear-gradient(180deg,rgba(0,0,0,.6)0%,transparent100%);z-index:8;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:12px;color:#fff;">✕</span>
      <span style="font-size:8px;font-weight:700;color:#fff;background:#FF0000;padding:2px 6px;border-radius:3px;">Shorts</span>
      <span style="font-size:12px;color:#fff;">⋯</span>
    </div>
    <div style="position:absolute;bottom:70px;right:7px;display:flex;flex-direction:column;gap:8px;align-items:center;z-index:8;">
      ${[['👍','1.2K'],['👎',''],['💬','48'],['↗️','']].map(([ic,n])=>`
        <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
          <span style="font-size:20px;line-height:1;">${ic}</span>
          ${n?`<span style="font-size:7px;color:rgba(255,255,255,.9);font-weight:600;">${n}</span>`:''}
        </div>`).join('')}
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 10px 16px;background:linear-gradient(0deg,rgba(0,0,0,.75)0%,transparent100%);z-index:8;">
      <div style="font-size:9px;font-weight:700;color:#fff;margin-bottom:4px;">Titre de la vidéo #Shorts</div>
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="width:18px;height:18px;border-radius:50%;background:#555;flex-shrink:0;"></div>
        <span style="font-size:8px;color:rgba(255,255,255,.8);">@Channel</span>
        <span style="font-size:7px;background:rgba(255,255,255,.18);color:#fff;padding:1px 5px;border-radius:3px;margin-left:auto;">S'abonner</span>
      </div>
    </div>`;
}

function buildInstagramOverlay() {
  return `
    <div style="position:absolute;top:0;left:0;right:0;padding:22px 10px 10px;background:linear-gradient(180deg,rgba(0,0,0,.55)0%,transparent100%);z-index:8;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;font-weight:700;font-style:italic;color:#fff;">Reels</span>
      <span style="font-size:13px;color:#fff;">📷</span>
    </div>
    <div style="position:absolute;bottom:70px;right:7px;display:flex;flex-direction:column;gap:11px;align-items:center;z-index:8;">
      ${[['❤️','1.2K'],['💬','48'],['📤',''],['⋯','']].map(([ic,n])=>`
        <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
          <span style="font-size:20px;line-height:1;">${ic}</span>
          ${n?`<span style="font-size:7px;color:rgba(255,255,255,.9);font-weight:600;">${n}</span>`:''}
        </div>`).join('')}
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 10px 16px;background:linear-gradient(0deg,rgba(0,0,0,.75)0%,transparent100%);z-index:8;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#e1306c,#f77737);flex-shrink:0;"></div>
        <span style="font-size:9px;font-weight:700;color:#fff;">username</span>
        <span style="font-size:7px;border:1px solid rgba(255,255,255,.5);color:#fff;padding:1px 5px;border-radius:3px;margin-left:auto;">Suivre</span>
      </div>
      <div style="font-size:8px;color:rgba(255,255,255,.8);">Description · #reels #viral ♬ son</div>
    </div>`;
}

const OVERLAYS = {
  tiktok:    buildTiktokOverlay(),
  youtube:   buildYoutubeOverlay(),
  instagram: buildInstagramOverlay(),
};

// Init default overlay
$('ov-tiktok').innerHTML = OVERLAYS.tiktok;

// Preview platform tabs
document.querySelectorAll('.prev-plat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.prev-plat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    prevPlat = btn.dataset.prevPlat;
    ['tiktok','youtube','instagram'].forEach(p => {
      const el = $('ov-' + p);
      el.style.display = p === prevPlat ? '' : 'none';
      el.innerHTML = p === prevPlat ? OVERLAYS[p] : '';
    });
  });
});

// ── Update preview rendering ──
function updatePreview() {
  if (!subPh) return;
  const phoneH = previewPhone ? previewPhone.offsetHeight : 320;
  // Scale: ASS fontsize (for 1920px video) → preview px
  // Preview phone = 320px tall, video = 1920px → scale = 320/1920
  // Then multiply by 1.5 so it's visually readable in the small preview
  const previewFs = Math.max(8, Math.round(fontSize * 320 / 1920 * 2.2));
  const c = neonHex;
  subPh.style.fontSize   = previewFs + 'px';
  subPh.style.color      = '#ffffff';
  subPh.style.fontWeight = '900';
  subPh.style.textShadow = `0 0 3px ${c}, 0 0 7px ${c}, 0 0 14px ${c}, 0 0 1px #000`;
  subPh.style.webkitTextStroke = `1px ${c}`;

  const subH = subPh.offsetHeight || previewFs + 4;
  const rawTop = (subYPct / 100) * phoneH;
  const top = Math.min(phoneH - subH - 12, Math.max(10, rawTop - subH / 2));
  subPh.style.top = top + 'px';

  // Update info panel
  if (fsValEl)  fsValEl.textContent  = fontSize;
  if (infoFs)   infoFs.textContent   = fontSize + ' pt';
  if (infoYp)   infoYp.textContent   = Math.round(subYPct) + '%';
  if (infoClr)  infoClr.textContent  = neonHex;
  if (infoClr)  infoClr.style.color  = neonHex;
}

// ── Font size slider ──
if (ctrlFs) {
  ctrlFs.addEventListener('input', () => {
    fontSize = parseInt(ctrlFs.value);
    updatePreview();
  });
}

// ── Position presets ──
document.querySelectorAll('.pos-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    subYPct = parseFloat(btn.dataset.yp);
    updatePreview();
  });
});

// ── Drag subtitle (mouse) ──
let isDragging = false, dragStartY = 0, dragStartPct = 0;

if (subPh) {
  subPh.addEventListener('mousedown', e => {
    isDragging   = true;
    dragStartY   = e.clientY;
    dragStartPct = subYPct;
    e.preventDefault();
  });
}

document.addEventListener('mousemove', e => {
  if (!isDragging || !previewPhone) return;
  const rect     = previewPhone.getBoundingClientRect();
  const dy       = e.clientY - dragStartY;
  const deltaPct = (dy / rect.height) * 100;
  subYPct = Math.max(5, Math.min(95, dragStartPct + deltaPct));
  document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
  updatePreview();
});

document.addEventListener('mouseup', () => { isDragging = false; });

// ── Drag subtitle (touch) ──
if (subPh) {
  subPh.addEventListener('touchstart', e => {
    isDragging   = true;
    dragStartY   = e.touches[0].clientY;
    dragStartPct = subYPct;
    e.preventDefault();
  }, { passive: false });
}

document.addEventListener('touchmove', e => {
  if (!isDragging || !previewPhone) return;
  const rect     = previewPhone.getBoundingClientRect();
  const dy       = e.touches[0].clientY - dragStartY;
  const deltaPct = (dy / rect.height) * 100;
  subYPct = Math.max(5, Math.min(95, dragStartPct + deltaPct));
  document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
  updatePreview();
}, { passive: false });

document.addEventListener('touchend', () => { isDragging = false; });

// ── Color swatches ──
document.querySelectorAll('.color-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    sw.classList.add('selected');
    neonHex = sw.dataset.hex;
    updatePreview();
  });
});

// Init preview after layout
window.addEventListener('load', () => { updatePreview(); });


// ════════════════════════════════════════════
//  Start handler
// ════════════════════════════════════════════

startBtn.addEventListener('click',async()=>{
  if(!selectedFile) return;
  const fd=new FormData();
  fd.append('video',selectedFile);

  // ── Common subtitle customization params (Patch 5) ──
  fd.append('font_size', fontSize);
  fd.append('sub_y_pct', subYPct.toFixed(1));
  fd.append('neon_color', neonHex);

  if (activeMode === 'reddit') {
    fd.append('mode',            'reddit');
    fd.append('reddit_mode',     'true');   // legacy compat
    fd.append('story_text',      storyTA.value);
    fd.append('tts_voice',       $('opt-voice').value);
    fd.append('mute_video',      $('opt-mute').checked);
    fd.append('words_per_chunk', wpcSlider.value);
    fd.append('vertical',        $('opt-vertical-r').checked);
    fd.append('zoom',            $('opt-zoom-r').checked);
    fd.append('inject_reactions',$('opt-reactions').checked);
  } else if (activeMode === 'visual') {
    fd.append('mode',            'reddit_visual');
    if (screenshotFile) fd.append('screenshot', screenshotFile);
    fd.append('story_text',      visStoryTA ? visStoryTA.value : '');
    fd.append('tts_voice',       $('vis-opt-voice').value);
    fd.append('words_per_chunk', visWpcSlider ? visWpcSlider.value : 160);
    fd.append('vertical',        'true');
    fd.append('zoom',            $('vis-opt-zoom').checked);
    fd.append('inject_reactions',$('vis-opt-reactions').checked);
  } else {
    fd.append('mode',        'normal');
    fd.append('reddit_mode', 'false');
    fd.append('min_duration',$('opt-min').value);
    fd.append('max_duration',$('opt-max').value);
    fd.append('language',    $('opt-lang').value);
    fd.append('vertical',    $('opt-vertical').checked);
    fd.append('zoom',        $('opt-zoom').checked);
  }

  errBox.style.display='none'; resSec.style.display='none'; clipsGrid.innerHTML='';
  if(jobId) cleanupJob(jobId);
  startBtn.disabled=true; startBtn.textContent='⏳ Upload…';
  $('pre-eta').style.display='none';
  progSec.style.display='block'; setProgress(2,'Upload de la vidéo…','');

  try {
    const d=await (await fetch('/upload',{method:'POST',body:fd})).json();
    if(d.error) throw new Error(d.error);
    jobId=d.job_id; startBtn.textContent='⏳ Traitement en cours…'; pollStatus();
  } catch(e){ showError(e.message); startBtn.disabled=false; startBtn.textContent='🚀 Générer les Shorts'; }
});

// ── Poll ──
function pollStatus(){
  if(pollTimer) clearInterval(pollTimer);
  pollTimer=setInterval(async()=>{
    try {
      const d=await (await fetch(`/status/${jobId}`)).json();
      setProgress(d.progress||0, d.step||'…', d.eta||'');
      if(d.status==='done'){ clearInterval(pollTimer); showResults(d.clips); startBtn.textContent='🚀 Générer les Shorts'; resetBtn.style.display='inline-block'; }
      else if(d.status==='error'){ clearInterval(pollTimer); showError(d.error||'Erreur'); startBtn.disabled=false; startBtn.textContent='🚀 Générer les Shorts'; resetBtn.style.display='inline-block'; }
    } catch(_){}
  },1200);
}

function setProgress(pct,step,eta){
  barFill.style.width=pct+'%';
  progStep.textContent=step;
  progPct.textContent=Math.round(pct)+'%';
  if(progEta) progEta.textContent=eta||'';
}
function showError(msg){ errBox.textContent='❌ '+msg; errBox.style.display='block'; progSec.style.display='none'; }

function showResults(clips){
  generatedClips=clips; progSec.style.display='none'; resSec.style.display='block';
  clipCount.textContent=clips.length;
  const modeLabels = { normal: '🎙️ Mode Normal', reddit: '📱 Reddit Story', visual: '📸 Reddit Visuel' };
  resPill.className=`mode-pill ${activeMode}`;
  resPill.textContent = modeLabels[activeMode] || '🎙️ Mode Normal';
  clipsGrid.innerHTML=clips.map(c=>`
    <div class="clip-card">
      <span class="clip-num">#${c.id}</span>
      <div class="clip-title">${c.name}</div>
      <div class="clip-meta">⏱ ${fmtDur(c.duration)}</div>
      <div class="clip-transcript">${c.transcript||'(aucun texte)'}</div>
      <div class="clip-actions">
        <a class="btn-dl primary" href="/download/${jobId}/${c.filename}" download>⬇️ MP4</a>
        <a class="btn-dl secondary" href="/download/${jobId}/${c.srt_filename}" download>📄 Sous-titres</a>
      </div>
    </div>`).join('');
  dlAllBtn.onclick=()=>clips.forEach(c=>{ const a=document.createElement('a'); a.href=`/download/${jobId}/${c.filename}`; a.download=c.filename; a.click(); });
  renderCaptions();
}

function renderCaptions(){
  if(!generatedClips.length) return;
  const plat=PLATFORMS[activePlat];
  platInfo.className=`plat-info ${activePlat}`; platInfo.style.display='block';
  platInfo.innerHTML=`<span>ℹ️ ${plat.infoText}</span>`;
  const limit=plat.maxCaption||5000;
  capCont.innerHTML=generatedClips.map((c,i)=>{
    const kws=extractKeywords(c.transcript,6);
    const cap=plat.build(videoTitle||c.name,c.transcript,kws,c.id,generatedClips.length);
    const over=cap.length>limit;
    return `<div class="cap-clip-card">
      <div class="cap-clip-header">
        <span>${(activeMode==='reddit'||activeMode==='visual')?'📖 Partie':'🎬 Clip'} ${c.id}</span>
        <span style="color:${over?'var(--error)':'var(--text3)'};font-size:.7rem">${cap.length}/${limit}</span>
      </div>
      <div class="cap-clip-body">
        <div class="cap-meta">
          <span class="cap-meta-tag">⏱ ${fmtDur(c.duration)}</span>
          ${kws.map(k=>`<span class="cap-meta-tag">#${k}</span>`).join('')}
        </div>
        <textarea class="cap-text" id="cap-${i}" rows="7">${escHtml(cap)}</textarea>
        <div class="cap-actions"><button class="btn-copy" onclick="copyCaption(${i},this)">📋 Copier</button></div>
      </div>
    </div>`;
  }).join('');
}

function copyCaption(idx,btn){
  navigator.clipboard.writeText($('cap-'+idx).value).then(()=>{
    btn.textContent='✅ Copié !'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='📋 Copier'; btn.classList.remove('copied'); },2200);
  });
}

// ── Cleanup server files ──
function cleanupJob(id) {
  if (id) fetch(`/cleanup/${id}`, { method: 'POST' }).catch(()=>{});
}

// ── Reset ──
resetBtn.addEventListener('click',()=>{
  if(pollTimer) clearInterval(pollTimer);
  cleanupJob(jobId);
  jobId=null; selectedFile=null; screenshotFile=null; generatedClips=[]; videoDuration=0;
  clearScreenshot();
  fileNameEl.textContent=''; fileInput.value='';
  fileBarEl.classList.remove('show');
  startBtn.disabled=true; startBtn.textContent='🚀 Générer les Shorts';
  progSec.style.display='none'; resSec.style.display='none';
  errBox.style.display='none'; resetBtn.style.display='none';
  $('pre-eta').style.display='none';
  setProgress(0,'','');
});
