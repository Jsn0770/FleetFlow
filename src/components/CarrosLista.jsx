// src/components/CarrosLista.jsx
import React, { useState } from "react";
import {
  Paper,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Box,
  InputAdornment,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DriveEtaIcon from "@mui/icons-material/DriveEta";

export default function CarrosLista({ carros, onEditar, onRemover }) {
  const [busca, setBusca] = useState("");

  const carrosFiltrados = carros.filter(
    (c) =>
      c.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      c.placa.toLowerCase().includes(busca.toLowerCase())
  );

  return (
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
        label="Buscar por modelo ou placa"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        fullWidth
        margin="normal"
        InputProps={{
          style: { color: "white" },
          startAdornment: (
            <InputAdornment position="start">
              <DriveEtaIcon sx={{ color: "white" }} />
            </InputAdornment>
          ),
        }}
        InputLabelProps={{ style: { color: "#bbb" } }}
      />

      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: "white" }}>Imagem</TableCell>
            <TableCell sx={{ color: "white" }}>Modelo</TableCell>
            <TableCell sx={{ color: "white" }}>Placa</TableCell>
            <TableCell sx={{ color: "white" }}>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {carrosFiltrados.map((carro) => (
            <TableRow key={carro.id}>
              <TableCell>
                {carro.imagem ? (
                  <Box
                    component="img"
                    src={carro.imagem}
                    alt={carro.modelo}
                    sx={{ width: 80, height: 50, objectFit: "contain", borderRadius: 1 }}
                  />
                ) : (
                  <DriveEtaIcon sx={{ color: "#999", fontSize: 40 }} />
                )}
              </TableCell>
              <TableCell sx={{ color: "#eee" }}>{carro.modelo}</TableCell>
              <TableCell sx={{ color: "#eee" }}>{carro.placa}</TableCell>
              <TableCell>
                <IconButton color="primary" onClick={() => onEditar(carro)} title="Editar">
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={() => onRemover(carro.id)} title="Remover">
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {carrosFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} sx={{ color: "#ccc", textAlign: "center" }}>
                Nenhum carro encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
