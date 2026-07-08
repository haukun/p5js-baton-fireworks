# P5 Continue

みんなで繋ぐ P5.js クリエイティブコーディングリレー。

画面上部から「何か」が現れ、10秒後に画面下部へ消えていく。それだけがルール。  
投稿された作品はランダムに切り替わりながら、永遠に再生され続けます。

▶ **[ギャラリーを見る](https://your-username.github.io/p5-continue/)**

---

## 参加方法

### 1. リポジトリをフォーク

このリポジトリを Fork してください。

### 2. 作品を作る

`template/sketch.js` をコピーして、`entries/あなたの作品名/sketch.js` として配置します。

```
entries/
  my-cool-sketch/
    sketch.js       ← これを作る
```

**ディレクトリ名のルール:** 半角英数字、ハイフン(`-`)、アンダースコア(`_`)のみ使用可能

### 3. メタデータを記入

ファイル冒頭の定数を必ず埋めてください:

```javascript
const TITLE = "作品タイトル";
const AUTHOR = "あなたの名前";
```

### 4. Pull Request を送る

`main` ブランチに向けて PR を作成してください。  
自動バリデーションが通れば、そのままマージされます。

---

## ルール

| 項目 | 内容 |
|------|------|
| キャンバスサイズ | 400 × 800 px（固定。`createCanvas()` は書かないでください） |
| フレームレート | 60fps（システムが自動設定） |
| 総フレーム数 | 600フレーム（= 10秒）で自動停止 |
| 開始地点 | 画面上部中央 (200, 0) 付近から「何か」が現れる |
| 終了地点 | 画面下部中央 (200, 800) 付近に「何か」が消える |
| 表現 | 完全に自由。ボールでも、文字でも、生き物でも何でもOK |
| ファイルサイズ | 50KB 以下 |

### 禁止事項

- `createCanvas()` — システムが管理します
- `loadImage()`, `loadSound()` 等 — 外部ファイル読み込み禁止
- `fetch()`, `XMLHttpRequest` — ネットワーク通信禁止
- `eval()`, `Function()`, `import`, `require()` — セキュリティ上禁止

### Tips

```javascript
// 進行度（0.0 → 1.0）を使うと便利
let progress = frameCount / 600;

// frameCount は 1 から始まり 600 で停止します
// 60fps なので frameCount = 60 で1秒経過
```

---

## テンプレート

```javascript
const TITLE = "作品タイトル";
const AUTHOR = "あなたの名前";

function setup() {
  // 初期化処理
}

function draw() {
  background(0);

  let progress = frameCount / 600;
  let x = 200;
  let y = progress * 800;

  fill(255);
  noStroke();
  ellipse(x, y, 40, 40);
}
```

---

## ローカルで動作確認する

```bash
# entries.json を生成
node scripts/build-entries.js

# ローカルサーバーで確認（何でもOK）
npx http-server . -p 8080
# → http://localhost:8080/viewer/ を開く
```

---

## プロジェクト構成

```
├── template/sketch.js          参加者用テンプレート
├── entries/
│   ├── example-bouncing-ball/  サンプル作品1
│   └── example-falling-letters/ サンプル作品2
├── viewer/
│   ├── index.html              再生ビューア
│   ├── runner.html             スケッチ実行環境（iframe内）
│   ├── player.js               再生ロジック
│   ├── style.css               スタイル
│   └── entries.json            作品一覧（自動生成）
├── scripts/
│   └── build-entries.js        entries.json 生成スクリプト
└── .github/workflows/
    ├── validate.yml            PR時の自動バリデーション＋マージ
    └── deploy.yml              GitHub Pages デプロイ
```

---

## ライセンス

投稿された作品の著作権は各作者に帰属します。  
プラットフォームのコードは MIT License です。
