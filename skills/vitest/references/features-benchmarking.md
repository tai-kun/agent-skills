---
name: features-benchmarking
description: bench フィクスチャ、Tinybench オプション、ベンチマーク設定で Vitest ベンチマークを記述・実行する方法を説明します。
---

# ベンチマーク（実験的機能）

`bench` 関数でベンチマークテストを実行し、パフォーマンスを比較できます。[Tinybench](https://github.com/tinylibs/tinybench) を使います。

> **Danger:** ベンチマークは実験的機能で、SemVer に従いません。

## ベンチマークの記述

ベンチマークは一連の操作を定義する関数です。Vitest はこれを複数回実行し、パフォーマンス結果を表示します。

```ts [sort.bench.ts]
import { bench, describe } from 'vitest'

describe('sort', () => {
  bench('normal', () => {
    const x = [1, 5, 4, 2, 3]
    x.sort((a, b) => {
      return a - b
    })
  })

  bench('reverse', () => {
    const x = [1, 5, 4, 2, 3]
    x.reverse().sort((a, b) => {
      return a - b
    })
  })
})
```

ベンチマークファイルは `benchmark.include` の glob で照合されます（デフォルトは `*.bench.ts` / `*.benchmark.ts` と、JS、CJS、MJS、JSX、TSX 版）。`vitest bench` でのみ実行され、パフォーマンス結果を比較できます。

## bench の API

- **型:** `(name: string | Function, fn: BenchFunction, options?: BenchOptions) => void`

Vitest は内部で Tinybench を使い、そのすべてのオプションを引き継ぎます。第 3 引数として渡せます:

```ts
import { bench } from 'vitest'

bench('normal sorting', () => {
  const x = [1, 5, 4, 2, 3]
  x.sort((a, b) => {
    return a - b
  })
}, { time: 1000 })
```

## ベンチオプション

```ts
export interface Options {
  /**
   * ベンチマークタスクの実行にかける時間（ミリ秒）
   * @default 500
   */
  time?: number

  /**
   * time オプションが終わってもタスクを実行する回数
   * @default 10
   */
  iterations?: number

  /**
   * 現在のタイムスタンプをミリ秒で取得する関数
   */
  now?: () => number

  /**
   * ベンチマークを中断するための AbortSignal
   */
  signal?: AbortSignal

  /**
   * タスク失敗時に投げます（true の場合イベントは動作しません）
   */
  throws?: boolean

  /**
   * ウォームアップ時間（ミリ秒）
   * @default 100ms
   */
  warmupTime?: number

  /**
   * ウォームアップの反復回数
   * @default 5
   */
  warmupIterations?: number

  /**
   * 各ベンチマークタスク（サイクル）の前に実行するセットアップ関数
   */
  setup?: Hook

  /**
   * 各ベンチマークタスク（サイクル）の後に実行する teardown 関数
   */
  teardown?: Hook
}
```

## ベンチマーク出力

ベンチマーク実行後、Vitest は結果テーブルを出力します:

```text
  name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
  normal sorting  6,526,368.12  0.0001  0.3638  0.0002  0.0002  0.0002  0.0002  0.0004  ±1.41%   652638
```

各タスク結果は以下のフィールドを持ちます:

| Field | Description |
| --- | --- |
| `error` | タスク実行中にスローされた最後のエラー |
| `totalTime` | ベンチマークタスク（サイクル）の実行時間（ミリ秒） |
| `min` / `max` | サンプル中の最小値 / 最大値 |
| `hz` | 1秒あたりの操作回数 |
| `period` | 1操作あたりの所要時間（ms） |
| `samples` | 各タスク反復時間のサンプル（ms） |
| `mean` | サンプルの平均（母平均の推定値） |
| `variance` | サンプルの分散（母分散の推定値） |
| `sd` | サンプルの標準偏差（母標準偏差の推定値） |
| `sem` | 平均の標準誤差 |
| `df` | 自由度 |
| `critical` | サンプルの臨界値 |
| `moe` | 誤差範囲 |
| `rme` | 相対誤差範囲 |
| `mad` | 中央絶対偏差 |
| `p50` | p50/中央値パーセンタイル |
| `p75` / `p99` / `p995` / `p999` | パーセンタイル |

## ベンチマーク修飾子

### bench.skip

特定のベンチマークの実行をスキップします:

```ts
import { bench } from 'vitest'

bench.skip('normal sorting', () => {
  const x = [1, 5, 4, 2, 3]
  x.sort((a, b) => {
    return a - b
  })
})
```

### bench.only

特定のベンチマークだけを実行します。デバッグ時に便利です。

```ts
import { bench } from 'vitest'

bench.only('normal sorting', () => {
  const x = [1, 5, 4, 2, 3]
  x.sort((a, b) => {
    return a - b
  })
})
```

### bench.todo

後で実装するベンチマークのスタブを定義します:

```ts
import { bench } from 'vitest'

bench.todo('unimplemented test')
```

## ベンチマーク設定

`vitest bench` 実行時に使うオプションです:

- **型:** `{ include?, exclude?, ... }`

### benchmark.include

- **型:** `string[]`
- **既定値:** `['**/*.{bench,benchmark}.?(c|m)[jt]s?(x)']`

ベンチマークテストファイル用の include glob です。

### benchmark.exclude

- **型:** `string[]`
- **既定値:** `['node_modules', 'dist', '.idea', '.git', '.cache']`

ベンチマークテストファイル用の exclude glob です。

### benchmark.includeSource

- **型:** `string[]`
- **既定値:** `[]`

インソースベンチマークテストファイル用の glob です。`includeSource` と同じ形式で指定します。定義すると、`import.meta.vitest` を含む一致ファイルがすべて実行されます。

### benchmark.reporters

- **型:** `Arrayable<BenchmarkBuiltinReporters | Reporter>`
- **既定値:** `'default'`

出力用のカスタムレポーターです。組み込みレポート名、レポーターインスタンス、カスタムレポーターへのパスを 1 つ以上含められます。

### benchmark.outputJson

- **型:** `string | undefined`
- **既定値:** `undefined`

ベンチマーク結果を保存するファイルパスです。後の `--compare` オプションで使えます。

### benchmark.compare

- **型:** `string | undefined`
- **既定値:** `undefined`

比較対象の過去ベンチマーク結果へのファイルパスです。

`benchmark.outputFile` は非推奨です。`benchmark.outputJson` を使ってください。

## 結果の保存と比較

```sh
# main ブランチの結果を保存します
git checkout main
vitest bench --outputJson main.json

# ブランチを切り替えて main と比較します
git checkout feature
vitest bench --compare main.json
```

<!-- Sources: docs/api/test.md, docs/guide/features.md, docs/config/benchmark.md -->
