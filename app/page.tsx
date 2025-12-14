"use client";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Inputs } from "./types/Input";
import Link from "next/link";
import "./index.css";
import Image from "next/image";

export default function Home() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (response.ok && result.ok && result.user && result.token) {
        try {
          localStorage.setItem('proximis_userId', String(result.user.id));
          localStorage.setItem('proximis_token', result.token);
        } catch (e) {
          // ignore
        }
        // Navigate to home
        window.location.href = '/home';
      } else {
        setMessage(result.error || 'Compte introuvable');
      }
    } catch (err) {
      console.error('Login error:', err);
      setMessage('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };
  
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
          
          {message && (
            <div style={{ 
              color: '#d32f2f', 
              fontSize: '14px', 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}

          <Button fullWidth variant="contained" type="submit" sx={{
            height: "56px",
            textTransform: "none",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: "12px",
          }}
          disabled={loading}
          >{loading ? 'Connexion...' : 'Connexion'}</Button>
          
          <Link href="/register" style={{ display: 'block', marginTop: '16px', textAlign: 'center', color: '#1976d2', textDecoration: 'none', }}>
            Pas encore de compte ?
          </Link>
        </form>
      </div>
      
    </div>
  );
}
