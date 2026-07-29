# KERT XML/Md Editor

**English** | **[日本語](./README_ja.md)** | **[Deutsch](./README_de.md)**

![license](https://img.shields.io/badge/license-GPL--3.0-green)
![platform](https://img.shields.io/badge/platform-MacOS%20Sequoia%2FTahoe%20Windows%2011-blue)
![version](https://img.shields.io/github/v/release/quwano/KERT_XMLEditor?label=version&color=brightgreen)

## About This Project

KERT XML/Md Editor is a desktop application that lets you easily create and edit XML and Markdown files for generating EPUBs with [KERT](https://github.com/quwano/KERT), through a GUI.

It supports creating and editing XML compliant with the KERT XML input format (`document_schema.xsd`), and can be operated intuitively without any XML knowledge.  
It also supports creating and editing Markdown (KERT Extended CommonMark Notation, `.md` / `.txt`) in the same editing screen.

![GUI input](docs/images/result_gui.png)

![Generated XML](docs/images/result_xml.png)

## Tested Environments

- macOS Sequoia / Tahoe
- Windows 11

## How to Build

This application is used by building it from source code.

### Requirements

- [Node.js](https://nodejs.org/) 18 or later
- npm

### Steps

```bash
git clone https://github.com/quwano/KERT_XMLEditor.git
cd KERT_XMLEditor
npm install
```

Build for Mac (`.dmg`):

```bash
npm run build:mac
```

Build for Windows (`.exe` installer):

```bash
npm run build:win
```

Build artifacts are generated in the `release/` directory.

> **Note on Windows builds**  
> You can also generate a Windows `.exe` by cross-compiling on a Mac.

### If macOS shows a "malware" warning and won't open, or deletes, the App

An unsigned, non-notarized `.app` (without Apple Developer ID Notarization) may, depending on the macOS version and the state of its security-feature updates, show a warning on first launch such as ""KERT XML-Md Editor.app" can't be opened. Apple could not verify that this app is free of malware," refuse to launch, or move the App to the Trash (whether this happens varies by macOS version).

Running `npm run build:mac` automatically removes the quarantine attribute and applies an ad-hoc signature after the build (`xattr -cr` and `codesign --deep --force --sign -`), so you can normally launch the App built on this Mac as-is. However, this is only a best-effort mitigation for local verification — it will not pass a full `spctl` assessment. If you distribute or share it to another Mac, the quarantine attribute is reattached there and the same warning can recur.

If the warning still appears, try one of the following:

- Right-click (or Control-click) the `.app`, choose "Open," then choose "Open" again in the dialog that appears
- Run the following in Terminal, then launch again

  ```bash
  xattr -cr "release/mac-arm64/KERT XML-Md Editor.app"
  codesign --deep --force --sign - "release/mac-arm64/KERT XML-Md Editor.app"
  ```

To distribute it permanently to other Macs, the ad-hoc signature above is not sufficient. Obtain a Developer ID certificate through the Apple Developer Program ($99/year), set the environment variables `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` / `CSC_LINK` / `CSC_KEY_PASSWORD`, and the build will automatically perform proper signing and Notarization.

## How to Use

### File Operations
- You can create new documents, load files, overwrite them, and save in XML or Markdown (`.md` / `.txt`) format.
- Saving uses two separate buttons, "Save XML" and "Save MD," so you explicitly choose the save format.
- A file that has already been saved or loaded can be written back directly via the "Overwrite Save" button, after a confirmation dialog. The button is disabled for a new document with no confirmed save location yet.
- You can open files by dragging and dropping them onto the window. Files opened via drag and drop are also eligible for overwrite save.
- On XML load, validation based on `document_schema.xsd` is performed; files that don't conform to the schema are rejected.
- A confirmation dialog appears if there are unsaved changes when creating a new document, opening a file, or closing the app.

![File operations](docs/images/file_operations.png)

- You can undo and redo the most recent operation (Undo: `Cmd/Ctrl + Z`, Redo: `Cmd/Ctrl + Shift + Z` or `Ctrl + Y`).

![Undo and redo](docs/images/undo_redo.png)

### GUI Settings

- Switch display language (日本語 / English / Deutsch)
- Change font size (Small / Normal / Large / XLarge / Custom)
- Change typeface

![Settings](docs/images/config.png)

### Document Structure Editing

- **Add blocks**: Add title1–title5 (headings), p (paragraphs), table (tables), or a block-level formula at any position

![Add block](docs/images/add_block.png)

![Add block dialog](docs/images/block_list.png)

![Add heading](docs/images/add_heading.png)

*The horizontal divider appears when you hover near it.*

![Blocks](docs/images/blocks.png)

- **Change heading level**: For title1–title5 blocks, the level can be changed at any time via the dropdown in the label area
  
![Change heading level](docs/images/change_title_level.png)

- **Reorder**: Drag the ⠿ handle at the left of a block to reorder it, or use the ↑↓ buttons to move it up or down
- **Delete**: Remove unwanted blocks

![Reorder and delete](docs/images/move_and_delete.png)

### Rich Text Editing

- Select any range of text and right-click to apply or remove the following markup:
  - **g** (emphasis / bold)

![Emphasis](docs/images/emphasis.png)

  - **u** (underline)

![Underline](docs/images/underline.png)

  - **frame** (framed box)
  - **sup** (superscript)
  - **sub** (subscript)
  - **ruby** (ruby annotation)

![Ruby 1](docs/images/ruby1.png)

![Ruby 2](docs/images/ruby2.png)

  - **yomikae** (reading substitution)

![Yomikae 1](docs/images/yomikae1.png)

![Yomikae 2](docs/images/yomikae2.png)

  - **img** (insert image)  
    - To insert an image, use the "Browse..." button to pick a file in the file selection dialog. On save, the image path is automatically converted to a relative path from the save destination directory (for both XML and Markdown).


![Image](docs/images/image1.png)

![Image](docs/images/image2.png)


- XML well-formedness is automatically maintained even when markup overlaps.

### Formula Editing

- Supports formula input via [MathLive](https://cortexjs.io/mathlive/).
- Handles two kinds of formulas: "inline formula," inserted within text, and "block formula," a standalone block.  
    - Inline formula
![Inline formula selection](docs/images/math_inline1.png)
![Inline formula input](docs/images/math_inline2.png)
    - Block formula
![Block formula selection](docs/images/math_block1.png)
![Block formula](docs/images/math_block2.png)
    - Shared input dialog for inline and block formulas
![Formula input dialog 1](docs/images/math1.png)
![Formula input dialog 2](docs/images/math2.png)

- When saved as XML, formulas are written as MathML 3.0 (`<math>` element); when saved as Markdown, as LaTeX source (`$...$`).

### Table Editing

- Add, delete, and reorder rows and columns
    - Initial state
![Table initial state](docs/images/table_initial.png)
    - Row selected
![Table row selected](docs/images/table_row.png)
    - Column selected
![Table column selected](docs/images/table_column.png)
- Add and remove header rows (th)

## Content–XML–Markdown Correspondence Table

The XML this application handles conforms to the bundled `document_schema.xsd`. Its Markdown save format is likewise a CommonMark dialect with proprietary extensions (KERT Extended CommonMark Notation). The correspondence between the XML tag and the Markdown syntax for each block/inline content type you can add in the editor is as follows.

### Block Content

| Block | XML Tag | Markdown Syntax |
|---|---|---|
| Heading (levels 1–5) | `<title1>`–`<title5>` | `#`–`#####` + space + text |
| Paragraph | `<p>` | A normal line of text |
| Table | `<table>` / `<tr>` / `<th>` / `<td>` | GFM table (`\| ... \| ... \|`) |
| Block formula | `<math>...</math>` (MathML 3.0) | A `$$` line … formula … a `$$` line |

### Inline Content

| Content | XML Tag | Markdown Syntax |
|---|---|---|
| Emphasis (bold) | `<g>text</g>` | `**text**` |
| Underline | `<u>text</u>` | `[text]{.underline}` |
| Frame (box) | `<frame>text</frame>` | `[text]{.frame}` |
| Superscript | `<sup>text</sup>` | `^text^` |
| Subscript | `<sub>text</sub>` | `~text~` |
| Ruby | `<ruby yomi="reading">text</ruby>` | `[text](-reading)` |
| Yomikae (reading substitution) | `<yomikae yomi="reading">text</yomikae>` | `[text](+reading)` |
| Image | `<img src="path" alt="alt text">` | `![alt text](path)` |
| Inline formula | `<math>...</math>` (MathML 3.0, inline) | `$formula$` |

> **On the MathML schema**  
> Math (the `<math>` element, in the `http://www.w3.org/1998/Math/MathML` namespace) is defined as an element by `document_schema.xsd`, which references the bundled `mathml3/` (W3C MathML 3.0 XML Schema) via `xs:import`. Note that the internal structure of `<math>` is out of scope for load-time validation (formula input/editing is handled by MathLive).

> **On saving formulas as MathML**  
> When saving as Markdown, only the LaTeX source (`$...$` / `$$...$$`) is preserved for formulas — the MathML that MathLive generates is not itself saved. When you reopen a Markdown file and edit a formula, MathLive regenerates the MathML from the LaTeX source.

> **On escaping**  
> If you want to use `\` `*` `[` `$` `^` `~` as literal characters rather than syntax in Markdown, escape them with a preceding `\` (e.g., `\*` → `*`).

## Author

KUWANO KAZUYUKI

## License

See [LICENSE.md](LICENSE.md) / [LICENSE_ja.md](LICENSE_ja.md).
