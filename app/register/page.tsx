"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, FormProvider, Controller } from "react-hook-form";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { SignupInputs } from "../types/SingupInputs";
import { APIProvider } from "@vis.gl/react-google-maps";
import PlaceAutocomplete from "./components/AutoCompletePlace";
import Backdrop from "@mui/material/Backdrop";
import { CircularProgress } from "@mui/material";
import Image from "next/image";
import "./index.css";
import Link from "next/link";


// Validation function for name fields (nom and prenom)
// Allows only letters, spaces, apostrophes ('), hyphens (-), and c cedilla (ç)
// Explicitly excludes digits and special characters
const validateName = (value: string) => {
  if (!value) return "Ce champ est obligatoire";
  
  // Check for digits explicitly
  if (/\d/.test(value)) {
    return "Le nom ne peut contenir ni chiffres ni caractères spéciaux (sauf ' - ç)";
  }
  
  // Regex: allows letters (including accents), spaces, apostrophes, hyphens, and ç
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-çÇ]+$/;
  if (!nameRegex.test(value)) {
    return "Le nom ne peut contenir ni chiffres ni caractères spéciaux (sauf ' - ç)";
  }
  return true;
};

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
      const result = await response.json();
      
      // Store user ID and token in localStorage (same as login)
      if (result.ok && result.user && result.token) {
        try {
          localStorage.setItem('proximis_userId', String(result.user.id));
          localStorage.setItem('proximis_token', result.token);
        } catch (e) {
          console.error('Error storing auth data:', e);
        }
      }
      
      setLoading(false);
      // Redirect to home page
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
    if (step === 0) fieldsToCheck = ["nom", "prenom", "email"];
    else if (step === 1) fieldsToCheck = ["adresse", "codePostal", "pays"];
    
    const valid = await methods.trigger(fieldsToCheck);
    if (valid) setStep((prev) => prev + 1);
  };
  const handleBack = () => setStep((prev) => prev - 1);

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    if (selectedPlace) {
      console.log(selectedPlace.address_components); 
      const route = selectedPlace.address_components?.find((component) => component.types.includes("route"))?.long_name || "";
      const streetNumber = selectedPlace.address_components?.find((component) => component.types.includes("street_number"))?.long_name || "";
      const postalCode = selectedPlace.address_components?.find((component) => component.types.includes("postal_code"))?.long_name || "";
      const country = selectedPlace.address_components?.find((component) => component.types.includes("country"))?.long_name || "";
      const composedAddress = [streetNumber, route].filter(Boolean).join(" ").trim() || selectedPlace.name || "";
      methods.setValue("adresse", composedAddress);
      if (postalCode) methods.setValue("codePostal", postalCode);
      methods.setValue("pays", country || "France");
    }
  }, [selectedPlace, methods]);
  

  return (
    <FormProvider {...methods}>
      <div className="registerContainer">
        <Image style={{alignSelf: "center"}} src="logo.svg" alt="Connexion Image" width={500} height={500} />
        <div className="registerForm">
          <span className="T2">
            Compléter mes informations
          </span>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
          {step === 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
                <label htmlFor="email" className="T3" style={{ color: "#545454", textTransform: "capitalize" }}>E-mail</label>
                <TextField
                  id="email"
                  size="medium"
                  fullWidth
                  variant="filled"
                  type="email"
                  {...methods.register("email", { required: true })}
                  error={!!methods.formState.errors.email}
                  helperText={methods.formState.errors.email ? "Ce champ est obligatoire" : ""}
                  sx={{ mb: 2 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
                <label htmlFor="nom" className="T3" style={{ color: "#545454", textTransform: "capitalize" }}>Nom</label>
                <TextField
                  id="nom"
                  {...methods.register("nom", { 
                    required: "Nom obligatoire",
                    validate: validateName
                  })}
                  error={!!methods.formState.errors.nom}
                  helperText={methods.formState.errors.nom?.message}
                  size="medium"
                  fullWidth
                  variant="filled"
                  sx={{ mb: 2 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
                <label htmlFor="prenom" className="T3" style={{ color: "#545454", textTransform: "capitalize" }}>Prénom</label>
                <TextField
                  id="prenom"
                  {...methods.register("prenom", { 
                    required: "Prénom obligatoire",
                    validate: validateName
                  })}
                  error={!!methods.formState.errors.prenom}
                  helperText={methods.formState.errors.prenom?.message}
                  size="medium"
                  fullWidth
                  variant="filled"
                  sx={{ mb: 2 }}
                  required
                />
              </div>
              {/* <TextField
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
              </TextField> */}
              <Button sx={{
                height: "56px",
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: "12px",
              }} fullWidth variant="contained" onClick={handleNext}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
                    <label htmlFor="codePostal" className="T3" style={{ color: "#545454", textTransform: "capitalize" }}>Code postal</label>
                    <TextField
                      {...field}
                      id="codePostal"
                      error={!!methods.formState.errors.codePostal}
                      helperText={methods.formState.errors.codePostal?.message}
                      fullWidth
                      variant="filled"
                      InputProps={{ readOnly: true }}
                    />
                  </div>
                )}
              />

              <Controller
                name="pays"
                control={methods.control}
                rules={{ required: "Pays obligatoire" }}
                render={({ field }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', rowGap: '8px' }}>
                    <label htmlFor="pays" className="T3" style={{ color: "#545454", textTransform: "capitalize" }}>Pays</label>
                    <TextField
                      {...field}
                      id="pays"
                      error={!!methods.formState.errors.pays}
                      helperText={methods.formState.errors.pays?.message}
                      fullWidth
                      required
                      variant="filled"
                      InputProps={{ readOnly: true }}
                    />
                  </div>
                )}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", columnGap: 2 }}>
                <Button fullWidth variant="outlined" onClick={handleBack} sx={{
                  height: "56px",
                  textTransform: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: "12px",
                  flex: 1,
                }}>
                  Retour
                </Button>
                <Button fullWidth variant="contained" type="submit" disabled={loading} sx={{
                  height: "56px",
                  textTransform: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: "12px",
                  flex: 1,
                }}>
                  Confirmer
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
        <Link href="/" style={{ display: 'block', marginTop: '16px', textAlign: 'center', color: '#1976d2', textDecoration: 'none', }}>
          Se connecter
        </Link>
      </div>
        
        
    </div>
  </FormProvider>
  );
}
