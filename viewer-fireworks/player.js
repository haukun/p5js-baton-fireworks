// ============================================================
// P5 Continue - Fireworks Viewer (Crossfade)
// ============================================================

(function () {
  'use strict';

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 800;
  const TOTAL_FRAMES = 600;
  const CROSSFADE_DURATION = 1500; // クロスフェード時間(ms)

  let entries = [];
  let currentIndex = -1;
  let isTransitioning = false;

  const slotA = document.getElementById('slot-a');
  const slotB = document.getElementById('slot-b');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayAuthor = document.getElementById('overlay-author');
  const counter = document.getElementById('counter');

  let activeSlot = slotA;
  let nextSlot = slotB;

  async function init() {
    try {
      const response = await fetch('entries.json');
      entries = await response.json();
    } catch (e) {
      console.error('entries.json の読み込みに失敗:', e);
      return;
    }

    if (entries.length === 0) return;

    shuffleArray(entries);

    window.addEventListener('message', function (event) {
      if (event.data.type === 'sketch-complete') {
        onSketchComplete();
      }
      if (event.data.type === 'setup-complete') {
        // 使わないが将来用
      }
    });

    playNext();
  }

  function playNext() {
    currentIndex = (currentIndex + 1) % entries.length;

    if (currentIndex === 0 && entries.length > 1) {
      shuffleArray(entries);
    }

    const entry = entries[currentIndex];
    loadSketchInSlot(activeSlot, entry, false);

    // アクティブにする
    activeSlot.classList.remove('fading-out');
    activeSlot.classList.add('active');

    showOverlay(entry.title, entry.author);
    updateCounter();
  }

  function onSketchComplete() {
    if (isTransitioning) return;
    isTransitioning = true;

    const nextIndex = (currentIndex + 1) % entries.length;
    const nextEntry = entries[nextIndex];

    // 次のスケッチをnextSlotに読み込み（待機モード）
    loadSketchInSlot(nextSlot, nextEntry, true);

    // 少し待ってからクロスフェード開始（setup完了を待つ）
    setTimeout(() => {
      // クロスフェード: 現在をフェードアウト、次をフェードイン
      activeSlot.classList.remove('active');
      activeSlot.classList.add('fading-out');

      nextSlot.classList.remove('fading-out');
      nextSlot.classList.add('active');

      showOverlay(nextEntry.title, nextEntry.author);

      // クロスフェード完了後にスロット入れ替え
      setTimeout(() => {
        // 古いスロットをクリア
        activeSlot.src = 'about:blank';
        activeSlot.classList.remove('fading-out');

        // スロット入れ替え
        const temp = activeSlot;
        activeSlot = nextSlot;
        nextSlot = temp;

        currentIndex = nextIndex;
        isTransitioning = false;
        updateCounter();
      }, CROSSFADE_DURATION);
    }, 500);
  }

  async function loadSketchInSlot(slot, entry, paused) {
    const codeUrl = `../entries/${entry.id}/sketch.js?t=${Date.now()}`;
    let code;
    try {
      const response = await fetch(codeUrl);
      code = await response.text();
    } catch (e) {
      console.error(`スケッチ読み込み失敗: ${entry.id}`, e);
      setTimeout(() => { isTransitioning = false; playNext(); }, 100);
      return;
    }

    const blobUrl = createSketchBlobURL(code, paused);

    if (slot.dataset.blobUrl) {
      URL.revokeObjectURL(slot.dataset.blobUrl);
    }
    slot.dataset.blobUrl = blobUrl;
    slot.src = blobUrl;
  }

  function createSketchBlobURL(userCode, paused) {
    let transformedCode = userCode
      .replace(/function\s+setup\s*\(/g, 'function __p5c_setup__(')
      .replace(/function\s+draw\s*\(/g, 'function __p5c_draw__(');

    const safeCode = transformedCode.replace(/<\/script>/g, '<\\/script>');
    const startDelay = 500 + CROSSFADE_DURATION; // クロスフェード完了後にdraw開始

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body, html { margin: 0; padding: 0; overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"><\/script>
  <script>
    window.onerror = function(msg, src, line) {
      console.error('Sketch error:', msg, 'line:', line);
    };

    var __drawEnabled = ${paused ? 'false' : 'true'};
    var __userFrameCount = 0;

    ${paused ? `
    setTimeout(function() {
      __drawEnabled = true;
    }, ${startDelay});
    ` : ''}

    // 参加者のコード（setup→__p5c_setup__, draw→__p5c_draw__ に変換済み）
    ${safeCode}

    function setup() {
      createCanvas(${CANVAS_WIDTH}, ${CANVAS_HEIGHT});
      frameRate(60);
      if (typeof __p5c_setup__ === 'function') __p5c_setup__();
      window.parent.postMessage({ type: 'setup-complete' }, '*');
    }

    function draw() {
      if (!__drawEnabled) return;

      __userFrameCount++;
      frameCount = __userFrameCount;
      if (typeof __p5c_draw__ === 'function') __p5c_draw__();

      if (__userFrameCount >= ${TOTAL_FRAMES}) {
        noLoop();
        window.parent.postMessage({ type: 'sketch-complete' }, '*');
      }
    }
  <\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }

  function showOverlay(title, author) {
    overlayTitle.textContent = title || '';
    overlayAuthor.textContent = author || '';
    overlay.classList.add('visible');
    setTimeout(() => {
      overlay.classList.remove('visible');
    }, 6000);
  }

  function updateCounter() {
    counter.textContent = `${currentIndex + 1} / ${entries.length}`;
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  init();
})();
