"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, lineNumbers } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

type CodeEditorProps = {
  content: string;
  language?: "typescript" | "javascript" | "json";
  editable?: boolean;
};

export function CodeEditor({ content, language = "typescript", editable = false }: CodeEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    viewRef.current?.destroy();

    const state = EditorState.create({
      doc: content,
      extensions: [
        javascript({ typescript: language === "typescript", jsx: true }),
        oneDark,
        lineNumbers(),
        highlightActiveLine(),
        EditorView.editable.of(editable),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }
        })
      ]
    });

    viewRef.current = new EditorView({ state, parent: ref.current });
    return () => viewRef.current?.destroy();
  }, [content, editable, language]);

  return <div ref={ref} style={{ height: "100%", minHeight: 400 }} />;
}
