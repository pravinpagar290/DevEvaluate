import React, { useEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext'
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("dev-evaluate-theme") || "sunset";
  });

  const toggleTheme = () => {
    const newTheme = theme === "cupcake" ? "sunset" : "cupcake";
    setTheme(newTheme);
    localStorage.setItem("dev-evaluate-theme", newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider