import { t } from "@/lib/i18n";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/SearchBar";
import { useApp } from "@/context";
import { logError } from "@/logger";
import {
  CUSTOM_OPENAI_DEFINITION,
  LOCAL_PROVIDER_DEFINITIONS,
} from "@/modelManagement/catalog/builtinDefinitions";
import { configuredModelsAtom, visibleByokProvidersAtom } from "@/modelManagement/state/atoms";
import { providerNeedsSelfHostWarning } from "@/modelManagement/providers/selfHostPolicy";
import type { CatalogProvider } from "@/modelManagement/types/catalog";
import type { VerificationResult } from "@/modelManagement/types/runtime";
import { ProviderVerificationProgress } from "@/modelManagement/ui/components/ProviderVerificationStatus";
import type { ConfiguredModel } from "@/modelManagement/types/persisted";
import { useModelManagement } from "@/modelManagement/ui/ModelManagementContext";
import {
  ByokGlobalTable,
  type ByokTableGroup,
} from "@/modelManagement/ui/components/ByokGlobalTable";
import { AddProviderModal } from "@/modelManagement/ui/dialogs/AddProviderDialog";
import { ConfigureProviderModal } from "@/modelManagement/ui/dialogs/ConfigureProviderDialog";
import { settingsStore, useSettingsValue } from "@/settings/model";
import { useAtomValue } from "jotai";
import { Plus, ShieldCheck } from "lucide-react";
import { Notice } from "obsidian";
import React, { useEffect, useMemo, useState } from "react";

const EMPTY_VERIFICATION: Readonly<Record<string, VerificationResult>> = Object.freeze({});
const EMPTY_CATALOG: readonly CatalogProvider[] = Object.freeze([]);
const EMPTY_MODELS: readonly ConfiguredModel[] = Object.freeze([]);

export const ByokPanel: React.FC = () => {
  const api = useModelManagement();
  const app = useApp();

  const providers = useAtomValue(visibleByokProvidersAtom, { store: settingsStore });
  const configuredModels = useAtomValue(configuredModelsAtom, { store: settingsStore });
  const selfHostOn = useSettingsValue().enableSelfHostMode;

  const [catalogProviders, setCatalogProviders] =
    useState<readonly CatalogProvider[]>(EMPTY_CATALOG);
  const [query, setQuery] = useState("");
  const [verification, setVerification] =
    useState<Readonly<Record<string, VerificationResult>>>(EMPTY_VERIFICATION);
  const [verificationProviders, setVerificationProviders] = useState(() =>
    api.providerRegistry.listByOrigin("byok")
  );
  const pendingChecks = verificationProviders.length - Object.keys(verification).length;
  const refreshVerification = (): void => {
    setVerification(EMPTY_VERIFICATION);
    setVerificationProviders([...api.providerRegistry.listByOrigin("byok")]);
  };

  useEffect(() => {
    let cancelled = false;
    // https://github.com/logancyang/obsidian-copilot/issues/3147:
    // Check completed saves, including CORS-only edits. Registry events can fire
    // between key and endpoint writes and would send the new key to the old URL.

    for (const provider of verificationProviders) {
      void api.providerRegistry
        .verify(provider.providerId)
        .catch(
          (): VerificationResult => ({
            ok: false,
            message: t(
              "Could not verify this provider. Reopen this tab to retry.",
              "无法验证此服务商。请重新打开此标签页后重试。"
            ),
            checkedAt: Date.now(),
          })
        )
        .then((result) => {
          if (cancelled) return;
          setVerification((results) => ({ ...results, [provider.providerId]: result }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [api, verificationProviders]);

  useEffect(() => {
    let cancelled = false;
    const sync = (): void => {
      if (!cancelled) setCatalogProviders(api.catalogService.getAllProviders());
    };
    const unsub = api.catalogService.onChange(sync);
    api.catalogService
      .ensureLoaded()
      .then(() => {
        if (cancelled) return;
        sync();
      })
      .catch((err) => {
        logError("[ByokPanel] catalog ensureLoaded failed", err);
      });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [api]);

  const groups = useMemo<ByokTableGroup[]>(() => {
    const byProvider = new Map<string, ConfiguredModel[]>();
    for (const model of configuredModels) {
      const list = byProvider.get(model.providerId);
      if (list) list.push(model);
      else byProvider.set(model.providerId, [model]);
    }
    const q = query.trim().toLowerCase();
    return providers
      .map((provider) => {
        const needsSelfHostWarning =
          selfHostOn && providerNeedsSelfHostWarning(provider, { enableSelfHostMode: selfHostOn });
        const all = byProvider.get(provider.providerId) ?? (EMPTY_MODELS as ConfiguredModel[]);
        if (!q || provider.displayName.toLowerCase().includes(q)) {
          return {
            provider,
            models: all,
            needsSelfHostWarning,
            verification: verification[provider.providerId],
          };
        }
        const models = all.filter(
          (m) => m.info.displayName.toLowerCase().includes(q) || m.info.id.toLowerCase().includes(q)
        );
        return {
          provider,
          models,
          needsSelfHostWarning,
          verification: verification[provider.providerId],
        };
      })
      .filter((g) => !q || g.models.length > 0 || g.provider.displayName.toLowerCase().includes(q));
  }, [providers, configuredModels, query, selfHostOn, verification]);

  const handleAddProvider = (): void => {
    new AddProviderModal(app, {
      catalogProviders,
      localTemplates: LOCAL_PROVIDER_DEFINITIONS,
      customTemplate: CUSTOM_OPENAI_DEFINITION,
      onPick: (source) =>
        new ConfigureProviderModal(app, {
          state: { mode: "new", source },
          api,
          onSaved: refreshVerification,
        }).open(),
    }).open();
  };

  const handleRemove = (providerId: string): void => {
    const provider = providers.find((p) => p.providerId === providerId);
    if (!provider) return;
    const modal = new ConfirmModal(
      app,
      async () => {
        try {
          await api.coordinator.removeProvider(providerId);
        } catch (err) {
          logError("[ByokPanel] removeProvider failed", err);
          new Notice(t("Failed to remove provider.", "移除服务商失败。"));
        }
      },
      t(
        `Remove ${provider.displayName}? This also removes all of its models from every model picker.`,
        `移除 ${provider.displayName}？这也会从所有模型选择器中移除该服务商的全部模型。`
      ),
      t("Remove provider", "移除服务商"),
      t("Remove", "移除"),
      t("Cancel", "取消")
    );
    modal.open();
  };

  return (
    <div className="tw-relative tw-flex tw-flex-col tw-gap-4 tw-py-4">
      <ProviderVerificationProgress pending={pendingChecks} />
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
        <div className="tw-flex tw-flex-col tw-gap-1">
          <div className="tw-text-xl tw-font-bold tw-text-normal">
            {t("Bring your own key", "使用自己的密钥")}
          </div>
          <div className="tw-max-w-xl tw-text-sm tw-text-muted">
            {t(
              "Set up your own providers and models to use in Copilot.",
              "配置您自己的服务商和模型，以在 Copilot 中使用。"
            )}
          </div>
        </div>
        <Button className="tw-shrink-0" onClick={handleAddProvider}>
          <Plus className="tw-size-4" />
          {t("Add a provider", "添加服务商")}
        </Button>
      </div>

      {selfHostOn && (
        <div className="tw-flex tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-px-3 tw-py-2.5 tw-text-xs tw-text-normal tw-bg-interactive-accent/10 tw-border-interactive-accent/30">
          <ShieldCheck className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-accent" />
          <div className="tw-leading-relaxed">
            <span className="tw-font-semibold">
              {t("Self-Host Mode is on.", "自托管模式已开启。")}
            </span>{" "}
            {t(
              "Cloud providers stay available but are flagged and listed below your local and self-hosted endpoints — their prompts leave your machine. You decide whether to use them.",
              "云端服务商仍可使用，但会带有标记并列在本地和自托管接口之后，因为提示词会发送到您的电脑之外。是否使用由您决定。"
            )}
          </div>
        </div>
      )}

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={t("Search providers…", "搜索服务商…")}
      />

      <div className="tw-flex tw-flex-col">
        <ByokGlobalTable
          groups={groups}
          emptyMessage={
            query.trim() && providers.length > 0
              ? t("No providers match your search.", "没有找到匹配的服务商。")
              : undefined
          }
          onConfigure={(id) =>
            new ConfigureProviderModal(app, {
              state: { mode: "edit", providerId: id },
              api,
              onSaved: refreshVerification,
            }).open()
          }
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
};
