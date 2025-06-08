"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import Dashboard from "@/components/dashboard"
import Motoristas from "@/components/motoristas"
import Carros from "@/components/carros"
import Eventos from "@/components/eventos"
import Login from "@/components/login"

export default function Home() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState("dashboard")

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("user")
    setCurrentPage("dashboard")
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "motoristas":
        return <Motoristas />
      case "carros":
        return <Carros />
      case "eventos":
        return <Eventos />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onLogout={handleLogout} user={user} />
      <main className="flex-1 overflow-auto">
        <div className="animate-fade-in">{renderPage()}</div>
      </main>
    </div>
  )
}
