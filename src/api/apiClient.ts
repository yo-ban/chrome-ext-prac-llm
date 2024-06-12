import Anthropic from '@anthropic-ai/sdk';
import { CohereClient } from 'cohere-ai';

export async function createApiClient(apiName: string, apiKey: string): Promise<any> {
  switch (apiName) {
    case 'anthropic':
      return new Anthropic({ apiKey });
    case 'cohere':
      return new CohereClient({ token: apiKey });
    default:
      throw new Error(`Unsupported API: ${apiName}`);
  }
}
