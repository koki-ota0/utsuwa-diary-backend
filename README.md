# utsuwa-diary-backend

器（うつわ）や生活雑貨を記録・管理するためのWebアプリケーションです。

## 機能

- ユーザー認証（メール/パスワード）
- アイテム登録・一覧・削除
- アイテムごとに最大3枚の写真をアップロード
- 使用履歴の記録と統計

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **バックエンド/DB**: Supabase（認証、PostgreSQL、ストレージ）
- **ルーティング**: React Router v6

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、Supabaseの情報を設定します。

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabaseの設定

Supabaseプロジェクトで以下を設定してください：

1. **認証**: メール認証を有効化
2. **データベース**: `supabase_backend_design.md` に記載のテーブルを作成
3. **ストレージ**: `item-photos` バケットを作成（非公開）
4. **RLS**: 各テーブルにRow Level Securityポリシーを適用

詳細は以下のドキュメントを参照：
- `supabase_backend_design.md` - データベース設計
- `SUPABASE_STORAGE_ITEM_PHOTOS.md` - ストレージポリシー

## 開発

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
```

## プロジェクト構成

```
src/
├── api/          # データアクセス関数（items CRUD）
├── examples/     # 認証フローの実装例
├── lib/          # ユーティリティ
│   ├── supabase.ts         # Supabaseクライアント
│   ├── itemPhotoUpload.ts  # 写真アップロード
│   └── usageLogs.ts        # 使用履歴
└── types/        # TypeScript型定義
```

## データベース構成

| テーブル | 説明 |
|---------|------|
| `profiles` | ユーザープロフィール（auth.usersと1:1） |
| `items` | 登録アイテム（器、キッチン用品、生活雑貨） |
| `item_photos` | アイテムの写真メタデータ（最大3枚/アイテム） |
| `usage_logs` | 使用履歴 |

全テーブルでRLS（Row Level Security）が有効化されており、ユーザーは自分のデータのみアクセス可能です。
