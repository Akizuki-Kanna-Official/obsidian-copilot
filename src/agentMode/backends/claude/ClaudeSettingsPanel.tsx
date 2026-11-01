import { t } from "@/lib/i18n";
import { EnvOverridesSetting } from "@/agentMode/backends/shared/EnvOverridesSetting";
import { ClaudeAutoModePermissionSetting } from "@/agentMode/backends/claude/ui/ClaudeAutoModePermissionSetting";
import { SettingItem } from "@/components/ui/setting-item";
import type CopilotPlugin from "@/main";
import { useSettingsValue } from "@/settings/model";
import type { App } from "obsidian";
import React from "react";
import { resolveClaudeAutoModePermission, updateClaudeFields } from "./descriptor";

interface Props {
  plugin: CopilotPlugin;
  app: App;
}

export const ClaudeSettingsPanel: React.FC<Props> = () => {
  const settings = useSettingsValue();
  return (
    <>
      <ClaudeAutoModePermissionSetting
        value={resolveClaudeAutoModePermission(settings)}
        onChange={(autoModePermission) => updateClaudeFields({ autoModePermission })}
      />

      <SettingItem
        type="switch"
        title={t("Show extended thinking", "显示深度思考")}
        description={t(
          "Show the model's reasoning as it works. Uses more tokens.",
          "显示模型工作时的推理过程。这会消耗更多 token。"
        )}
        checked={Boolean(settings.agentMode?.backends?.claude?.enableThinking)}
        onCheckedChange={(checked) => updateClaudeFields({ enableThinking: checked })}
      />

      <EnvOverridesSetting
        backendDisplayName="Claude"
        value={settings.agentMode?.backends?.claude?.envOverrides}
        onChange={(next) => updateClaudeFields({ envOverrides: next })}
        hintExamples={["CLAUDE_CONFIG_DIR", "HTTPS_PROXY"]}
      />
    </>
  );
};
