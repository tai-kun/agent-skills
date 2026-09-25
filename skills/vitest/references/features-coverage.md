---
name: features-coverage
description: V8 / Istanbul プロバイダー、レポーター、しきい値、include / exclude、コード除外、エージェント環境でのカバレッジを説明します。
---

# カバレッジ

Vitest は [`v8`](https://v8.dev/blog/javascript-code-coverage) によるネイティブコードカバレッジと [`istanbul`](https://istanbul.js.org/) による計装コードカバレッジに対応します。

## カバレッジプロバイダー

両プロバイダーは任意です。デフォルトでは `v8` を使います。`test.coverage.provider` でプロバイダーを選びます:

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8' // または 'istanbul'
    },
  },
})
```

起動時に Vitest は対応サポートパッケージの自動インストールを促します。手動インストール:

```bash [v8]
npm i -D @vitest/coverage-v8
```

```bash [istanbul]
npm i -D @vitest/coverage-istanbul
```

## V8 プロバイダー（デフォルト）

> **Note:** 以下の説明は Vitest 固有で、他のテストランナーには当てはまりません。v3.2.0 以降の Vitest は V8 カバレッジに [AST ベースのカバレッジリマップ](https://vitest.dev/blog/vitest-3-2#coverage-v8-ast-aware-remapping) を使い、Istanbul と同一のレポートを生成します。V8 カバレッジの速度と Istanbul の正確さを両立できます。

V8 プロバイダーは [V8 エンジン](https://v8.dev/) ベースの JavaScript ランタイム（Node.js、Deno、Chromium ベースのブラウザーなど）を必要とします。Node では [`node:inspector`](https://nodejs.org/api/inspector.html)、ブラウザーでは [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/) 経由で V8 に指示して実行時にカバレッジを収集します。ソースファイルは事前計装なしでそのまま実行されます。

- 推奨オプションです。
- 事前トランスパイルなしでテストファイルを実行できます。
- Istanbul より高速でメモリー使用量も少なくなります。
- v3.2.0 以降の正確さは Istanbul と同等です。
- 多数の異なるモジュールを読み込む場合など、Istanbul より遅い場合があります。V8 は特定モジュールへのカバレッジ収集制限に対応しません。
- V8 エンジンの軽微な制限があります（`ast-v8-to-istanbul` の制限を参照）。
- Firefox、Bun、Cloudflare Workers など非 V8 環境やプロファイラー経由で V8 カバレッジを公開しない環境では動作しません。

パイプライン: テストファイル -> V8 ランタイムのカバレッジ収集を有効化 -> ファイル実行 -> V8 からカバレッジ結果を収集 -> カバレッジ結果をソースファイルにリマップ -> カバレッジレポート。

## Istanbul プロバイダー

[Istanbul](https://istanbul.js.org/) は 2012 年から存在し、実績があります。ユーザーのソースファイルを計装してカバレッジ追跡を行うため、任意の JavaScript ランタイムで動作します:

```js
// ブランチ・関数カバレッジカウンターの簡略例です
const coverage = {
  branches: { 1: [0, 0] },
  functions: { 1: 0 },
}

export function getUsername(id) {
  coverage.functions['1']++

  if (id == null) {
    coverage.branches['1'][0]++
    throw new Error('ユーザー ID は必須です')
  }
  coverage.branches['1'][1]++

  return database.getUser(id)
}

globalThis.__VITEST_COVERAGE__ ||= {}
globalThis.__VITEST_COVERAGE__[filename] = coverage
```

- 任意の JavaScript ランタイムで動作します。
- 13 年以上広く使われた実績があります。
- 特定ファイルに計装を限定できるため、V8 より高速な場合があります（V8 は全モジュールを計装します）。
- 事前計装ステップ（Babel）が必要です。
- 計装オーバーヘッドのため V8 より実行が遅くなります。計装によりファイルサイズとメモリー使用量が増加します。

パイプライン: テストファイル -> Babel で事前計装 -> ファイル実行 -> JavaScript スコープからカバレッジ結果を収集 -> カバレッジ結果をソースファイルにリマップ -> カバレッジレポート。

## カバレッジ設定

> **Note:** すべてのカバレッジオプションはカバレッジ設定リファレンス（`docs/config/coverage.md`）に記載されています。

`--coverage` CLI フラグまたは設定の `coverage.enabled` でカバレッジを有効化します:

```json [package.json]
{
  "scripts": {
    "test": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true
    },
  },
})
```

## ファイルの包含と除外

`coverage.include` と `coverage.exclude` でレポートに含めるファイルを設定します。

デフォルトでは、テスト実行中にインポートされたファイルだけ表示されます。未カバーのファイルを含めるには、ソースを拾うパターンを `coverage.include` に設定します:

```ts [vitest.config.ts]
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}']
    },
  },
})
```

`coverage.exclude` は `coverage.include` で一致したファイルを除外します:

```ts [vitest.config.ts]
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/utils/users.ts']
    },
  },
})
```

## カスタムカバレッジレポーター

`test.coverage.reporter` にパッケージ名または絶対パスを渡します:

```ts [vitest.config.ts]
export default defineConfig({
  test: {
    coverage: {
      reporter: [
        // NPM パッケージ名でレポーターを指定します
        ['@vitest/custom-coverage-reporter', { someOption: true }],

        // ローカルパスでレポーターを指定します
        '/absolute/path/to/custom-reporter.cjs',
      ],
    },
  },
})
```

カスタムレポーターは Istanbul 経由で読み込まれ、そのレポーターインターフェースに準拠する必要があります:

```js [custom-reporter.cjs]
const { ReportBase } = require('istanbul-lib-report')

module.exports = class CustomReporter extends ReportBase {
  constructor(opts) {
    super()

    // 設定から渡されたオプションはここで使えます
    this.file = opts.file
  }

  onStart(root, context) {
    this.contentWriter = context.writer.writeFile(this.file)
    this.contentWriter.println('Start of custom coverage report')
  }

  onEnd() {
    this.contentWriter.println('End of custom coverage report')
    this.contentWriter.close()
  }
}
```

## カスタムカバレッジプロバイダー

`provider: 'custom'` を設定し、`customProviderModule` で `CoverageProviderModule` をデフォルトエクスポートするモジュール名またはパスを指定します:

```ts [vitest.config.ts]
export default defineConfig({
  test: {
    coverage: {
      provider: 'custom',
      customProviderModule: 'my-custom-coverage-provider'
    },
  },
})
```

```ts [my-custom-coverage-provider.ts]
import type {
  CoverageProvider,
  CoverageProviderModule,
  ResolvedCoverageOptions,
  Vitest
} from 'vitest'

const CustomCoverageProviderModule: CoverageProviderModule = {
  getProvider(): CoverageProvider {
    return new CustomCoverageProvider()
  },

  // 残りの CoverageProviderModule を実装します ...
}

class CustomCoverageProvider implements CoverageProvider {
  name = 'custom-coverage-provider'
  options!: ResolvedCoverageOptions

  initialize(ctx: Vitest) {
    this.options = ctx.config.coverage
  }

  // 残りの CoverageProvider を実装します ...
}

export default CustomCoverageProviderModule
```

## コードの除外

各プロバイダーは独自の除外ヒントを持ちます:

- [`v8`](https://github.com/AriPerkkio/ast-v8-to-istanbul?tab=readme-ov-file#ignoring-code)
- [`istanbul`](https://github.com/istanbuljs/nyc#parsing-hints-ignoring-lines)

TypeScript 使用時はソースが `esbuild` でトランスパイルされ、[法定コメント](https://esbuild.github.io/api/#legal-comments)以外のコメントは除去されます。除外ヒントを残すには `@preserve` キーワードを追加します（本番ビルドに残る場合があります）:

```diff
-/* istanbul ignore if */
+/* istanbul ignore if -- @preserve */
if (condition) {

-/* v8 ignore if */
+/* v8 ignore if -- @preserve */
if (condition) {
```

対応するヒント形式です:

```ts [lines: start/stop]
/* istanbul ignore start -- @preserve */
if (parameter) {
  console.log('Ignored')
}
else {
  console.log('Ignored')
}
/* istanbul ignore stop -- @preserve */

console.log('Included')

/* v8 ignore start -- @preserve */
if (parameter) {
  console.log('Ignored')
}
else {
  console.log('Ignored')
}
/* v8 ignore stop -- @preserve */
```

```ts [if else]
/* v8 ignore if -- @preserve */
if (parameter) {
  console.log('Ignored')
}
else {
  console.log('Included')
}

/* v8 ignore else -- @preserve */
if (parameter) {
  console.log('Included')
}
else {
  console.log('Ignored')
}
```

```ts [next node]
/* v8 ignore next -- @preserve */
console.log('Ignored')
console.log('Included')

/* v8 ignore next -- @preserve */
function ignored() {
  console.log('all')
  console.log('lines')
  console.log('are')
  console.log('ignored')
}

/* v8 ignore next -- @preserve */
class Ignored {
  ignored() {}
  alsoIgnored() {}
}

/* v8 ignore next -- @preserve */
condition
  ? console.log('ignored')
  : console.log('also ignored')
```

```ts [try catch]
/* v8 ignore next -- @preserve */
try {
  console.log('Ignored')
}
catch (error) {
  console.log('Ignored')
}

try {
  console.log('Included')
}
catch (error) {
  /* v8 ignore next -- @preserve */
  console.log('Ignored')
  /* v8 ignore next -- @preserve */
  console.log('Ignored')
}

// esbuild が未対応のため rolldown-vite が必要です
try {
  console.log('Included')
}
catch (error) /* v8 ignore next */ {
  console.log('Ignored')
}
```

```ts [switch case]
switch (type) {
  case 1:
    return 'Included'

  /* v8 ignore next -- @preserve */
  case 2:
    return 'Ignored'

  case 3:
    return 'Included'

  /* v8 ignore next -- @preserve */
  default:
    return 'Ignored'
}
```

```ts [whole file]
/* v8 ignore file -- @preserve */
export function ignored() {
  return 'Whole file is ignored'
}
```

## UI と HTML レポート

カバレッジは [Vitest UI](/guide/ui) と [HTML レポーター](/guide/reporters.html#html-reporter) で閲覧できます。HTML 出力を持つ組み込みレポーター（`html`、`html-spa`、`lcov`）と連携します。`html` レポーターはデフォルトで有効で、そのまま動作します。カスタムレポーターと連携するには `coverage.htmlDir` を設定します。

## エージェント環境でのカバレッジ

AI コーディングエージェント内で実行していることを検出すると、Vitest は出力とトークン使用量を削減するため、デフォルトの `text` レポーターを自動調整します:

- `text` レポーターに `skipFull: true` を設定し、カバレッジ 100% のファイルを端末出力から省略します。
- `text-summary` レポーターを自動追加し、`skipFull` ですべてのファイルが隠れても簡潔な合計テーブルを常に表示します。

これらの調整は、`text` レポーターが既に有効なレポーターリストに含まれる場合（デフォルトで含まれます）にだけ適用されます。明示設定したレポーターが削除されることはありません。

## パフォーマンス

カバレッジ生成が遅い場合は、テストパフォーマンスのプロファイリング | コードカバレッジ（`docs/guide/profiling-test-performance.md`）を参照してください。

## 要点

- `v8` がデフォルトで、V8 ベースのランタイムが必要で、計装不要で、v3.2.0 以降は AST ベースのリマップを使います。
- `istanbul` はソースを事前計装し、任意のランタイムで動作し、計装対象を特定ファイルに限定できます。
- `--coverage` または `coverage.enabled: true` で有効化します。
- 未カバーファイルを報告するには `coverage.include` を設定します。`coverage.exclude` で包含集合を絞り込みます。
- esbuild 経由で除外ヒントを残すには `-- @preserve` を使い、ファイル全体には `/* v8 ignore file -- @preserve */` を使います。

<!-- Sources: docs/guide/coverage.md -->
