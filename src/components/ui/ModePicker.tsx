import { t } from "@/lib/i18n";
import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CopilotMode } from "@/agentMode";
import { cn } from "@/lib/utils";

export interface ModePickerOverride {
  options: { label: string; value: CopilotMode }[];
  value: CopilotMode | null;
  onChange: (value: CopilotMode) => void;
  disabled?: boolean;
}

interface ModePickerProps {
  override: ModePickerOverride;
  className?: string;
}

const MODE_DISPLAY: Record<CopilotMode, { label: string; description: string }> = {
  auto: {
    label: t("Auto", "自动"),
    description: t(
      "Uses the agent's Auto permissions for tools and edits.",
      "使用智能体的自动权限执行工具和编辑操作。"
    ),
  },
  plan: {
    label: t("Plan", "规划"),
    description: t(
      "Drafts a plan and waits for your approval before editing.",
      "先起草计划，待您批准后再编辑。"
    ),
  },
  default: {
    label: t("Safe", "安全"),
    description: t(
      "Allows edits under the agent's approval rules.",
      "按智能体的审批规则允许编辑。"
    ),
  },
};

function getModeLabel(value: CopilotMode): string {
  return MODE_DISPLAY[value]?.label ?? value;
}

export function ModePicker({ override, className }: ModePickerProps) {
  const { options, value, onChange, disabled } = override;
  const triggerLabel = value ? getModeLabel(value) : t("Mode", "模式");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost2"
          size="sm"
          disabled={disabled}
          className={cn(
            "tw-shrink-0 tw-text-muted",
            value === "plan" &&
              "tw-text-blue/70 hover:tw-text-blue/100 focus-visible:tw-text-blue/100",
            value === "auto" &&
              "tw-text-red/70 hover:tw-text-red/100 focus-visible:tw-text-red/100",
            className
          )}
          title={t("Mode", "模式")}
        >
          <span className="tw-truncate">{triggerLabel}</span>
          {!disabled && <ChevronDown className="tw-mt-0.5 tw-size-4 tw-shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="tw-w-[320px]">
        {options.map((opt) => {
          const display = MODE_DISPLAY[opt.value];
          const isActive = value === opt.value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className="tw-items-start tw-gap-2 tw-py-2"
            >
              <div className="tw-mt-0.5 tw-w-3 tw-shrink-0">
                {isActive && <Check className="tw-size-3 tw-text-muted" />}
              </div>
              <div className="tw-flex tw-flex-col tw-gap-0.5">
                <span className="tw-text-sm tw-font-medium tw-text-normal">
                  {display?.label ?? opt.label}
                </span>
                {display?.description && (
                  <span className="tw-text-xs tw-leading-snug tw-text-muted">
                    {display.description}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
