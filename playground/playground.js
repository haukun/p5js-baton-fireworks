// ============================================================
// p5js花火大会 - Playground
// ============================================================

(function () {
  'use strict';

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 800;
  const TOTAL_FRAMES = 300;
  const CROSSFADE_DURATION = 1500;
  const FORCE_TIMEOUT = 15000;

  // バリデーション: process-submission.yml と同じ禁止パターン
  const BANNED_PATTERNS = [
    { pattern: /\bfetch\s*\(/, label: 'fetch()' },
    { pattern: /XMLHttpRequest/, label: 'XMLHttpRequest' },
    { pattern: /\bimport\s/, label: 'import' },
    { pattern: /\brequire\s*\(/, label: 'require()' },
    { pattern: /\beval\s*\(/, label: 'eval()' },
    { pattern: /\bFunction\s*\(/, label: 'Function()' },
    { pattern: /window\.open/, label: 'window.open' },
    { pattern: /WebSocket/, label: 'WebSocket' },
    { pattern: /EventSource/, label: 'EventSource' },
    { pattern: /RTCPeerConnection/, label: 'RTCPeerConnection' },
    { pattern: /sendBeacon/, label: 'sendBeacon' },
    { pattern: /AudioContext/, label: 'AudioContext' },
    { pattern: /webkitAudioContext/, label: 'webkitAudioContext' },
    { pattern: /\bloadImage\s*\(/, label: 'loadImage()' },
    { pattern: /\bloadSound\s*\(/, label: 'loadSound()' },
    { pattern: /\bloadFont\s*\(/, label: 'loadFont()' },
    { pattern: /\bloadJSON\s*\(/, label: 'loadJSON()' },
    { pattern: /\bloadStrings\s*\(/, label: 'loadStrings()' },
    { pattern: /\bloadTable\s*\(/, label: 'loadTable()' },
    { pattern: /\bloadBytes\s*\(/, label: 'loadBytes()' },
    { pattern: /\bloadModel\s*\(/, label: 'loadModel()' },
    { pattern: /\bloadShader\s*\(/, label: 'loadShader()' },
    { pattern: /__userFrameCount/, label: '__userFrameCount' },
    { pattern: /__drawEnabled/, label: '__drawEnabled' },
    { pattern: /__waiting/, label: '__waiting' },
    { pattern: /__frameOffset/, label: '__frameOffset' },
    { pattern: /__p5c_setup__/, label: '__p5c_setup__' },
    { pattern: /__p5c_draw__/, label: '__p5c_draw__' },
    { pattern: /__p5c_frameRate__/, label: '__p5c_frameRate__' },
    { pattern: /__p5c_createCanvas__/, label: '__p5c_createCanvas__' },
    { pattern: /function\s+frameRate\s*\(/, label: 'function frameRate() の再定義' },
    { pattern: /function\s+createCanvas\s*\(/, label: 'function createCanvas() の再定義' },
  ];

  // サンプル: 前の人の作品
  const SAMPLE_BEFORE = `
function setup() {
  colorMode(HSB);
  background(200, 90, 10);
  noStroke();
  for(i=0;i<240;i++){
    fill(60-i/5,i/5,100)
    for(r=0;r<TAU;r+=PI/4){
      circle(200+cos(r)*i/2,400+sin(r)*i/2,i/4)
    }
  }
}
t=0
function draw() {
  t++;
  fill(60-(240+t)/5,(240+t)/5,100)
  for(r=0;r<TAU;r+=PI/4){
    circle(200+cos(r)*(240+t)/2,400+sin(r)*(240+t)/2,(240+t)/4)
  }
}`;

  // サンプル: 次の人の作品
  const SAMPLE_AFTER = `
function setup() {
  colorMode(HSB);
  createCanvas(400,800)
  background(160, 90, 0);
  noStroke();
}
t=0
function draw() {
  t++;
  fill(120-t/5,t/10,100)
  for(r=PI/8;r<TAU;r+=PI/4){
    circle(200+cos(r)*t/2,400+sin(r)*t/2,t/4)
  }
}`;

  // ダミーアイコン: 白背景に灰色の円（Data URI）
  const DUMMY_ICON = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ccc';
    ctx.fill();
    return canvas.toDataURL();
  })();

  let p5Source = '';
  let isRunning = false;
  let frameListener = null;
  let forceTimer = null;

  const codeEditor = document.getElementById('code-editor');
  const btnRun = document.getElementById('btn-run');
  const btnStop = document.getElementById('btn-stop');
  const validationResult = document.getElementById('validation-result');
  const frameCounter = document.getElementById('frame-counter');
  const slotA = document.getElementById('slot-a');
  const slotB = document.getElementById('slot-b');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayAuthor = document.getElementById('overlay-author');
  const overlayIcon = document.getElementById('overlay-icon');
  const phaseBar = document.getElementById('phase-bar');
  const counter = document.getElementById('counter');

  function setPhase(phase) {
    phaseBar.querySelectorAll('.phase').forEach(el => {
      el.classList.toggle('active', el.dataset.phase === phase);
    });
  }

  async function init() {
    try {
      const resp = await fetch('../viewer-fireworks/p5.min.js');
      if (!resp.ok) {
        console.error('p5.min.js の読み込みに失敗 (' + resp.status + ')');
        validationResult.textContent = 'エラー: p5.min.js が読み込めません。';
        validationResult.className = 'validation-result error';
        return;
      }
      p5Source = await resp.text();
    } catch (e) {
      console.error('p5.min.js の読み込みに失敗:', e);
      validationResult.textContent = 'エラー: p5.min.js が読み込めません。ローカルサーバーで起動してください。';
      validationResult.className = 'validation-result error';
      return;
    }

    btnRun.addEventListener('click', run);
    btnStop.addEventListener('click', stop);

    // Ctrl+Enter で実行
    codeEditor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    });

    window.addEventListener('message', onMessage);
  }

  function validate(code) {
    const errors = [];

    if (!code.trim()) {
      errors.push('コードが空です');
      return errors;
    }

    if (code.length > 51200) {
      errors.push('コードが50KBを超えています');
    }

    for (const { pattern, label } of BANNED_PATTERNS) {
      if (pattern.test(code)) {
        errors.push(`禁止パターン検出: ${label}`);
      }
    }

    // 構文チェック
    try {
      new Function(code);
    } catch (e) {
      if (e instanceof SyntaxError) {
        errors.push(`構文エラー: ${e.message}`);
      }
    }

    return errors;
  }

  function run() {
    stop();

    const code = codeEditor.value;
    const errors = validate(code);

    if (errors.length > 0) {
      validationResult.innerHTML = '<strong>⛔ バリデーションエラー:</strong><br>' + errors.map(e => '・' + e).join('<br>');
      validationResult.className = 'validation-result error';
      return;
    }

    validationResult.innerHTML = '✅ バリデーションOK — 再生開始';
    validationResult.className = 'validation-result success';
    frameCounter.textContent = '000';
    isRunning = true;

    // フェーズ1: 前の人の作品（frameCount=270から開始 → 300で完了）
    startSequence(code);
  }

  function stop() {
    isRunning = false;
    clearTimeout(forceTimer);
    slotA.srcdoc = '';
    slotA.removeAttribute('src');
    slotB.srcdoc = '';
    slotB.removeAttribute('src');
    slotA.classList.add('active');
    slotA.classList.remove('fading-out');
    slotB.classList.remove('active');
    slotB.classList.remove('fading-out');
    overlay.classList.remove('visible');
    counter.classList.remove('visible');
    frameCounter.textContent = '000';
  }

  function startSequence(userCode) {
    // Step 1: 前の人の作品を slotA で再生 (frameCount 270スタート = 残り1秒)
    setPhase('before');
    updateCounter(1, 3);
    counter.classList.add('visible');
    const beforeHtml = createSketchHTML(SAMPLE_BEFORE, false, 270);
    slotA.removeAttribute('src');
    slotA.srcdoc = beforeHtml;
    slotA.classList.add('active');
    slotA.classList.remove('fading-out');
    slotB.classList.remove('active');

    // 前の作品が complete したらクロスフェードへ
    const onBeforeComplete = () => {
      if (!isRunning) return;
      // Step 2: ユーザー作品を slotB にロード（paused）
      const userHtml = createSketchHTML(userCode, true);
      slotB.removeAttribute('src');
      slotB.srcdoc = userHtml;

      setTimeout(() => {
        if (!isRunning) return;

        // クロスフェード開始
        setPhase('crossfade1');
        slotA.classList.remove('active');
        slotA.classList.add('fading-out');
        slotB.classList.add('active');
        showOverlay('あなたの作品 (Your works)', 'あなた (You)', DUMMY_ICON);
        updateCounter(2, 3);

        setTimeout(() => {
          if (!isRunning) return;
          setPhase('user');
          slotA.srcdoc = '';
          slotA.removeAttribute('src');
          slotA.classList.remove('fading-out');
          // 親側強制タイマー: 15秒で sketch-complete が来なくても強制的に次へ
          clearTimeout(forceTimer);
          forceTimer = setTimeout(() => {
            if (!isRunning || !frameListener || frameListener.phase !== 'user') return;
            console.warn('Force timeout: sketch did not complete in time.');
            frameListener.phase = 'after';
            frameListener.onUserComplete();
          }, FORCE_TIMEOUT);
        }, CROSSFADE_DURATION);
      }, 500);
    };

    // ユーザー作品が complete したら次の作品へ
    const onUserComplete = () => {
      if (!isRunning) return;
      // Step 3: 次の作品を slotA にロード
      const afterHtml = createSketchHTML(SAMPLE_AFTER, true);
      slotA.removeAttribute('src');
      slotA.srcdoc = afterHtml;

      setTimeout(() => {
        if (!isRunning) return;
        setPhase('crossfade2');
        slotB.classList.remove('active');
        slotB.classList.add('fading-out');
        slotA.classList.add('active');
        showOverlay('次の作品 (Next works)', '次の人 (Next)', DUMMY_ICON);
        updateCounter(3, 3);

        setTimeout(() => {
          if (!isRunning) return;
          setPhase('after');
          slotB.srcdoc = '';
          slotB.removeAttribute('src');
          slotB.classList.remove('fading-out');
          // 次の作品が終わったら停止
        }, CROSSFADE_DURATION);
      }, 500);
    };

    // メッセージハンドラ設定
    frameListener = { phase: 'before', onBeforeComplete, onUserComplete };
  }

  function onMessage(event) {
    if (!isRunning || !frameListener) return;
    // 送信元チェック: slotA または slotB からのメッセージのみ受け付ける
    if (event.source !== slotA.contentWindow && event.source !== slotB.contentWindow) return;

    if (event.data.type === 'sketch-complete') {
      if (frameListener.phase === 'before') {
        frameListener.phase = 'user';
        frameCounter.textContent = '000';
        frameListener.onBeforeComplete();
      } else if (frameListener.phase === 'user') {
        clearTimeout(forceTimer);
        frameListener.phase = 'after';
        frameListener.onUserComplete();
      }
    }

    if (event.data.type === 'frame-update' && frameListener.phase === 'user') {
      frameCounter.textContent = String(event.data.frame).padStart(3, '0');
    }
  }

  function createSketchHTML(userCode, paused, startFrame) {
    startFrame = startFrame || 0;
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
    const startDelay = 500 + CROSSFADE_DURATION;

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
      window.parent.postMessage({ type: 'sketch-error', message: msg, line: line }, '*');
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
    var __userFrameCount = ${startFrame};
    function __p5c_createCanvas__() { return null; }
    function __p5c_frameRate__() { return null; }

    ${paused ? `
    setTimeout(function() {
      __drawEnabled = true;
      loop();
    }, ${startDelay});
    ` : ''}

    // 参加者のコード
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

      // frameCount を親に通知（毎フレーム）
      window.parent.postMessage({ type: 'frame-update', frame: __userFrameCount }, '*');

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

    if (icon) {
      overlayIcon.src = icon;
      overlayIcon.classList.add('show');
    } else {
      overlayIcon.classList.remove('show');
    }

    overlay.classList.add('visible');
    counter.classList.add('visible');
    setTimeout(() => {
      overlay.classList.remove('visible');
      counter.classList.remove('visible');
    }, 6000);
  }

  function updateCounter(current, total) {
    counter.textContent = `${current} / ${total}`;
  }

  init();
})();
