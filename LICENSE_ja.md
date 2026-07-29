# ライセンス・権利情報

**[English](./LICENSE.md)** | **日本語** | **[Deutsch](./LICENSE_de.md)**

## 本プロジェクトのライセンス

本プロジェクト（KERT XML/Md Editor）は、GNU General Public License v3.0（GPL-3.0）の下で提供されています。

Copyright (C) 2026 KUWANO KAZUYUKI

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

## 使用ライブラリのライセンス

KERT XML/Md Editor は以下のライブラリを使用しています。各ライブラリのライセンスに従ってご利用ください。

| ライブラリ | ライセンス | 用途 |
|-----------|-----------|------|
| [Electron](https://www.electronjs.org/) | MIT License | デスクトップアプリフレーム |
| [React](https://react.dev/) | MIT License | UI フレームワーク |
| [Slate.js](https://docs.slatejs.org/) | MIT License | リッチテキストエディタ |
| [MathLive](https://cortexjs.io/mathlive/) | MIT License | 数式入力（`<math-field>`） |
| [TypeScript](https://www.typescriptlang.org/) | Apache License 2.0 | プログラミング言語 |
| [Vite](https://vitejs.dev/) | MIT License | ビルドツール |
| [electron-vite](https://electron-vite.org/) | MIT License | Electron + Vite 統合ビルドツール |
| [electron-builder](https://www.electron.build/) | MIT License | 配布パッケージ生成 |
| [@electron/notarize](https://github.com/electron/notarize) | MIT License | macOSアプリの署名・公証（ビルド時） |

## 同梱している第三者ドキュメントについて

本プロジェクトには、`document_schema.xsd` 内で `<math>` 要素を XML Schema として正しく定義するため、W3C MathML 3.0 XML Schema（`mathml3/` ディレクトリ）を同梱しています。これはソフトウェアライブラリではなく、W3C により [W3C Document License](https://www.w3.org/copyright/document-license/) の下で公開されている文書です。
