---
name: vitest
description: Vitest でテストを書くときに使用します。テスト API とモックパターンを定めます。テストの作成、モック、カバレッジ設定、テストのフィルタリングやフィクスチャーの利用時に使用します。
---

Vitest を用いたテストを、決定的で保守しやすい形で実装・修正・レビューします。

## API リファレンス

### コア

| トピック | 説明 | 参照 |
| --- | --- | --- |
| Configuration | Vitest と Vite の設定統合、`defineConfig` の使用法 | [core-config](references/core-config.md) |
| CLI | コマンドラインインターフェース、コマンドとオプション | [core-cli](references/core-cli.md) |
| Test API | `test` / `it` 関数、`skip`・`only`・`concurrent` などの修飾子 | [core-test-api](references/core-test-api.md) |
| Describe API | テストのグループ化やネストしたスイートのための `describe` / `suite` | [core-describe](references/core-describe.md) |
| Expect API | `toBe`・`toEqual`・マッチャー・非対称マッチャーによるアサーション | [core-expect](references/core-expect.md) |
| Hooks | `beforeEach`・`afterEach`・`beforeAll`・`afterAll`・`aroundEach` | [core-hooks](references/core-hooks.md) |

### 機能

| トピック | 説明 | 参照 |
| --- | --- | --- |
| Mocking | `vi` ユーティリティによる関数・モジュール・タイマー・日付のモック | [features-mocking](references/features-mocking.md) |
| Snapshots | `toMatchSnapshot` とインラインスナップショットによるスナップショットテスト | [features-snapshots](references/features-snapshots.md) |
| Coverage | V8 または Istanbul プロバイダーによるコードカバレッジ | [features-coverage](references/features-coverage.md) |
| Test Context | テストフィクスチャ、`context.expect`、カスタムフィクスチャ用の `test.extend` | [features-context](references/features-context.md) |
| Concurrency | 並行テスト、並列実行、シャーディング | [features-concurrency](references/features-concurrency.md) |
| Filtering | 名前・ファイルパターン・タグによるテストのフィルタリング | [features-filtering](references/features-filtering.md) |
| Test Tags | タグでテストにラベルを付けて実行の絞り込みや共有オプションの適用を行う | [features-test-tags](references/features-test-tags.md) |
| Reporters | 組み込みレポーター、デフォルト選択、CI / 出力設定 | [features-reporters](references/features-reporters.md) |
| Benchmarking | `bench` フィクスチャ (Tinybench) によるベンチマーク作成 | [features-benchmarking](references/features-benchmarking.md) |

### 応用

| トピック | 説明 | 参照 |
| --- | --- | --- |
| Vi Utilities | `vi` ヘルパー: モック、`spyOn`、フェイクタイマー、`hoisted`、`waitFor` | [advanced-vi](references/advanced-vi.md) |
| Environments | テスト環境: `node`・`jsdom`・`happy-dom`・カスタム | [advanced-environments](references/advanced-environments.md) |
| Type Testing | `expectTypeOf` と `assertType` による型レベルのテスト | [advanced-type-testing](references/advanced-type-testing.md) |
| Projects | マルチプロジェクトワークスペース、プロジェクトごとの異なる設定 | [advanced-projects](references/advanced-projects.md) |

### ブラウザーモード

| トピック | 説明 | 参照 |
| --- | --- | --- |
| Browser Guide | Browser Modeの概要・インストール・実行・複数ブラウザー設定・制限事項 | [browser-guide](references/browser-guide.md) |
| Browser Config | `test.browser`設定: プロバイダー・インスタンス・headless・viewport・trace等 | [browser-config](references/browser-config.md) |
| Locators | `page.getBy*`クエリ・絞り込み・操作メソッド・カスタムロケーター | [browser-locators](references/browser-locators.md) |
| Interactivity | `userEvent`による実イベント操作: クリック・入力・選択・ドラッグ等 | [browser-interactivity](references/browser-interactivity.md) |
| Assertions | `expect.element`・DOMマッチャー・スクリーンショット・ARIAスナップショット | [browser-assertions](references/browser-assertions.md) |
| Context & Commands | `page`・`server`・`cdp`・`utils`と組み込み/カスタムコマンド | [browser-context-commands](references/browser-context-commands.md) |
| Component Testing | Vue・React・Svelteの`render`とTesting Library連携・実践パターン | [browser-component](references/browser-component.md) |
| Visual & Trace | ビジュアルリグレッション運用とPlaywrightトレースの取得・閲覧 | [browser-visual-trace](references/browser-visual-trace.md) |

## 基本方針

- ESM を使用します。
- `describe()` は文脈、`test()` は振る舞いを表現します。`it()` は使用しません。
- `describe()` は可読性が向上する場合のみ使用します。
- テスト名は簡潔にまとめます。テスト名は期待する振る舞いを表現し、実装方法には言及しません。
- 1 つのテストでは 1 つの振る舞いを検証します。
- テストはできるだけ短く保ちます。
- 不要な抽象化は避けます。
- リファクタリング耐性を重視します。
- 失敗原因が分かりやすいテストを書きます。
- テストコード自体が仕様書として読めるようにします。
- 機能のテスト以外にも、空の入力、境界値、エラー処理のテストも含めます。
- 実際の実装に対してテストし、モジュールをモックしません。
- テストのコールバックでは、トップレベルのインポートではなく、分割代入した `{ expect }` パラメーターを使用します。
- テスト内で手動で中断しない `AbortSignal` を使用するときは、テストのコールバックの分割代入した `{ signal }` パラメーターを使用します。中断そのものをテストする場合はこの限りではありません。

## テスト構成

AAA（Arrange / Act / Assert）を基本とし、`// 準備`、`// 実行`、`// 検証`（または `// 準備と実行`、`// 実行と検証`）で区切ります:

```ts
test("キャッシュされていない値を返す", ({ expect }) => {
  // 準備
  const cache = new Cache();

  // 実行
  const value = cache.get("foo");

  // 検証
  expect(value).toBe(undefined);
});
```

```ts
test("キャッシュされていない値を取得すると KeyNotFoundError を投げる", ({ expect }) => {
  // 準備
  const cache = new Cache();

  // 実行と検証
  expect(() => cache.get("foo")).toThrow(KeyNotFoundError);
});
```

## 検証

- 厳格で具体的な Matcher を使用します。
- `Promise` やそれを返す関数の返り値を検証するときは `.resolve` や `.reject` を使用します。

良い例:

```ts
expect(flag).toBe(true);
expect(name).toBeTypeOf("string");
expect(list).toStrictEqual(["a", "b"]);
expect(fn).toThrow(Error);
await expect(promise).resolve.toBe(undefined);
```

避ける例:

```ts
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(await promise).toBe(undefined);
```

## フィクスチャー

`beforeEach()` は、本当にすべてのテストで共通となる初期化以外では使用しません。

各テストのセットアップ・クリーンアップには `test.extend()` を使用します。この場合、Vitest の `test` はリネームして import し、プロジェクト用の `test` を定義します:

```ts
import { test as vitest } from "vitest";

const test = vitest.extend<{
  databaseClient: DatabaseClient;
  repository: UserRepository;
  service: UserService;
}>({
  async databaseClient({}, use) {
    await using databaseClient = new DatabaseClient();
    await use(databaseClient);
  },
  async repository({ databaseClient }, use) {
    await using repository = new UserRepository(databaseClient);
    await use(repository);
  },
  async service({ repository }, use) {
    const service = new UserService(repository);
    await use(service);
  },
});
```

各テストでは必要なフィクスチャーだけを受け取ります。

```ts
test("ユーザーを作成できる", async ({ expect, service }) => {
  const user = await service.create("Alice");

  expect(user).toStrictEqual({
    id: 1,
    name: "Alice",
  });
});
```

## モック

モック・スタブの使用は最小限に留めます。モックするのは外部依存のみとします。

モックしないもの:

- ユーティリティー関数
- 値オブジェクト
- 純粋関数
- ローカルモジュール

などはモックしません。

できるだけ、

```ts
using fn = vi.spyOn(...);
```

を使い、モジュール全体のモックは避けます。`using` を使うと、テスト終了時に自動で復元されます。

## 非同期テスト

できるだけ async / await を使用します。Promise の `then()` チェーンは使用しません。

```ts
test("ユーザーを取得する", async ({ expect }) => {
  const user = await loadUser();

  expect(user.name).toBe("Alice");
});
```

## フェイクタイマー

必要な場合のみ使用します。

```ts
vi.useFakeTimers();

...

vi.runAllTimers();

vi.useRealTimers();
```

使用前に必ず `useRealTimers()` を呼び出します。

## テーブルテスト

入力と期待値だけが異なる場合は `test.each()` を使用します。

```ts
test.each([
  [1, 2],
  [2, 3],
  [3, 4],
])("%i -> %i", (input, expected) => {
  expect(addOne(input)).toBe(expected);
});
```

ケースごとにセットアップや検証内容が異なる場合は通常の `test()` を使用します。

## スナップショット

スナップショットは、大きな出力や明示的な比較が困難な場合のみ使用し、可能な限り通常の `expect()` を使用します。

## Browser テスト

クライアントテストは、Vitest の Browser Mode を利用して実際の Playwright ブラウザー上で実行されます。そのため、テスト内でブラウザー固有の API を使用できます。

## 型テスト

TypeScript の型を検証する場合は、Vitest の型テスト機能を使用します。

```ts
import { expectTypeOf, test } from "vitest";

test("戻り値の型が User である", () => {
  expectTypeOf(createUser()).toEqualTypeOf<User>();
});
```

### 基本方針

- 型の検証には `expectTypeOf()` を使用します。
- ランタイムの挙動と型は別々のテストとして記述します。
- 型推論が API の一部である場合は必ずテストします。
- 公開 API のジェネリクスやオーバーロードは型テストを追加します。
- 型エラーを期待する場合は `.not` を使用します。

### 型推論のテスト

推論結果も API の一部として扱います。

```ts
const result = select({
  id: true,
  name: true,
});

expectTypeOf(result).toEqualTypeOf<{
  id: number;
  name: string;
}>();
```

## クリーンアップ

すべてのテストは独立して実行できます:

- 実行順序に依存しません。
- 共有状態を残しません。
- テスト間で状態を共有しません。

## 異常系

必要に応じて以下も必ず検証します。

- 不正な入力
- 境界値
- 空コレクション
- 例外
- キャンセル
- 重複データ
- データ欠落

## テスト内のヘルパーとモック

テストファイル内で定義するモッククラスやヘルパー関数は、そのテスト群専用の道具です。名前やシグネチャーだけでは目的が伝わらないため、定義箇所に複数行の JSDoc で簡潔に説明します。

- 説明するのは「何をするか」よりも「何のために存在するか」（どの振る舞いの検証に使用するか）です。
- 1 ～ 2 文で済ませます。実装の詳細は本文で読めるため書きません。
- 名前だけで十分に意味が分かる自明なヘルパーには付けません。

```ts
/**
 * gate() で指定したキーの exists 処理を保留状態にできるストレージモックです。
 * 共有ロックの動作検証のために使用します。
 */
class GatedExistsStorage implements IStorage {
  ...
}

/**
 * 指定時間内に Promise が解決しなければ TIMEOUT エラーで拒否します。
 * デッドロック時にテストが固まるのを防ぐために使用します。
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  ...
}
```

## コード規約

- コメントは必要最小限にします。ただし、テスト内ヘルパーとモックの目的の説明は省きません。
- 変数名は説明的にします。
- インラインで十分ならヘルパー関数を作りません。
- 再利用価値がない限り共通化しません。

## テストレビュー

次のようなテストは避けてください。

- 実行順序に依存している。
- 実装の細部を検証している。
- モックを使いすぎている。
- 既存テストと重複している。
- 不要な async を使っている。
- タイミング依存で不安定になっている。
- 不要なスナップショットを使っている。
