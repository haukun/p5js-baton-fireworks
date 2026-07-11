import { describe, it, expect } from 'vitest';
const { extractField, validateCode, parseAndValidate, BANNED_PATTERNS } = require('../scripts/validate-submission.js');

describe('extractField', () => {
  it('正常にフィールドを抽出できる', () => {
    const body = `### 作品タイトル / Title\n\nMy Firework\n\n### 作者名 / Author\n\nTestUser`;
    expect(extractField(body, '作品タイトル / Title')).toBe('My Firework');
    expect(extractField(body, '作者名 / Author')).toBe('TestUser');
  });

  it('存在しないフィールドは空文字を返す', () => {
    const body = `### 作品タイトル / Title\n\nHello`;
    expect(extractField(body, '作者名 / Author')).toBe('');
  });

  it('コードブロックを含むフィールドを正しく抽出できる', () => {
    const body = `### コード / Code\n\n\`\`\`javascript\nfunction setup() {}\nfunction draw() {}\n\`\`\`\n\n### 次のフィールド\n\nvalue`;
    const code = extractField(body, 'コード / Code');
    expect(code).toContain('```javascript');
    expect(code).toContain('function setup()');
  });
});

describe('validateCode', () => {
  it('正常なコードはエラーなし', () => {
    const code = `function setup() {\n  background(0);\n}\nfunction draw() {\n  ellipse(200, 400, 50);\n}`;
    const errors = validateCode(code);
    expect(errors).toHaveLength(0);
  });

  it('空コードはエラー', () => {
    expect(validateCode('')).toContain('コードが空です');
    expect(validateCode('   ')).toContain('コードが空です');
  });

  it('50KB超のコードはエラー', () => {
    const bigCode = 'x'.repeat(51201);
    const errors = validateCode(bigCode);
    expect(errors).toContain('コードが50KBを超えています');
  });

  it('fetch() を検出する', () => {
    const errors = validateCode('fetch("http://example.com")');
    expect(errors.some(e => e.includes('fetch()'))).toBe(true);
  });

  it('XMLHttpRequest を検出する', () => {
    const errors = validateCode('new XMLHttpRequest()');
    expect(errors.some(e => e.includes('XMLHttpRequest'))).toBe(true);
  });

  it('eval() を検出する', () => {
    const errors = validateCode('eval("alert(1)")');
    expect(errors.some(e => e.includes('eval()'))).toBe(true);
  });

  it('loadImage() を検出する', () => {
    const errors = validateCode('let img = loadImage("test.png")');
    expect(errors.some(e => e.includes('loadImage()'))).toBe(true);
  });

  it('__userFrameCount を検出する', () => {
    const errors = validateCode('__userFrameCount = 999');
    expect(errors.some(e => e.includes('__userFrameCount'))).toBe(true);
  });

  it('__p5c_frameRate__ を検出する', () => {
    const errors = validateCode('__p5c_frameRate__ = function() { return 60; }');
    expect(errors.some(e => e.includes('__p5c_frameRate__'))).toBe(true);
  });

  it('__p5c_createCanvas__ を検出する', () => {
    const errors = validateCode('__p5c_createCanvas__ = function() {}');
    expect(errors.some(e => e.includes('__p5c_createCanvas__'))).toBe(true);
  });

  it('function frameRate() の再定義を検出する', () => {
    const errors = validateCode('function frameRate() { return 60; }');
    expect(errors.some(e => e.includes('function frameRate()'))).toBe(true);
  });

  it('function createCanvas() の再定義を検出する', () => {
    const errors = validateCode('function createCanvas(w, h) { return null; }');
    expect(errors.some(e => e.includes('function createCanvas()'))).toBe(true);
  });

  it('frameRate() の呼び出しは禁止されない（再定義のみ禁止）', () => {
    const errors = validateCode('function setup() {\n  frameRate(30);\n}');
    // frameRate(30) の呼び出しは OK、function frameRate() の再定義のみ NG
    expect(errors.some(e => e.includes('function frameRate()'))).toBe(false);
  });

  it('WebSocket を検出する', () => {
    const errors = validateCode('new WebSocket("ws://example.com")');
    expect(errors.some(e => e.includes('WebSocket'))).toBe(true);
  });

  it('import を検出する', () => {
    const errors = validateCode('import something from "module"');
    expect(errors.some(e => e.includes('import'))).toBe(true);
  });
});

describe('parseAndValidate', () => {
  it('正常な Issue body をパースできる', () => {
    const body = [
      '### 作品タイトル / Title',
      '',
      'My Firework',
      '',
      '### 作者名 / Author',
      '',
      'TestUser',
      '',
      '### コード / Code',
      '',
      '```javascript',
      'function setup() { background(0); }',
      'function draw() { ellipse(200, 400, 50); }',
      '```',
    ].join('\n');

    const result = parseAndValidate(body);
    expect(result.title).toBe('My Firework');
    expect(result.author).toBe('TestUser');
    expect(result.code).toContain('function setup()');
    expect(result.errors).toHaveLength(0);
  });

  it('タイトルが空の場合エラー', () => {
    const body = [
      '### 作者名 / Author',
      '',
      'TestUser',
      '',
      '### コード / Code',
      '',
      'function setup() {}',
    ].join('\n');

    const result = parseAndValidate(body);
    expect(result.errors).toContain('作品タイトルが空です');
  });

  it('コードブロック記法(```javascript)が正しく除去される', () => {
    const body = [
      '### 作品タイトル / Title',
      '',
      'Title',
      '',
      '### 作者名 / Author',
      '',
      'Author',
      '',
      '### コード / Code',
      '',
      '```javascript',
      'let x = 1;',
      '```',
    ].join('\n');

    const result = parseAndValidate(body);
    expect(result.code).toBe('let x = 1;');
  });
});

describe('BANNED_PATTERNS の網羅性', () => {
  it('禁止パターンが30個以上存在する', () => {
    expect(BANNED_PATTERNS.length).toBeGreaterThanOrEqual(30);
  });

  it('全パターンが pattern と label を持つ', () => {
    for (const item of BANNED_PATTERNS) {
      expect(item).toHaveProperty('pattern');
      expect(item).toHaveProperty('label');
      expect(item.pattern).toBeInstanceOf(RegExp);
      expect(typeof item.label).toBe('string');
    }
  });
});
