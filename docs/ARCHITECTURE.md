# p5js-baton-fireworks (p5js花火大会) - プロジェクト全体像

## コンセプト

P5.jsで「花火を打ち上げる」10秒間のアニメーション作品を参加者が投稿し、全作品がランダム順にクロスフェードで連続再生されるギャラリーサイト。

- 参加者はGit知識不要。GitHub Issueフォームからコードを貼り付けるだけで投稿完了
- 1〜2分後にサイトへ自動反映される

**リポジトリ**: https://github.com/haukun/p5js-baton-fireworks  
**公開サイト**: https://haukun.github.io/p5js-baton-fireworks/

---

## スケッチ仕様

| 項目 | 値 |
|------|-----|
| キャンバスサイズ | 400 x 800 px |
| フレームレート | 30fps |
| 総フレーム数 | 300 (= 10秒) |
| 背景 | 黒（花火の演出に最適） |
| トランジション | クロスフェード (1.5秒) |

### 参加者のルール

- `setup()` と `draw()` を定義する（通常のP5.jsと同じ）
- `createCanvas()` は書かなくてよい（システムが自動設定）
- `frameCount` は 1〜300 で自動停止
- 外部リソース読み込み禁止（loadImage, fetch, XMLHttpRequest等）
- ネットワーク通信禁止

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | 静的HTML + vanilla JS + CSS |
| スケッチ実行 | iframe内srcdoc（HTMLインライン埋め込み） |
| P5.js | v2.3.0 ローカル同梱 (p5.min.js) |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |
| 投稿I/F | GitHub Issue Form |

---

## ディレクトリ構成

```
├── entries/
│   ├── example-bouncing-ball/      サンプル作品
│   │   └── sketch.js
│   ├── example-falling-letters/    サンプル作品
│   │   └── sketch.js
│   └── entry-N/                    投稿された作品（自動生成）
│       ├── sketch.js
│       └── icon.png (任意)
├── assets/
│   └── frame.png                   共通フレーム画像（全ページから参照）
├── viewer-fireworks/               ビューア（デプロイ対象）
│   ├── index.html
│   ├── player.js                   再生制御ロジック
│   ├── style.css
│   ├── p5.min.js                   P5.jsライブラリ（ローカル同梱）
│   └── entries.json                作品一覧（自動生成）
├── scripts/
│   ├── build-entries.js            entries/ → entries.json 生成
│   ├── validate-sketch.js          Puppeteer実行テスト
│   ├── validate-submission.js      投稿バリデーション（モジュール）
│   └── transform-code.js           コード変換ロジック（モジュール）
├── tests/
│   ├── validate-submission.test.js バリデーションテスト
│   ├── transform-code.test.js      コード変換テスト
│   ├── build-entries.test.js       entries.json生成テスト
│   └── e2e/
│       └── validate-sketch.test.js Puppeteer e2eテスト（ローカル限定）
├── docs/
│   └── ARCHITECTURE.md             本ドキュメント
├── .registry.json                  ユーザー → エントリー対応表
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── submit-sketch.yml       投稿フォーム
    │   ├── delete-sketch.yml       削除フォーム
    │   └── config.yml              空Issue禁止
    └── workflows/
        ├── process-submission.yml  投稿処理 + デプロイ
        ├── manage-submission.yml   削除処理 + デプロイ
        ├── deploy.yml              pushトリガーのデプロイ
        └── validate.yml            PR時バリデーション
```

---

## 投稿フロー

```
参加者 → Issue Form (作品提出) → GitHub Actions (process-submission.yml)
  ├── バリデーション（禁止API・サイズ等）
  ├── 失敗 → Issueにエラーコメント & クローズ
  └── 成功
      ├── entries/entry-{番号}/sketch.js 作成
      ├── アイコン画像ダウンロード（任意）
      ├── .registry.json 更新
      ├── entries.json 再生成
      ├── git commit & push
      ├── GitHub Pages デプロイ
      └── Issueに成功コメント & クローズ
```

- **更新**: 同一ユーザーが再投稿 → 既存エントリーを上書き
- **削除**: 「作品を削除する」Issue → 自作品のみ削除、再投稿可能に

---

## ビューア設計 (viewer-fireworks)

### 再生の流れ

1. `entries.json` を読み込み（ページロード時固定キャッシュバスト付き）、シャッフル
2. 作品のsketch.jsをfetchし、srcdocとしてiframeに設定
3. 300フレーム完了 → iframe から `sketch-complete` を postMessage
4. 次の作品を裏のiframeにロード → クロスフェード (1.5秒)
5. 全作品再生後、再シャッフルしてループ
6. fetch失敗時は次の作品を自動スキップ（全件失敗時は停止）

### iframe + srcdoc方式

- 参加者コードの `setup`/`draw` を内部名 (`__p5c_setup__`/`__p5c_draw__`) にリネーム
- `createCanvas()` をダミー関数に差し替え（システムが400x800を設定）
- `frameRate()` をダミー関数に差し替え（システムが30fpsを設定）
- システムが本物の `setup()`/`draw()` を定義し、フレームカウント・停止を制御
- p5.min.js をインラインで埋め込み（CDN依存なし）
- iframe の `srcdoc` 属性に HTML を直接設定（Blob URL は使わない → ブラウザ履歴に影響しない）

### frameCount管理

```javascript
var __userFrameCount = 0;
function draw() {
  if (!__drawEnabled) return;
  __userFrameCount++;
  frameCount = __userFrameCount;  // 参加者には1〜300が見える
  if (typeof __p5c_draw__ === 'function') __p5c_draw__();
  if (__userFrameCount >= 300) {
    noLoop();
    window.parent.postMessage({ type: 'sketch-complete' }, '*');
  }
}
```

### postMessageの制約

- 親→子は Blob URL オリジン(`null`)のため信頼できない
- **子→親のみ使用**（sketch-complete, setup-complete）
- 子の制御（draw開始タイミング等）は `setTimeout` で自己管理

---

## セキュリティ

### 1人1作品の制御

- `.registry.json`: GitHubユーザー名 → ディレクトリ名のマッピング
- 投稿時にユーザー名で照合: 既存なら上書き、なければ新規作成
- 削除時もユーザー名で照合し、自分の作品のみ削除可能

### バリデーション (投稿時)

- 禁止API: fetch, XMLHttpRequest, import, require, eval, Function, window.open, WebSocket, EventSource, RTCPeerConnection, sendBeacon, AudioContext
- 外部ファイル読み込み禁止: loadImage, loadSound, loadFont, loadJSON, loadStrings, loadTable, loadBytes, loadModel, loadShader
- システム内部変数アクセス禁止: `__userFrameCount`, `__drawEnabled`, `__p5c_setup__`, `__p5c_draw__`, `__p5c_frameRate__`, `__p5c_createCanvas__` 等
- システム関数の再定義禁止: `function frameRate()`, `function createCanvas()`
- ファイルサイズ: 50KB以下
- JavaScript構文チェック (PR方式の場合)
- バリデーションロジックは `scripts/validate-submission.js` にモジュール化

### iframe内サンドボックス

- 危険なAPIを `undefined` で上書き (fetch, XMLHttpRequest, WebSocket, alert, open, sendBeacon等)
- `createCanvas()` と `frameRate()` をダミー関数に差し替え
- srcdocのiframeは別オリジン（sandbox="allow-scripts"）→ 親DOMにアクセス不可

---

## デプロイ

### GitHub Pages構成

```
_site/
├── index.html              → viewer-fireworks/ へリダイレクト
├── viewer-fireworks/       ← viewer-fireworks/ の中身をコピー
│   ├── index.html
│   ├── player.js
│   ├── style.css
│   ├── p5.min.js
│   └── entries.json
└── entries/                ← entries/ をそのままコピー
    ├── entry-2/
    │   ├── sketch.js
    │   └── icon.png
    └── ...
```

### デプロイトリガー

| ワークフロー | トリガー | 用途 |
|---|---|---|
| process-submission.yml | Issue作成 (タイトル="作品提出") | 投稿処理 + デプロイ |
| manage-submission.yml | Issue作成 (タイトル="作品削除") | 削除処理 + デプロイ |
| deploy.yml | main へ push | 通常のデプロイ |

### 注意: GITHUB_TOKEN の制限

- `GITHUB_TOKEN` でpushしたコミットは別ワークフローをトリガーしない
- そのため process-submission / manage-submission 内にデプロイステップを含めている

---

## ローカル開発

```bash
# entries.json生成
node scripts/build-entries.js

# サーバー起動（キャッシュ無効）
npx http-server . -p 3000 --cors -c-1

# テスト実行
npm test              # ロジックテスト（高速）
npm run test:e2e      # Puppeteer e2eテスト（要: npm install puppeteer --no-save）

# ブラウザ
# http://localhost:3000/viewer-fireworks/
```

**注意**: http-serverはデフォルト3600秒キャッシュ。開発中は必ず `-c-1` を付ける。

---

## テスト

| コマンド | 対象 | 速度 |
|----------|------|------|
| `npm test` | バリデーション、コード変換、entries.json生成 (45テスト) | ~1秒 |
| `npm run test:e2e` | Puppeteer実行テスト (7テスト) | ~100秒 |

- テスト詳細は `tests/README.md` を参照
- CI では `npm test` のみ実行（高速）
- e2e テストはローカル確認用（Puppeteer要）

---

## Google Analytics

- Measurement ID: `G-BXVQXL0LFX`
- 計測対象: ビューア、ガイド(日英)、Playground の4ページ
- iframe内スケッチはCSPで外部接続ブロック済みのため影響なし

---

## GitHub設定

1. **Settings > Pages**: Source を "GitHub Actions" に設定
2. **Settings > Actions > General**: Workflow permissions を "Read and write permissions" に設定

---

## 設計判断メモ

### なぜ 30fps なのか（60fps → 30fps の経緯）

iOS Safari は `sandbox="allow-scripts"` 付き iframe 内の `requestAnimationFrame` を 30fps に制限する仕様がある。このプロジェクトではセキュリティのために sandbox iframe を使っているため、iOS では 60fps が出ない。

調査で試した回避策と結果：

| 手法 | 結果 |
|------|------|
| sandbox を外す | 60fps 出るが、投稿コードが親ページの DOM や localStorage にアクセス可能になりセキュリティ上不可 |
| srcdoc iframe に変更 | iOS で変化なし（30fps のまま） |
| rAF を setTimeout ポリフィルに差し替え | p5.js が内部で rAF 参照をキャッシュするため効果なし |
| noLoop() + setInterval + redraw() | iOS が setInterval もスロットルしており効果なし |
| MessageChannel ベースのループ | 60fps 出るが CPU を焼く（PC でも固まる） |
| draw() 2回呼び（double-step） | フレーム進行は補正できるが、fps 計測の誤判定が難しく不安定 |
| 別オリジン iframe（runner サブドメイン） | セキュリティと 60fps を両立できるが、インフラが複雑化する |

結論として、**sandbox を維持しつつ全環境で安定動作する現実的な解は「30fps に統一」**だった。30fps × 300 フレーム = 10 秒で、どのデバイスでも同じテンポで再生される。

---

## 今後の拡張案

- プレビュー生成（Puppeteer + スクリーンショット/GIF）
- いいね/お気に入り機能
- テーマ別コンテスト（期間限定テーマ）
- 音楽連動（BGMに合わせてスケッチ切り替え）
- PR方式の復活（Git上級者向け）
