import { t } from "@/lib/i18n";
import {
  deriveConversationsFolder,
  deriveCustomPromptsFolder,
  deriveMemoryFolder,
  deriveSkillsFolder,
  deriveSystemPromptsFolder,
} from "@/settings/copilotFolder";
import type { CopilotSettings } from "@/settings/model";

export interface FolderRelocationEntry {
  label: string;
  oldPath: string;
  newPath: string;
}

type UpgradeNoticeSettings = Pick<
  CopilotSettings,
  | "copilotFolder"
  | "defaultSaveFolder"
  | "customPromptsFolder"
  | "userSystemPromptsFolder"
  | "memoryFolderName"
  | "agentMode"
>;

type RootSettings = Pick<CopilotSettings, "copilotFolder">;

interface SubFolderSpec {
  label: string;
  legacyValue: (settings: UpgradeNoticeSettings) => string;
  derive: (settings: RootSettings) => string;
}

const SUBFOLDER_SPECS: readonly SubFolderSpec[] = [
  {
    label: t("Chat conversations", "聊天记录"),
    legacyValue: (s) => s.defaultSaveFolder,
    derive: deriveConversationsFolder,
  },
  {
    label: t("Custom prompts", "自定义提示词"),
    legacyValue: (s) => s.customPromptsFolder,
    derive: deriveCustomPromptsFolder,
  },
  {
    label: t("System prompts", "系统提示词"),
    legacyValue: (s) => s.userSystemPromptsFolder,
    derive: deriveSystemPromptsFolder,
  },
  {
    label: t("Agent skills", "智能体技能"),
    legacyValue: (s) => s.agentMode.skills.folder,
    derive: deriveSkillsFolder,
  },
  {
    label: t("Memory", "记忆"),
    legacyValue: (s) => s.memoryFolderName,
    derive: deriveMemoryFolder,
  },
];

function canonicalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function buildUpgradeRelocationEntries(
  settings: UpgradeNoticeSettings
): FolderRelocationEntry[] {
  return SUBFOLDER_SPECS.flatMap((spec) => {
    const oldPath = spec.legacyValue(settings);
    const newPath = spec.derive(settings);
    if (canonicalizePath(oldPath) === canonicalizePath(newPath)) {
      return [];
    }
    return [{ label: spec.label, oldPath, newPath }];
  });
}
