---
name: features-reporters
description: 組み込み Vitest レポーター、デフォルト選択、出力ファイル、CI / GitHub Actions 設定を説明します。
---

# レポーター

Vitest はテスト結果をさまざまな形式で表示する組み込みレポーターを複数提供しており、カスタムレポーターも使えます。`--reporter` コマンドラインオプションまたは設定ファイルの `reporters` プロパティで選びます。指定がない場合は `default` レポーターを使います。

```bash
npx vitest --reporter=verbose
```

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['verbose'],
  },
})
```

一部のレポーターは `[name, options]` タプルでオプションを渡してカスタマイズできます:

```ts
export default defineConfig({
  test: {
    reporters: [
      'default',
      ['junit', { suiteName: 'UI tests' }],
    ],
  },
})
```

## 設定

- **型:**

```ts
interface UserConfig {
  reporters?: ConfigReporter | Array<ConfigReporter>
}

type ConfigReporter = string | Reporter | [string, object?]
```

- **既定値:** `'default'`、または `process.env.GITHUB_ACTIONS === 'true'` の場合は `['default', 'github-actions']`
- **CLI:**
  - `--reporter=tap` で単一レポーター
  - `--reporter=verbose --reporter=github-actions` で複数レポーター

このオプションはテスト実行中に Vitest が使う単一または複数のレポーターを定義します。組み込みレポーターに加え、`Reporter` インターフェースのカスタム実装、またはそれをデフォルトエクスポートするモジュールへのパス（例: `'./path/to/reporter.ts'`、`'@scope/reporter'`）を渡せます。

> **Warning:** カバレッジ機能はこのオプションではなく別の `coverage.reporter` オプションを使います。

レポーター混在、条件付きレポーター、オプション付きパッケージレポーターの例:

```js [vitest.config.js]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: [
      'default',
      // 条件付きレポーターです
      process.env.CI ? 'github-actions' : {},
      // npm パッケージのカスタムレポーターです。オプションはタプルで渡します
      ['vitest-sonar-reporter', { outputFile: 'sonar-report.xml' }],
    ],
  },
})
```

## レポーター出力

デフォルトでは、レポーターは出力を端末に出力します。`json`、`html`、`junit` レポーター使用時は、Vite 設定ファイルまたは CLI の `outputFile` オプションで代わりにファイルへ書き込めます:

```bash
npx vitest --reporter=json --outputFile=./test-output.json
```

```ts
export default defineConfig({
  test: {
    reporters: ['json'],
    outputFile: './test-output.json',
  },
})
```

## レポーターの組み合わせ

複数レポーターを同時使用して異なる形式で結果を出力します:

```ts
export default defineConfig({
  test: {
    reporters: ['json', 'default'],
    outputFile: './test-output.json',
  },
})
```

これは端末にデフォルト形式で出力しつつ、JSON として出力ファイルに書き込みます。複数レポーターでは複数の出力ファイルも指定できます:

```ts
export default defineConfig({
  test: {
    reporters: ['junit', 'json', 'verbose'],
    outputFile: {
      junit: './junit-report.xml',
      json: './json-report.json',
    },
  },
})
```

これは個別の JSON と XML レポートを書き込み、端末には verbose レポートを出力します。

## 組み込みレポーター

- `default`
- `verbose`
- `tree`
- `dot`
- `junit`
- `json`
- `html`
- `tap`
- `tap-flat`
- `hanging-process`
- `github-actions`
- `minimal`（別名 `agent`）
- `blob`

### Default レポーター

デフォルトでは、Vitest は実行中テストの概要と状態を下部に表示します。スイートが合格すると、その状態は概要上部に報告されます。

> **Note:** AI コーディングエージェント内で実行していることを検出すると、出力量とトークン使用量削減のため、代わりに `minimal` レポーターを使います。`reporters` オプションの明示設定で上書きできます。

`['default', { summary: false }]` と設定して概要を無効化できます:

```ts
export default defineConfig({
  test: {
    reporters: [
      ['default', { summary: false }],
    ],
  },
})
```

完了した実行の概要ブロック:

```text
 Test Files  4 passed (4)
      Tests  16 passed | 4 skipped (20)
   Start at  12:34:32
   Duration  1.26s (transform 35ms, setup 1ms, collect 90ms, tests 1.47s, environment 0ms, prepare 267ms)
```

1 つのテストファイルだけ実行する場合、Vitest は `tree` レポーターと同様にそのファイルの完全なテストツリーを出力します。ファイル内に 1 件以上の失敗テストがある場合もテストツリーを出力します。

### Verbose レポーター

verbose レポーターは完了したテストケースをすべて出力します。スイートやファイル単位では報告しません。`--includeTaskLocation` 有効時は各テストの位置（例: `file1.test.ts:2:1`）も出力に含めます。`default` レポーターと同様に `['verbose', { summary: false }]` で概要を無効化できます。

さらに `verbose` レポーターはテストエラーメッセージを即時出力します。完全なテストエラーは実行完了時に報告されます。テスト失敗時以外に注釈を報告する唯一の端末レポーターです。

### Tree レポーター

tree レポーターは `default` と同じですが、スイート完了後に個別テストも表示します。概要は同様に無効化できます。`slowTestThreshold`（デフォルト `300`）に基づき遅いテストを表面化します。

### Dot レポーター

完了テストごとにドット 1 文字を出力し、実行済み全テストを示しつつ最小出力にします。詳細は失敗テストとスイート概要だけ提供します。`--reporter=dot` または `reporters: ['dot']` を使います。

### JUnit レポーター

テスト結果を JUnit XML 形式で報告します。端末出力または `outputFile` オプションで XML ファイル書き込みができます。

出力 XML はネストした `testsuites` と `testcase` タグを含みます。レポーターオプション `suiteName` と `classnameTemplate` でカスタマイズできます。`classnameTemplate` はテンプレート文字列または関数を指定できます。対応プレースホルダーは `filename` と `filepath` です:

```ts
export default defineConfig({
  test: {
    reporters: [
      ['junit', { suiteName: 'custom suite name', classnameTemplate: 'filename:{filename} - filepath:{filepath}' }],
    ],
  },
})
```

### JSON レポーター

Jest の `--json` オプションと互換の JSON 形式でテスト結果を報告します。端末出力または `outputFile` オプションでファイル書き込みができます。

レポートは件数（`numTotalTests`、`numPassedTests`、`numFailedTests`、`success` など）、`assertionResults` を持つ `testResults` 配列（`ancestorTitles`、`fullName`、`status`、`title`、`duration`、`failureMessages`、`location`、`meta` を含む）、および `coverageMap` を含みます。

> **Note:** Vitest 3 以降、カバレッジ有効時は JSON レポーターの `coverageMap` にカバレッジ情報を含みます。

各アサーション結果の `meta` フィールドは `filterMeta` レポーターオプションで絞り込めます。各フィールドのキーと値を受け取り、偽値を返すとレポートから除外します:

```ts
export default defineConfig({
  test: {
    reporters: [
      ['json', {
        filterMeta: (key, value) => key !== 'internalField',
      }],
    ],
  },
})
```

### HTML レポーター

対話 GUI でテスト結果を閲覧する HTML ファイルを生成します。ファイル生成後、Vitest はローカル開発サーバーを起動したままにし、ブラウザー閲覧用リンクを提供します。出力ファイルは `outputFile` で指定できます。指定がない場合は新規 HTML ファイルを作ります。

> **Note:** このレポーターは `@vitest/ui` パッケージのインストールが必要です。

### TAP レポーター

Test Anything Protocol（TAP）に沿ったレポートを出力し、スイートはネスト階層として整形されます。

### TAP Flat レポーター

TAP フラットレポートを出力します。`tap` レポーターと同様に結果は TAP 標準に従いますが、テストスイートはネスト階層ではなくフラットリストとして整形されます。

### Hanging Process レポーター

Vitest の正常終了を妨げているハングプロセスの一覧を表示します。テスト結果自体は表示しませんが、他のレポーターと併用して実行中のプロセスを監視できます。リソース消費が大きいため、Vitest が正常に終了しない原因を調べる場合に限って使ってください。

### GitHub Actions レポーター

テスト失敗の注釈用にワークフローコマンドを出力します。`reporters` オプション未設定かつ `process.env.GITHUB_ACTIONS === 'true'` の場合に自動有効化されます。レポーターを設定した場合は `github-actions` を明示追加する必要があります:

```ts
export default defineConfig({
  test: {
    reporters: process.env.GITHUB_ACTIONS === 'true' ? ['dot', 'github-actions'] : ['dot'],
  },
})
```

レポーターオプション:

- `onWritePath(path)`: GitHub の注釈コマンド形式で出力するファイルパスをカスタマイズします。パスが GitHub Actions 環境と一致しない Docker などのコンテナー環境で役立ちます:

```ts
export default defineConfig({
  test: {
    reporters: process.env.GITHUB_ACTIONS === 'true'
      ? [
          'default',
          ['github-actions', { onWritePath(path) {
            return path.replace(/^\/app\//, `${process.env.GITHUB_WORKSPACE}/`)
          } }],
        ]
      : ['default'],
  },
})
```

- `displayAnnotations`: Annotations API 使用時、レポーターは GitHub UI に注釈をインライン表示します。`['github-actions', { displayAnnotations: false }]` で無効化します。
- `jobSummary`: レポーターはテストファイルとテストケース統計の Job Summary を自動生成し、リトライを要した不安定テストを強調します。デフォルト有効で、`$GITHUB_STEP_SUMMARY` に書き込みます。`jobSummary.outputPath`（例: `/home/runner/jobs/summary/step`）でパスを上書きします。`jobSummary.enabled: false` で無効化します。
- `jobSummary.fileLinks`: 不安定テストのパーマリンクは `$GITHUB_REPOSITORY`、`$GITHUB_SHA`、`$GITHUB_WORKSPACE` から自動構築されます。コンテナーやカスタム環境用に `repository`（`owner/repo`、デフォルト `process.env.GITHUB_REPOSITORY`）、`commitHash`（デフォルト `process.env.GITHUB_SHA`）、`workspacePath`（絶対リポジトリルート、デフォルト `process.env.GITHUB_WORKSPACE`）で上書きします。リンク生成には 3 値がすべて必要です:

```ts
export default defineConfig({
  test: {
    reporters: [
      ['github-actions', {
        jobSummary: {
          fileLinks: {
            repository: 'owner/repo',
            commitHash: 'abcdefg',
            workspacePath: '/home/runner/work/repo/',
          },
        },
      }],
    ],
  },
})
```

### Minimal レポーター

- **Alias:** `agent`

失敗テストとエラーメッセージだけ含む最小レポートを出力します。合格テストのコンソールログと概要セクションも抑制します。トークン使用量削減のため AI コーディングアシスタントや LLM ベースのワークフロー向けに最適化され、`reporters` オプション未設定かつ AI コーディングエージェント内実行検出時に自動有効化されます。カスタムレポーターを設定した場合は `--reporter=minimal` または `reporters: ['minimal']` で `minimal` / `agent` を明示追加します。

### Blob レポーター

テスト結果をマシンに保存し、後で `--merge-reports` コマンドで統合できるようにします。デフォルトでは `.vitest-reports` フォルダーに全結果を保存しますが、`--outputFile` または `--outputFile.blob` フラグで上書きできます:

```bash
npx vitest --reporter=blob --outputFile=reports/blob-1.json
```

`--shard` フラグで異なるマシン実行する場合に推奨されます。すべての blob レポートは CI パイプライン終了時に任意レポートへ統合できます:

```bash
npx vitest --merge-reports=reports --reporter=json --reporter=default
```

Blob レポーター出力はファイルベースの添付ファイルを含みません。この機能使用時は CI 上で `attachmentsDir` を blob レポートと併せて個別統合します。出力ファイルなしで `--reporter=blob` を使うと、他 Vitest プロセスとの衝突回避のため、デフォルトパスに現在のシャード設定を含めます。

> **Note:** `--reporter=blob` と `--merge-reports` はどちらも watch モードでは動作しません。

## カスタムレポーター

npm インストールしたサードパーティーのカスタムレポーターは、reporters オプションにパッケージ名を指定して使えます:

```bash
npx vitest --reporter=some-published-vitest-reporter
```

```ts
export default defineConfig({
  test: {
    reporters: ['some-published-vitest-reporter'],
  },
})
```

独自のカスタムレポーターを定義し、ファイルパス指定でも使えます:

```bash
npx vitest --reporter=./path/to/reporter.ts
```

カスタムレポーターは `Reporter` インターフェース（`packages/vitest/src/node/types/reporter.ts`）を実装します。

<!-- Sources: docs/guide/reporters.md, docs/config/reporters.md -->
