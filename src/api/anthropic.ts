import Anthropic from '@anthropic-ai/sdk';
import { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream';

export async function sendAnthropicMessage(
  apiClient: Anthropic,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  model: string,
  systemPrompt: string,
): Promise<MessageStream> {
  return apiClient.messages.stream({
    max_tokens: maxTokens,
    messages: messages,
    model: model,
    system: systemPrompt,
  });
}
