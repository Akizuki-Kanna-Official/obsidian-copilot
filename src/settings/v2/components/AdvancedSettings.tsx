import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import { DebuggingSupportSection } from "@/settings/v2/components/DebuggingSupportSection";
import { LegacyChatPromptsNotice } from "@/settings/v2/components/LegacyChatPromptsNotice";
import { useApp } from "@/context";
import { usePlugin } from "@/contexts/PluginContext";
import { getCopilotSaveData } from "@/settings/copilotSaveData";
import { KeychainService } from "@/services/keychainService";
import {
  refreshLastPersistedSettings,
  releaseLegacyCredentialHold,
  runPersistenceTransaction,
  suppressNextPersistOnce,
} from "@/services/settingsPersistence";
import { hasPersistedSecrets } from "@/services/settingsSecretTransforms";
import { logError } from "@/logger";
import {
  type CopilotSettings,
  setSettings,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";
import { Info, ShieldCheck, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Notice } from "obsidian";
import React, { useCallback, useEffect, useState } from "react";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

const DESKTOP_UNAVAILABLE_FRAME_LOG_PATH = t(
  "(the agent activity log is desktop-only)",
  "（智能体活动日志仅在桌面端可用）"
);

export const AdvancedSettings: React.FC = () => {
  const app = useApp();
  const plugin = usePlugin();
  const settings = useSettingsValue();
  const [forgetting, setForgetting] = useState(false);
  const [frameLogPath, setFrameLogPath] = useState(DESKTOP_UNAVAILABLE_FRAME_LOG_PATH);

  useEffect(() => {
    if (!isDesktopRuntime()) return;

    let cancelled = false;
    void import("@/agentMode").then(({ acpFrameSink }) => {
      if (!cancelled) {
        setFrameLogPath(acpFrameSink.getPath());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const keychainAvailable = KeychainService.getInstance().isAvailable();
  const keychainAppearsEmpty = keychainAvailable && !hasPersistedSecrets(settings);

  const handleReportIssue = useCallback(() => {
    if (!isDesktopRuntime()) {
      new Notice(
        t("Reporting an issue is available on desktop only.", "问题报告功能仅在桌面端可用。")
      );
      return;
    }
    void (async () => {
      const { openReportIssueModal } = await import("@/agentMode");
      openReportIssueModal(plugin, {
        activeBackend:
          plugin.agentSessionManager?.getActiveSession()?.backendId ??
          settings.agentMode.activeBackend,
      });
    })();
  }, [plugin, settings.agentMode.activeBackend]);

  const handleOpenFrameLog = useCallback(async () => {
    if (!isDesktopRuntime()) {
      new Notice(
        t("The agent activity log is available on desktop only.", "智能体活动日志仅在桌面端可用。")
      );
      return;
    }
    try {
      const { acpFrameSink } = await import("@/agentMode");
      await acpFrameSink.open();
      setFrameLogPath(acpFrameSink.getPath());
    } catch {
      new Notice(t("Failed to open the agent activity log.", "打开智能体活动日志失败。"));
    }
  }, []);

  const handleClearFrameLog = useCallback(async () => {
    if (!isDesktopRuntime()) {
      new Notice(
        t("The agent activity log is available on desktop only.", "智能体活动日志仅在桌面端可用。")
      );
      return;
    }
    try {
      const { acpFrameSink } = await import("@/agentMode");
      await acpFrameSink.clear();
      setFrameLogPath(acpFrameSink.getPath());
      new Notice(t("Agent activity log cleared.", "已清空智能体活动日志。"));
    } catch {
      new Notice(t("Failed to clear the agent activity log.", "清空智能体活动日志失败。"));
    }
  }, []);

  const handleForgetAllSecrets = useCallback(async () => {
    if (forgetting) return;

    const confirmed = await new Promise<boolean>((resolve) => {
      new ConfirmModal(
        app,
        () => resolve(true),
        t(
          "This will remove all API keys for this vault from the Obsidian Keychain, data.json, ",
          "这会从 Obsidian 钥匙串、data.json 和内存中移除此仓库的所有 API 密钥。"
        ) +
          t(
            "and memory. You will need to re-enter them. Any credential backup files written ",
            "之后需要重新输入密钥。升级到 v4 时生成的凭据备份文件"
          ) +
          t(
            "during the v4 upgrade are left in place — delete those yourself once you no longer ",
            "会保留在原处；不再需要时，请自行"
          ) +
          t("need them.", "删除。"),
        t("⚠️ Forget All Secrets", "⚠️ 清除所有密钥"),
        t("Remove", "移除"),
        t("Cancel", "取消"),
        () => resolve(false)
      ).open();
    });
    if (!confirmed) return;

    setForgetting(true);
    try {
      const keychain = KeychainService.getInstance();
      const saveData = getCopilotSaveData(app);

      await runPersistenceTransaction(() =>
        keychain.forgetAllSecrets(
          async (data) => {
            await saveData(data);
            releaseLegacyCredentialHold();
          },
          (nextSettings) => {
            refreshLastPersistedSettings(nextSettings as CopilotSettings);
            suppressNextPersistOnce();
            setSettings(nextSettings);
          }
        )
      );
    } catch (error) {
      logError("Failed to forget secrets.", error);
      new Notice(t("Failed to remove API keys. Please try again.", "移除 API 密钥失败，请重试。"));
    } finally {
      setForgetting(false);
    }
  }, [app, forgetting]);

  return (
    <div className="tw-space-y-4">
      <LegacyChatPromptsNotice />

      <SettingSection label={t("Others", "其他")}>
        <SettingItem
          type="custom"
          title={t("API key storage", "API 密钥存储")}
          description={
            !keychainAvailable ? (
              <>
                {t("Update Obsidian to ", "请将 Obsidian 更新至")}
                <code>1.11.4+</code>
                {t(" to use the", "以使用")}{" "}
                <strong className="tw-font-semibold tw-text-normal">
                  {t("Obsidian Keychain", "Obsidian 钥匙串")}
                </strong>
                {t(
                  ". Keys cannot be loaded or saved in this build.",
                  "。此版本无法加载或保存密钥。"
                )}
              </>
            ) : keychainAppearsEmpty ? (
              <span className="tw-text-warning">
                {t("No API keys found in this device's", "此设备未在以下位置找到 API 密钥：")}{" "}
                <strong className="tw-font-semibold tw-text-normal">
                  {t("Obsidian Keychain", "Obsidian 钥匙串")}
                </strong>
                {t(
                  ". Re-enter your API keys in the relevant settings sections — each device has a separate Keychain.",
                  "。请在相应设置中重新输入 API 密钥，每台设备的钥匙串相互独立。"
                )}
              </span>
            ) : (
              <>
                {t("API keys are stored in this device's", "API 密钥存储在此设备的")}{" "}
                <strong className="tw-font-semibold tw-text-normal">
                  {t("Obsidian Keychain", "Obsidian 钥匙串")}
                </strong>
                .
              </>
            )
          }
        >
          <div className="tw-flex tw-flex-col tw-items-start tw-gap-2 sm:tw-items-end">
            {keychainAvailable ? (
              <div className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-md tw-bg-success tw-px-3 tw-py-1 tw-text-smallest tw-font-semibold tw-text-success">
                <ShieldCheck className="tw-size-4" />
                {t("Obsidian Keychain", "Obsidian 钥匙串")}
              </div>
            ) : (
              <div className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-md tw-border tw-border-border tw-bg-secondary tw-px-3 tw-py-1 tw-text-smallest tw-font-semibold tw-text-muted">
                <Info className="tw-size-4" />
                {t("Unavailable", "不可用")}
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={safeAsyncHandler(handleForgetAllSecrets)}
              disabled={forgetting || !keychainAvailable}
              title={
                keychainAvailable
                  ? undefined
                  : t(
                      "Update Obsidian to 1.11.4+ to delete Keychain entries.",
                      "请将 Obsidian 更新至 1.11.4 或更高版本，以删除钥匙串条目。"
                    )
              }
              className="tw-gap-1.5"
            >
              <Trash2 className="tw-size-4" />
              {forgetting ? t("Removing...", "正在移除…") : t("Delete All Keys", "删除所有密钥")}
            </Button>
          </div>
        </SettingItem>
      </SettingSection>

      <DebuggingSupportSection
        debug={settings.debug}
        onDebugChange={(checked) => updateSetting("debug", checked)}
        frameLogEnabled={settings.agentMode.debugFullFrames}
        onFrameLogChange={(checked) => {
          setSettings((cur) => ({
            agentMode: { ...cur.agentMode, debugFullFrames: checked },
          }));
        }}
        frameLogPath={frameLogPath}
        onReportIssue={handleReportIssue}
        offerFeedbackCards={settings.agentMode.offerFeedbackCards}
        onOfferFeedbackCardsChange={(checked) => {
          setSettings((cur) => ({
            agentMode: { ...cur.agentMode, offerFeedbackCards: checked },
          }));
        }}
        onOpenFrameLog={safeAsyncHandler(handleOpenFrameLog)}
        onClearFrameLog={safeAsyncHandler(handleClearFrameLog)}
      />
    </div>
  );
};
