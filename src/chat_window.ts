import { CHAT_WINDOW_CLASS } from './constants';
import { initChat } from './chat';

function handleMessage(event: MessageEvent) {
  if (event.data.action === 'closeChat') {
    window.parent.postMessage({ action: 'closeChat' }, '*');
  } else if (event.data.action === 'summarizeText') {
    const text = decodeURIComponent(event.data.text).replace(/\\n/g, '\n');
    const $chatInput = document.querySelector('.chat-input') as HTMLTextAreaElement;
    const $chatSendButton = document.querySelector('.chat-send-button') as HTMLButtonElement;
    if ($chatInput && $chatSendButton) {
      $chatInput.value = `Briefly summarize the following text:\n\n\`\`\`\n${text}\n\`\`\``;
      $chatSendButton.click();
    } else {
      console.warn('Chat input or send button not found.');
    }
  } else if (event.data.action === 'explainText') {
    const text = decodeURIComponent(event.data.text).replace(/\\n/g, '\n');
    const $chatInput = document.querySelector('.chat-input') as HTMLTextAreaElement;
    const $chatSendButton = document.querySelector('.chat-send-button') as HTMLButtonElement;
    if ($chatInput && $chatSendButton) {
      $chatInput.value = `Please explain the following text in detail:\n\n\`\`\`\n${text}\n\`\`\``;
      $chatSendButton.click();
    } else {
      console.warn('Chat input or send button not found.');
    }
  }
}

function initChatWindow() {
  const $chatContainer = document.getElementById('chat-container');
  if ($chatContainer) {
    $chatContainer.className = CHAT_WINDOW_CLASS;
    initChat($chatContainer);
  }
}

window.addEventListener('message', handleMessage);
document.addEventListener('DOMContentLoaded', initChatWindow);
