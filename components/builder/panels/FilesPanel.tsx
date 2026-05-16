"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { CodeEditor } from "@/components/builder/CodeEditor";
import { MOCK_FILE_CONTENT, MOCK_FILE_TREE } from "@/lib/mock/messages";

export function FilesPanel() {
  const [selectedFile, setSelectedFile] = useState(MOCK_FILE_TREE[0]?.path ?? "");

  return (
    <div className="code-panel">
      <aside>
        {MOCK_FILE_TREE.map((file) => (
          <button aria-current={selectedFile === file.path} className="file-row" key={file.path} onClick={() => setSelectedFile(file.path)} type="button">
            <FileText size={15} /> {file.path}
          </button>
        ))}
      </aside>
      <div style={{ height: "100%" }}>
        <CodeEditor content={MOCK_FILE_CONTENT} language="typescript" />
      </div>
    </div>
  );
}
