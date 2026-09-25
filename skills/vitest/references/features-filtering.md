---
name: features-filtering
description: ファイル名、テスト名、行番号、タグ、変更ファイル、関連ファイル、プロジェクトで Vitest の実行対象を絞り込む方法を説明します。
---

# テストフィルタリング

テストスイートが大きくなると、毎回すべてのテストを実行するのは時間がかかります。Vitest では、コマンドライン、テストファイル内（`.only`、`.skip`、`.todo`）、タグを使って実行対象を絞り込めます。手法ごとに適した用途があります。

> **Performance:** `-t`、`--tags-filter`、`.only`、`.skip` などのフィルターは *テストファイルごと* に適用されます。一致テストを探すために一致ファイルはすべて実行する必要があります。大規模プロジェクトでは少数のテスト実行でもこのオーバーヘッドが蓄積します。フィルターと併せて必ずファイルパスを渡し、読み込むファイルを限定します:
>
> ```bash
> vitest utils.test.ts -t "handles empty input"
> ```
>
> あるいは `--experimental.preParse` を使い、テストファイルを完全実行せずに解析してテスト名を検出します:
>
> ```bash
> vitest --experimental.preParse -t "handles empty input"
> ```

## ファイル名による絞り込み

CLI 引数にファイル名パターンを渡します。パスに指定文字列を含むテストファイルだけ実行します:

```bash
vitest basic
```

これはパスに `basic` を含む任意のテストファイルに一致します:

```text
basic.test.ts
basic-foo.test.ts
basic/foo.test.ts
```

このフィルターは包含判定だけ行い、正規表現や glob パターンはサポートしません（端末が事前に引数を展開する場合を除きます）。対象ファイルを把握済みで他を除外したい場合に役立ちます。

## テスト名による絞り込み

`-t` / `--testNamePattern <pattern>` はファイル名ではなくテスト名で絞り込みます。正規表現パターンを受け取り、`describe` ブロック名を含む完全なテスト名に照合します:

```bash
vitest -t "handles empty input"
```

ファイルフィルターと組み合わせてさらに絞り込めます:

```bash
vitest utils -t "handles empty input"
```

これは `utils` に一致するファイル内で、名前が `"handles empty input"` に一致するテストだけ実行します。

## 行番号による絞り込み

特定行を含むテストを直接指定します:

```bash
vitest basic/foo.test.ts:10
```

完全なファイル名が必須で、カレントディレクトリーからの相対パスまたは絶対パスで指定します。部分名や拡張子なしは動作しません:

```bash
vitest basic/foo.test.ts:10                  # 動きます
vitest ./basic/foo.test.ts:10                # 動きます
vitest /users/project/basic/foo.test.ts:10   # 動きます
vitest foo:10                                # 部分名では動きません
vitest ./basic/foo:10                        # ファイル拡張子がありません
```

複数の特定テストは空白区切りで実行します。範囲指定はサポートしません:

```bash
vitest basic/foo.test.ts:10 basic/foo.test.ts:25
vitest basic/foo.test.ts:10-25   # 範囲指定には対応していません
```

## タグによる絞り込み

タグはテストにラベルを付け、CLI からカテゴリー単位で実行できるようにします。設定でタグを定義し、テストに適用してからラベルで絞り込みます:

```ts
test('renders a form', { tags: ['frontend'] }, () => {
  // ...
})

test('calls an external API', { tags: ['backend'] }, () => {
  // ...
})
```

```bash
vitest --tags-filter=frontend
vitest --tags-filter="frontend and backend"
```

CI パイプラインでフロントエンドとバックエンドのテストを別ジョブで実行したり、短期チェックで遅い統合テストを除外したりする場合に特に役立ちます。タグ定義、オプション統合、完全な式構文は [features-test-tags](features-test-tags.md) を参照してください。

## 変更ファイルによる絞り込み

`--changed [value]` は変更ファイルに対するテストだけ実行します:

- 値を省略すると、未コミットの変更（ステージ済みと未ステージを含む）に対するテストを実行します。
- リビジョンを渡して比較します: `--changed HEAD~1`、コミットハッシュ（`--changed 09a9920`）、ブランチ名（`--changed origin/develop`）。

```bash
vitest --changed
vitest --changed HEAD~1
vitest --changed origin/main
```

コードカバレッジと併用すると、レポートには変更関連ファイルだけ含まれます。`forceRerunTriggers` 設定オプションと組み合わせると、そのリスト内の 1 ファイルでも変更があれば全スイートを実行します。デフォルトでは、Vitest 設定ファイルと `package.json` の変更は常に全スイートを再実行します。

## 関連ファイルによる絞り込み

`vitest related` はソースファイルのリストをカバーするテストだけ実行します。静的インポート（`import('./index.js')` や `import index from './index.js'`）には対応しますが、動的インポート（`import(filepath)`）には対応しません。すべてのファイルはルートフォルダーからの相対パスで指定します:

```bash
vitest related /src/index.ts /src/hello-world.js
```

`lint-staged` との併用や CI 構成で役立ちます。Vitest はデフォルトで watch モード実行のため、`lint-staged` などのツール使用時はコマンドが正常終了するよう `--run` を渡します:

```js [.lintstagedrc.js]
export default {
  '*.{js,ts}': 'vitest related --run',
}
```

## 実行せずにテストを一覧する

`vitest list` はすべての `vitest` オプションを引き継ぎ、一致テストの一覧を出力します。このコマンドは `reporters` オプションを無視します。デフォルトではファイルフィルターと名前パターンに一致した全テスト名を出力します:

```bash
vitest list filename.spec.ts -t="some-test"
```

```text
describe > some-test
describe > some-test > test 1
describe > some-test > test 2
```

関連フラグ:

- `--json[=path]`: テストを JSON 形式で標準出力に出力します。`--json=./file.json` で別ファイルに保存します。
- `--filesOnly`: テストファイルパスだけ出力します:
  ```bash
  vitest list --filesOnly
  ```
  ```text
  tests/test1.test.ts
  tests/test2.test.ts
  ```
- `--static-parse` (v4.1.0): 実行せずにテスト仕様を解析してテストを収集します。Vitest はファイルを制限付き並行性で解析し、デフォルトは `os.availableParallelism()` で、`--static-parse-concurrency` で変更できます。

## フォーカス、スキップ、Todo

### `.only`

テストやスイートに `.only` を付けると、ファイル内の他すべてを除外します。CLI 引数を毎回変えずに失敗テストをデバッグしたい場合に役立ちます:

```ts
import { describe, expect, it } from 'vitest'

describe.only('suite', () => {
  it('test', () => {
    // スイートに .only が付いているため実行されます
    expect(Math.sqrt(4)).toBe(2)
  })
})

describe('another suite', () => {
  it('skipped test', () => {
    // 実行されません
    expect(Math.sqrt(4)).toBe(2)
  })

  it.only('focused test', () => {
    // .only が付いているためこちらも実行されます
    expect(Math.sqrt(4)).toBe(2)
  })
})
```

`.only` は `describe` ブロックと個別テストのどちらにも使えます。ファイル内のいずれかのテストやスイートに `.only` が付くと、マークのないテストはすべて除外されます。

> **Warning:** コミット前に `.only` を削除してください。デフォルトでは、CI（`process.env.CI` 設定時）で `.only` を検出すると実行全体が失敗します。`allowOnly` オプションで制御します。さらに早期検出するには、`no-focused-tests` ESLint ルール（oxlint にもあります）でコミット前にエディター上で検出できます。

### `.skip`

`.only` の逆です。テストやスイートを削除せずに一時無効化します。スキップしたテストは忘れないようレポートに表示されます:

```ts
import { describe, expect, it } from 'vitest'

describe.skip('skipped suite', () => {
  it('test', () => {
    // スイート全体がスキップされます
    expect(Math.sqrt(4)).toBe(2)
  })
})

describe('suite', () => {
  it.skip('skipped test', () => {
    // このテストだけスキップされます
    expect(Math.sqrt(4)).toBe(2)
  })
})
```

不安定なテストや一時停止中の外部サービスに依存するテストで役立ちます。リマインダーとしてテストを残しつつ、他スイートのブロックを解除できます。

### `.todo`

未記述だが予定されたテストとしてマークします。リマインダーとしてレポートに表示されます:

```ts
import { describe, it } from 'vitest'

describe.todo('unimplemented suite')

describe('suite', () => {
  it.todo('unimplemented test')
})
```

`.skip` と異なり、`.todo` テストはテスト本体を持ちません。純粋に将来作業用のプレースホルダーです。

## プロジェクトによる絞り込み

ワークスペース設定から特定プロジェクトを実行します。オプションは繰り返し指定でき、ワイルドカードと `!` による除外に対応します:

```bash
vitest --project unit
vitest --project integration --project e2e
vitest --project "packages*"
vitest --project "!packages/legacy"
```

## フィルター CLI オプション

| Option | Description |
| --- | --- |
| `-t, --testNamePattern <pattern>` | 完全名が指定正規表現パターンに一致するテストを実行する |
| `--dir <path>` | テストファイルを走査する基準ディレクトリ |
| `--exclude <glob>` | テストから除外する追加ファイル glob |
| `--changed [revision]` | 変更ファイルに対するテストのみ実行する |
| `--project <name>` | 実行するプロジェクト。繰り返し可、ワイルドカードと `!pattern` 除外に対応する |
| `--tags-filter <expression>` | 指定タグを持つテストのみ実行する |
| `--strict-tags` | 設定未定義のタグを使用したテストがあると失敗する |
| `--list-tags [type]` | テスト実行せずに利用可能な全タグを一覧する。JSON は `--list-tags=json` |
| `--experimental.preParse` | 実行前にテスト仕様を解析する。全ファイル実行なしで `.only` とテスト名パターンを適用する（デフォルト: `false`） |
| `--experimental.vcsProvider <path>` | 変更ファイル検出用のカスタムプロバイダー（デフォルト: `git`） |

Vitest はキャメルケースとケバブケースの両 CLI 引数を受け付けます（`--passWithNoTests` と `--pass-with-no-tests` はどちらも動作します。`--no-color` と `--inspect-brk` は例外です）。値は `--reporter dot` または `--reporter=dot` と記述できます。配列を受け取るオプションは複数回渡す必要があります。

## フィルターの組み合わせ

フィルターは組み合わせられます。ファイルパターン、テスト名、変更ファイルチェックを組み合わせられます:

```bash
vitest user -t "login" --changed
vitest related src/auth.ts --run
```

<!-- Sources: docs/guide/filtering.md, docs/guide/cli.md, docs/guide/cli-generated.md -->
