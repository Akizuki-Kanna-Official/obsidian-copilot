import { t } from "@/lib/i18n";
import { logError } from "@/logger";
import { App, Modal } from "obsidian";
import type { BackendId, Skill } from "@/agentMode/skills/types";

export type MigrateConfirmVariant =
  | "project-single"
  | "project-mirrored"
  | "disable-last-agent"
  | "proactive-consolidate";

export interface MigrateActionLine {
  verb: string;
  detail: string;
  note?: string;
}

export interface MigrateSkillConfirmModalArgs {
  variant: MigrateConfirmVariant;
  skill: Skill;
  targetAgent: BackendId | null;
  targetAgentDisplayName?: string;
  resolvedCanonicalName: string;
  sourceDuplicatePaths: ReadonlyArray<string>;
  actionLines: ReadonlyArray<MigrateActionLine>;
  onConfirm: (suppressFuture: boolean) => void | Promise<void>;
  onCancel?: () => void;
}

export class MigrateSkillConfirmModal extends Modal {
  private readonly args: MigrateSkillConfirmModalArgs;
  private confirmed = false;
  private suppressFuture = false;

  constructor(app: App, args: MigrateSkillConfirmModalArgs) {
    super(app);
    this.args = args;
    // @ts-ignore - setTitle is documented but missing from the typings.
    this.setTitle(buildTitle(args));
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tw-flex", "tw-flex-col", "tw-gap-3");

    const bodyEl = contentEl.createEl("p", {
      cls: "tw-m-0 tw-text-ui-smaller tw-text-normal tw-whitespace-pre-line",
      text: buildBody(this.args),
    });
    bodyEl.setAttr("data-test-id", "migrate-confirm-body");

    if (this.args.sourceDuplicatePaths.length > 0) {
      const list = contentEl.createEl("ul", {
        cls: "tw-m-0 tw-list-none tw-space-y-1 tw-pl-0 tw-font-mono tw-text-ui-smaller tw-text-normal",
      });
      for (const path of this.args.sourceDuplicatePaths) {
        const li = list.createEl("li", {
          cls: "tw-flex tw-items-baseline tw-gap-2",
        });
        li.createSpan({ cls: "tw-text-faint", text: "•" });
        li.createSpan({ cls: "tw-flex-1", text: path });
      }
    }

    if (this.args.resolvedCanonicalName !== this.args.skill.name) {
      contentEl.createEl("p", {
        cls: "tw-m-0 tw-text-ui-smaller tw-text-warning",
        text: t(
          `The name "${this.args.skill.name}" is already taken in your shared folder. ` +
            `The migrated skill will be named "${this.args.resolvedCanonicalName}".`,
          `共享文件夹中已存在名称“${this.args.skill.name}”。迁移后的技能将命名为“${this.args.resolvedCanonicalName}”。`
        ),
      });
    }

    const willHeader = contentEl.createDiv({
      cls: "tw-text-ui-smaller tw-text-muted",
      text: t("Copilot will:", "Copilot 将执行："),
    });
    willHeader.setAttr("data-test-id", "migrate-confirm-will-header");
    const actionList = contentEl.createEl("ul", {
      cls: "tw-m-0 tw-list-none tw-space-y-1 tw-pl-0 tw-font-mono tw-text-ui-smaller tw-text-normal",
    });
    for (const line of this.args.actionLines) {
      const li = actionList.createEl("li", {
        cls: "tw-flex tw-items-baseline tw-gap-2",
      });
      li.createSpan({ cls: "tw-text-faint", text: "•" });
      const body = li.createSpan({ cls: "tw-flex-1" });
      body.createSpan({
        cls: "tw-inline-block tw-min-w-[64px] tw-text-muted",
        text: t(
          line.verb,
          (
            { Move: "移动", Delete: "删除", Create: "创建", "Not create": "不创建" } as Record<
              string,
              string
            >
          )[line.verb] ?? line.verb
        ),
      });
      body.createSpan({
        text: ` ${t(line.detail, line.detail === "any shortcuts (no agents enabled)." ? "任何快捷方式（未启用任何智能体）。" : line.detail)}`,
      });
      if (line.note !== undefined && line.note.length > 0) {
        body.createSpan({
          cls: "tw-ml-1.5 tw-font-sans tw-text-smallest tw-text-faint",
          text: t(
            line.note,
            (
              {
                "(identical duplicate)": "（相同副本）",
                "(shortcut to the new location)": "（指向新位置的快捷方式）",
              } as Record<string, string>
            )[line.note] ?? line.note
          ),
        });
      }
    }

    const outro = buildOutro(this.args);
    if (outro !== null) {
      contentEl.createEl("p", {
        cls: "tw-m-0 tw-text-ui-smaller tw-text-muted tw-whitespace-pre-line",
        text: outro,
      });
    }

    const checkboxRow = contentEl.createEl("label", {
      cls: "tw-flex tw-items-center tw-gap-2 tw-text-ui-smaller tw-text-normal tw-cursor-pointer",
    });
    const checkbox = checkboxRow.createEl("input", {
      cls: "tw-size-checkbox",
      attr: { type: "checkbox" },
    });
    checkbox.addEventListener("change", () => {
      this.suppressFuture = checkbox.checked;
    });
    checkboxRow.createSpan({
      text: t("Don't ask again for future migrations", "今后迁移时不再询问"),
    });

    const buttonRow = contentEl.createDiv({
      cls: "tw-flex tw-justify-end tw-gap-2 tw-pt-2",
    });
    const cancelBtn = buttonRow.createEl("button", {
      cls: "mod-secondary",
      text: t("Cancel", "取消"),
    });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });
    const confirmBtn = buttonRow.createEl("button", {
      cls: "mod-cta",
      text: buildConfirmLabel(this.args),
    });
    confirmBtn.addEventListener("click", () => {
      this.confirmed = true;
      const result = this.args.onConfirm(this.suppressFuture);
      if (result instanceof Promise) {
        result.catch((err) => logError("MigrateSkillConfirmModal onConfirm failed", err));
      }
      this.close();
    });
  }

  onClose(): void {
    if (!this.confirmed) {
      this.args.onCancel?.();
    }
    this.contentEl.empty();
  }
}

function buildTitle(args: MigrateSkillConfirmModalArgs): string {
  const name = args.skill.name;
  switch (args.variant) {
    case "project-single":
      return t(
        `Move "${name}" to share with ${args.targetAgentDisplayName ?? "another agent"}?`,
        `移动“${name}”以共享给 ${args.targetAgentDisplayName ?? "另一个智能体"}？`
      );
    case "project-mirrored":
      return t(
        `Consolidate "${name}" and share with ${args.targetAgentDisplayName ?? "another agent"}?`,
        `合并“${name}”并共享给 ${args.targetAgentDisplayName ?? "另一个智能体"}？`
      );
    case "disable-last-agent":
      return t(
        `Move "${name}" to your shared folder before disabling ${
          args.targetAgentDisplayName ?? "this agent"
        }?`,
        `禁用 ${args.targetAgentDisplayName ?? "此智能体"} 前，先将“${name}”移至共享文件夹？`
      );
    case "proactive-consolidate":
      return t(`Consolidate "${name}" into your shared folder?`, `将“${name}”合并到共享文件夹？`);
  }
}

function buildBody(args: MigrateSkillConfirmModalArgs): string {
  const target = args.targetAgentDisplayName ?? t("another agent", "另一个智能体");
  switch (args.variant) {
    case "project-single":
      return t(
        `This skill currently lives only in your ${sourceAgentLabel(args)} project folder.\n` +
          `To enable it for ${target}, Copilot needs to move it to a shared location\n` +
          `so both agents stay in sync.`,
        `此技能目前仅位于 ${sourceAgentLabel(args)} 的项目文件夹中。\n要为 ${target} 启用此技能，Copilot 需要将它移至共享位置，以便两个智能体保持同步。`
      );
    case "project-mirrored":
      return t(
        `The same skill is currently duplicated in ${pluralFolders(args.sourceDuplicatePaths.length)}:`,
        `此技能目前在 ${args.sourceDuplicatePaths.length} 个项目文件夹中存在副本：`
      );
    case "disable-last-agent":
      return t(`This skill currently lives only in:`, `此技能目前仅位于：`);
    case "proactive-consolidate":
      return t(`The same skill is currently duplicated in:`, `此技能目前在以下位置存在副本：`);
  }
}

function buildOutro(args: MigrateSkillConfirmModalArgs): string | null {
  const source = args.targetAgentDisplayName ?? t("this agent", "此智能体");
  switch (args.variant) {
    case "project-single":
      return t(
        `You can still edit the skill exactly as before — there's just one copy now,\n` +
          `so changes are visible to both agents immediately.`,
        `你仍可像以前一样编辑此技能，只是现在仅保留一份副本。\n两个智能体都能立即看到修改。`
      );
    case "project-mirrored":
      return t(
        `After this, edits to the skill are visible to all ${args.actionLines.filter((l) => l.verb === "Create").length} agents.`,
        `之后，对技能的修改将对全部 ${args.actionLines.filter((l) => l.verb === "Create").length} 个智能体可见。`
      );
    case "disable-last-agent":
      return t(
        `If you disable ${source}, the file has nowhere to live in its project folder.\n` +
          `Copilot can preserve it by moving the skill to your shared skills folder with\n` +
          `no agents enabled — you can toggle agents back on any time, or delete it later\n` +
          `from the Skills tab.`,
        `禁用 ${source} 后，此文件将无法继续保留在其项目文件夹中。\nCopilot 可将技能移至共享文件夹，并暂不为任何智能体启用。你随时可以重新启用，或稍后在“技能”选项卡中删除它。`
      );
    case "proactive-consolidate":
      return t(
        `Editing, renaming, or deleting one copy would silently diverge from the others.\n` +
          `Copilot can consolidate them into a single shared location, with a shortcut in\n` +
          `each agent folder so all agents still see the skill.\n\n` +
          `After this, your edits stay in sync across all agents automatically.`,
        `单独编辑、重命名或删除一份副本会导致内容不一致。\nCopilot 可将这些副本合并到一个共享位置，并在每个智能体文件夹中创建快捷方式，让所有智能体仍能访问此技能。\n\n之后，修改会自动在所有智能体间保持同步。`
      );
  }
}

function buildConfirmLabel(args: MigrateSkillConfirmModalArgs): string {
  const target = args.targetAgentDisplayName ?? t("agent", "智能体");
  switch (args.variant) {
    case "project-single":
    case "project-mirrored":
      return t(`Move and enable ${target}`, `移动并启用 ${target}`);
    case "disable-last-agent":
      return t(`Move and disable ${target}`, `移动并禁用 ${target}`);
    case "proactive-consolidate":
      return t("Consolidate", "合并");
  }
}

function sourceAgentLabel(args: MigrateSkillConfirmModalArgs): string {
  if (args.skill.location.kind !== "project") return "agent";
  const [first] = args.skill.location.agentDirs;
  return first ?? "agent";
}

function pluralFolders(n: number): string {
  if (n === 2) return "two project folders";
  if (n === 3) return "three project folders";
  return `${n} project folders`;
}
