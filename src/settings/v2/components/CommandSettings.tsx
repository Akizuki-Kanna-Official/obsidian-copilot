import { t } from "@/lib/i18n";
import { useChatBackendModelOptions } from "@/hooks/useChatBackendModelOptions";
import { QuickCommandModelSetting } from "@/settings/v2/components/ui/QuickCommandModelSetting";
import React, { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useCustomCommands } from "@/commands/state";
import { MobileCard, MobileCardDropdownAction } from "@/components/ui/mobile-card";
import { CopyPlus, GripVertical, Info, PenLine, Plus, Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { logError } from "@/logger";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { PromptSortStrategy } from "@/types";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { EMPTY_COMMAND } from "@/commands/constants";
import { CustomCommandManager } from "@/commands/customCommandManager";
import { CustomCommandSettingsModal } from "@/commands/CustomCommandSettingsModal";
import { generateCopyCommandName, sortCommandsByOrder } from "@/commands/customCommandUtils";
import { generateDefaultCommands } from "@/commands/migrator";
import { CustomCommand } from "@/commands/type";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { deriveCustomPromptsFolder } from "@/settings/copilotFolder";
import { useApp } from "@/context";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import { Notice } from "obsidian";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

const MobileCommandCard: React.FC<{
  command: CustomCommand;
  commands: CustomCommand[];
  onUpdate: (newCommand: CustomCommand, prevCommandTitle: string) => void | Promise<void>;
  onRemove: (command: CustomCommand) => void | Promise<void>;
  onCopy: (command: CustomCommand) => void | Promise<void>;
  containerRef: React.RefObject<HTMLDivElement>;
}> = ({ command, commands, onUpdate, onRemove, onCopy, containerRef }) => {
  const app = useApp();
  const handleEdit = (cmd: CustomCommand) => {
    const modal = new CustomCommandSettingsModal(app, commands, cmd, async (updatedCommand) => {
      await onUpdate(updatedCommand, cmd.title);
    });
    modal.open();
  };

  const dropdownActions: MobileCardDropdownAction<CustomCommand>[] = [
    {
      icon: <PenLine className="tw-size-4" />,
      label: t("Edit", "编辑"),
      onClick: handleEdit,
    },
    {
      icon: <CopyPlus className="tw-size-4" />,
      label: t("Duplicate", "创建副本"),
      onClick: onCopy,
    },
    {
      icon: <Trash2 className="tw-size-4" />,
      label: t("Delete", "删除"),
      onClick: (cmd) => {
        new ConfirmModal(
          app,
          () => onRemove(cmd),
          t(
            `Are you sure you want to delete the command "${cmd.title}"? This will permanently remove the command file and cannot be undone.`,
            `确定要删除命令“${cmd.title}”吗？这会永久删除命令文件，且无法撤销。`
          ),
          t("Delete Command", "删除命令"),
          t("Delete", "删除"),
          t("Cancel", "取消")
        ).open();
      },
      variant: "destructive",
    },
  ];

  const expandedContent = (
    <div className="tw-flex tw-flex-wrap tw-justify-around">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <div className="tw-flex tw-items-center tw-gap-1">
          <span className="tw-text-sm tw-font-medium">{t("Right-click", "右键菜单")}</span>
          <HelpTooltip
            content={
              <div className="tw-max-w-xs tw-text-xs">
                {t(
                  "Shows the command when you right-click in the editor.",
                  "在编辑器右键菜单中显示此命令。"
                )}
              </div>
            }
          />
        </div>
        <Checkbox
          checked={command.showInContextMenu}
          onCheckedChange={(checked) => {
            void onUpdate(
              {
                ...command,
                showInContextMenu: checked === true,
              },
              command.title
            );
          }}
        />
      </div>
      <div className="tw-flex tw-items-center tw-justify-between  tw-gap-2">
        <div className="tw-flex tw-items-center tw-gap-1">
          <span className="tw-text-sm tw-font-medium">{t("Slash menu", "斜杠菜单")}</span>
          <HelpTooltip
            content={
              <div className="tw-max-w-xs tw-text-xs">
                {t("Shows the command in the chat's / menu.", "在对话的 / 菜单中显示此命令。")}
              </div>
            }
          />
        </div>
        <Checkbox
          checked={command.showInSlashMenu}
          onCheckedChange={safeAsyncHandler(async (checked) =>
            onUpdate(
              {
                ...command,
                showInSlashMenu: checked === true,
              },
              command.title
            )
          )}
        />
      </div>
    </div>
  );

  return (
    <MobileCard
      id={command.title}
      item={command}
      title={command.title}
      isDraggable
      isExpandable
      expandedContent={expandedContent}
      primaryAction={{
        icon: <PenLine className="tw-size-4" />,
        onClick: handleEdit,
        tooltip: t("Edit command", "编辑命令"),
      }}
      dropdownActions={dropdownActions}
      containerRef={containerRef}
    />
  );
};

const SortableTableRow: React.FC<{
  command: CustomCommand;
  commands: CustomCommand[];
  onUpdate: (newCommand: CustomCommand, prevCommandTitle: string) => void | Promise<void>;
  onRemove: (command: CustomCommand) => void | Promise<void>;
  onCopy: (command: CustomCommand) => void | Promise<void>;
}> = ({ command, commands, onUpdate, onRemove, onCopy }) => {
  const app = useApp();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: command.title,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = () => {
    void onRemove(command);
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "tw-transition-colors",
        isDragging &&
          "tw-relative tw-z-[100] tw-cursor-grabbing tw-shadow-lg tw-backdrop-blur-sm tw-border-accent/50"
      )}
    >
      <TableCell className="tw-w-10">
        <div
          {...attributes}
          {...listeners}
          className="tw-flex tw-cursor-grab tw-items-center tw-justify-center"
        >
          <GripVertical className="tw-size-4" />
        </div>
      </TableCell>
      <TableCell>{command.title}</TableCell>
      <TableCell className="tw-text-center">
        <Checkbox
          checked={command.showInContextMenu}
          onCheckedChange={(checked) => {
            void onUpdate(
              {
                ...command,
                showInContextMenu: checked === true,
              },
              command.title
            );
          }}
          className="tw-mx-auto"
        />
      </TableCell>
      <TableCell className="tw-text-center">
        <Checkbox
          checked={command.showInSlashMenu}
          onCheckedChange={safeAsyncHandler(async (checked) =>
            onUpdate(
              {
                ...command,
                showInSlashMenu: checked === true,
              },
              command.title
            )
          )}
          className="tw-mx-auto"
        />
      </TableCell>
      <TableCell className="tw-text-center">
        <div className="tw-flex tw-justify-center tw-space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const modal = new CustomCommandSettingsModal(
                app,
                commands,
                command,
                async (updatedCommand) => {
                  await onUpdate(updatedCommand, command.title);
                }
              );
              modal.open();
            }}
          >
            <PenLine className="tw-size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={safeAsyncHandler(async () => onCopy(command))}
            title={t("Duplicate command", "创建命令副本")}
          >
            <CopyPlus className="tw-size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              new ConfirmModal(
                app,
                handleDelete,
                t(
                  `Are you sure you want to delete the command "${command.title}"? This will permanently remove the command file and cannot be undone.`,
                  `确定要删除命令“${command.title}”吗？这会永久删除命令文件，且无法撤销。`
                ),
                t("Delete Command", "删除命令"),
                t("Delete", "删除"),
                t("Cancel", "取消")
              ).open();
            }}
          >
            <Trash2 className="tw-size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const CommandSettings: React.FC = () => {
  const app = useApp();
  const rawCommands = useCustomCommands();
  const commands = useMemo(() => {
    return sortCommandsByOrder([...rawCommands]);
  }, [rawCommands]);

  const settings = useSettingsValue();
  const { options, resolveSelectionId } = useChatBackendModelOptions(false);
  const customPromptsFolder = deriveCustomPromptsFolder(settings);
  const containerRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleUpdate = async (newCommand: CustomCommand, prevCommandTitle: string) => {
    await CustomCommandManager.getInstance().updateCommand(newCommand, prevCommandTitle);
  };

  const handleCreate = async (newCommand: CustomCommand) => {
    await CustomCommandManager.getInstance().createCommand(newCommand);
  };

  const handleRemove = async (command: CustomCommand) => {
    try {
      await CustomCommandManager.getInstance().deleteCommand(command);

      new Notice(
        t(`Command "${command.title}" deleted successfully!`, `命令“${command.title}”已删除！`)
      );
    } catch (error) {
      logError("Failed to delete command:", error);
      new Notice(t("Failed to delete command. Please try again.", "删除命令失败，请重试。"));
      throw error;
    }
  };

  const handleCopy = async (command: CustomCommand) => {
    try {
      const copyName = generateCopyCommandName(command.title, commands);
      const copiedCommand: CustomCommand = {
        ...command,
        title: copyName,
      };
      await CustomCommandManager.getInstance().createCommand(copiedCommand, {
        autoOrder: false,
      });
    } catch (error) {
      logError("Failed to duplicate command:", error);
      new Notice(t("Failed to duplicate command. Please try again.", "创建命令副本失败，请重试。"));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = commands.findIndex((command) => command.title === active.id);
    const overIndex = commands.findIndex((command) => command.title === over.id);

    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const newCommands = [...commands];
    const [movedCommand] = newCommands.splice(activeIndex, 1);
    newCommands.splice(overIndex, 0, movedCommand);

    await CustomCommandManager.getInstance().reorderCommands(newCommands);
  };

  const renderMobileView = () => (
    <div className="tw-relative md:tw-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <SortableContext
          items={commands.map((command) => command.title)}
          strategy={verticalListSortingStrategy}
        >
          <div className="tw-space-y-2">
            {commands.length === 0 ? (
              <div className="tw-rounded-lg tw-border tw-border-border tw-bg-primary tw-p-8 tw-text-center tw-text-muted">
                {t("No custom commands yet.", "暂无自定义命令。")}
              </div>
            ) : (
              commands.map((command) => (
                <MobileCommandCard
                  key={command.title}
                  command={command}
                  commands={commands}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onCopy={handleCopy}
                  containerRef={containerRef}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );

  return (
    <div className="tw-space-y-4" ref={containerRef}>
      <section className={cn("tw-flex tw-flex-col tw-gap-4")}>
        <div className="tw-flex tw-flex-col tw-gap-2">
          <div className="tw-text-xl tw-font-bold">{t("Custom commands", "自定义命令")}</div>
          <div className="tw-text-sm tw-text-muted">
            {t(
              "Preset prompts you trigger from the editor right-click menu or with a ",
              "预设提示词，可从编辑器右键菜单触发，也可在对话中通过"
            )}
            <code>/</code> {t("command in chat.", "命令触发。")}
          </div>
        </div>

        <div className="tw-flex tw-items-start tw-gap-2 tw-rounded-md tw-border tw-border-solid tw-border-border tw-p-4 tw-text-muted tw-bg-interactive-accent/10">
          <Info className="tw-size-5 tw-shrink-0 tw-text-accent" />{" "}
          <div>
            {t(
              "Commands load automatically from the Markdown files in your custom commands folder",
              "命令会从自定义命令文件夹中的 Markdown 文件自动加载："
            )}{" "}
            <strong>{customPromptsFolder}</strong>
            {t(". Editing a file updates its command.", "。编辑文件后，对应命令会自动更新。")}
          </div>
        </div>

        <SettingSection>
          <QuickCommandModelSetting
            value={resolveSelectionId(settings.quickCommandModelKey)}
            options={options}
            onChange={(value) => updateSetting("quickCommandModelKey", value || undefined)}
          />
          <SettingItem
            type="switch"
            title={t("Command templating", "命令模板变量")}
            description={t(
              "Fill in variables like {activenote}, {foldername}, or {#tag} in commands. Turn off to send commands exactly as written.",
              "自动填入命令中的 {activenote}、{foldername} 或 {#tag} 等变量。关闭后将原样发送命令。"
            )}
            checked={settings.enableCustomPromptTemplating}
            onCheckedChange={(checked) => {
              updateSetting("enableCustomPromptTemplating", checked);
            }}
          />
          <SettingItem
            type="select"
            title={t("Command sort order", "命令排序方式")}
            description={t(
              "How commands are ordered in the slash menu.",
              "斜杠菜单中的命令排列顺序。"
            )}
            value={settings.promptSortStrategy}
            onChange={(value) => updateSetting("promptSortStrategy", value)}
            options={[
              { label: t("Recency", "最近使用"), value: PromptSortStrategy.TIMESTAMP },
              { label: t("Alphabetical", "按字母顺序"), value: PromptSortStrategy.ALPHABETICAL },
              { label: t("Manual", "手动排序"), value: PromptSortStrategy.MANUAL },
            ]}
          />
        </SettingSection>

        <div className="tw-flex tw-flex-col tw-gap-4">
          <div className="tw-flex tw-w-full tw-justify-between tw-gap-2 md:tw-justify-end">
            <div>
              <Button
                variant="secondary"
                onClick={() =>
                  new ConfirmModal(
                    app,
                    generateDefaultCommands,
                    t(
                      "This will add default commands to your custom prompts folder. Do you want to continue?",
                      "这会将默认命令添加到自定义提示词文件夹。是否继续？"
                    ),
                    t("Generate default commands", "生成默认命令")
                  ).open()
                }
              >
                {t("Generate defaults", "生成默认命令")}
              </Button>
            </div>
            <Button
              variant="default"
              className="tw-gap-2"
              onClick={() => {
                const newCommand: CustomCommand = {
                  ...EMPTY_COMMAND,
                };
                const modal = new CustomCommandSettingsModal(
                  app,
                  commands,
                  newCommand,
                  async (updatedCommand) => {
                    await handleCreate(updatedCommand);
                  }
                );
                modal.open();
              }}
            >
              <Plus className="tw-size-2 md:tw-size-4" />
              {t("Add command", "添加命令")}
            </Button>
          </div>

          <div className="tw-hidden md:tw-block">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="tw-w-10"></TableHead>
                    <TableHead>{t("Name", "名称")}</TableHead>
                    <TableHead className="tw-w-24 tw-text-center">
                      <div className="tw-flex tw-items-center tw-justify-center tw-gap-1">
                        {t("Right-click", "右键菜单")}
                        <HelpTooltip
                          content={
                            <div className="tw-max-w-xs tw-text-xs">
                              {t(
                                "Shows the command when you right-click in the editor.",
                                "在编辑器右键菜单中显示此命令。"
                              )}
                            </div>
                          }
                        />
                      </div>
                    </TableHead>
                    <TableHead className="tw-w-28 tw-text-center">
                      <div className="tw-flex tw-items-center tw-justify-center tw-gap-1">
                        {t("Slash menu", "斜杠菜单")}
                        <HelpTooltip
                          content={
                            <div className="tw-max-w-xs tw-text-xs">
                              {t(
                                "Shows the command in the chat's / menu.",
                                "在对话的 / 菜单中显示此命令。"
                              )}
                            </div>
                          }
                        />
                      </div>
                    </TableHead>
                    <TableHead className="tw-w-32 tw-text-center">{t("Actions", "操作")}</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext
                  items={commands.map((command) => command.title)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {commands.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="tw-py-8 tw-text-center tw-text-muted">
                          {t("No custom commands yet.", "暂无自定义命令。")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      commands.map((command) => (
                        <SortableTableRow
                          key={command.title}
                          command={command}
                          commands={commands}
                          onUpdate={handleUpdate}
                          onRemove={handleRemove}
                          onCopy={handleCopy}
                        />
                      ))
                    )}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
          </div>

          {renderMobileView()}
        </div>
      </section>
    </div>
  );
};
