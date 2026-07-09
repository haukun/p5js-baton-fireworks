# 🎆p5js花火大会 - 参加ガイド

## 🗒️これは何？

P5.jsで「花火」をテーマにした10秒間のアニメーション作品をみんなで持ち寄り、ランダムに連続再生されるオンラインギャラリーです。

作品を投稿すると、他の参加者の花火と一緒にクロスフェードで次々に再生されます。

現在のギャラリーを見る: https://haukun.github.io/p5js-baton-fireworks/

---

## 🔷作品のルール

| 項目 | 内容 |
|------|------|
|p5.jsバージョン| 2.3.0|
| キャンバスサイズ | 400 x 800 px |
| フレームレート | 60fps（システムが自動設定） |
| 再生時間 | 10秒間（600フレームで自動停止） |
| テーマ | 花火（解釈は自由！） |

### 🎨動作の仕組み（ざっくり）

あなたの作品は以下のように再生されます：

1. 前の人の作品が終了する
2. あなたの `setup()` が1回呼ばれる（初期化）
3. クロスフェードであなたの作品が表示される（この間 `draw()` はまだ動かない）
4. クロスフェードが完了したら `draw()` が600回呼ばれる（10秒間）
5. 10秒経ったら自動で停止し、次の人の作品へ

### 🖼️createCanvas について

投稿された作品は `createCanvas(400, 800)` で実行されます。それ以外の `createCanvas()` が含まれていてもシステムが自動で `createCanvas(400, 800)` に置き換えます。


### ⛔禁止事項

- 無限ループや、**悪意のある**高負荷な処理など、作品の正常な閲覧を妨げるもの
- 公共良俗に反する表現
- 以下のAPIは使用禁止です。コードに含まれていると投稿が拒否されます。また、万が一通過しても実行時にシステムで無効化されているため動作しません。

  - `loadImage()`, `loadSound()` など外部ファイルの読み込み
  - `fetch()`, `XMLHttpRequest` などネットワーク通信
  - `eval()`, `Function()` などの動的コード実行
  - `import`, `require` によるモジュール読み込み


🚨管理者が不適切だと判断した作品は削除いたします。

---

## 投稿方法

Gitの知識は不要です。GitHubアカウントがあれば誰でも投稿できます。

### 手順

1. [投稿ページ](https://github.com/haukun/p5js-baton-fireworks/issues/new?template=submit-sketch.yml) を開く
2. 以下を入力する:
   - **作品タイトル** — 作品の名前
   - **作者名** — 表示名（ハンドルネームOK）
   - **コード** — P5.jsスケッチのコード
   - **アイコン画像**（任意） — 作品の横に表示されるアイコン（200KB以下）
3. 「Create」をクリック
4. 1〜2分待つとサイトに反映されます！

### 投稿時の注意

- Issue タイトル欄は自動入力されています。**変更しないでください**
- コードは ```javascript``` で囲まなくてOK（フォームが自動処理します）
- 作品はGithubユーザー名に紐づいて管理されるため、1アカウントにつき1作品のみ投稿できます（再投稿で上書き更新できます）
- 投稿したコードはGitHub上で公開され、履歴にも残ります

---

## 作品の更新・削除

### 更新したい場合

同じ手順でもう一度投稿するだけです。前回投稿した作品が上書きされます。

### 削除したい場合

1. [削除ページ](https://github.com/haukun/p5js-baton-fireworks/issues/new?template=delete-sketch.yml) を開く
2. 確認チェックを入れて Submit
3. 自分の作品が削除され、再投稿可能になります

---

## ローカルでテストする方法

投稿前にローカルで動作確認できます。

### 方法1: p5.js Web Editor（最も簡単）

1. https://editor.p5js.org/ を開く
2. `createCanvas(400, 800);` を setup() に書く
3. コードを書いて再生ボタンで確認
4. 動いたらコードをコピーして投稿（createCanvasは残したままでOK）

### 方法2: ローカルHTMLファイル

以下のHTMLを保存してブラウザで開く:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5@2.3.0/lib/p5.min.js"></script>
</head>
<body>
<script>
// === ここにあなたのコードを貼る ===

function setup() {
  createCanvas(400, 800);
}

function draw() {
  background(0);
  // あなたのアニメーション
}

// === ここまで ===
</script>
</body>
</html>
```

---

## サンプルコード

シンプルな打ち上げ花火の例:

```javascript
function setup() {
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 0, 20);

  let progress = frameCount / 600;

  // 打ち上げフェーズ (最初の30%)
  if (progress < 0.3) {
    let launchProgress = progress / 0.3;
    let x = 200;
    let y = 800 - launchProgress * 500;

    // 火花の尾
    stroke(30, 80, 100);
    strokeWeight(3);
    line(x, y, x + random(-2, 2), y + 20);
    noStroke();
  }

  // 爆発フェーズ (30%以降)
  if (progress >= 0.3) {
    let explodeProgress = (progress - 0.3) / 0.7;
    let centerX = 200;
    let centerY = 300;
    let radius = explodeProgress * 200;
    let alpha = max(0, 100 - explodeProgress * 120);

    for (let angle = 0; angle < TAU; angle += PI / 16) {
      let x = centerX + cos(angle) * radius;
      let y = centerY + sin(angle) * radius;
      let hue = (angle * 60 + frameCount) % 360;

      noStroke();
      fill(hue, 80, 100, alpha);
      circle(x, y, 8 - explodeProgress * 6);
    }
  }
}
```

---

## Tips

- 作品のframeCountは1～600まで動作しますので、作品中の時間管理に使うことができます。
- `background(0, 0, 0, 20);` で残像効果が作れます（花火の尾が残る）
- `colorMode(HSB)` を使うと色相で鮮やかな色が作りやすいです
- 複数の花火を時間差で打ち上げると豪華になります
- `noise()` や `random()` で有機的な動きを加えるのもおすすめ

---

## FAQ

**Q: 勝手に参加してよい？**  
A: p5.jsが書ければだれでも参加OKです！

**Q: createCanvas() を書いてしまったけど大丈夫？**  
A: 大丈夫です。システムが自動で除去します。

**Q: 600フレーム経ったらどうなる？**  
A: 自動的にアニメーションが停止し、次の作品にクロスフェードします。

**Q: 作品を修正したい**  
A: もう一度投稿すれば上書きされます。

**Q: エラーで投稿できなかった**  
A: Issueにエラー内容がコメントされます。内容を修正して再度投稿してください。

**Q: 他の人の作品に影響はある？**  
A: ありません。各作品は独立したiframe内で実行されます。

**Q: 質問・意見があります**  
A: [@Hau_kun](https://x.com/Hau_kun) か Issues 等でコメントください。

**Q: セキュリティーホールを見つけてしまった！**  
A: Pull requestsください！（マージは管理者が確認して行います）
