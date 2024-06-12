import { createApiClient } from './api/apiClient';
import { sendMessage } from './api/sendMessage';
import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
// import { countTokens } from '@anthropic-ai/tokenizer';

let chatHistory: { role: 'user' | 'assistant'; content: string }[] = [];
let autoScroll = true;
let isWaitingForResponse = false;

async function handleSendMessage($chatMessages: HTMLElement, $chatInput: HTMLTextAreaElement) {
  if (isWaitingForResponse) {
    return;
  }

  const message = $chatInput.value;
  if (message.trim() !== '') {
    await appendUserMessage($chatMessages, message);
    chatHistory.push({ role: 'user', content: message });
    $chatInput.value = '';

    const $typingIndicator = createTypingIndicator();
    $chatMessages.appendChild($typingIndicator);

    const { apiName, apiKey, language, systemPrompt, maxTokens, model, maxMessageTokens, maxContextTokens } = await getOptions();
    const apiClient = await createApiClient(apiName, apiKey);
  
    isWaitingForResponse = true;
  
    let assistantMessageText = '';


    const includeFullContext = await shouldIncludeFullContext();

    if (includeFullContext) {
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ action: 'updateContext' }, (response) => {
          if (response.status === 'success') {
            resolve();
          } else {
            console.error('Failed to update context:', response.error);
            resolve();
          }
        });
      });
    }

    const context = await getContext();
    // console.log(context);

    // メッセージの長さを制限
    let trimmedChatHistory = [];
    let messageTokens = systemPrompt.length;
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      const messageLength = message.content.length;
      if (messageTokens + messageLength <= maxMessageTokens) {
        messageTokens += messageLength;
        trimmedChatHistory.unshift(message);
      } else {
        break;
      }
    }

    // コンテキストの長さを制限
    let trimmedContext = context;
    if (context.length > maxContextTokens) {
      const contextParts = context.split('\n');
      let contextTokens = 0;
      let trimmedContextParts = [];
      for (let i = contextParts.length - 1; i >= 0; i--) {
        const part = contextParts[i];
        const partLength = part.length;
        if (contextTokens + partLength <= maxContextTokens) {
          contextTokens += partLength;
          trimmedContextParts.unshift(part);
        } else {
          break;
        }
      }
      trimmedContext = trimmedContextParts.join('\n');
    }

    let fixedSystemPrompt = '';
    if (!trimmedContext) {
      fixedSystemPrompt = `# Instructions:\n${systemPrompt}\n\n# Response Language: ${language}` 
    } else { 
      fixedSystemPrompt = `# Instructions:\n${systemPrompt}\n\n# Context\n${trimmedContext}\n\n# Response Language: ${language}` 
    }
    
    const stream = await sendMessage(
      apiClient,
      apiName,
      trimmedChatHistory,
      maxTokens,
      model,
      fixedSystemPrompt  
    );

    console.log(apiName)
  
    switch (apiName) {
      case 'anthropic':
        stream
          .on('text', async (text: string) => {
            assistantMessageText += text;
            await displayAssistantMessage($chatMessages, $typingIndicator, assistantMessageText);
          })
          .on('contentBlock', (contentBlock: Anthropic.ContentBlock) => {
            chatHistory.push({ role: 'assistant', content: contentBlock.text });
          })
          .on('end', async () => {
            const $assistantMessage = document.querySelector('.chat-message.assistant:last-child') as HTMLElement;
            await appendTimestampAndCopyButton($assistantMessage, assistantMessageText);
            isWaitingForResponse = false;
          });
  
        await stream.finalMessage();
        break;
      case 'cohere':
        for await (const chat of stream) {
          if (chat.eventType === 'text-generation') {
            assistantMessageText += chat.text;
            await displayAssistantMessage($chatMessages, $typingIndicator, assistantMessageText);
          }
        }
        chatHistory.push({ role: 'assistant', content: assistantMessageText });
        const $assistantMessage = document.querySelector('.chat-message.assistant:last-child') as HTMLElement;
        await appendTimestampAndCopyButton($assistantMessage, assistantMessageText);
        isWaitingForResponse = false;
        break;
      default:
        throw new Error(`Unsupported API: ${apiName}`);
    }
  }
}

function createTypingIndicator() {
  const $typingIndicator = document.createElement('div');
  $typingIndicator.className = 'typing-indicator';
  $typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  return $typingIndicator;
}

export async function initChat($container: HTMLElement) {
  const $chatMessages = $container.querySelector('.chat-messages') as HTMLElement;
  const $chatInput = $container.querySelector('.chat-input') as HTMLTextAreaElement;
  const $chatSendButton = $container.querySelector('.chat-send-button') as HTMLButtonElement;
  const $scrollToBottomButton = $container.querySelector('.scroll-to-bottom-button') as HTMLButtonElement;
  const $closeButton = $container.querySelector('.close-button') as HTMLButtonElement;
  const $settingsContainer = $container.querySelector('.settings-container') as HTMLElement;
  const $settingsButton = $container.querySelector('.settings-button') as HTMLButtonElement;
  const $clearChatButton = $container.querySelector('.clear-chat-button') as HTMLButtonElement;

  $chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage($chatMessages, $chatInput);
    }
  });

  $chatSendButton.addEventListener('click', () => handleSendMessage($chatMessages, $chatInput));

  $scrollToBottomButton.addEventListener('click', () => {
    $chatMessages.scrollTop = $chatMessages.scrollHeight;
  });

  $chatMessages.addEventListener('scroll', () => {
    if ($chatMessages.scrollTop + $chatMessages.clientHeight < $chatMessages.scrollHeight - 50) {
      autoScroll = false;
      $scrollToBottomButton.classList.add('show');
    } else {
      autoScroll = true;
      $scrollToBottomButton.classList.remove('show');
    }
  });

  $closeButton.addEventListener('click', () => {
    window.parent.postMessage({ action: 'closeChat' }, '*');
  });

  $settingsButton.addEventListener('click', () => {
    $settingsContainer.classList.toggle('open');
  });

  $clearChatButton.addEventListener('click', () => {
    chatHistory = [];
    $chatMessages.innerHTML = '';
    $settingsContainer.classList.remove('open');
    $scrollToBottomButton.classList.remove('show');
  });
}

async function appendUserMessage($container: HTMLElement, message: string) {
  const $messageElement = document.createElement('div');
  $messageElement.className = 'chat-message user';

  const $messageContent = document.createElement('div');
  $messageContent.className = 'message-content';
  $messageContent.innerHTML = sanitizeHtml(await marked(message, {
    breaks: true,
    gfm: true,
  }));

  $messageElement.appendChild($messageContent);
  $container.appendChild($messageElement);

  await appendTimestampAndCopyButton($messageElement, message, false);
}

async function displayAssistantMessage($chatMessages: HTMLElement, $typingIndicator: HTMLElement, assistantMessageText: string) {
  let $assistantMessage = document.querySelector('.chat-message.assistant:last-child') as HTMLElement;

  if (!$assistantMessage) {
    $assistantMessage = document.createElement('div');
    $assistantMessage.className = 'chat-message assistant';

    const $assistantMessageContent = document.createElement('div');
    $assistantMessageContent.className = 'message-content';
    $assistantMessage.appendChild($assistantMessageContent);

    $chatMessages.appendChild($assistantMessage);
    $typingIndicator.remove();
  }

  const $assistantMessageContent = $assistantMessage.querySelector('.message-content') as HTMLElement;
  $assistantMessageContent.innerHTML = sanitizeHtml(await marked(assistantMessageText, {
    breaks: true,
    gfm: true,
  }), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['ol', 'ul', 'li']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'ol': ['start'],
    },
  });

  if (autoScroll) {
    $chatMessages.scrollTop = $chatMessages.scrollHeight;
  }
}

async function appendTimestampAndCopyButton($messageElement: HTMLElement, messageText: string, showCopyButton: boolean = true) {
  const $timestampContainer = document.createElement('div');
  $timestampContainer.className = 'timestamp-container';

  const $messageTimestamp = document.createElement('div');
  $messageTimestamp.className = 'message-timestamp';
  $messageTimestamp.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $timestampContainer.appendChild($messageTimestamp);

  if (showCopyButton) {
    const $copyButton = document.createElement('button');
    $copyButton.className = 'copy-button';
    $copyButton.innerHTML = '&#128203;';
    $copyButton.dataset.content = messageText;
    $copyButton.addEventListener('click', async (event) => {
      const content = (event.target as HTMLElement).dataset.content;
      if (content) {
        try {
          const tempTextArea = document.createElement('textarea');  
          tempTextArea.value = content;  
          document.body.appendChild(tempTextArea);  
          tempTextArea.select();  
          document.execCommand('copy');  
          document.body.removeChild(tempTextArea);  
        } catch (err) {  
          console.error('Failed to copy text: ', err);  
        }
      }
    });
    $timestampContainer.appendChild($copyButton);
  }

  $messageElement.appendChild($timestampContainer);

  if (autoScroll) {
    $messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

async function shouldIncludeFullContext(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['includeFullContext'], (data) => {
      resolve(data.includeFullContext || false);
    });
  });
}

async function getContext(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['context'], (data) => {
      resolve(data.context || '');
    });
  });
}

async function getOptions(): Promise<{
  apiName: string;
  apiKey: string;
  language: string;
  systemPrompt: string;
  maxTokens: number;
  model: string;
  maxMessageTokens: number;
  maxContextTokens: number;
}> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ['apiName', 'apiKey', 'language', 'systemPrompt', 'maxTokens', 'model', 'maxMessageTokens', 'maxContextTokens'],
      (data) => {
        resolve({
          apiName: data.apiName || 'anthropic',
          apiKey: data.apiKey || '',
          language: data.language || 'Japanese',
          systemPrompt: data.systemPrompt || '',
          maxTokens: data.maxTokens || 1024,
          model: data.model || 'claude-3-haiku-20240307',
          maxMessageTokens: data.maxMessageTokens || 50000,
          maxContextTokens: data.maxContextTokens || 50000,
        });
      }
    );
  });
}