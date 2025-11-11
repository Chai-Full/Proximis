"use client";
import { useEffect, useState } from "react";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/app/firebaseConfig";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";

export default function FinishSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        // Vérifier si le lien est valide
        const href = typeof window !== "undefined" ? window.location.href : "";
        const isLink = href && isSignInWithEmailLink(auth, href);
        if (!isLink) {
          setError("Lien de connexion invalide ou expiré.");
          setLoading(false);
          return;
        }

        // Récupérer l'email depuis le localStorage si possible
        let storedEmail = "";
        if (typeof window !== "undefined") {
          storedEmail = window.localStorage.getItem("emailForSignIn") || "";
        }
        setEmail(storedEmail);
        setLoading(false);
      } catch (e) {
        setError("Erreur lors de la vérification du lien.");
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");
      const href = typeof window !== "undefined" ? window.location.href : "";
      await signInWithEmailLink(auth, email, href);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("emailForSignIn");
      }
      router.replace("/home");
    } catch (e) {
      setError("Impossible de finaliser la connexion. Vérifiez l'email ou le lien.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 6, p: 2 }}>
      <Typography variant="h6" gutterBottom>Finaliser la connexion</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Entrez votre adresse e-mail pour confirmer votre connexion.
      </Typography>
      <TextField
        fullWidth
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Button variant="contained" fullWidth onClick={handleConfirm} disabled={!email}>
        Confirmer
      </Button>
    </Box>
  );
}


