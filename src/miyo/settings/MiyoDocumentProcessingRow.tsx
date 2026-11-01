import { t } from "@/lib/i18n";
import { SettingSwitch } from "@/components/ui/setting-switch";
import { CapabilityRow } from "@/settings/v2/components/CapabilityRow";
import React from "react";

export interface MiyoDocumentProcessingRowProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export const MiyoDocumentProcessingRow: React.FC<MiyoDocumentProcessingRowProps> = ({
  enabled,
  onEnabledChange,
}) => (
  <CapabilityRow
    title={t("Miyo document processing", "Miyo 文档处理")}
    description={t(
      "Miyo parses PDF and EPUB files on your computer.",
      "Miyo 在你的电脑上解析 PDF 和 EPUB 文件。"
    )}
    control={
      <SettingSwitch
        checked={enabled}
        onCheckedChange={onEnabledChange}
        aria-label={t("Enable Miyo document processing", "启用 Miyo 文档处理")}
      />
    }
  />
);
