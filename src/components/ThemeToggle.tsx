import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "webcraft:ui-theme";

/** Light/dark app chrome (not the website being built). Persisted per browser. */
export function useUiTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(KEY, next ? "dark" : "light");
    setDark(next);
  };
  return { dark, toggle };
}

/** Inline script for <head>: applies the saved theme before paint. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { dark, toggle } = useUiTheme();
  return (
    <Button type="button" size="icon" variant="ghost" className={`size-8 ${className}`} onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
