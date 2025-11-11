"use client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Inputs } from "./types/Input";
import Link from "next/link";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";

export default function Home() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();
  
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch('/api/authentication/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (response.ok) {
        // Envoi du lien magique côté client
        const baseUrl =
          typeof window !== 'undefined'
            ? window.location.origin
            : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

        const actionCodeSettings = {
          url: `${baseUrl}/finishSignIn`,
          handleCodeInApp: true,
        };

        await sendSignInLinkToEmail(auth, data.email, actionCodeSettings);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('emailForSignIn', data.email);
        }

        setMessage("Lien magique envoyé par e-mail ! Vérifiez votre boîte mail.");
      } else {
        setMessage(result.error || "Erreur lors de l'envoi du lien.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Erreur lors de l'envoi du lien.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h6" gutterBottom>Se connecter</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField 
          fullWidth 
          variant="filled" 
          label="E-mail" 
          type="email" 
          {...register("email", {required: true})} 
          error={!!errors.email} 
          helperText={errors.email ? "Ce champ est obligatoire" : ""} 
          sx={{ mb: 2 }} 
        />
        {message && (
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2, 
              color: message.includes("Erreur") ? "error.main" : "success.main",
              textAlign: "center"
            }}
          >
            {message}
          </Typography>
        )}
        <Button 
          fullWidth 
          variant="contained" 
          type="submit"
          disabled={loading}
        >
          {loading ? "Envoi en cours..." : "Recevoir le lien de connexion"}
        </Button>
        <Link href="/register" style={{ display: 'block', marginTop: '16px', textAlign: 'center', color: '#1976d2', textDecoration: 'none', }}>
          Pas encore de compte ?
        </Link>
      </form>
    </Box>
  );
}
