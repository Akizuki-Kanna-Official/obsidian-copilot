import { t } from "@/lib/i18n";
import {
  ManagedBinaryConfigView,
  type ManagedBinaryConfigProps,
} from "@/agentMode/backends/shared/ui/ManagedBinaryConfigView";
import React from "react";

export type {
  ManagedBinarySource as OpencodeBinarySource,
  ManagedBinaryRunState as OpencodeRunState,
  ManagedBinaryInfo as OpencodeManagedInfo,
  ManagedBinaryConfigActions as OpencodeConfigActions,
} from "@/agentMode/backends/shared/ui/ManagedBinaryConfigView";

export type OpencodeConfigViewProps = ManagedBinaryConfigProps;

export const OpencodeConfigView: React.FC<OpencodeConfigViewProps> = (props) => (
  <ManagedBinaryConfigView
    {...props}
    title={t("Configure OpenCode", "配置 OpenCode")}
    binaryName="opencode"
    managedDescription={t(
      "Let Copilot download and update OpenCode for you.",
      "让 Copilot 为你下载和更新 OpenCode。"
    )}
    customDescription={t(
      "Use an OpenCode installation you already have on this computer.",
      "使用这台电脑上已安装的 OpenCode。"
    )}
    customPathPlaceholder="/absolute/path/to/opencode"
    customPathNotFoundHint={t(
      "OpenCode wasn't found. Install it, or paste the path to an existing installation.",
      "未找到 OpenCode。请安装它，或粘贴现有安装的路径。"
    )}
    upgradeLabel={
      props.activeSource === "custom"
        ? t("Update OpenCode", "更新 OpenCode")
        : t(`Update to v${props.managed.version}`, `更新至 v${props.managed.version}`)
    }
  />
);
