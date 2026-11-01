import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import { useTab } from "@/contexts/TabContext";
import { cn } from "@/lib/utils";
import { useIsSelfHostEligible } from "@/plusUtils";
import { updateSetting, useSettingsValue, type SelfHostSearchProvider } from "@/settings/model";
import { SelfHostWebSearchSettings } from "@/settings/v2/components/ui/SelfHostWebSearchSettings";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import React from "react";

const BYOK_TAB_ID = "byok";

const SUPADATA_SIGNUP_URL = "https://supadata.ai/?ref=obcopilot";
const SEARCH_PROVIDER_KEY_FIELDS = {
  firecrawl: "firecrawlApiKey",
  perplexity: "perplexityApiKey",
  parallel: "parallelApiKey",
  exa: "exaApiKey",
} as const satisfies Record<SelfHostSearchProvider, keyof ReturnType<typeof useSettingsValue>>;

const SignUpLink: React.FC<{ href: string }> = ({ href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="tw-text-accent">
    {t("Sign up ", "注册")}
    <ArrowUpRight className="tw-inline tw-size-3 tw-align-text-bottom" />
  </a>
);

export const SelfHostSettings: React.FC = () => {
  const settings = useSettingsValue();
  const { setSelectedTab } = useTab();
  const isEligible = useIsSelfHostEligible();
  const selfHostOn = settings.enableSelfHostMode;

  return (
    <div className="tw-space-y-4">
      <div className="tw-flex tw-items-start tw-gap-2.5 tw-text-sm tw-text-muted">
        <span className="tw-max-w-[620px]">
          {t(
            "Bring your own infrastructure — self-hosted search, web-search providers, and models.",
            "使用你自己的基础设施：自托管搜索、网页搜索服务和模型。"
          )}
        </span>
        <span className="tw-shrink-0 tw-rounded tw-bg-callout-warning/20 tw-px-2 tw-py-0.5 tw-text-smallest tw-font-semibold tw-text-warning">
          {t("Lifetime license", "终身许可证")}
        </span>
      </div>

      <SettingSection>
        <SettingItem
          type="switch"
          title={t("Enable Self-Host Mode", "启用自托管模式")}
          description={
            <span className="tw-inline-flex tw-items-center tw-gap-1.5">
              {t(
                "Use your own servers for chat models, embeddings, and document processing.",
                "使用自己的服务器运行聊天模型、嵌入模型和文档处理服务。"
              )}
              <HelpTooltip
                content={t(
                  "Believer / Supporter only. Use your own infrastructure for full control and offline use. Stays available offline until your license expires.",
                  "仅限 Believer / Supporter 用户。使用自己的基础设施，实现完全控制和离线使用。在许可证到期前，离线状态下仍可使用。"
                )}
              />
            </span>
          }
          checked={selfHostOn}
          onCheckedChange={(checked) => updateSetting("enableSelfHostMode", checked)}
          disabled={isEligible !== true && !selfHostOn}
        />

        <div
          className={cn(
            "tw-flex tw-items-start tw-gap-2 tw-py-3 tw-text-xs tw-text-normal tw-bg-interactive-accent/10"
          )}
        >
          <ShieldCheck className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-accent" />
          <div className="tw-leading-relaxed">
            <span className="tw-font-semibold">{t("Privacy-first.", "隐私优先。")}</span>
            {t(
              " While Self-Host is on, cloud options (Claude, Codex, and BYOK cloud providers) are flagged with a warning and sorted below your local / self-hosted models. They stay selectable — you decide whether to use them.",
              "启用自托管后，云端选项（Claude、Codex 和自备密钥的云端服务商）会显示警告，并排在本地或自托管模型之后。你仍可自行决定是否使用它们。"
            )}
          </div>
        </div>
      </SettingSection>

      <div className={cn("tw-space-y-4", !selfHostOn && "tw-pointer-events-none tw-opacity-40")}>
        <SettingSection label={t("Web search providers", "网页搜索服务商")}>
          <SelfHostWebSearchSettings
            apiKeys={{
              firecrawl: settings.firecrawlApiKey,
              perplexity: settings.perplexityApiKey,
              parallel: settings.parallelApiKey,
              exa: settings.exaApiKey,
            }}
            disabled={!selfHostOn}
            provider={settings.selfHostSearchProvider}
            onProviderChange={(provider) => updateSetting("selfHostSearchProvider", provider)}
            onApiKeyChange={(provider, value) =>
              updateSetting(SEARCH_PROVIDER_KEY_FIELDS[provider], value)
            }
          />

          <SettingItem
            type="password"
            title={t("Supadata API key", "Supadata API 密钥")}
            description={
              <span>
                {t("YouTube transcripts via Supadata. ", "通过 Supadata 获取 YouTube 字幕。")}
                <SignUpLink href={SUPADATA_SIGNUP_URL} />
              </span>
            }
            value={settings.supadataApiKey}
            onChange={(value) => updateSetting("supadataApiKey", value)}
            placeholder="sd-…"
            disabled={!selfHostOn}
          />
        </SettingSection>

        <SettingSection label={t("Self-hosted models", "自托管模型")}>
          <SettingItem
            type="custom"
            title={t("LLM & embedding models", "大语言模型与嵌入模型")}
            description={
              <span>
                {t(
                  "Add local or self-hosted models as an OpenAI-compatible provider on the BYOK tab.",
                  "在“自备密钥（BYOK）”页中，以兼容 OpenAI 的服务商形式添加本地或自托管模型。"
                )}
              </span>
            }
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedTab(BYOK_TAB_ID)}
              disabled={!selfHostOn}
            >
              {t("Open BYOK", "打开自备密钥设置")}
            </Button>
          </SettingItem>
        </SettingSection>
      </div>
    </div>
  );
};
