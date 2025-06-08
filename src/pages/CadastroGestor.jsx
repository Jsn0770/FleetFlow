import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function CadastroGestor() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState({ open: false, text: "", severity: "info" });

  const nomeRef = useRef(null);
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmarRef = useRef(null);

  const navigate = useNavigate();

  const verificarForcaSenha = (senha) => {
    const temLetra = /[a-zA-Z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temSimbolo = /[^a-zA-Z0-9]/.test(senha);

    if (senha.length < 6) return { nivel: "fraca", cor: "error", progresso: 30 };
    if (senha.length < 8 || !(temLetra && temNumero)) return { nivel: "média", cor: "warning", progresso: 60 };
    if (temLetra && temNumero && temSimbolo) return { nivel: "forte", cor: "success", progresso: 100 };

    return { nivel: "média", cor: "warning", progresso: 60 };
  };

  const forca = verificarForcaSenha(senha);

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nome || !email || !senha || !confirmarSenha) {
      setMensagem({ open: true, text: "Preencha todos os campos", severity: "warning" });
      if (!nome) nomeRef.current.focus();
      else if (!email) emailRef.current.focus();
      else if (!senha) senhaRef.current.focus();
      else confirmarRef.current.focus();
      return;
    }

    if (!emailRegex.test(email)) {
      setMensagem({ open: true, text: "Email inválido", severity: "error" });
      emailRef.current.focus();
      return;
    }

    if (senha.length < 6) {
      setMensagem({ open: true, text: "A senha deve ter no mínimo 6 caracteres", severity: "error" });
      senhaRef.current.focus();
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem({ open: true, text: "As senhas não coincidem", severity: "error" });
      confirmarRef.current.focus();
      return;
    }

    setTimeout(() => {
      setMensagem({ open: true, text: "Cadastro realizado com sucesso!", severity: "success" });
      setTimeout(() => navigate("/login"), 2000);
    }, 1000);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 2,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <Paper
        elevation={15}
        sx={{
          padding: 5,
          maxWidth: 400,
          width: "100%",
          borderRadius: 4,
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          backdropFilter: "blur(8.5px)",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          color: "#fff",
        }}
      >
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
          Cadastro de Gestor
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Nome"
            inputRef={nomeRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            fullWidth
            margin="normal"
            required
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
            sx={inputStyles}
          />

          <TextField
            label="E-mail"
            type="email"
            inputRef={emailRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
            helperText={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Formato de email inválido" : ""}
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
            sx={inputStyles}
          />

          <TextField
            label="Senha"
            type="password"
            inputRef={senhaRef}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            fullWidth
            margin="normal"
            required
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
            sx={inputStyles}
          />

          {senha && (
            <Box mt={1} mb={2}>
              <LinearProgress
                variant="determinate"
                value={forca.progresso}
                color={forca.cor}
                sx={{ height: 8, borderRadius: 5 }}
              />
              <Typography variant="caption" color="white">
                Força da senha: {forca.nivel}
              </Typography>
            </Box>
          )}

          <TextField
            label="Confirmar Senha"
            type="password"
            inputRef={confirmarRef}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={confirmarSenha && confirmarSenha !== senha}
            helperText={confirmarSenha && confirmarSenha !== senha ? "As senhas não coincidem" : ""}
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
            sx={inputStyles}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              py: 1.8,
              fontWeight: "bold",
              fontSize: "1.1rem",
              background: "linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)",
              boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
              "&:hover": {
                background: "linear-gradient(45deg, #1769aa 30%, #1696c7 90%)",
              },
            }}
          >
            Cadastrar
          </Button>

          <Button
            fullWidth
            onClick={() => navigate("/login")}
            sx={{
              mt: 2,
              color: "#ffffff",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Já tem conta? Voltar para Login
          </Button>
        </form>
      </Paper>

      <Snackbar
        open={mensagem.open}
        autoHideDuration={4000}
        onClose={() => setMensagem({ ...mensagem, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={mensagem.severity}
          onClose={() => setMensagem({ ...mensagem, open: false })}
          sx={{ width: "100%" }}
        >
          {mensagem.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

const inputStyles = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "rgba(255,255,255,0.6)" },
    "&:hover fieldset": { borderColor: "white" },
    "&.Mui-focused fieldset": { borderColor: "white" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "white" },
};
