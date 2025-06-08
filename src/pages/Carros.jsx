import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

const regexPlaca = /^[A-Z]{3}-?\d{4}$/;

const gerarRenavam = () => {
  return String(Math.floor(10000000000 + Math.random() * 89999999999));
};

export default function Carros() {
  const [carros, setCarros] = useState([]);
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [placa, setPlaca] = useState("");
  const [ano, setAno] = useState("");
  const [odometro, setOdometro] = useState("");
  const [status, setStatus] = useState("Disponível");
  const [imagem, setImagem] = useState(null);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState({ open: false, text: "", severity: "info" });
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    const dadosSalvos = localStorage.getItem("carros");
    if (dadosSalvos) {
      setCarros(JSON.parse(dadosSalvos));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("carros", JSON.stringify(carros));
  }, [carros]);

  const resetForm = () => {
    setModelo("");
    setMarca("");
    setPlaca("");
    setAno("");
    setOdometro("");
    setImagem(null);
    setStatus("Disponível");
    setEditandoId(null);
  };

  const handleImagemChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagem(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdicionarOuEditar = () => {
    if (!modelo || !placa || !marca || !odometro) {
      setMensagem({ open: true, text: "Preencha todos os campos!", severity: "warning" });
      return;
    }
    if (!regexPlaca.test(placa.toUpperCase())) {
      setMensagem({ open: true, text: "Placa inválida! Formato esperado: ABC-1234", severity: "warning" });
      return;
    }

    const carroPadrao = {
      modelo,
      marca,
      placa: placa.toUpperCase(),
      ano,
      odometro: parseInt(odometro),
      status,
      imagem,
    };

    if (editandoId !== null) {
      setCarros(
        carros.map((c) => (c.id === editandoId ? { ...c, ...carroPadrao } : c))
      );
      setMensagem({ open: true, text: "Carro editado com sucesso!", severity: "success" });
    } else {
      const novoCarro = {
        ...carroPadrao,
        id: Date.now(),
        renavam: gerarRenavam(),
      };
      setCarros([novoCarro, ...carros]);
      setMensagem({ open: true, text: "Carro adicionado com sucesso!", severity: "success" });
    }
    resetForm();
  };

  const handleRemover = (id) => {
    setCarros(carros.filter((c) => c.id !== id));
    setMensagem({ open: true, text: "Carro removido com sucesso!", severity: "info" });
    if (editandoId === id) resetForm();
  };

  const handleEditar = (carro) => {
    setModelo(carro.modelo);
    setMarca(carro.marca);
    setPlaca(carro.placa);
    setAno(carro.ano);
    setOdometro(String(carro.odometro));
    setStatus(carro.status);
    setImagem(carro.imagem);
    setEditandoId(carro.id);
  };

  const carrosFiltrados = carros.filter(
    (c) =>
      c.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      c.placa.toLowerCase().includes(busca.toLowerCase())
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
          Gerenciar Carros
        </Typography>

        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          <TextField label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} fullWidth
            InputProps={{ style: { color: "white" } }} InputLabelProps={{ style: { color: "#bbb" } }} />
          <TextField label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} fullWidth
            InputProps={{ style: { color: "white" } }} InputLabelProps={{ style: { color: "#bbb" } }} />
          <TextField label="Placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            fullWidth placeholder="ABC-1234"
            InputProps={{ style: { color: "white" }, maxLength: 8 }}
            InputLabelProps={{ style: { color: "#bbb" } }} helperText="Formato esperado: ABC-1234" />

          {/* CAMPO ANO COM ESTILO CORRETO E APENAS NÚMEROS */}
          <TextField
            label="Ano"
            type="number"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            fullWidth
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "#bbb" } }}
          />

          <TextField label="Odômetro (km)" type="number" value={odometro} onChange={(e) => setOdometro(e.target.value)} fullWidth
            InputProps={{ style: { color: "white" } }} InputLabelProps={{ style: { color: "#bbb" } }} />

          <FormControl fullWidth>
            <InputLabel sx={{ color: "#bbb" }}>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} sx={{ color: "white" }}>
              <MenuItem value="Disponível">Disponível</MenuItem>
              <MenuItem value="Indisponível">Indisponível</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />}
            sx={{ color: "white", borderColor: "white", "&:hover": { borderColor: "#21cbf3" } }}>
            {imagem ? "Alterar Imagem" : "Adicionar Imagem"}
            <input type="file" hidden accept="image/*" onChange={handleImagemChange} />
          </Button>

          {imagem && (
            <Box component="img" src={imagem} alt="Imagem do carro"
              sx={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 2, mt: 1 }} />
          )}

          <Button variant="contained" onClick={handleAdicionarOuEditar}
            sx={{
              alignSelf: "flex-start", background: "#21cbf3", fontWeight: "bold",
              "&:hover": { background: "#1ba3c2" },
            }}>
            {editandoId !== null ? "Salvar Alterações" : "Adicionar Carro"}
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
          maxWidth: 1000,
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
              <TableCell sx={{ color: "white" }}>Marca</TableCell>
              <TableCell sx={{ color: "white" }}>Placa</TableCell>
              <TableCell sx={{ color: "white" }}>Ano</TableCell>
              <TableCell sx={{ color: "white" }}>RENAVAM</TableCell>
              <TableCell sx={{ color: "white" }}>Odômetro</TableCell>
              <TableCell sx={{ color: "white" }}>Status</TableCell>
              <TableCell sx={{ color: "white" }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carrosFiltrados.map((carro) => (
              <TableRow key={carro.id}>
                <TableCell>
                  {carro.imagem ? (
                    <Box component="img" src={carro.imagem} alt={carro.modelo}
                      sx={{ width: 80, height: 50, objectFit: "contain", borderRadius: 1 }} />
                  ) : (
                    <DriveEtaIcon sx={{ color: "#999", fontSize: 40 }} />
                  )}
                </TableCell>
                <TableCell sx={{ color: "#eee" }}>{carro.modelo}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{carro.marca}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{carro.placa}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{carro.ano}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{carro.renavam}</TableCell>
                <TableCell sx={{ color: "#eee" }}>{carro.odometro} km</TableCell>
                <TableCell sx={{ color: carro.status === "Disponível" ? "#4caf50" : "#f44336" }}>
                  {carro.status}
                </TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleEditar(carro)} title="Editar">
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleRemover(carro.id)} title="Remover">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {carrosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ color: "#ccc", textAlign: "center" }}>
                  Nenhum carro encontrado.
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
