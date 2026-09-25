---
name: vitest-cli
description: Vitest のコマンドラインインターフェースのコマンド、テストフィルター、全オプションのリファレンスです。
---

# コマンドラインインターフェース

## コマンド

### `vitest`

現在のディレクトリで Vitest を起動します。開発環境では自動的にウォッチモードに、CI（または非対話型ターミナル）では実行モードで起動します。

追加の引数を渡すと、パスに含まれる文字列でテストファイルを絞り込めます（シェルが事前に展開しない限り、正規表現や glob は使えません）。

```bash
vitest foobar
```

Vitest 3 以降では、ファイル名と行番号を指定できます:

```bash
vitest basic/foo.test.ts:10
```

> **Warning:** Vitest では、現在の作業ディレクトリからの相対パスまたは絶対パスで完全なファイル名を指定する必要があります。`vitest foo:10` や `vitest ./basic/foo:10` は動作しません。範囲指定には対応していないため、代わりに複数の位置を渡してください（`vitest basic/foo.test.ts:10, basic/foo.test.ts:25`）。

### `vitest run`

ウォッチモードなしで 1 回だけ実行します。

### `vitest watch`

すべてのテストスイートを実行し、変更を監視して影響を受けるテストを再実行します。引数なしの `vitest` と同じです。CI の場合や stdin が TTY でないときは `vitest run` にフォールバックします。

### `vitest dev`

`vitest watch` のエイリアスです。

### `vitest related`

ソースファイルのリストをカバーするテストだけ実行します。`import('./index.js')` や `import index from './index.js'` のような静的インポートでは動作し、`import(filepath)` のような動的インポートでは動作しません。すべてのファイルはルートフォルダーからの相対パスで指定してください。

```bash
vitest related /src/index.ts /src/hello-world.js
```

> **Note:** Vitest はデフォルトでウォッチモードで動作します。`lint-staged` のようなツールと使う場合は、正常終了できるよう `--run` も渡してください。

```js
// .lintstagedrc.js
export default {
  '*.{js,ts}': 'vitest related --run',
}
```

### `vitest bench`

パフォーマンス結果を比較するベンチマークテストだけ実行します。

### `vitest init`

`vitest init <name>` でプロジェクト設定をセットアップします。現在は `browser` 値だけ対応しています:

```bash
vitest init browser
```

### `vitest list`

すべての `vitest` オプションを継承し、実行せずにマッチするテストの一覧を出力します。`reporters` は無視されます。デフォルトではテスト名を出力します:

```shell
vitest list filename.spec.ts -t="some-test"
```

`--json` を追加すると stdout に JSON を出力し、`--json=./file.json` でファイルに保存します。`--filesOnly` を追加するとテストファイルだけ出力します。

Vitest 4.1 以降では `--static-parse` を渡すと、テスト収集のために実行する代わりにテストファイルをパースします。パースは制限された並行性を使い、デフォルトは `os.availableParallelism()` で、`--static-parse-concurrency` で設定できます。

## オプション構文

> **Note:** Vitest は CLI 引数でキャメルケースとケバブケースのどちらも受け付けます:`--passWithNoTests` と `--pass-with-no-tests` はどちらも動作します（`--no-color` と `--inspect-brk` は例外です）。`--reporter dot` と `--reporter=dot` はどちらも有効です。

配列値に対応するオプションは複数回渡せます:`vitest --reporter=dot --reporter=default`。真偽値オプションは `no-` プレフィックスで否定するか `false` に設定できます:`vitest --no-api` / `vitest --api=false`。

## 一般オプション

| Option | 説明 |
|---|---|
| `-r, --root <path>` | ルートパス |
| `-c, --config <path>` | 設定ファイルへのパス |
| `--mode <name>` | Vite モードを上書きします（デフォルト: `test` または `benchmark`） |
| `-w, --watch` | ウォッチモードを有効にします |
| `--run` | ウォッチモードを無効にします |
| `--standalone` | テストを実行せずに Vitest を起動します。変更時のみテストを実行します（デフォルト: `false`） |
| `--clearScreen` | ウォッチモードで再実行時にターミナル画面をクリアします（デフォルト: `true`） |
| `--no-color` | コンソール出力から色を除去します |
| `--configLoader <loader>` | `bundle`（esbuild）または `runner`（実験的、Vite 6.1.0 以降）（デフォルト: `bundle`） |
| `--clearCache` | テストを実行せずに `experimental.fsModuleCache` を含むすべての Vitest キャッシュを削除します |
| `--passWithNoTests` | テストが見つからない場合も成功扱いにします |

## テスト検出と絞り込み

| Option | 説明 |
|---|---|
| `-t, --testNamePattern <pattern>` | 完全名が指定した正規表現パターンにマッチするテストを実行します |
| `--dir <path>` | テストファイルを走査する基準ディレクトリー |
| `--exclude <glob>` | テストから除外する追加のファイル glob（設定値に追加されます） |
| `--project <name>` | 実行するプロジェクト。繰り返し指定でき、ワイルドカード（`--project=packages*`）と除外（`--project=!pattern`）に対応します |
| `--tagsFilter <expression>` | 指定タグを持つテストだけ実行します。`&&`、`||`、`!` に対応します |
| `--listTags [type]` | テストを実行せずに利用可能なタグを一覧表示します。`--list-tags=json` で JSON 出力します |
| `--strictTags` | 設定で定義されていないタグを持つテストがある場合にエラーにします（デフォルト: `true`） |

### changed

- **型:** `boolean | string`
- **既定値:** `false`

変更されたファイルに対するテストだけ実行します。値なしでは未コミットの変更（ステージ済みと未ステージ）を使います。`--changed HEAD~1` で直前のコミットを使い、コミットハッシュ（`--changed 09a9920`）やブランチ名（`--changed origin/develop`）も使えます。カバレッジ使用時は、変更に関連するファイルだけレポートに含めます。`forceRerunTriggers` と併用すると、リストされたファイルの変更で全スイートを再実行します。Vitest 設定と `package.json` の変更では常に全スイートを再実行します。

### shard

- **型:** `string`
- **既定値:** disabled

スイートを `<count>` 個の均等な部分に分割し、`<index>` 番目だけ実行します。形式は `<index>/<count>`:

```sh
vitest run --shard=1/3
vitest run --shard=2/3
vitest run --shard=3/3
```

> **Warning:** このオプションは `--watch` 有効時には使えません（開発環境ではデフォルトでウォッチが有効です）。

> **Note:** `--reporter=blob` を出力ファイルなしで使う場合、Vitest プロセス間の衝突を避けるため、デフォルトパスに現在のシャード設定が含まれます。

### merge-reports

- **型:** `boolean | string`

指定フォルダー（デフォルトは `.vitest-reports`）にあるすべての blob レポートをマージします。`blob` 以外の任意のレポーターを使えます:

```sh
vitest --merge-reports --reporter=junit
```

## 実行と並行性

| Option | 説明 |
|---|---|
| `--isolate` | 各テストファイルを分離して実行します。無効にするには `--no-isolate` を使います（デフォルト: `true`） |
| `--pool <pool>` | ブラウザー外でテストを実行するプール（デフォルト: `forks`） |
| `--execArgv <option>` | `worker_threads` や `child_process` 生成時に `node` プロセスへ渡す追加引数 |
| `--vmMemoryLimit <limit>` | VM プールのメモリー制限。メモリーリークが見られる場合に調整します |
| `--fileParallelism` | すべてのテストファイルを並列実行します。無効にするには `--no-file-parallelism` を使います（デフォルト: `true`） |
| `--maxWorkers <workers>` | ワーカーの最大数または割合 |
| `--maxConcurrency <number>` | テストファイル実行中のテストとスイートの最大同時実行数（デフォルト: `5`） |
| `--environment <name>` | ブラウザー外での実行環境（デフォルト: `node`） |
| `--globals` | API をグローバルに注入します |
| `--allowOnly` | `only` 指定のテストとスイートを許可します（デフォルト: `!process.env.CI`） |
| `--dangerouslyIgnoreUnhandledErrors` | 発生した未処理エラーをすべて無視します |
| `--detectAsyncLeaks` | テストファイルから漏洩した非同期リソースを検出します（デフォルト: `false`） |
| `--logHeapUsage` | node で実行時に各テストのヒープサイズを表示します |

### Sequence

| Option | 説明 |
|---|---|
| `--sequence.shuffle.files` | ファイルをランダム順で実行します（デフォルト: `false`） |
| `--sequence.shuffle.tests` | テストをランダム順で実行します（デフォルト: `false`） |
| `--sequence.concurrent` | テストを並列実行します（デフォルト: `false`） |
| `--sequence.seed <seed>` | ランダム化のシード。シャッフル有効時のみ効果があります |
| `--sequence.hooks <order>` | フックの順序:`"stack"`、`"list"`、`"parallel"`（デフォルト: `"parallel"`） |
| `--sequence.setupFiles <order>` | セットアップファイルの順序:`"list"` または `"parallel"`（デフォルト: `"parallel"`） |

> **Note:** `"list"` ではセットアップファイルは定義順に実行され、`"parallel"` では並列に実行されます。

## タイムアウト、リトライ、中断

| Option | 説明 |
|---|---|
| `--testTimeout <timeout>` | テストのデフォルトタイムアウト（ms）（デフォルト: `5000`）。`0` で無効にします |
| `--hookTimeout <timeout>` | フックのデフォルトタイムアウト（ms）（デフォルト: `10000`）。`0` で無効にします |
| `--teardownTimeout <timeout>` | teardown 関数のデフォルトタイムアウト（ms）（デフォルト: `10000`） |
| `--slowTestThreshold <threshold>` | テストやスイートを遅いとみなす閾値（ms）（デフォルト: `300`） |
| `--bail <number>` | 指定回数失敗したらテスト実行を停止します（デフォルト: `0`） |
| `--retry.count <times>` | 失敗時にテストをリトライする回数（デフォルト: `0`） |
| `--retry.delay <ms>` | リトライ間の遅延（ms）（デフォルト: `0`） |
| `--retry.condition <pattern>` | リトライを発動するエラーメッセージの正規表現パターン（デフォルト: すべてのエラーでリトライします） |

`--retry <times>` は回数を設定する省略形です。リトライのオブジェクトオプションは `core-config.md` を参照してください。

## スナップショットと差分

| Option | 説明 |
|---|---|
| `-u, --update [type]` | スナップショットを更新します（真偽値、`"new"`、`"all"`、`"none"` を受け付けます） |
| `--expandSnapshotDiff` | スナップショット失敗時に完全な差分を表示します |
| `--diff.aAnnotation <annotation>` | 期待値行のアノテーション（デフォルト: `Expected`） |
| `--diff.aIndicator <indicator>` | 期待値行のインジケーター（デフォルト: `-`） |
| `--diff.bAnnotation <annotation>` | 受信値行のアノテーション（デフォルト: `Received`） |
| `--diff.bIndicator <indicator>` | 受信値行のインジケーター（デフォルト: `+`） |
| `--diff.commonIndicator <indicator>` | 共通行のインジケーター（デフォルト: ` `） |
| `--diff.contextLines <lines>` | 各変更前後のコンテキスト行数（デフォルト: `5`） |
| `--diff.emptyFirstOrLastLinePlaceholder <placeholder>` | 空の最初または最後の行のプレースホルダー（デフォルト: `""`） |
| `--diff.expand` | すべての共通行を展開します（デフォルト: `true`） |
| `--diff.includeChangeCounts` | 差分出力に比較カウントを含めます（デフォルト: `false`） |
| `--diff.omitAnnotationLines` | 出力からアノテーション行を省略します（デフォルト: `false`） |
| `--diff.printBasicPrototype` | 基本的なプロトタイプの Object と Array を出力します（デフォルト: `true`） |
| `--diff.maxDepth <maxDepth>` | ネストしたオブジェクト出力時の深さ制限（デフォルト: `20`） |
| `--diff.truncateThreshold <threshold>` | 各変更の前後に表示する行数（デフォルト: `0`） |
| `--diff.truncateAnnotation <annotation>` | 省略行のアノテーション（デフォルト: `... Diff result is truncated`） |

## レポーターと出力

| Option | 説明 |
|---|---|
| `--reporter <name>` | レポーター:`default`、`agent`、`minimal`、`blob`、`verbose`、`dot`、`json`、`tap`、`tap-flat`、`junit`、`tree`、`hanging-process`、`github-actions` |
| `--outputFile <filename/-s>` | 対応レポーター使用時に結果をファイルに書き出します。レポーターごとのドット記法:`--outputFile.tap=./tap.txt` |
| `--silent [value]` | テストからのコンソール出力を抑制します。`'passed-only'` では失敗テストのログだけ表示します |
| `--hideSkippedTests` | スキップされたテストのログを隠します |
| `--disableConsoleIntercept` | console ログの自動インターセプトを無効にします（デフォルト: `false`） |
| `--printConsoleTrace` | console のスタックトレースを常に出力します |
| `--includeTaskLocation` | `location` プロパティーにテストとスイートの位置を収集します |
| `--attachmentsDir <dir>` | `context.annotate` 由来の添付ファイル用ディレクトリー（デフォルト: `.vitest-attachments`） |
| `--ui` | UI を有効にします |
| `--open` | UI を自動で開きます（デフォルト: `!process.env.CI`） |

## カバレッジ

| Option | 説明 |
|---|---|
| `--coverage` | カバレッジ収集を有効にします |
| `--coverage.provider <name>` | `v8`、`istanbul`、`custom` |
| `--coverage.enabled` | 収集を有効にします。`--coverage` で上書きできます（デフォルト: `false`） |
| `--coverage.include <pattern>` | glob パターンで含めるファイル。繰り返し指定できます。デフォルトではテストがカバーしたファイルだけ含めます |
| `--coverage.exclude <pattern>` | 除外するファイル。繰り返し指定できます |
| `--coverage.clean` | テスト実行前に結果をクリーンします（デフォルト: `true`） |
| `--coverage.cleanOnRerun` | ウォッチ再実行時にレポートをクリーンします（デフォルト: `true`） |
| `--coverage.reportsDirectory <path>` | 出力ディレクトリー（デフォルト: `./coverage`） |
| `--coverage.reporter <name>` | レポーター（デフォルト: `["text", "html", "clover", "json"]`） |
| `--coverage.reportOnFailure` | テスト失敗時もレポートを生成します（デフォルト: `false`） |
| `--coverage.allowExternal` | プロジェクトルート外のファイルのカバレッジを収集します（デフォルト: `false`） |
| `--coverage.skipFull` | 文・分岐・関数のカバレッジが 100% のファイルを隠します（デフォルト: `false`） |
| `--coverage.thresholds.100` | すべての閾値を 100 に設定します（デフォルト: `false`） |
| `--coverage.thresholds.perFile` | ファイルごとに閾値を検査します（デフォルト: `false`） |
| `--coverage.thresholds.autoUpdate <boolean\|function>` | カバレッジが上回った場合に設定ファイルの閾値を更新します（デフォルト: `false`） |
| `--coverage.thresholds.lines <number>` | 行の閾値（istanbul/v8 用、custom プロバイダー以外） |
| `--coverage.thresholds.functions <number>` | 関数の閾値 |
| `--coverage.thresholds.branches <number>` | 分岐の閾値 |
| `--coverage.thresholds.statements <number>` | 文の閾値 |
| `--coverage.ignoreClassMethods <name>` | 無視するクラスメソッド（istanbul のみ、デフォルト: `[]`） |
| `--coverage.processingConcurrency <number>` | 結果処理の並行数上限（デフォルト: 20 と CPU 数の小さい方） |
| `--coverage.customProviderModule <path>` | カスタムプロバイダーのモジュール名/パス |
| `--coverage.watermarks.statements <high>,<low>` | 文のウォーターマーク |
| `--coverage.watermarks.lines <high>,<low>` | 行のウォーターマーク |
| `--coverage.watermarks.branches <high>,<low>` | 分岐のウォーターマーク |
| `--coverage.watermarks.functions <high>,<low>` | 関数のウォーターマーク |
| `--coverage.changed <commit/branch>` | コミット/ブランチ以降に変更されたファイルだけ対象にします。デフォルトで `--changed` を継承します |
| `--coverage.excludeAfterRemap` | 元のソースへの再マップ後に除外を再適用します（デフォルト: `false`） |
| `--coverage.htmlDir <path>` | UI モードと HTML レポーターで配信する HTML カバレッジ出力のディレクトリー |

## 型チェック

| Option | 説明 |
|---|---|
| `--typecheck.enabled` | テストと並行して型チェックを有効にします（デフォルト: `false`） |
| `--typecheck.only` | 型チェックテストだけ実行します。自動的に型チェックが有効になります（デフォルト: `false`） |
| `--typecheck.checker <name>` | `"tsc"`、`"vue-tsc"`、または実行ファイルへのパス（デフォルト: `"tsc"`） |
| `--typecheck.allowJs` | JavaScript ファイルの型チェックを許可します。デフォルトは tsconfig の値です |
| `--typecheck.ignoreSourceErrors` | ソースファイル由来の型エラーを無視します |
| `--typecheck.tsconfig <path>` | カスタム tsconfig ファイルへのパス |
| `--typecheck.spawnTimeout <time>` | 型チェッカー起動にかかる最小時間（ms） |

## ブラウザモード

| Option | 説明 |
|---|---|
| `--browser.enabled` | ブラウザーでテストを実行します（デフォルト: `false`） |
| `--browser.name <name>` | 特定ブラウザーですべてのテストを実行します。利用可否はプロバイダーに依存します |
| `--browser.headless` | ブラウザーをヘッドレス実行します（デフォルト: `process.env.CI`） |
| `--browser.api.port [port]` | ブラウザーサーバーのポート。`true` で `63315` になります |
| `--browser.api.host [host]` | リッスンする IP アドレス。`0.0.0.0` または `true` ですべてになります |
| `--browser.api.strictPort` | ポート使用済みの場合に次を試さず終了します |
| `--browser.api.allowExec` | API によるコード実行を許可します（信頼できない環境では注意してください） |
| `--browser.api.allowWrite` | API によるファイル編集を許可します（信頼できない環境では注意してください） |
| `--browser.isolate` | 各ブラウザーテストファイルを分離して実行します（デフォルト: `true`） |
| `--browser.ui` | テスト実行時に Vitest UI を表示します（デフォルト: `!process.env.CI`） |
| `--browser.detailsPanelPosition <position>` | `right`（水平分割）または `bottom`（垂直分割）（デフォルト: `right`） |
| `--browser.fileParallelism` | ブラウザーテストファイルを並列実行します（デフォルト: `true`） |
| `--browser.connectTimeout <timeout>` | ブラウザー接続に時間がかかる場合にスイートを失敗させます（デフォルト: `60_000`） |
| `--browser.trackUnhandledErrors` | 報告用に未捕捉例外を捕捉します（デフォルト: `true`） |
| `--browser.trace <mode>` | トレースモード:`"on"`、`"off"`、`"on-first-retry"`、`"on-all-retries"`、`"retain-on-failure"` |
| `--browser.locators.exact` | ロケーターをデフォルトで完全一致にします（デフォルト: `false`） |
| `--dom` | happy-dom でブラウザー API をモックします |

## APIサーバー

| Option | 説明 |
|---|---|
| `--api.port [port]` | API サーバーのポート。`true` で `51204` になります |
| `--api.host [host]` | リッスンする IP アドレス。`0.0.0.0` または `true` ですべてになります |
| `--api.strictPort` | ポート使用済みの場合に終了します |
| `--api.allowExec` | API によるコード実行を許可します（信頼できない環境では注意してください） |
| `--api.allowWrite` | API によるファイル編集を許可します（信頼できない環境では注意してください） |

## Expect

| Option | 説明 |
|---|---|
| `--expect.requireAssertions` | すべてのテストに 1 つ以上のアサーションを必須にします |
| `--expect.poll.interval <interval>` | `expect.poll()` のポーリング間隔（ms）（デフォルト: `50`） |
| `--expect.poll.timeout <timeout>` | `expect.poll()` のポーリングタイムアウト（ms）（デフォルト: `1000`） |

## 実験的機能

| Option | 説明 |
|---|---|
| `--experimental.fsModuleCache` | 再実行間でモジュールをファイルシステムにキャッシュします |
| `--experimental.importDurations.print <boolean\|on-warn>` | インポート内訳を出力します:`true`、`false`、`on-warn`（デフォルト: `false`） |
| `--experimental.importDurations.limit <number>` | 収集/表示するインポートの最大数（デフォルト: `0`、出力または UI 有効時は `10`） |
| `--experimental.importDurations.failOnDanger` | 危険閾値を超えるインポートがある場合に実行を失敗させます（デフォルト: `false`） |
| `--experimental.importDurations.thresholds.warn <number>` | 警告の閾値（デフォルト: `100`） |
| `--experimental.importDurations.thresholds.danger <number>` | 危険の閾値（デフォルト: `500`） |
| `--experimental.viteModuleRunner` | ネイティブ `import` の代わりに Vite のモジュールランナーを使います（デフォルト: `true`） |
| `--experimental.nodeLoader` | `viteModuleRunner` 無効時にインソース/モックファイル用に Node.js Loader API を使います（デフォルト: `true`） |
| `--experimental.vcsProvider <path>` | 変更ファイル検出用のカスタムプロバイダー（デフォルト: `git`） |
| `--experimental.preParse` | 実行前にテスト仕様をパースします。すべてのファイルに `.only` とテスト名パターンを適用します（デフォルト: `false`） |

## デバッグ

| Option | 説明 |
|---|---|
| `--inspect [[host:]port]` | Node.js インスペクターを有効にします（デフォルト: `127.0.0.1:9229`） |
| `--inspectBrk [[host:]port]` | Node.js インスペクターを有効にし、テスト開始前に中断します |

## シェル補完

Vitest は `@bomb.sh/tab` によるコマンド・オプション・オプション値のシェル補完を用意しています。zsh で恒久設定するには `~/.zshrc` に以下を追加します（他のシェルも同様です）:

```bash
source <(vitest complete zsh)
```

パッケージマネージャー経由で Vitest を直接実行する場合も補完は動作します（`npm vitest <Tab>`、`npm exec vitest <Tab>`、`pnpm vitest <Tab>`、`yarn vitest <Tab>`、`bun vitest <Tab>`）。それらの連携用に tab のパッケージマネージャー補完は別途インストールしてください。

## CIシャーディングとレポートマージ

```bash
# マシン 1
vitest run --shard=1/3 --reporter=blob --outputFile=reports/blob-1.json

# マシン 2
vitest run --shard=2/3 --reporter=blob --outputFile=reports/blob-2.json

# すべての blob を最終レポートにマージする
vitest --merge-reports=reports --reporter=junit --reporter=default
```

<!-- Sources: docs/guide/cli.md, docs/guide/cli-generated.md -->
