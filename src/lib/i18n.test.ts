import * as obsidian from "obsidian";
import { getUiLanguage, t } from "@/lib/i18n";

describe("i18n", () => {
  afterEach(() => jest.restoreAllMocks());

  describe("t()", () => {
    it.each(["zh", "zh-CN", "zh-cn", "zh-Hans"])("uses simplified Chinese for %s", (language) => {
      expect(t("Settings", "设置", language)).toBe("设置");
    });
    it.each(["en", "fr", "zh-TW", "zh-Hant", ""])("preserves English for %s", (language) => {
      expect(t("Settings", "设置", language)).toBe("Settings");
    });
    it("uses the Obsidian language preference without changing it", () => {
      jest.spyOn(obsidian, "getLanguage").mockReturnValue("zh");
      expect(t("Cancel", "取消")).toBe("取消");
      expect(obsidian.getLanguage()).toBe("zh");
    });
    it("preserves user supplied values in interpolated UI copy", () => {
      const name = "My English Note.md";
      expect(t(`Open ${name}`, `打开 ${name}`, "zh")).toBe("打开 My English Note.md");
    });
  });

  describe("getUiLanguage()", () => {
    it("defaults to English when Obsidian has no saved language", () => {
      jest.spyOn(obsidian, "getLanguage").mockReturnValue("en");
      expect(getUiLanguage()).toBe("en");
    });
    it("falls back to English if the host returns no language", () => {
      jest.spyOn(obsidian, "getLanguage").mockReturnValue(undefined as unknown as string);
      expect(getUiLanguage()).toBe("en");
    });
    it("reads the current language rather than caching a stale preference", () => {
      jest.spyOn(obsidian, "getLanguage").mockReturnValue("zh");
      expect(getUiLanguage()).toBe("zh");
      jest.spyOn(obsidian, "getLanguage").mockReturnValue("en");
      expect(getUiLanguage()).toBe("en");
    });
  });
});
