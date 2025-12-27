import React, { useState } from 'react'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { Controller, useForm } from 'react-hook-form'
import dayjs from 'dayjs'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Dayjs } from 'dayjs'
import { AddCircleOutline, BookmarkBorderOutlined, CancelOutlined } from '@mui/icons-material'
import { InputsAnnounceSearch } from '../../types/InputsAnnounceSearch'
import { useContent } from '../ContentContext'
import { fetchWithAuth } from '../lib/auth'

function FilterPageContent() {
  const { setCurrentPage, setHeaderTitle, goBack, history } = useContent();
  const [categories, setCategories] = React.useState<Array<{ id: number; title: string; image: string }>>([]);

  // Load categories from API
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchWithAuth('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

        const { control, handleSubmit, reset, formState: { errors }, getValues, setError, clearErrors, setValue } = useForm<InputsAnnounceSearch>({
    defaultValues: {
      keyword: '',
      category: '',
      distance: 0,
      price: 0,
      priceMin: undefined,
      priceMax: undefined,
            date: undefined,
            slots: [],
    }
  });
        const { appliedFilters, setAppliedFilters } = useContent();

    const onSubmit = (data: InputsAnnounceSearch) => {
        // Prepare filters: exclude distance and price if they are 0
        const filtersToApply: any = { ...data };
        if (filtersToApply.distance === 0) {
            delete filtersToApply.distance;
        }
        if (filtersToApply.price === 0) {
            delete filtersToApply.price;
        }
        // set filters in global context so the search page can use them
        setAppliedFilters && setAppliedFilters(filtersToApply);
        console.log('Applied filters:', filtersToApply);
        // clear header override if any
        setHeaderTitle && setHeaderTitle(null);
        
        // Restore the view (list or map) that was active before opening filters
        // Store the view in localStorage so AnnouncementSearchPageContent can restore it
        const savedView = typeof window !== 'undefined' ? localStorage.getItem('proximis_searchView') : null;
        if (savedView && typeof window !== 'undefined') {
            localStorage.setItem('proximis_searchView', savedView);
        }
        
        // Navigate back to search page (goBack if we have history, otherwise navigate to search)
        if (history && history.length > 0) {
            goBack();
        } else {
            setCurrentPage('search');
        }
    }

  const onReset = () => {
    reset();
  }

    // when opening the filter page, prefill from appliedFilters if present
    React.useEffect(() => {
        if (!appliedFilters) return;
        // reset form values
        // Ensure category is stored as string (ID) for consistency
        const filtersToApply = { ...appliedFilters };
        if (filtersToApply.category) {
            // If category is a number, convert to string for the form
            if (typeof filtersToApply.category === 'number') {
                filtersToApply.category = String(filtersToApply.category);
            }
        }
        reset(filtersToApply as any);
        // prefill availableDays form field and local availableDays state
        if (Array.isArray(appliedFilters.availableDays)) {
            setValue('availableDays' as any, appliedFilters.availableDays);
            setAvailableDays(prev => prev.map(d => ({ ...d, selected: (appliedFilters.availableDays as number[]).includes(d.id) })));
        }
        // prefill selectedSlots from appliedFilters.slots
        if (Array.isArray(appliedFilters.slots)) {
            const parsed = (appliedFilters.slots as any[]).map((s, i) => ({ id: Date.now() + i, day: s.day, time: s.time ? dayjs(s.time) : null }));
            setSelectedSlots(parsed);
        }
    }, [appliedFilters, reset, setValue]);

    // set header title when filter page is active and clear on unmount
    React.useEffect(() => {
        setHeaderTitle && setHeaderTitle('Filtrer');
        return () => {
            setHeaderTitle && setHeaderTitle(null);
        };
    }, [setHeaderTitle]);

    const clearFilters = () => {
        // clear global applied filters and local UI
        setAppliedFilters && setAppliedFilters(null);
        // reset form to explicit cleared defaults so UI reflects the cleared state
        reset({ keyword: '', category: '', distance: 0, price: 0, date: undefined, slots: [], availableDays: [] } as any);
        // ensure form-level availableDays and slots are cleared
        setValue('availableDays' as any, []);
        setSelectedSlots([]);
        setAvailableDays(prev => prev.map(d => ({ ...d, selected: false })));
        setAvailableTime(null);
        // clear any validation errors
        clearErrors();
    }

    // Available days local UI state
    type AvailableDay = { id: number; label: string; selected: boolean };
    const [availableDays, setAvailableDays] = useState<AvailableDay[]>([
        { id: 1, label: 'lundi', selected: false },
        { id: 2, label: 'mardi', selected: false },
        { id: 3, label: 'mercredi', selected: false },
        { id: 4, label: 'jeudi', selected: false },
        { id: 5, label: 'vendredi', selected: false },
        { id: 6, label: 'samedi', selected: false },
        { id: 7, label: 'dimanche', selected: false },
    ]);

    // local hours state (single time for a slot)
    const [availableTime, setAvailableTime] = useState<Dayjs | null>(null);

    // selected slots stored locally and mirrored into the form as serialized ISO strings
    const [selectedSlots, setSelectedSlots] = useState<{ id: number; day: number; time: Dayjs | null }[]>([]);

    // keep form value 'slots' synchronized
    React.useEffect(() => {
        const serialized = selectedSlots.map(s => ({ day: s.day, time: s.time ? s.time.toISOString() : null }));
        setValue('slots' as any, serialized);
    }, [selectedSlots, setValue]);

    const addSlot = () => {
        const selectedDaysValue = getValues('availableDays') as number[] | undefined;
    const time = availableTime;

        if (!selectedDaysValue || selectedDaysValue.length === 0) {
            setError('slots' as any, { type: 'required', message: 'Veuillez sélectionner au moins un jour pour ajouter un créneau' });
            return;
        }

        if (!time) {
            setError('slots' as any, { type: 'required', message: 'Veuillez sélectionner une heure pour le créneau' });
            return;
        }

        const nonDuplicateDays: number[] = selectedDaysValue.filter(d => {
            return !selectedSlots.some(s => s.day === d && time && s.time?.isSame(time, 'minute'));
        });

        if (nonDuplicateDays.length === 0) {
            setError('slots' as any, { type: 'duplicate', message: 'Ces créneaux existent déjà' });
            return;
        }

        const base = Date.now();
        const newSlots = nonDuplicateDays.map((d, i) => ({ id: base + i, day: d, time }));
        setSelectedSlots(prev => [...prev, ...newSlots]);
        clearErrors(['slots'] as any);
    };

    const removeSlot = (id: number) => {
        setSelectedSlots(prev => prev.filter(s => s.id !== id));
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} className='filterContent' sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>

            {/* Category */}
            <FormControl fullWidth variant="outlined">
                <Controller
                    name="category"
                    control={control}
                    defaultValue=""
                    render={({ field }) => {
                        const selectedCategory = categories.find(cat => String(cat.id) === String(field.value));
                        return (
                            <Select
                                {...field}
                                displayEmpty
                                renderValue={(selected) => {
                                    if (!selected) return <span style={{ color: '#9e9e9e' }}>-- Choisir une catégorie --</span>;
                                    const cat = categories.find(c => String(c.id) === String(selected));
                                    return cat ? cat.title : <span style={{ color: '#9e9e9e' }}>-- Choisir une catégorie --</span>;
                                }}
                                sx={{ backgroundColor: '#D9D9D961', borderRadius: '10px' }}
                                inputProps={{ 'aria-label': 'Catégorie' }}
                            >
                                <MenuItem value="">
                                    <em>-- Choisir une catégorie --</em>
                                </MenuItem>
                                {categories.map((item) => (
                                    <MenuItem key={item.id} value={String(item.id)}>
                                        {item.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        );
                    }}
                />
            </FormControl>

            {/* Distance slider */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                        <div className='T2'>Proximité</div>
                        <div className='T5' style={{ color: '#545454' }}>0 - 100 Km</div>
                    </Box>
                </Box>
                <Controller
                    name="distance"
                    control={control}
                    defaultValue={0}
                    rules={{ min: { value: 0, message: 'Doit être >= 0' }, max: { value: 100, message: 'Doit être <= 100' } }}
                    render={({ field }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Slider
                                value={typeof field.value === 'number' ? field.value : 0}
                                onChange={(_, value) => field.onChange(Array.isArray(value) ? value[0] : (value as number))}
                                min={0}
                                max={100}
                                step={1}
                                valueLabelDisplay="auto"
                                aria-label="Périmètre en kilomètres"
                                sx={{ color: '#03A689', flex: 1 }}
                            />
                            <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                                <strong>{field.value ?? 0}</strong>
                                <span style={{ marginLeft: 4 }}> km</span>
                            </Box>
                        </Box>
                    )}
                />
                {errors.distance && <p className="error">{errors.distance.message}</p>}
            </Box>

            {/* Price slider */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                        <div className='T2'>Prix horaire</div>
                        <div className='T5' style={{ color: '#545454' }}>0 - 100 €</div>
                    </Box>
                </Box>
                <Controller
                    name="price"
                    control={control}
                    defaultValue={0}
                    rules={{ min: { value: 0, message: 'Doit être >= 0' }, max: { value: 100, message: 'Doit être <= 100' } }}
                    render={({ field }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Slider
                                value={typeof field.value === 'number' ? field.value : 0}
                                onChange={(_, value) => field.onChange(Array.isArray(value) ? value[0] : (value as number))}
                                min={0}
                                max={100}
                                step={1}
                                valueLabelDisplay="auto"
                                aria-label="Prix maximal en euros"
                                sx={{ color: '#03A689', flex: 1 }}
                            />
                            <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                                <strong>{field.value ?? 0}</strong>
                                <span style={{ marginLeft: 4 }}>€</span>
                            </Box>
                        </Box>
                    )}
                />
                {errors.price && <p className="error">{errors.price.message}</p>}
            </Box>

            {/* Availability days & slots */}
            <Box>
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                    <label className='T2' htmlFor='availableDays'>Jours de disponibilité</label>
                    <Controller
                        name={"availableDays" as any}
                        control={control}
                        defaultValue={[]}
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
                                                    const next = isSelected ? current.filter((id) => id !== day.id) : [...current, day.id];
                                                    field.onChange(next);
                                                    setAvailableDays(prev => prev.map(d => (d.id === day.id ? { ...d, selected: !d.selected } : d)));
                                                }}
                                                role="button"
                                                tabIndex={0}
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
                </Box>

                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <label className='T2'>Heure de Disponibilité</label>
                    <div className='scopeComponent'>
                        <div className='hourPickerItemGroup' style={{ display: 'flex', gap: 8 }}>
                            <div className='hourPickerItem' style={{ flex: 1 }}>
                                <label className='T4'>Heure</label>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <TimePicker value={availableTime} onChange={(newValue: Dayjs | null) => setAvailableTime(newValue)} slotProps={{ textField: { sx: { '& .MuiInputBase-root': { borderRadius: '15px' }, width: '100%' } } }} />
                                </LocalizationProvider>
                            </div>
                        </div>
                        <p className="error">{(errors as any).slots?.message as string}</p>
                        <Button variant="contained" sx={{ marginTop: '8px', borderRadius: '15px', borderColor: 'black', color: 'black', textTransform: 'capitalize' }} onClick={addSlot} startIcon={<AddCircleOutline />}>
                            <span className='T4'>Ajouter le Filtre</span>
                        </Button>

                        <div className='selectedScopes' style={{ marginTop: 8 }}>
                            {selectedSlots.length === 0 && <div className='T6' style={{ color: '#8c8c8c' }}>Aucun filtre Date/Heure ajouté</div>}
                            {selectedSlots.map(slot => (
                                <div key={slot.id} className='selectedScopeItem' style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className='T5'>{dayIdToLabel(slot.day)}</span>
                                    <span className='T6'>{formatTime(slot.time)}</span>
                                    <CancelOutlined onClick={() => removeSlot(slot.id)} style={{ cursor: 'pointer', color: '#8C8C8C' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexDirection: 'column', justifyContent: 'space-between' }}>
                <Button type="submit" variant="contained" color="primary" sx={{ flex: 1, borderRadius: '40px', textTransform: 'none' }}>
                    Appliquer les filtres
                </Button>
                <Button variant="outlined" color="secondary" onClick={onReset} sx={{ flex: 1, borderRadius: '40px', border: "2px solid secondary", textTransform: 'none' }} startIcon={<BookmarkBorderOutlined color='secondary' />}>
                    Sauvegarder en tant que préférences
                </Button>
                    <Button variant="text" color="error" onClick={clearFilters} sx={{ flex: 1, borderRadius: '40px', textTransform: 'none' }}>
                        Effacer les filtres
                    </Button>
            </Box>
        </Box>
    );
}

export default FilterPageContent

// helpers copied from publish page
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