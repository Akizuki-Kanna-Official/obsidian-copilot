import { t } from "@/lib/i18n";
import {
  mapProviderToOpencodeId,
  ModelEnableList,
  type BackendDescriptor,
  type ModelEnableGroup,
} from "@/agentMode";
import { logError } from "@/logger";
import {
  backendsAtom,
  configuredModelsAtom,
  copilotPlusCatalogAtom,
  providersAtom,
  useModelManagement,
  type AgentType,
} from "@/modelManagement";
import { shouldPreviewCopilotModels } from "@/lib/lockedCopilotEntries";
import { settingsStore } from "@/settings/model";
import { useAtomValue } from "jotai";
import React from "react";
import { buildModelEnableGroups, partitionCandidates } from "./configuredModelGrouping";

interface ConfiguredModelEnableListProps {
  descriptor: BackendDescriptor;
}

const EMPTY_ENABLED: readonly string[] = Object.freeze([]);

const isOpencodeRoutableProvider = (
  provider: Parameters<typeof mapProviderToOpencodeId>[0]
): boolean => mapProviderToOpencodeId(provider) !== null;

export const ConfiguredModelEnableList: React.FC<ConfiguredModelEnableListProps> = ({
  descriptor,
}) => {
  const api = useModelManagement();
  const agentType = descriptor.id as AgentType;

  const configuredModels = useAtomValue(configuredModelsAtom, { store: settingsStore });
  const providers = useAtomValue(providersAtom, { store: settingsStore });
  const backends = useAtomValue(backendsAtom, { store: settingsStore });

  const [query, setQuery] = React.useState("");

  const enabledIds = React.useMemo(() => {
    const list = backends[agentType]?.enabledModels ?? EMPTY_ENABLED;
    return new Set(list);
  }, [backends, agentType]);

  const isOpencode = descriptor.id === "opencode";

  const partition = React.useMemo(
    () =>
      partitionCandidates(
        configuredModels,
        providers,
        enabledIds,
        agentType,
        isOpencode,
        isOpencodeRoutableProvider
      ),
    [configuredModels, providers, enabledIds, agentType, isOpencode]
  );

  const copilotProviderMissing = shouldPreviewCopilotModels(providers);
  const copilotPlusCatalog = useAtomValue(copilotPlusCatalogAtom, { store: settingsStore });

  const groups = React.useMemo<ModelEnableGroup[]>(
    () =>
      buildModelEnableGroups(
        partition,
        isOpencode,
        query,
        copilotProviderMissing,
        copilotPlusCatalog
      ),
    [partition, isOpencode, query, copilotProviderMissing, copilotPlusCatalog]
  );

  const handleToggle = React.useCallback(
    (id: string, enabled: boolean) => {
      const run = enabled
        ? api.backendConfigRegistry.enableModel(agentType, id)
        : api.backendConfigRegistry.disableModel(agentType, id);
      run.catch((err) => logError(`[AgentMode] toggle model ${id} for ${agentType} failed`, err));
    },
    [api, agentType]
  );

  const emptyState =
    descriptor.id === "opencode" ? (
      <span>
        {t("No models yet. Add a provider on the ", "尚无模型。请前往")}
        <span className="tw-font-medium">{t("BYOK", "自备密钥（BYOK）")}</span>
        {t(
          " tab, or sign in to an OpenCode subscription, to choose models here.",
          "页添加服务商，或登录 OpenCode 订阅，然后在此选择模型。"
        )}
      </span>
    ) : (
      <span>
        {t("No models yet. Install and sign in to ", "暂无模型。请安装并登录")}
        {descriptor.displayName}
        {t(
          ", or start a chat with it, to see its models.",
          "，或使用它开始一次对话，即可查看其模型。"
        )}
      </span>
    );

  return (
    <ModelEnableList
      groups={groups}
      onToggle={handleToggle}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={t(
        `Search ${descriptor.displayName} models…`,
        `搜索 ${descriptor.displayName} 模型…`
      )}
      emptyState={emptyState}
      defaultOpenGroupKey={groups[0]?.key}
    />
  );
};
