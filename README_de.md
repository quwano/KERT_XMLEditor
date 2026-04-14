# KERT XML Editor

**[English](./README.md)** | **[日本語](./README_ja.md)** | **Deutsch**

![license](https://img.shields.io/badge/license-GPL--3.0-green)
![platform](https://img.shields.io/badge/platform-MacOS%20Sequoia%2FTahoe%20Windows%2011-blue)
![version](https://img.shields.io/github/v/release/quwano/KERT_XMLEditor?label=version&color=brightgreen)

## Über dieses Projekt

KERT XML Editor ist eine Desktop-Anwendung, mit der XML-Dateien zur EPUB-Erstellung mit [KERT](https://github.com/quwano/KERT) komfortabel über eine grafische Benutzeroberfläche erstellt und bearbeitet werden können.

Die Anwendung unterstützt das Erstellen und Bearbeiten von XML gemäß dem KERT-XML-Eingabeformat (`document_schema.xsd`) und ist intuitiv bedienbar – auch ohne XML-Kenntnisse.

![GUI-Eingabe](docs/images/result_gui.png)

![Generiertes XML](docs/images/result_xml.png)

## Getestete Umgebungen

- macOS Sequoia / Tahoe
- Windows 11

## Build-Anleitung

Die Anwendung wird aus dem Quellcode gebaut.

### Voraussetzungen

- [Node.js](https://nodejs.org/) 18 oder höher
- npm

### Schritte

```bash
git clone https://github.com/quwano/KERT_XMLEditor.git
cd KERT_XMLEditor
npm install
```

Build für Mac (`.dmg`):

```bash
npm run build:mac
```

Build für Windows (`.exe`-Installer):

```bash
npm run build:win
```

Die Build-Artefakte werden im Verzeichnis `release/` erstellt.

> **Hinweis zum Windows-Build**  
> Eine Windows-`.exe` kann auch per Cross-Compilation auf einem Mac erzeugt werden.

## Funktionen

### Bearbeitung der Dokumentstruktur

- **Blöcke hinzufügen**: title1–title5 (Überschriften), p (Absätze) und table (Tabellen) an beliebiger Position einfügen

![Block hinzufügen](docs/images/add_block.png)

![Dialog zum Hinzufügen](docs/images/block_list.png)

![Überschrift hinzufügen](docs/images/add_heading.png)

Die horizontale Trennlinie im obigen Bild erscheint beim Darüberfahren mit dem Mauszeiger.

![Blöcke](docs/images/blocks.png)

- **Sortieren**: Das ⠿-Handle am linken Rand eines Blocks ziehen zum Neuanordnen, oder die ↑↓-Schaltflächen zum Verschieben verwenden
- **Löschen**: Nicht benötigte Blöcke entfernen

![Verschieben und Löschen](docs/images/move_and_delete.png)

### Rich-Text-Bearbeitung

- Beliebigen Text markieren und per Rechtsklick folgende Auszeichnungen anwenden oder entfernen:
  - **g** (Hervorhebung / Fettschrift)

![Hervorhebung](docs/images/emphasis.png)

  - **u** (Unterstreichung)

![Unterstreichung](docs/images/underline.png)

  - **sup** (Hochstellung)
  - **sub** (Tiefstellung)
  - **ruby** (Ruby-Annotation)

![Ruby 1](docs/images/ruby1.png)

![Ruby 2](docs/images/ruby2.png)

  - **yomikae** (Leseersetzung)

![Yomikae 1](docs/images/yomikae1.png)

![Yomikae 2](docs/images/yomikae2.png)

  - **img** (Bild einfügen)

![Bild](docs/images/image.png)

- Bei überlappenden Auszeichnungen wird die XML-Wohlgeformtheit automatisch sichergestellt

### Tabellenbearbeitung

- Zeilen und Spalten hinzufügen, löschen und neu anordnen

![Tabelle Ausgangszustand](docs/images/table_initial.png)

*Ausgangszustand*

![Tabelle Zeilenauswahl](docs/images/table_row.png)

*Zeile ausgewählt*

![Tabelle Spaltenauswahl](docs/images/table_column.png)

*Spalte ausgewählt*

- Kopfzeilen (th) hinzufügen und entfernen

### Dateioperationen

- XML-Dateien neu erstellen, speichern und öffnen
- XML-Dateien können durch Drag & Drop auf das Anwendungsfenster geöffnet werden
- Beim Öffnen wird eine Validierung gegen `document_schema.xsd` durchgeführt; nicht konforme Dateien werden abgelehnt

![Dateioperationen](docs/images/file_operation.png)

### GUI-Einstellungen

- Anzeigesprache wechseln (日本語 / English / Deutsch)
- Schriftgröße ändern (Small / Normal / Large / XLarge)
- Schriftart ändern (System / Sans-serif / Serif / Monospace)

![Einstellungen](docs/images/config.png)

## XML-Schema

Das von dieser Anwendung verarbeitete XML entspricht dem mitgelieferten `document_schema.xsd`.

### Elementübersicht

| Element | Beschreibung |
|---|---|
| `<root>` | Wurzelelement |
| `<title1>`–`<title5>` | Überschriften (Ebene 1–5) |
| `<p>` | Absatz |
| `<table>` / `<tr>` / `<th>` / `<td>` | Tabelle / Zeile / Kopfzelle / Datenzelle |
| `<g>` | Hervorhebung (Fett) |
| `<u>` | Unterstreichung |
| `<sup>` | Hochstellung |
| `<sub>` | Tiefstellung |
| `<ruby yomi="...">` | Ruby-Annotation |
| `<yomikae yomi="...">` | Leseersetzung |
| `<img src="..." alt="...">` | Bild |

## Autor

KUWANO KAZUYUKI

## Lizenz

Siehe [LICENSE_de.md](LICENSE_de.md).
