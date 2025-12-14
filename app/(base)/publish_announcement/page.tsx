"use client";

import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';// ou le chemin exact vers votre fichier de types
import { Controller } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { AnnounceCategories } from '@/app/types/AnnouceService';
import TextField from '@mui/material/TextField';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AddCircleOutline, CameraAltOutlined, CancelOutlined } from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import Slider from '@mui/material/Slider';
import Notification from '../components/Notification';
import { useContent } from '../ContentContext';
import { getLocalUserId, fetchWithAuth } from '../lib/auth';
import Image from 'next/image';
type FormValues = {
    title: string;
    category: string;
    description: string;
    availableDays?: number[];
    availableHours?: (Dayjs | null)[];
    price?: number;
    scope?: number;
    // slots will be populated from selectedSlots (serialized)
    slots?: { day: number; start: string | null; end: string | null }[];
    photo?: File | null;
};

function Step1() {
    const { register, formState: { errors } } = useFormContext<FormValues>();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
            <div>
                <label htmlFor="category">Catégorie d’annonce</label>
                {(() => {
                    const { control } = useFormContext<FormValues>();
                    return (
                        <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                            <Controller
                                name="category"
                                control={control}
                                defaultValue=""
                                rules={{ required: 'La catégorie est requise' }}
                                render={({ field }) => (
                                    <Select
                                        {...field}
                                        displayEmpty
                                        renderValue={(selected) =>
                                            selected ? selected : <span style={{ color: '#9e9e9e' }}>-- Choisir une catégorie --</span>
                                        }
                                        sx={{
                                            backgroundColor: "#D9D9D961",
                                            borderColor: "#000000",
                                            borderRadius: "10px"
                                        }}
                                        inputProps={{ 'aria-label': 'Catégorie' }}
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
                    );
                })()}
                <p className="error">{errors.category?.message as string}</p>
            </div>
            <div>
                <label>Quel service proposez-vous ?</label>
                <TextField
                    {...register("title", { required: "Titre obligatoire" })}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    fullWidth
                    sx={{ mb: 2, backgroundColor: "#03A68960", borderTopLeftRadius: "5px", borderTopRightRadius: "5px" }}
                    variant="filled"
                />
                {/* <p className="error">{errors.title?.message as string}</p> */}
            </div>
            <div>
                <label>Description du service ?</label>
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
                {/* <p className="error">{errors.description?.message as string}</p> */}
            </div>
        </div>
    );
}

function Step2({
    selectedSlots,
    setSelectedSlots,
}: {
    selectedSlots: { id: number; day: number; start: Dayjs | null; end: Dayjs | null }[];
    setSelectedSlots: React.Dispatch<React.SetStateAction<{ id: number; day: number; start: Dayjs | null; end: Dayjs | null }[]>>;
}) {
    const { register, formState: { errors }, getValues, setError, clearErrors } = useFormContext<FormValues>();
    type AvailableDay = { id: number; label: string; selected: boolean };
    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([
        { id: 1, label: 'lundi', selected: false },
        { id: 2, label: 'mardi', selected: false },
        { id: 3, label: 'mercredi', selected: false },
        { id: 4, label: 'jeudi', selected: false },
        { id: 5, label: 'vendredi', selected: false },
        { id: 6, label: 'samedi', selected: false },
        { id: 7, label: 'dimanche', selected: false },]);
    // local state for start/end hours (so setAvailableHours is defined)
    const [availableHours, setAvailableHours] = useState<(Dayjs | null)[]>([null, null]);
    
    const addSlot = () => {
        const selectedDaysValue = getValues('availableDays') as number[] | undefined;
        const start = availableHours[0];
        const end = availableHours[1];

        // validation for adding a slot
        if (!selectedDaysValue || selectedDaysValue.length === 0) {
            setError('availableDays', { type: 'required', message: 'Veuillez sélectionner au moins un jour pour ajouter un créneau' });
            return;
        }
        if (!start || !end) {
            setError('availableHours', { type: 'required', message: 'Veuillez sélectionner heure de début et heure de fin' });
            return;
        }

        // validate start < end
        if (!(start && end && start.isBefore(end))) {
            setError('availableHours', { type: 'invalid', message: 'L\'heure de début doit être avant l\'heure de fin' });
            return;
        }

        // filter out duplicates (same day + identical start+end)
        const nonDuplicateDays: number[] = selectedDaysValue.filter(d => {
            return !selectedSlots.some(s => s.day === d && start && end && s.start?.isSame(start, 'minute') && s.end?.isSame(end, 'minute'));
        });

        if (nonDuplicateDays.length === 0) {
            setError('availableDays', { type: 'duplicate', message: 'Ces créneaux existent déjà' });
            return;
        }

        // add mapping entries: one per selected day so each can be removed independently
        const base = Date.now();
        const newSlots = nonDuplicateDays.map((d, i) => ({ id: base + i, day: d, start, end }));
        setSelectedSlots(prev => [...prev, ...newSlots]);

        // clear any add-related errors
        clearErrors(['availableDays', 'availableHours']);
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className='T2' htmlFor='availableDays'>Jours de disponibilités</label>

                {/* Controller will use the form context's control when no control prop is passed */}
                <Controller
                    name="availableDays"
                    defaultValue={[]}
                    rules={{ required: 'Veuillez sélectionner au moins un jour' }}
                    render={({ field }) => (
                        <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {availableDays.map((day) => {
                                    const isSelected = Array.isArray(field.value) && field.value.includes(day.id);
                                    return (
                                        <div
                                            key={day.id}
                                            className={`availibilityItem ${isSelected ? 'selected' : ''} T4`}
                                            onClick={() => {
                                                const current: number[] = Array.isArray(field.value) ? field.value : [];
                                                const next = isSelected
                                                    ? current.filter((id) => id !== day.id)
                                                    : [...current, day.id];
                                                // update react-hook-form value (array of ids)
                                                field.onChange(next);
                                                // keep local UI state in sync for any other usage
                                                setAvailableDays(prev =>
                                                    prev.map(d => (d.id === day.id ? { ...d, selected: !d.selected } : d))
                                                );
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    const current: number[] = Array.isArray(field.value) ? field.value : [];
                                                    const next = isSelected
                                                        ? current.filter((id) => id !== day.id)
                                                        : [...current, day.id];
                                                    field.onChange(next);
                                                    setAvailableDays(prev =>
                                                        prev.map(d => (d.id === day.id ? { ...d, selected: !d.selected } : d))
                                                    );
                                                }
                                            }}
                                        >
                                            {day.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                />

                <p className="error">{errors.availableDays?.message as string}</p>
            </div>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className='T2'>Créneaux horaires</label>
                <div className='scopeComponent'>
                    <div className='hourPickerItemGroup'>
                        <div className='hourPickerItem'>
                            <label htmlFor="" className='T4'>heure de début</label>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <TimePicker
                                    value={availableHours[0]}
                                    onChange={(newValue: Dayjs | null) => {
                                        console.log("hour value : ", newValue);
                                        setAvailableHours([newValue, availableHours[1]]);
                                        console.log("hours content : ", availableHours);
                                    }}
                                    // apply rounded corners to the internal TextField
                                    slotProps={{
                                        textField: {
                                            sx: {
                                                // target common input roots used by MUI
                                                '& .MuiInputBase-root': {
                                                    borderRadius: '15px',
                                                },
                                                width: '100%'
                                            }
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </div>
                        <div className='hourPickerItem'>
                            <label htmlFor="" className='T4'>heure de fin</label>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <TimePicker
                                    value={availableHours[1]}
                                    onChange={(newValue: Dayjs | null) => {
                                        console.log("hour value : ", newValue);
                                        setAvailableHours([availableHours[0], newValue]);
                                        console.log("hours content : ", availableHours);
                                    }}
                                    slotProps={{
                                        textField: {
                                            sx: {
                                                '& .MuiInputBase-root': {
                                                    borderRadius: '15px',
                                                },
                                                width: '100%'
                                            }
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </div>
                    </div>
                    <p className="error">{errors.availableHours?.message as string}</p>
                    <Button
                        variant="contained"
                        sx={{ marginTop: '8px', borderRadius: "15px", borderColor: 'black', color: 'black', textTransform: 'capitalize' }}
                        onClick={addSlot}
                        startIcon={<AddCircleOutline />}
                    ><span className='T4'>Ajouter le créneau</span></Button>

                    <div className='selectedScopes'>
                        {selectedSlots.length === 0 && <div className='T6' style={{ color: '#8c8c8c' }}>Aucun créneau ajouté</div>}
                        {selectedSlots.map(slot => (
                            <div key={slot.id} className='selectedScopeItem'>
                                <span className='T5'>{dayIdToLabel(slot.day)}</span>
                                <span className='T6'>{formatTime(slot.start)} - {formatTime(slot.end)}</span>
                                <CancelOutlined 
                                onClick={() => {
                                setSelectedSlots(prev => prev.filter(s => s.id !== slot.id));
                            }} style={{ cursor: 'pointer', color: '#8C8C8C'}} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Step3() {
    const { register, formState: { errors }, watch } = useFormContext<FormValues>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const photoValue = watch('photo');

    useEffect(() => {
        if (photoValue instanceof File) {
            const url = URL.createObjectURL(photoValue as File);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(null);
    }, [photoValue]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <label className='T2'>Tarif horaire</label>
                <TextField
                    {...register("price", { required: "Tarif horaire obligatoire", valueAsNumber: true, validate: v => (Number(v) > 0) || 'Le tarif doit être supérieur à 0' })}
                    type="number"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>
                    }}
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    fullWidth
                    sx={{ mb: 2, backgroundColor: "#03A68960", borderTopLeftRadius: "5px", borderTopRightRadius: "5px" }}
                    variant="filled"
                />
                <p className="error">{errors.title?.message as string}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center"}}>
                    <label className='T2'>Périmètre - Km autour de moi</label>
                    <label className='T5' style={{color: "#545454"}}>0 - 100 Km</label>
                </div>
                <Controller
                    name="scope"
                    defaultValue={1}
                    rules={{
                        required: 'Veuillez indiquer un périmètre',
                        validate: (v) => (v > 0 && v <= 100) || 'Le périmètre doit être entre 1 et 100 km',
                    }}
                    render={({ field }) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <Slider
                                        value={typeof field.value === 'number' ? field.value : 0}
                                        onChange={(_, value) => field.onChange(Array.isArray(value) ? value[0] : (value as number))}
                                        min={0}
                                        max={100}
                                        step={1}
                                        valueLabelDisplay="auto"
                                        aria-label="Périmètre en kilomètres"
                                        sx={{ color: '#03A689' }}
                                    />
                                </div>
                                <div style={{ minWidth: 60, textAlign: 'right' }}>
                                    <span style={{ fontWeight: 600 }}>{field.value ?? 0}</span>
                                    <span style={{ marginLeft: 4 }}>km</span>
                                </div>
                            </div>
                            <p className="error">{errors.scope?.message as string}</p>
                        </div>
                    )}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label htmlFor="photo" className="T2">Photo</label>
                <Controller
                    name="photo"
                    rules={{ required: 'La photo est requise' }}
                    render={({ field }) => (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <input
                                ref={(e) => { fileInputRef.current = e; field.ref && typeof field.ref === 'function' && field.ref(e); }}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                    field.onChange(file);
                                }}
                            />
                            <Button
                                variant="contained"
                                sx={{ marginTop: '8px', borderRadius: "15px", border: '1px solid #545454', color: 'black', backgroundColor: "#03A68912"}}
                                onClick={() => fileInputRef.current?.click()}
                                fullWidth
                                startIcon={<CameraAltOutlined  sx={{color: '#1ea792'}}/>}
                            >
                                <span className='T4'>Ajouter une photo</span>
                            </Button>
                        </div>
                    )}
                />
                {preview && (
                                <Image src={preview} alt="preview" width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e6e6e6' }} />
                            )}
                <p className="error">{errors.photo?.message as string}</p>
            </div>
        </div>
    );
}

export default function PublishAnnouncementContent() {
    const [step, setStep] = useState<number>(1);
    const { setHeaderTitle, setCurrentPage, setSelectedAnnouncementId } = useContent();
    const [selectedSlots, setSelectedSlots] = useState<{ id: number; day: number; start: Dayjs | null; end: Dayjs | null }[]>([]);
    const methods = useForm<FormValues>({ defaultValues: { title: '', category: '', description: '', price: 0, scope: 0 } });

    // update header title to reflect step and clear it on unmount
    useEffect(() => {
        setHeaderTitle && setHeaderTitle(`Créer une annonce (${step}/3)`);
        return () => {
            setHeaderTitle && setHeaderTitle(null);
        };
    }, [step, setHeaderTitle]);

    // keep form field `slots` synchronized with selectedSlots (serialize Dayjs to ISO strings)
    useEffect(() => {
        const serialized = selectedSlots.map(s => ({ day: s.day, start: s.start ? s.start.toISOString() : null, end: s.end ? s.end.toISOString() : null }));
        methods.setValue('slots', serialized);
    }, [selectedSlots, methods]);

    // Définir les champs à valider pour chaque étape
    const stepFields: Array<Array<keyof FormValues>> = [
        ['title', 'category', 'description'],
        ['availableDays', 'availableHours'],
        ['scope', 'price'],
    ];

    const onNext = async () => {
        const currentFields = stepFields[step - 1] as (keyof FormValues)[];
        const valid = await methods.trigger(currentFields);
        // prevent moving forward from step 2 if no slot mappings have been added
        if (step === 2 && selectedSlots.length === 0) {
            methods.setError('availableDays' as any, { type: 'required', message: 'Ajoutez au moins un créneau avant de continuer' });
            return;
        }
        if (valid) setStep(prev => Math.min(prev + 1, stepFields.length));
    };

    const onPrev = () => setStep(prev => Math.max(prev - 1, 1));

    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<any>(null);
    const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success'|'warning'|'error'|'info' }>({ open: false, message: '', severity: 'info' });

    const onSubmit = async (data: FormValues) => {
        try {
            setSubmitting(true);
            // build FormData: include payload fields and file
            const payload: any = { ...data };
            // attach current logged user id from localStorage so the API can persist it
            const localUserId = getLocalUserId();
            if (localUserId !== null) payload.userId = localUserId;
            // remove photo from payload because we'll send it as file separately
            const photoFile = (payload as any).photo ?? null;
            delete (payload as any).photo;

            const fd = new FormData();
            fd.append('payload', JSON.stringify(payload));
            if (photoFile instanceof File) fd.append('photo', photoFile);

            const res = await fetchWithAuth('/api/announcements', { method: 'POST', body: fd });
            const json = await res.json();
            setSubmitResult(json);
            if (json?.ok && json?.announcement) {
                // reset form
                methods.reset();
                setSelectedSlots([]);
                setNotification({ open: true, message: 'Annonce créée avec succès', severity: 'success' });
                
                // Wait a bit for notification to show, then navigate
                await new Promise<void>((resolve) => setTimeout(resolve, 1000));
                
                // Set the announcement ID and navigate to details page
                // Replace history with just 'home' so back button goes to home
                if (setSelectedAnnouncementId && setCurrentPage) {
                    setSelectedAnnouncementId(json.announcement.id);
                    setCurrentPage('announce_details', ['home']);
                }
            } else {
                setNotification({ open: true, message: json?.error ?? 'Erreur lors de la création', severity: 'error' });
                setSubmitting(false);
            }
        } catch (e) {
            setSubmitResult({ ok: false, error: String(e) });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseNotification = () => setNotification(prev => ({ ...prev, open: false }));

    return (
        <div style={{height: "100%"}}>
            <div className='progressStepBar'>
                <div className={`progressStep ${step >= 1 ? 'active' : ''}`}></div>
                <div className={`progressStep ${step >= 2 ? 'active' : ''}`}></div>
                <div className={`progressStep ${step >= 3 ? 'active' : ''}`}></div>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className='formSection'>
                    {step === 1 && <Step1 />}
                    {step === 2 && <Step2 selectedSlots={selectedSlots} setSelectedSlots={setSelectedSlots} />}
                    {step === 3 && <Step3 />}
                    <Notification open={notification.open} onClose={handleCloseNotification} severity={notification.severity} message={notification.message} />
                    <div className='spaceLiner'></div>
                    <div className='buttonGroup'>
                        <Button fullWidth variant="outlined"
                                sx={{ flex: 1, borderRadius: "15px", borderColor: 'black', color: 'black', textTransform: 'capitalize', paddingY: "10px"}} type="button" onClick={onPrev} disabled={step === 1}>
                            Précédent
                        </Button>

                        {step < stepFields.length ? (
                            <Button 
                                fullWidth 
                                variant="contained"
                                color='primary'
                                sx={{ flex: 1, borderRadius: "15px", color: 'white', textTransform: 'capitalize', paddingY: "10px"}}
                                onClick={onNext}
                                >
                                Suivant
                            </Button>
                        ) : (
                            <Button fullWidth variant="contained" color='primary'
                                sx={{ flex: 1, borderRadius: "15px", color: 'white', textTransform: 'capitalize', paddingY: "10px"}} type="submit" disabled={submitting}
                                loading={submitting ? true : false}
                                >
                                {submitting ? "Soumission..." : "Soumettre"}
                            </Button>
                        )}
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}

// helper to format Dayjs or fallback
function formatTime(d: Dayjs | null) {
    if (!d) return "--:--";
    try {
        return d.format('HH:mm');
    } catch (e) {
        return String(d);
    }
}

function dayIdToLabel(id: number) {
    const map: Record<number, string> = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche' };
    return map[id] ?? String(id);
}