# Discord Server Manager

視覺化的 Discord 頻道結構管理工具，基於 Electron + Vue + Vuetify。支援匯入/匯出模板、同步伺服器頻道（新增/更新/刪除）、備份設定，讓多人協作管理更直覺。
<img width="1722" height="1107" alt="image" src="https://github.com/user-attachments/assets/4f2929b4-1a9e-4447-bf8a-35a1701ba925" />

## 功能亮點
- 圖形化編輯分類與頻道（文字、語音、公告等）
- 一鍵同步到 Discord：新增、更新、刪除頻道與分類
- 從伺服器讀取現有結構，作為編輯起點
- 模板匯出/匯入（.dsctemplate / JSON）
- 伺服器設定備份與還原
- 權限與型別保護：自動降級不允許的類型、回報刪除失敗原因

## 系統需求
- Node.js 18+（建議 LTS）
- Discord Bot Token，且機器人已加入目標伺服器
- Bot 需要的最低權限：Manage Channels（管理頻道）

## 快速開始
1) 安裝依賴
```bash
npm install
```

2) 設定環境變數（或在設定頁輸入 Token）
在專案根目錄建立 `.env`：
```bash
DISCORD_BOT_TOKEN=你的_bot_token
```

3) 開發模式（含 Electron）
```bash
npm start
```
這會同時啟動 Vite 與 Electron。若只想跑前端：
```bash
npm run dev
```

4) 打包應用
```bash
npm run electron:build
```
產物會出現在 `dist/`（依 electron-builder 設定）。

## 使用流程
1) 開啟應用後，先在「設定」填入 Discord Bot Token。
2) 「連接伺服器」：輸入 Guild ID，讀取現有結構做為起點。
3) 在左側列表選擇伺服器，於畫面中編輯分類/頻道（可拖曳排序）。
4) 需要重複使用的結構可透過「模板庫」匯出/匯入。
5) 完成後點「同步」：
   - 若本地有而伺服器沒有 → 會新增。
   - 若伺服器有但不在本地 → 會刪除（含分類與其子頻道）。
   - 型別不合法或權限不足會在彙總訊息中提示。
6) 建議定期使用「備份」保存伺服器設定檔以便還原。

## 注意事項
- 若伺服器未開啟「社群」，公告頻道會自動降級為文字頻道。
- 一些系統頻道可能無法刪除；同步完成彙總會顯示失敗項目數量。
- 「未分類」是前端虛擬分類，不會作為 Discord 真實分類建立。

## 常見問題
- **Unknown Guild / 404**：確認 Bot 已加入伺服器，Guild ID 是否正確。
- **Missing Permissions**：於伺服器給 Bot「管理頻道」權限，並確認它的角色排序在目標頻道之上。
- **同步無變化**：確認已點擊「同步」，且前端的變更已保存於當前伺服器項目中。

## 技術棧
- Electron, Vue 3, Vite, Vuetify
- discord.js 14
- electron-builder

## 授權
MIT License.
