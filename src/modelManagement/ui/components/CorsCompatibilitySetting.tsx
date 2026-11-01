import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SettingSwitch } from "@/components/ui/setting-switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import React from "react";

export interface CorsCompatibilitySettingProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const CORS_COMPATIBILITY_TOOLTIP = t(
  "Some Quick Chat models require CORS compatibility to connect. When enabled, responses appear only after they finish instead of streaming token by token.",
  "部分快速聊天模型需要开启 CORS 兼容才能连接。开启后，回复将在生成完毕后一次性显示，而非逐字流式显示。"
);

export const CorsCompatibilitySetting: React.FC<CorsCompatibilitySettingProps> = ({
  checked,
  onCheckedChange,
}) => (
  <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
    <div className="tw-inline-flex tw-items-center tw-gap-1">
      <span className="tw-text-sm tw-font-medium tw-text-normal">
        {t("Enable CORS", "启用 CORS")}
      </span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t("About Quick Chat CORS compatibility", "关于快速聊天的 CORS 兼容性")}
              className="tw-size-6 tw-p-0 tw-text-muted hover:tw-bg-transparent hover:tw-text-normal"
            >
              <Info className="tw-size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="tw-w-72">
            {CORS_COMPATIBILITY_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <SettingSwitch
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={t("Enable CORS", "启用 CORS")}
    />
  </div>
);
