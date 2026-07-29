# License

**English** | **[日本語](./LICENSE_ja.md)** | **[Deutsch](./LICENSE_de.md)**

## License for This Project

This project (KERT XML/Md Editor) is licensed under the GNU General Public License v3.0 (GPL-3.0).

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

## Licenses for Third-Party Libraries

KERT XML/Md Editor uses the following libraries. Please comply with the license of each library.

| Library | License | Purpose |
|---------|---------|---------|
| [Electron](https://www.electronjs.org/) | MIT License | Desktop application framework |
| [React](https://react.dev/) | MIT License | UI framework |
| [Slate.js](https://docs.slatejs.org/) | MIT License | Rich text editor |
| [MathLive](https://cortexjs.io/mathlive/) | MIT License | Formula input (`<math-field>`) |
| [TypeScript](https://www.typescriptlang.org/) | Apache License 2.0 | Programming language |
| [Vite](https://vitejs.dev/) | MIT License | Build tool |
| [electron-vite](https://electron-vite.org/) | MIT License | Electron + Vite integrated build tool |
| [electron-builder](https://www.electron.build/) | MIT License | Distribution package builder |
| [@electron/notarize](https://github.com/electron/notarize) | MIT License | macOS app signing/notarization (at build time) |

## About Bundled Third-Party Documents

This project bundles the W3C MathML 3.0 XML Schema (the `mathml3/` directory) so that `document_schema.xsd` can properly define the `<math>` element as part of the XML Schema. This is not a software library, but a document published by the W3C under the [W3C Document License](https://www.w3.org/copyright/document-license/).
