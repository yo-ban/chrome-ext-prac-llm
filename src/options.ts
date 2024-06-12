import { DEFAULT_SYSTEM_PROMPT } from './constants';

document.addEventListener('DOMContentLoaded', () => {
  const apiSelect = document.getElementById('api-select') as HTMLSelectElement;
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const maxTokensInput = document.getElementById('max-tokens') as HTMLInputElement;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
  const includeVisibleTextSwitch = document.getElementById('include-visible-text-switch') as HTMLInputElement;
  const includeFullContextSwitch = document.getElementById('include-full-context-switch') as HTMLInputElement;
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
  const systemPromptInput = document.getElementById('system-prompt') as HTMLTextAreaElement;
  const resetPromptButton = document.getElementById('reset-prompt-button') as HTMLButtonElement;
  const maxMessageTokensInput = document.getElementById('max-message-tokens') as HTMLInputElement;
  const maxContextTokensInput = document.getElementById('max-context-tokens') as HTMLInputElement;
  
  function updateModelOptions(selectedModel?: string) {
    const selectedApi = apiSelect.value;
    const modelOptions = modelSelect.options;

    let firstVisibleOption: HTMLOptionElement | null = null;

    for (let i = 0; i < modelOptions.length; i++) {
      const option = modelOptions[i];
      const apiAttribute = option.getAttribute('data-api');

      if (apiAttribute === selectedApi) {
        option.style.display = 'block';
        if (!firstVisibleOption) {
          firstVisibleOption = option;
        }
      } else {
        option.style.display = 'none';
      }
    }

    if (selectedModel) {
      modelSelect.value = selectedModel;
    } else if (firstVisibleOption) {
      modelSelect.value = firstVisibleOption.value;
    }
  }

  apiSelect.addEventListener('change', () => {
    updateModelOptions();
  });

  function saveOptions() {
    const apiName = apiSelect.value;
    const apiKey = apiKeyInput.value;
    const maxTokens = parseInt(maxTokensInput.value, 10);
    const model = modelSelect.value;
    const language = languageSelect.value;
    const systemPrompt = systemPromptInput.value;
    const includeVisibleText = includeVisibleTextSwitch.checked;
    const includeFullContext = includeFullContextSwitch.checked;
    const maxMessageTokens = parseInt(maxMessageTokensInput.value, 10);
    const maxContextTokens = parseInt(maxContextTokensInput.value, 10);
  
    chrome.storage.sync.set({ apiName, apiKey, maxTokens, model, language, systemPrompt, includeVisibleText, includeFullContext, maxMessageTokens, maxContextTokens }, () => {
      console.log('Options saved.');
    });
  }

  // デフォルト値を設定
  chrome.storage.sync.get(['apiName', 'apiKey', 'maxTokens', 'model', 'language', 'systemPrompt', 'includeVisibleText', 'includeFullContext', 'maxMessageTokens', 'maxContextTokens'], (data) => {
    if (data.apiName) {
      apiSelect.value = data.apiName;
    }

    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }

    if (data.maxTokens) {
      maxTokensInput.value = data.maxTokens;
    } else {
      chrome.storage.sync.set({ maxTokens: 1024 });
      maxTokensInput.value = "1024";
    }
  
    if (data.model) {
      updateModelOptions(data.model);
    } else {
      chrome.storage.sync.set({ model: modelSelect.options[0].value });
      updateModelOptions();
    }

    if (data.includeVisibleText !== undefined) {
      includeVisibleTextSwitch.checked = data.includeVisibleText;
    } else {
      chrome.storage.sync.set({ includeVisibleText: true });
      includeVisibleTextSwitch.checked = true;
    }

    if (data.includeFullContext !== undefined) {
      includeFullContextSwitch.checked = data.includeFullContext;
    } else {
      chrome.storage.sync.set({ includeFullContext: false });
      includeFullContextSwitch.checked = false;
    }

    if (data.language) {
      languageSelect.value = data.language;
    } else {
      chrome.storage.sync.set({ language: 'Japanese' });
    }

    if (data.systemPrompt) {
      systemPromptInput.value = data.systemPrompt;
    } else {
      chrome.storage.sync.set({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
      systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
    }

    if (data.maxMessageTokens) {
      maxMessageTokensInput.value = data.maxMessageTokens.toString();
    } else {
      chrome.storage.sync.set({ maxMessageTokens: 50000 });
      maxMessageTokensInput.value = '50000';
    }
  
    if (data.maxContextTokens) {
      maxContextTokensInput.value = data.maxContextTokens.toString();
    } else {
      chrome.storage.sync.set({ maxContextTokens: 50000 });
      maxContextTokensInput.value = '50000';
    }
  });

  apiSelect.addEventListener('change', saveOptions);
  apiKeyInput.addEventListener('input', saveOptions);
  maxTokensInput.addEventListener('input', saveOptions);
  modelSelect.addEventListener('change', saveOptions);
  languageSelect.addEventListener('change', saveOptions);
  systemPromptInput.addEventListener('input', saveOptions);
  maxContextTokensInput.addEventListener('input', saveOptions);
  maxContextTokensInput.addEventListener('input', saveOptions);

  includeVisibleTextSwitch.addEventListener('change', (event) => {
    if ((event.target as HTMLInputElement).checked) {
      includeFullContextSwitch.checked = false;
    }
    saveOptions();
  });

  includeFullContextSwitch.addEventListener('change', (event) => {
    if ((event.target as HTMLInputElement).checked) {
      includeVisibleTextSwitch.checked = false;
    }
    saveOptions();
  });

  resetPromptButton.addEventListener('click', () => {
    systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
    saveOptions();
  });

});

export {};
