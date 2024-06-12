import { CohereClient } from 'cohere-ai';
import * as Cohere from 'cohere-ai/dist/api';

function convertMessagesToChatHistory(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Cohere.ChatMessage[] {
  const chatHistory: Cohere.ChatMessage[] = [];

  if (systemPrompt) {
    chatHistory.push({
      role: 'SYSTEM',
      message: systemPrompt,
    });
  }

  for (let i = 0; i < messages.length - 1; i++) {
    const message = messages[i];
    const role = message.role === 'assistant' ? 'CHATBOT' : message.role.toUpperCase();
    chatHistory.push({
      role: role as 'CHATBOT' | 'SYSTEM' | 'USER',
      message: message.content,
    });
  }

  return chatHistory;
}

export async function sendCohereMessage(
  apiClient: CohereClient,
  messages: { role: string; content: string }[],
  model: string,
  systemPrompt: string
): Promise<AsyncIterable<Cohere.StreamedChatResponse>> {
  const chatHistory = convertMessagesToChatHistory(messages, systemPrompt);
  const userMessage = messages[messages.length - 1].content;

  return apiClient.chatStream({
    model: model,
    message: userMessage,
    chatHistory: chatHistory,
  });
}
