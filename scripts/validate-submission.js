// ============================================================
// validate-submission.js
// 投稿のバリデーションロジック（モジュール化）
// process-submission.yml と playground.js の禁止パターンと同一
// ============================================================

'use strict';

/**
 * 禁止パターン一覧
 * process-submission.yml / playground.js と完全一致させること
 */
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

const MAX_CODE_SIZE = 51200; // 50KB

/**
 * Issue body からフィールドを抽出する
 * @param {string} body - Issue の本文
 * @param {string} label - 抽出するフィールドのラベル
 * @returns {string} 抽出された値（trimされた文字列）
 */
function extractField(body, label) {
  const regex = new RegExp(`### ${label}[^\\n]*\\s*\\n\\n([\\s\\S]*?)(?=\\n###|$)`);
  const match = body.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * コードのバリデーション（禁止パターン + サイズ制限）
 * @param {string} code - バリデーション対象のコード文字列
 * @returns {string[]} エラーメッセージの配列（空なら問題なし）
 */
function validateCode(code) {
  const errors = [];

  if (!code || !code.trim()) {
    errors.push('コードが空です');
    return errors;
  }

  if (code.length > MAX_CODE_SIZE) {
    errors.push('コードが50KBを超えています');
  }

  for (const { pattern, label } of BANNED_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(`禁止パターン検出: ${label}`);
    }
  }

  return errors;
}

/**
 * Issue body 全体のパースとバリデーション
 * @param {string} body - Issue の本文
 * @returns {{ title: string, author: string, code: string, errors: string[] }}
 */
function parseAndValidate(body) {
  const title = extractField(body, '作品タイトル / Title');
  const author = extractField(body, '作者名 / Author');
  let code = extractField(body, 'コード / Code');

  // Markdown のコードブロック記法を除去
  code = code.replace(/^```javascript\n?/i, '').replace(/^```js\n?/i, '').replace(/\n?```$/g, '').trim();

  const errors = [];
  if (!title) errors.push('作品タイトルが空です');
  if (!author) errors.push('作者名が空です');

  const codeErrors = validateCode(code);
  errors.push(...codeErrors);

  return { title, author, code, errors };
}

module.exports = {
  BANNED_PATTERNS,
  MAX_CODE_SIZE,
  extractField,
  validateCode,
  parseAndValidate,
};
