# Mini Filter Camera

一個可部署到 GitHub Pages 的 React + CSS 濾鏡相機 PWA，重點是手機安裝、前後鏡頭切換、手電筒控制與大量濾鏡預設。

## 功能

- React + Vite 架構，適合靜態部署到 GitHub Pages
- PWA 安裝能力，支援離線快取與主畫面安裝
- 32 組預設濾鏡，另有 8 組可手動微調的影像參數
- 前鏡頭 / 後鏡頭切換、實際裝置選擇與畫質模式切換
- 1.0x 到 4.0x 的數碼放大，預覽與拍照輸出一致
- 支援手電筒能力偵測與切換（需裝置與瀏覽器支援）
- 拍照時會把目前濾鏡一起輸出為 JPEG 並自動下載
- 內建 PWA 手機權限指引，協助使用者在安裝後重新開啟相機權限

## 開發

```bash
npm install
npm run dev
```

## 品質檢查

```bash
npm run lint
npm run build
```

## GitHub Pages 部署

此專案已支援 GitHub Pages 的 project site 與自訂 base path：

- 預設會自動使用目前資料夾名稱作為 base path，適合 repository 名稱與專案資料夾一致的情況
- 在 GitHub Actions 內，會自動讀取 `GITHUB_REPOSITORY` 推導出正確的 Pages base path
- 若 repository 名稱不同，或你要部署到子路徑，可用 `VITE_PUBLIC_BASE` 覆寫

### 自動部署到 github.io

專案已包含 [deploy.yml](.github/workflows/deploy.yml) workflow。推送到 `main` 分支後，可在 GitHub repository 設定中：

1. 開啟 `Settings -> Pages`
2. 將 `Build and deployment` 設為 `GitHub Actions`
3. 推送到 `main` 後等待 workflow 完成

此流程使用一般 Git 與 GitHub Actions，不需要 Git LFS，也不需要手動維護 `gh-pages` 分支。

若目前 GitHub Pages 仍設定為讀取 `main` 分支根目錄，請先執行一次 `npm run build`，再把根目錄產生的 `index.html`、`assets/`、`manifest.webmanifest`、`sw.js` 與 `workbox-*.js` 一起提交到 `main`。本專案已針對這種 main-root 部署模式做相容處理。

完成後，專案會部署到：

- `https://<你的帳號>.github.io/<repository-name>/`
- 若 repository 名稱本身就是 `<你的帳號>.github.io`，系統會自動使用根路徑部署到 `https://<你的帳號>.github.io/`

### 本機建置驗證

```bash
npm run build
```

若 repository 名稱與目前資料夾不同，請先指定 base path 後再建置驗證：

```bash
VITE_PUBLIC_BASE=/你的-repository-name/ npm run build
```

## 裝置注意事項

- iOS Safari 與部分 Android 瀏覽器對 torch API 支援有限，按鈕會在能力不足時自動停用
- 前鏡頭與後鏡頭可用性取決於實體裝置
- PWA 安裝到手機後，仍必須由使用者在系統或瀏覽器中允許相機權限，網頁無法直接替使用者強制開啟權限
- 第一次使用必須手動點擊啟動相機，讓瀏覽器在使用者互動後請求權限
