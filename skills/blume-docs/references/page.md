---
name: blume-page
description: コンテンツフォルダーのファイルがどのようにページになるかを説明します。ルーティング、ファイルの命名、数値プレフィックス、下書き、コンテンツタイプ、フィードを扱います。
---

# ページ

ドキュメントは Markdown ファイルと MDX ファイルが入ったフォルダーにすぎません。Blume は各ファイルをページに変換します。ルーティング、ナビゲーション、メタデータはファイルシステムから推論されるため、同期を保つべきマニフェストは存在しません。

コンテンツは **コンテンツルート**（デフォルトは `docs/`。[`blume.config.ts`](configuration.md) の `content.root` で変更できます）配下に置きます。

## Markdown と MDX [#markdown-and-mdx]

Blume は 2 種類のファイルをレンダリングします。

- **`.md`** — 純粋な文章向けの Markdown: GFM、フロントマター、スマート句読点、上付き・下付き文字。
- **`.mdx`** — `.md` のすべての機能に加えて、[コンポーネント](components.md) と MDX 専用の[ディレクティブ、パッケージインストール、数式](syntax.md)。

ページが文章だけの場合は `.md` を、コンポーネントやディレクティブが必要な場合は `.mdx` を使いましょう。切り替えはファイル名を変更するだけです。

## ファイルとルート [#files-and-routes]

各ファイルは、コンテンツルート配下のパスに応じてルートに対応付けられます。

| ファイル                  | ルート            |
| ------------------------- | ----------------- |
| `docs/index.mdx`          | `/`               |
| `docs/quickstart.mdx`     | `/quickstart`     |
| `docs/guides/theming.mdx` | `/guides/theming` |
| `docs/guides/index.mdx`   | `/guides`         |

ネストしたフォルダーはネストしたルートになり、フォルダー内の `index.mdx` はそのフォルダー自体のページになります。

ページの URL を壊してしまう文字（`#`、`?`、`%`、`:`）はルートから取り除かれるため、`100%.mdx` は `/100` で公開されます。ただし、`#` と `?` はファイル名やフォルダー名に一切使わないでください。Astro のコンテンツローダーはそのようなファイルを読み込めないため、Blume はエラーとして報告し、そのファイルをサイトから除外します。`sdks/c#.mdx` を `sdks/c.mdx` にリネームすると `/sdks/c` で公開されます。これは、いずれにせよ文字が取り除かれた場合と同じルートです。

## 数値プレフィックスによる並び替え [#ordering-with-numeric-prefixes]

ファイルやフォルダーの先頭に数字と `-`、`_`、`.` のいずれかを付けると、サイドバーでの順序を制御できます。プレフィックスは URL から取り除かれるため、リンクを壊さずにページを並べ替えられます。

```txt
01-introduction.mdx  ->  /introduction
02-installation.mdx  ->  /installation
```

名前の先頭にあるバージョンや ISO 日付は名前の一部として扱われ、並び順にはなりません。`1.2.0.mdx` は `/1.2.0` に、`2024-01-05-launch.mdx` は `/2024-01-05-launch` にルーティングされます。プレフィックスが取り除かれるのはファイル名とフォルダー名だけです（Obsidian vault のノートはファイルとして扱われます）。フロントマターの `slug` や、CMS や GitHub Releases などの[コンテンツソース](sources.md)から取り込まれたページは、指定された名前をそのまま保持します。

並び順には複数の階層があります。優先順位の完全なルールは[ナビゲーション](navigation.md)を参照してください。

## グループフォルダー [#group-folders]

フォルダー名を丸括弧で囲むと、URL セグメントを追加**せずに**、そのページ群をサイドバーでグループ化できます。

```txt
docs/(internal)/security.mdx  ->  /security
```

これらのページはサイドバー上で「Internal」グループを共有しますが、URL は括弧のないフラットなままです。グループフォルダーにも、通常のフォルダーと同じように[数値プレフィックス](#ordering-with-numeric-prefixes)を付けられます。プレフィックスは括弧の内側と外側のどちらに置いても構いません。`(01-internal)` と `01-(internal)` はどちらも先頭に並び、`(internal)` と同じようにルーティングされます。

## 下書き [#drafts]

ページを下書きとしてマークすると、本番ビルドからは除外しつつ、`blume dev` ではプレビューできます。

```yaml lineNumbers
---
title: Work in progress
draft: true
---
```

`blume build` は下書きをスキップし、`blume dev` はレンダリングするので、公開前の作業を進められます。

## コンテンツタイプ [#content-types]

すべてのページには **タイプ** があり、フロントマターの `type` フィールドで設定します（デフォルトは `doc`）。タイプを使うと、Blume はページのグループごとに異なる扱いができます。中でも重要なのは、`blog` と `changelog` のページが[フィード](#feeds)にまとめられる点です。

```yaml lineNumbers
---
title: v1.2.0
type: changelog
date: 2026-06-20
changelog:
  version: 1.2.0
  category: Features
---
```

タイプはファイルの置き場所とは独立していますが、慣例としてブログ記事は `blog/` 配下に、changelog エントリーは `changelog/` 配下に置きます。どちらも自動的に RSS フィードを取得し、changelog エントリーは生成された [`/changelog` タイムライン](https://useblume.dev/ja/docs/advanced/changelog)にもまとめられます。それぞれの執筆方法については[ブログ](https://useblume.dev/ja/docs/advanced/blog)と[Changelog](https://useblume.dev/ja/docs/advanced/changelog)を参照してください。

## フィード [#feeds]

Blume は、[`seo.rss.types`](https://useblume.dev/ja/docs/discoverability/rss) に列挙された各コンテンツタイプ（デフォルトは `blog` と `changelog`）について、ページが 1 つ以上あれば自動的に RSS フィードを生成します。フィードは `/<type>/rss.xml` で配信されます。

| タイプ      | フィード             |
| ----------- | -------------------- |
| `blog`      | `/blog/rss.xml`      |
| `changelog` | `/changelog/rss.xml` |

各エントリーに `date` を指定すると、項目が新しい順に並び、`pubDate` が付与されます。クォートなしの YAML 日付でも問題ありません。Blume が正規化します。

```yaml lineNumbers
---
title: Introducing Blume
type: blog
date: 2026-06-22
description: Why we built a markdown-first docs framework.
---
```

フィードには絶対的なサイト URL が必要なので、[`deployment.site`](https://useblume.dev/ja/docs/deployment) を設定してください。Blume はすべてのページに `<link rel="alternate">` タグを追加するため、ブラウザーやフィードリーダーが自動的にフィードを検出します。各コンテンツタイプの執筆方法については[ブログ](https://useblume.dev/ja/docs/advanced/blog)と[Changelog](https://useblume.dev/ja/docs/advanced/changelog)を参照してください。

## このページの内容 [#on-this-page]

すべてのページには、見出しから自動的に生成される目次が付きます。画面が広い場合はコンテンツの横の固定サイドバーに表示され、狭い場合はページ上部の **このページの内容** パネルに折りたたまれます。スクロールすると、読んでいるセクションの項目がハイライトされるので、長いページでも現在位置が常に分かります。

Blume は各見出しをスラッグ化してアンカーにするため、すべての項目がそのセクションへ直接リンクします。また、URL にスラッグを付け加えることで任意の見出しへディープリンクできます（`.../my-page#getting-started`）。

デフォルトでは、目次には `##` と `###` の見出し（H2 と H3）が並びます。見出しの範囲を変更したり目次を無効にしたりするには、[`toc`](configuration.md#table-of-contents) を設定してください。その範囲の見出しがないページには、単に目次が付きません。

## 次はどこへ [#where-to-next]

**[フロントマター](frontmatter.md)**

ページのメタデータ: タイトル、説明、サイドバー、SEO、検索。

**[構文](syntax.md)**

記述できるすべての Markdown と MDX の機能。

**[コンポーネント](components.md)**

任意の MDX ページで利用できる JSX コンポーネント。

**[ナビゲーション](navigation.md)**

サイドバー、並び順、タブを形づくります。

**[フォルダーメタ](meta.md)**

`meta.ts` ファイルでサイドバーグループを設定します。

<!-- Sources: apps/docs/dist/client/ja/docs/content.md -->
