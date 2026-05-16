type TabBarProps<T extends string> = {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
  className?: string;
  tabClassName?: string;
  activeClassName?: string;
};

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className = "shared-tabs px-0",
  tabClassName = "shared-tab",
  activeClassName = "active"
}: TabBarProps<T>) {
  return (
    <div className={className} role="tablist">
      {tabs.map((tab) => (
        <button
          aria-selected={value === tab}
          className={`${tabClassName} ${value === tab ? activeClassName : ""}`}
          key={tab}
          onClick={() => onChange(tab)}
          role="tab"
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
