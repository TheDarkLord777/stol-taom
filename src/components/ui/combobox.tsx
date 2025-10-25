"use client";
import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Button } from "@/components/ui/button";

export type ComboOption = { value: string; label: string };

type BaseProps = {
  options: ComboOption[];
  value?: string;
  onChange?: (value: string) => void;
  emptyText?: string;
};

type ButtonModeProps = BaseProps & {
  mode?: "button";
  placeholder?: string;
  buttonClassName?: string;
};

type InputModeProps = BaseProps & {
  mode: "input";
  inputPlaceholder?: string;
  inputClassName?: string;
};

type ComboboxProps = ButtonModeProps | InputModeProps;

export function Combobox(props: ComboboxProps) {
  const { options, value, onChange, emptyText = "No results" } = props;
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );
  const [query, setQuery] = React.useState("");

  // Keep input query in sync when selecting
  React.useEffect(() => {
    if (props.mode === "input") {
      setQuery(selected?.label ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.value]);

  const filtered = React.useMemo(() => {
    const source = props.mode === "input" ? query : query;
    if (!source?.trim()) return options;
    const q = source.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query, props.mode]);

  // Button trigger mode (default)
  if (props.mode !== "input") {
    const { placeholder = "Select…", buttonClassName } =
      props as ButtonModeProps;
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            className={
              buttonClassName ||
              "inline-flex items-center justify-between gap-2 min-w-[220px] bg-white text-gray-900 hover:bg-gray-100 border border-gray-200"
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
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Button>
        </Popover.Trigger>
        <Popover.Content
          sideOffset={8}
          className="z-50 rounded-md border border-gray-200 bg-white p-0 shadow-lg"
        >
          <Command label="combobox" className="w-64">
            <div className="px-2 py-2 border-b border-gray-200">
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
            <Command.List className="max-h-60 overflow-auto py-1">
              <Command.Empty className="px-3 py-2 text-sm text-gray-500">
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
                  }}
                  className="cursor-pointer select-none px-3 py-2 text-sm aria-selected:bg-gray-100 aria-selected:text-gray-900"
                >
                  {opt.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Root>
    );
  }

  // Input trigger mode
  const { inputPlaceholder = "Type to search…", inputClassName } =
    props as InputModeProps;
  const inputRef = React.useRef<HTMLInputElement | null>(null);

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
            placeholder={inputPlaceholder}
            className={
              inputClassName ||
              "w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            }
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onChange?.("");
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="absolute inset-y-0 right-2 my-auto h-6 w-6 rounded text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          ) : null}
        </div>
      </Popover.Anchor>
      <Popover.Content
        align="start"
        sideOffset={6}
        className="z-50 rounded-md border border-gray-200 bg-white p-0 shadow-lg w-[min(22rem,90vw)]"
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
          <Command.List className="max-h-60 overflow-auto py-1">
            <Command.Empty className="px-3 py-2 text-sm text-gray-500">
              {emptyText}
            </Command.Empty>
            {filtered.map((opt) => (
              <Command.Item
                key={opt.value}
                value={opt.label}
                onSelect={() => {
                  onChange?.(opt.value);
                  setQuery(opt.label);
                  setOpen(false);
                }}
                className="cursor-pointer select-none px-3 py-2 text-sm aria-selected:bg-gray-100 aria-selected:text-gray-900"
              >
                {opt.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
}

export default Combobox;
