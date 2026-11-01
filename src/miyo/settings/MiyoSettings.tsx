import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SettingSection } from "@/components/ui/setting-section";
import { SettingSlider } from "@/components/ui/setting-slider";
import { SettingSwitch } from "@/components/ui/setting-switch";
import { createProductUrl, PRODUCT_URLS } from "@/lib/productLinks";
import { useApp } from "@/context";
import { usePlugin } from "@/contexts/PluginContext";
import { cn } from "@/lib/utils";
import { logWarn } from "@/logger";
import { MiyoClient } from "@/miyo/MiyoClient";
import { MiyoServiceDiscovery } from "@/miyo/MiyoServiceDiscovery";
import { MIYO_SEARCH_MAX_VARIANTS, MIYO_SEARCH_NOTE_LIMIT } from "@/miyo/miyoSearchTool";
import { type CapabilityStatus, refreshMiyoStatus } from "@/miyo/miyoStatusStore";
import {
  getExtraSearchFolderOptions,
  getMiyoCustomUrl,
  getMiyoFolderName,
  isLocalMiyoUrl,
  isMiyoSearchActive,
  type MiyoSearchFolderOption,
  MIYO_CHATS_DEEPLINK_URL,
  MIYO_CONNECT_DEEPLINK_URL,
} from "@/miyo/miyoUtils";
import { getMiyoConnectionMode } from "@/miyo/miyoRuntimePolicy";
import { CapabilityRow } from "@/settings/v2/components/CapabilityRow";
import { MiyoDocumentProcessingRow } from "@/miyo/settings/MiyoDocumentProcessingRow";
import { MiyoConnectionPanel } from "@/miyo/ui/MiyoConnectionPanel";
import { MiyoSearchFoldersPicker } from "@/miyo/ui/MiyoSearchFoldersPicker";
import { useMiyoStatus } from "@/miyo/useMiyoStatus";
import { notifyMiyoIndexChanged } from "@/miyo/miyoIndex";
import { extractAppIgnoreSettings, getSystemExcludedFolders } from "@/search/searchUtils";
import {
  getSettings,
  normalizeMiyoFolderNames,
  setSettings,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";
import {
  type ConnectOutcome,
  type ConnectStep,
  MiyoConnectModal,
} from "@/miyo/settings/MiyoConnectModal";
import { MiyoStatusRow } from "@/miyo/settings/MiyoStatusRow";
import { MiyoAvailabilityNotice, MiyoConnectionControl } from "@/miyo/ui/MiyoConnectionControl";
import { err2String } from "@/utils";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { getVaultBase } from "@/utils/vaultPath";
import { Notice } from "obsidian";
import React, { useCallback, useEffect, useRef, useState } from "react";

const RelayTag: React.FC = () => (
  <span className="tw-rounded tw-px-1.5 tw-py-0.5 tw-text-smallest tw-font-semibold tw-uppercase tw-tracking-wide tw-text-accent tw-bg-interactive-accent/20">
    Relay
  </span>
);

function connectorStatusText(status: CapabilityStatus): string {
  switch (status) {
    case "available":
      return t("Connected — tunnel & sign-in active", "已连接 — 隧道和登录均有效");
    case "unavailable":
      return t(
        "Not set up — finish tunnel & sign-in in Miyo",
        "未设置 — 请在 Miyo 中完成隧道配置和登录"
      );
    default:
      return t("Checking…", "正在检查…");
  }
}

function chatSyncStatusText(status: CapabilityStatus): string {
  switch (status) {
    case "available":
      return t("Ready · chats indexed", "已就绪 · 聊天已建立索引");
    case "syncing":
      return t("Syncing chats…", "正在同步聊天…");
    case "unavailable":
      return t("Not set up — add chat sources in Miyo", "未设置 — 请在 Miyo 中添加聊天来源");
    default:
      return t("Checking…", "正在检查…");
  }
}

export const MiyoSettings: React.FC = () => {
  const app = useApp();
  const plugin = usePlugin();
  const settings = useSettingsValue();
  const status = useMiyoStatus();

  const [draft, setDraft] = useState<{
    mode: "local" | "remote";
    address: string;
    source: string;
  } | null>(null);
  // Two Miyo controls are desktop-only for different reasons: local discovery
  // has no mobile equivalent (MiyoServiceDiscovery resolves to null off the
  // desktop runtime), and agent search only runs inside Agent mode. Offering
  // either on a phone yields a Connect that cannot succeed and a switch that
  // cannot do anything.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/471
  const onDesktop = isDesktopRuntime();
  const activeMode = getMiyoConnectionMode(settings);
  const activeUrl = getMiyoCustomUrl(settings);
  const settingsKey = `${activeMode}:${settings.miyoServerUrl}`;
  const currentDraft = draft?.source === settingsKey ? draft : null;
  // `miyoConnectionMode` is a synced setting, so a desktop in local mode hands
  // its phone a mode that can never connect. Fall back to remote for DISPLAY
  // only; the platform fact must never be persisted back into the shared value.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/471
  const mode = currentDraft?.mode ?? (onDesktop ? activeMode : "remote");
  const urlDraft = currentDraft?.address ?? settings.miyoServerUrl;
  const [connectionError, setConnectionError] = useState<{
    endpoint: string;
    message: string;
  } | null>(null);
  // An enabled backend with no prior snapshot is about to run the mount check.
  // Start in checking so the first paint cannot flash a false Unavailable state.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/356
  const [refreshing, setRefreshing] = useState(
    settings.enableMiyo && (status.backend === "unknown" || status.backend === "stale")
  );
  const mountedRef = useRef(true);
  const connectModalRef = useRef<MiyoConnectModal | null>(null);
  const connectAttemptRef = useRef(0);
  const enableTxnRef = useRef(0);
  const inFlightRef = useRef(0);

  const beginBusy = useCallback(() => {
    inFlightRef.current += 1;
    setRefreshing(true);
  }, []);

  const endBusy = useCallback(() => {
    inFlightRef.current = Math.max(0, inFlightRef.current - 1);
    if (inFlightRef.current === 0 && mountedRef.current) {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      connectAttemptRef.current += 1;
      connectModalRef.current?.close();
    };
  }, []);

  const refresh = useCallback(
    async (force: boolean) => {
      beginBusy();
      try {
        const snapshot = await refreshMiyoStatus({ force });
        return snapshot.backend === "available";
      } finally {
        endBusy();
      }
    },
    [beginBusy, endBusy]
  );

  // Explicit recovery after an unavailable verdict. A locally discovered Miyo
  // that restarted on a different port keeps failing every retry while the
  // discovery cache holds the dead endpoint, so drop it before probing again.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/356
  const handleRetry = useCallback(async () => {
    MiyoServiceDiscovery.getInstance().invalidateLocalDiscovery();
    await refresh(true);
  }, [refresh]);

  useEffect(() => {
    void refresh(false);
  }, [refresh, activeMode, activeUrl, settings.enableMiyo]);

  const probeReachable = useCallback(async () => {
    beginBusy();
    try {
      return await new MiyoClient().isBackendAvailable(
        getMiyoCustomUrl(getSettings()) || undefined
      );
    } finally {
      endBusy();
    }
  }, [beginBusy, endBusy]);

  const enableMiyoBackend = useCallback(
    async (superseded: () => boolean) => {
      // The caller's lifecycle can expire while its preceding network check is
      // pending. Do not let an obsolete settings tree write into its successor.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/284
      if (superseded()) return false;
      const txn = (enableTxnRef.current += 1);
      const before = getSettings();
      const prevEnableMiyo = before.enableMiyo;
      updateSetting("enableMiyo", true);
      const available = await refresh(true);
      const current = getSettings();
      const stillOwner =
        enableTxnRef.current === txn &&
        current.enableMiyo &&
        getMiyoConnectionMode(current) === getMiyoConnectionMode(before) &&
        getMiyoCustomUrl(current) === getMiyoCustomUrl(before);
      if (stillOwner && (!available || superseded())) {
        updateSetting("enableMiyo", prevEnableMiyo);
      }
      return available;
    },
    [refresh]
  );

  const canAutoAddVault = useCallback((): boolean => {
    return Boolean(getVaultBase(app)) && getMiyoConnectionMode(getSettings()) === "local";
  }, [app]);

  const registerVault = useCallback(async (): Promise<
    "added" | "manual" | "unreachable" | "error"
  > => {
    // The addVault modal holds the callback it was created with, so this
    // closure can predate an endpoint or Copilot-root change made while the
    // modal was open. Registering from that stale snapshot would target the
    // previous endpoint and exclude the previous roots, then enable an endpoint
    // this vault was never registered with.
    // https://github.com/Brevilabs/obsidian-copilot-private/issues/284
    const currentSettings = getSettings();
    const customUrl = getMiyoCustomUrl(currentSettings);
    const vaultBase = getVaultBase(app);
    if (
      !vaultBase ||
      getMiyoConnectionMode(currentSettings) === "remote" ||
      !isLocalMiyoUrl(customUrl)
    ) {
      return "manual";
    }
    const attempt = (connectAttemptRef.current += 1);
    const superseded = () =>
      connectAttemptRef.current !== attempt ||
      !mountedRef.current ||
      !plugin.isPluginLifecycleActive();
    try {
      // Keep Copilot's own roots and Obsidian-ignored paths out of Miyo's ranked
      // candidate pool. They can contain enough chunks to exhaust the server's
      // bounded result window before Copilot applies its local QA filter.
      // User-authored QA rules remain local; Miyo owns those folder rules
      // instead of receiving a snapshot Copilot cannot keep current.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/284
      const initialExclusions = [
        ...new Set(
          [...getSystemExcludedFolders(currentSettings), ...extractAppIgnoreSettings(app)]
            .map((folder) => folder.replace(/\\/g, "/").replace(/\/+$/, ""))
            // A bare root or parent pointer can make Miyo exclude the entire
            // vault. Preserve other path text literally so an inert Obsidian
            // pattern such as "./notes" is not broadened into an exclusion.
            // https://github.com/Brevilabs/obsidian-copilot-private/issues/284
            .filter((folder) => folder.length > 0 && folder !== "." && folder !== "..")
        ),
      ];
      await new MiyoClient({ plusLicenseKey: currentSettings.plusLicenseKey }).addFolder(
        {
          path: vaultBase,
          exclude_folders: initialExclusions,
          allow_remote_read: true,
        },
        customUrl || undefined,
        () => {
          // URL discovery and credential lookup are asynchronous. Re-check at
          // the request boundary so a settings tree owned by an unloaded plugin
          // cannot register its stale vault in the successor lifecycle.
          // https://github.com/Brevilabs/obsidian-copilot-private/issues/284
          if (superseded()) {
            throw new Error("Miyo registration lifecycle expired");
          }
        }
      );
      if (superseded()) return "unreachable";
      // Registration can make semantic results available without changing the
      // endpoint or its healthy status. Retry any Relevant Notes request that
      // previously settled on setup guidance.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/280
      notifyMiyoIndexChanged();
    } catch (error) {
      if (superseded()) return "unreachable";
      logWarn(`Miyo add-folder failed: ${err2String(error)}`);
      return "error";
    }
    if (superseded()) return "unreachable";
    const available = await enableMiyoBackend(superseded);
    if (superseded()) return "unreachable";
    return available ? "added" : "unreachable";
  }, [app, plugin, enableMiyoBackend]);

  const attemptConnection = useCallback(async (): Promise<ConnectOutcome | "superseded"> => {
    const attempt = (connectAttemptRef.current += 1);
    const target = getSettings();
    const remote = getMiyoConnectionMode(target) === "remote";
    const superseded = () =>
      connectAttemptRef.current !== attempt ||
      (target.enableMiyo && !getSettings().enableMiyo) ||
      getMiyoConnectionMode(getSettings()) !== getMiyoConnectionMode(target) ||
      getMiyoCustomUrl(getSettings()) !== getMiyoCustomUrl(target) ||
      !mountedRef.current ||
      !plugin.isPluginLifecycleActive();

    let reachable = await probeReachable();
    if (!reachable && target.enableMiyo) reachable = await refresh(true);
    if (superseded()) return "superseded";
    if (!reachable) return "unreachable";

    const registration = await new MiyoClient().checkFolderRegistration(
      getMiyoFolderName(app),
      getMiyoCustomUrl(target) || undefined
    );
    if (superseded()) return "superseded";
    if (registration === "error" && !remote) return "error";
    if (registration === "unregistered" && !remote) return "needs-add";

    const available = await enableMiyoBackend(superseded);
    if (superseded()) return "superseded";
    return available ? "connected" : "unreachable";
  }, [app, plugin, probeReachable, enableMiyoBackend, refresh]);

  const handleEvaluate = useCallback(async (): Promise<ConnectOutcome> => {
    const outcome = await attemptConnection();
    if (outcome === "superseded") {
      return "error";
    }
    if (outcome === "error" && mountedRef.current) {
      new Notice(
        t(
          "Couldn't confirm this vault with Miyo. Please try again.",
          "无法向 Miyo 确认此知识库，请重试。"
        )
      );
    }
    return outcome;
  }, [attemptConnection]);

  const openConnectModal = useCallback(
    (initialStep: ConnectStep) => {
      connectModalRef.current?.close();
      const modal = new MiyoConnectModal(app, {
        initialStep,
        downloadUrl: createProductUrl(PRODUCT_URLS.MIYO, "connection"),
        canAutoAdd: canAutoAddVault(),
        onClose: () => {
          connectAttemptRef.current += 1;
          if (connectModalRef.current === modal) {
            connectModalRef.current = null;
          }
        },
        onRetry: () => handleEvaluate(),
        onAddVault: () => registerVault(),
      });
      connectModalRef.current = modal;
      modal.open();
    },
    [app, canAutoAddVault, handleEvaluate, registerVault]
  );

  const handleConnect = useCallback(async () => {
    setConnectionError(null);
    const outcome = await handleEvaluate();
    if (!mountedRef.current) return;
    if (getMiyoConnectionMode(getSettings()) === "remote") {
      if (outcome === "unreachable")
        setConnectionError({
          endpoint: `remote:${getSettings().miyoServerUrl}`,
          message: t(
            "Couldn't connect to this server. Check the address, access, and that Miyo is running, then retry.",
            "无法连接此服务器。请检查地址、访问权限及 Miyo 是否正在运行，然后重试。"
          ),
        });
      return;
    }
    if (outcome === "needs-add") {
      openConnectModal("addVault");
    } else if (outcome === "unreachable") {
      openConnectModal("guide");
    }
  }, [handleEvaluate, openConnectModal]);

  const handleDisconnect = useCallback(async () => {
    enableTxnRef.current += 1;
    connectAttemptRef.current += 1;
    updateSetting("enableMiyo", false);
    await refresh(true);
  }, [refresh]);

  const changeConnection = (nextMode: "local" | "remote", address = urlDraft) => {
    setConnectionError(null);
    setDraft({ mode: nextMode, address, source: settingsKey });
  };

  const saveAndConnect = async () => {
    const address = urlDraft.trim();
    if (mode === "remote") {
      try {
        const url = new URL(address);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          !url.hostname ||
          url.username ||
          url.password
        )
          throw new Error("Invalid server address");
      } catch {
        setConnectionError({
          endpoint: `${mode}:${urlDraft}`,
          message: t(
            "Enter a valid HTTP or HTTPS server address, without embedded credentials.",
            "请输入有效的 HTTP 或 HTTPS 服务器地址，地址中不能包含登录凭据。"
          ),
        });
        return;
      }
    }
    connectAttemptRef.current += 1;
    enableTxnRef.current += 1;
    connectModalRef.current?.close();
    MiyoServiceDiscovery.getInstance().invalidateLocalDiscovery();
    setSettings({
      enableMiyo: false,
      miyoConnectionMode: mode,
      ...(mode === "remote" ? { miyoServerUrl: address } : {}),
    });
    setDraft(null);
    await handleConnect();
  };

  const capabilitiesEnabled = status.backend === "available" || status.backend === "stale";
  const searchActive = isMiyoSearchActive(settings);
  const searchToggleUsable = searchActive || capabilitiesEnabled;
  const connectedRemote = activeMode === "remote";
  const hasPendingConnection =
    mode !== activeMode || (mode === "remote" && urlDraft.trim() !== activeUrl);
  const showSearchFolders = searchActive && capabilitiesEnabled && !settings.miyoSearchAll;
  const searchFoldersKey = showSearchFolders ? settingsKey : null;
  const vaultFolderName = getMiyoFolderName(app);
  const [searchFolders, setSearchFolders] = useState<{
    key: string;
    folders: MiyoSearchFolderOption[] | null;
  }>();

  // The folder list comes from the Miyo host Copilot is connected to, so it is
  // refetched whenever that connection changes.
  // https://github.com/logancyang/obsidian-copilot/issues/3508
  useEffect(() => {
    if (!searchFoldersKey) return;
    let current = true;
    const client = new MiyoClient();
    client
      .resolveBaseUrl(activeUrl)
      .then((baseUrl) => client.listFolders(baseUrl))
      .then(
        ({ folders }) => {
          const options = getExtraSearchFolderOptions(folders, vaultFolderName);
          if (current) setSearchFolders({ key: searchFoldersKey, folders: options });
        },
        (error: unknown) => {
          logWarn(`Miyo folder list failed: ${err2String(error)}`);
          if (current) setSearchFolders({ key: searchFoldersKey, folders: null });
        }
      );
    return () => {
      current = false;
    };
  }, [searchFoldersKey, activeUrl, vaultFolderName]);
  const shownSearchFolders = searchFolders?.key === searchFoldersKey ? searchFolders : undefined;

  return (
    <div className="tw-space-y-4">
      <MiyoConnectionPanel
        activeMode={activeMode}
        enabled={settings.enableMiyo}
        status={status.backend}
        checking={refreshing}
        mode={mode}
        address={urlDraft}
        localSupported={onDesktop}
        onModeChange={(next) => changeConnection(next)}
        onAddressChange={(address) => changeConnection(mode, address)}
        downloadUrl={createProductUrl(PRODUCT_URLS.MIYO, "miyo_settings")}
        error={
          connectionError?.endpoint === `${mode}:${urlDraft}` ? connectionError.message : undefined
        }
      >
        {!settings.enableMiyo || hasPendingConnection ? (
          <Button
            variant="secondary"
            size="default"
            onClick={() => void saveAndConnect()}
            disabled={refreshing}
          >
            {refreshing && !settings.enableMiyo
              ? t("Connecting…", "正在连接…")
              : t("Connect", "连接")}
          </Button>
        ) : (
          <MiyoConnectionControl
            checking={refreshing}
            onDisconnect={() => void handleDisconnect()}
            onRetry={() => void (connectedRemote ? handleConnect() : handleRetry())}
          />
        )}
      </MiyoConnectionPanel>

      <div className="tw-space-y-2">
        <div className="tw-text-xs tw-font-semibold tw-text-muted">
          {t("Powered by Miyo", "由 Miyo 提供支持")}
        </div>

        <MiyoAvailabilityNotice
          enabled={settings.enableMiyo}
          available={capabilitiesEnabled}
          checking={refreshing}
        />

        <div className="tw-overflow-hidden tw-rounded-xl tw-border tw-border-solid tw-border-border tw-bg-primary tw-shadow-sm">
          <div className="tw-divide-y tw-divide-border">
            {/* ENABLING is connection-gated, but DISABLING agent search must stay available offline: https://github.com/Brevilabs/obsidian-copilot-private/issues/471 */}
            {onDesktop && (
              <div
                className={cn(
                  "tw-px-4",
                  !searchToggleUsable && "tw-pointer-events-none tw-opacity-45"
                )}
                aria-disabled={!searchToggleUsable}
              >
                <CapabilityRow
                  title={t("Semantic search for agents", "智能体语义搜索")}
                  description={t(
                    "Gives Copilot agents a Miyo search tool to find notes by meaning, not just keywords.",
                    "为 Copilot 智能体提供 Miyo 搜索工具，按语义查找笔记，而不只是匹配关键词。"
                  )}
                  control={
                    <SettingSwitch
                      checked={settings.enableMiyoSearchSkill}
                      onCheckedChange={(next) => updateSetting("enableMiyoSearchSkill", next)}
                      disabled={!searchToggleUsable}
                      aria-label={t(
                        "Enable Miyo semantic search for agents",
                        "为智能体启用 Miyo 语义搜索"
                      )}
                    />
                  }
                />
              </div>
            )}

            <div
              className={cn(
                "tw-divide-y tw-divide-border [&>*]:tw-px-4",
                !capabilitiesEnabled && "tw-pointer-events-none tw-opacity-45"
              )}
              aria-disabled={!capabilitiesEnabled}
            >
              {searchActive && (
                <div>
                  <CapabilityRow
                    title={t("Search scope", "搜索范围")}
                    description={t(
                      "Only the current vault, or everything Miyo has indexed.",
                      "仅搜索当前知识库，或搜索 Miyo 已建立索引的全部内容。"
                    )}
                    control={
                      <SegmentedControl
                        aria-label={t("Search scope", "搜索范围")}
                        options={[
                          { label: t("Current vault", "当前知识库"), value: "current" },
                          { label: t("Unrestricted", "不限范围"), value: "unrestricted" },
                        ]}
                        value={settings.miyoSearchAll ? "unrestricted" : "current"}
                        onChange={(value) =>
                          updateSetting("miyoSearchAll", value === "unrestricted")
                        }
                        disabled={!capabilitiesEnabled}
                      />
                    }
                  />
                  {showSearchFolders && (
                    <MiyoSearchFoldersPicker
                      folders={shownSearchFolders?.folders ?? undefined}
                      error={
                        shownSearchFolders?.folders === null
                          ? t("Couldn't load your Miyo folders.", "无法加载你的 Miyo 文件夹。")
                          : undefined
                      }
                      selected={settings.miyoExtraSearchFolders}
                      onChange={(next) =>
                        updateSetting("miyoExtraSearchFolders", normalizeMiyoFolderNames(next))
                      }
                    />
                  )}
                </div>
              )}

              {searchActive && (
                <CapabilityRow
                  title={t("Maximum results", "结果数量上限")}
                  description={t(
                    "The most notes one search returns to the agent. Fewer uses less context.",
                    "一次搜索返回给智能体的笔记数量上限。数量越少，占用的上下文越少。"
                  )}
                  control={
                    <SettingSlider
                      value={settings.miyoSearchMaxResults}
                      onChange={(value) => updateSetting("miyoSearchMaxResults", value)}
                      min={1}
                      max={MIYO_SEARCH_NOTE_LIMIT}
                      step={1}
                      disabled={!capabilitiesEnabled}
                      className="tw-w-full sm:tw-w-[300px]"
                    />
                  }
                />
              )}

              {searchActive && (
                <CapabilityRow
                  title={t("Search variants", "搜索改写次数")}
                  description={t(
                    "How many rephrasings of the question one search can add.",
                    "一次搜索最多可额外使用多少种问题改写。"
                  )}
                  control={
                    <SettingSlider
                      value={settings.miyoSearchMaxVariants}
                      onChange={(value) => updateSetting("miyoSearchMaxVariants", value)}
                      min={0}
                      max={MIYO_SEARCH_MAX_VARIANTS}
                      step={1}
                      disabled={!capabilitiesEnabled}
                      className="tw-w-full sm:tw-w-[300px]"
                    />
                  }
                />
              )}

              <MiyoStatusRow
                title={t("Search chat", "搜索聊天记录")}
                description={t(
                  "Search your ChatGPT / Claude chats indexed by Miyo.",
                  "搜索 Miyo 已建立索引的 ChatGPT / Claude 聊天记录。"
                )}
                status={status.chatSync}
                statusText={chatSyncStatusText(status.chatSync)}
                actionLabel={t("Manage in Miyo", "在 Miyo 中管理")}
                remoteInstruction={
                  connectedRemote
                    ? t(
                        "Manage chat sources on the Miyo host.",
                        "请在运行 Miyo 的主机上管理聊天来源。"
                      )
                    : undefined
                }
                onAction={() => window.open(MIYO_CHATS_DEEPLINK_URL, "_blank")}
                disabled={!capabilitiesEnabled}
              />
            </div>

            {/* Not connection-gated: a user must be able to turn Miyo parsing off to recover from a parse error: https://github.com/Brevilabs/obsidian-copilot-private/issues/466 */}
            <div className="tw-px-4">
              <MiyoDocumentProcessingRow
                enabled={settings.enableMiyoDocumentProcessing}
                onEnabledChange={(next) => updateSetting("enableMiyoDocumentProcessing", next)}
              />
            </div>
          </div>
        </div>
      </div>
      <SettingSection label={t("External apps", "外部应用")}>
        <MiyoStatusRow
          title={
            <>
              {t("Connector", "连接器")}
              <RelayTag />
            </>
          }
          description={t(
            "Let ChatGPT / Claude access files through Miyo. Separate from Copilot’s connection above.",
            "允许 ChatGPT / Claude 通过 Miyo 访问文件。此连接独立于上方的 Copilot 连接。"
          )}
          status={status.connector}
          statusText={connectorStatusText(status.connector)}
          actionLabel={t("Set up in Miyo", "在 Miyo 中设置")}
          remoteInstruction={
            connectedRemote
              ? t("Set up Relay on the Miyo host.", "请在运行 Miyo 的主机上设置 Relay。")
              : undefined
          }
          onAction={() => window.open(MIYO_CONNECT_DEEPLINK_URL, "_blank")}
        />
      </SettingSection>
    </div>
  );
};
