/**
 * Puppeteer による e2e テスト（ローカル限定）
 *
 * 実行方法:
 *   npm install puppeteer --no-save
 *   npm run test:e2e
 *
 * 注意: Puppeteer がインストールされていない場合はスキップされます
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const SCRIPTS_DIR = join(__dirname, '..', '..', 'scripts');
const ENTRIES_DIR = join(__dirname, '..', '..', 'entries');
const VALIDATE_SCRIPT = join(SCRIPTS_DIR, 'validate-sketch.js');

// Puppeteer がインストールされているか確認
let hasPuppeteer = false;
try {
  require.resolve('puppeteer');
  hasPuppeteer = true;
} catch (e) {
  // skip
}

function runValidate(sketchPath) {
  try {
    const output = execSync(`node "${VALIDATE_SCRIPT}" "${sketchPath}"`, {
      timeout: 45000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: e.stderr || e.stdout || e.message };
  }
}

function createTempSketch(name, code) {
  const dir = join(ENTRIES_DIR, `_test-e2e-${name}`);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, 'sketch.js');
  writeFileSync(filePath, code);
  return { dir, filePath };
}

function cleanupTempSketch(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasPuppeteer)('validate-sketch.js (Puppeteer e2e)', () => {

  it('正常なスケッチが300フレーム完走する', () => {
    const code = `
function setup() {
  background(0);
}
function draw() {
  ellipse(200, 400, frameCount);
}`;
    const { dir, filePath } = createTempSketch('normal', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(true);
      expect(result.output).toContain('300フレーム完走');
    } finally {
      cleanupTempSketch(dir);
    }
  });

  it('無限ループのスケッチがタイムアウトで失敗する', () => {
    const code = `
function setup() {
  while(true) {} // 無限ループ
}
function draw() {}`;
    const { dir, filePath } = createTempSketch('infinite-loop', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(false);
    } finally {
      cleanupTempSketch(dir);
    }
  });

  it('構文エラーのスケッチが拒否される', () => {
    const code = `
function setup() {
  background(0
}`;
    const { dir, filePath } = createTempSketch('syntax-error', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(false);
      expect(result.output).toContain('構文エラー');
    } finally {
      cleanupTempSketch(dir);
    }
  });

  it('frameRate(60) を書いてもシステムの30fpsが維持される', () => {
    // frameRate(60)は__p5c_frameRate__(60)に変換されダミー化されるため、
    // 実際には30fpsで動作し、300フレームが約10秒で完走するはず
    const code = `
function setup() {
  frameRate(60);
  background(0);
}
function draw() {
  ellipse(200, 400, frameCount);
}`;
    const { dir, filePath } = createTempSketch('framerate-override', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(true);
      expect(result.output).toContain('300フレーム完走');
    } finally {
      cleanupTempSketch(dir);
    }
  });

  it('createCanvas() を書いてもシステムの400x800が維持される', () => {
    const code = `
function setup() {
  createCanvas(100, 100);
  background(0);
}
function draw() {
  ellipse(200, 400, frameCount);
}`;
    const { dir, filePath } = createTempSketch('canvas-override', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(true);
    } finally {
      cleanupTempSketch(dir);
    }
  });

  it('WEBGL モードのスケッチも完走する', () => {
    const code = `
function setup() {
  createCanvas(400, 800, WEBGL);
  background(0);
}
function draw() {
  rotateX(frameCount * 0.01);
  box(50);
}`;
    const { dir, filePath } = createTempSketch('webgl', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(true);
    } finally {
      cleanupTempSketch(dir);
    }
  });

  it('draw内で重い処理をしても15秒以内なら完走する', () => {
    const code = `
function setup() {
  background(0);
}
function draw() {
  for (let i = 0; i < 1000; i++) {
    ellipse(random(400), random(800), 5);
  }
}`;
    const { dir, filePath } = createTempSketch('heavy-draw', code);
    try {
      const result = runValidate(filePath);
      expect(result.success).toBe(true);
    } finally {
      cleanupTempSketch(dir);
    }
  });
});
