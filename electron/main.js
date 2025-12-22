const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const isDev = !app.isPackaged;
let mainWindow;
let discordClient = null;
let discordReady = false;

// 設定檔路徑
const settingsPath = () => path.join(app.getPath('userData'), 'config', 'settings.json');

async function readSettings() {
  try {
    const content = await fs.readFile(settingsPath(), 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: true,
    backgroundColor: '#0a0a0a'
  });

  mainWindow.removeMenu();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC Handlers

// 文件操作
ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result.filePaths;
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 服務器配置
ipcMain.handle('save-servers', async (event, servers) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config');
    await fs.mkdir(configPath, { recursive: true });
    
    const serversPath = path.join(configPath, 'servers.json');
    await fs.writeFile(serversPath, JSON.stringify(servers, null, 2));
    return { success: true, path: serversPath };
  } catch (error) {
    console.error('[save-servers] error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-servers', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config');
    const serversPath = path.join(configPath, 'servers.json');
    
    const content = await fs.readFile(serversPath, 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: [] };
    }
    return { success: false, error: error.message };
  }
});

// 模板操作
ipcMain.handle('export-template', async (event, template) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '匯出模板',
      defaultPath: `${template.name}.dsctemplate`,
      filters: [
        { name: 'Discord 模板', extensions: ['dsctemplate'] },
        { name: 'JSON', extensions: ['json'] }
      ]
    });
    
    if (filePath) {
      const data = {
        version: '1.0',
        exported: new Date().toISOString(),
        template
      };
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return { success: true, path: filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-template', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '匯入模板',
      filters: [
        { name: 'Discord 模板', extensions: ['dsctemplate', 'json'] }
      ],
      properties: ['openFile']
    });
    
    if (filePaths && filePaths[0]) {
      const content = await fs.readFile(filePaths[0], 'utf-8');
      const data = JSON.parse(content);
      return { success: true, template: data.template };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 設定操作
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const cfgDir = path.join(app.getPath('userData'), 'config');
    await fs.mkdir(cfgDir, { recursive: true });
    await fs.writeFile(settingsPath(), JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const settings = await readSettings();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Discord: 讀取伺服器頻道結構
async function ensureDiscord() {
  if (discordClient && discordReady) return discordClient;
  const fileSettings = await readSettings();
  const token = fileSettings.botToken || process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('缺少 DISCORD_BOT_TOKEN，或設定中的 botToken 未設定');
  }
  discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      discordClient.destroy().catch(() => {});
      discordClient = null;
      discordReady = false;
      reject(new Error('Discord 登入超時'));
    }, 15000);
    
    discordClient.once('ready', () => {
      clearTimeout(timeout);
      discordReady = true;
      resolve();
    });
    
    discordClient.once('error', (err) => {
      clearTimeout(timeout);
      discordClient.destroy().catch(() => {});
      discordClient = null;
      discordReady = false;
      reject(err);
    });
    
    discordClient.login(token).catch((err) => {
      clearTimeout(timeout);
      discordClient.destroy().catch(() => {});
      discordClient = null;
      discordReady = false;
      reject(err);
    });
  });
  return discordClient;
}

// Discord: 同步伺服器頻道結構（新增/更新，不刪除）
ipcMain.handle('sync-guild-structure', async (event, payload) => {
  try {
    const { guildId, categories = [] } = payload || {};
    if (!guildId) throw new Error('缺少 guildId');

    const client = await ensureDiscord();
    const guild = await client.guilds.fetch(guildId);
    if (!guild) throw new Error('找不到伺服器');

    const typeMap = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      announcement: ChannelType.GuildAnnouncement
    };
    // Discord 接受的 BASE_TYPE_CHOICES: {0,2,4,6,13,14,15,16}
    // 對應：文字/語音/分類/舊商店(降級用)/舞台/目錄/論壇/媒體
    const allowedTypes = new Set([0, 2, 4, 6, 13, 14, 15, 16]);

    const coll = await guild.channels.fetch();
    const all = Array.from(coll.values()).filter(Boolean);

    const categoryById = new Map();
    const categoryByName = new Map();
    all.filter(c => c.type === ChannelType.GuildCategory).forEach(cat => {
      categoryById.set(cat.id, cat);
      categoryByName.set(cat.name.toLowerCase(), cat);
    });

    const channelById = new Map();
    const channelByKey = new Map(); // key: name + parentId/null
    all.filter(c => c.type !== ChannelType.GuildCategory).forEach(ch => {
      channelById.set(ch.id, ch);
      const key = `${ch.name.toLowerCase()}::${ch.parentId || 'root'}`;
      channelByKey.set(key, ch);
    });

    const summary = {
      createdCategories: [],
      createdChannels: [],
      updatedChannels: [],
      deletedChannels: [],
      deletedCategories: [],
      skipped: [],
      deleteErrors: []
    };

    // 先處理分類（排除虛擬的 uncategorized）
    const realCategories = categories.filter(cat => cat.id !== 'uncategorized');
    console.log('[sync] payload categories:', categories.map(c => ({ id: c.id, name: c.name })));
    console.log('[sync] real categories to process:', realCategories.map(c => ({ id: c.id, name: c.name })));
    
    const categoryIdMap = new Map(); // localId -> guildCategory
    for (const cat of realCategories) {
      if (cat.id && categoryById.has(cat.id)) {
        categoryIdMap.set(cat.id, categoryById.get(cat.id));
        continue;
      }
      const byName = cat.name ? categoryByName.get(cat.name.toLowerCase()) : null;
      if (byName) {
        categoryIdMap.set(cat.id || byName.id, byName);
        continue;
      }

      // create new category
      const created = await guild.channels.create({
        name: cat.name || '未命名分類',
        type: ChannelType.GuildCategory
      });
      categoryIdMap.set(cat.id || created.id, created);
      summary.createdCategories.push({ name: created.name, id: created.id });
    }

    // 收集期望保留的分類 ID
    const desiredCategoryIds = new Set(Array.from(categoryIdMap.values()).map(c => c.id));
    console.log('[sync] desired category IDs to keep:', Array.from(desiredCategoryIds));
    console.log('[sync] existing category IDs:', all.filter(c => c.type === ChannelType.GuildCategory).map(c => ({ id: c.id, name: c.name })));

    // 然後處理頻道
    const desiredChannelKeys = new Set();
    for (const cat of categories) {
      // 如果是 uncategorized，parent 為 null
      if (cat.id === 'uncategorized') {
        const parentKey = 'root';
        for (const ch of cat.channels || []) {
          let desiredType = typeMap[ch.type] || ChannelType.GuildText;
          if (desiredType === ChannelType.GuildAnnouncement && !guild.features?.includes('NEWS')) {
            desiredType = ChannelType.GuildText;
          }
          if (!allowedTypes.has(desiredType)) {
            desiredType = ChannelType.GuildText;
          }
          const existingById = ch.id ? channelById.get(ch.id) : null;
          const existingByKey = channelByKey.get(`${(ch.name || '').toLowerCase()}::${parentKey}`);
          const target = existingById || existingByKey;
          
          desiredChannelKeys.add(`${(ch.name || '').toLowerCase()}::${parentKey}`);
          
          if (!target) {
            const created = await guild.channels.create({
              name: ch.name || '未命名頻道',
              type: desiredType,
              parent: undefined,
              topic: ch.topic || undefined
            });
            summary.createdChannels.push({ name: created.name, id: created.id, parent: '未分類' });
            continue;
          }
          
          const updates = [];
          if (target.name !== ch.name && ch.name) updates.push(target.setName(ch.name));
          if (typeof ch.topic === 'string' && target.topic !== ch.topic) updates.push(target.setTopic(ch.topic));
          if (target.parentId !== null) updates.push(target.setParent(null));
          await Promise.all(updates);
          summary.updatedChannels.push({ name: target.name, id: target.id });
        }
        continue;
      }
      const parent = categoryIdMap.get(cat.id) || null;
      const parentId = parent?.id || null;
      const parentKey = parentId || 'root';

      for (const ch of cat.channels || []) {
        let desiredType = typeMap[ch.type] || ChannelType.GuildText;
        // 若伺服器非社群，公告頻道不允許，降級為文字頻道
        if (desiredType === ChannelType.GuildAnnouncement && !guild.features?.includes('NEWS')) {
          desiredType = ChannelType.GuildText;
        }
        // 最終保障：若型別不在 BASE_TYPE_CHOICES，強制降級文字頻道
        if (!allowedTypes.has(desiredType)) {
          desiredType = ChannelType.GuildText;
        }
        const existingById = ch.id ? channelById.get(ch.id) : null;
        const existingByKey = channelByKey.get(`${(ch.name || '').toLowerCase()}::${parentKey}`);
        const target = existingById || existingByKey;

        // 紀錄期望存在的 key
        desiredChannelKeys.add(`${(ch.name || '').toLowerCase()}::${parentKey}`);

        if (!target) {
          // create
          const created = await guild.channels.create({
            name: ch.name || '未命名頻道',
            type: desiredType,
            parent: parentId || undefined,
            topic: ch.topic || undefined
          });
          summary.createdChannels.push({ name: created.name, id: created.id, parent: parent?.name || '未分類' });
          continue;
        }

        // update basic fields if changed
        const updates = [];
        if (target.name !== ch.name && ch.name) updates.push(target.setName(ch.name));
        if (typeof ch.topic === 'string' && target.topic !== ch.topic) updates.push(target.setTopic(ch.topic));
        if (parentId && target.parentId !== parentId) updates.push(target.setParent(parentId));
        await Promise.all(updates);
        summary.updatedChannels.push({ name: target.name, id: target.id });
      }
    }

    // 刪除不存在於 payload 的舊頻道（僅非分類）
    for (const ch of all.filter(c => c.type !== ChannelType.GuildCategory)) {
      const key = `${ch.name.toLowerCase()}::${ch.parentId || 'root'}`;
      if (!desiredChannelKeys.has(key)) {
        try {
          await ch.delete('Sync remove extra channel');
          summary.deletedChannels.push({ name: ch.name, id: ch.id });
        } catch (err) {
          console.error('[sync] delete channel failed', ch.id, ch.name, err);
          summary.deleteErrors.push({ kind: 'channel', name: ch.name, id: ch.id, error: err.message });
        }
      }
    }

    // 刪除不存在於 payload 的舊分類（同時會移除其子頻道）
    for (const cat of all.filter(c => c.type === ChannelType.GuildCategory)) {
      if (!desiredCategoryIds.has(cat.id)) {
        try {
          await cat.delete('Sync remove extra category');
          summary.deletedCategories.push({ name: cat.name, id: cat.id });
        } catch (err) {
          console.error('[sync] delete category failed', cat.id, cat.name, err);
          summary.deleteErrors.push({ kind: 'category', name: cat.name, id: cat.id, error: err.message });
        }
      }
    }

    return { success: true, summary };
  } catch (error) {
    if (error?.code === 50013 || /Missing Permissions/i.test(error?.message || '')) {
      return {
        success: false,
        error: '缺少權限：請在 Discord 給機器人「管理頻道」權限，並確認機器人已加入伺服器。'
      };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fetch-guild-structure', async (event, guildId) => {
  try {
    if (!guildId) throw new Error('缺少 guildId');
    const client = await ensureDiscord();
    let guild;
    try {
      guild = await client.guilds.fetch(guildId);
    } catch (fetchErr) {
      if (fetchErr.code === 10004 || fetchErr.message.includes('404')) {
        throw new Error(`Unknown Guild: 無法找到伺服器 ${guildId}。請確認機器人已加入該伺服器。`);
      }
      throw fetchErr;
    }
    if (!guild) throw new Error('Guild is null');
    const chColl = await guild.channels.fetch();
    const channels = Array.from(chColl.values()).filter(Boolean);

    const categoriesMap = new Map();
    channels
      .filter(c => c.type === ChannelType.GuildCategory)
      .sort((a,b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .forEach(cat => {
        categoriesMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          collapsed: false,
          channels: []
        });
      });

    const rootUncategorized = {
      id: 'uncategorized',
      name: '未分類',
      collapsed: false,
      channels: []
    };

    const typeMap = {
      [ChannelType.GuildText]: 'text',
      [ChannelType.GuildVoice]: 'voice',
      [ChannelType.GuildAnnouncement]: 'announcement'
    };

    channels
      .filter(c => c.type !== ChannelType.GuildCategory)
      .sort((a,b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .forEach(ch => {
        const mapped = {
          id: ch.id,
          name: ch.name,
          type: typeMap[ch.type] || 'text',
          topic: ch.topic || ''
        };
        const parentId = ch.parentId;
        if (parentId && categoriesMap.has(parentId)) {
          categoriesMap.get(parentId).channels.push(mapped);
        } else {
          rootUncategorized.channels.push(mapped);
        }
      });

    const categories = Array.from(categoriesMap.values());
    if (rootUncategorized.channels.length) categories.unshift(rootUncategorized);

    return { success: true, data: { categories, guildName: guild.name } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Discord: 測試 Token
ipcMain.handle('discord-test-token', async (event, token) => {
  let tempClient = null;
  try {
    const t = token || (await readSettings()).botToken || process.env.DISCORD_BOT_TOKEN;
    if (!t) throw new Error('未提供 Token');
    tempClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (tempClient) tempClient.destroy().catch(() => {});
        reject(new Error('登入超時，請檢查 Token 是否有效'));
      }, 10000); // 10秒超時
      
      tempClient.once('ready', () => {
        clearTimeout(timeout);
        if (tempClient) tempClient.destroy().catch(() => {});
        resolve({ success: true });
      });
      
      tempClient.once('error', (err) => {
        clearTimeout(timeout);
        if (tempClient) tempClient.destroy().catch(() => {});
        reject(err);
      });
      
      tempClient.login(t).catch((err) => {
        clearTimeout(timeout);
        if (tempClient) tempClient.destroy().catch(() => {});
        reject(err);
      });
    });
  } catch (error) {
    if (tempClient) {
      try { await tempClient.destroy(); } catch (e) {}
    }
    return { success: false, error: error.message };
  }
});

// 備份伺服器設定
ipcMain.handle('backup-server-config', async (event, server) => {
  try {
    if (!server) throw new Error('伺服器資料遺失');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${server.name || '伺服器'}_${timestamp}.json`;
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '備份伺服器設定',
      defaultPath: fileName,
      filters: [
        { name: '伺服器備份', extensions: ['json'] },
        { name: '所有檔案', extensions: ['*'] }
      ]
    });
    
    if (filePath) {
      const backupData = {
        version: '1.0',
        exported: new Date().toISOString(),
        server: {
          name: server.name,
          guildId: server.guildId,
          color: server.color,
          categories: server.categories || []
        }
      };
      
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
      return { success: true, path: filePath };
    }
    
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 應用生命週期
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
