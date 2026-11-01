import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ClampedContent } from "@/components/ui/clamped-content";
import { ReactModal } from "@/components/modals/ReactModal";
import { App } from "obsidian";
import React from "react";

export interface SkillLoadIssue {
  location: string;
  reason: string;
  offendingText?: string;
  revealLabel: "Reveal in vault" | "Show in folder";
  onFixWithAgent: () => void;
  onOpen: () => void;
  onReveal: () => void;
}

export interface SkillLoadIssuesProps {
  issues: readonly SkillLoadIssue[];
  onViewDetails: () => void;
}

export const SkillLoadIssues: React.FC<SkillLoadIssuesProps> = ({ issues, onViewDetails }) => {
  const title = t(
    `${issues.length} skill${issues.length === 1 ? "" : "s"} could not be loaded`,
    `${issues.length} 个技能无法加载`
  );

  return (
    <section
      className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded-sm tw-border tw-border-solid tw-p-3 tw-text-left tw-text-ui-smaller tw-bg-warning/10 tw-border-warning/40"
      role="alert"
      aria-label={title}
    >
      <div className="tw-min-w-0">
        <strong className="tw-block tw-text-ui-small tw-text-warning">{title}</strong>
        <p className="tw-mx-0 tw-mb-0 tw-mt-0.5 tw-text-normal">
          {t("The skills have format errors.", "这些技能存在格式错误。")}
        </p>
      </div>
      <div className="tw-flex tw-shrink-0 tw-gap-1">
        <Button variant="secondary" size="sm" onClick={onViewDetails}>
          {t("View details", "查看详情")}
        </Button>
      </div>
    </section>
  );
};

export interface SkillLoadIssuesModalContentProps {
  issues: readonly SkillLoadIssue[];
  onFixAll: () => void;
  onClose: () => void;
}

export const SkillLoadIssuesModalContent: React.FC<SkillLoadIssuesModalContentProps> = ({
  issues,
  onFixAll,
  onClose,
}) => {
  // Close first so Obsidian does not open an indexed file behind this modal. https://github.com/Brevilabs/obsidian-copilot-private/issues/166
  const runAction = (action: () => void): void => {
    onClose();
    action();
  };

  return (
    <>
      {issues.length > 1 && (
        <div className="tw-flex tw-justify-end">
          <Button size="sm" onClick={() => runAction(onFixAll)}>
            {t("Fix all with agent", "让智能体修复全部")}
          </Button>
        </div>
      )}
      <div className="tw-mt-3 tw-max-h-96 tw-overflow-y-auto tw-pr-1">
        {issues.map((issue) => (
          <article
            className="tw-border-x-0 tw-border-b-0 tw-border-t tw-border-solid tw-py-3 tw-border-warning/30"
            key={issue.location}
          >
            <div className="tw-break-words tw-font-mono tw-text-ui-small tw-font-semibold tw-text-normal">
              {issue.location}
            </div>
            <p className="tw-mx-0 tw-mb-0 tw-mt-1 tw-text-ui-smaller tw-text-muted">
              {issue.reason}
            </p>
            {issue.offendingText !== undefined && (
              <ClampedContent collapsedClassName="tw-max-h-28">
                <code className="tw-mt-1 tw-block tw-whitespace-pre-wrap tw-rounded-sm tw-bg-primary-alt tw-p-1 tw-text-smallest">
                  {issue.offendingText}
                </code>
              </ClampedContent>
            )}
            <div className="tw-mt-2 tw-flex tw-gap-1">
              <Button variant="secondary" size="sm" onClick={() => runAction(issue.onFixWithAgent)}>
                {t("Fix with agent", "让智能体修复")}
              </Button>
              <Button variant="ghost2" size="sm" onClick={() => runAction(issue.onOpen)}>
                {t("Open SKILL.md", "打开 SKILL.md")}
              </Button>
              <Button variant="ghost2" size="sm" onClick={() => runAction(issue.onReveal)}>
                {issue.revealLabel === "Reveal in vault"
                  ? t("Reveal in vault", "在仓库中显示")
                  : t("Show in folder", "在文件夹中显示")}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

export class SkillLoadIssuesModal extends ReactModal {
  constructor(
    app: App,
    private readonly issues: readonly SkillLoadIssue[],
    private readonly onFixAll: () => void
  ) {
    super(
      app,
      t(
        `${issues.length} skill${issues.length === 1 ? "" : "s"} could not be loaded`,
        `${issues.length} 个技能无法加载`
      )
    );
  }

  protected renderContent(close: () => void): React.ReactElement {
    return (
      <SkillLoadIssuesModalContent issues={this.issues} onFixAll={this.onFixAll} onClose={close} />
    );
  }
}

export const AllSkillsNotLoaded: React.FC = () => (
  <div className="tw-rounded-sm tw-border tw-border-dashed tw-border-border tw-bg-primary tw-px-3 tw-py-6 tw-text-left tw-text-ui-smaller tw-text-muted">
    {t(
      "No skills are loaded yet. Choose View details above to repair a SKILL.md. When it loads successfully, it will move into the loaded list.",
      "尚未加载任何技能。点击上方“查看详情”修复 SKILL.md；加载成功后，它将出现在已加载列表中。"
    )}
  </div>
);
