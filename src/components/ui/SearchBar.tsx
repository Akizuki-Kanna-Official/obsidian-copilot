import { t } from "@/lib/i18n";
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XCircle, Search } from "lucide-react";

const DEFAULT_PLACEHOLDER = t("Search...", "搜索…");

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  inputClassName,
}) => {
  return (
    <div className="tw-relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("tw-pr-10", inputClassName)}
      />
      {value && (
        <Button
          variant={"secondary"}
          onClick={() => onChange("")}
          className="tw-absolute tw-right-8 tw-top-1/2 tw-size-4 -tw-translate-y-1/2 tw-transform tw-rounded-full tw-p-0 tw-transition-colors"
          aria-label={t("Clear search", "清空搜索")}
        >
          <XCircle className="tw-size-4 tw-text-muted/60 hover:tw-text-accent-hover" />
        </Button>
      )}
      <Search className="tw-absolute tw-right-3 tw-top-1/2 tw-size-4 -tw-translate-y-1/2 tw-transform tw-text-muted" />
    </div>
  );
};
