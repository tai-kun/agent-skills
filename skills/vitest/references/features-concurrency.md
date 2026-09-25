---
name: features-concurrency
description: 並行テスト、ファイル並列実行、分離とプール調整、複数マシンへのシャーディングを説明します。
---

# 並行性、並列実行、シャーディング

Vitest には 2 段階の並列実行があります。複数の *テストファイル* を同時に実行できるほか、各ファイル内の複数の *テスト* も同時に実行できます。両者は仕組みとトレードオフが異なるため、違いを理解して使い分ける必要があります。

## ファイル並列実行

デフォルトでは、Vitest は複数のワーカーでテストファイルを並列実行します。各ファイルは独立した隔離環境を取得するため、異なるファイルのテスト同士は干渉しません。

仕組みは設定した `pool` に依存します:

- `forks`（デフォルト）と `vmForks` は各ファイルを別々の[子プロセス](https://nodejs.org/api/child_process.html)で実行します
- `threads` と `vmThreads` は各ファイルを別々の[ワーカースレッド](https://nodejs.org/api/worker_threads.html)で実行します

`maxWorkers` で同時実行するワーカー数を制御します。ワーカーを増やすと並列実行するファイルは増えますが、メモリと CPU 使用量も増えます。適切な数はマシンとテストの負荷に依存します。

多くのプロジェクトでは、ファイル並列実行がスイート高速化の最大要因となります。同時アクセスに耐えられない外部リソースをテスト間で共有する場合は無効化してください:

```ts
export default defineConfig({
  test: {
    fileParallelism: false,
  },
})
```

## テスト並列実行

単一ファイル内では、デフォルトでテストは定義順に逐次実行されます。ファイル内のテストは `beforeEach` などのライフサイクルフックを通じてセットアップや状態を共有することが多いため、これが最も安全なデフォルトです。

ファイル内のテストが独立している場合、`concurrent` 修飾子で並行実行を選べます:

```ts
import { expect, test } from 'vitest'

test.concurrent('fetches user profile', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('Alice')
})

test.concurrent('fetches user posts', async () => {
  const posts = await fetchPosts(1)
  expect(posts).toHaveLength(3)
})
```

並行テストはグループ化され、[`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) で実行されます。同時実行数は `maxConcurrency` で制限されます。

> **Tip:** `concurrent` が効果を発揮するのは、テストが *待機* している時間（ネットワーク、タイマー、ファイル I/O）がある場合だけです。Vitest は並行テスト用のワーカーを追加せず、ファイルと同じワーカーで実行するため、完全に同期的なテストでは単一の JavaScript スレッドを占有し続け、効果がありません。

スイート全体に `concurrent` を適用します:

```ts
import { describe, expect, test } from 'vitest'

describe.concurrent('user API', () => {
  test('fetches profile', async () => {
    const user = await fetchUser(1)
    expect(user.name).toBe('Alice')
  })

  test('fetches posts', async () => {
    const posts = await fetchPosts(1)
    expect(posts).toHaveLength(3)
  })
})
```

設定で `sequence.concurrent: true` を指定すると、すべてのテストをデフォルトで並行実行できます。

`.skip`、`.only`、`.todo` は並行スイートやテストと組み合わせられます。

> **Warning:** 並行テストを実行する場合は、スナップショットとアサーションはローカルのテストコンテキストの `expect`（`async ({ expect }) => ...`）を使い、正しいテストを検出できるようにしてください。

## 並行テストでのフック

`beforeAll` と `afterAll` はグループごとに 1 回だけ実行されますが、`beforeEach` と `afterEach` は各テストで実行され、テスト自体が重なるため同時実行される可能性があります。フックの実行順は `sequence.hooks` で制御します。`sequence.hooks: 'parallel'` の場合、フックも `maxConcurrency` の上限を受けます。

## パフォーマンス改善

### テスト分離

デフォルトでは、Vitest はプールに基づく隔離環境で各テストファイルを実行します:

- `threads` プール: 別々の `Worker`
- `forks` プール: 別々にフォークした子プロセス
- `vmThreads` プール: 並列実行にワーカーを使う別々の VM コンテキスト

分離はテスト時間を大幅に増加させます。副作用に依存せず、状態を適切にクリーンアップするプロジェクト（通常は `node` 環境）では、分離を無効化すると高速化します。`--no-isolate` または `isolate: false` を使います:

```sh
vitest --no-isolate
```

```ts
export default defineConfig({
  test: {
    isolate: false,
  },
})
```

projects を使って特定のファイルだけ分離を無効化できます:

```ts
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'Isolated',
          isolate: true, // (default value)
          exclude: ['**.non-isolated.test.ts'],
        },
      },
      {
        test: {
          name: 'Non-isolated',
          isolate: false,
          include: ['**.non-isolated.test.ts'],
        },
      },
    ],
  },
})
```

> **Tip:** `vmThreads` プールは分離を無効化できません。性能向上には代わりに `threads` プールを使ってください。

起動時間を改善するため、`--no-file-parallelism` または `fileParallelism: false` で並列実行を無効化することもできます。

### ディレクトリ検索の制限

`test.dir` で Vitest がファイルを検索する作業ディレクトリーを制限します。ルートに無関係なフォルダーやファイルが多い場合に検索が高速化します。

### 再実行間のキャッシュ

watch モードでは、Vitest は変換済みファイルをすべてメモリーにキャッシュするため再実行は高速ですが、実行終了時にキャッシュは破棄されます。`experimental.fsModuleCache` を有効化すると、このキャッシュをファイルシステムに永続化して次回以降の実行で再利用します。大きなモジュールグラフに依存する少数のテストを再実行する場合に最も効果があります。フルスイートでは並列化によりコストはすでに緩和されます。900 超のモジュールグラフを持つ単一テストファイルの例:

```shell
# 1 回目の実行
Duration  8.75s (transform 4.02s, setup 629ms, import 5.52s, tests 2.52s, environment 0ms, prepare 3ms)

# 2 回目の実行
Duration  5.90s (transform 842ms, setup 543ms, import 2.35s, tests 2.94s, environment 0ms, prepare 3ms)
```

### プール

デフォルトで Vitest は `pool: 'forks'` を使います。`forks` プールは互換性が高い（ネイティブコードによるプロセスハングやセグフォを回避します）が、大規模プロジェクトでは `pool: 'threads'` よりやや遅い場合があります:

```sh
vitest --pool=threads
```

```ts
export default defineConfig({
  test: {
    pool: 'threads',
  },
})
```

## シャーディング

テストシャーディングはスイートをグループ（シャード）に分割し、複数マシンでサブセットを同時実行できるようにします。`--shard` と `--reporter=blob` で実行を分割します:

```sh
vitest run --reporter=blob --shard=1/3 # 1st machine
vitest run --reporter=blob --shard=2/3 # 2nd machine
vitest run --reporter=blob --shard=3/3 # 3rd machine
```

> **Note:** Vitest は *テストファイル* 単位で分割し、テストケース単位では分割しません。テストファイルが 1000 ある場合、`--shard=1/4` は各ファイルのケース数にかかわらず 250 ファイルを実行します。

結果は各マシンの `.vitest-reports` ディレクトリーに保存され、`--merge-reports` で統合します:

```sh
vitest run --merge-reports
```

カバレッジも統合できます:

```bash
vitest --shard=1/2 --reporter=blob --coverage
vitest --shard=2/2 --reporter=blob --coverage
vitest --merge-reports --reporter=junit --coverage
```

### CI の例（GitHub Actions）

マトリクスジョブで各シャードを実行し、blob レポートをアーティファクトとしてアップロードし、依存ジョブでダウンロードして統合します:

```yaml
jobs:
  tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm i
      - name: Run tests
        run: pnpm run test --reporter=blob --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - name: Upload blob report to GitHub Actions Artifacts
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: .vitest-reports/*
          include-hidden-files: true
          retention-days: 1

  merge-reports:
    if: ${{ !cancelled() }}
    needs: [tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm i
      - uses: actions/download-artifact@v4
        with:
          path: .vitest-reports
          pattern: blob-report-*
          merge-multiple: true
      - name: Merge reports
        run: npx vitest --merge-reports
```

テストがファイルベースの添付ファイルを作る場合（例: `context.annotate` やカスタム成果物経由）、merge ジョブで `attachmentsDir`（`.vitest-attachments`）もアップロード・復元します。

### CPU コア数が多いマシンでのシャーディング

Vitest はメインスレッドで単一の Vite サーバーだけ実行し、残りのスレッドでテストファイルを実行します。CPU コア数が多いマシンではメインスレッドがボトルネックになります（32 CPU マシンでは、1 つの Vite サーバーが 31 のテストスレッドからの負荷を処理します）。シャーディングは複数の Vite サーバーに負荷を分散します。各プロセスは 1 つのメインスレッドを必要とするため、32 CPU で 4 シャードの場合、シャードあたり 7 つのテストランナースレッドになります:

```sh
# 32 CPU でテストを 4 シャードに分ける例です
# 各プロセスがメインスレッドを 1 つ使うため、テストランナー用は 7 スレッドです（1+7）*4 = 32
# VITEST_MAX_WORKERS を使います:
VITEST_MAX_WORKERS=7 vitest run --reporter=blob --shard=1/4 & \
VITEST_MAX_WORKERS=7 vitest run --reporter=blob --shard=2/4 & \
VITEST_MAX_WORKERS=7 vitest run --reporter=blob --shard=3/4 & \
VITEST_MAX_WORKERS=7 vitest run --reporter=blob --shard=4/4 & \
wait
vitest run --merge-reports
```

## 要点

- ファイルはデフォルトで並列実行されます（`pool: 'forks'`）。`maxWorkers` で制御し、`fileParallelism: false` / `--no-file-parallelism` で無効化します。
- ファイル内では、`concurrent`（テストまたはスイート）や `sequence.concurrent: true` がない限りテストは逐次実行されます。並行化はテストが何かを待つ場合にだけ効果があります。
- 並行スナップショット / アサーションテストはローカルコンテキストの `expect` を使います。
- `--no-isolate`（`vmThreads` を除く）と `experimental.fsModuleCache` が主な高速化手段で、プール選択も影響します。
- シャーディングは `--shard` と `--reporter=blob` を使い、`--merge-reports` で統合します。ファイル単位で分割し、カバレッジ統合に対応し、メニーコアマシンで Vite サーバーの負荷を分散できます。

<!-- Sources: docs/guide/parallelism.md, docs/guide/improving-performance.md, docs/guide/features.md (Running Tests Concurrently, Sharding) -->
