import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Lock } from "lucide-react";
import React from "react";

const LICENSE_REQUIRED = t("Copilot license required", "需要 Copilot 许可证");

export function LicenseRequiredIcon({ className }: { className?: string }) {
  return (
    <span className={cn("tw-flex tw-shrink-0 tw-items-center tw-text-muted", className)}>
      <HelpTooltip content={LICENSE_REQUIRED} side="top" delayDuration={0}>
        <Lock className="tw-size-3.5" />
      </HelpTooltip>
      <span className="tw-sr-only">{LICENSE_REQUIRED}</span>
    </span>
  );
}
