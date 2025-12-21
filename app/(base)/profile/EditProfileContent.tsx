"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";
import { useContent } from "../ContentContext";
import usersData from "../../../data/users.json";
import "./index.css";
import { APIProvider } from "@vis.gl/react-google-maps";
import PlaceAutocomplete from "../../register/components/AutoCompletePlace";
import Notification from "../components/Notification";
import { fetchWithAuth } from "../lib/auth";

type FormInputs = {
  prenom: string;
  nom: string;
  adresse: string;
  codePostal: string;
  pays: string;
  photo: string | null;
};

export default function EditProfileContent() {
  const router = useRouter();
  const { currentUserId, setHeaderTitle, goBack } = useContent();
  const users = (usersData as any).users ?? [];
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "info" | "warning" | "error";
  }>({ open: false, message: "", severity: "info" });

  const currentUser = useMemo(() => {
    if (currentUserId == null) return null;
    return users.find((u: any) => Number(u.id) === Number(currentUserId)) ?? null;
  }, [currentUserId, users]);

  const methods = useForm<FormInputs>({
    defaultValues: {
      prenom: currentUser?.prenom || "",
      nom: currentUser?.nom || "",
      adresse: currentUser?.adresse || "",
      codePostal: currentUser?.codePostal || "",
      pays: currentUser?.pays || "France",
      photo: currentUser?.photo || null,
    },
  });

  const avatarSrc = methods.watch("photo") || currentUser?.photo || null;

  useEffect(() => {
    setHeaderTitle && setHeaderTitle("Modifier infos");
    return () => setHeaderTitle && setHeaderTitle(null);
  }, [setHeaderTitle]);

  useEffect(() => {
    if (!currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      methods.setValue("photo", reader.result as string, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormInputs) => {
    if (!currentUser) return;
    try {
      setSaving(true);
      const res = await fetchWithAuth("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentUser.id,
          ...data,
          photo: data.photo ?? currentUser.photo ?? null,
          codePostal: data.codePostal,
          pays: data.pays,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNotification({
          open: true,
          message: err.error || "Erreur lors de la mise à jour",
          severity: "error",
        });
        setSaving(false);
        return;
      }
      setNotification({
        open: true,
        message: "Profil mis à jour",
        severity: "success",
      });
      setSaving(false);
      goBack();
    } catch (e) {
      setSaving(false);
      setNotification({
        open: true,
        message: "Erreur réseau",
        severity: "error",
      });
    }
  };

  return (
    <div className="editProfilePage">
      <form className="editProfileForm" onSubmit={methods.handleSubmit(onSubmit)}>
      <div className="editAvatarWrapper">
        <div className="avatar largeAvatar">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Photo de profil"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : <span className="avatarInitials">
          {(currentUser?.prenom?.[0] || "U") + (currentUser?.nom?.[0] || "")}
        </span>}
          
        </div>
        <label className="editAvatarButton">
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <span role="button">Changer la photo</span>
        </label>
      </div>
        <div className="editField">
          <label htmlFor="prenom" className="T4">Prénom</label>
          <TextField
            id="prenom"
            variant="filled"
            fullWidth
            {...methods.register("prenom", { required: "Prénom obligatoire" })}
            error={!!methods.formState.errors.prenom}
            helperText={methods.formState.errors.prenom?.message}
          />
        </div>

        <div className="editField">
          <label htmlFor="nom" className="T4">Nom</label>
          <TextField
            id="nom"
            variant="filled"
            fullWidth
            {...methods.register("nom", { required: "Nom obligatoire" })}
            error={!!methods.formState.errors.nom}
            helperText={methods.formState.errors.nom?.message}
          />
        </div>

        <div className="editField">
          <label htmlFor="email" className="T4">Email</label>
          <TextField
            id="email"
            type="email"
            variant="filled"
            fullWidth
            value={currentUser?.email ?? ""}
            InputProps={{ readOnly: true }}
          />
        </div>

        <APIProvider apiKey={process.env.NEXT_PUBLIC_GG_API_KEY || ""}>
          <PlaceAutocomplete
            onPlaceSelect={(selectedPlace) => {
              if (!selectedPlace?.address_components) return;
              const route = selectedPlace.address_components.find((c: any) => c.types.includes("route"))?.long_name || "";
              const streetNumber =
                selectedPlace.address_components.find((c: any) => c.types.includes("street_number"))?.long_name || "";
              const postalCode =
                selectedPlace.address_components.find((c: any) => c.types.includes("postal_code"))?.long_name || "";
              const country =
                selectedPlace.address_components.find((c: any) => c.types.includes("country"))?.long_name || "";
              const composedAddress = [streetNumber, route].filter(Boolean).join(" ").trim() || selectedPlace.name || "";
              methods.setValue("adresse", composedAddress);
              if (postalCode) methods.setValue("codePostal", postalCode);
              if (country) methods.setValue("pays", country);
            }}
            label={"Adresse"}
          />
        </APIProvider>

        <Controller
          name="codePostal"
          control={methods.control}
          rules={{ required: "Code postal obligatoire" }}
          render={({ field }) => (
            <div className="editField">
              <label htmlFor="codePostal" className="T4">Code postal</label>
              <TextField
                id="codePostal"
                variant="filled"
                fullWidth
                {...field}
                inputProps={{ readOnly: true }}
                error={!!methods.formState.errors.codePostal}
                helperText={methods.formState.errors.codePostal?.message}
              />
            </div>
          )}
        />

        <Controller
          name="pays"
          control={methods.control}
          rules={{ required: "Pays obligatoire" }}
          render={({ field }) => (
            <div className="editField">
              <label htmlFor="pays" className="T4">Pays</label>
              <TextField
                id="pays"
                variant="filled"
                fullWidth
                {...field}
                inputProps={{ readOnly: true }}
                error={!!methods.formState.errors.pays}
                helperText={methods.formState.errors.pays?.message}
              />
            </div>
          )}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={saving}
          sx={{
            height: "48px",
            textTransform: "none",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: "24px",
            marginTop: "8px",
          }}
        >
          Mettre à jour
        </Button>
      </form>
      <Notification
        open={notification.open}
        severity={notification.severity}
        message={notification.message}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

