import React from "react";
import { Box, Typography, Paper, Grid } from "@mui/material";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import PeopleIcon from "@mui/icons-material/People";
import EventNoteIcon from "@mui/icons-material/EventNote";

export default function Dashboard({ carrosCount = 0, motoristasCount = 0, eventosCount = 0 }) {
  const cards = [
    {
      title: "Carros cadastrados",
      count: carrosCount,
      icon: <DriveEtaIcon sx={{ fontSize: 40, color: "white" }} />,
      color: "#42a5f5",
    },
    {
      title: "Motoristas cadastrados",
      count: motoristasCount,
      icon: <PeopleIcon sx={{ fontSize: 40, color: "white" }} />,
      color: "#66bb6a",
    },
    {
      title: "Eventos registrados",
      count: eventosCount,
      icon: <EventNoteIcon sx={{ fontSize: 40, color: "white" }} />,
      color: "#ab47bc",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e3c72, #2a5298)",
        padding: 4,
        fontFamily: "'Poppins', sans-serif",
        color: "white",
      }}
    >
      <Box sx={{ maxWidth: 1200, margin: "0 auto" }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Dashboard
        </Typography>

        <Grid container spacing={4} mt={3}>
          {cards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={8}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  textAlign: "center",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  "&:hover": {
                    transform: "scale(1.03)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                  },
                }}
              >
                <Box
                  sx={{
                    mb: 2,
                    width: 70,
                    height: 70,
                    borderRadius: "50%",
                    backgroundColor: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {card.count}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.85 }}>
                  {card.title}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
