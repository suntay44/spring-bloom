import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabBarProps<T extends string> = {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
};

export function TabBar<T extends string>({ tabs, value, onChange }: TabBarProps<T>) {
  return (
    <Tabs onValueChange={(nextValue) => onChange(nextValue as T)} value={value}>
      <TabsList>
        {tabs.map((tab) => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
