import { t } from "@/lib/i18n";
import { ProjectConfig } from "@/aiParams";
import { AddProjectModal } from "@/components/modals/project/AddProjectModal";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Button } from "@/components/ui/button";
import { logError } from "@/logger";
import { getProjectFolderPath } from "@/projects/projectPaths";
import { ProjectFileManager } from "@/projects/ProjectFileManager";
import { getCachedProjectRecordById } from "@/projects/state";
import { FolderSearch, Pencil, Trash2 } from "lucide-react";
import { App, Notice, TFolder } from "obsidian";
import React, { memo } from "react";

export function revealProjectFolder(app: App, project: ProjectConfig): void {
  const record = getCachedProjectRecordById(project.id);
  const folderPath = record ? getProjectFolderPath(record.folderName) : null;
  const folder = folderPath ? app.vault.getAbstractFileByPath(folderPath) : null;
  if (folder instanceof TFolder) {
    const fileExplorer = (
      app as unknown as {
        internalPlugins?: {
          getPluginById?: (
            id: string
          ) =>
            | { enabled?: boolean; instance?: { revealInFolder?: (folder: TFolder) => void } }
            | undefined;
        };
      }
    ).internalPlugins?.getPluginById?.("file-explorer");
    if (fileExplorer?.enabled && fileExplorer.instance?.revealInFolder) {
      fileExplorer.instance.revealInFolder(folder);
      return;
    }
  }
  new Notice(`Can't reveal "${project.name}" — its folder isn't visible in the file explorer.`);
}

interface AgentProjectRowActionsProps {
  app: App;
  project: ProjectConfig;
  onDeleted?: (projectId: string) => void;
}

export const AgentProjectRowActions = memo(
  ({ app, project, onDeleted }: AgentProjectRowActionsProps): React.ReactElement => {
    const handleEdit = () => {
      new AddProjectModal(
        app,
        async (next) => {
          await ProjectFileManager.getInstance(app).updateProject(project.id, next);
        },
        project
      ).open();
    };

    const handleDelete = () => {
      new ConfirmModal(
        app,
        async () => {
          try {
            await ProjectFileManager.getInstance(app).deleteProject(project.id);
            onDeleted?.(project.id);
          } catch (e) {
            logError("[AgentProjectRowActions] deleteProject failed", e);
            new Notice(
              t(`Failed to delete project "${project.name}".`, `删除项目“${project.name}”失败。`)
            );
          }
        },
        t(
          `Delete project "${project.name}"? This removes its configuration; your notes stay in the vault.`,
          `删除项目“${project.name}”吗？此操作将移除项目配置，但笔记仍保留在仓库中。`
        ),
        t("Delete project", "删除项目"),
        t("Delete", "删除"),
        t("Cancel", "取消")
      ).open();
    };

    return (
      <div className="tw-flex tw-items-center tw-gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          aria-label={t(`Reveal ${project.name} in vault`, `在仓库中显示 ${project.name}`)}
          title={t("Reveal in vault", "在仓库中显示")}
          className="tw-size-5 tw-p-0"
          onClick={(e) => {
            e.stopPropagation();
            revealProjectFolder(app, project);
          }}
        >
          <FolderSearch className="tw-size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t(`Edit project ${project.name}`, `编辑项目 ${project.name}`)}
          title={t("Edit project", "编辑项目")}
          className="tw-size-5 tw-p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
        >
          <Pencil className="tw-size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t(`Delete project ${project.name}`, `删除项目 ${project.name}`)}
          title={t("Delete", "删除")}
          className="tw-size-5 tw-p-0 tw-text-error hover:tw-text-error"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 className="tw-size-3.5" />
        </Button>
      </div>
    );
  }
);

AgentProjectRowActions.displayName = "AgentProjectRowActions";
