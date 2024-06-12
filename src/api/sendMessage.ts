import { sendAnthropicMessage } from './anthropic';
import { sendCohereMessage } from './cohere';

export async function sendMessage(
  apiClient: any,
  apiName: string,
  messages: any[],
  maxTokens: number,
  model: string,
  systemPrompt: string
): Promise<any> {
  switch (apiName) {
    case 'anthropic':
      return sendAnthropicMessage(apiClient, messages, maxTokens, model, systemPrompt);
    case 'cohere':
      return sendCohereMessage(apiClient, messages, model, systemPrompt);
    // 他のAPIのメッセージ送信処理をここに追加
    default:
      throw new Error(`Unsupported API: ${apiName}`);
  }
}
