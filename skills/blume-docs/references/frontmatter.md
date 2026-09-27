---
name: blume-frontmatter
description: ページが受け付けるすべてのフロントマターフィールドを説明します。`title`・`description`・`sidebar`・SEO・検索などの制御を扱います。
---

# フロントマター

すべてのページは次のフロントマターを受け付けます。すべてのフィールドは任意です。

| Prop | Type | Default | Description |
| - | - | - | - |
| `title?` | `string` | - | Page title. |
| `description?` | `string` | - | Page summary. |
| `type?` | `string` | `doc` | Content type. blog/changelog drive feeds. |
| `date?` | `string` | - | Publish date for blog/changelog feeds (ISO or YAML date). |
| `authors?` | `string \| string[] \| object[]` | - | Post author(s) for blog/changelog content — a name, or objects with a name plus optional avatar/url and any extra fields. Preserved as-is. |
| `slug?` | `string` | - | Set the page's full route from the content root (guides/setup). It replaces the whole path the file's location gives the page, not just the last segment. A . or .. segment is an error: browsers resolve it away, so no link could reach the page. |
| `draft?` | `boolean` | `false` | Exclude from production builds. |
| `deprecated?` | `boolean` | `false` | Mark the page deprecated: its sidebar row gets a deprecated pill (a translatable UI string). |
| `hidden?` | `boolean` | `false` | Shorthand for sidebar.hidden. |
| `noindex?` | `boolean` | `false` | Shorthand for seo.noindex. |
| `icon?` | `string` | - | Lucide icon for the page's sidebar row when sidebar.icon isn't set (sidebar.icon wins). |
| `lastModified?` | `string` | - | Pin the page's "last updated" date (ISO or YAML date); overrides the git-derived date. |

## サイドバー [#sidebar]

```yaml lineNumbers
sidebar:
  label: Install
  order: 2
  icon: download
  badge: New
  hidden: false
  display: page
```

`hidden` はページをサイドバーと前へ/次へのページネーションから除外します。フォルダーの `index` ページでは、そのページ自身の行だけが除外されます。グループの行は引き続きそのページにリンクし、前へ/次へのリンクもそのページを経由します。

`display` はページが属するフォルダーグループの表示モードを設定します（[グループごとのオーバーライド](navigation.md#per-group-overrides)）。これが意味を持つのは、自動生成されたサイドバー配下にあるフォルダーの `index` ページだけです。それ以外の場所（index 以外のページ、コンテンツルート自体の `index` ページ、明示的な `navigation.sidebar` 配下のページ）には設定対象のグループがないため、Blume は `BLUME_SIDEBAR_DISPLAY_IGNORED` という警告を出します。

## SEO

```yaml lineNumbers
seo:
  title: Install Blume
  description: Install Blume and scaffold your first project.
  image: /og/install.png
  canonical: https://acme.com/install
  noindex: false
  x:
    creator: "@jane"
```

`noindex` は robots の `noindex` を出力し、ページをサイトマップから除外し、構造化データも出力しません。`x.creator` はページを X アカウント（`twitter:creator`）の作成として示します。たとえばゲスト投稿の著者を示すときに使います。すべてのフィールドについては [メタデータ](https://useblume.dev/ja/docs/discoverability/metadata#per-page-overrides) を参照してください。

## 検索 [#search]

```yaml lineNumbers
search:
  exclude: false
  tags: [api]
```

## AI

```yaml lineNumbers
ai:
  exclude: true
```

`ai.exclude` はページを [`llms.txt` と `llms-full.txt`](https://useblume.dev/ja/docs/discoverability/llms-txt#excluding-a-page) から除外します。ページは引き続きレンダリングされ、検索対象にも残り、サイトマップにも掲載されたままです。

## 変更履歴 [#changelog]

変更履歴のエントリー（`type: changelog`）では、任意の `changelog` オブジェクトを使って、フィードや表示に使うメタデータを追加できます。

```yaml lineNumbers
type: changelog
changelog:
  version: 1.2.0
  date: 2026-06-20
  category: Features
```

`date` はここにもトップレベルにも記述できます。どちらに書いても [変更履歴の RSS フィード](page.md#feeds) に反映されます。自動生成されるタイムラインページとフィードについては [変更履歴](https://useblume.dev/ja/docs/advanced/changelog) を参照してください。

## カスタムキー [#custom-keys]

このリファレンスにないキーがあるとビルドが失敗するため、タイプミスを早い段階で見つけられます。独自のメタデータを持つプロジェクトでは、`blume.config.ts` の [`frontmatter.extend`](configuration.md#frontmatter) でキーを追加できます。追加したキーは、それぞれプロジェクト側で用意したスキーマで検証されます。

```ts blume.config.ts lineNumbers
import { defineConfig } from "blume";
import { z } from "zod";

export default defineConfig({
  frontmatter: {
    extend: {
      owner: z.string(),
      reviewedAt: z.coerce.date().optional(),
    },
  },
});
```

```yaml page.mdx
---
title: Install
owner: "@sam"
reviewedAt: 2026-06-20
---
```

スキーマは [Standard Schema](https://standardschema.dev) インターフェースで受け付けるため、Zod（プロジェクトにインストールされているバージョンを問いません）、Valibot、ArkType のいずれも使用できます。宣言したキーは、そのキーがないページも含めてすべてのページで検証されます。そのため、必須のスキーマにするとサイト全体でそのキーが必須になります。キーがある場合だけ検証するには `.optional()` を付けてください。それ以外のキーはこれまでどおり厳密に検証され、組み込みフィールドを宣言し直すことはできません。

### タイプごとのキー [#per-type-keys]

RFC の `status` やインシデントレポートの `severity` のように、特定のコンテンツタイプでだけキーを必須にしたい場合は、代わりに [`content.types`](configuration.md#content) の下で宣言します。その際は、対象となるフロントマターの `type` をキーにします。

```ts blume.config.ts lineNumbers
import { defineConfig } from "blume";
import { z } from "zod";

export default defineConfig({
  content: {
    types: {
      rfc: {
        frontmatter: {
          domain: z.string(),
          status: z.enum(["draft", "review", "enforced"]),
        },
      },
    },
  },
});
```

```yaml rfcs/openapi-request-schemas.mdx
---
title: OpenAPI request schemas
type: rfc
domain: architecture
status: enforced
---
```

タイプごとのキーは `extend` と同じルールで検証されますが、対象は最終的に決まった `type` が一致するページに限られます。[`content.defaultType`](configuration.md#content) に対する宣言の場合は、`type` を設定していないページも対象になります。1 つのキーは、サイト全体の宣言とタイプごとの宣言のどちらか一方にしか書けません。また、ほかのタイプにだけ宣言したキーは、それ以外のページでは未知のキーとして扱われます。そのため、通常のドキュメントページに誤って `status` を書くと、これまでどおりビルドが失敗します。

検証に失敗したページがあると `blume build` が失敗し、ファイル名とキーを示す診断メッセージが表示されます。[`--no-strict`](https://useblume.dev/ja/docs/cli#common-flags) を指定するとビルドは成功しますが、失敗したページは出力から除外されます。除外されたページ数はビルドサマリーに表示されます。

スキーマは、エディターや移行ツールで使えるように `blume/schema` からエクスポートされています。

<!-- Sources: apps/docs/dist/client/ja/docs/content/frontmatter.md -->
