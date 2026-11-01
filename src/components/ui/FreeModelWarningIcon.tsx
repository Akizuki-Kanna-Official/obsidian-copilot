import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { AlertTriangle } from "lucide-react";
import React from "react";

const FREE_MODEL_PRIVACY_WARNING = t(
  "Free model. The provider may log or train on your prompts. Review their privacy terms before sending sensitive content.",
  "免费模型。服务商可能会记录您的提示词或将其用于训练。发送敏感内容前，请查看其隐私条款。"
);

export function FreeModelWarningIcon({ className }: { className?: string }) {
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className={cn("tw-flex tw-shrink-0 tw-items-center tw-text-warning", className)}
    >
      <HelpTooltip content={FREE_MODEL_PRIVACY_WARNING} side="top" delayDuration={0}>
        <AlertTriangle className="tw-size-3.5" />
      </HelpTooltip>
    </span>
  );
}
