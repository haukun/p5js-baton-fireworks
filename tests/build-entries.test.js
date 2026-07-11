import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ENTRIES_DIR = join(__dirname, '..', 'entries');
const OUTPUT_FILE = join(__dirname, '..', 'viewer-fireworks', 'entries.json');

describe('build-entries.js', () => {
  let originalEntries;
  let originalOutput;

  beforeEach(() => {
    // 現在の entries.json を退避
    if (existsSync(OUTPUT_FILE)) {
      originalOutput = readFileSync(OUTPUT_FILE, 'utf-8');
    }
  });

  afterEach(() => {
    // entries.json を復元
    if (originalOutput) {
      writeFileSync(OUTPUT_FILE, originalOutput);
    }
  });

  it('entries.json を正しく生成する', () => {
    execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
    const output = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));

    expect(Array.isArray(output)).toBe(true);
    // 既存の entries/ ディレクトリに基づいて生成される
    expect(output.length).toBeGreaterThan(0);
  });

  it('各エントリに id, title, author が含まれる', () => {
    execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
    const output = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));

    for (const entry of output) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('author');
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.author).toBe('string');
    }
  });

  it('TITLE/AUTHOR 定数からメタデータを抽出する', () => {
    // テスト用の一時エントリを作成
    const testDir = join(ENTRIES_DIR, '_test-build-entry');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'sketch.js'), [
      '// ============================================================',
      'const TITLE = "Test Firework";',
      'const AUTHOR = "TestBot";',
      '// ============================================================',
      '',
      'function setup() { background(0); }',
      'function draw() {}',
    ].join('\n'));

    try {
      execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
      const output = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));

      const testEntry = output.find(e => e.id === '_test-build-entry');
      expect(testEntry).toBeDefined();
      expect(testEntry.title).toBe('Test Firework');
      expect(testEntry.author).toBe('TestBot');
    } finally {
      // クリーンアップ
      rmSync(testDir, { recursive: true, force: true });
      // 再ビルドして復元
      execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
    }
  });

  it('icon ファイルが存在する場合 icon フィールドが設定される', () => {
    const testDir = join(ENTRIES_DIR, '_test-icon-entry');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'sketch.js'), 'const TITLE = "Icon Test";\nconst AUTHOR = "Bot";\nfunction setup() {}\nfunction draw() {}');
    // ダミー icon.png を作成
    writeFileSync(join(testDir, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    try {
      execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
      const output = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));

      const testEntry = output.find(e => e.id === '_test-icon-entry');
      expect(testEntry).toBeDefined();
      expect(testEntry.icon).toBe('icon.png');
    } finally {
      rmSync(testDir, { recursive: true, force: true });
      execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
    }
  });

  it('sketch.js が無いディレクトリは無視される', () => {
    const testDir = join(ENTRIES_DIR, '_test-empty-entry');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'readme.txt'), 'not a sketch');

    try {
      execSync('node scripts/build-entries.js', { cwd: join(__dirname, '..') });
      const output = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));

      const testEntry = output.find(e => e.id === '_test-empty-entry');
      expect(testEntry).toBeUndefined();
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
