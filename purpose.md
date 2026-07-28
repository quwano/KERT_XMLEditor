# 本プロジェクトの目的

XMLドキュメント編集用のGUIエディタ。加えて、Markdown（KERT Extended CommonMark Notation）ドキュメントの編集にも対応する。

# ソースコードの再利用について（双方向）

本プロジェクトと `/Users/kazuyuki/WebstormProjects/KERT_MDEditor` は、UI・保存規約・Slate.js実装パターンを共有する姉妹プロジェクトである。

- KERT_MDEditor 側の `purpose.md` により、KERT_XMLEditor のソースコードは KERT_MDEditor 内で自由に再利用してよいと既に定められている。
- これに加え、本プロジェクト（KERT_XMLEditor）でも KERT_MDEditor のソースコードを参照・移植（コピーして書き直す）してよい。

## 重要な制約（絶対に破ってはならない）

**KERT_MDEditor 自体のファイルは、いかなる目的であっても一切変更してはならない。** KERT_MDEditor は本プロジェクトから見て「参照専用（read-only）」のソースであり、コードを読む・参考にして書き直すことのみが許可される。KERT_MDEditor のリポジトリに対する書き込み・編集・削除は、明示的な追加の許可なしに行ってはならない。

# 数式入力について

数式（math-inline / math-block）の入力GUIは `/Users/kazuyuki/WebstormProjects/MathEditor` が使用している MathLive（`<math-field>` Web Component, MIT License）を再利用する。MathEditor 自体のファイルも同様に参照専用であり、変更してはならない。

MathLive の `<math-field>` から入力時に LaTeX と MathML（3.0 Presentation Markup）を同時に取得し、両方を内部データとして保持する。Markdown 保存時は LaTeX を、XML 保存時は MathML（生の `<math>` 要素）を使用する。

# XML側でのframe・math-inline・math-blockの表現

- `frame` マーク: `<g>`・`<u>` などと同様に、rich_text 型の1つとして `<frame>...</frame>` で表現する。
- `math-inline` / `math-block`: 新しいタグ名を発明せず、生のMathML `<math xmlns="http://www.w3.org/1998/Math/MathML">...</math>` 要素をそのまま埋め込む。これは KERT（`/Users/kazuyuki/PycharmProjects/DaisyTrial`）側の既存処理（`_replace_math_with_yomikae()` による音声読み上げ変換、`*:math` テンプレートによる表示）と噛み合わせるための意図的な選択である。

## 既知の残課題（KERT_XMLEditor 側のスコープ外）

`frame` タグに対応するXSLTテンプレート（`resources/xml_to_xhtml.xsl` ・ `resources/xml_to_audio_txt.xsl`）は、KERT（DaisyTrial）側に未実装。現状 `<frame>` を含むXMLをKERTに渡すと、音声変換時に該当テキストが無音化する。この対応はDaisyTrial側の別作業として行う（本プロジェクトの実装セッションでは対応しない）。
