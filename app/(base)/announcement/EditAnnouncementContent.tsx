"use client";

import React, { useEffect, useRef, useState } from "react";
import "./index.css";
import { FormProvider, useForm, Controller, useFormContext } from "react-hook-form";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { AddCircleOutline, CameraAltOutlined, CancelOutlined } from "@mui/icons-material";
import InputAdornment from "@mui/material/InputAdornment";
import Slider from "@mui/material/Slider";
import Notification from "../components/Notification";
import { useContent } from "../ContentContext";
import { AnnounceCategories } from "@/app/types/AnnouceService";
// Fetch announcement dynamically to ensure newly created items are available
import { getLocalUserId, fetchWithAuth } from "../lib/auth";
import Image from "next/image";

type FormValues = {
    title: string;
    category: string;
    description: string;
    availableDays?: number[];
    availableHours?: (Dayjs | null)[];
    price?: number;
    scope?: number;
    slots?: { day: number; start: string | null; end: string | null }[];
    photo?: string | null;
};

/* -------------------------------------------------------------------------- */
/* STEP 1 */
/* -------------------------------------------------------------------------- */

function Step1() {
    const { register, control, formState: { errors } } = useFormContext<FormValues>();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
            <div>
                <label htmlFor="category">Catégorie de Service</label>
                <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                    <Controller
                        name="category"
                        control={control}
                        defaultValue=""
                        rules={{ required: "La catégorie est requise" }}
                        render={({ field }) => (
                            <Select
                                {...field}
                                displayEmpty
                                renderValue={(selected) =>
                                    selected ? selected : <span style={{ color: "#9e9e9e" }}>-- Choisir une catégorie --</span>
                                }
                                sx={{
                                    backgroundColor: "#D9D9D961",
                                    borderColor: "#000000",
                                    borderRadius: "10px",
                                }}
                            >
                                <MenuItem value="">
                                    <em>-- Choisir une catégorie --</em>
                                </MenuItem>
                                {AnnounceCategories.map((item) => (
                                    <MenuItem key={item.id} value={item.label}>
                                        {item.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    />
                </FormControl>
                <p className="error">{errors.category?.message as string}</p>
            </div>

            <div>
                <label>Nom de votre Annonce</label>
                <TextField
                    {...register("title", { required: "Titre obligatoire" })}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    fullWidth
                    sx={{ mb: 2, backgroundColor: "#03A68960", borderTopLeftRadius: "5px", borderTopRightRadius: "5px" }}
                    variant="filled"
                />
            </div>

            <div>
                <label>Description du Service</label>
                <TextField
                    {...register("description", { required: "Description obligatoire" })}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    fullWidth
                    multiline
                    rows={4}
                    sx={{ mb: 2, backgroundColor: "#03A68960", borderTopLeftRadius: "5px", borderTopRightRadius: "5px" }}
                    variant="filled"
                />
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* STEP 2 */
/* -------------------------------------------------------------------------- */

function Step2({
    selectedSlots,
    setSelectedSlots,
    setNotification,
}: {
    selectedSlots: { id: number; day: number; start: Dayjs | null; end: Dayjs | null }[];
    setSelectedSlots: React.Dispatch<React.SetStateAction<{ id: number; day: number; start: Dayjs | null; end: Dayjs | null }[]>>;
    setNotification: React.Dispatch<React.SetStateAction<{ open: boolean; message: string; severity: 'success' | 'warning' | 'error' | 'info' }>>;
}) {
    type AvailableDay = { id: number; label: string; selected: boolean };

    const { control, formState: { errors }, getValues, setError, clearErrors } = useFormContext<FormValues>();

    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([
        { id: 1, label: "lundi", selected: false },
        { id: 2, label: "mardi", selected: false },
        { id: 3, label: "mercredi", selected: false },
        { id: 4, label: "jeudi", selected: false },
        { id: 5, label: "vendredi", selected: false },
        { id: 6, label: "samedi", selected: false },
        { id: 7, label: "dimanche", selected: false },
    ]);

    const [availableHours, setAvailableHours] = useState<(Dayjs | null)[]>([null, null]);

    const addSlot = () => {
        const selectedDaysValue = getValues("availableDays") as number[] | undefined;
        const start = availableHours[0];
        const end = availableHours[1];

        if (!selectedDaysValue || selectedDaysValue.length === 0) {
            setError("availableDays", { type: "required", message: "Veuillez sélectionner au moins un jour pour ajouter un créneau" });
            return;
        }

        if (!start || !end) {
            setError("availableHours", { type: "required", message: "Veuillez sélectionner heure de début et heure de fin" });
            return;
        }

        if (!(start && end && start.isBefore(end))) {
            setError("availableHours", { type: "invalid", message: "L'heure de début doit être avant l'heure de fin" });
            return;
        }

        const nonDuplicateDays: number[] = selectedDaysValue.filter((d) => {
            return !selectedSlots.some(
                (s) =>
                    s.day === d &&
                    start &&
                    end &&
                    s.start?.isSame(start, "minute") &&
                    s.end?.isSame(end, "minute")
            );
        });

        if (nonDuplicateDays.length === 0) {
            setError("availableDays", { type: "duplicate", message: "Ces créneaux existent déjà" });
            return;
        }

        // Check for overlaps and insufficient gaps (non-blocking warnings)
        let hasOverlap = false;
        let hasInsufficientGap = false;
        
        for (const day of nonDuplicateDays) {
            const existingSlotsForDay = selectedSlots.filter(s => s.day === day);
            for (const existingSlot of existingSlotsForDay) {
                if (existingSlot.start && existingSlot.end && start && end) {
                    const newStartMinutes = start.hour() * 60 + start.minute();
                    const newEndMinutes = end.hour() * 60 + end.minute();
                    const existingStartMinutes = existingSlot.start.hour() * 60 + existingSlot.start.minute();
                    const existingEndMinutes = existingSlot.end.hour() * 60 + existingSlot.end.minute();
                    
                    // Check for overlap: new slot starts before existing ends AND new slot ends after existing starts
                    const hasOverlapWithThis = (
                        (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes)
                    );
                    
                    if (hasOverlapWithThis) {
                        hasOverlap = true;
                        break;
                    }
                    
                    // Check for insufficient gap (only if no overlap)
                    // Gap between end of existing and start of new
                    const gapAfterExisting = newStartMinutes - existingEndMinutes;
                    // Gap between end of new and start of existing
                    const gapBeforeExisting = existingStartMinutes - newEndMinutes;
                    
                    // If either gap exists and is less than 30 minutes (but not overlapping)
                    if ((gapAfterExisting > 0 && gapAfterExisting < 30) || 
                        (gapBeforeExisting > 0 && gapBeforeExisting < 30)) {
                        hasInsufficientGap = true;
                    }
                }
            }
            if (hasOverlap) break;
        }

        const base = Date.now();
        const newSlots = nonDuplicateDays.map((d, i) => ({
            id: base + i,
            day: d,
            start,
            end,
        }));

        setSelectedSlots((prev) => [...prev, ...newSlots]);
        clearErrors(["availableDays", "availableHours"]);
        
        // Show appropriate warning
        if (hasOverlap) {
            setNotification({
                open: true,
                message: "Ce créneau chevauche un créneau existant. Vérifiez que vos horaires sont corrects.",
                severity: "warning",
            });
        } else if (hasInsufficientGap) {
            setNotification({
                open: true,
                message: "Le Créneau est considéré comme du temps d'activité. Pensez donc à prévoir un temps de battement entre chaque RDV, pour rejoindre votre prochain demandeur par exemple...",
                severity: "warning",
            });
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className="T2">Jours de disponibilités</label>

                <Controller
                    name="availableDays"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {availableDays.map((day) => {
                                const isSelected = Array.isArray(field.value) && field.value.includes(day.id);

                                return (
                                    <div
                                        key={day.id}
                                        className={`availibilityItem ${isSelected ? "selected" : ""} T4`}
                                        onClick={() => {
                                            const current = Array.isArray(field.value) ? field.value : [];
                                            const next = isSelected
                                                ? current.filter((id) => id !== day.id)
                                                : [...current, day.id];

                                            field.onChange(next);
                                            setAvailableDays((prev) =>
                                                prev.map((d) => (d.id === day.id ? { ...d, selected: !d.selected } : d))
                                            );
                                        }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {day.label}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                />
                <p className="error">{errors.availableDays?.message as string}</p>
            </div>

            <div>
                <label className="T2">Créneaux horaires</label>

                <div className="scopeComponent">
                    <div className="hourPickerItemGroup">
                        <div className="hourPickerItem">
                            <label className="T4">Heure de début</label>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <TimePicker
                                    value={availableHours[0]}
                                    onChange={(newVal) => setAvailableHours([newVal, availableHours[1]])}
                                />
                            </LocalizationProvider>
                        </div>

                        <div className="hourPickerItem">
                            <label className="T4">Heure de fin</label>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <TimePicker
                                    value={availableHours[1]}
                                    onChange={(newVal) => setAvailableHours([availableHours[0], newVal])}
                                />
                            </LocalizationProvider>
                        </div>
                    </div>

                    <p className="error">{errors.availableHours?.message as string}</p>

                    <Button
                        sx={{ mt: 1, borderRadius: "15px", color: "black" }}
                        variant="contained"
                        startIcon={<AddCircleOutline />}
                        onClick={addSlot}
                    >
                        Ajouter le créneau
                    </Button>

                    <div className="selectedScopes">
                        {selectedSlots.length === 0 && (
                            <div className="T6" style={{ color: "#8c8c8c" }}>
                                Aucun créneau ajouté
                            </div>
                        )}

                        {selectedSlots.map((s) => (
                            <div key={s.id} className="selectedScopeItem">
                                <span className="T5">{dayIdToLabel(s.day)}</span>
                                <span className="T6">
                                    {formatTime(s.start)} - {formatTime(s.end)}
                                </span>
                                <CancelOutlined
                                    onClick={() => setSelectedSlots((prev) => prev.filter((x) => x.id !== s.id))}
                                    style={{ cursor: "pointer", color: "#8C8C8C" }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* STEP 3 */
/* -------------------------------------------------------------------------- */

function Step3() {
    const { register, formState: { errors }, watch, setValue } = useFormContext<FormValues>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const photoValue = watch("photo");

    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (typeof photoValue === "string" && photoValue) {
            setPreview(photoValue);
            return;
        }
        setPreview(null);
    }, [photoValue]);

    const handleFile = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setValue("photo", base64, { shouldDirty: true });
            setPreview(base64);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
                <label className="T2">Tarif horaire</label>
                <TextField
                    type="number"
                    {...register("price", {
                        required: "Tarif horaire obligatoire",
                        valueAsNumber: true,
                        validate: (v) => (v != null && v > 0) || "Le tarif doit être supérieur à 0",
                    })}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                        },
                    }}
                    fullWidth
                    variant="filled"
                    sx={{ backgroundColor: "#03A68960" }}
                    error={!!errors.price}
                    helperText={errors.price?.message}
                />
            </div>

            <div>
                <label className="T2">Périmètre - Km autour de moi</label>
                <label className="T5" style={{ color: "#545454" }}>
                    0 - 100 km
                </label>

                <Controller
                    name="scope"
                    defaultValue={10}
                    rules={{
                        required: "Veuillez indiquer un périmètre",
                        validate: (v) => (v > 0 && v <= 100) || "Le périmètre doit être entre 1 et 100 km",
                    }}
                    render={({ field }) => (
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <Slider
                                value={field.value}
                                onChange={(_, val) => field.onChange(val as number)}
                                min={0}
                                max={100}
                                step={1}
                                sx={{ color: "#03A689" }}
                            />
                            <strong>{field.value ?? 0} km</strong>
                        </div>
                    )}
                />
                <p className="error">{errors.scope?.message as string}</p>
            </div>

            <div>
                <label className="T2">Photo</label>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />

                <Button
                    variant="contained"
                    sx={{
                        borderRadius: "15px",
                        border: "1px solid #545454",
                        backgroundColor: "#03A68912",
                        color: "black",
                    }}
                    fullWidth
                    startIcon={<CameraAltOutlined sx={{ color: "#1ea792" }} />}
                    onClick={() => fileInputRef.current?.click()}
                >
                    Ajouter une photo
                </Button>

                {preview && (
                    <Image
                        src={preview}
                        alt="preview"
                        width={72}
                        height={72}
                        style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #e6e6e6" }}
                    />
                )}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* COMPONENT MAIN */
/* -------------------------------------------------------------------------- */

export default function EditAnnouncementContent() {
    const { setHeaderTitle, selectedAnnouncementId, currentUserId, setCurrentPage, setAnnouncementUpdated } = useContent();
    const [announcement, setAnnouncement] = useState<any | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!selectedAnnouncementId) {
                setAnnouncement(null);
                return;
            }
            try {
                const res = await fetchWithAuth(`/api/announcements/${selectedAnnouncementId}`);
                const json = await res.json();
                if (res.ok && json?.ok && json?.announcement) {
                    if (!cancelled) setAnnouncement(json.announcement);
                } else {
                    if (!cancelled) setAnnouncement(null);
                }
            } catch {
                if (!cancelled) setAnnouncement(null);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [selectedAnnouncementId]);

    const [step, setStep] = useState(1);
    const [selectedSlots, setSelectedSlots] = useState<
        { id: number; day: number; start: Dayjs | null; end: Dayjs | null }[]
    >([]);

    const methods = useForm<FormValues>({
        defaultValues: {
            title: "",
            category: "",
            description: "",
            price: 0,
            scope: 0,
            photo: null,
        },
    });

    /* STEP INDICATOR */
    useEffect(() => {
        setHeaderTitle && setHeaderTitle(`Modifier l'annonce (${step}/3)`);
        return () => setHeaderTitle && setHeaderTitle(null);
    }, [step, setHeaderTitle]);

    /* When announcement loads, populate form + slots */
    useEffect(() => {
        if (!announcement) return;
        methods.reset({
            title: announcement?.title ?? "",
            category: announcement?.category ?? "",
            description: announcement?.description ?? "",
            price: announcement?.price ?? 0,
            scope: announcement?.scope ?? 0,
            photo: announcement?.photo ?? null,
        });
        if (announcement?.slots?.length) {
            const mapped = announcement.slots.map((s: any, idx: number) => ({
                id: Date.now() + idx,
                day: s.day,
                start: s.start ? dayjs(s.start) : null,
                end: s.end ? dayjs(s.end) : null,
            }));
            setSelectedSlots(mapped);
        } else {
            setSelectedSlots([]);
        }
    }, [announcement, methods]);

    useEffect(() => {
        const serialized = selectedSlots.map((s) => ({
            day: s.day,
            start: s.start ? s.start.toISOString() : null,
            end: s.end ? s.end.toISOString() : null,
        }));
        methods.setValue("slots", serialized);
    }, [selectedSlots, methods]);

    /* REQUIRED FIELDS PER STEP */
    const stepFields: Array<Array<keyof FormValues>> = [
        ["title", "category", "description"],
        [],
        ["scope", "price"],
    ];

    const [notification, setNotification] = useState({
        open: false,
        message: "",
        severity: "info" as "success" | "warning" | "error" | "info",
    });

    /* NEXT STEP */
    const onNext = async () => {
        const fieldsToValidate = stepFields[step - 1];
        let valid = true;

        if (fieldsToValidate.length > 0) {
            valid = await methods.trigger(fieldsToValidate);
        }

        if (step === 2) {
            const hadInitial = announcement?.slots?.length > 0;
            if (hadInitial && selectedSlots.length === 0) {
                methods.setError("availableDays" as any, {
                    type: "required",
                    message: "Vous devez conserver au moins un créneau ou en ajouter",
                });
                return;
            }
        }

        if (valid) setStep((prev) => prev + 1);
    };

    const onPrev = () => setStep((prev) => Math.max(prev - 1, 1));

    /* SUBMIT */
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (data: FormValues) => {
        if (!announcement || currentUserId == null || Number(currentUserId) !== Number(announcement.userId)) {
            setNotification({ open: true, message: "Action non autorisée", severity: "error" });
            return;
        }

        try {
            setSubmitting(true);
            const payload = { ...data, id: announcement.id, userId: currentUserId ?? getLocalUserId() };

            const res = await fetchWithAuth(`/api/announcements/${announcement.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (json?.ok) {
                setNotification({ open: true, message: "Annonce mise à jour", severity: "success" });
                // Trigger flag to reload announcement data on detail page
                if (setAnnouncementUpdated) {
                    setAnnouncementUpdated(true);
                }
                setCurrentPage && setCurrentPage('announce_details');
            } else {
                setNotification({ open: true, message: json?.error ?? "Erreur inconnue", severity: "error" });
            }
        } catch (e) {
            setNotification({ open: true, message: "Erreur réseau", severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    const closeNotif = () => setNotification((prev) => ({ ...prev, open: false }));

    if (!announcement) {
        return <div style={{ padding: 16 }}><h3>Annonce introuvable</h3></div>;
    }

    return (
        <div style={{ height: "100%" }}>
            <div className="progressStepBar">
                <div className={`progressStep ${step >= 1 ? "active" : ""}`}></div>
                <div className={`progressStep ${step >= 2 ? "active" : ""}`}></div>
                <div className={`progressStep ${step >= 3 ? "active" : ""}`}></div>
            </div>

            <FormProvider {...methods}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (step === 3) {
                            methods.handleSubmit(onSubmit)(e);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && step !== 3) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }}
                    className="formSection"
                >
                    {step === 1 && <Step1 />}
                    {step === 2 && <Step2 selectedSlots={selectedSlots} setSelectedSlots={setSelectedSlots} setNotification={setNotification} />}
                    {step === 3 && <Step3 />}

                    <Notification open={notification.open} onClose={closeNotif} severity={notification.severity} message={notification.message} />

                    <div className="spaceLiner"></div>

                    <div className="buttonGroup">
                        <Button
                            fullWidth
                            variant="outlined"
                            type="button"
                            disabled={step === 1}
                            sx={{ flex: 1, borderRadius: "15px", paddingY: "10px" }}
                            onClick={onPrev}
                        >
                            Précédent
                        </Button>

                        {step < 3 ? (
                            <Button
                                fullWidth
                                variant="contained"
                                type="button"
                                sx={{ flex: 1, borderRadius: "15px", paddingY: "10px", color: "white" }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onNext();
                                }}
                            >
                                Suivant
                            </Button>
                        ) : (
                            <Button
                                fullWidth
                                variant="contained"
                                type="submit"
                                disabled={submitting}
                                sx={{ flex: 1, borderRadius: "15px", paddingY: "10px", color: "white" }}
                            >
                                {submitting ? "Soumission..." : "Mettre à jour"}
                            </Button>
                        )}
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* UTILS FUNCTIONS */
/* -------------------------------------------------------------------------- */

function formatTime(d: Dayjs | null) {
    if (!d) return "--:--";
    return d.format("HH:mm");
}

function dayIdToLabel(id: number) {
    const map: Record<number, string> = {
        1: "Lundi",
        2: "Mardi",
        3: "Mercredi",
        4: "Jeudi",
        5: "Vendredi",
        6: "Samedi",
        7: "Dimanche",
    };
    return map[id] ?? String(id);
}