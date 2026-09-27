---
name: blume-meta
description: `meta.ts` によるサイドバーグループの設定を説明します。グループのタイトル、アイコン、順序、子ページの並び順を扱います。
---

# フォルダーメタ

コンテンツツリー内のすべてのフォルダーはサイドバーグループになります。ページと同じ階層に `meta.ts` を置くと、そのグループの見た目と子要素の並び順を制御できます。これは完全に任意です。ファイルがない場合、グループのラベルはフォルダー名を人間が読みやすい形にしたものになり、ページは[インデックス、数値プレフィックス、その後アルファベット順](navigation.md#ordering)で並びます。

## メタの定義 [#defining-meta]

完全に型付けされた設定にするには `defineMeta` オブジェクトをエクスポートします。設定対象のフォルダーのルートにファイルを配置してください — `guides/meta.ts` は **Guides** グループを設定します:

```ts meta.ts lineNumbers
import { defineMeta } from "blume";

export default defineMeta({
  title: "Guides",
  icon: "book-open",
  order: 2,
  collapsed: false,
  pages: ["configuration", "theming", "deployment"],
});
```

すべてのフィールドは任意です — 上書きしたいものだけを設定してください。

Blume は、コンテンツの対象となるフォルダーにある `meta.ts` ファイルのみを読み込みます。コンテンツの `exclude` グロブでスキップされるフォルダーの下にあるもの、またはどの `include` グロブにも含まれない場所にあるものがインポートされることはありません。`root: "."` と `exclude: ["**/_*", "**/.*", "src/**"]` を指定した場合、無関係な `src/lib/meta.ts` には手が加えられません。`exclude` はデフォルトの `["**/_*", "**/.*"]` に追加されるのではなく、それを置き換えます。そのため、`_` で始まるパーシャルやドットファイルを公開しないままにするには、これら 2 つも列挙してください。

## フィールド [#fields]

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `title` | `string` | グループのラベル。デフォルトはフォルダー名を人間が読みやすい形にしたもの。 |
| `icon` | `string` | ラベルの横に表示されるアイコン。 |
| `order` | `number` | 兄弟のグループやページの中での位置。数値が小さいほど先に並びます。 |
| `collapsed` | `boolean` | [`group` 表示モード](navigation.md#display-modes)において、グループを折りたたんだ状態で開始するかどうか。 |
| `display` | `"flat" \| "group" \| "page"` | このグループの描画モード。グローバルの [`navigation.sidebar.display`](navigation.md#display-modes) を上書きします。 |
| `pages` | `string[]` | スラッグによる、グループの子要素の明示的な順序。 |

`pages` 配列は子要素をスラッグで列挙します — スラッグとは、フォルダー名またはファイル名から数値プレフィックスと括弧を取り除いたものです（つまり `01-quickstart.mdx` は `"quickstart"` になります）。列挙された各子要素は、配列内での位置がそのまま順序になります（`0`、`1`、`2`、…）。省略した子要素も表示され、それぞれ自身の順序で並びます: `index` ページは先頭のままとなり、`sidebar.order`、数値プレフィックス、または自身の `meta.ts` の `order` を持つ子要素は、その数値に従って列挙されたものの間に並び、これらのいずれも持たない子要素は列挙されたものの後に並びます。配列で順序全体を指定したい場合は、すべての子要素を列挙してください。

この配列はページ同士、グループ同士の順序を決めますが、グループに属さないページがグループより上に並ぶ場所では、両者を混ぜて並べることはしません。そのような場所とは、サイドバーの最上位（および各[タブ](navigation.md#tabs)セクションの最上位）と、[`flat`](navigation.md#display-modes) サブグループを持つグループです。後者では、混ぜて並べるとサブグループのヘッダーがその後に続くページを所有しているように見えてしまいます。これらの場所では、`pages: ["advanced", "intro"]` と指定しても、`intro` ページは `advanced` グループより上に並びます。

グループの描画方法 — フラットなヘッダー、折りたたみ可能な開閉要素、ドリルインパネル — はデフォルトでサイドバー全体の `navigation.sidebar.display` に従います。このグループだけで上書きするには、ここで `display` を設定してください。フォルダーの `index` ページもフロントマターからこれを設定でき、そちらが `meta.ts` よりも優先されます — [グループごとの上書き](navigation.md#per-group-overrides)を参照してください。

## 計算されたメタ [#computed-meta]

`meta.ts` は実際のモジュールなので、メタを計算できます — オブジェクトの代わりに関数（同期または `async`）を渡すと、スキャン時に構築されます。外部ソースからページの順序を取得する場合に便利です:

```ts meta.ts
import { defineMeta } from "blume";

export default defineMeta(async () => ({
  title: "Guides",
  pages: await orderFromCms(),
}));
```

## グループ内での並び順 [#ordering-within-a-group]

`pages` 配列はグループの子要素の順序を設定し、列挙されたページ自身の `sidebar.order` や、列挙されたサブフォルダー自身の `order` よりも優先されます。そこで省略されたものは、各ページのフロントマターの `sidebar.order`、次にファイルシステム（最初に `index` ページ、次に数値プレフィックス、その後アルファベット順）にフォールバックします。明示的な設定サイドバーを含む、サイドバーの優先順位の全体については、[ナビゲーション › 並び順](navigation.md#ordering)を参照してください。

URL セグメントを追加*せずに*ページをグループ化したい場合、`meta.ts` はまったく必要ありません。括弧付きのフォルダー名を使用してください — [ページ › グループフォルダー](page.md#group-folders)を参照してください。

## 国際化 [#internationalization]

[i18n](i18n.md) では、フォルダーメタはロケールごとに解決されます。`fr/guides/` の下に `meta.ts` を置くと、フランス語のグループを独立して並べ替えられます。それ（または後述の共有 `meta.$.ts`）がない場合、フランス語のグループはフォールバックロケールの `meta.ts` をそのまま反映します。

すべての言語で同一のフォルダーメタについては、`$` マーカーを追加すると、1 つのファイルで重複なくすべてのロケールに対応できます:

```txt
docs/guides/meta.$.ts   (folder meta applied to every locale)
```

ロケール固有の `meta.ts` は、その言語について共有の `meta.$.ts` を引き続き上書きします。

## 次はどこへ [#where-to-next]

**[ナビゲーション](navigation.md)**

サイドバー、パンくずリスト、タブがどのように構築されるか。

**[フロントマター](frontmatter.md)**

`sidebar` の上書きを含む、ページごとのメタデータ。

<!-- Sources: apps/docs/dist/client/ja/docs/content/meta.md -->
