"use client";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

type EnvMap = Record<string, string>;

const knownFiles = [".env.local", ".env", ".env.production"] as const;
type KnownFile = (typeof knownFiles)[number];

export default function DevEnvPage() {
  const [files, setFiles] = useState<KnownFile[]>([]);
  const [file, setFile] = useState<KnownFile>(".env.local" as KnownFile);
  const [values, setValues] = useState<EnvMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/dev/env/list")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const fs: string[] = d.files || [];
        const list = fs.filter((f: string): f is KnownFile =>
          (knownFiles as readonly string[]).includes(f),
        );
        setFiles(list);
        if (list.length)
          setFile((prev) => (list.includes(prev) ? prev : list[0]));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    fetch(`/api/dev/env/get?file=${encodeURIComponent(file)}`)
      .then((r) => r.json())
      .then((d) => {
        setValues(d.values || {});
      })
      .finally(() => setLoading(false));
  }, [file]);

  const isBool = (v: string | undefined) =>
    v !== undefined &&
    (v.toLowerCase() === "true" || v.toLowerCase() === "false");

  const updateValue = (k: string, v: string | boolean) => {
    setValues((prev) => ({
      ...prev,
      [k]: typeof v === "boolean" ? (v ? "true" : "false") : String(v),
    }));
  };

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dev/env/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, updates: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setValues(data.values || {});
      setMessage("Saved. Note: server may require restart for some envs.");
    } catch (e: any) {
      setMessage(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (process.env.NODE_ENV === "production") {
    return <div className="p-6">Not available in production.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dev Env Admin</h1>
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">File:</label>
        <select
          className="border rounded px-2 py-1"
          value={file}
          onChange={(e) => setFile(e.target.value as KnownFile)}
        >
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>

      <div className="space-y-2 border rounded p-4">
        <div className="text-sm text-gray-700 mb-2">Variables in {file}:</div>
        <div className="space-y-3">
          {Object.keys(values).length === 0 && (
            <div className="text-sm text-gray-500">No variables found.</div>
          )}
          {Object.keys(values)
            .sort((a, b) => a.localeCompare(b))
            .map((k) => {
              const v = values[k];
              const bool = isBool(v);
              return (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="w-1/3 font-mono text-sm truncate" title={k}>
                    {k}
                  </div>
                  <div className="flex-1">
                    {bool ? (
                      <Switch
                        checked={v.toLowerCase() === "true"}
                        onCheckedChange={(val) => updateValue(k, val)}
                      />
                    ) : (
                      <input
                        className="w-full border rounded px-2 py-1 text-sm font-mono"
                        value={v}
                        onChange={(e) => updateValue(k, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="border rounded p-4 space-y-2">
        <div className="text-sm font-medium">Add variable</div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 text-sm font-mono w-56"
            placeholder="KEY"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 text-sm font-mono flex-1"
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button
            className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm disabled:opacity-60"
            disabled={!newKey.trim()}
            onClick={() => {
              const key = newKey.trim();
              if (!key) return;
              if (key in values) {
                setMessage(`Variable ${key} already exists.`);
                return;
              }
              setValues((prev) => ({ ...prev, [key]: newValue }));
              setNewKey("");
              setNewValue("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>

      <div className="text-xs text-gray-500">
        Tip: Next.js reads envs at process start. For production
        (.env.production), restart may be required. Prisma CLI uses .env.
      </div>
    </div>
  );
}
