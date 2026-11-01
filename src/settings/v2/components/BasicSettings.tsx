import { t } from "@/lib/i18n";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Input } from "@/components/ui/input";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingDisclosure } from "@/components/ui/setting-disclosure";
import { SettingSection } from "@/components/ui/setting-section";
import { DEFAULT_OPEN_AREA, SEND_SHORTCUT } from "@/constants";
import { useApp } from "@/context";
import { cn } from "@/lib/utils";
import { openAgentsFile, writeAgentsFile } from "@/instructions/agentsFile";
import { useAgentsFileDraft } from "@/instructions/useAgentsFileDraft";
import { logError } from "@/logger";
import { debounce } from "@/utils/debounce";
import { ensureCopilotSubfolders } from "@/settings/copilotFolder";
import {
  applyCopilotRootChange,
  copilotRootContainsNotes,
  findCopilotRootFileConflict,
} from "@/settings/copilotRootChange";
import { updateSetting, useSettingsValue, validateCopilotFolder } from "@/settings/model";
import { QuickChatPanel } from "@/settings/v2/components/QuickChatPanel";
import { DesktopOnlySettingsPanel } from "@/settings/v2/components/DesktopOnlySettingsPanel";
import { CopilotFolderChangeNotice } from "@/settings/v2/components/CopilotFolderChangeNotice";
import { LegacyChatPromptsNotice } from "@/settings/v2/components/LegacyChatPromptsNotice";
import { PlusSettings } from "@/settings/v2/components/PlusSettings";
import { VaultInstructionsSetting } from "@/settings/v2/components/VaultInstructionsSetting";
import { formatDateTime } from "@/utils";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { revealFolderInExplorer } from "@/utils/revealFolderInExplorer";
import { Folder, Loader2 } from "lucide-react";
import { Notice } from "obsidian";
import React, { useEffect, useMemo, useState } from "react";

const LazyAgentSettings = React.lazy(() =>
  import("@/settings/v2/components/AgentSettings").then((module) => ({
    default: module.AgentSettings,
  }))
);

const AgentsSection: React.FC = () => {
  if (!isDesktopRuntime()) {
    // Quick Chat also runs on mobile; its settings must stay outside the desktop import gate.
    // https://github.com/Brevilabs/obsidian-copilot-private/issues/373
    return (
      <>
        <DesktopOnlySettingsPanel
          message={t("Agent settings are available on desktop.", "智能体设置仅在桌面端可用。")}
        />
        <QuickChatPanel />
      </>
    );
  }
  return (
    <React.Suspense fallback={null}>
      <LazyAgentSettings />
    </React.Suspense>
  );
};

export const BasicSettings: React.FC = () => {
  const app = useApp();
  const settings = useSettingsValue();
  const [isChecking, setIsChecking] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [conversationNoteName, setConversationNoteName] = useState(
    settings.defaultConversationNoteName || "{$date}_{$time}__{$topic}"
  );

  const persistedRoot = settings.copilotFolder;
  const [folderDraft, setFolderDraft] = useState(persistedRoot);

  useEffect(() => {
    /* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect -- resync the draft when the persisted root changes underneath us (e.g. Reset Settings or a completed change) */
    setFolderDraft(persistedRoot);
    /* eslint-enable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect -- resume checking after persisted-root synchronization */
  }, [persistedRoot]);

  const [vaultInstructions, setVaultInstructions] = useAgentsFileDraft(app, "");

  const saveVaultInstructions = useMemo(() => {
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (next: string): Promise<void> => {
      queue = queue.then(() =>
        writeAgentsFile(app, "", next).catch((error) => {
          logError("Failed to save vault instructions.", error);
          new Notice(t("Failed to save AGENTS.md.", "保存 AGENTS.md 失败。"));
        })
      );
      return queue;
    };
    return debounce(enqueue, 1000);
  }, [app]);
  useEffect(() => () => void saveVaultInstructions.flush(), [saveVaultInstructions]);

  const handleOpenVaultInstructions = async () => {
    await saveVaultInstructions.flush();
    (app as unknown as { setting: { close: () => void } }).setting.close();
    try {
      await openAgentsFile(app, "");
    } catch (error) {
      logError("Failed to open vault AGENTS.md.", error);
      new Notice(
        error instanceof Error
          ? error.message
          : t("Failed to open AGENTS.md.", "打开 AGENTS.md 失败。")
      );
    }
  };

  const applyFolderChange = () => {
    const validation = validateCopilotFolder(folderDraft, app.vault.configDir);
    if (!validation.ok) {
      new Notice(
        t(
          `Invalid Copilot folder: ${validation.reason}`,
          `Copilot 文件夹无效：${validation.reason}`
        ),
        5000
      );
      return;
    }
    const folder = validation.folder;
    if (folder === persistedRoot) {
      new Notice(t("That's already the Copilot folder.", "这已经是当前的 Copilot 文件夹。"), 3000);
      return;
    }
    const conflict = findCopilotRootFileConflict(app, folder);
    if (conflict) {
      new Notice(
        t(
          `"${conflict}" is an existing file, so "${folder}" can't be used as a folder. Choose another location.`,
          `“${conflict}”是现有文件，因此无法将“${folder}”用作文件夹。请选择其他位置。`
        ),
        8000
      );
      return;
    }
    const containsMarkdown = copilotRootContainsNotes(app, folder);
    new ConfirmModal(
      app,
      () => {
        void applyCopilotRootChange(app, folder)
          .then(() => ensureCopilotSubfolders(app.vault, { copilotFolder: folder }))
          .then(
            () =>
              new Notice(
                t(`Copilot folder changed to "${folder}".`, `Copilot 文件夹已更改为“${folder}”。`),
                4000
              )
          )
          .catch(
            () =>
              new Notice(
                t(
                  "Failed to change the Copilot folder. Check the Copilot log.",
                  "更改 Copilot 文件夹失败，请查看 Copilot 日志。"
                ),
                5000
              )
          );
      },
      <CopilotFolderChangeNotice
        oldRoot={persistedRoot}
        newRoot={folder}
        containsMarkdown={containsMarkdown}
      />,
      "",
      containsMarkdown ? t("Use folder", "使用此文件夹") : t("Change folder", "更改文件夹"),
      t("Cancel", "取消"),
      () => setFolderDraft(persistedRoot)
    ).open();
  };

  const applyCustomNoteFormat = () => {
    setIsChecking(true);

    try {
      const format = conversationNoteName || "{$date}_{$time}__{$topic}";
      const requiredVars = ["{$date}", "{$time}", "{$topic}"];
      const missingVars = requiredVars.filter((v) => !format.includes(v));

      if (missingVars.length > 0) {
        new Notice(
          t(
            `Error: Missing required variables: ${missingVars.join(", ")}`,
            `错误：缺少必填变量：${missingVars.join(", ")}`
          ),
          4000
        );
        return;
      }

      const illegalChars = /[\\/:*?"<>|]/;
      const formatWithoutVars = format
        .replace(/\{\$date}/g, "")
        .replace(/\{\$time}/g, "")
        .replace(/\{\$topic}/g, "");

      if (illegalChars.test(formatWithoutVars)) {
        new Notice(
          t(
            `Error: Format contains illegal characters (\\/:*?"<>|)`,
            `错误：格式包含不允许的字符（\\/:*?"<>|）`
          ),
          4000
        );
        return;
      }

      const { fileName: timestampFileName } = formatDateTime(new Date());
      const firstTenWords = "test topic name";

      const customFileName = format
        .replace("{$topic}", firstTenWords.slice(0, 100).replace(/\s+/g, "_"))
        .replace("{$date}", timestampFileName.split("_")[0])
        .replace("{$time}", timestampFileName.split("_")[1]);

      updateSetting("defaultConversationNoteName", format);
      setConversationNoteName(format);
      new Notice(
        t(
          `Format applied successfully! Example: ${customFileName}`,
          `格式已应用！示例：${customFileName}`
        ),
        4000
      );
    } catch (error) {
      new Notice(
        t(
          `Error applying format: ${error instanceof Error ? error.message : String(error)}`,
          `应用格式时出错：${error instanceof Error ? error.message : String(error)}`
        ),
        4000
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="tw-space-y-4">
      <PlusSettings />

      <AgentsSection />

      <SettingSection label={t("General", "常规")}>
        <SettingItem
          type="select"
          title={t("Open plugin in", "插件打开位置")}
          description={t("Choose where to open the plugin.", "选择插件打开的位置。")}
          value={settings.defaultOpenArea}
          onChange={(value) => updateSetting("defaultOpenArea", value as DEFAULT_OPEN_AREA)}
          options={[
            { label: t("Sidebar view", "侧边栏"), value: DEFAULT_OPEN_AREA.VIEW },
            { label: t("Editor", "编辑区"), value: DEFAULT_OPEN_AREA.EDITOR },
          ]}
        />

        <SettingItem
          type="select"
          title={t("Send shortcut", "发送快捷键")}
          description={
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-leading-none">
                {t("Keyboard shortcut to send messages.", "用于发送消息的键盘快捷键。")}
              </span>
              <HelpTooltip
                content={
                  <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2 tw-py-4">
                    <div className="tw-text-xs tw-text-muted">
                      {t(
                        "If your selected shortcut doesn't work, check",
                        "如果所选快捷键无效，请检查"
                      )}{" "}
                      <strong>{t("Obsidian → Hotkeys", "Obsidian → 快捷键")}</strong>
                      {t(
                        " to see if another command is using the same key combination.",
                        "，确认是否有其他命令占用了相同的组合键。"
                      )}
                    </div>
                  </div>
                }
              />
            </div>
          }
          value={settings.defaultSendShortcut}
          onChange={(value) => updateSetting("defaultSendShortcut", value as SEND_SHORTCUT)}
          options={[
            { label: "Enter", value: SEND_SHORTCUT.ENTER },
            { label: "Shift + Enter", value: SEND_SHORTCUT.SHIFT_ENTER },
          ]}
        />

        <SettingItem
          type="switch"
          title={t("Auto-attach active note", "自动附加当前笔记")}
          description={t(
            "Attach the note open in the editor to each new chat. With this off, add it from Add context or with @ when you need it.",
            "在每个新对话中附加编辑器里打开的笔记。关闭后，可在需要时通过“添加上下文”或 @ 手动添加。"
          )}
          checked={settings.autoAttachActiveNote}
          onCheckedChange={(checked) => updateSetting("autoAttachActiveNote", checked)}
        />

        <SettingItem
          type="custom"
          title={t("Copilot folder location", "Copilot 文件夹位置")}
          description={t(
            "Where Copilot keeps chats, commands, memory, and more. Its other folders live inside this one.",
            "Copilot 保存对话、命令、记忆等数据的位置。其他 Copilot 文件夹均位于此文件夹内。"
          )}
        >
          <div className="tw-flex tw-items-center tw-gap-2">
            <Input
              type="text"
              value={folderDraft}
              onChange={(e) => setFolderDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFolderChange();
                }
              }}
              placeholder="copilot"
              className="tw-w-full sm:tw-w-[160px]"
              aria-label={t("Copilot folder", "Copilot 文件夹")}
            />
            <Button
              variant="secondary"
              onClick={applyFolderChange}
              aria-label={t("Apply Copilot folder", "应用 Copilot 文件夹")}
            >
              {t("Apply", "应用")}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => revealFolderInExplorer(app, settings.copilotFolder)}
              aria-label={t("Open Copilot folder", "打开 Copilot 文件夹")}
              title={t("Open Copilot folder", "打开 Copilot 文件夹")}
            >
              <Folder className="tw-size-4" />
            </Button>
          </div>
        </SettingItem>
      </SettingSection>

      <SettingSection label={t("Custom instructions", "自定义指令")}>
        <LegacyChatPromptsNotice />
        {vaultInstructions !== null && (
          <VaultInstructionsSetting
            value={vaultInstructions}
            onChange={(next) => {
              setVaultInstructions(next);
              void saveVaultInstructions(next);
            }}
            onOpen={() => void handleOpenVaultInstructions()}
          />
        )}
      </SettingSection>

      <SettingSection label={t("Saving chats", "保存对话")}>
        <SettingItem
          type="switch"
          title={t("Autosave chats as Markdown", "自动将对话保存为 Markdown")}
          description={t(
            "Writes each chat to a Markdown note in your vault after every user message and AI response. With this off, agent chats still appear in Recent chats; only the Markdown note is skipped.",
            "每次发送消息或收到 AI 回复后，将对话写入仓库中的 Markdown 笔记。关闭后，智能体对话仍会显示在“最近对话”中，只是不再保存为 Markdown 笔记。"
          )}
          checked={settings.autosaveChat}
          onCheckedChange={(checked) => updateSetting("autosaveChat", checked)}
        />

        <Collapsible open={templateOpen} onOpenChange={setTemplateOpen}>
          <CollapsibleTrigger asChild>
            <SettingDisclosure open={templateOpen} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SettingItem
              type="custom"
              title={t("Chat note name template", "对话笔记命名模板")}
              description={
                <div className="tw-flex tw-items-start tw-gap-1.5 ">
                  <span className="tw-leading-none">
                    {t("Customize the names of saved chat notes.", "自定义保存的对话笔记名称。")}
                  </span>
                  <HelpTooltip
                    content={
                      <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2 tw-py-4">
                        <div className="tw-text-sm tw-font-medium tw-text-accent">
                          {t(
                            "Note: All the following variables must be included in the template.",
                            "注意：模板必须包含以下所有变量。"
                          )}
                        </div>
                        <div>
                          <div className="tw-text-sm tw-font-medium tw-text-muted">
                            {t("Available variables:", "可用变量：")}
                          </div>
                          <ul className="tw-pl-4 tw-text-sm tw-text-muted">
                            <li>
                              <strong>{"{$date}"}</strong>
                              {t(": Date in YYYYMMDD format", "：日期，格式为 YYYYMMDD")}
                            </li>
                            <li>
                              <strong>{"{$time}"}</strong>
                              {t(": Time in HHMMSS format", "：时间，格式为 HHMMSS")}
                            </li>
                            <li>
                              <strong>{"{$topic}"}</strong>
                              {t(": Chat topic", "：对话主题")}
                            </li>
                          </ul>
                          <i className="tw-mt-2 tw-text-sm tw-text-muted">
                            {t("Example: ", "示例：")}
                            {"{$date}_{$time}__{$topic}"} →
                            20250114_153232__polish_this_article_[[Readme]]
                          </i>
                        </div>
                      </div>
                    }
                  />
                </div>
              }
            >
              <div className="tw-flex tw-w-[320px] tw-items-center tw-gap-1.5">
                <Input
                  type="text"
                  className={cn(
                    "tw-min-w-[80px] tw-grow tw-transition-all tw-duration-200",
                    isChecking ? "tw-w-[80px]" : "tw-w-[120px]"
                  )}
                  placeholder="{$date}_{$time}__{$topic}"
                  value={conversationNoteName}
                  onChange={(e) => setConversationNoteName(e.target.value)}
                  disabled={isChecking}
                />

                <Button
                  onClick={() => applyCustomNoteFormat()}
                  disabled={isChecking}
                  variant="secondary"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="tw-mr-2 tw-size-4 tw-animate-spin" />
                      {t("Apply", "应用")}
                    </>
                  ) : (
                    t("Apply", "应用")
                  )}
                </Button>
              </div>
            </SettingItem>
          </CollapsibleContent>
        </Collapsible>
      </SettingSection>
    </div>
  );
};
