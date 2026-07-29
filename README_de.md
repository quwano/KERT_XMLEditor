# KERT XML/Md Editor

**[English](./README.md)** | **[日本語](./README_ja.md)** | **Deutsch**

![license](https://img.shields.io/badge/license-GPL--3.0-green)
![platform](https://img.shields.io/badge/platform-MacOS%20Sequoia%2FTahoe%20Windows%2011-blue)
![version](https://img.shields.io/github/v/release/quwano/KERT_XMLEditor?label=version&color=brightgreen)

## Über dieses Projekt

KERT XML/Md Editor ist eine Desktop-Anwendung, mit der Sie über eine grafische Benutzeroberfläche einfach XML- und Markdown-Dateien zur EPUB-Erstellung mit [KERT](https://github.com/quwano/KERT) erstellen und bearbeiten können.

Die Anwendung unterstützt das Erstellen und Bearbeiten von XML gemäß dem KERT-XML-Eingabeformat (`document_schema.xsd`) und ist intuitiv bedienbar – auch ohne XML-Kenntnisse.  
Außerdem können Sie im selben Bearbeitungsfenster Markdown (KERT Extended CommonMark Notation, `.md` / `.txt`) erstellen und bearbeiten.

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

### Wenn macOS eine „Malware"-Warnung zeigt und die App nicht öffnet oder löscht

Eine unsignierte, nicht notarisierte `.app` (ohne Apple Developer ID Notarization) kann je nach macOS-Version und dem Stand der Sicherheitsupdates beim ersten Start eine Warnung wie „„KERT XML-Md Editor.app" kann nicht geöffnet werden. Apple kann nicht bestätigen, dass diese App keine Malware enthält" anzeigen, den Start verweigern oder die App in den Papierkorb verschieben (ob dies auftritt, hängt von der macOS-Version ab).

Beim Ausführen von `npm run build:mac` werden nach dem Build automatisch das Quarantäne-Attribut entfernt und eine Ad-hoc-Signatur angewendet (`xattr -cr` und `codesign --deep --force --sign -`), sodass Sie die auf diesem Mac gebaute App in der Regel direkt starten können. Dies ist jedoch nur eine Best-Effort-Abhilfe für die lokale Verifizierung und besteht keine vollständige `spctl`-Prüfung. Wenn Sie die App auf einen anderen Mac übertragen oder weitergeben, wird dort erneut ein Quarantäne-Attribut gesetzt, und die gleiche Warnung kann wieder auftreten.

Falls die Warnung weiterhin erscheint, versuchen Sie Folgendes:

- Klicken Sie mit der rechten Maustaste (oder Control-Klick) auf die `.app`, wählen Sie „Öffnen" und bestätigen Sie im erscheinenden Dialog erneut mit „Öffnen"
- Führen Sie im Terminal Folgendes aus und starten Sie die App danach erneut

  ```bash
  xattr -cr "release/mac-arm64/KERT XML-Md Editor.app"
  codesign --deep --force --sign - "release/mac-arm64/KERT XML-Md Editor.app"
  ```

Für eine dauerhafte Verteilung an andere Macs reicht die obige Ad-hoc-Signatur nicht aus. Besorgen Sie sich ein Developer-ID-Zertifikat über das Apple Developer Program (99 $/Jahr), setzen Sie die Umgebungsvariablen `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` / `CSC_LINK` / `CSC_KEY_PASSWORD`, und der Build führt dann automatisch die vollständige Signierung und Notarization durch.

## Bedienung

### Dateioperationen
- Sie können neue Dokumente erstellen, Dateien laden, überschreiben und im XML- oder Markdown-Format (`.md` / `.txt`) speichern.
- Zum Speichern gibt es zwei getrennte Schaltflächen, „XML speichern" und „MD speichern", mit denen Sie das Speicherformat explizit wählen.
- Eine bereits gespeicherte oder geladene Datei kann über die Schaltfläche „Überschreiben" nach einem Bestätigungsdialog direkt zurückgeschrieben werden. Bei einem neuen Dokument ohne festgelegten Speicherort ist die Schaltfläche deaktiviert.
- Dateien können per Drag & Drop auf das Fenster geöffnet werden. Auch per Drag & Drop geöffnete Dateien können überschrieben werden.
- Beim Laden von XML wird eine Validierung gegen `document_schema.xsd` durchgeführt; nicht schemakonforme Dateien werden abgelehnt.
- Beim Erstellen eines neuen Dokuments, beim Öffnen einer Datei oder beim Schließen der App erscheint ein Bestätigungsdialog, falls ungespeicherte Änderungen vorliegen.

![Dateioperationen](docs/images/file_operations.png)

- Die letzte Aktion kann rückgängig gemacht und wiederholt werden (Rückgängig: `Cmd/Ctrl + Z`, Wiederholen: `Cmd/Ctrl + Umschalt + Z` oder `Ctrl + Y`).

![Rückgängig und Wiederholen](docs/images/undo_redo.png)

### GUI-Einstellungen

- Anzeigesprache wechseln (日本語 / English / Deutsch)
- Schriftgröße ändern (Small / Normal / Large / XLarge / Custom)
- Schriftart ändern

![Einstellungen](docs/images/config.png)

### Bearbeitung der Dokumentstruktur

- **Blöcke hinzufügen**: title1–title5 (Überschriften), p (Absätze), table (Tabellen) oder eine Formel als eigenständigen Block an beliebiger Position einfügen

![Block hinzufügen](docs/images/add_block.png)

![Dialog zum Hinzufügen](docs/images/block_list.png)

![Überschrift hinzufügen](docs/images/add_heading.png)

*Die horizontale Trennlinie erscheint, wenn Sie mit dem Mauszeiger in ihre Nähe kommen.*

![Blöcke](docs/images/blocks.png)

- **Überschriftenebene ändern**: Bei title1–title5-Blöcken kann die Ebene auch nachträglich über das Dropdown im Label-Bereich geändert werden
  
![Überschriftenebene ändern](docs/images/change_title_level.png)

- **Sortieren**: Das ⠿-Handle am linken Rand eines Blocks ziehen zum Neuanordnen, oder die ↑↓-Schaltflächen zum Verschieben verwenden
- **Löschen**: Nicht benötigte Blöcke entfernen

![Verschieben und Löschen](docs/images/move_and_delete.png)

### Rich-Text-Bearbeitung

- Beliebigen Text markieren und per Rechtsklick folgende Auszeichnungen anwenden oder entfernen:
  - **g** (Hervorhebung / Fettschrift)

![Hervorhebung](docs/images/emphasis.png)

  - **u** (Unterstreichung)

![Unterstreichung](docs/images/underline.png)

  - **frame** (Rahmen)
  - **sup** (Hochstellung)
  - **sub** (Tiefstellung)
  - **ruby** (Ruby-Annotation)

![Ruby 1](docs/images/ruby1.png)

![Ruby 2](docs/images/ruby2.png)

  - **yomikae** (Leseersetzung)

![Yomikae 1](docs/images/yomikae1.png)

![Yomikae 2](docs/images/yomikae2.png)

  - **img** (Bild einfügen)  
    - Zum Einfügen eines Bildes wählen Sie über die Schaltfläche „Durchsuchen..." eine Datei im Dateiauswahldialog. Beim Speichern wird der Bildpfad automatisch in einen relativen Pfad zum Speicherort umgewandelt (gilt für XML und Markdown gleichermaßen).


![Bild](docs/images/image1.png)

![Bild](docs/images/image2.png)


- Bei überlappenden Auszeichnungen wird die XML-Wohlgeformtheit automatisch sichergestellt.

### Formelbearbeitung

- Unterstützt die Formeleingabe über [MathLive](https://cortexjs.io/mathlive/).
- Es gibt zwei Arten von Formeln: „Inline-Formel", die im Fließtext eingefügt wird, und „Formelblock", ein eigenständiger Block.  
    - Inline-Formel
![Inline-Formel auswählen](docs/images/math_inline1.png)
![Inline-Formel eingeben](docs/images/math_inline2.png)
    - Formelblock
![Formelblock auswählen](docs/images/math_block1.png)
![Formelblock](docs/images/math_block2.png)
    - Gemeinsamer Eingabedialog für Inline- und Blockformeln
![Formel-Eingabedialog 1](docs/images/math1.png)
![Formel-Eingabedialog 2](docs/images/math2.png)

- Beim Speichern als XML werden Formeln als MathML 3.0 (`<math>`-Element) ausgegeben, beim Speichern als Markdown als LaTeX-Quelltext (`$...$`).

### Tabellenbearbeitung

- Zeilen und Spalten hinzufügen, löschen und neu anordnen
    - Ausgangszustand
![Tabelle Ausgangszustand](docs/images/table_initial.png)
    - Zeile ausgewählt
![Tabelle Zeilenauswahl](docs/images/table_row.png)
    - Spalte ausgewählt
![Tabelle Spaltenauswahl](docs/images/table_column.png)
- Kopfzeilen (th) hinzufügen und entfernen

## Zuordnungstabelle: Inhalte zu XML und Markdown

Das von dieser Anwendung verarbeitete XML entspricht dem mitgelieferten `document_schema.xsd`. Das Markdown-Speicherformat ist zudem ein CommonMark-Dialekt mit eigenen Erweiterungen (KERT Extended CommonMark Notation). Die Entsprechung zwischen dem XML-Tag und der Markdown-Syntax für jeden Block- bzw. Inline-Inhalt, den Sie im Editor hinzufügen können, ist wie folgt.

### Blockinhalte

| Block | XML-Tag | Markdown-Syntax |
|---|---|---|
| Überschrift (Ebene 1–5) | `<title1>`–`<title5>` | `#`–`#####` + Leerzeichen + Text |
| Absatz | `<p>` | Normale Textzeile |
| Tabelle | `<table>` / `<tr>` / `<th>` / `<td>` | GFM-Tabelle (`\| ... \| ... \|`) |
| Formelblock | `<math>...</math>` (MathML 3.0) | Eine `$$`-Zeile … Formel … eine `$$`-Zeile |

### Inline-Inhalte

| Inhalt | XML-Tag | Markdown-Syntax |
|---|---|---|
| Hervorhebung (fett) | `<g>Text</g>` | `**Text**` |
| Unterstreichung | `<u>Text</u>` | `[Text]{.underline}` |
| Rahmen | `<frame>Text</frame>` | `[Text]{.frame}` |
| Hochstellung | `<sup>Text</sup>` | `^Text^` |
| Tiefstellung | `<sub>Text</sub>` | `~Text~` |
| Ruby | `<ruby yomi="Lesung">Text</ruby>` | `[Text](-Lesung)` |
| Leseersetzung | `<yomikae yomi="Lesung">Text</yomikae>` | `[Text](+Lesung)` |
| Bild | `<img src="Pfad" alt="Alternativtext">` | `![Alternativtext](Pfad)` |
| Inline-Formel | `<math>...</math>` (MathML 3.0, inline) | `$Formel$` |

> **Zum MathML-Schema**  
> Formeln (das `<math>`-Element im Namensraum `http://www.w3.org/1998/Math/MathML`) werden von `document_schema.xsd` als Element definiert, das über `xs:import` das mitgelieferte `mathml3/` (W3C MathML 3.0 XML Schema) referenziert. Die interne Struktur von `<math>` wird bei der Validierung beim Laden nicht geprüft (die Formeleingabe/-bearbeitung übernimmt MathLive).

> **Zum Speichern von Formeln als MathML**  
> Beim Speichern als Markdown wird für Formeln nur der LaTeX-Quelltext (`$...$` / `$$...$$`) erhalten – das von MathLive erzeugte MathML selbst wird nicht gespeichert. Beim erneuten Öffnen einer Markdown-Datei und Bearbeiten einer Formel erzeugt MathLive das MathML erneut aus dem LaTeX-Quelltext.

> **Zum Escaping**  
> Wenn Sie `\` `*` `[` `$` `^` `~` in Markdown als normale Zeichen statt als Syntax verwenden möchten, escapen Sie sie mit einem vorangestellten `\` (z. B. `\*` → `*`).

## Autor

KUWANO KAZUYUKI

## Lizenz

Siehe [LICENSE_de.md](LICENSE_de.md).
