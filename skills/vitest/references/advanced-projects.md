---
name: test-projects
description: モノレポや異なるテスト種別向けに、プロジェクトごとの設定を持つマルチプロジェクトワークスペースを説明します。
---

# テストプロジェクト

Vitest は単一の Vitest プロセス内に複数のプロジェクト設定を定義できます。モノレポや、`resolve.alias`、`plugins`、`test.browser` など設定の異なるテストの実行に役立ちます。

> **Warning:** この機能は `workspace` としても知られています。`workspace` オプションは 3.2 以降非推奨となり、`projects` 設定に置き換えられました。機能的には同じです。

## プロジェクトの定義

ルート設定でプロジェクトを定義します：

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
})
```

プロジェクト設定にはインライン設定、ファイル、glob パターンを指定できます。glob に一致するすべてのフォルダは、内部に設定ファイルがなくても個別のプロジェクトとして扱われます。上記の例では `packages` 内のすべてのフォルダがプロジェクトになります。

プロジェクトエントリーがファイルに解決される場合（glob または直接パス）、Vitest は名前が次のいずれかに当てはまることを検証します：

- `vitest.config` または `vite.config` で始まる（例：`vitest.config.unit.ts`）
- `vitest.<name>.config.*` / `vite.<name>.config.*`に一致する。`<name>`には文字、数字、`_`、`-`を含められる

有効な設定ファイル：

- `vitest.config.ts`
- `vite.config.js`
- `vitest.unit.config.ts`
- `vitest.e2e-node.config.ts`
- `vite.e2e.config.js`
- `vitest.config.unit.js`
- `vite.config.e2e.js`

### 一致の除外

否定パターンでフォルダやファイルを除外します：

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // "packages" 内の全フォルダーを対象にします（"excluded" を除く）
    projects: [
      'packages/*',
      '!packages/excluded',
    ],
  },
})
```

一部がプロジェクトで他がサブフォルダーだけを含むようなネスト構造では、親フォルダーに一致しないようブラケットを使います：

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

// 次のプロジェクトが作られます:
// packages/a
// packages/b
// packages/business/c
// packages/business/d
// "packages/business" 自体はプロジェクトになりません

export default defineConfig({
  test: {
    projects: [
      // "packages" 内の全フォルダーに一致します（"business" を除く）
      'packages/!(business)',
      // "packages/business" 内の全フォルダーに一致します
      'packages/business/*',
    ],
  },
})
```

### 設定ファイルの参照

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.{e2e,unit}.ts'],
  },
})
```

これは拡張子の前に `e2e` または `unit` を含む `vitest.config` ファイルを持つプロジェクトだけを含めます。

### インライン設定

glob 構文とインライン構文は組み合わせられます：

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // `packages` フォルダー内の全フォルダー・全ファイルに一致します
      'packages/*',
      {
        // ルート設定のオプションを継承するには "extends: true" を付けます
        extends: true,
        test: {
          include: ['tests/**/*.{browser}.test.{ts,js}'],
          // インライン設定を使う場合は名前を付けるのがおすすめです
          name: 'happy-dom',
          environment: 'happy-dom',
        },
      },
      {
        test: {
          include: ['tests/**/*.{node}.test.{ts,js}'],
          // 名前ラベルの色は変えられます
          name: { label: 'node', color: 'green' },
          environment: 'node',
        },
      },
    ],
  },
})
```

> **Warning:** すべてのプロジェクトは一意な名前を持つ必要があり、そうでない場合 Vitest はエラーを投げます。インライン設定に名前がない場合、Vitest は番号を割り当てます。glob で定義されたプロジェクト設定では、最も近い `package.json` の `name` プロパティを使い、存在しない場合はフォルダー名を使います。

> **Warning:** Vitest は設定で明示的に指定しない限り、ルートの `vitest.config` ファイルをプロジェクトとして扱いません。したがって、ルート設定は `reporters` や `coverage` などのグローバルオプションにだけ影響します。Vitest は常にルート設定から特定のプラグインフック（`apply`、`config`、`configResolved`、`configureServer`）を実行し、同じプラグインでグローバルセットアップやカスタムカバレッジプロバイダーを実行します。

### defineProject

プロジェクトはすべての設定プロパティをサポートしません。型安全性を高めるため、プロジェクト設定ファイルでは `defineConfig` の代わりに `defineProject` を使います：

```ts twoslash [packages/a/vitest.config.ts]
// @errors: 2769
import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    environment: 'jsdom',
    // プロジェクト設定では "reporters" に対応していないためエラーになります
    reporters: ['json'],
  },
})
```

## テストの実行

ルートの `package.json` にスクリプトを定義します：

```json [package.json]
{
  "scripts": {
    "test": "vitest"
  }
}
```

```bash
npm run test
# または yarn test / pnpm run test / bun run test
```

`--project` で単一プロジェクト内のテストだけを実行します：

```bash
npm run test --project e2e
# または: yarn test --project e2e / pnpm run test --project e2e / bun run test --project e2e
```

> **Note:** `--project` は複数回指定して複数のプロジェクトを絞り込めます：`npm run test --project e2e --project unit`。

## 設定

設定オプションはルートレベルの設定ファイルから継承されません。共有設定ファイルを作り、`mergeConfig` でマージしてください：

```ts [packages/a/vitest.config.ts]
import { defineProject, mergeConfig } from 'vitest/config'
import configShared from '../vitest.shared.js'

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      environment: 'jsdom',
    },
  })
)
```

代わりに `extends` オプションでルートレベルの設定から継承します（すべてのオプションがマージされます）：

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    pool: 'threads',
    projects: [
      {
        // plugins や pool など、この設定のオプションを継承します
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.unit.test.ts'],
        },
      },
      {
        // この設定のオプションは継承しません（既定の動作です）
        extends: false,
        test: {
          name: 'integration',
          include: ['**/*.integration.test.ts'],
        },
      },
    ],
  },
})
```

### サポートされないオプション

> **Warning:** 一部の設定オプションはプロジェクト設定で許可されません。主なものは次の通りです：
> - `coverage`：カバレッジはプロセス全体で行われます
> - `reporters`：ルートレベルのレポーターだけ使えます
> - `resolveSnapshotPath`：ルートレベルのリゾルバーだけ尊重されます
> - テストランナーに影響しないその他のすべてのオプション

プロジェクト設定内でサポートされない設定オプションは、名前の横に root-only アイコンが付き、ルート設定ファイルで一度だけ定義できます。

## projects設定リファレンス

- **型:** `TestProjectConfiguration[]`
- **既定値:** `[]`

プロジェクトの配列です。

## 要点

- `projects` は非推奨の `workspace` オプション（3.2 以降非推奨）を置き換え、すべてのプロジェクトを 1 つの Vitest プロセスで実行します。
- プロジェクトエントリーには glob パターン、設定ファイル、インライン設定オブジェクトを指定できます。
- 一致したすべてのフォルダーは設定ファイルがなくてもプロジェクトになります。ファイルエントリーは `vitest[.<name>].config.*` / `vite[.<name>].config.*` の命名規則に従う必要があります。
- `!pattern` でエントリーを除外します。ネストした構成ではブラケット（`packages/!(business)`）を使います。
- ルート設定はプロジェクトではありません。グローバルオプションとルートレベルのプラグインフックにだけ影響します。
- インラインのプロジェクトは一意な `name` 値を設定します。重複した名前はエラーを投げます。
- 型安全なプロジェクト設定には `defineProject` を使い、オプション共有には `mergeConfig` / `extends` を使います。
- `coverage`、`reporters`、`resolveSnapshotPath` などの root-only オプションはプロジェクト設定でサポートされません。
- 実行時に 1 つ以上の `--project` フラグでプロジェクトを選びます。

<!-- Sources: docs/guide/projects.md, docs/config/projects.md -->
