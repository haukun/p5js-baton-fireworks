# P5 Continue - アーキテクチャ & 開発メモ

## プロジェクト概要

PWNISHERの「ボールが落ちる」CGコンテストにインスパイアされたP5.jsクリエイティブコーディングリレープラットフォーム。
参加者が「画面上部中央から何かが現れ、10秒後に画面下部中央に消えていく」P5.jsスケッチを投稿し、ランダムに連続再生されるギャラリーサイト。

## 技術スタック

- フロントエンド: 静的HTML + vanilla JS + CSS
- スケッチ実行: iframe (Blob URL方式)
- ホスティング: GitHub Pages
- CI/CD: GitHub Actions (バリデーション + 自動マージ + 自動デプロイ)
- 投稿方式: GitHub Pull Request

## 仕様

| 項目 | 値 |
|------|-----|
| キャンバスサイズ | 400 x 720 px |
| フレームレート | 60fps |
| 総フレーム数 | 600 (= 10秒) |
| 開始地点 | (200, 0) 付近 |
| 終了地点 | (200, 720) 付近 |
| ステージ全体 | 400 x 800 px (上帯40 + Canvas720 + 下帯40) |

## ディレクトリ構成

```
├── template/sketch.js          参加者用テンプレート
├── entries/
│   ├── example-bouncing-ball/  サンプル作品1
│   └── example-falling-letters/ サンプル作品2
├── viewer/
│   ├── index.html              再生ビューア
│   ├── player.js               再生ロジック
│   ├── style.css               スタイル
│   └── entries.json            作品一覧（自動生成）
├── scripts/
│   └── build-entries.js        entries.json 生成スクリプト
├── docs/
│   └── ARCHITECTURE.md         本ドキュメント
├── .registry.json              GitHubユーザー登録簿（ハッシュ）
└── .github/workflows/
    ├── validate.yml            PR自動バリデーション＋マージ
    └── deploy.yml              GitHub Pages デプロイ
```

---

## ビューア設計

### iframe + Blob URL方式

各スケッチは独立したiframe内で実行される。iframe内にBlob URLで生成したHTMLを読み込む。

Blob URL方式を採用した理由:
- 別ファイル（runner.html）方式だとP5.jsのCDN読み込みタイミングの制御が困難
- グローバルモードのP5.jsが`setup()`/`draw()`をDOMContentLoaded後に自動検出するため、postMessageでコードを後から注入する方式では動かなかった
- Blob URLならHTMLを丸ごと生成できるので、参加者のコードをインラインで埋め込める

### setup/draw のリネーム手法

参加者は通常の`setup()`/`draw()`でコードを書く（ローカルデバッグ可能）。
ビューア読み込み時にシステムが以下の変換を行う:

```javascript
code.replace(/function\s+setup\s*\(/g, 'function setup2(')
    .replace(/function\s+draw\s*\(/g, 'function draw2(')
```

システムが本物の`setup()`/`draw()`を定義し、ライフサイクルを完全制御:
- `setup()`: createCanvas + frameRate + `setup2()` 呼び出し + 待機モード管理
- `draw()`: `__drawEnabled`フラグで開始タイミング制御 + `__userFrameCount`で参加者向けframeCount管理

### frameCount管理

```javascript
var __userFrameCount = 0;
function draw() {
  if (!__drawEnabled) return;  // 待機中は何もしない
  __userFrameCount++;
  frameCount = __userFrameCount;  // 参加者には1〜600が見える
  draw2();
}
```

- P5.js内部のframeCountとは独立
- 待機中（__drawEnabled = false）は__userFrameCountが増えない
- トランジッションの遅延に関係なく、参加者のコードは必ずframeCount=1から600で動作

### トランジッションの流れ

1. 現在のスケッチが600フレーム完了 → `sketch-complete`メッセージ
2. 現在のCanvasにフェードアウト（CSS opacity, 0.5秒）
3. 次のスケッチをnextSlotに読み込み（paused=true）
4. iframe内: `setup()` → `setup2()` 実行（背景描画） → `noLoop()` + 親に`setup-complete`通知
5. 親が`setup-complete`受信（または2秒タイムアウト） → スクロール開始（1秒）
6. スクロール完了 → iframe内タイマー（FADE_OUT_DURATION + TRANSITION_DURATION後）で`__drawEnabled = true`
7. `draw()` → `draw2()` 開始

### postMessageの制限事項

Blob URLのiframeへの`postMessage`は**信頼できない**ことが判明:
- 親→子の`postMessage`がBlobオリジン(`null`)のiframeに届かないケースがある
- 解決策: **子（iframe）→親へのpostMessageは動作する**ので、通知は子→親のみ使用
- 子の制御（draw開始タイミング等）は**`setTimeout`で自己管理**させる

### 帯（divider bar）デザイン

- 上帯(`bar-top`): 暗灰色→黒のグラデーション。上端に細いライン
- 下帯(`bar-bottom`): 黒→暗灰色のグラデーション。下端に細いライン
- 2つが隣接すると1つの帯に見える
- 通過アニメーション: `::before`疑似要素でグラデーションが上→下に流れる
- 上帯は`animation-delay: 0.25s`で下帯の後に連続して発火（1本に見える）
- アニメーション回数制御: `infinite`ではなく、3回分を1つの`@keyframes`に焼き込み`forwards`で停止（半端な4回目が始まるのを防止）
- アニメーションの色はランダム（CSS変数 `--glow-color-1/2/3` をJSで設定）

---

## セキュリティ設計

### 1人1作品の制御

- `.registry.json`にGitHubユーザー名のSHA-256ハッシュ → ディレクトリ名の対応を記録
- PR時にハッシュを照合して重複投稿を拒否
- ハッシュのため、公開リポジトリでもGitHubユーザー名の逆引きは困難

### 既存作品の保護

- GitHub Actionsで既存ファイルの変更(M)・削除(D)を検出してブロック
- entries/以外のファイル変更もブロック（.registry.json除く）
- 自動マージされるのは「新規追加のみ」のPR

### スケッチのバリデーション

- TITLE/AUTHOR定数の存在チェック
- createCanvas()の使用禁止
- 禁止API検出: fetch, XMLHttpRequest, import, require, eval, Function, window.open
- JavaScript構文チェック（node --check）
- ファイルサイズ50KB以下
- ディレクトリ名: 英数字・ハイフン・アンダースコアのみ

### iframe内のサンドボックス

- `window.fetch = undefined` / `window.XMLHttpRequest = undefined` で無効化
- Blob URLのiframeは別オリジンのため、親ページのDOMにはアクセス不可

---

## 開発Tips

### ローカル開発

```bash
# entries.json生成
node scripts/build-entries.js

# サーバー起動（キャッシュ無効）
npx http-server . -p 3000 --cors -c-1

# ブラウザで http://localhost:3000/viewer/ を開く
```

**重要**: `http-server`はデフォルトで3600秒キャッシュする。開発中は必ず`-c-1`を付ける。

### sketch.jsの変更が反映されない場合

1. サーバーが`-c-1`で起動されているか確認
2. ブラウザのCtrl+Shift+Rでハードリロード
3. player.jsのfetch URLにキャッシュバスター(`?t=${Date.now()}`)が付いていることを確認

### P5.jsグローバルモードの注意点

- P5.jsはsetup()後に必ずdraw()を1回呼ぶ（noLoop()していても）
- 対策: draw()の先頭で待機フラグをチェックして即return
- setup()で宣言したグローバル変数はdraw()から参照可能（同一スクリプト内のため）

---

## GitHub設定（デプロイ時に必要）

1. Settings > Branch protection rules: `main`に保護追加、"Require status checks to pass"で`validate`を必須に
2. Settings > Pages: Source を "GitHub Actions" に設定
3. Settings > Actions > General: GITHUB_TOKEN権限を Read and write に設定
4. `hmarr/auto-approve-action`が動くよう、Actionsの権限でPR承認を許可

---

## 今後の拡張案

- プレビュー生成（Puppeteer + スクリーンショット/GIF）— 規模が大きくなったら
- いいね/お気に入り機能 — GitHub Starやリアクションを活用?
- テーマ別コンテスト — 期間限定でテーマを設定
- 音楽連動 — BGMに合わせてスケッチ切り替えタイミングを同期
