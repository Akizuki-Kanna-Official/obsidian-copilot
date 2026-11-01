import { t } from "@/lib/i18n";
import { SettingItem } from "@/components/ui/setting-item";
import type { ClaudeAutoModePermission } from "@/settings/model";
import React from "react";

const AUTO_MODE_OPTIONS: { label: string; value: ClaudeAutoModePermission }[] = [
  { label: t("Auto", "自动"), value: "auto" },
  { label: t("Accept edits", "允许编辑"), value: "acceptEdits" },
  { label: t("Bypass permissions", "跳过权限检查"), value: "bypassPermissions" },
];

export interface ClaudeAutoModePermissionSettingProps {
  value: ClaudeAutoModePermission;
  onChange: (value: ClaudeAutoModePermission) => void;
}

export const ClaudeAutoModePermissionSetting: React.FC<ClaudeAutoModePermissionSettingProps> = ({
  value,
  onChange,
}) => (
  <SettingItem
    type="select"
    title={t("Auto mode permissions", "自动模式权限")}
    description={t(
      "Auto lets Claude judge each request and still ask about risky ones, Accept edits auto-approves file edits only, and Bypass permissions skips every check.",
      "“自动”让 Claude 判断每项请求，并对有风险的操作征求确认；“允许编辑”仅自动批准文件编辑；“跳过权限检查”则跳过所有检查。"
    )}
    value={value}
    options={AUTO_MODE_OPTIONS}
    onChange={(next) => onChange(next as ClaudeAutoModePermission)}
  />
);
