import { CHAT_BUTTON_CLASS, CHAT_WINDOW_CLASS } from './constants';

function createChatButton() {
  const $chatButton = document.createElement('div');
  $chatButton.className = CHAT_BUTTON_CLASS;
  return $chatButton;
}

function createChatWindow() {
  const $chatWindow = document.createElement('div');
  $chatWindow.className = CHAT_WINDOW_CLASS;
  $chatWindow.style.display = 'none';
  $chatWindow.innerHTML = `
    <iframe src="${chrome.runtime.getURL('chat.html')}" style="width: 100%; height: 100%; border: none;"></iframe>
  `;
  return $chatWindow;
}

function toggleChatWindow($chatWindow: HTMLElement, $chatButton: HTMLElement) {
  if ($chatWindow.style.display === 'none') {
    $chatWindow.style.display = 'block';
    $chatButton.classList.add('open');
  } else {
    $chatWindow.style.display = 'none';
    $chatButton.classList.remove('open');
  }
}

async function getFullContext(url: string): Promise<string> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`);
    const text = await response.text();
    const cleanedText = removeImageTags(text);
    return cleanedText;
  } catch (error) {
    console.error('Error fetching full context:', error);
    return '';
  }
}

function removeImageTags(text: string): string {
  return text.replace(/!\[.*?\]\(.*?\)/g, '');
}

function getVisibleText() {
  const elements = document.querySelectorAll('body *');
  const visibleElements = Array.from(elements).filter(isElementInViewport);

  // テキストの重複を削除する
  const uniqueElements = new Set(visibleElements);

  // 意味のある塊（段落、リスト項目など）ごとにテキストを取得する
  const meaningfulElements = Array.from(uniqueElements).filter((element) => {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'p' ||
      tagName === 'h1' ||
      tagName === 'h2' ||
      tagName === 'h3' ||
      tagName === 'h4' ||
      tagName === 'h5' ||
      tagName === 'h6' ||
      tagName === 'li'
    );
  });

  // HTML構造を利用してテキストを取得する
  const visibleText = meaningfulElements
    .map((element) => {
      // 子要素のテキストを再帰的に取得する
      const getInnerText = (el: Element): string => {
        if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
          return el.textContent?.trim() || '';
        }

        return Array.from(el.childNodes)
          .map((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              return child.textContent?.trim() || '';
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              return getInnerText(child as Element);
            }
            return '';
          })
          .join(' ');
      };

      return getInnerText(element);
    })
    .join('\n');

  return visibleText;
}

function isElementInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function setContext(text: string) {
  chrome.storage.local.set({ context: text }, () => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    }
  });
}

const contextCache: { [url: string]: string } = {};

async function getCurrentTabUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getCurrentTabUrl' }, (response) => {
      resolve(response.url);
    });
  });
}

async function updateContext() {
  const includeFullContext = await shouldIncludeFullContext();

  if (includeFullContext) {
    const url = await getCurrentTabUrl();

    if (url) {
      if (contextCache[url]) {
        setContext(contextCache[url]);
        console.log("load content from cache")
        
        chrome.runtime.sendMessage({ action: 'contextUpdated' });
      } else {
        const fullContext = await getFullContext(url);
        contextCache[url] = fullContext;
        setContext(fullContext);

        console.log("load content")

        chrome.runtime.sendMessage({ action: 'contextUpdated' });
      }
    }
  }
}

async function shouldIncludeFullContext(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['includeFullContext'], (data) => {
      resolve(data.includeFullContext || false);
    });
  });
}

async function shouldIncludeVisibleText(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['includeVisibleText'], (data) => {
      resolve(data.includeVisibleText !== false);
    });
  });
}

async function handleMessage(event: MessageEvent, $chatWindow: HTMLElement, $chatButton: HTMLElement) {
  if (event.data.action === 'closeChat') {
    $chatWindow.style.display = 'none';
    $chatButton.classList.remove('open');
  }

  if (event.data.action === 'openChat') {
    $chatWindow.style.display = 'block';
    $chatButton.classList.add('open');
  }

  if (event.data.action === 'updateContext') {
    await updateContext();
  }
}

function sendMessageToChatIframe(action: string, text: string, sendResponse: (response?: any) => void, $chatWindow: HTMLElement) {
  const $chatIframe = $chatWindow.querySelector('iframe') as HTMLIFrameElement;

  if ($chatIframe && $chatIframe.contentWindow) {
    $chatIframe.contentWindow.postMessage({ action, text: encodeURIComponent(text.replace(/\n/g, '\\n')) }, '*');
    sendResponse({ status: 'success' });
  } else {
    console.warn('Chat iframe not found or accessible.');
    sendResponse({ status: 'error', message: 'Chat iframe not found or accessible.' });
  }
}

function handleRuntimeMessage(request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void, $chatWindow: HTMLElement) {
  console.log('Message received:', request);
  if (request.action === 'updateContext') {
    updateContext()
      .then(() => sendResponse({ status: 'success' }))
      .catch((error) => sendResponse({ status: 'error', error: error.message }));
    return true;
  }
  if (request.action === 'summarizeText' || request.action === 'explainText') {
    const text = request.text;

    if ($chatWindow.style.display === 'none') {
      window.parent.postMessage({ action: 'openChat' }, '*');
      setTimeout(() => {
        sendMessageToChatIframe(request.action, text, sendResponse, $chatWindow);
      }, 100);
    } else {
      sendMessageToChatIframe(request.action, text, sendResponse, $chatWindow);
    }
  }

  return true;
}

// Initialize
const $body = document.querySelector('body');
const $chatButton = createChatButton();
const $chatWindow = createChatWindow();

if ($body) {
  $body.appendChild($chatButton);
  $body.appendChild($chatWindow);
}

$chatButton.addEventListener('click', () => toggleChatWindow($chatWindow, $chatButton));
window.addEventListener('message', (event) => handleMessage(event, $chatWindow, $chatButton));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => handleRuntimeMessage(request, sender, sendResponse, $chatWindow));

window.addEventListener('scroll', async () => {
  const includeVisibleText = await shouldIncludeVisibleText();
  const includeFullContext = await shouldIncludeFullContext();

  if (includeVisibleText && !includeFullContext) {
    const visibleText = getVisibleText();
    setContext(visibleText);
  }
});