// ============================================================
// P5 Continue - Viewer Player
// ============================================================

(function () {
  'use strict';

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 720;
  const TOTAL_FRAMES = 600;
  const BAR_HEIGHT = 40;
  const TRANSITION_DURATION = 1000;
  const FADE_OUT_DURATION = 500;

  // 1セクション = 上帯(40) + Canvas(720) + 下帯(40) = 800
  const SECTION_HEIGHT = BAR_HEIGHT + CANVAS_HEIGHT + BAR_HEIGHT;

  let entries = [];
  let currentIndex = -1;
  let isTransitioning = false;

  const scrollContainer = document.getElementById('scroll-container');
  const slotA = document.getElementById('slot-a');
  const slotB = document.getElementById('slot-b');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayAuthor = document.getElementById('overlay-author');
  const counter = document.getElementById('counter');

  let currentSlot = slotA;
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
    });

    playNext();
  }

  // 帯の色をランダムに変更
  function randomizeBarColors() {
    const bars = scrollContainer.querySelectorAll('.bar');
    bars.forEach(bar => {
      const hue1 = Math.floor(Math.random() * 360);
      const hue2 = (hue1 + 40 + Math.floor(Math.random() * 60)) % 360;
      const hue3 = (hue2 + 40 + Math.floor(Math.random() * 60)) % 360;
      bar.style.setProperty('--glow-color-1', `hsla(${hue1}, 80%, 65%, 0.3)`);
      bar.style.setProperty('--glow-color-2', `hsla(${hue2}, 70%, 60%, 0.5)`);
      bar.style.setProperty('--glow-color-3', `hsla(${hue3}, 80%, 55%, 0.3)`);
    });
  }

  function startBarAnimation() {
    randomizeBarColors();
    scrollContainer.querySelectorAll('.bar').forEach(bar => bar.classList.add('animating'));
  }

  function stopBarAnimation() {
    scrollContainer.querySelectorAll('.bar').forEach(bar => bar.classList.remove('animating'));
  }

  function playNext() {
    currentIndex = (currentIndex + 1) % entries.length;

    if (currentIndex === 0 && entries.length > 1) {
      shuffleArray(entries);
    }

    const entry = entries[currentIndex];
    loadSketchInSlot(currentSlot, entry, false);
    showOverlay(entry.title, entry.author);
    updateCounter();
  }

  function onSketchComplete() {
    if (isTransitioning) return;
    isTransitioning = true;

    const nextIndex = (currentIndex + 1) % entries.length;
    const nextEntry = entries[nextIndex];

    // 現在のスケッチをフェードアウト
    currentSlot.classList.add('fading');

    // 帯のアニメーション開始
    startBarAnimation();

    // 次のスケッチを読み込む（待機モード: setupだけ実行してdrawは待つ）
    loadSketchInSlot(nextSlot, nextEntry, true);

    // setup完了通知を待ってからスクロール開始（タイムアウト付き）
    let setupReceived = false;

    function proceedWithScroll() {
      if (setupReceived) return;
      setupReceived = true;
      window.removeEventListener('message', onSetupReady);

      // フェードアウト完了を待つ
      setTimeout(() => {
        // スクロール
        scrollContainer.style.transform = `translateY(-${SECTION_HEIGHT}px)`;

        // スクロール完了後にDOM入れ替え
        setTimeout(() => {
          showOverlay(nextEntry.title, nextEntry.author);

          setTimeout(() => {
            scrollContainer.style.transition = 'none';
            scrollContainer.style.transform = 'translateY(0)';

            scrollContainer.querySelectorAll('.bar').forEach(bar => bar.classList.remove('animating'));
          // 帯のアニメーション停止
          stopBarAnimation();

          const children = Array.from(scrollContainer.children);
          // 先頭3つ（上帯 + iframe + 下帯）を末尾へ
          for (let i = 0; i < 3; i++) {
            scrollContainer.appendChild(children[i]);
          }

            currentSlot.classList.remove('fading');
            currentSlot.src = 'about:blank';

            const temp = currentSlot;
            currentSlot = nextSlot;
            nextSlot = temp;

            currentIndex = nextIndex;
            isTransitioning = false;

            requestAnimationFrame(() => {
              scrollContainer.style.transition = `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1.0)`;
            });

            updateCounter();
          }, 100);
        }, TRANSITION_DURATION);
      }, FADE_OUT_DURATION);
    }

    function onSetupReady(event) {
      if (event.data.type === 'setup-complete') {
        proceedWithScroll();
      }
    }

    window.addEventListener('message', onSetupReady);
    // フォールバック: 2秒以内にsetup完了が届かなければ進める
    setTimeout(proceedWithScroll, 2000);
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
    // 参加者の setup/draw を内部名にリネーム
    let transformedCode = userCode
      .replace(/function\s+setup\s*\(/g, 'function __p5c_setup__(')
      .replace(/function\s+draw\s*\(/g, 'function __p5c_draw__(')
      .replace(/createCanvas\s*\([^)]*\)\s*;?/g, '// createCanvas removed by system');

    const safeCode = transformedCode.replace(/<\/script>/g, '<\\/script>');

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

    // 参加者のコード（setup→__p5c_setup__, draw→__p5c_draw__ に変換済み）
    ${safeCode}

    // システムが制御する本物のsetup/draw
    function setup() {
      createCanvas(${CANVAS_WIDTH}, ${CANVAS_HEIGHT});
      frameRate(60);
      if (typeof __p5c_setup__ === 'function') __p5c_setup__();
      // setup完了を親に通知
      window.parent.postMessage({ type: 'setup-complete' }, '*');
      // 待機モードの場合、スクロール完了タイミングでdraw開始
      if (!__drawEnabled) {
        setTimeout(function() {
          __drawEnabled = true;
        }, ${FADE_OUT_DURATION + TRANSITION_DURATION});
      }
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
