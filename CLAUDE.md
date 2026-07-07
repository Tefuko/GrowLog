@AGENTS.md
@../CLAUDE.md

## プロジェクト概要

- **GrowLog**: 植物の育成記録アプリ(個人開発)
- 技術スタック: Next.js 16(App Router)/ React 19 / TypeScript / Tailwind CSS 4 / Supabase(認証+DB)
- コマンド: `npm run dev`(開発サーバー)/ `npm run lint` / `npm run build`
- 構成: `src/app/login`(ログイン)、`src/app/(protected)`(認証必須: ホーム・plants・records)、`src/components`(UI部品)、`src/lib`(Supabaseクライアント等のユーティリティ)
- 環境変数は `.env.local`(Supabase接続情報)。**中身を読まない・表示しない・コミットしない。**

## このプロジェクトでの進め方

- コードの多くはAI主導で書かれたもの。ユーザーはこれを**自分で理解し、読みやすく育て直したい**。変更時は理由まで説明し、機会があれば読みやすさの改善も提案する。
- UI/デザイン(Tailwind)の改善に注力中。見た目の変更は、可能なら確認方法(開発サーバーでの見え方)もあわせて案内する。

## 改行コード（個人開発の標準ルール）

- 個人開発では改行コードを **LF** に統一する。
- Git設定: `core.autocrlf = input`（コミット時のみ CRLF→LF 変換、チェックアウト時は変換しない）。
- リポジトリに `.gitattributes` を置き、環境に依存せず LF を強制する:
