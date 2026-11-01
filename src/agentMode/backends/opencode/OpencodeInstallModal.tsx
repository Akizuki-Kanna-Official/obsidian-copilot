import { t } from "@/lib/i18n";
import {
  OpencodeConfigView,
  type OpencodeBinarySource,
  type OpencodeRunState,
} from "@/agentMode/backends/opencode/ui/OpencodeConfigView";
import {
  AbortError,
  computeInstallState,
  OperationInFlightError,
  toOpencodeInstallState,
} from "@/agentMode/backends/opencode/OpencodeBinaryManager";
import type { OpencodeBinaryManager } from "@/agentMode/backends/opencode/OpencodeBinaryManager";
import { detectOpencodeCliPath } from "@/agentMode/backends/opencode/descriptor";
import { FullBleedReactModal } from "@/components/modals/ReactModal";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { formatBinaryPathForDisplay } from "@/utils/binaryPath";
import { formatBytes } from "@/utils/formatBytes";
import { OPENCODE_PINNED_VERSION } from "@/agentMode/backends/opencode/ui/opencodeVersion";
import { logError } from "@/logger";
import { useSettingsValue } from "@/settings/model";
import { App, Notice } from "obsidian";
import React from "react";

const STARTING_RUN: OpencodeRunState = Object.freeze({
  kind: "running",
  label: "Starting…",
  percent: 0,
});

const errorState = (err: unknown): OpencodeRunState => ({
  kind: "error",
  message: err instanceof Error ? err.message : String(err),
});

export const OpencodeConfigContainer: React.FC<{
  manager: OpencodeBinaryManager;
  hostPlatform: string;
  hostArch: string;
  app: App;
  onClose: () => void;
}> = ({ manager, hostPlatform, hostArch, app, onClose }) => {
  const settings = useSettingsValue();
  const opencode = settings.agentMode?.backends?.opencode;
  const local = computeInstallState(opencode);
  const activeSource = local.kind === "installed" ? local.source : null;
  const customPath = local.kind === "installed" && local.source === "custom" ? local.path : "";

  const [source, setSource] = React.useState<OpencodeBinarySource>(
    opencode?.binarySource ?? "managed"
  );

  const runtime = React.useSyncExternalStore(
    manager.subscribeRuntimeState,
    manager.getRuntimeState,
    manager.getRuntimeState
  );
  const [upgradeRun, setUpgradeRun] = React.useState<OpencodeRunState>({ kind: "idle" });

  const forgetUpgradeOutcome = React.useCallback(() => setUpgradeRun({ kind: "idle" }), []);
  const installRun: OpencodeRunState =
    runtime.kind === "installing"
      ? runtime.progress
        ? { kind: "running", ...runtime.progress }
        : STARTING_RUN
      : runtime.kind === "error"
        ? { kind: "error", message: runtime.message }
        : { kind: "idle" };

  const install = React.useCallback(() => {
    manager
      .install()
      .then(({ version }) => {
        forgetUpgradeOutcome();
        new Notice(t(`OpenCode v${version} installed.`, `已安装 OpenCode v${version}。`));
      })
      .catch((err: unknown) => {
        if (err instanceof AbortError || (err as Error)?.name === "AbortError") return;
        if (err instanceof OperationInFlightError) {
          new Notice(err.message);
          return;
        }
        logError("[AgentMode] opencode install failed", err);
      });
  }, [manager, forgetUpgradeOutcome]);

  const cancelInstall = React.useCallback(() => manager.cancelCurrentOperation(), [manager]);

  const confirmUninstall = React.useCallback(async (): Promise<void> => {
    const bytes = await manager.downloadsSize().catch(() => 0);
    new ConfirmModal(
      app,
      async () => {
        try {
          await manager.uninstall();
          forgetUpgradeOutcome();
          new Notice(
            t(
              `OpenCode uninstalled${bytes > 0 ? ` (freed ${formatBytes(bytes)})` : ""}.`,
              `已卸载 OpenCode${bytes > 0 ? `（释放 ${formatBytes(bytes)}）` : ""}。`
            )
          );
        } catch (e) {
          logError("[AgentMode] uninstall failed", e);
          new Notice(
            t(
              `Uninstall failed: ${e instanceof Error ? e.message : String(e)}`,
              `卸载失败：${e instanceof Error ? e.message : String(e)}`
            )
          );
        }
      },
      t(
        `Remove all downloaded opencode binaries${bytes > 0 ? ` (${formatBytes(bytes)})` : ""}, ` +
          "including any old copy inside your vault? Your custom binary path and BYOK keys are kept.",
        `删除所有已下载的 opencode 程序${bytes > 0 ? `（${formatBytes(bytes)}）` : ""}，包括仓库中的旧副本？你的自定义程序路径和自备 API 密钥将被保留。`
      ),
      t("Uninstall opencode", "卸载 OpenCode"),
      t("Uninstall", "卸载")
    ).open();
  }, [app, manager, forgetUpgradeOutcome]);

  const upgrade = React.useCallback(() => {
    setUpgradeRun(STARTING_RUN);
    const action =
      activeSource === "custom"
        ? manager.upgradeCustomBinary()
        : manager.upgradeManaged({
            onProgress: (progress) => setUpgradeRun({ kind: "running", ...progress }),
          });
    action
      .then(({ version }) => {
        setUpgradeRun({ kind: "idle" });
        new Notice(t(`OpenCode updated to v${version}.`, `OpenCode 已更新至 v${version}。`));
      })
      .catch((err: unknown) => {
        if (err instanceof AbortError || (err as Error)?.name === "AbortError") {
          setUpgradeRun({ kind: "idle" });
          return;
        }
        if (err instanceof OperationInFlightError) {
          setUpgradeRun({ kind: "idle" });
          new Notice(err.message);
          return;
        }
        logError("[AgentMode] opencode upgrade failed", err);
        setUpgradeRun(errorState(err));
      });
  }, [manager, activeSource]);

  const saveCustomPath = React.useCallback(
    async (path: string): Promise<string | null> => {
      try {
        await manager.setCustomBinaryPath(path);
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
      forgetUpgradeOutcome();
      new Notice(t("Custom OpenCode path saved.", "已保存 OpenCode 自定义路径。"));
      return null;
    },
    [manager, forgetUpgradeOutcome]
  );

  const clearCustomPath = React.useCallback(async (): Promise<void> => {
    try {
      await manager.setCustomBinaryPath(null);
    } catch (e) {
      new Notice(
        t(
          `Couldn't clear the custom path: ${e instanceof Error ? e.message : String(e)}`,
          `无法清除自定义路径：${e instanceof Error ? e.message : String(e)}`
        )
      );
      return;
    }
    forgetUpgradeOutcome();
    new Notice(t("Custom OpenCode path cleared.", "已清除 OpenCode 自定义路径。"));
  }, [manager, forgetUpgradeOutcome]);

  return (
    <OpencodeConfigView
      state={toOpencodeInstallState(local)}
      source={source}
      onSourceChange={setSource}
      activeSource={activeSource}
      managed={{
        platform: `${hostPlatform}-${hostArch}`,
        version: OPENCODE_PINNED_VERSION,
        destination: formatBinaryPathForDisplay(manager.getDataDir()),
        run: installRun,
      }}
      customPath={customPath}
      upgradeRun={upgradeRun}
      actions={{
        install,
        cancelInstall,
        uninstall: () => void confirmUninstall(),
        upgrade,
        saveCustomPath,
        clearCustomPath,
        detectCustomPath: detectOpencodeCliPath,
      }}
      onClose={onClose}
    />
  );
};

export class OpencodeInstallModal extends FullBleedReactModal {
  constructor(
    app: App,
    private readonly manager: OpencodeBinaryManager,
    private readonly hostInfo: { platform: string; arch: string }
  ) {
    super(app);
  }

  protected renderContent(close: () => void): React.ReactElement {
    return (
      <OpencodeConfigContainer
        manager={this.manager}
        hostPlatform={this.hostInfo.platform}
        hostArch={this.hostInfo.arch}
        app={this.app}
        onClose={close}
      />
    );
  }
}
