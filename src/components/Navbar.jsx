import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";

export default function Navbar({ onLogout }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogoutClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setConfirmOpen(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setConfirmOpen(false);
  };

  return (
    <>
      <AppBar position="static" sx={{ background: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gestão de Frota
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button color="inherit" component={Link} to="/">
              Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/motoristas">
              Motoristas
            </Button>
            <Button color="inherit" component={Link} to="/carros">
              Carros
            </Button>
            <Button color="inherit" component={Link} to="/eventos">
              Eventos
            </Button>
            <Button color="inherit" onClick={handleLogoutClick}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmação de Logout"
        message="Tem certeza que deseja sair?"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}
