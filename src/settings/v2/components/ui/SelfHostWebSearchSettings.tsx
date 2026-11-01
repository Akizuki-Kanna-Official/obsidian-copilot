import { t } from "@/lib/i18n";
import { SettingItem } from "@/components/ui/setting-item";
import type { SelfHostSearchProvider } from "@/settings/model";
import { ArrowUpRight } from "lucide-react";
import React from "react";

interface SearchProviderConfig {
  apiKeyTitle: string;
  description: string;
  label: string;
  placeholder: string;
  signupUrl: string;
}

const SEARCH_PROVIDER_CONFIGS: Record<SelfHostSearchProvider, SearchProviderConfig> = {
  firecrawl: {
    apiKeyTitle: t("Firecrawl API Key", "Firecrawl API 密钥"),
    description: t("Web search & fetch via Firecrawl.", "通过 Firecrawl 搜索和抓取网页。"),
    label: "Firecrawl",
    placeholder: "fc-…",
    signupUrl: "https://firecrawl.link/logan-yang",
  },
  perplexity: {
    apiKeyTitle: t("Perplexity API Key", "Perplexity API 密钥"),
    description: t("Web search via Perplexity Sonar.", "通过 Perplexity Sonar 搜索网页。"),
    label: "Perplexity Sonar",
    placeholder: "pplx-…",
    signupUrl: "https://docs.perplexity.ai",
  },
  parallel: {
    apiKeyTitle: t("Parallel API Key", "Parallel API 密钥"),
    description: t("Web search via Parallel.", "通过 Parallel 搜索网页。"),
    label: "Parallel",
    placeholder: "parallel-…",
    signupUrl: "https://platform.parallel.ai/",
  },
  exa: {
    apiKeyTitle: t("Exa API Key", "Exa API 密钥"),
    description: t("Web search via Exa.", "通过 Exa 搜索网页。"),
    label: "Exa",
    placeholder: "exa-…",
    signupUrl: "https://dashboard.exa.ai/api-keys",
  },
};

const SEARCH_PROVIDER_OPTIONS = Object.entries(SEARCH_PROVIDER_CONFIGS).map(([value, config]) => ({
  label: config.label,
  value,
}));

export interface SelfHostWebSearchSettingsProps {
  apiKeys: Readonly<Record<SelfHostSearchProvider, string>>;
  disabled: boolean;
  onApiKeyChange: (provider: SelfHostSearchProvider, value: string) => void;
  onProviderChange: (provider: SelfHostSearchProvider) => void;
  provider: SelfHostSearchProvider;
}

export const SelfHostWebSearchSettings: React.FC<SelfHostWebSearchSettingsProps> = ({
  apiKeys,
  disabled,
  onApiKeyChange,
  onProviderChange,
  provider,
}) => {
  const config = SEARCH_PROVIDER_CONFIGS[provider];

  return (
    <>
      <SettingItem
        type="select"
        title={t("Web search provider", "网页搜索服务商")}
        description={t(
          "Agents search the web through this provider with your API key.",
          "智能体使用你的 API 密钥，通过此服务商搜索网页。"
        )}
        value={provider}
        onChange={(value) => onProviderChange(value as SelfHostSearchProvider)}
        options={SEARCH_PROVIDER_OPTIONS}
        disabled={disabled}
      />

      <SettingItem
        type="password"
        title={config.apiKeyTitle}
        description={
          <span>
            {config.description}{" "}
            <a
              href={config.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-accent"
            >
              {t("Sign up ", "注册")}
              <ArrowUpRight className="tw-inline tw-size-3 tw-align-text-bottom" />
            </a>
          </span>
        }
        value={apiKeys[provider]}
        onChange={(value) => onApiKeyChange(provider, value)}
        placeholder={config.placeholder}
        disabled={disabled}
      />
    </>
  );
};
