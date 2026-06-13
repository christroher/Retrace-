// ===== Retrace · Background Service Worker =====

let sidebarOpen = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  console.log('Retrace: 扩展已安装');
});

// Click icon or Ctrl+Shift+H → toggle sidebar
chrome.action.onClicked.addListener(async (tab) => {
  if (sidebarOpen) {
    chrome.sidePanel.setOptions({ enabled: false });
    chrome.sidePanel.setOptions({ enabled: true });
    sidebarOpen = false;
  } else {
    await chrome.sidePanel.open({ tabId: tab.id });
    sidebarOpen = true;
  }
});

// Ctrl+Shift+R → toggle sidebar
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-sidebar') {
    if (sidebarOpen) {
      chrome.sidePanel.setOptions({ enabled: false });
      chrome.sidePanel.setOptions({ enabled: true });
      sidebarOpen = false;
    } else {
      await chrome.sidePanel.open({ tabId: tab.id });
      sidebarOpen = true;
    }
  }
});

// Track sidebar open/close via sidePanel lifecycle
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidebar') {
    sidebarOpen = true;
    port.onDisconnect.addListener(() => { sidebarOpen = false; });
  }
});

// 监听标签页关闭事件，通知侧边栏刷新历史记录
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 通知所有连接的侧边栏刷新历史记录
  chrome.runtime.sendMessage({ type: 'tab-closed', tabId });
});

// 监听历史记录变化，通知侧边栏刷新
chrome.history.onVisited.addListener((historyItem) => {
  chrome.runtime.sendMessage({ type: 'history-updated', url: historyItem.url });
});
