#!/usr/bin/env node

/**
 * 測試伺服器持久化
 * 檢查 userData 目錄中的 servers.json 是否正確保存
 */

const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');

async function testPersistence() {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config');
    const serversPath = path.join(configPath, 'servers.json');
    
    console.log('userData 路徑:', userDataPath);
    console.log('配置路徑:', configPath);
    console.log('伺服器檔案路徑:', serversPath);
    
    // 檢查檔案是否存在
    try {
      const content = await fs.readFile(serversPath, 'utf-8');
      const data = JSON.parse(content);
      console.log('✅ 檔案存在，包含伺服器數:', data.length);
      console.log('詳細資訊:', JSON.stringify(data, null, 2));
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('⚠️  servers.json 不存在（首次運行）');
      } else {
        console.error('❌ 讀取檔案失敗:', err.message);
      }
    }
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

module.exports = { testPersistence };
