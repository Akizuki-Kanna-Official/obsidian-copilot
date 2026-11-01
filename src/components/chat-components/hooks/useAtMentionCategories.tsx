import { t } from "@/lib/i18n";
import React, { useMemo } from "react";
import { TFile, TFolder } from "obsidian";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { FileText, Wrench, Folder, Globe, Image, Bot } from "lucide-react";
import { TypeaheadOption } from "@/components/chat-components/TypeaheadMenuContent";
import type { WebTabContext } from "@/types/message";

export type AtMentionCategory =
  | "agents"
  | "notes"
  | "tools"
  | "folders"
  | "activeNote"
  | "webTabs"
  | "activeWebTab"
  | "images";

export interface AtMentionOption extends TypeaheadOption {
  category: AtMentionCategory;
  data: TFile | string | TFolder | WebTabContext;
  isAction?: boolean;
}

export interface AgentMentionBrand {
  readonly id: string;
  readonly displayName: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
  readonly needsSelfHostWarning?: boolean;
}

export const EMPTY_AGENT_MENTION_BRANDS: ReadonlyArray<AgentMentionBrand> = Object.freeze([]);

export interface CategoryOption extends TypeaheadOption {
  category: AtMentionCategory;
  icon: React.ReactNode;
  isAction?: boolean;
}

const AGENTS_CATEGORY: CategoryOption = {
  key: "agents",
  title: t("Agents", "智能体"),
  subtitle: t("Ask another agent this turn", "本轮向其他智能体提问"),
  category: "agents",
  icon: <Bot className="tw-size-4" />,
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    key: "notes",
    title: t("Notes", "笔记"),
    subtitle: t("Reference notes in your vault", "引用仓库中的笔记"),
    category: "notes",
    icon: <FileText className="tw-size-4" />,
  },
  {
    key: "webTabs",
    title: t("Web tabs", "网页标签"),
    subtitle: t("Reference open browser tabs", "引用已打开的浏览器标签页"),
    category: "webTabs",
    icon: <Globe className="tw-size-4" />,
  },
  {
    key: "tools",
    title: "Tools",
    subtitle: "AI tools and commands",
    category: "tools",
    icon: <Wrench className="tw-size-4" />,
  },
  {
    key: "folders",
    title: t("Folders", "文件夹"),
    subtitle: t("Reference vault folders", "引用仓库文件夹"),
    category: "folders",
    icon: <Folder className="tw-size-4" />,
  },
  {
    key: "images",
    title: t("Images", "图片"),
    subtitle: t("Attach image files", "添加图片附件"),
    category: "images",
    icon: <Image className="tw-size-4" />,
    isAction: true,
  },
];

export function shouldShowAtMentionTools(args: {
  isCopilotPlus: boolean;
  isAgentMode: boolean;
}): boolean {
  return args.isCopilotPlus && !args.isAgentMode;
}

export function useAtMentionCategories(
  showTools: boolean = false,
  showAgents: boolean = false
): CategoryOption[] {
  return useMemo(() => {
    const base = CATEGORY_OPTIONS.filter((cat) => {
      if (cat.category === "tools") {
        return showTools;
      }
      if (cat.category === "webTabs") {
        return isDesktopRuntime();
      }
      return true;
    });
    return showAgents ? [AGENTS_CATEGORY, ...base] : base;
  }, [showTools, showAgents]);
}
