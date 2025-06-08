import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";

const regexTelefone = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState({ open: false, text: "", severity: "info" });
  const [editandoId, setEditandoId] = useState(null);

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setEditandoId(null);
  };

  const handleAdicionarOuEditar = () => {
    if (!nome || !telefone) {
      setMensagem({ open: true, text: "Preencha todos os campos!", severity: "warning" });
      return;
    }
    if (!regexTelefone.test(telefone)) {
      setMensagem({ open: true, text: "Telefone inválido! Use o formato correto.", severity: "warning" });
      return;
    }

    if (editandoId !== null) {
      // Editar
      setMotoristas(
        motoristas.map((m) => (m.id === editandoId ? { ...m, nome, telefone } : m))
      );
      setMensagem({ open: true, text: "Motorista editado com sucesso!", severity: "success" });
    } else {
      // Adicionar novo
      const novoMotorista = {
        id: Date.now(),
        nome,
        telefone,
      };
      setMotoristas([novoMotorista, ...motoristas]);
      setMensagem({ open: true, text: "Motorista adicionado com sucesso!", severity: "success" });
    }
    resetForm();
  };

  const handleRemover = (id) => {
    setMotoristas(motoristas.filter((m) => m.id !== id));
    setMensagem({ open: true, text: "Motorista removido com sucesso!", severity: "info" });
    if (editandoId === id) resetForm();
  };

  const handleEditar = (motorista) => {
    setNome(motorista.nome);
    setTelefone(motorista.telefone);
    setEditandoId(motorista.id);
  };

  const motoristasFiltrados = motoristas.filter(
    (m) =>
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.telefone.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to right, #232526, #414345)",
        padding: 4,
        fontFamily: "'Poppins', sans-serif",
        color: "#fff",
      }}
    >
      <Paper
        sx={{
          padding: 4,
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(8px)",
          borderRadius: 3,
          boxShadow: 5,
          mb: 4,
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Gerenciar Motoristas
        </Typography>

        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          <TextField
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
          />
          <TextField
            label="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            fullWidth
            placeholder="(XX) XXXXX-XXXX"
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
            inputProps={{ maxLength: 15 }}
            helperText="Formato esperado: (XX) XXXXX-XXXX"
          />
          <Button
            variant="contained"
            onClick={handleAdicionarOuEditar}
            sx={{
              alignSelf: "flex-start",
              background: "#21cbf3",
              fontWeight: "bold",
              "&:hover": { background: "#1ba3c2" },
            }}
          >
            {editandoId !== null ? "Salvar Alterações" : "Adicionar Motorista"}
          </Button>
        </Box>
      </Paper>

      <Paper
        sx={{
          padding: 3,
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(8px)",
          borderRadius: 3,
          boxShadow: 3,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <TextField
          label="Buscar por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          fullWidth
          margin="normal"
          InputProps={{
            style: { color: "white" },
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon sx={{ color: "white" }} />
              </InputAdornment>
            ),
          }}
          InputLabelProps={{ style: { color: "#bbb" } }}
        />

        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "white" }}>Nome</TableCell>
              <TableCell sx={{ color: "white" }}>Telefone</TableCell>
              <TableCell sx={{ color: "white" }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {motoristasFiltrados.map((motorista) => (
              <TableRow key={motorista.id}>
                <TableCell sx={{ color: "#eee" }}>{motorista.nome}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{motorista.telefone}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEditar(motorista)}
                    title="Editar"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleRemover(motorista.id)}
                    title="Remover"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {motoristasFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} sx={{ color: "#ccc", textAlign: "center" }}>
                  Nenhum motorista encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
