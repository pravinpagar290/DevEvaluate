import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { MoonIcon, SunIcon } from "lucide-react";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className={`btn btn-ghost btn-circle ${className}`}
      aria-label="Toggle Theme"
    >
      {theme === "cupcake" ? (
        <MoonIcon className="size-5 text-base-content" />
      ) : (
        <SunIcon className="size-5 text-base-content" />
      )}
    </button>
  );
};

export default ThemeToggle;
