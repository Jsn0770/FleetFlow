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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [motorista, setMotorista] = useState("");
  const [carro, setCarro] = useState("");
  const [odometro, setOdometro] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Saída");
  const [mensagem, setMensagem] = useState({ open: false, text: "", severity: "info" });

  const handleAdicionarEvento = () => {
    if (!motorista || !carro || (tipoEvento === "Chegada" && !odometro)) {
      setMensagem({ open: true, text: "Preencha todos os campos!", severity: "warning" });
      return;
    }

    const novoEvento = {
      id: Date.now(),
      motorista,
      carro,
      odometro: tipoEvento === "Saída" ? null : odometro,
      tipo: tipoEvento,
      dataHora: new Date().toLocaleString(),
    };

    if (tipoEvento === "Saída" && eventos.some((e) => e.carro === carro && e.tipo === "Saída")) {
      setMensagem({ open: true, text: "Este carro já está em uso!", severity: "error" });
      return;
    }

    if (tipoEvento === "Chegada" && !eventos.some((e) => e.carro === carro && e.tipo === "Saída")) {
      setMensagem({ open: true, text: "Não há registro de saída para este carro!", severity: "error" });
      return;
    }

    setEventos([...eventos, novoEvento]);
    setMensagem({
      open: true,
      text: `Evento de ${tipoEvento} registrado com sucesso!`,
      severity: "success",
    });
    resetForm();
  };

  const resetForm = () => {
    setMotorista("");
    setCarro("");
    setOdometro("");
    setTipoEvento("Saída");
  };

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
          Gerenciar Eventos
        </Typography>

        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          <TextField
            label="Motorista"
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
          />
          <TextField
            label="Carro"
            value={carro}
            onChange={(e) => setCarro(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
          />
          <TextField
            label="Odômetro"
            value={odometro}
            onChange={(e) => setOdometro(e.target.value)}
            fullWidth
            type="number"
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
            disabled={tipoEvento === "Saída"}
          />
          <TextField
            select
            label="Tipo de Evento"
            value={tipoEvento}
            onChange={(e) => setTipoEvento(e.target.value)}
            fullWidth
            SelectProps={{ native: true }}
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
          >
            <option value="Saída">Saída</option>
            <option value="Chegada">Chegada</option>
          </TextField>

          <Button
            variant="contained"
            onClick={handleAdicionarEvento}
            sx={{
              alignSelf: "flex-start",
              background: "#21cbf3",
              fontWeight: "bold",
              "&:hover": { background: "#1ba3c2" },
            }}
          >
            Adicionar Evento
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "white" }}>Motorista</TableCell>
              <TableCell sx={{ color: "white" }}>Carro</TableCell>
              <TableCell sx={{ color: "white" }}>Odômetro</TableCell>
              <TableCell sx={{ color: "white" }}>Tipo</TableCell>
              <TableCell sx={{ color: "white" }}>Data/Hora</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventos.map((evento) => (
              <TableRow key={evento.id}>
                <TableCell sx={{ color: "#eee" }}>{evento.motorista}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{evento.carro}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{evento.odometro || "-"}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{evento.tipo}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{evento.dataHora}</TableCell>
              </TableRow>
            ))}
            {eventos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: "#ccc", textAlign: "center" }}>
                  Nenhum evento registrado.
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
