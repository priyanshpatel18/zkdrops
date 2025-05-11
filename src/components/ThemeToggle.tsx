"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export function ThemeToggle({
  position = "relative",
  top,
  right,
  bottom,
  left,
  className = ""
}: {
  position?: "absolute" | "relative" | "fixed";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  const getDefaultPosition = () => {
    switch (position) {
      case "absolute":
        return "top-4 right-4";
      case "fixed":
        return "top-18 right-4";
      default:
        return "";
    }
  };

  // Combine all positioning classes
  const positionClasses = position !== "relative"
    ? `${position} ${top || ""} ${right || ""} ${bottom || ""} ${left || ""} ${!top && !right && !bottom && !left ? getDefaultPosition() : ""}`
    : "";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`${positionClasses} ${position === "fixed" ? "z-40" : ""} ${className} cursor-pointer hover:text-primary text-primary/70 hover:bg-primary/10`}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}