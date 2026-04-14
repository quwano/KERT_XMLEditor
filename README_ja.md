# KERT XML Editor

**[English](./README.md)** | **日本語** | **[Deutsch](./README_de.md)**

![license](https://img.shields.io/badge/license-GPL--3.0-green)
![platform](https://img.shields.io/badge/platform-MacOS%20Sequoia%2FTahoe%20Windows%2011-blue)

## このプロジェクトについて

KERT XML Editor は、[KERT](https://github.com/quwano/KERT) で EPUB を生成するための XML ファイルを、GUI により平易に作成・編集できるデスクトップアプリケーションです。

KERT の XML 入力形式（`document_schema.xsd`）に準拠した XML の作成・編集に対応しており、XML の知識がなくても直感的に操作できます。

![画面上の入力](docs/images/result_gui.png)

![生成されたxml](docs/images/result_xml.png)

## 動作確認環境

- macOS Sequoia / Tahoe
- Windows 11

## ビルド方法

本アプリはソースコードからビルドして使用します。

### 必要な環境

- [Node.js](https://nodejs.org/) 18 以上
- npm

### 手順

```bash
git clone https://github.com/quwano/KERT_XMLEditor.git
cd KERT_XMLEditor
npm install
```

Mac 向け（`.dmg`）のビルド：

```bash
npm run build:mac
```

Windows 向け（`.exe` インストーラ）のビルド：

```bash
npm run build:win
```

ビルド成果物は `release/` ディレクトリに生成されます。

> **Windows 向けビルドについて**  
> Mac 上でクロスコンパイルにより Windows 向け `.exe` を生成することもできます。

## 機能

### ドキュメント構造の編集

- **ブロックの追加**: title1〜title5（見出し）、p（段落）、table（表）を任意の位置に追加

![ブロック追加](docs/images/add_block.png)

![ブロック追加ダイアログ](docs/images/block_list.png)

![見出しを追加](docs/images/add_heading.png)

*水平線はポインタを近づけると表示されます。*

![並んだブロック](docs/images/blocks.png)

- **並び替え**: ブロックを上下に移動
- **削除**: 不要なブロックを削除

![並び替えと削除](docs/images/move_and_delete.png)

### リッチテキストの編集

- テキストの任意の範囲を選択して右クリックすることで、以下のマークアップを適用・解除できます：
  - **g**（強調・太字）

![強調](docs/images/emphasis.png)

  - **u**（下線）

![下線](docs/images/underline.png)

  - **sup**（上付き文字）
  - **sub**（下付き文字）
  - **ruby**（ルビ）

![ルビその1](docs/images/ruby1.png)

![ルビその2](docs/images/ruby2.png)

  - **yomikae**（読み替え）

![読み替えその1](docs/images/yomikae1.png)

![読み替えその2](docs/images/yomikae2.png)

  - **img**（画像の挿入）

![画像](docs/images/image.png)


- マークアップが重なる場合も、XMLの整形式が自動的に保たれます。

### 表の編集

- 行・列の追加・削除・並び替え

![表の初期状態](docs/images/table_initial.png)

*初期状態*

![表の行選択状態](docs/images/table_row.png)

*行選択状態*

![表の列選択状態](docs/images/table_column.png)

*列選択状態*

- ヘッダー行（th）の追加・削除

### ファイル操作

- XML ファイルの新規作成・保存・読み込み
- 読み込み時に `document_schema.xsd` に基づく妥当性検証を実施。スキーマに準拠しないファイルは読み込みを拒否します

![ファイル操作](docs/images/file_operation.png)

### GUI 設定

- 表示言語の切り替え（日本語・English・Deutsch）
- フォントサイズの変更（Small / Normal / Large / XLarge）
- フォントの変更（System / Sans-serif / Serif / Monospace）

![設定](docs/images/config.png)

## XML スキーマについて

本アプリが扱う XML は、同梱の `document_schema.xsd` に準拠しています。

### 要素一覧

| 要素                                   | 説明               |
|--------------------------------------|------------------|
| `<root>`                  | ルート要素            |
| `<title1>`〜`<title5>`                | 見出し（レベル 1〜5）     |
| `<p>`                                | 段落               |
| `<table>` / `<tr>` / `<th>` / `<td>` | 表・行・ヘッダーセル・データセル |
| `<g>`                                | 強調（太字）           |
| `<u>`                                | 下線               |
| `<sup>`                              | 上付き文字            |
| `<sub>`                              | 下付き文字            |
| `<ruby yomi="...">`                  | ルビ               |
| `<yomikae yomi="...">`               | 読み替え             |
| `<img src="..." alt="...">`          | 画像               |

## 作者

KUWANO KAZUYUKI

## ライセンス・権利情報

[LICENSE.md](LICENSE.md) / [LICENSE_ja.md](LICENSE_ja.md) を参照してください。
