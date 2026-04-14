# KERT XML Editor

**English** | **[日本語](./README_ja.md)** | **[Deutsch](./README_de.md)**

![license](https://img.shields.io/badge/license-GPL--3.0-green)
![platform](https://img.shields.io/badge/platform-MacOS%20Sequoia%2FTahoe%20Windows%2011-blue)
![version](https://img.shields.io/github/v/release/quwano/KERT_XMLEditor?label=version&color=brightgreen)

## About This Project

KERT XML Editor is a desktop application that allows you to easily create and edit XML files for generating EPUBs with [KERT](https://github.com/quwano/KERT) through a GUI.

It supports creating and editing XML compliant with the KERT XML input format (`document_schema.xsd`), and can be operated intuitively without any XML knowledge.

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

## Features

### Document Structure Editing

- **Add blocks**: Add title1–title5 (headings), p (paragraphs), and table (tables) at any position

![Add block](docs/images/add_block.png)

![Add block dialog](docs/images/block_list.png)

![Add heading](docs/images/add_heading.png)

The horizontal divider in the image above appears when you hover over it.

![Blocks](docs/images/blocks.png)

- **Reorder**: Move blocks up or down
- **Delete**: Remove unwanted blocks

![Reorder and delete](docs/images/move_and_delete.png)

### Rich Text Editing

- Select any range of text and right-click to apply or remove the following markup:
  - **g** (emphasis / bold)

![Emphasis](docs/images/emphasis.png)

  - **u** (underline)

![Underline](docs/images/underline.png)

  - **sup** (superscript)
  - **sub** (subscript)
  - **ruby** (ruby annotation)

![Ruby 1](docs/images/ruby1.png)

![Ruby 2](docs/images/ruby2.png)

  - **yomikae** (reading substitution)

![Yomikae 1](docs/images/yomikae1.png)

![Yomikae 2](docs/images/yomikae2.png)

  - **img** (insert image)

![Image](docs/images/image.png)

- When markup overlaps, XML well-formedness is automatically maintained

### Table Editing

- Add, delete, and reorder rows and columns

![Table initial state](docs/images/table_initial.png)

*Initial state*

![Table row selected](docs/images/table_row.png)

*Row selected*

![Table column selected](docs/images/table_column.png)

*Column selected*

- Add and remove header rows (th)

### File Operations

- Create, save, and open XML files
- Validation against `document_schema.xsd` is performed on load; files that do not conform to the schema are rejected

![File operations](docs/images/file_operation.png)

### GUI Settings

- Switch display language (日本語 / English / Deutsch)
- Change font size (Small / Normal / Large / XLarge)
- Change font (System / Sans-serif / Serif / Monospace)

![Settings](docs/images/config.png)

## XML Schema

The XML handled by this application conforms to the bundled `document_schema.xsd`.

### Element Reference

| Element | Description |
|---|---|
| `<root>` | Root element |
| `<title1>`–`<title5>` | Headings (levels 1–5) |
| `<p>` | Paragraph |
| `<table>` / `<tr>` / `<th>` / `<td>` | Table / row / header cell / data cell |
| `<g>` | Emphasis (bold) |
| `<u>` | Underline |
| `<sup>` | Superscript |
| `<sub>` | Subscript |
| `<ruby yomi="...">` | Ruby annotation |
| `<yomikae yomi="...">` | Reading substitution |
| `<img src="..." alt="...">` | Image |

## Author

KUWANO KAZUYUKI

## License

See [LICENSE.md](LICENSE.md).
