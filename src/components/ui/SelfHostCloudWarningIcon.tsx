import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { AlertTriangle } from "lucide-react";
import React from "react";

const SELF_HOST_CLOUD_WARNING = t(
  "Bypasses Self-Host Mode — sends prompts to the cloud. Pick a self-hosted option to keep everything on your machine.",
  "此选项绕过自托管模式，会将提示词发送到云端。如需让所有内容留在本机，请选择自托管选项。"
);

export function SelfHostCloudWarningIcon({
  className,
  stopPropagation = true,
}: {
  className?: string;
  stopPropagation?: boolean;
}) {
  return (
    <span
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn("tw-flex tw-shrink-0 tw-items-center tw-text-warning", className)}
    >
      <HelpTooltip content={SELF_HOST_CLOUD_WARNING} side="top" delayDuration={0}>
        <AlertTriangle className="tw-size-3.5" />
      </HelpTooltip>
    </span>
  );
}
