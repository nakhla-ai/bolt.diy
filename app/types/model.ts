import type { ModelInfo } from '~/lib/modules/llm/types';

export type ProviderInfo = {
  staticModels: ModelInfo[];
  name: string;
  getDynamicModels?: (
    providerName: string,
    apiKeys?: Record<string, string>,
    providerSettings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ) => Promise<ModelInfo[]>;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
};

export interface IProviderSetting {
  enabled?: boolean;
  baseUrl?: string;
  OPENAI_LIKE_API_MODELS?: string;
  AZURE_RESOURCE_NAME?: string;
  AZURE_DEPLOYMENT_NAME?: string;
  AZURE_API_VERSION?: string;
  AZURE_MAX_INPUT_TOKENS?: string;
  AZURE_MAX_COMPLETION_TOKENS?: string;
}

export type IProviderConfig = ProviderInfo & {
  settings: IProviderSetting;
};
