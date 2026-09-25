---
name: features-test-tags
description: テストにタグ付けして実行を絞り込み、タイムアウト、リトライ、スキップなどの共有オプションを適用する方法を説明します。
---

# テストタグ（v4.1.0）

タグはテストにラベルを付け、実行対象の絞り込みや必要時のオプション上書きを可能にします。異なるプールや環境ではなく、異なるタイムアウトやリトライが必要なカテゴリーにはプロジェクトよりタグを使います。

## タグの定義

タグは設定ファイルで定義する必要があります。Vitest に組み込みタグはありません。設定未定義のタグをテストが使うとテストランナーはエラーをスローします。これによりタグ名の typo による予期せぬ動作を防ぎます。このチェックは `strictTags` オプションで無効化できます。

タグ定義は `name` が必須で、`timeout` や `retry` など、そのタグ付きの全テストに適用される追加オプションを定義できます:

```ts [vitest.config.js]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    tags: [
      {
        name: 'frontend',
        description: 'Tests written for frontend.',
      },
      {
        name: 'backend',
        description: 'Tests written for backend.',
      },
      {
        name: 'db',
        description: 'Tests for database queries.',
        timeout: 60_000,
      },
      {
        name: 'flaky',
        description: 'Flaky CI tests.',
        retry: process.env.CI ? 3 : 0,
        timeout: 30_000,
        priority: 1,
      },
    ],
  },
})
```

`projects` を使う場合、すべてのグローバルタグ定義を自動継承します。

## タグ定義オプション

`tags` 設定オプションの型は `TestTagDefinition[]` で、デフォルトは `[]` です。

### name

- **型:** `string`
- **必須:** `true`

タグ名です。テストの `tags` オプションで使う名前です。

### description

- **型:** `string`

タグの人間可読な説明です。UI およびタグ未検出時のエラーメッセージに表示されます。

```ts
export default defineConfig({
  test: {
    tags: [
      {
        name: 'slow',
        description: 'Tests that take a long time to run.',
      },
    ],
  },
})
```

### priority

- **型:** `number`
- **既定値:** `Infinity`

同一オプションを持つ複数タグをテストに適用した際の統合優先度です。数値が小さいほど優先度が高い（`1` は `3` より優先されます）。優先度 `1` のタグで `timeout: 30_000`、優先度 `2` のタグで `timeout: 60_000` を設定したテストでは結果は `30_000` になります。優先度未定義のタグは先に統合され、高優先度のものに上書きされます。

### タグが適用するオプション

タグはそのタグ付きの全テストに適用されるテストオプションを定義できます。これらのオプションはテスト自体のオプションと統合され、テスト側のオプションが優先されます。

> **Warning:** 設定値はシリアライズが必要なため、`retry.condition` は正規表現だけ指定できます。これらのオプション経由で他タグを適用することもできません。

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    tags: [
      { name: 'unit', description: 'Unit tests.' },
      { name: 'e2e', description: 'End-to-end tests.', timeout: 60_000 },
      {
        name: 'flaky',
        description: 'Flaky tests that need retries.',
        retry: process.env.CI ? 3 : 0,
        priority: 1,
      },
      { name: 'slow', description: 'Slow tests.', timeout: 120_000 },
      { name: 'skip-ci', description: 'Tests to skip in CI.', skip: !!process.env.CI },
    ],
  },
})
```

## 型安全なタグ

TypeScript 使用時は `TestTags` インターフェースに文字列ユニオンで拡張し、利用可能なタグを強制します。ファイルが `tsconfig` に含まれるようにします:

```ts [vitest.shims.ts]
import 'vitest'

declare module 'vitest' {
  interface TestTags {
    tags:
      | 'frontend'
      | 'backend'
      | 'db'
      | 'flaky'
  }
}
```

## タグの適用

`tags` オプションで個別テストやスイート全体にタグを適用します:

```ts
import { describe, test } from 'vitest'

test('renders homepage', { tags: ['frontend'] }, () => {
  // ...
})

describe('API endpoints', { tags: ['backend'] }, () => {
  test('returns user data', () => {
    // このテストは親スイートから "backend" タグを継承します
  })

  test('validates input', { tags: ['validation'] }, () => {
    // このテストは "backend"（継承）と "validation" の両タグを持ちます
  })
})
```

タグは親スイートから継承されるため、タグ付き `describe` ブロック内の全テストは自動的にそのタグを持ちます。

`tags` テストオプション:

- **型:** `string[]`
- **既定値:** `[]`

```ts
import { it } from 'vitest'

it('user returns data from db', { tags: ['db', 'flaky'] }, () => {
  // ...
})
```

> **Warning:** `strictTags` を手動無効化しない限り、設定にないタグはテスト開始前に失敗します。

## `@module-tag` によるファイル全体のタグ

ファイル先頭の JSDoc `@module-tag` でファイル内の全テストにタグを定義できます:

```ts
/**
 * 認証テスト
 * @module-tag admin/pages/dashboard
 * @module-tag acceptance
 */

test('dashboard renders items', () => {
  // ...
})
```

> **Danger:** JSDoc コメント内の `@module-tag` は直後のテストだけでなく、ファイル内の全テストに適用されます。下例ではファイル内の全テストが `frontend` と `db` の両タグを持ちます:
>
> ```js
> describe('forms', () => {
>   /**
>    * @module-tag frontend
>    */
>   test('renders a form', () => {
>     // ...
>   })
>
>   /**
>    * @module-tag db
>    */
>   test('db returns users', () => {
>     // ...
>   })
> })
> ```
>
> 個別テストにタグ付けするには、代わりにオプション引数を使います:
>
> ```js
> describe('forms', () => {
>   test('renders a form', { tags: 'frontend' }, () => {
>     // ...
>   })
>
>   test('db returns users', { tags: 'db' }, () => {
>     // ...
>   })
> })
> ```

## オプションの競合解決

同一テストに同名オプションを持つ複数タグを使った場合、指定順、または優先度順（数値が小さいほど高優先度）で解決されます。優先度未定義のタグは先に統合され、高優先度のものに上書きされます:

```ts
test('flaky database test', { tags: ['flaky', 'db'] })
// { timeout: 30_000, retry: 3 }
```

`timeout` が 60 秒ではなく 30 秒になるのは、`flaky` の優先度が `1` で、60 秒タイムアウトを定義する `db` に優先度がないためです。

テスト自体がオプションを定義した場合は最優先になります:

```ts
test('flaky database test', { tags: ['flaky', 'db'], timeout: 120_000 })
// { timeout: 120_000, retry: 3 }
```

## タグによるテスト絞り込み

特定タグのテストだけ実行するには `--tags-filter` CLI オプションを使います:

```shell
vitest --tags-filter=frontend
vitest --tags-filter="frontend and backend"
```

Vitest UI 使用時は `tag:` 接頭辞でフィルターを開始し、同じタグ式構文でタグ絞り込みします。

プログラム API 使用時は `startVitest` や `createVitest` に `tagsFilter` オプションを渡せます:

```ts
import { startVitest } from 'vitest/node'

await startVitest('test', [], {
  tagsFilter: ['frontend and backend'],
})
```

またはカスタムフィルターでテスト仕様を作ります:

```ts
const specification = vitest.getRootProject().createSpecification(
  '/path-to-file.js',
  {
    testTagsFilter: ['frontend and backend'],
  },
)
```

### 構文

Vitest は以下のキーワードに対応します:

- `and` または `&&` で両方の式を含む
- `or` または `||` で少なくとも一方を含む
- `not` または `!` で式を除外する
- `*` で任意文字数（0文字以上）に一致する
- `()` で式をグループ化し優先順位を上書きする

パーサーは標準的な演算子優先順位に従います。`not` / `!` が最優先、次に `and` / `&&`、次に `or` / `||` です。丸括弧でデフォルト優先順位を上書きします。

> **Warning:** タグ名に `and`、`or`、`not` は使えません（大文字小文字を区別せず予約語です）。タグ名は特殊文字（`(`、`)`、`&`、`|`、`!`、`*`、空白）も含められません。これらは式パーサーで使うためです。

### ワイルドカード

ワイルドカード（`*`）で任意文字数に一致させます:

```shell
vitest --tags-filter="unit/*"
```

これは `unit/components`、`unit/utils` などのタグに一致する。

### タグの除外

先頭の感嘆符（`!`）または `not` キーワードで除外します:

```shell
vitest --tags-filter="!slow and not flaky"
```

### 例

```shell
# unit テストだけ実行します
vitest --tags-filter="unit"

# frontend かつ fast のテストを実行します
vitest --tags-filter="frontend and fast"

# unit または e2e のテストを実行します
vitest --tags-filter="unit or e2e"

# slow 以外の全テストを実行します
vitest --tags-filter="!slow"

# flaky でない frontend テストを実行します
vitest --tags-filter="frontend && !flaky"

# ワイルドカードに一致するテストを実行します
vitest --tags-filter="api/*"

# かっこを使った複雑な式です
vitest --tags-filter="(unit || e2e) && !slow"

# postgres または mysql のデータベーステストのうち slow でないものです
vitest --tags-filter="db && (postgres || mysql) && !slow"
```

複数の `--tags-filter` フラグも渡せます。AND 条件で組み合わせられます:

```shell
# （unit OR e2e）に一致し slow でないテストを実行します
vitest --tags-filter="unit || e2e" --tags-filter="!slow"
```

## 実行時のタグフィルター確認

`TestRunner.matchesTags`（Vitest 4.1.1 以降）で現在のタグフィルターがタグ集合に一致するか確認します。関連テストが含まれる場合だけ高コストなセットアップ処理を実行したい場合に役立ちます:

```ts
import { beforeAll, TestRunner } from 'vitest'

beforeAll(async () => {
  // "vitest --tags-filter db" のときにデータベースを初期投入します
  if (TestRunner.matchesTags(['db'])) {
    await seedDatabase()
  }
})
```

このメソッドはタグ配列を受け取り、現在の `--tags-filter` がそのタグのテストを含む場合に `true` を返します。タグフィルターが有効でない場合は常に `true` を返します。

## タグの一覧

`--list-tags` でテスト実行せずに Vitest ワークスペース内の全タグを出力します:

```shell
vitest --list-tags
```

```txt
frontend: Tests written for frontend.
backend: Tests written for backend.
db: Tests for database queries.
flaky: Flaky CI tests.
```

JSON 出力には `--list-tags=json` を渡します。出力オブジェクトは `tags` 配列（各項目は `name`、`description`、設定済みオプションを持つ）と `projects` 配列を含みます。

## 要点

- タグは設定で宣言します。CLI フィルターは `--tags-filter` です（`--tags` ではありません）。
- タグは親スイートと `@module-tag` JSDoc コメントから継承され、ファイル全体に適用されます。
- オプション解決: タグの `priority`（小さいほど優先）が先、次に宣言順、最後にテスト自体のオプションです。
- `strictTags`（デフォルト有効）は未知タグを検出します。`--list-tags` で宣言済みタグを表示します。
- 共有 timeout / retry を持つ横断的カテゴリーにはタグを使います。異なるプールや環境にはプロジェクトを使います。
- タグフィルター有効時は `TestRunner.matchesTags` で高コストな `beforeAll` やシード処理を制御します。

<!-- Sources: docs/guide/test-tags.md, docs/config/tags.md, docs/api/test.md -->
