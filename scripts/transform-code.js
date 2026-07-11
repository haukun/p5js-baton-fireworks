// ============================================================
// transform-code.js
// ユーザーコードの変換ロジック（モジュール化）
// player.js / playground.js / validate-sketch.js と同一の変換を行う
// ============================================================

'use strict';

/**
 * ユーザーコードを変換する
 * - setup/draw 関数を __p5c_setup__/__p5c_draw__ にリネーム
 * - createCanvas/frameRate をダミー関数呼び出しに差し替え
 * - </script> をエスケープ
 *
 * @param {string} userCode - ユーザーが書いた生のスケッチコード
 * @returns {{ transformedCode: string, safeCode: string, useWebGL: boolean }}
 */
function transformCode(userCode) {
  // WEBGL モード検出（変換前に行う）
  const canvasMatch = userCode.match(/createCanvas\s*\(([^)]*)\)/);
  const useWebGL = canvasMatch ? /\bWEBGL\b/.test(canvasMatch[1]) : false;

  const transformedCode = userCode
    .replace(/function\s+setup\s*\(/g, 'function __p5c_setup__(')
    .replace(/function\s+draw\s*\(/g, 'function __p5c_draw__(')
    .replace(/\bdraw\s*=\s*/g, '__p5c_draw__ = ')
    .replace(/\bsetup\s*=\s*/g, '__p5c_setup__ = ')
    .replace(/\bcreateCanvas\s*\(/g, '__p5c_createCanvas__(')
    .replace(/\bframeRate\s*\(/g, '__p5c_frameRate__(');

  const safeCode = transformedCode.replace(/<\/script>/g, '<\\/script>');

  return { transformedCode, safeCode, useWebGL };
}

module.exports = { transformCode };
