# P5 Continue - アーキテクチャ & 開発メモ

## プロジェクト概要

PWNISHERの「ボールが落ちる」CGコンテストにインスパイアされたP5.jsクリエイティブコーディングリレープラットフォーム。
参加者が「画面上部中央から何かが現れ、10秒後に画面下部中央に消えていく」P5.jsスケッチを投稿し、ランダムに連続再生されるギャラリーサイト。

現在「花火大会」版（viewer-fireworks: クロスフェード切り替え）が稼働中。

**リポジトリ**: https://github.com/haukun/p5js-baton-fireworks
**公開サイト**: https://haukun.github.io/p5js-baton-fireworks/

## 技術スタック

- フロントエンド: 静的HTML + vanilla JS + CSS
- スケッチ実行: iframe (Blob URL方式)
- ホスティング: GitHub Pages
- CI/CD: GitHub Actions (Issue投稿処理 + 自動デプロイ)
- 投稿方式: GitHub Issue（Git知識不要）

## 仕様

### viewer-fireworks（花火大会版、現在稼働中）
| 項目 | 値 |
|------|-----|
| キャンバスサイズ | 400 x 800 px |
| フレームレート | 60fps |
| 総フレーム数 | 600 (= 10秒) |
| トランジション | クロスフェード (1.5秒) |

### viewer（スクロール版、未稼働）
| 項目 | 値 |
|------|-----|
| キャンバスサイズ | 400 x 720 px |
| フレームレート | 60fps |
| 総フレーム数 | 600 (= 10秒) |
| ステージ全体 | 400 x 800 px (上帯40 + Canvas720 + 下帯40) |
| トランジション | 上方向スクロール (1秒) |

## ディレクトリ構成

```
├── template/sketch.js              参加者用テンプレート
├── entries/
│   ├── example-bouncing-ball/      サンプル作品1
│   ├── example-falling-letters/    サンプル作品2
│   └── entry-N/                    Issue投稿された作品（自動生成）
├── viewer-fireworks/               花火大会ビューア（デプロイ対象）
│   ├── index.html
│   ├── player.js
│   ├── style.css
│   └── entries.json                作品一覧（自動生成）
├── viewer/                         スクロール版ビューア（参考保存）
│   ├── index.html
│   ├── player.js
│   └── style.css
├── scripts/
│   └── build-entries.js            entries.json 生成スクリプト
├── docs/
│   └── ARCHITECTURE.md             本ドキュメント
├── .registry.json                  GitHubユーザー登録簿（SHA-256ハッシュ）
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── submit-sketch.yml       投稿フォーム
    │   ├── delete-sketch.yml       削除フォーム
    │   └── config.yml              空Issue禁止
    └── workflows/
        ├── process-submission.yml  投稿処理（新規＋上書き更新）＋デプロイ
        ├── manage-submission.yml   削除処理＋デプロイ
        ├── deploy.yml              pushトリガーのデプロイ
        └── validate.yml            PR時バリデーション（PR方式の場合）
```

---

## 投稿システム設計

### Issue投稿方式（現在の方式）

参加者はGit操作不要。GitHub Issueのフォームに入力するだけ。

**投稿フロー:**
1. 参加者が https://github.com/haukun/p5js-baton-fireworks/issues/new/choose を開く
2. 「🎆 作品を投稿する」を選択
3. 作品タイトル・作者名・コードを入力して Submit
4. GitHub Actionsが自動処理:
   - バリデーション（禁止API、サイズ制限等）
   - 既に投稿済み → 既存entryを上書き更新
   - 新規 → `entries/entry-{Issue番号}/sketch.js` を作成
   - registryに登録
   - entries.jsonを再生成
   - GitHub Pagesにデプロイ
   - Issueにコメント＆クローズ
5. 1〜2分後にサイトに反映

**更新フロー:**
- 同じユーザーが再度「作品を投稿する」で投稿 → 既存作品を上書き
- タイトル・作者名・コード全て変更可能

**削除フロー:**
1. 「🗑️ 作品を削除する」を選択
2. 確認チェック → Submit
3. 自分の作品のみ削除される（registryからも削除、再投稿可能に）

### Issue Formの注意点

- GitHubのIssue Formでは「Add a title」欄を消せない
- `title: "作品提出"` でプレフィルし、ワークフローは `issue.title == '作品提出'` で判定
- ラベルベースの判定は**ラベルが事前に存在しないと付与されない**ため不採用

### GITHUB_TOKENによるpushの制限

- GitHub Actionsの`GITHUB_TOKEN`でpushしたコミットは**別のワークフローをトリガーしない**
- 対策: `process-submission.yml`内でデプロイステップまで含める（deploy.ymlに頼らない）

---

## ビューア設計

### iframe + Blob URL方式

各スケッチは独立したiframe内で実行される。iframe内にBlob URLで生成したHTMLを読み込む。

**Blob URL方式を採用した理由:**
- 別ファイル（runner.html）方式だとP5.jsのCDN読み込みタイミングの制御が困難
- グローバルモードのP5.jsが`setup()`/`draw()`をDOMContentLoaded後に自動検出するため、postMessageでコードを後から注入する方式では動かなかった
- Blob URLならHTMLを丸ごと生成できるので、参加者のコードをインラインで埋め込める

### setup/draw のリネーム手法

参加者は通常の`setup()`/`draw()`でコードを書く（ローカルデバッグ可能）。
ビューア読み込み時にシステムが以下の変換を行う:

```javascript
code.replace(/function\s+setup\s*\(/g, 'function __p5c_setup__(')
    .replace(/function\s+draw\s*\(/g, 'function __p5c_draw__(')
    .replace(/createCanvas\s*\([^)]*\)\s*;?/g, '// createCanvas removed by system')
```

- `setup`/`draw` → `__p5c_setup__`/`__p5c_draw__` にリネーム
- `createCanvas(...)` は自動除去（参加者はローカルで書いたままコピペできる）
- システムが本物の`setup()`/`draw()`を定義し、ライフサイクルを完全制御

### frameCount管理

```javascript
var __userFrameCount = 0;
function draw() {
  if (!__drawEnabled) return;  // 待機中は何もしない
  __userFrameCount++;
  frameCount = __userFrameCount;  // 参加者には1〜600が見える
  if (typeof __p5c_draw__ === 'function') __p5c_draw__();
}
```

- P5.js内部のframeCountとは独立
- 待機中（`__drawEnabled = false`）は`__userFrameCount`が増えない
- トランジッションの遅延に関係なく、参加者のコードは必ずframeCount=1から600で動作
- ブラウザが重くて実時間12秒かかっても、draw2()は必ず600回呼ばれてからトランジション

### viewer-fireworks: クロスフェード方式

- 2つのiframeを`position: absolute`で重ねて配置
- CSS `opacity` トランジション（1.5秒）でクロスフェード
- 現在のスケッチ完了 → 次のスケッチを裏で読み込み+setup実行 → 0.5秒後にクロスフェード開始
- 花火は背景黒なので、クロスフェード中に両方が透けて重なるのも演出として有効

### viewer: スクロール方式のトランジッション

1. 現在のスケッチが600フレーム完了 → `sketch-complete`メッセージ
2. 現在のCanvasにフェードアウト（CSS opacity, 0.5秒）
3. 次のスケッチをnextSlotに読み込み（paused=true）
4. iframe内: `setup()` → `__p5c_setup__()` 実行（背景描画）→ 親に`setup-complete`通知
5. 親が`setup-complete`受信（または2秒タイムアウト）→ スクロール開始（1秒）
6. スクロール完了 → iframe内タイマーで`__drawEnabled = true`
7. `draw()` → `__p5c_draw__()` 開始

### postMessageの制限事項

Blob URLのiframeへの`postMessage`は**信頼できない**ことが判明:
- 親→子の`postMessage`がBlobオリジン(`null`)のiframeに届かないケースがある
- 解決策: **子（iframe）→親へのpostMessageは動作する**ので、通知は子→親のみ使用
- 子の制御（draw開始タイミング等）は**`setTimeout`で自己管理**させる

### 帯（divider bar）デザイン（スクロール版）

- 上帯(`bar-top`): 暗灰色→黒のグラデーション。上端に細いライン
- 下帯(`bar-bottom`): 黒→暗灰色のグラデーション。下端に細いライン
- 2つが隣接すると1つの帯に見える
- 通過アニメーション: `::before`疑似要素でグラデーションが上→下に流れる
- 上帯は`animation-delay: 0.25s`で下帯の後に連続して発火（1本に見える）
- アニメーション回数制御: `infinite`ではなく、**3回分を1つの`@keyframes`に焼き込み`forwards`で停止**（半端な4回目が始まるのを防止）
- アニメーションの色はランダム（CSS変数 `--glow-color-1/2/3` をJSで設定）
- アニメーションはスケッチ再生中は停止、トランジション中のみ発火

---

## セキュリティ設計

### 1人1作品の制御

- `.registry.json`にGitHubユーザー名のSHA-256ハッシュ → ディレクトリ名の対応を記録
- 投稿時にハッシュを照合: 既存なら上書き、なければ新規
- ハッシュのため、公開リポジトリでもGitHubユーザー名の逆引きは困難
- 削除時にregistryからエントリーを削除 → 再投稿可能に

### 作品の保護

- リポジトリへの直接pushは管理者のみ可能
- 外部ユーザーはIssue経由でのみ操作可能
- ワークフローはGitHubユーザーハッシュで本人確認するため、他人の作品は操作不可

### スケッチのバリデーション

- TITLE/AUTHOR定数の存在チェック（PR方式の場合）
- `createCanvas()` はシステムが自動除去（禁止ではない）
- 禁止API検出: fetch, XMLHttpRequest, import, require, eval, Function, window.open
- システム内部変数へのアクセス禁止: `__userFrameCount`, `__drawEnabled`, `__waiting`, `__frameOffset`, `__p5c_setup__`, `__p5c_draw__`
- JavaScript構文チェック（node --check、PR方式の場合）
- ファイルサイズ50KB以下

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

# ブラウザで開く
# 花火版: http://localhost:3000/viewer-fireworks/
# スクロール版: http://localhost:3000/viewer/
```

**重要**: `http-server`はデフォルトで3600秒キャッシュする。開発中は必ず`-c-1`を付ける。

### sketch.jsの変更が反映されない場合

1. サーバーが`-c-1`で起動されているか確認
2. ブラウザのCtrl+Shift+Rでハードリロード
3. player.jsのfetch URLにキャッシュバスター(`?t=${Date.now()}`)が付いていることを確認（開発用。本番ではデプロイ時にentries.jsonが更新されるので不要）

### P5.jsグローバルモードの注意点

- P5.jsはsetup()後に必ずdraw()を1回呼ぶ（noLoop()していても）
- 対策: draw()の先頭で待機フラグをチェックして即return
- setup()で宣言したグローバル変数はdraw()から参照可能（同一スクリプト内のため）

### GitHub Pages デプロイパス

- viewer-fireworksの中身がサイトルートに展開される
- entries/もルート直下にコピーされる
- player.jsのfetchパスは `entries/${id}/sketch.js`（`../`ではない）

---

## GitHub設定

1. **Settings > Pages**: Source を "GitHub Actions" に設定
2. **Settings > Actions > General**: Workflow permissions を "Read and write permissions" に設定

---

## 今後の拡張案

- プレビュー生成（Puppeteer + スクリーンショット/GIF）— 規模が大きくなったら
- いいね/お気に入り機能 — GitHub Starやリアクションを活用?
- テーマ別コンテスト — 期間限定でテーマを設定
- 音楽連動 — BGMに合わせてスケッチ切り替えタイミングを同期
- PR方式の復活 — Git上級者向けの並行投稿経路
