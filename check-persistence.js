/**
 * 檢查並打印 Discord Server Manager 的數據持久化狀態
 * 在開發時用於調試
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

function checkPersistence() {
  try {
    // Electron 應用的 userData 路徑
    // 通常是: C:\Users\<username>\AppData\Roaming\discord-server-manager
    const userDataPath = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'discord-server-manager'
    );

    const configPath = path.join(userDataPath, 'config');
    const serversPath = path.join(configPath, 'servers.json');
    const settingsPath = path.join(configPath, 'settings.json');

    console.log('\n📁 Discord Server Manager 數據位置：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`userData:  ${userDataPath}`);
    console.log(`config:    ${configPath}`);
    console.log(`servers:   ${serversPath}`);
    console.log(`settings:  ${settingsPath}`);

    console.log('\n📊 文件狀態：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 檢查 config 目錄
    if (fs.existsSync(configPath)) {
      console.log('✅ config 目錄存在');
    } else {
      console.log('❌ config 目錄不存在');
    }

    // 檢查 servers.json
    if (fs.existsSync(serversPath)) {
      const content = fs.readFileSync(serversPath, 'utf-8');
      const data = JSON.parse(content);
      console.log(`✅ servers.json 存在 (${content.length} 字節)`);
      console.log(`   包含 ${data.length} 個伺服器`);
      if (data.length > 0) {
        data.forEach((server, idx) => {
          console.log(`   [${idx}] ${server.name} (Guild: ${server.guildId})`);
        });
      }
    } else {
      console.log('❌ servers.json 不存在（首次運行或數據遺失）');
    }

    // 檢查 settings.json
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const data = JSON.parse(content);
      console.log(`✅ settings.json 存在`);
      console.log(`   Bot Token: ${data.botToken ? '已設置' : '未設置'}`);
    } else {
      console.log('❌ settings.json 不存在');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

if (require.main === module) {
  checkPersistence();
}

module.exports = { checkPersistence };
