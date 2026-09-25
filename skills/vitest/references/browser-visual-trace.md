---
name: browser-visual-trace
description: Browser Mode のビジュアルリグレッション運用と Playwright トレース取得・閲覧の実践ガイドです。
---

# ビジュアルリグレッションとトレース

見た目の退行と実行証跡を扱う運用ガイドです。アサーション API 自体は `browser-assertions.md`、設定項目は `browser-config.md` を参照してください。

## ビジュアルリグレッションの考え方

機能テストが振る舞いを見るのに対し、ビジュアルテストは意図せぬ見た目変化（色・レイアウト・はみ出し・リファクタ起因の崩れ）を捉えます。`expect(...).toMatchScreenshot()` で要素・ページを撮って参照画像と比較します:

```ts
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('hero section looks correct', async () => {
  await expect(page.getByTestId('hero')).toMatchScreenshot('hero-section')
})
```

> **Warning:** 描画は環境依存で、フォント・GPU・headless 有無・ブラウザー設定・解像度で変わります。Vitest は参照名にブラウザー名とプラットフォームを含めます（例: `button-chromium-darwin.png`）。安定運用には全員同一環境（Docker・クラウド）を強くおすすめします。

## 参照の作成・更新・配置

初回実行では参照が生成されて失敗します。画像内容を確認して再実行し、参照をコミットしてください:

```
expect(element).toMatchScreenshot()

No existing reference screenshot found; a new one was created. Review it before running tests again.

Reference screenshot:
  tests/__screenshots__/hero.test.ts/hero-section-chromium-darwin.png
```

既定配置:

```
.
├── __screenshots__
│   └── test-file.test.ts
│       ├── test-name-chromium-darwin.png
│       ├── test-name-firefox-linux.png
│       └── test-name-webkit-win32.png
└── test-file.test.ts
```

- 名前は `toMatchScreenshot()` 第 1 引数かテスト名自動生成で、末尾にブラウザー名とプラットフォームが付きます。
- 保存先変更は `browser.expect.toMatchScreenshot.resolveScreenshotPath`、失敗 diff 先変更は `resolveDiffPath` で行います。`browser.screenshotDirectory` も参照します。
- 意図変更時は `vitest --update`（watch 中は `u`）で更新し、差分レビュー後にコミットします。大量運用では Git LFS を検討してください。

## 安定撮影の仕組み

ページは画像・フォント・レイアウト・アニメーションで徐々に安定するため、Vitest は安定検出を行います:

1. 初回撮影（参照あればそれを基準）を取得します。
2. 再撮影して基準比較し、一致で安定確定、不一致で最新を基準に繰り返します。
3. 安定または timeout まで継続します。安定までに再試行があれば、参照有り時は最終で `createDiff: true` の比較を行い diff 生成します。

終わらないアニメーションは timeout 要因になるため、テスト用 CSS で無効化します:

```css
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
```

> **Note:** Playwright プロバイダーでは `screenshotOptions.animations` 既定が `disabled` になります。

## 設定

全体既定:

```ts
export default defineConfig({
  test: {
    browser: {
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: {
            threshold: 0.2,
            allowedMismatchedPixelRatio: 0.01,
          },
        },
      },
    },
  },
})
```

個別上書き:

```ts
await expect(element).toMatchScreenshot('button-hover', {
  comparatorName: 'pixelmatch',
  comparatorOptions: { allowedMismatchedPixelRatio: 0.1 },
})
```

`allowedMismatchedPixelRatio` 基準がおすすめで、画像サイズ連動で扱いやすくなります。個数・割合の両指定時は厳しい方が採用されます。

## ベストプラクティス

- 全体撮影より対象要素に絞ります（無関係変更の誤検知を減らします）:

```ts
await expect(page).toMatchScreenshot() // 非推奨
await expect(page.getByTestId('product-card')).toMatchScreenshot() // 推奨
```

- 動的コンテンツは発生源をモックするか、Playwright の `screenshotOptions.mask` で覆います:

```ts
await expect(page.getByTestId('profile')).toMatchScreenshot({
  screenshotOptions: { mask: [page.getByTestId('last-seen')] },
})
```

- 閾値は内容・環境・許容で調整し、テキスト多めは緩めます。viewport は明示固定します:

```ts
await page.viewport(1280, 720)
```

```ts
instances: [{ browser: 'chromium', viewport: { width: 1280, height: 720 } }]
```

- フォントは Web フォント＋`await document.fonts.ready` 待ち、またはコンテナー・クラウドで固定します。

## 失敗時の読解

失敗時は参照・実写・diff の 3 点が出ます:

```
Screenshot does not match the stored reference.
245 pixels (ratio 0.03) differ.

Reference screenshot:
  tests/__screenshots__/button.test.ts/button-chromium-darwin.png
Actual screenshot:
  tests/.vitest-attachments/button.test.ts/button-chromium-darwin-actual.png
Diff image:
  tests/.vitest-attachments/button.test.ts/button-chromium-darwin-diff.png
```

赤は差分、黄は AA 差分、透明/元色は不変です。全体赤は実破壊、文字周りの点状赤は閾値不足のことが多いです。

## チーム運用

選択肢は自前ランナー・GitHub Actions・クラウド（例: Azure App Testing）です。代表 2 方式を示します。

### GitHub Actions分離

通常テストと分離し、CI 固定環境でのみ visual を回します:

```json
{
  "scripts": {
    "test:unit": "vitest --exclude tests/visual/*.test.ts",
    "test:visual": "vitest tests/visual/*.test.ts"
  }
}
```

代替として Test Projects＋`--project unit/visual` も使えます。CI ではブラウザー導入が必須です（Playwright は `npx --no playwright install --with-deps --only-shell`、WebdriverIO は `browser-actions/setup-chrome` 等）。更新は手動起動 workflow に絞り、main 直実行禁止・同時実行制御・変更コミット＋サマリー表示で行います。自動更新の常時化は避けてください。

### Azure App Testing分離

ブラウザーのみクラウド化し、ローカル実行性を保ちます。Playwright 限定で、従量課金と token 管理が必要です:

```ts
provider: playwright({
  connectOptions: {
    wsEndpoint: `${env.PLAYWRIGHT_SERVICE_URL}?${new URLSearchParams({
      'api-version': '2025-09-01',
      os: 'linux',
      runName: `Vitest ${env.CI ? 'CI' : 'local'} run @${new Date().toISOString()}`,
    })}`,
    exposeNetwork: '<loopback>',
    headers: { Authorization: `Bearer ${env.PLAYWRIGHT_SERVICE_ACCESS_TOKEN}` },
    timeout: 30_000,
  },
}),
```

`visual` プロジェクトに限定してクラウド化し、`test:visual`/`test:unit` に分けます。CI では URL と token を secrets 経由で渡します。GitHub Actions は無料・全 provider 可ですがローカル再現が弱く、クラウドはローカル実行可ですが有料・Playwright 限定という tradeoff です。迷ったら Actions から始めてください。

## トレースの閲覧

Playwright のトレースを取得・閲覧します。**playwright 限定**です:

```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      provider: playwright(),
      trace: 'on',
    },
  },
})
```

```bash
vitest --browser.trace=on
```

- `on`（全件、重いため非推奨）・`off`・`on-first-retry`・`on-all-retries`・`retain-on-failure` または `{ mode, tracesDir?, screenshots?, snapshots? }` を取ります。既定はテスト近傍 `__traces__` で、`tracesDir` で root 相対変更できます。ファイル名は `chromium-my-test-0-0.trace.zip` 形式です。
- 取得物はレポーターのアノテーション（例: HTML レポーターの詳細）から参照できます。

### マーカーと閲覧

```ts
import { page } from 'vitest/browser'

document.body.innerHTML = `<button type="button">Sign in</button>`
await page.getByRole('button', { name: 'Sign in' }).mark('sign in button rendered')

await page.mark('sign in flow', async () => {
  await page.getByRole('textbox', { name: 'Email' }).fill('john@example.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('secret')
  await page.getByRole('button', { name: 'Sign in' }).click()
})
```

`page.mark`・`locator.mark` で明示区間を作り、再利用ヘルパーは `vi.defineHelper()` で包むと呼出元を指します。閲覧は `npx playwright show-trace <zip>` または `https://trace.playwright.dev` へのアップロードで行います。

`expect.element` や `click`・`fill`・`type`・`hover`・`selectOptions`・`upload`・`dragAndDrop`・`tab`・`keyboard`・`wheel`・撮影は自動でソース位置グルーピングされます（低級 Playwright イベントを Vitest が包みます）。対象外は `mark` で補います。

## 要点

- 参照は生成→目視→再実行→コミットの順で育て、意図変更のみ `--update` します。
- 対象絞り・動態マスク・anim 停止・viewport 固定・閾値調整・環境固定で flaky を抑えます。
- チームでは visual 分離＋CI 固定が基本で、ローカル再現が要る場合のみクラウド化します。
- 原因追跡は 3 画像＋トレース（`retain-on-failure`＋`mark`）で行い、再現条件を環境込みで残します。

<!-- Sources: docs/guide/browser/visual-regression-testing.md, docs/guide/browser/trace-view.md, docs/api/browser/assertions.md, docs/config/browser/trace.md, docs/config/browser/expect.md -->
