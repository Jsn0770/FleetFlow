"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  LogOut,
  Menu,
  X,
  UserCog,
  FileText,
  HardDrive,
  Bell,
  ChevronDown,
  User,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import LogoutConfirmation from "./logout-confirmation"

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "perfil", label: "Perfil", icon: User },
  { id: "gestores", label: "Gestores", icon: UserCog },
  { id: "motoristas", label: "Motoristas", icon: Users },
  { id: "carros", label: "Carros", icon: Car },
  { id: "eventos", label: "Eventos", icon: Calendar },
  { id: "relatorios", label: "Relatórios", icon: FileText },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "backup", label: "Backup", icon: HardDrive },
]

export default function Sidebar({ currentPage, onPageChange, onLogout, user }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false)
    onLogout()
  }

  // Verificar se o usuário é admin
  const isAdmin = user && (user.role === "admin" || user.tipo === "admin")

  // Adicionar item de logs apenas para admin
  const allMenuItems = isAdmin ? [...menuItems, { id: "logs", label: "Logs", icon: AlertTriangle }] : menuItems

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">FleetFlow</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="p-2">
                {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors">
                    <Avatar>
                      <AvatarImage src={user.foto_perfil || "/placeholder.svg"} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user.nome ? user.nome.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.nome || "Gestor"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      {isAdmin && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Admin</p>}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onPageChange("perfil")} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Tema</DropdownMenuLabel>

                  <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    <Sun className="w-4 h-4 mr-2" />
                    Tema Claro
                    {theme === "light" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                    <Moon className="w-4 h-4 mr-2" />
                    Tema Escuro
                    {theme === "dark" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                    <Monitor className="w-4 h-4 mr-2" />
                    Tema do Sistema
                    {theme === "system" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogoutClick}
                    className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-2">
            {allMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${isCollapsed ? "px-2" : "px-3"} ${
                    isActive
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  } ${item.id === "logs" ? "border-l-4 border-orange-500" : ""}`}
                  onClick={() => onPageChange(item.id)}
                >
                  <Icon
                    className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"} ${item.id === "logs" ? "text-orange-500" : ""}`}
                  />
                  {!isCollapsed && (
                    <span className={item.id === "logs" ? "text-orange-600 dark:text-orange-400 font-medium" : ""}>
                      {item.label}
                      {item.id === "logs" && <span className="ml-1 text-xs">(Admin)</span>}
                    </span>
                  )}
                </Button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              className={`w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 ${isCollapsed ? "px-2" : "px-3"}`}
              onClick={handleLogoutClick}
            >
              <LogOut className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} />
              {!isCollapsed && "Sair"}
            </Button>
          </div>
        </div>
      </div>

      <LogoutConfirmation
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogoutConfirm}
      />
    </>
  )
}
