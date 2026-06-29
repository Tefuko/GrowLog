@AGENTS.md

## 改行コード（個人開発の標準ルール）

- 個人開発では改行コードを **LF** に統一する。
- Git設定: `core.autocrlf = input`（コミット時のみ CRLF→LF 変換、チェックアウト時は変換しない）。
- リポジトリに `.gitattributes` を置き、環境に依存せず LF を強制する:
