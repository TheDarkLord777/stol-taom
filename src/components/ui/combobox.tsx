"use client";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from '@/lib/theme-context';

export type ComboOption = { value: string; label: string };

type BaseProps = {
  options: ComboOption[];
  value?: string;
  onChange?: (value: string) => void;
  onQueryChange?: (q: string) => void;
  emptyText?: string;
  loading?: boolean;
  loadingCount?: number;
};

type ButtonModeProps = BaseProps & {
  mode?: "button";
  placeholder?: string;
  buttonClassName?: string;
  // If true (default), selecting an option triggers onQueryChange with the label
  notifyOnSelect?: boolean;
};

type InputModeProps = BaseProps & {
  mode: "input";
  inputPlaceholder?: string;
  inputClassName?: string;
  // If true (default), selecting an option triggers onQueryChange with the label
  notifyOnSelect?: boolean;
};

type ComboboxProps = ButtonModeProps | InputModeProps;

export function Combobox(props: ComboboxProps) {
  const {
    options,
    value,
    onChange,
    emptyText = "Hech narsa topilmadi",
    loading = false,
    loadingCount = 5,
  } = props as BaseProps & { loading?: boolean; loadingCount?: number };
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) || (value ? { value, label: value } : null),
    [options, value],
  );
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  // Keep input query in sync when selecting or when value changes
  React.useEffect(() => {
    if (props.mode === "input") {
      setQuery(selected?.label ?? value ?? "");
    }
  }, [selected?.label, props.mode, value]);

  const filtered = React.useMemo(() => {
    const source = props.mode === "input" ? query : query;
    if (!source?.trim()) return options;
    const q = source.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query, props.mode]);

  // Stable keys for loading skeletons (avoid using raw index as key)
  const loadingKeys = React.useMemo(
    () =>
      Array.from({ length: Math.max(0, loadingCount) }).map(
        (_, i) => `loading-${i}`,
      ),
    [loadingCount],
  );

  // Reset highlighted item when query or open state changes
  React.useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    // Default to first item when list opens with results
    setActiveIndex((idx) => {
      const next =
        filtered.length > 0
          ? Math.min(Math.max(idx, 0), filtered.length - 1)
          : -1;
      return next;
    });
  }, [open, filtered.length]);

  // Ensure active item is visible
  React.useEffect(() => {
    if (activeIndex < 0) return;
    const el = itemRefs.current[activeIndex];
    const listEl = listRef.current;
    if (el && listEl) {
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const viewTop = listEl.scrollTop;
      const viewBottom = viewTop + listEl.clientHeight;
      if (elTop < viewTop) listEl.scrollTop = elTop;
      else if (elBottom > viewBottom)
        listEl.scrollTop = elBottom - listEl.clientHeight;
    }
  }, [activeIndex]);

  // Button trigger mode (default)
  if (props.mode !== "input") {
    const { placeholder = "Tanlang…", buttonClassName, notifyOnSelect = true } =
      props as ButtonModeProps;
    let theme: 'dark' | 'light' = 'dark';
    try {
      theme = useTheme().theme;
    } catch (e) {
      // ThemeProvider not available; default to dark
      theme = 'dark';
    }
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            className={
              buttonClassName ||
              (theme === 'light'
                ? "inline-flex items-center justify-between gap-2 min-w-[220px] bg-white text-black hover:bg-gray-50 border border-gray-200"
                : "inline-flex items-center justify-between gap-2 min-w-[220px] bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700")
            }
          >
            <span className="truncate">
              {selected ? (
                selected.label
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Toggle</title>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Button>
        </Popover.Trigger>
        <Popover.Content
          sideOffset={8}
          className={
            `z-50 rounded-md p-0 shadow-lg ` +
            (theme === 'light' ? 'border border-gray-200 bg-white' : 'border border-gray-700 bg-gray-900')
          }
        >
          <Command label="combobox" className="w-64">
            <div className="px-2 py-2 border-b border-gray-200">
              <Command.Input
                autoFocus
                value={query}
                onValueChange={(v) => {
                  setQuery(v);
                  // notify parent of query changes
                  (props as BaseProps).onQueryChange?.(v);
                }}
                placeholder="Qidirish…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Command.List className="max-h-60 overflow-auto py-1">
              {loading ? (
                <div className="px-3 py-2">
                  {loadingKeys.map((k) => (
                    <div
                      key={k}
                      className="mb-2 h-5 w-full rounded bg-gray-200 shimmer last:mb-0"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <Command.Empty className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {emptyText}
                  </Command.Empty>
                  {filtered.map((opt) => (
                    <Command.Item
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => {
                        onChange?.(opt.value);
                        setOpen(false);
                        setQuery("");
                        if (notifyOnSelect) (props as BaseProps).onQueryChange?.("");
                      }}
                      className="cursor-pointer select-none px-3 py-2 text-sm text-gray-900 dark:text-gray-100 aria-selected:bg-gray-100 aria-selected:text-gray-900 aria-selected:dark:bg-gray-800 aria-selected:dark:text-gray-100"
                    >
                      {opt.label}
                    </Command.Item>
                  ))}
                </>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Root>
    );
  }

  // Input trigger mode
  const { inputPlaceholder = "Qidirish uchun yozing…", inputClassName, notifyOnSelect = true } =
    props as InputModeProps;

  let theme: 'dark' | 'light' = 'dark';
  try {
    theme = useTheme().theme;
  } catch (e) {
    theme = 'dark';
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                setOpen(true);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (filtered.length === 0) return;
                setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (filtered.length === 0) return;
                setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
              } else if (e.key === "Enter") {
                if (activeIndex >= 0 && activeIndex < filtered.length) {
                  const opt = filtered[activeIndex];
                  onChange?.(opt.value);
                  setQuery(opt.label);
                  if (notifyOnSelect) (props as BaseProps).onQueryChange?.(opt.label);
                  setOpen(false);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={inputPlaceholder}
            className={
              inputClassName ||
              (theme === 'light'
                ? "w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 text-black"
                : "w-full rounded border border-gray-700 px-3 py-2 text-sm bg-gray-800 placeholder:text-gray-500 focus:outline-none dark:focus:ring-2 dark:focus:ring-gray-700 text-gray-100")
            }
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onChange?.("");
                (props as BaseProps).onQueryChange?.("");
                inputRef.current?.focus();
              }}
              aria-label="Tozalash"
              className="absolute inset-y-0 right-2 my-auto h-6 w-6 rounded text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ×
            </button>
          ) : null}
        </div>
      </Popover.Anchor>
      <Popover.Content
        align="start"
        sideOffset={6}
        className="z-50 rounded-md border border-gray-200 bg-white p-0 shadow-lg w-[min(22rem,90vw)] dark:border-gray-700 dark:bg-gray-900"
        onOpenAutoFocus={(e) => {
          // Keep focus on the input when popover opens so typing/backspace works
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Keep focus behavior natural; prevent jumping focus unexpectedly
          e.preventDefault();
        }}
      >
        <Command label="combobox" className="w-full">
          <Command.List
            ref={(el) => {
              listRef.current = el as unknown as HTMLDivElement | null;
            }}
            className="max-h-60 overflow-auto py-1"
          >
            {loading ? (
              <div className="px-3 py-2">
                {loadingKeys.map((k) => (
                  <div
                    key={k}
                    className="mb-2 h-5 w-full rounded bg-gray-200 shimmer last:mb-0 dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : (
              <>
                <Command.Empty className="px-3 py-2 text-sm text-gray-500">
                  {emptyText}
                </Command.Empty>
                {filtered.map((opt, idx) => (
                  <Command.Item
                    // Attach ref for scrolling
                    ref={(el) => {
                      itemRefs.current[idx] =
                        el as unknown as HTMLDivElement | null;
                    }}
                    key={opt.value}
                    value={opt.label}
                    onMouseMove={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onSelect={() => {
                      onChange?.(opt.value);
                      setQuery(opt.label);
                      if (notifyOnSelect) (props as BaseProps).onQueryChange?.(opt.label);
                      setOpen(false);
                    }}
                    className={
                      "cursor-pointer select-none px-3 py-2 text-sm text-gray-900 dark:text-gray-100 aria-selected:bg-gray-100 aria-selected:text-gray-900 aria-selected:dark:bg-gray-800 aria-selected:dark:text-gray-100" +
                      (idx === activeIndex ? " bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" : "")
                    }
                  >
                    {opt.label}
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
}

export default Combobox;
