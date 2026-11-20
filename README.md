# 《神狐天尊》小說網站

作者：糖加三勺

「玄墨仙宮」電影級暗黑仙俠視覺版。這是一套不依賴框架或資料庫的 GitHub Pages 靜態網站，章節用 Markdown 維護，建置時自動產生 JSON。小說規劃為四卷、400 章、100 萬字，完整長篇結構見 `STORY_BIBLE.md`。

## 本機預覽（VS Code）

需求：Python 3.10 以上，不需要安裝套件。

```bash
python3 scripts/build.py
python3 -m http.server 8000 -d dist
```

瀏覽器開啟 <http://localhost:8000>。停止預覽可在終端機按 `Control + C`。

## 新增與管理章節

在 `content/chapters/` 新增 Markdown，格式如下：

```md
---
number: 3
volume: 1
title: 第三章（請填正式章名）
date: 2026-11-20
excerpt: 首頁與搜尋結果使用的短摘要。
---

正文從這裡開始。
```

- `number` 是全書章號，必須從 1 開始連續，不可缺號或重複。
- `volume` 對應 `data/volumes.json` 的卷數。
- 最新章節永遠取全部章節中的最大 `number`。
- 建置失敗時會指出缺號、重複或不存在的卷數。
- 已收錄的章節是正式開篇；後續依 `STORY_BIBLE.md` 的四卷章綱續寫。

## 卷冊與人物誌

- 卷名、篇名與封面路徑：`data/volumes.json`
- 人物資料：`data/characters.json`

人物格式：

```json
[
  {
    "name": "角色姓名",
    "role": "身分／陣營",
    "summary": "簡短介紹"
  }
]
```

目前人物檔已收錄令神狐、凌天宇、拿離與童俞四位核心人物。

## GitHub Pages 自動部署

專案已包含 `.github/workflows/pages.yml`。推送到 GitHub 的 `main` 分支後：

1. 到 GitHub 倉庫的 **Settings → Pages**。
2. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
3. 回到 **Actions** 查看 `Deploy GitHub Pages`；完成後會顯示公開網址。

之後每次推送 Markdown 或網站修改，GitHub Actions 都會重新建置 JSON 並發布。

## 專案結構

```text
content/chapters/       Markdown 小說章節
data/                   卷冊與人物資料
site/                   前端版面、互動與圖像
scripts/build.py        靜態建置與章號驗證
dist/                   建置結果（不進 Git）
.github/workflows/      GitHub Pages 自動部署
```

## 已實作功能

- 玄墨仙宮大幅主視覺與三張專屬卷封
- 卷數卡片首頁、章目與傳統連續閱讀
- 全書連續編號驗證、最大章號作為最新章節
- 章名與正文搜尋
- 空白起始的角色圖鑑
- 玄夜／宣紙／系統模式、字級與行距設定
- 手機、平板與桌面響應式排版
- 捲動揭示、書封 hover、閱讀進度等克制動效
- GitHub Actions 自動產生 JSON 並部署 Pages

## 圖像

主視覺與卷封為本專案專屬生成素材；圖片內不含文字、角色或故事設定，可自由替換而不影響建置流程。
