import { t } from "@/lib/i18n";
import type { BuiltinPreferences } from "@/settings/builtinSkillPreferences";
import type { AgentBrand, BackendId } from "@/agentMode/session/types";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, CircleOff, Eye, MoreVertical, Power } from "lucide-react";
import { AgentIconButton } from "./AgentIconButton";
import { SkillRowLayout } from "./SkillRowLayout";

export interface BuiltinSkillRow {
  name: string;
  description: string;
  content: string;
}

export interface BuiltinSkillsTableProps {
  skills: readonly BuiltinSkillRow[];
  preferences?: BuiltinPreferences;
  unavailableReasons?: Readonly<Record<string, string>>;
  agents: readonly AgentBrand[];
  availableAgents: readonly BackendId[];
  pendingSkills: readonly string[];
  error?: string;
  onToggleSkill: (name: string, enabled: boolean) => void;
  onToggleAgent: (name: string, agent: BackendId, enabled: boolean) => void;
}

export function BuiltinSkillsTable({
  skills,
  preferences,
  unavailableReasons,
  agents,
  availableAgents,
  pendingSkills,
  error,
  onToggleSkill,
  onToggleAgent,
}: BuiltinSkillsTableProps) {
  return (
    <section aria-label={t("Built-in skills", "内置技能")} className="tw-space-y-3">
      <div role="heading" aria-level={3} className="tw-text-left tw-text-base tw-font-semibold">
        {t("Built-in skills", "内置技能")}
      </div>
      {error && (
        <div role="alert" className="tw-text-ui-smaller tw-text-error">
          {error}
        </div>
      )}
      <div className="tw-space-y-1.5">
        {skills.map((skill) => (
          <BuiltinSkillItem
            key={skill.name}
            skill={skill}
            preference={preferences?.[skill.name]}
            unavailableReason={unavailableReasons?.[skill.name]}
            agents={agents}
            availableAgents={availableAgents}
            pending={pendingSkills.includes(skill.name)}
            onToggleSkill={onToggleSkill}
            onToggleAgent={onToggleAgent}
          />
        ))}
        {skills.length === 0 && (
          <p className="tw-text-ui-smaller tw-text-muted">
            {t("No built-in skills match your search.", "没有找到匹配的内置技能。")}
          </p>
        )}
      </div>
    </section>
  );
}

interface BuiltinSkillItemProps extends Pick<
  BuiltinSkillsTableProps,
  "agents" | "availableAgents" | "onToggleSkill" | "onToggleAgent"
> {
  skill: BuiltinSkillRow;
  preference?: BuiltinPreferences[string];
  unavailableReason?: string;
  pending: boolean;
}

const BuiltinSkillItem = React.memo(function BuiltinSkillItem({
  skill,
  preference,
  unavailableReason,
  agents,
  availableAgents,
  pending,
  onToggleSkill,
  onToggleAgent,
}: BuiltinSkillItemProps) {
  const skillEnabled = preference?.disabled !== true;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  return (
    <div ref={containerRef}>
      <SkillRowLayout
        name={skill.name}
        description={skill.description}
        menuOpen={menuOpen}
        annotations={
          <>
            {!skillEnabled && (
              <>
                <Badge
                  variant="secondary"
                  className="tw-hidden tw-shrink-0 @[140px]/skill-title:tw-inline-flex"
                >
                  {t("Disabled", "已禁用")}
                </Badge>
                <span
                  title={t("Disabled", "已禁用")}
                  aria-label={t("Disabled", "已禁用")}
                  className="tw-shrink-0 @[140px]/skill-title:tw-hidden"
                >
                  <CircleOff aria-hidden="true" className="tw-size-3.5 tw-text-muted" />
                </span>
              </>
            )}
            {unavailableReason && (
              <span title={unavailableReason} aria-label={unavailableReason}>
                <AlertTriangle className="tw-size-3.5 tw-shrink-0 tw-text-muted" />
              </span>
            )}
          </>
        }
        controls={
          <div className="tw-flex tw-items-center tw-gap-1.5">
            {agents.map((agent) => {
              const available = availableAgents.includes(agent.id);
              const enabled =
                skillEnabled &&
                available &&
                !unavailableReason &&
                !preference?.disabledAgents?.includes(agent.id);
              return (
                <AgentIconButton
                  key={agent.id}
                  Icon={agent.Icon}
                  agentId={agent.id}
                  agentName={agent.displayName}
                  enabled={!!enabled}
                  disabled={pending || !skillEnabled || !available || !!unavailableReason}
                  title={
                    !available
                      ? t(
                          `Set up ${agent.displayName} to enable`,
                          `配置 ${agent.displayName} 后即可启用`
                        )
                      : t(
                          `${skill.name} for ${agent.displayName}`,
                          `${agent.displayName} 的 ${skill.name}`
                        )
                  }
                  onClick={() => onToggleAgent(skill.name, agent.id, !enabled)}
                />
              );
            })}
          </div>
        }
        actions={
          <DropdownMenu modal={false} open={menuOpen} onOpenChange={(open) => setMenuOpen(open)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title={t("More actions", "更多操作")}
                aria-label={t(`More actions for ${skill.name}`, `${skill.name} 的更多操作`)}
              >
                <MoreVertical className="tw-size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" container={containerRef.current}>
              <DropdownMenuItem
                disabled={pending}
                className="tw-gap-2.5 tw-text-ui-small"
                onSelect={() => onToggleSkill(skill.name, !skillEnabled)}
              >
                <Power className="tw-size-3.5" />
                {skillEnabled ? t("Disable skill", "禁用技能") : t("Enable skill", "启用技能")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="tw-gap-2.5 tw-text-ui-small"
                onSelect={() => setPreviewOpen(!previewOpen)}
              >
                <Eye className="tw-size-3.5" />
                {t("View SKILL.md (read-only)", "查看 SKILL.md（只读）")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      {previewOpen && (
        <pre
          aria-label={t(`${skill.name} content (read-only)`, `${skill.name} 内容（只读）`)}
          className="tw-max-h-80 tw-overflow-auto tw-whitespace-pre-wrap tw-break-all tw-rounded-md tw-bg-secondary tw-p-3 tw-text-ui-smaller"
        >
          {skill.content}
        </pre>
      )}
    </div>
  );
});
