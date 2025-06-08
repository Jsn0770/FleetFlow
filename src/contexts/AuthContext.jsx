import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Podemos simular login persistente com localStorage:
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  function login(email, senha) {
    // Aqui pode chamar API real, mas vamos simular
    if (email === "admin@gestaofrota.com" && senha === "123456") {
      localStorage.setItem("token", "meu-token-fake");
      setIsLoggedIn(true);
      return { success: true };
    }
    return { success: false, message: "Email ou senha inválidos" };
  }

  function logout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
