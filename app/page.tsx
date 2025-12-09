"use client";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Inputs } from "./types/Input";
import Link from "next/link";
// Firebase sign-in removed — use local users.json lookup instead
import usersData from '../data/users.json';
import "./index.css";
import Image from "next/image";
// Backdrop/CircularProgress removed (not used)


export default function Home() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Inputs>();
  const [loading, setLoading] = useState(false);
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    // Rendre `onSubmit` async si ce n'est pas déjà le cas
    await new Promise(resolve => setTimeout(resolve, 1000));
    const users = (usersData as any).users ?? [];
    const found = users.find((u: any) => typeof u.email === 'string' && u.email.toLowerCase() === (data.email || '').toLowerCase());
    if (found) {
      try {
        localStorage.setItem('proximis_userId', String(found.id));
      } catch (e) {
        // ignore
      }
      // navigate to home (or any landing page)
      window.location.href = '/home';
    } else {
      setMessage('Compte introuvable');
    }
    setLoading(false);
  };
  console.log(watch("email"))

  const [message, setMessage] = useState("");

  // Firebase magic-link removed — login is handled by checking data/users.json
  
  return (
    <div className="connexionContainer">
      <Image src="logo.svg" alt="Connexion Image" width={500} height={500} />
      <div className="connexionForm">
        <span className="T2">Se connecter</span>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
            <label htmlFor="email" className="T3" style={{color: "#545454", textTransform: "capitalize"}}>email</label>
            <TextField size="medium" fullWidth variant="filled"  type="email" {...register("email", {required: true})} error={!!errors.email} helperText={errors.email ? "Ce champ est obligatoire" : ""} sx={{ mb: 2 }} />
          </div>
          
          <Button fullWidth variant="contained" type="submit" sx={{
            height: "56px",
            textTransform: "none",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: "12px",
          }}
          disabled={loading}
          >Connexion</Button>

          {/* <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={loading}
          >
            <CircularProgress color="inherit" />
          </Backdrop> */}
          
          <Link href="/register" style={{ display: 'block', marginTop: '16px', textAlign: 'center', color: '#1976d2', textDecoration: 'none', }}>
            Pas encore de compte ?
          </Link>
        </form>
      </div>
      
    </div>
  );
}
