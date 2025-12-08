import { memo, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

type Theme = "light" | "dark" | "system";

export const ModeToggle = memo(function ModeToggle() {
  const { setTheme, theme } = useTheme();

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTheme(e.target.value as Theme);
    },
    [setTheme]
  );

  const handleToggleClick = useCallback(() => {
    setTheme(theme === "dark" ? "light" : ("dark" as Theme));
  }, [setTheme, theme]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleToggleClick}
        className="cursor-pointer"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      <select
        value={theme}
        onChange={handleSelectChange}
        className="bg-background border rounded-md px-2 py-1 text-sm cursor-pointer"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
});

ModeToggle.displayName = "ModeToggle";
