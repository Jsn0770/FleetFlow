// src/components/CarrosForm.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

export default function CarrosForm({ onSalvar, carroEditando }) {
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [imagem, setImagem] = useState(null);

  useEffect(() => {
    if (carroEditando) {
      setModelo(carroEditando.modelo);
      setPlaca(carroEditando.placa);
      setImagem(carroEditando.imagem);
    } else {
      resetForm();
    }
  }, [carroEditando]);

  const resetForm = () => {
    setModelo("");
    setPlaca("");
    setImagem(null);
  };

  const handleImagemChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagem(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    onSalvar({ id: carroEditando?.id || null, modelo, placa: placa.toUpperCase(), imagem });
    resetForm();
  };

  return (
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
        {carroEditando ? "Editar Carro" : "Adicionar Carro"}
      </Typography>

      <Box display="flex" flexDirection="column" gap={2} mt={2}>
        <TextField
          label="Modelo"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          fullWidth
          InputProps={{ style: { color: "white" } }}
          InputLabelProps={{ style: { color: "#bbb" } }}
        />
        <TextField
          label="Placa"
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          fullWidth
          placeholder="ABC-1234"
          InputProps={{ style: { color: "white" } }}
          InputLabelProps={{ style: { color: "#bbb" } }}
          helperText="Formato esperado: ABC-1234"
        />
        <Button
          variant="outlined"
          component="label"
          startIcon={<AddPhotoAlternateIcon />}
          sx={{ color: "white", borderColor: "white", "&:hover": { borderColor: "#21cbf3" } }}
        >
          {imagem ? "Alterar Imagem" : "Adicionar Imagem"}
          <input type="file" hidden accept="image/*" onChange={handleImagemChange} />
        </Button>

        {imagem && (
          <Box
            component="img"
            src={imagem}
            alt="Imagem do carro"
            sx={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 2 }}
          />
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{
            alignSelf: "flex-start",
            background: "#21cbf3",
            fontWeight: "bold",
            "&:hover": { background: "#1ba3c2" },
          }}
        >
          {carroEditando ? "Salvar Alterações" : "Adicionar Carro"}
        </Button>
      </Box>
    </Paper>
  );
}
