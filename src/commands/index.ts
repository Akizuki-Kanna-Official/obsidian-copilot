import { t } from "@/lib/i18n";
import { logFileManager } from "@/logFileManager";
import { FileCache } from "@/cache/fileCache";
import { clearLegacyCaches } from "@/cache/legacyCaches";
import { logError } from "@/logger";
import {
  clearRecordedPromptPayload,
  flushRecordedPromptPayloadToLog,
} from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";

import { CustomCommandSettingsModal } from "@/commands/CustomCommandSettingsModal";
import { EMPTY_COMMAND } from "@/commands/constants";
import { CustomCommandManager } from "@/commands/customCommandManager";
import { getCachedCustomCommands } from "@/commands/state";
import { CustomCommand } from "@/commands/type";
import {
  QUICK_COMMAND_SYSTEM_PROMPT,
  appendIncludeNoteContextPlaceholders,
} from "@/commands/quickCommandPrompts";
import { CustomCommandChatModal } from "@/commands/CustomCommandChatModal";
import { ApplyCustomCommandModal } from "@/components/modals/ApplyCustomCommandModal";
import { YoutubeTranscriptModal } from "@/components/modals/YoutubeTranscriptModal";
import { checkIsPaidUser } from "@/plusUtils";
import type CopilotPlugin from "@/main";
import { MiyoRequestError } from "@/miyo/MiyoClient";
import { requestMiyoIndexRefresh } from "@/miyo/miyoIndex";
import { getMiyoCustomUrl } from "@/miyo/miyoUtils";
import { getAllQAMarkdownContent } from "@/search/searchUtils";
import { getSettings } from "@/settings/model";
import { NoteSelectedTextContext, WebSelectedTextContext } from "@/types/message";
import { isSourceModeOn } from "@/utils";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { Editor, MarkdownView, Notice, TFile } from "obsidian";
import { v4 as uuidv4 } from "uuid";
import { COMMAND_IDS, COMMAND_ICONS, COMMAND_NAMES, CommandId } from "@/constants";
import { setSelectedTextContexts } from "@/aiParams";

type PublishFile = (file: TFile) => void;

function addCommand(plugin: CopilotPlugin, id: CommandId, callback: () => void | Promise<void>) {
  plugin.addCommand({
    id,
    name: COMMAND_NAMES[id],
    icon: COMMAND_ICONS[id],
    callback: () => {
      const result = callback();
      if (result instanceof Promise) {
        result.catch((err) => logError(`Command ${id} failed`, err));
      }
    },
  });
}

function addEditorCommand(
  plugin: CopilotPlugin,
  id: CommandId,
  callback: (editor: Editor) => void | Promise<void>
) {
  plugin.addCommand({
    id,
    name: COMMAND_NAMES[id],
    icon: COMMAND_ICONS[id],
    editorCallback: (editor) => {
      const result = callback(editor);
      if (result instanceof Promise) {
        result.catch((err) => logError(`Editor command ${id} failed`, err));
      }
    },
  });
}

function addCheckCommand(
  plugin: CopilotPlugin,
  id: CommandId,
  callback: (checking: boolean) => boolean | void
) {
  plugin.addCommand({
    id,
    name: COMMAND_NAMES[id],
    icon: COMMAND_ICONS[id],
    checkCallback: callback,
  });
}

export function registerCommands(plugin: CopilotPlugin, publish: PublishFile) {
  addCheckCommand(plugin, COMMAND_IDS.PUBLISH_FILE_TO_OPENARTIFACTS, (checking) => {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
      return false;
    }

    if (!checking) {
      publish(activeFile);
    }
    return true;
  });

  addEditorCommand(plugin, COMMAND_IDS.COUNT_WORD_AND_TOKENS_SELECTION, async (editor: Editor) => {
    const selectedText = editor.getSelection();
    const wordCount = selectedText.split(" ").length;
    const tokenCount = await plugin.chainOwner
      .getCurrentChainManager()
      .chatModelManager.countTokens(selectedText);
    new Notice(
      t(
        `Selected text contains ${wordCount} words and ${tokenCount} tokens.`,
        `选中文本包含 ${wordCount} 个词和 ${tokenCount} 个词元。`
      )
    );
  });

  addCommand(plugin, COMMAND_IDS.COUNT_TOTAL_VAULT_TOKENS, async () => {
    try {
      const allContent = await getAllQAMarkdownContent(plugin.app);
      const totalTokens = await plugin.chainOwner
        .getCurrentChainManager()
        .chatModelManager.countTokens(allContent);
      new Notice(t(`Total tokens in your vault: ${totalTokens}`, `知识库词元总数：${totalTokens}`));
    } catch (error) {
      logError("Error counting tokens: ", error);
      new Notice(t("An error occurred while counting tokens.", "统计词元时出错。"));
    }
  });

  addCommand(plugin, COMMAND_IDS.TOGGLE_COPILOT_CHAT_WINDOW, () => {
    plugin.toggleView();
  });

  addCommand(plugin, COMMAND_IDS.OPEN_COPILOT_CHAT_WINDOW, async () => {
    await plugin.activateView();
  });

  addCommand(plugin, COMMAND_IDS.OPEN_RELEVANT_NOTES_VIEW, async () => {
    await plugin.activateRelevantNotesView();
  });

  addCommand(plugin, COMMAND_IDS.NEW_CHAT, async () => {
    clearRecordedPromptPayload();
    await plugin.newChat();
  });

  if (isDesktopRuntime()) {
    addCommand(plugin, COMMAND_IDS.OPEN_AGENT_CHAT_WINDOW, () => {
      void plugin.activateAgentView();
    });
    addCommand(plugin, COMMAND_IDS.TOGGLE_AGENT_CHAT_WINDOW, () => {
      void plugin.toggleAgentView();
    });
    addCommand(plugin, COMMAND_IDS.NEW_AGENT_CHAT, () => {
      void plugin.newAgentChat();
    });
  }

  addCheckCommand(plugin, COMMAND_IDS.TRIGGER_QUICK_COMMAND, (checking: boolean) => {
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);

    if (checking) {
      return !!(!isSourceModeOn(plugin.app) && activeView && activeView.editor);
    }

    if (isSourceModeOn(plugin.app)) {
      new Notice(
        t("Quick command is not available in source mode.", "源码模式下无法使用快捷命令。")
      );
      return false;
    }

    if (!activeView || !activeView.editor) {
      new Notice(t("No active editor found.", "未找到当前编辑器。"));
      return false;
    }

    const editor = activeView.editor;
    const selectedText = editor.getSelection();

    if (!selectedText.trim()) {
      new Notice(
        t(
          "Please select some text first. Selected text is required for quick commands.",
          "请先选中文本，快捷命令需要对选中的文本进行操作。"
        )
      );
      return false;
    }

    const quickCommand: CustomCommand = {
      title: "Quick Command",
      content: "",
      showInContextMenu: false,
      showInSlashMenu: false,
      order: 0,
      modelKey: "",
      lastUsedMs: Date.now(),
    };

    const modal = new CustomCommandChatModal(plugin.app, {
      selectedText,
      command: quickCommand,
      systemPrompt: QUICK_COMMAND_SYSTEM_PROMPT,
      behaviorConfig: {
        autoExecuteOnOpen: false,
        hideContentAreaOnIdle: true,
        commandLabel: t("Quick Command", "快捷命令"),
        commandIcon: null,
        showIncludeNoteContext: true,
        firstSubmitTransform: (input, includeNoteContext) =>
          appendIncludeNoteContextPlaceholders(input, includeNoteContext),
      },
    });
    modal.open();

    return true;
  });

  // The palette reflects connection intent at plugin load. Reachability is
  // checked when the command runs so a stopped or remote Miyo fails visibly.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/282
  if (getSettings().enableMiyo) {
    addCommand(plugin, COMMAND_IDS.REFRESH_MIYO_INDEX, async () => {
      const settings = getSettings();
      if (!settings.enableMiyo) {
        new Notice(
          t(
            "Miyo is disconnected. Connect it in Copilot settings, then retry.",
            "Miyo 未连接。请在 Copilot 设置中连接，然后重试。"
          )
        );
        return;
      }
      const customUrl = getMiyoCustomUrl(settings);
      // Mobile cannot discover a service on localhost, so this state needs a
      // concrete recovery action instead of the generic unavailable message.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/282
      if (!isDesktopRuntime() && !customUrl) {
        new Notice(
          t("A remote Miyo connection is required on mobile.", "移动端需要连接远程 Miyo 服务。")
        );
        return;
      }
      try {
        await requestMiyoIndexRefresh(plugin.app);
        new Notice(
          t(
            "Miyo vault scan started. Open Miyo to check indexing progress.",
            "已开始扫描 Miyo 知识库，请打开 Miyo 查看索引进度。"
          )
        );
      } catch (error) {
        logError("Failed to refresh the Miyo index:", error);
        if (error instanceof MiyoRequestError && error.status === 404) {
          new Notice(
            t(
              "This vault is not registered with Miyo. Register it in Miyo, then retry.",
              "此知识库尚未注册到 Miyo。请先在 Miyo 中注册，然后重试。"
            )
          );
          return;
        }
        new Notice(
          t(
            "Miyo is unavailable. Open Miyo, then retry the refresh.",
            "Miyo 不可用。请打开 Miyo，然后重新刷新。"
          )
        );
      }
    });
  }

  addCommand(plugin, COMMAND_IDS.LOAD_COPILOT_CHAT_CONVERSATION, async () => {
    await plugin.loadCopilotChatHistory();
  });

  addCommand(plugin, COMMAND_IDS.CLEAR_COPILOT_CACHE, async () => {
    try {
      await FileCache.getInstance<string>().clear(plugin.app.vault);
      await clearLegacyCaches(plugin.app);

      new Notice(t("All Copilot caches cleared successfully", "已清除所有 Copilot 缓存"));
    } catch (error) {
      logError("Error clearing Copilot caches:", error);
      new Notice(t("Failed to clear Copilot caches", "清除 Copilot 缓存失败"));
    }
  });

  addCommand(plugin, COMMAND_IDS.OPEN_LOG_FILE, async () => {
    try {
      await flushRecordedPromptPayloadToLog();
      await logFileManager.openLogFile();
    } catch (error) {
      logError("Error creating Copilot log file:", error);
      new Notice(t("Failed to create Copilot log file.", "创建 Copilot 日志文件失败。"));
    }
  });

  addCommand(plugin, COMMAND_IDS.CLEAR_LOG_FILE, async () => {
    try {
      await logFileManager.clear();
      new Notice(t("Copilot log cleared.", "已清除 Copilot 日志。"));
    } catch (error) {
      logError("Error clearing Copilot log file:", error);
      new Notice(t("Failed to clear Copilot log file.", "清除 Copilot 日志文件失败。"));
    }
  });

  addEditorCommand(plugin, COMMAND_IDS.ADD_SELECTION_TO_CHAT_CONTEXT, async (editor: Editor) => {
    const selectedText = editor.getSelection();
    if (!selectedText) {
      new Notice(t("No text selected", "未选中文本"));
      return;
    }

    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice(t("No active file", "没有当前文件"));
      return;
    }

    const selectionRange = editor.listSelections()[0];
    if (!selectionRange) {
      new Notice(t("Could not determine selection range", "无法确定选区范围"));
      return;
    }

    const startLine = selectionRange.anchor.line + 1;
    const endLine = selectionRange.head.line + 1;

    const selectedTextContext: NoteSelectedTextContext = {
      id: uuidv4(),
      content: selectedText,
      sourceType: "note",
      noteTitle: activeFile.basename,
      notePath: activeFile.path,
      startLine: Math.min(startLine, endLine),
      endLine: Math.max(startLine, endLine),
    };

    setSelectedTextContexts([selectedTextContext]);

    await plugin.activateChatViewForContext();
  });

  addCommand(plugin, COMMAND_IDS.ADD_WEB_SELECTION_TO_CHAT_CONTEXT, async () => {
    if (!isDesktopRuntime()) {
      new Notice(t("Web selection is only available on desktop", "网页文本选区仅在桌面端可用"));
      return;
    }

    const { getWebViewerService } =
      await import("@/services/webViewerService/webViewerServiceSingleton");

    try {
      const service = getWebViewerService(plugin.app);
      const leaf = service.getActiveLeaf() ?? service.getLastActiveLeaf();

      if (!leaf) {
        new Notice(t("No active web tab found", "未找到当前网页标签页"));
        return;
      }

      const selectedMarkdown = await service.getSelectedMarkdown(leaf);
      if (!selectedMarkdown.trim()) {
        new Notice(t("No text selected in the web tab", "未在网页标签页中选中文本"));
        return;
      }

      const pageInfo = service.getPageInfo(leaf);

      const webSelectedTextContext: WebSelectedTextContext = {
        id: uuidv4(),
        content: selectedMarkdown,
        sourceType: "web",
        title: pageInfo.title || "Untitled",
        url: pageInfo.url,
        faviconUrl: pageInfo.faviconUrl || undefined,
      };

      setSelectedTextContexts([webSelectedTextContext]);

      await plugin.activateChatViewForContext();
    } catch (error) {
      logError("Error adding web selection to context:", error);
      new Notice(t("Failed to get web selection", "获取网页选区失败"));
    }
  });

  addCommand(plugin, COMMAND_IDS.ADD_CUSTOM_COMMAND, async () => {
    const commands = getCachedCustomCommands();
    const newCommand = { ...EMPTY_COMMAND };
    const modal = new CustomCommandSettingsModal(
      plugin.app,
      commands,
      newCommand,
      async (updatedCommand) => {
        await CustomCommandManager.getInstance().createCommand(updatedCommand);
      }
    );
    modal.open();
  });

  addCommand(plugin, COMMAND_IDS.APPLY_CUSTOM_COMMAND, () => {
    const modal = new ApplyCustomCommandModal(plugin.app);
    modal.open();
  });

  addCommand(plugin, COMMAND_IDS.DOWNLOAD_YOUTUBE_SCRIPT, async () => {
    const isPaidUser = await checkIsPaidUser(plugin.app, { trigger: "tool_call" });
    if (!isPaidUser) {
      new Notice(
        t(
          "Download YouTube transcript is a Copilot Plus feature",
          "下载 YouTube 字幕是 Copilot Plus 功能"
        )
      );
      return;
    }

    const modal = new YoutubeTranscriptModal(plugin.app);
    modal.open();
  });

  addCheckCommand(plugin, COMMAND_IDS.TRIGGER_QUICK_ASK, (checking: boolean) => {
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);

    if (checking) {
      return !!(!isSourceModeOn(plugin.app) && activeView && activeView.editor);
    }

    if (isSourceModeOn(plugin.app)) {
      new Notice(t("Quick Ask is not available in source mode.", "源码模式下无法使用快捷提问。"));
      return false;
    }

    if (!activeView || !activeView.editor) {
      new Notice(t("No active editor found.", "未找到当前编辑器。"));
      return false;
    }

    const view = activeView.editor.cm;
    if (!view) {
      new Notice(t("Could not access CodeMirror editor.", "无法访问 CodeMirror 编辑器。"));
      return false;
    }

    plugin.quickAskController.show(activeView, view);
    return true;
  });
}
