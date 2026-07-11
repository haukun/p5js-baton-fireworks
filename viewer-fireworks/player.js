// ============================================================
// P5 Baton - Fireworks Viewer (Crossfade)
// ============================================================

(function () {
  'use strict';

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 800;
  const TOTAL_FRAMES = 300;
  const CROSSFADE_DURATION = 1500; // クロスフェード時間(ms)
  const FORCE_TIMEOUT = 15000; // 親側強制タイマー(ms)
  const CACHE_BUSTER = Date.now(); // ページロード時に1回だけ生成
  const FETCH_TIMEOUT = 10000; // fetch タイムアウト(ms)
  const RETRY_DELAY = 5000; // 全件失敗時の再試行待機(ms)
  const WATCHDOG_INTERVAL = 60000; // watchdog チェック間隔(ms)
  const WATCHDOG_STALL_LIMIT = 120000; // 進行停止判定閾値(ms)

  let entries = [];
  let currentIndex = -1;
  let isTransitioning = false;
  let forceTimer = null;
  let sketchStartTime = 0; // 作品再生開始時刻
  let isFirstPlay = true; // 初回再生フラグ
  let lastProgressTime = Date.now(); // 最終進行時刻（watchdog用）

  const slotA = document.getElementById('slot-a');
  const slotB = document.getElementById('slot-b');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayAuthor = document.getElementById('overlay-author');
  const counter = document.getElementById('counter');

  let activeSlot = slotA;
  let nextSlot = slotB;

  // P5.jsをインラインで埋め込むために事前に読み込む
  let p5Source = '';

  async function init() {
    try {
      const p5Response = await fetch('p5.min.js');
      if (!p5Response.ok) {
        console.error('p5.min.js の読み込みに失敗 (' + p5Response.status + ')');
        return;
      }
      p5Source = await p5Response.text();
    } catch (e) {
      console.error('p5.min.js の読み込みに失敗:', e);
      return;
    }

    try {
      const response = await fetch('entries.json?v=' + CACHE_BUSTER);
      if (!response.ok) {
        console.error('entries.json の読み込みに失敗 (' + response.status + ')');
        return;
      }
      entries = await response.json();
    } catch (e) {
      console.error('entries.json の読み込みに失敗:', e);
      return;
    }

    if (entries.length === 0) return;

    shuffleArray(entries);

    // URLパラメーター ?start=entry-id で特定作品を最初に再生
    const params = new URLSearchParams(window.location.search);
    const startId = params.get('start');
    if (startId) {
      const idx = entries.findIndex(e => e.id === startId);
      if (idx > 0) {
        const [entry] = entries.splice(idx, 1);
        entries.unshift(entry);
      }
    }

    window.addEventListener('message', function (event) {
      // 送信元チェック: アクティブなiframeからのメッセージのみ受け付ける
      if (event.source !== activeSlot.contentWindow && event.source !== nextSlot.contentWindow) return;

      if (event.data.type === 'sketch-complete') {
        // 10秒未満の完了通知は無視（早期終了の悪用防止）
        const elapsed = Date.now() - sketchStartTime;
        if (elapsed < 10000) return;
        onSketchComplete();
      }
    });

    // 最終 watchdog: 一定時間進行しなければページをリロード
    setInterval(() => {
      if (Date.now() - lastProgressTime > WATCHDOG_STALL_LIMIT) {
        console.error('Watchdog: 再生が停止しています。ページをリロードします。');
        location.reload();
      }
    }, WATCHDOG_INTERVAL);

    playNext();
  }

  async function playNext() {
    // 失敗時に次候補を試す（全件失敗で停止）
    const totalEntries = entries.length;
    for (let attempt = 0; attempt < totalEntries; attempt++) {
      currentIndex = (currentIndex + 1) % entries.length;

      if (currentIndex === 0 && entries.length > 1 && !isFirstPlay) {
        shuffleArray(entries);
      }
      isFirstPlay = false;

      const entry = entries[currentIndex];
      const success = await loadSketchInSlot(activeSlot, entry, false);
      if (!success) continue;

      // アクティブにする
      activeSlot.classList.remove('fading-out');
      activeSlot.classList.add('active');

      showOverlay(entry.title, entry.author, entry.icon ? `../entries/${entry.id}/${entry.icon}?v=${CACHE_BUSTER}` : null);
      updateCounter();

      // 親側強制タイマー: sketch-complete が来なくても強制的に次へ
      clearTimeout(forceTimer);
      forceTimer = setTimeout(() => {
        console.warn('Force timeout: sketch did not complete in time, skipping.');
        onSketchComplete();
      }, FORCE_TIMEOUT);
      sketchStartTime = Date.now();
      lastProgressTime = Date.now();
      return;
    }
    console.warn('全作品の読み込みに失敗しました。' + RETRY_DELAY + 'ms後に再試行します。');
    setTimeout(() => playNext(), RETRY_DELAY);
  }

  async function onSketchComplete() {
    if (isTransitioning) return;
    isTransitioning = true;
    clearTimeout(forceTimer);

    // 次の作品を探す（失敗したらスキップして次候補を試す）
    let nextIndex = currentIndex;
    let nextEntry = null;
    const totalEntries = entries.length;
    for (let attempt = 0; attempt < totalEntries; attempt++) {
      nextIndex = (nextIndex + 1) % entries.length;
      nextEntry = entries[nextIndex];
      const success = await loadSketchInSlot(nextSlot, nextEntry, true);
      if (success) break;
      if (attempt === totalEntries - 1) {
        // 全件失敗 → 再試行
        console.warn('全作品の読み込みに失敗。' + RETRY_DELAY + 'ms後に再試行します。');
        isTransitioning = false;
        setTimeout(() => playNext(), RETRY_DELAY);
        return;
      }
    }

    // 少し待ってからクロスフェード開始（setup完了を待つ）
    setTimeout(() => {
      try {
        // クロスフェード: 現在をフェードアウト、次をフェードイン
        activeSlot.classList.remove('active');
        activeSlot.classList.add('fading-out');

        nextSlot.classList.remove('fading-out');
        nextSlot.classList.add('active');

        showOverlay(nextEntry.title, nextEntry.author, nextEntry.icon ? `../entries/${nextEntry.id}/${nextEntry.icon}?v=${CACHE_BUSTER}` : null);
        counter.textContent = `${nextIndex + 1} / ${entries.length}`;
      } catch (e) {
        console.error('クロスフェード中にエラー:', e);
      }

      // クロスフェード完了後にスロット入れ替え
      setTimeout(() => {
        try {
          // 古いスロットをクリア
          activeSlot.srcdoc = '';
          activeSlot.removeAttribute('src');
          activeSlot.classList.remove('fading-out');

          // スロット入れ替え
          const temp = activeSlot;
          activeSlot = nextSlot;
          nextSlot = temp;

          currentIndex = nextIndex;
          isTransitioning = false;
          lastProgressTime = Date.now();
          updateCounter();

          // 次の作品の強制タイマーを再arm
          clearTimeout(forceTimer);
          forceTimer = setTimeout(() => {
            console.warn('Force timeout: sketch did not complete in time, skipping.');
            onSketchComplete();
          }, FORCE_TIMEOUT);
          sketchStartTime = Date.now();
        } catch (e) {
          console.error('スロット入替中にエラー:', e);
          isTransitioning = false;
          setTimeout(() => playNext(), RETRY_DELAY);
        }
      }, CROSSFADE_DURATION);
    }, 500);
  }

  async function loadSketchInSlot(slot, entry, paused) {
    if (!entry || !entry.id) {
      console.error('不正なエントリー:', entry);
      return false;
    }
    const codeUrl = `../entries/${entry.id}/sketch.js?v=${CACHE_BUSTER}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    let code;
    try {
      const response = await fetch(codeUrl, { signal: controller.signal });
      if (!response.ok) {
        clearTimeout(timeout);
        console.error(`スケッチ読み込み失敗 (${response.status}): ${entry.id}`);
        return false;
      }
      code = await response.text();
      clearTimeout(timeout);
    } catch (e) {
      clearTimeout(timeout);
      console.error(`スケッチ読み込み失敗: ${entry.id}`, e);
      return false;
    }

    const html = createSketchHTML(code, paused);
    slot.removeAttribute('src');
    slot.srcdoc = html;
    return true;
  }

  function createSketchHTML(userCode, paused) {
    const canvasMatch = userCode.match(/createCanvas\s*\(([^)]*)\)/);
    const useWebGL = canvasMatch ? /\bWEBGL\b/.test(canvasMatch[1]) : false;
    let transformedCode = userCode
      .replace(/function\s+setup\s*\(/g, 'function __p5c_setup__(')
      .replace(/function\s+draw\s*\(/g, 'function __p5c_draw__(')
      .replace(/\bdraw\s*=\s*/g, '__p5c_draw__ = ')
      .replace(/\bsetup\s*=\s*/g, '__p5c_setup__ = ')
      .replace(/\bcreateCanvas\s*\(/g, '__p5c_createCanvas__(')
      .replace(/\bframeRate\s*\(/g, '__p5c_frameRate__(');

    const safeCode = transformedCode.replace(/<\/script>/g, '<\\/script>');
    const startDelay = 500 + CROSSFADE_DURATION; // クロスフェード完了後にdraw開始

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src blob: data:; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none';">
  <style>
    body, html { margin: 0; padding: 0; overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>${p5Source}<\/script>
  <script>
    window.onerror = function(msg, src, line) {
      console.error('Sketch error:', msg, 'line:', line);
    };

    // セキュリティ: 危険なAPIを無効化
    window.fetch = undefined;
    window.XMLHttpRequest = undefined;
    window.WebSocket = undefined;
    window.EventSource = undefined;
    window.RTCPeerConnection = undefined;
    if (navigator.sendBeacon) navigator.sendBeacon = undefined;
    window.alert = function(){};
    window.confirm = function(){ return false; };
    window.prompt = function(){ return null; };
    window.open = undefined;
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    var __drawEnabled = ${paused ? 'false' : 'true'};
    var __userFrameCount = 0;
    function __p5c_createCanvas__() { return null; }
    function __p5c_frameRate__() { return null; }

    ${paused ? `
    setTimeout(function() {
      __drawEnabled = true;
      loop();
    }, ${startDelay});
    ` : ''}

    // 参加者のコード（setup→__p5c_setup__, draw→__p5c_draw__ に変換済み）
    ${safeCode}

    function setup() {
      createCanvas(${CANVAS_WIDTH}, ${CANVAS_HEIGHT}${useWebGL ? ', WEBGL' : ''});
      frameRate(30);
      Object.defineProperty(window, 'frameCount', {
        get: function() { return __userFrameCount; },
        set: function() {},
        configurable: true
      });
      ${paused ? 'noLoop();' : ''}
      if (typeof __p5c_setup__ === 'function') __p5c_setup__();
      window.parent.postMessage({ type: 'setup-complete' }, '*');
    }

    function draw() {
      if (!__drawEnabled) return;

      __userFrameCount++;
      if (typeof __p5c_draw__ === 'function') __p5c_draw__();

      if (__userFrameCount >= ${TOTAL_FRAMES}) {
        noLoop();
        window.parent.postMessage({ type: 'sketch-complete' }, '*');
      }
    }
  <\/script>
</body>
</html>`;

    return html;
  }

  function showOverlay(title, author, icon) {
    overlayTitle.textContent = title || '';
    overlayAuthor.textContent = author || '';

    // アイコン表示
    const existing = overlay.querySelector('.overlay-icon');
    if (existing) existing.remove();
    if (icon) {
      const img = document.createElement('img');
      img.className = 'overlay-icon';
      img.src = icon;
      img.alt = '';
      overlay.insertBefore(img, overlay.firstChild);
    }

    overlay.classList.add('visible');
    counter.classList.add('visible');
    setTimeout(() => {
      overlay.classList.remove('visible');
      counter.classList.remove('visible');
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
