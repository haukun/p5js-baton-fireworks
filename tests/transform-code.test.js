import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const { transformCode } = require('../scripts/transform-code.js');

describe('transformCode', () => {
  describe('setup/draw 変換', () => {
    it('function setup( を __p5c_setup__( に変換する', () => {
      const { transformedCode } = transformCode('function setup() { background(0); }');
      expect(transformedCode).toContain('function __p5c_setup__()');
      expect(transformedCode).not.toContain('function setup(');
    });

    it('function draw( を __p5c_draw__( に変換する', () => {
      const { transformedCode } = transformCode('function draw() { ellipse(0,0,10); }');
      expect(transformedCode).toContain('function __p5c_draw__()');
      expect(transformedCode).not.toContain('function draw(');
    });

    it('draw = を __p5c_draw__ = に変換する', () => {
      const { transformedCode } = transformCode('draw = function() {}');
      expect(transformedCode).toContain('__p5c_draw__ = function()');
    });

    it('setup = を __p5c_setup__ = に変換する', () => {
      const { transformedCode } = transformCode('setup = function() {}');
      expect(transformedCode).toContain('__p5c_setup__ = function()');
    });
  });

  describe('createCanvas 変換', () => {
    it('createCanvas( を __p5c_createCanvas__( に変換する', () => {
      const { transformedCode } = transformCode('createCanvas(400, 800)');
      expect(transformedCode).toContain('__p5c_createCanvas__(400, 800)');
    });

    it('WEBGL モードを検出する', () => {
      const { useWebGL } = transformCode('createCanvas(400, 800, WEBGL)');
      expect(useWebGL).toBe(true);
    });

    it('WEBGL なしの場合は false', () => {
      const { useWebGL } = transformCode('createCanvas(400, 800)');
      expect(useWebGL).toBe(false);
    });

    it('createCanvas がない場合は false', () => {
      const { useWebGL } = transformCode('background(0);');
      expect(useWebGL).toBe(false);
    });
  });

  describe('frameRate 変換', () => {
    it('frameRate( を __p5c_frameRate__( に変換する', () => {
      const { transformedCode } = transformCode('frameRate(60)');
      expect(transformedCode).toContain('__p5c_frameRate__(60)');
      expect(transformedCode).not.toMatch(/(?<!_)frameRate\(/);
    });

    it('setup 内の frameRate も変換する', () => {
      const code = 'function setup() {\n  frameRate(30);\n  background(0);\n}';
      const { transformedCode } = transformCode(code);
      expect(transformedCode).toContain('__p5c_frameRate__(30)');
    });
  });

  describe('</script> エスケープ', () => {
    it('</script> を <\\/script> にエスケープする', () => {
      const { safeCode } = transformCode('let x = "</script>";');
      expect(safeCode).toContain('<\\/script>');
      expect(safeCode).not.toContain('</script>');
    });
  });

  describe('複合テスト', () => {
    it('典型的なスケッチが正しく変換される', () => {
      const code = [
        'function setup() {',
        '  createCanvas(400, 800);',
        '  frameRate(60);',
        '  background(0);',
        '}',
        'function draw() {',
        '  ellipse(200, 400, 50);',
        '}',
      ].join('\n');

      const { transformedCode, safeCode, useWebGL } = transformCode(code);

      expect(transformedCode).toContain('function __p5c_setup__()');
      expect(transformedCode).toContain('function __p5c_draw__()');
      expect(transformedCode).toContain('__p5c_createCanvas__(400, 800)');
      expect(transformedCode).toContain('__p5c_frameRate__(60)');
      expect(useWebGL).toBe(false);
      expect(safeCode).toBe(transformedCode); // no </script> in this code
    });
  });
});

describe('3箇所の変換ロジックの一貫性', () => {
  // player.js, playground.js, validate-sketch.js の変換正規表現が
  // transform-code.js と同じであることを確認する

  const EXPECTED_REPLACEMENTS = [
    { from: /function\s+setup\s*\(/g, to: 'function __p5c_setup__(' },
    { from: /function\s+draw\s*\(/g, to: 'function __p5c_draw__(' },
    { from: /\bdraw\s*=\s*/g, to: '__p5c_draw__ = ' },
    { from: /\bsetup\s*=\s*/g, to: '__p5c_setup__ = ' },
    { from: /\bcreateCanvas\s*\(/g, to: '__p5c_createCanvas__(' },
    { from: /\bframeRate\s*\(/g, to: '__p5c_frameRate__(' },
  ];

  function checkFileContainsAllReplacements(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    for (const { from } of EXPECTED_REPLACEMENTS) {
      const regexSource = from.source;
      // ファイル内に正規表現パターンが含まれているか確認
      expect(content, `${filePath} should contain ${regexSource}`).toContain(regexSource);
    }
  }

  it('viewer-fireworks/player.js に全変換パターンが含まれる', () => {
    checkFileContainsAllReplacements(join(__dirname, '..', 'viewer-fireworks', 'player.js'));
  });

  it('playground/playground.js に全変換パターンが含まれる', () => {
    checkFileContainsAllReplacements(join(__dirname, '..', 'playground', 'playground.js'));
  });

  it('scripts/validate-sketch.js に全変換パターンが含まれる', () => {
    checkFileContainsAllReplacements(join(__dirname, '..', 'scripts', 'validate-sketch.js'));
  });

  it('3箇所全てに __p5c_frameRate__ ダミー関数が定義されている', () => {
    const files = [
      join(__dirname, '..', 'viewer-fireworks', 'player.js'),
      join(__dirname, '..', 'playground', 'playground.js'),
      join(__dirname, '..', 'scripts', 'validate-sketch.js'),
    ];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `${file} should define __p5c_frameRate__`).toContain('function __p5c_frameRate__() { return null; }');
    }
  });

  it('3箇所全てに __p5c_createCanvas__ ダミー関数が定義されている', () => {
    const files = [
      join(__dirname, '..', 'viewer-fireworks', 'player.js'),
      join(__dirname, '..', 'playground', 'playground.js'),
      join(__dirname, '..', 'scripts', 'validate-sketch.js'),
    ];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `${file} should define __p5c_createCanvas__`).toContain('function __p5c_createCanvas__() { return null; }');
    }
  });
});
