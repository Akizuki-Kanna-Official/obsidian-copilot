import { t } from "@/lib/i18n";
import { AgentStatusCard } from "@/agentMode/ui/AgentStatusCard";
import { useBackendAuthState } from "@/agentMode/session/useBackendAuthState";
import {
  useBackendInstallState,
  useManagedInstallActionState,
  useSessionBackendDescriptor,
} from "@/agentMode/ui/useBackendDescriptor";
import { AgentSessionManager } from "@/agentMode/session/AgentSessionManager";
import { logError } from "@/logger";
import type CopilotPlugin from "@/main";
import { Notice } from "obsidian";
import React from "react";

interface Props {
  manager?: AgentSessionManager;
  plugin: CopilotPlugin;
  onInstallClick: () => void;
}

export const AgentModeStatus: React.FC<Props> = ({ manager, plugin, onInstallClick }) => {
  const descriptor = useSessionBackendDescriptor(manager);
  const installState = useBackendInstallState(descriptor, plugin);
  const managedInstall = useManagedInstallActionState(descriptor, plugin);
  const auth = useBackendAuthState(descriptor);

  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!manager) return;
    return manager.subscribe(() => setTick((v) => v + 1));
  }, [manager]);

  const heldConfigChange = manager?.hasHeldConfigChange(descriptor.id) ?? false;
  // A reload waits for a running turn to finish, so read the queued restart
  // rather than the click: the action then reports progress for exactly as
  // long as the restart is actually outstanding.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/475
  const reloading = manager?.isBackendRestartPending(descriptor.id) ?? false;

  const handleReload = React.useCallback(() => {
    manager?.applyHeldConfigChange(descriptor.id).catch((e) => {
      logError("[AgentMode] reload after config change failed", e);
    });
  }, [manager, descriptor.id]);

  const handleUpgrade = React.useCallback(() => {
    const action = descriptor.managedInstall;
    if (!action || managedInstall.kind === "running") return;
    new Notice(t(`Updating ${descriptor.displayName}…`, `正在更新 ${descriptor.displayName}…`));
    action
      .run(plugin)
      .then(
        () =>
          new Notice(t(`${descriptor.displayName} updated.`, `${descriptor.displayName} 已更新。`))
      )
      .catch((e) => {
        logError("[AgentMode] upgrade failed", e);
        new Notice(
          t(
            `Failed to update ${descriptor.displayName}. Check the Copilot log for details.`,
            `更新 ${descriptor.displayName} 失败。请查看 Copilot 日志了解详情。`
          )
        );
      });
  }, [descriptor, plugin, managedInstall.kind]);

  if (installState.kind === "absent") {
    return (
      <AgentStatusCard
        message={t(`${descriptor.displayName} not installed`, `${descriptor.displayName} 尚未安装`)}
        action={{
          label: t(`Install ${descriptor.displayName}`, `安装 ${descriptor.displayName}`),
          onClick: onInstallClick,
        }}
      />
    );
  }

  if (installState.kind === "checking") {
    return (
      <AgentStatusCard
        message={t(
          `Checking ${descriptor.displayName} version…`,
          `正在检查 ${descriptor.displayName} 的版本…`
        )}
      />
    );
  }

  if (installState.kind === "incompatible") {
    const canUpgrade = descriptor.managedInstall !== undefined;
    const upgrading = managedInstall.kind === "running";
    const failed = managedInstall.kind === "error";
    return (
      <AgentStatusCard
        tone={failed ? "error" : "warning"}
        // State supplies the summary; never infer a cause by parsing the backend's full error.
        // https://github.com/Brevilabs/obsidian-copilot-private/issues/410
        summary={
          upgrading
            ? t(`Updating ${descriptor.displayName}…`, `正在更新 ${descriptor.displayName}…`)
            : failed
              ? t(`${descriptor.displayName} update failed`, `${descriptor.displayName} 更新失败`)
              : t(`${descriptor.displayName} update required`, `${descriptor.displayName} 需要更新`)
        }
        message={
          upgrading ? managedInstall.label : failed ? managedInstall.message : installState.message
        }
        action={{
          label: canUpgrade
            ? upgrading
              ? t("Updating…", "正在更新…")
              : failed
                ? t("Retry", "重试")
                : t("Update", "更新")
            : t(`Configure ${descriptor.displayName}`, `配置 ${descriptor.displayName}`),
          disabled: canUpgrade && upgrading,
          onClick: canUpgrade ? handleUpgrade : () => descriptor.openInstallUI(plugin),
        }}
      />
    );
  }

  if (installState.kind === "error") {
    return (
      <AgentStatusCard
        tone="error"
        summary={t(`${descriptor.displayName} setup error`, `${descriptor.displayName} 设置出错`)}
        message={installState.message}
        action={{
          label: t(`Configure ${descriptor.displayName}`, `配置 ${descriptor.displayName}`),
          onClick: () => descriptor.openInstallUI(plugin),
        }}
      />
    );
  }

  if (descriptor.auth && auth.status && !auth.status.signedIn) {
    return (
      <AgentStatusCard
        message={
          auth.signingIn
            ? t(`Signing in to ${descriptor.displayName}…`, `正在登录 ${descriptor.displayName}…`)
            : t(`${descriptor.displayName} not signed in`, `${descriptor.displayName} 尚未登录`)
        }
        action={
          auth.signingIn
            ? auth.url
              ? { label: t("Open sign-in page", "打开登录页面"), href: auth.url }
              : undefined
            : { label: t("Sign in", "登录"), onClick: auth.signIn }
        }
      />
    );
  }

  if (!manager) {
    return null;
  }

  const bootError = manager.getLastError();
  if (!bootError) {
    // Settings the running agent was spawned with have changed since. Applying
    // them restarts the backend and replaces this conversation, so the manager
    // holds the restart and the choice of when to take it belongs here. A boot
    // error keeps its recovery action, which also applies any held config.
    // https://github.com/Brevilabs/obsidian-copilot-private/issues/475
    if (!heldConfigChange) return null;
    return (
      <AgentStatusCard
        layout="row"
        message={t(
          `${descriptor.displayName} settings changed`,
          `${descriptor.displayName} 设置已更改`
        )}
        action={{
          label: reloading ? t("Reloading…", "正在重新加载…") : t("Reload", "重新加载"),
          disabled: reloading,
          onClick: handleReload,
        }}
      />
    );
  }

  const handleRetry = (): void => {
    // A failed session may remain active after startup rejects. Apply corrected
    // settings before retrying so that session cannot mask the new config.
    // https://github.com/Brevilabs/obsidian-copilot-private/issues/475
    const retry = heldConfigChange
      ? manager.applyHeldConfigChange(descriptor.id)
      : manager.getOrCreateActiveSession();
    retry.catch((e) => {
      logError("[AgentMode] retry failed", e);
    });
  };

  return (
    <AgentStatusCard
      tone="error"
      summary={t(
        `${descriptor.displayName} ran into a problem`,
        `${descriptor.displayName} 遇到了问题`
      )}
      message={bootError}
      action={{ label: t("Retry", "重试"), onClick: handleRetry }}
    />
  );
};
