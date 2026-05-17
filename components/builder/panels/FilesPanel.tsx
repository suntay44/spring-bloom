"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { CodeEditor } from "@/components/builder/CodeEditor";

export function FilesPanel({ machineId }: { machineId: string | null }) {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!machineId) return;
    async function loadFiles() {
      setLoading(true);
      try {
        const res = await fetch(`/api/fly/machine/${machineId}/files`);
        const json = await res.json() as { data?: string[] };
        setFiles(json.data ?? []);
        setSelectedFile((current) => current || json.data?.[0] || "");
      } catch {
        // Non-fatal — file tree stays empty; user can retry by reopening tab
      } finally {
        setLoading(false);
      }
    }
    void loadFiles();
  }, [machineId]);

  async function openFile(path: string) {
    if (!machineId) return;
    setSelectedFile(path);
    try {
      const res = await fetch(`/api/fly/machine/${machineId}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `cat /app/${path}` }),
      });
      const json = await res.json() as { data?: { stdout: string } };
      setContent(json.data?.stdout ?? "");
    } catch {
      setContent("// Could not load file content.");
    }
  }

  if (!machineId) {
    return <div className="grid h-full place-items-center text-sm font-semibold text-slate-500">Files will appear here after your first generation</div>;
  }

  if (loading) {
    return <div className="grid h-full place-items-center text-sm font-semibold text-slate-500"><Loader2 className="animate-spin" size={18} /> Loading files...</div>;
  }

  return (
    <div className="code-panel">
      <aside>
        {files.map((file) => (
          <button aria-current={selectedFile === file} className="file-row" key={file} onClick={() => { void openFile(file); }} type="button">
            <FileText size={15} /> {file}
          </button>
        ))}
      </aside>
      <div style={{ height: "100%" }}>
        <CodeEditor content={content || "Select a file to preview its contents."} language="typescript" />
      </div>
    </div>
  );
}
