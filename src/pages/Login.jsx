import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // ✅ apenas adicione isso
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ open: false, text: "", severity: "info" });

  const navigate = useNavigate(); // ✅ adicionado aqui

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (email === "admin@gestaofrota.com" && senha === "123456") {
        onLogin({ email });
        setMensagem({ open: true, text: "Login realizado com sucesso!", severity: "success" });
        navigate("/"); // ✅ redireciona para o dashboard
      } else {
        setMensagem({ open: true, text: "Email ou senha inválidos", severity: "error" });
      }
    }, 1500);
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
        <Typography
          variant="h3"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700, letterSpacing: 2, mb: 4 }}
        >
          Gestão de Frota
        </Typography>

        <Typography
          variant="subtitle1"
          align="center"
          gutterBottom
          sx={{ mb: 3, color: "rgba(255,255,255,0.8)" }}
        >
          Faça login para continuar
        </Typography>

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: "white" }} />
                </InputAdornment>
              ),
              style: { color: "white" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(255,255,255,0.6)" },
                "&:hover fieldset": { borderColor: "white" },
                "&.Mui-focused fieldset": { borderColor: "white" },
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "white" },
            }}
          />

          <TextField
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            fullWidth
            margin="normal"
            required
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: "white" }} />
                </InputAdornment>
              ),
              style: { color: "white" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(255,255,255,0.6)" },
                "&:hover fieldset": { borderColor: "white" },
                "&.Mui-focused fieldset": { borderColor: "white" },
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "white" },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 4,
              py: 1.8,
              fontWeight: "bold",
              fontSize: "1.1rem",
              background: "linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)",
              boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
              "&:hover": {
                background: "linear-gradient(45deg, #1769aa 30%, #1696c7 90%)",
              },
            }}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 3, color: "rgba(255,255,255,0.7)" }}
        >
          Não tem uma conta?{" "}
          <Link to="/cadastro-gestor" style={{ color: "#21cbf3", textDecoration: "none", fontWeight: "bold" }}>
  Cadastre-se aqui
</Link>
        </Typography>
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
