# テスト概要

```
npm test
```

---

## テストファイル一覧

| ファイル | テスト数 | 対象 |
|----------|----------|------|
| `validate-submission.test.js` | 23 | 投稿バリデーション |
| `transform-code.test.js` | 17 | コード変換ロジック |
| `build-entries.test.js` | 5 | entries.json 生成 |

---

## validate-submission.test.js

投稿時の事前チェック（GitHub Actions `process-submission.yml` と同一ロジック）。

### extractField

- Issue body からフィールドを正しく抽出できる
- 存在しないフィールドは空文字を返す
- コードブロックを含むフィールドを扱える

### validateCode（禁止パターン）

| チェック対象 | 例 |
|---|---|
| ネットワーク通信 | `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource` |
| 動的コード実行 | `eval(`, `Function(`, `import`, `require(` |
| 外部ファイル読み込み | `loadImage(`, `loadSound(`, `loadFont(` 等 |
| ブラウザAPI | `window.open`, `AudioContext`, `sendBeacon` |
| システム内部変数 | `__userFrameCount`, `__drawEnabled`, `__p5c_*` |
| 関数再定義 | `function frameRate(`, `function createCanvas(` |
| サイズ制限 | 50KB 超 |
| 空コード | 空文字・空白のみ |

### parseAndValidate

- Issue body 全体のパース（タイトル・作者・コード抽出）
- タイトル/作者が空ならエラー
- Markdown コードブロック記法の自動除去

### BANNED_PATTERNS の構造

- 30個以上のパターンが存在すること
- 全パターンが `{ pattern: RegExp, label: string }` 形式であること

---

## transform-code.test.js

player.js / playground.js / validate-sketch.js で共通のコード変換処理。

### setup/draw 変換

- `function setup(` → `function __p5c_setup__(`
- `function draw(` → `function __p5c_draw__(`
- `draw =` → `__p5c_draw__ =`
- `setup =` → `__p5c_setup__ =`

### createCanvas 変換

- `createCanvas(` → `__p5c_createCanvas__(`
- `createCanvas(400, 800, WEBGL)` → useWebGL: true 検出
- createCanvas がない場合 → useWebGL: false

### frameRate 変換

- `frameRate(` → `__p5c_frameRate__(`
- setup 内の `frameRate(30)` も変換される

### `</script>` エスケープ

- `</script>` → `<\/script>` にエスケープ

### 3箇所の一貫性チェック

以下の3ファイルが **全て同じ変換パターン** を含むことを検証:

1. `viewer-fireworks/player.js`
2. `playground/playground.js`
3. `scripts/validate-sketch.js`

確認項目:
- 6つの正規表現パターンが全ファイルに存在する
- `__p5c_frameRate__` ダミー関数が全ファイルに定義されている
- `__p5c_createCanvas__` ダミー関数が全ファイルに定義されている

---

## build-entries.test.js

`scripts/build-entries.js` による `entries.json` 生成の正確性。

| テスト | 内容 |
|--------|------|
| 基本生成 | `entries/` をスキャンして JSON を出力する |
| フィールド確認 | 各エントリに id, title, author が含まれる |
| メタデータ抽出 | `const TITLE` / `const AUTHOR` から値を取得する |
| アイコン検出 | `icon.png` 等が存在すれば icon フィールドが設定される |
| 空ディレクトリ除外 | `sketch.js` がないディレクトリは無視される |

---

## テスト追加時の注意

- 禁止パターンを追加したら `scripts/validate-submission.js` の `BANNED_PATTERNS` を更新し、テストも追加する
- コード変換を変更したら `scripts/transform-code.js` と3箇所のファイルを全て更新し、一貫性テストで検証される
- テストフレームワーク: [Vitest](https://vitest.dev/)

---

## e2e テスト（ローカル限定）

```
npm install puppeteer --no-save
npm run test:e2e
```

Puppeteer を使った実行テスト。CI では既存の `validate-sketch.js` が投稿ごとに走るため不要。ローカルで `validate-sketch.js` の変更を確認したいときに使う。

| ファイル | テスト数 | 対象 |
|----------|----------|------|
| `e2e/validate-sketch.test.js` | 7 | Puppeteer 実行テスト |

### テスト内容

| テスト | 内容 |
|--------|------|
| 正常スケッチ完走 | 300フレーム完走を確認 |
| 無限ループ検出 | タイムアウトで失敗する |
| 構文エラー | 拒否される |
| frameRate(60) 上書き | システムの30fpsが維持される |
| createCanvas() 上書き | 400x800が維持される |
| WEBGL モード | 完走する |
| 重い処理 | 15秒以内なら完走する |

### 注意

- Puppeteer 未インストール時は自動スキップ（`describe.skipIf`）
- テスト1件あたり最大45秒かかる可能性あり
- `npm test`（CI用）には含まれない
