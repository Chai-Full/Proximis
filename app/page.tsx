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
    watch,
    formState: { errors },
  } = useForm<Inputs>();
  const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data);
  console.log(watch("email"))

  const [message, setMessage] = useState("");

  const actionCodeSettings = {
    url: window.location.origin + "/finishSignIn",
    handleCodeInApp: true,
  };

  const handleSendLink = async () => {
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage("Lien magique envoyé par e-mail !");
    } catch (error) {
      console.error(error);
      setMessage("Erreur lors de l'envoi du lien.");
    }
  };
  
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h6" gutterBottom>Se connecter</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField fullWidth variant="filled" label="E-mail" type="email" {...register("email", {required: true})} error={!!errors.email} helperText={errors.email ? "Ce champ est obligatoire" : ""} sx={{ mb: 2 }} />
        <Button fullWidth variant="contained" type="submit">Recevoir le lien de connexion</Button>
        <Link href="/register" style={{ display: 'block', marginTop: '16px', textAlign: 'center', color: '#1976d2', textDecoration: 'none', }}>
          Pas encore de compte ?
        </Link>
      </form>
    </Box>
  );
}
