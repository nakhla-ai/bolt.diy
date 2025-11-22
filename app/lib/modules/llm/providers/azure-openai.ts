import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';
import { createAzure } from '@ai-sdk/azure';

interface AzureConfig {
  resourceName?: string;
  deploymentName?: string;
  apiVersion: string;
  baseUrl?: string;
  maxCompletionTokens: number;
  maxInputTokens: number;
}

export default class AzureOpenAIProvider extends BaseProvider {
  name = 'AzureOpenAI';
  getApiKeyLink = 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/Keys';
  labelForGetApiKey = 'Azure OpenAI API Key';

  config = {
    apiTokenKey: 'AZURE_API_KEY',
  };

  staticModels: ModelInfo[] = [];

  private resolveAzureConfig(serverEnv: Record<string, string> | Env = {}, settings?: IProviderSetting): AzureConfig {
    const envSource = serverEnv as Record<string, string>;
    const resourceName =
      settings?.AZURE_RESOURCE_NAME ||
      envSource.AZURE_RESOURCE_NAME ||
      process?.env?.AZURE_RESOURCE_NAME;
    const deploymentName =
      settings?.AZURE_DEPLOYMENT_NAME ||
      envSource.AZURE_DEPLOYMENT_NAME ||
      process?.env?.AZURE_DEPLOYMENT_NAME;
    const apiVersion =
      settings?.AZURE_API_VERSION ||
      envSource.AZURE_API_VERSION ||
      process?.env?.AZURE_API_VERSION ||
      '2024-10-01-preview';
    const baseUrl = settings?.baseUrl || envSource.AZURE_OPENAI_BASE_URL || process?.env?.AZURE_OPENAI_BASE_URL;

    const parseNumber = (value?: string, fallback?: number) => {
      const parsed = value ? parseInt(value, 10) : NaN;
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const maxCompletionTokens = parseNumber(
      settings?.AZURE_MAX_COMPLETION_TOKENS ||
        envSource.AZURE_MAX_COMPLETION_TOKENS ||
        process?.env?.AZURE_MAX_COMPLETION_TOKENS,
      16384,
    )!;
    const maxInputTokens = parseNumber(
      settings?.AZURE_MAX_INPUT_TOKENS ||
        envSource.AZURE_MAX_INPUT_TOKENS ||
        process?.env?.AZURE_MAX_INPUT_TOKENS,
      128000,
    )!;

    return {
      resourceName,
      deploymentName,
      apiVersion,
      baseUrl,
      maxCompletionTokens,
      maxInputTokens,
    };
  }

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'AZURE_API_KEY',
    });
    const azureConfig = this.resolveAzureConfig(serverEnv, settings);

    if (!apiKey || !azureConfig.deploymentName) {
      return [];
    }

    return [
      {
        name: azureConfig.deploymentName,
        label: `${azureConfig.deploymentName} (Azure OpenAI)`,
        provider: this.name,
        maxTokenAllowed: azureConfig.maxInputTokens,
        maxCompletionTokens: azureConfig.maxCompletionTokens,
      },
    ];
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'AZURE_API_KEY',
    });
    const azureConfig = this.resolveAzureConfig(serverEnv, providerSettings?.[this.name]);
    const deploymentName = model || azureConfig.deploymentName;

    if (!apiKey) {
      throw new Error('Missing API key for Azure OpenAI provider');
    }

    if (!deploymentName) {
      throw new Error('Missing deployment configuration for Azure OpenAI provider');
    }

    if (!azureConfig.baseUrl && !azureConfig.resourceName) {
      throw new Error('Missing Azure resource name or base URL for Azure OpenAI provider');
    }

    const azure = createAzure({
      apiKey,
      resourceName: azureConfig.baseUrl ? undefined : azureConfig.resourceName,
      baseURL: azureConfig.baseUrl,
      apiVersion: azureConfig.apiVersion,
    });

    return azure(deploymentName);
  }
}
