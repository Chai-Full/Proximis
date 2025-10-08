"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, FormProvider, Controller } from "react-hook-form";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import { SignupInputs } from "../types/SingupInputs";
import { APIProvider } from "@vis.gl/react-google-maps";
import PlaceAutocomplete from "./components/AutoCompletePlace";
import Backdrop from "@mui/material/Backdrop";
import { CircularProgress } from "@mui/material";
import { register } from "next/dist/next-devtools/userspace/pages/pages-dev-overlay-setup";


export default function SignupPage() {
  const methods = useForm<SignupInputs>({
    defaultValues: {
      nom: "",
      prenom: "",
      type: "client",
      adresse: "",
      codePostal: "",
      pays: "France",
    },
  });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const onSubmit: SubmitHandler<SignupInputs> = async (data) => {
    try {
      setLoading(true);
      const response = await fetch('/api/register', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.ok) {
      // Redirection manuelle côté client si redirection serveur pas prise en compte
      setLoading(false);
      window.location.href = '/home';
    } else {
      setLoading(false);
      const error = await response.json();
      alert(error.error || "Erreur lors de l'inscription");
    }
  } catch (err) {
    alert("Erreur réseau");
  }
  };

  const handleNext = async () => {
    let fieldsToCheck: (keyof SignupInputs)[] = [];
    if (step === 0) fieldsToCheck = ["nom", "prenom", "type"];
    else if (step === 1) fieldsToCheck = ["adresse", "codePostal", "pays"];
    
    const valid = await methods.trigger(fieldsToCheck);
    if (valid) setStep((prev) => prev + 1);
  };
  const handleBack = () => setStep((prev) => prev - 1);

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    if (selectedPlace) {
      console.log(selectedPlace.address_components); 
      methods.setValue("adresse", selectedPlace.address_components?.find((component) => component.types.includes("route"))?.short_name || "");
      methods.setValue("codePostal", selectedPlace.address_components?.find((component) => component.types.includes("postal_code"))?.long_name || "");
    }
  }, [selectedPlace, methods]);
  

  return (
    <FormProvider {...methods}>
      <Box sx={{ maxWidth: 400, mx: "auto", mt: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Inscription
        </Typography>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          {step === 0 && (
            <>
              <TextField 
                fullWidth label="E-mail" 
                type="email" 
                {...methods.register("email", {required: true})} 
                error={!!methods.formState.errors.email} 
                helperText={methods.formState.errors.email ? "Ce champ est obligatoire" : ""} 
                sx={{ mb: 2 }} 
                />
              <TextField
                label="Nom"
                {...methods.register("nom", { required: "Nom obligatoire" })}
                error={!!methods.formState.errors.nom}
                helperText={methods.formState.errors.nom?.message}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Prénom"
                {...methods.register("prenom", { required: "Prénom obligatoire" })}
                error={!!methods.formState.errors.prenom}
                helperText={methods.formState.errors.prenom?.message}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                select
                label="Type d'utilisateur"
                defaultValue="client"
                {...methods.register("type", { required: "Type obligatoire" })}
                error={!!methods.formState.errors.type}
                helperText={methods.formState.errors.type?.message}
                fullWidth
                sx={{ mb: 2 }}
              >
                <MenuItem value="client">Client</MenuItem>
                <MenuItem value="prestataire">Prestataire</MenuItem>
              </TextField>
              <Button fullWidth variant="contained" onClick={handleNext}>
                Suivant
              </Button>
            </>
          )}
          {step === 1 && (
            <>
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GG_API_KEY || ""}>
                <PlaceAutocomplete
                  onPlaceSelect={setSelectedPlace} label={"Adresse"}
                />
              </APIProvider>
              <Controller
                name="codePostal"
                control={methods.control}
                rules={{ required: "Code postal obligatoire" }}
                render={({ field, fieldState }) => (
                  <TextField
                    value={methods.getValues("codePostal") || ""}
                    label="Code postal"
                    error={!!methods.formState.errors.codePostal}
                    helperText={methods.formState.errors.codePostal?.message}
                    fullWidth
                    sx={{ my: 2 }}
                    slotProps={{ input: {value: methods.getValues("codePostal") || "", readOnly: true } }}
                  />
                )}
              />
              
              <TextField
                select
                label="Pays"
                defaultValue="France"
                {...methods.register("pays", { required: "Pays obligatoire" })}
                error={!!methods.formState.errors.pays}
                helperText={methods.formState.errors.pays?.message}
                fullWidth
                sx={{ mb: 2 }}
              >
                <MenuItem value="France">France</MenuItem>
              </TextField>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="outlined" onClick={handleBack}>
                  Retour
                </Button>
                <Button variant="contained" type="submit" disabled={loading}>
                  S’inscrire
                </Button>
                <Backdrop
                  sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                  open={loading}
                >
                  <CircularProgress color="inherit" />
                </Backdrop>
              </Box>
            </>
          )}
        </form>
      </Box>
    </FormProvider>
  );
}
