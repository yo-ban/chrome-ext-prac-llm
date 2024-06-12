chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'summarizeText',
    title: 'Summarize Text',
    contexts: ['selection'],
  }, () => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    }
  });

  chrome.contextMenus.create({
    id: 'explainText',
    title: 'Explain Text',
    contexts: ['selection'],
  }, () => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    }
  });

});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'summarizeText' && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'summarizeText', text: info.selectionText }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
    });
  } else if (info.menuItemId === 'explainText' && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'explainText', text: info.selectionText }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
    });
  }

});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getCurrentTabUrl') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        sendResponse({ url: tabs[0].url });
      } else {
        sendResponse({ url: null });
      }
    });
    return true;
  } else if (request.action === 'updateContext') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateContext' }, (response) => {
          if (response && response.status === 'success') {
            sendResponse({ status: 'success' });
          } else {
            sendResponse({ status: 'error', error: response ? response.error : 'Unknown error' });
          }
        });
      } else {
        sendResponse({ status: 'error', error: 'No active tab found' });
      }
    });
    return true;
  }
  return false;
});

export {};
