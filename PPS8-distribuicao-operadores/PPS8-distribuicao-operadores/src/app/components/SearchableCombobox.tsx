import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "./ui/utils";

interface SearchableComboboxOption {
  value: string;
  label: string;
  keywords?: string[];
  renderLabel?: ReactNode;
  renderSelectedLabel?: ReactNode;
}

interface SearchableComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
}

export function SearchableCombobox({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  triggerClassName,
  contentClassName,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  const selectedOption = options.find((option) => option.value === value);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredOptions = !normalizedSearch
    ? options
    : [...options]
        .map((option) => {
          const searchableParts = [
            option.value,
            option.label,
            ...(option.keywords || []),
          ]
            .filter(Boolean)
            .map((part) => part.toLowerCase());

          const exactValue = option.value.toLowerCase() === normalizedSearch;
          const exactLabel = option.label.toLowerCase() === normalizedSearch;
          const startsWithValue = option.value.toLowerCase().startsWith(normalizedSearch);
          const startsWithLabel = option.label.toLowerCase().startsWith(normalizedSearch);
          const startsWithKeyword = (option.keywords || []).some((keyword) =>
            keyword.toLowerCase().startsWith(normalizedSearch)
          );
          const includesMatch = searchableParts.some((part) => part.includes(normalizedSearch));

          let score = Number.POSITIVE_INFINITY;
          if (exactValue) score = 0;
          else if (exactLabel) score = 1;
          else if (startsWithValue) score = 2;
          else if (startsWithKeyword) score = 3;
          else if (startsWithLabel) score = 4;
          else if (includesMatch) score = 5;

          return { option, score };
        })
        .filter(({ score }) => Number.isFinite(score))
        .sort((a, b) => {
          if (a.score !== b.score) return a.score - b.score;
          return a.option.label.localeCompare(b.option.label, "pt-PT", { sensitivity: "base" });
        })
        .map(({ option }) => option);

  useEffect(() => {
    const updateWidth = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            !selectedOption && "text-gray-500",
            triggerClassName
          )}
        >
          <div className="flex-1 min-w-0 overflow-hidden text-left">
            {selectedOption?.renderSelectedLabel || selectedOption?.label || placeholder}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 rounded-sm", contentClassName)}
        align="start"
        style={triggerWidth ? { width: `${triggerWidth}px` } : undefined}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-sm"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords || [])]}
                  className="text-sm cursor-pointer"
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.renderLabel || option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
