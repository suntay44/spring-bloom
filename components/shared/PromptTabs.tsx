"use client";

import { appTypes, type AppType } from "@/lib/mock/data";

interface PromptTabsProps {
  activeId: string;
  onSelect: (type: AppType) => void;
}

export function PromptTabs({ activeId, onSelect }: PromptTabsProps) {
  return (
    <>
      {appTypes.map((type) => {
        const Icon = type.icon;
        return (
          <button className={`app-tab ${activeId === type.id ? "active" : ""}`} key={type.id} onClick={() => onSelect(type)} type="button">
            <Icon size={19} /> {type.label}
          </button>
        );
      })}
    </>
  );
}
