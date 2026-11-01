import { t } from "@/lib/i18n";
import { CODEX_BINARY_NAME, codexBinaryPathPlaceholder } from "@/agentMode/backends/codex/cliSetup";
import { CODEX_MIN_VERSION } from "@/agentMode/backends/codex/codexVersion";
import {
  ManagedBinaryConfigView,
  type ManagedBinaryConfigProps,
} from "@/agentMode/backends/shared/ui/ManagedBinaryConfigView";
import {
  AuthenticationSection,
  type AuthenticationState,
} from "@/agentMode/backends/shared/ui/AuthenticationSection";
import React from "react";

export type {
  ManagedBinarySource as CodexBinarySource,
  ManagedBinaryInfo as CodexManagedInfo,
  ManagedBinaryConfigActions as CodexConfigActions,
} from "@/agentMode/backends/shared/ui/ManagedBinaryConfigView";

export interface CodexConfigViewProps extends ManagedBinaryConfigProps {
  auth: AuthenticationState;
}

export const CodexConfigView: React.FC<CodexConfigViewProps> = (props) => (
  <ManagedBinaryConfigView
    authStatus={props.auth.status}
    {...props}
    title={t("Configure Codex", "配置 Codex")}
    binaryName={CODEX_BINARY_NAME}
    managedDescription={t(
      "Let Copilot download and update Codex for you.",
      "让 Copilot 为你下载和更新 Codex。"
    )}
    customDescription={
      <>
        {t("Copilot supports ", "Copilot 支持 ")}
        <code>@agentclientprotocol/codex-acp</code> {CODEX_MIN_VERSION}
        {t(
          " or newer. You manage its updates; Auto-detect checks the usual npm locations and your PATH.",
          " 或更新版本。更新由你自行管理；“自动检测”会搜索常用 npm 位置和 PATH。"
        )}
      </>
    }
    customPathPlaceholder={codexBinaryPathPlaceholder(process.platform)}
    customPathNotFoundHint={t(
      `A supported ${CODEX_BINARY_NAME} adapter was not found. Install your own adapter or choose Managed by Copilot.`,
      `未找到受支持的 ${CODEX_BINARY_NAME} 适配器。请自行安装适配器，或选择“由 Copilot 管理”。`
    )}
    upgradeLabel={t("Update", "更新")}
  >
    <AuthenticationSection
      ready={props.state.kind === "ready"}
      unavailableMessage={t("Set up Codex above to sign in.", "请先在上方配置 Codex，再登录。")}
      auth={props.auth}
    />
  </ManagedBinaryConfigView>
);

export { CODEX_PINNED_VERSION } from "@/agentMode/backends/codex/cliSetup";
