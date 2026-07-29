# Lizenz

**[English](./LICENSE.md)** | **[日本語](./LICENSE_ja.md)** | **Deutsch**

## Lizenz dieses Projekts

Dieses Projekt (KERT XML/Md Editor) steht unter der GNU General Public License v3.0 (GPL-3.0).

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

## Lizenzen der verwendeten Bibliotheken

KERT XML/Md Editor verwendet die folgenden Bibliotheken. Bitte beachten Sie die jeweilige Lizenz.

| Bibliothek | Lizenz | Verwendungszweck |
|-----------|--------|-----------------|
| [Electron](https://www.electronjs.org/) | MIT License | Desktop-Anwendungsframework |
| [React](https://react.dev/) | MIT License | UI-Framework |
| [Slate.js](https://docs.slatejs.org/) | MIT License | Rich-Text-Editor |
| [MathLive](https://cortexjs.io/mathlive/) | MIT License | Formeleingabe (`<math-field>`) |
| [TypeScript](https://www.typescriptlang.org/) | Apache License 2.0 | Programmiersprache |
| [Vite](https://vitejs.dev/) | MIT License | Build-Tool |
| [electron-vite](https://electron-vite.org/) | MIT License | Integriertes Build-Tool für Electron + Vite |
| [electron-builder](https://www.electron.build/) | MIT License | Ersteller von Distributionspaketen |
| [@electron/notarize](https://github.com/electron/notarize) | MIT License | Signierung/Notarization von macOS-Apps (beim Build) |

## Über mitgelieferte Dokumente von Drittanbietern

Dieses Projekt enthält das W3C MathML 3.0 XML Schema (Verzeichnis `mathml3/`), damit `document_schema.xsd` das `<math>`-Element korrekt als Teil des XML-Schemas definieren kann. Es handelt sich dabei nicht um eine Softwarebibliothek, sondern um ein vom W3C unter der [W3C Document License](https://www.w3.org/copyright/document-license/) veröffentlichtes Dokument.
