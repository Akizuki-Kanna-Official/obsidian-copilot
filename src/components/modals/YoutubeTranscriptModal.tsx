import { t } from "@/lib/i18n";
import { BrevilabsClient } from "@/LLMProviders/brevilabsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context";
import { logError } from "@/logger";
import { formatYoutubeUrl, insertIntoEditor, validateYoutubeUrl } from "@/utils";
import { createPluginRoot } from "@/utils/react/createPluginRoot";
import { App, Modal, Notice } from "obsidian";
import * as React from "react";
import { Root } from "react-dom/client";

interface TranscriptData {
  videoId: string;
  transcript: string;
  url: string;
}

function YoutubeTranscriptModalContent({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [currentView, setCurrentView] = React.useState<"input" | "display">("input");
  const [url, setUrl] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isValidUrl, setIsValidUrl] = React.useState(false);
  const [transcriptData, setTranscriptData] = React.useState<TranscriptData | null>(null);

  const validateInput = (inputUrl: string, updateState = true) => {
    if (!inputUrl.trim()) {
      if (updateState) {
        setError("");
        setIsValidUrl(false);
      }
      return { isValid: false };
    }

    const validation = validateYoutubeUrl(inputUrl);
    if (validation.isValid) {
      if (updateState) {
        setError("");
        setIsValidUrl(true);
      }
      return { isValid: true, videoId: validation.videoId };
    } else {
      if (updateState) {
        setError(validation.error || t("Invalid URL", "无效的网址"));
        setIsValidUrl(false);
      }
      return { isValid: false };
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    validateInput(value, true);
  };

  const handleDownload = async () => {
    if (isLoading) return;

    const validation = validateInput(url);
    if (!validation.isValid) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await BrevilabsClient.getInstance().youtube4llm(url);

      if (!response.response.transcript) {
        throw new Error(
          t(
            "Transcript not available. Only English videos with auto transcript enabled are supported.",
            "无法获取字幕。目前仅支持开启自动字幕的英语视频。"
          )
        );
      }

      const newTranscriptData: TranscriptData = {
        videoId: validation.videoId!,
        transcript: response.response.transcript,
        url: formatYoutubeUrl(validation.videoId!),
      };

      setTranscriptData(newTranscriptData);
      setCurrentView("display");
    } catch (error) {
      logError("Error downloading YouTube transcript:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("An error occurred while downloading the transcript", "下载字幕时发生错误");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!transcriptData) return;

    try {
      const textToCopy = `# YouTube Video Transcript\n\nSource: ${transcriptData.url}\n\n${transcriptData.transcript}`;
      await navigator.clipboard.writeText(textToCopy);
      new Notice(t("Transcript copied to clipboard!", "字幕已复制到剪贴板！"));
    } catch (error) {
      logError("Failed to copy to clipboard:", error);
      new Notice(t("Failed to copy to clipboard", "复制到剪贴板失败"));
    }
  };

  const handleInsertToNote = async () => {
    if (!transcriptData) return;

    try {
      const textToInsert = `# YouTube Video Transcript\n\nSource: ${transcriptData.url}\n\n${transcriptData.transcript}`;
      await insertIntoEditor(app, textToInsert, false);
      onClose();
    } catch (error) {
      logError("Failed to insert to note:", error);
      new Notice(t("Failed to insert to note", "插入笔记失败"));
    }
  };

  const handleDownloadAnother = () => {
    setCurrentView("input");
    setUrl("");
    setError("");
    setTranscriptData(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && isValidUrl) {
      void handleDownload();
    }
  };

  if (currentView === "display" && transcriptData) {
    return (
      <div className="tw-flex tw-flex-col tw-gap-4">
        <div className="tw-rounded tw-bg-secondary tw-p-3">
          <a
            href={transcriptData.url}
            className="tw-text-sm tw-text-muted hover:tw-text-normal"
            target="_blank"
            rel="noopener noreferrer"
          >
            {transcriptData.url}
          </a>
        </div>

        <div className="tw-max-h-96 tw-overflow-y-auto tw-rounded tw-border tw-border-border tw-bg-primary tw-p-4">
          <div className="tw-whitespace-pre-wrap tw-text-sm tw-leading-relaxed">
            {transcriptData.transcript}
          </div>
        </div>

        <div className="tw-flex tw-justify-end tw-gap-2">
          <Button variant="ghost" onClick={handleDownloadAnother}>
            {t("Download another", "下载其他视频")}
          </Button>
          <Button variant="default" onClick={() => void handleCopyToClipboard()}>
            {t("Copy to clipboard", "复制到剪贴板")}
          </Button>
          <Button variant="default" onClick={() => void handleInsertToNote()}>
            {t("Insert at cursor", "在光标处插入")}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t("Close", "关闭")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <div className="tw-text-sm tw-text-muted">
          {t("Enter a valid YouTube video URL", "请输入有效的 YouTube 视频网址")}
        </div>
        <Input
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        {error && <div className="tw-text-sm tw-text-error">{error}</div>}
      </div>

      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {t("Cancel", "取消")}
        </Button>
        <Button
          variant="default"
          onClick={() => void handleDownload()}
          disabled={isLoading || !isValidUrl}
        >
          {isLoading ? "Downloading..." : t("Download Transcript", "下载字幕")}
        </Button>
      </div>
    </div>
  );
}

export class YoutubeTranscriptModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // @ts-ignore
    this.setTitle(t("Download YouTube transcript", "下载 YouTube 字幕"));
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createPluginRoot(contentEl, this.app);

    const handleClose = () => {
      this.close();
    };

    this.root.render(<YoutubeTranscriptModalContent onClose={handleClose} />);
  }

  onClose() {
    this.root.unmount();
  }
}
