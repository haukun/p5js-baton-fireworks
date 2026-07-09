#!/usr/bin/env node
// ============================================================
// validate-sketch.js
// Puppeteer で投稿スケッチを実行し、600フレーム完走するか検証する。
// 使い方: node scripts/validate-sketch.js <sketch.js のパス>
// 終了コード: 0=成功, 1=タイムアウトまたはエラー
// ============================================================

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;
const TOTAL_FRAMES = 600;
const TIMEOUT_MS = 30000; // 30秒タイムアウト

async function main() {
  const sketchPath = process.argv[2];
  if (!sketchPath) {
    console.error('Usage: node scripts/validate-sketch.js <sketch.js path>');
    process.exit(1);
  }

  const userCode = fs.readFileSync(sketchPath, 'utf-8');

  // p5.min.js を読み込み
  const p5Path = path.join(__dirname, '..', 'viewer-fireworks', 'p5.min.js');
  const p5Source = fs.readFileSync(p5Path, 'utf-8');

  // WEBGL 検出
  const canvasMatch = userCode.match(/createCanvas\s*\(([^)]*)\)/);
  const useWebGL = canvasMatch ? /\bWEBGL\b/.test(canvasMatch[1]) : false;

  // コード変換（player.js と同じ）
  let transformedCode = userCode
    .replace(/function\s+setup\s*\(/g, 'function __p5c_setup__(')
    .replace(/function\s+draw\s*\(/g, 'function __p5c_draw__(')
    .replace(/createCanvas\s*\([^)]*\)\s*;?/g, '// createCanvas removed by system');

  const safeCode = transformedCode.replace(/<\/script>/g, '<\\/script>');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none';">
  <style>body, html { margin: 0; padding: 0; overflow: hidden; background: #000; } canvas { display: block; }</style>
</head>
<body>
  <script>${p5Source}<\/script>
  <script>
    window.fetch = undefined;
    window.XMLHttpRequest = undefined;
    window.WebSocket = undefined;
    window.EventSource = undefined;
    window.RTCPeerConnection = undefined;
    window.alert = function(){};
    window.confirm = function(){ return false; };
    window.prompt = function(){ return null; };
    window.open = undefined;
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    var __drawEnabled = true;
    var __userFrameCount = 0;

    ${safeCode}

    function setup() {
      createCanvas(${CANVAS_WIDTH}, ${CANVAS_HEIGHT}${useWebGL ? ', WEBGL' : ''});
      frameRate(60);
      if (typeof __p5c_setup__ === 'function') __p5c_setup__();
    }

    function draw() {
      if (!__drawEnabled) return;
      __userFrameCount++;
      frameCount = __userFrameCount;
      if (typeof __p5c_draw__ === 'function') __p5c_draw__();
      if (__userFrameCount >= ${TOTAL_FRAMES}) {
        noLoop();
      }
    }
  <\/script>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);
    page.setDefaultNavigationTimeout(TIMEOUT_MS);

    // HTML をロード
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

    // Puppeteer 側から __userFrameCount を監視（ページ内 secret に依存しない）
    await page.waitForFunction(
      (target) => window.__userFrameCount >= target,
      { timeout: TIMEOUT_MS },
      TOTAL_FRAMES
    );

    console.log('✅ スケッチは正常に600フレーム完走しました。');
    process.exit(0);
  } catch (e) {
    if (e.message.includes('timeout') || e.message.includes('Timeout')) {
      console.error('❌ タイムアウト: 作品が正常終了しませんでした。');
      console.error('   高負荷の処理があるか、無限ループの可能性があります。');
    } else {
      console.error(`❌ スケッチ実行エラー: ${e.message}`);
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
