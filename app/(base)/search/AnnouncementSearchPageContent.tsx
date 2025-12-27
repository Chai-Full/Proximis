"use client";
import React from 'react'
import './index.css';
import { FormatListBulletedOutlined, SearchOutlined, TuneOutlined } from '@mui/icons-material';
import AnnouncementSearchWithMapContent from './AnnouncementSearchWithMapContent';
import { useContent } from '../ContentContext';
import dayjs from 'dayjs';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import AnnouncementCard from '../announcement/announcementCard';
import MapOutlined from '@mui/icons-material/MapOutlined';
import { fetchWithAuth } from '../lib/auth';
import { useCachedData } from '../lib/useCachedData';
import { SkeletonAnnouncementCard } from '../components/Skeleton';


function AnnouncementSearchPageContent() {
    // Initialize view from localStorage if available, otherwise default to 'list'
    const [view, setView] = React.useState<'list' | 'map'>(() => {
        if (typeof window !== 'undefined') {
            const savedView = localStorage.getItem('proximis_searchView') as 'list' | 'map' | null;
            return savedView === 'list' || savedView === 'map' ? savedView : 'list';
        }
        return 'list';
    });
    const { setCurrentPage, appliedFilters, setAppliedFilters, currentUserId } = useContent();
    
    // Restore view from localStorage when returning from filters
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedView = localStorage.getItem('proximis_searchView') as 'list' | 'map' | null;
            if (savedView === 'list' || savedView === 'map') {
                setView(savedView);
            }
        }
    }, [appliedFilters]); // Restore view when filters are applied
    const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());
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

    // Transform announcement data to match expected format
    const transformAnnouncement = React.useCallback((a: any) => ({
        id: a.id,
        title: a.title || a.nomAnnonce,
        category: a.category || a.typeAnnonce,
        description: a.description || a.descAnnonce,
        price: a.price || a.prixAnnonce,
        scope: a.scope || a.lieuAnnonce,
        userId: a.userId || a.userCreateur?.idUser || a.userCreateur,
        createdAt: a.createdAt || a.datePublication,
        photo: a.photo || a.photos?.[0]?.urlPhoto,
        slots: (a.slots || a.creneaux || []).map((c: any) => {
            let day = 0;
            if (c.day) {
                day = c.day;
            } else if (c.dateDebut) {
                try {
                    const date = new Date(c.dateDebut);
                    const jsDay = date.getDay();
                    day = jsDay === 0 ? 7 : jsDay;
                } catch (e) {
                    console.error('Error parsing creneau dateDebut:', e, c);
                }
            }
            return {
                day,
                start: c.start || c.dateDebut,
                end: c.end || c.dateFin,
                estReserve: c.estReserve || false,
            };
        }).filter((slot: any) => slot.day >= 1 && slot.day <= 7),
        isAvailable: (a.slots || a.creneaux || []).some((c: any) => !(c.estReserve || false)) !== false,
    }), []);

    // Create a stable filter key for cache
    const filterKey = React.useMemo(() => {
        if (!appliedFilters) return 'no-filters';
        const parts: string[] = [];
        if (appliedFilters.keyword && typeof appliedFilters.keyword === 'string' && appliedFilters.keyword.trim()) {
            parts.push(`kw:${appliedFilters.keyword.trim().toLowerCase()}`);
        }
        if (appliedFilters.category && typeof appliedFilters.category === 'string') {
            parts.push(`cat:${appliedFilters.category}`);
        }
        // Only include price in cache key if it's greater than 0
        if (appliedFilters.price && typeof appliedFilters.price === 'number' && appliedFilters.price > 0) {
            parts.push(`price:${appliedFilters.price}`);
        }
        // Only include distance in cache key if it's greater than 0
        if (appliedFilters.distance && typeof appliedFilters.distance === 'number' && appliedFilters.distance > 0) {
            parts.push(`dist:${appliedFilters.distance}`);
        }
        if (appliedFilters.slots && Array.isArray(appliedFilters.slots) && appliedFilters.slots.length > 0) {
            const slotsStr = JSON.stringify(appliedFilters.slots);
            parts.push(`slots:${slotsStr}`);
        }
        return parts.length > 0 ? parts.join('|') : 'no-filters';
    }, [appliedFilters]);

    // Load announcements from API with filters using cache
    const { data: announcementsData, loading: loadingAnnouncements } = useCachedData({
        cacheKey: 'search_announcements',
        fetchFn: async () => {
            const params = new URLSearchParams({
                page: '1',
                limit: '100', // Limit to 100 results
            });
            
            // Exclude current user's announcements if logged in
            if (currentUserId) {
                params.append('excludeUserId', String(currentUserId));
            }
            
            // Add filter parameters
            if (appliedFilters) {
                if (appliedFilters.keyword && typeof appliedFilters.keyword === 'string' && appliedFilters.keyword.trim()) {
                    params.append('keyword', appliedFilters.keyword.trim());
                }
                // Send idCategorie if category is a number (id), otherwise send category (title) for backward compatibility
                if (appliedFilters.category) {
                    const categoryValue = appliedFilters.category;
                    if (typeof categoryValue === 'number' || (typeof categoryValue === 'string' && !isNaN(Number(categoryValue)))) {
                        params.append('idCategorie', String(categoryValue));
                    } else if (typeof categoryValue === 'string') {
                        params.append('category', categoryValue);
                    }
                }
                // Only add price filter if it's greater than 0
                if (appliedFilters.price && typeof appliedFilters.price === 'number' && appliedFilters.price > 0) {
                    params.append('price', String(appliedFilters.price));
                }
                // Only add distance filter if it's greater than 0
                if (appliedFilters.distance && typeof appliedFilters.distance === 'number' && appliedFilters.distance > 0) {
                    params.append('distance', String(appliedFilters.distance));
                }
                if (appliedFilters.slots && Array.isArray(appliedFilters.slots) && appliedFilters.slots.length > 0) {
                    params.append('slots', JSON.stringify(appliedFilters.slots));
                }
            }
            
            const res = await fetchWithAuth(`/api/announcements?${params.toString()}`);
            const data = await res.json();

            if (!res.ok || !data?.ok || !Array.isArray(data.announcements)) {
                return [];
            }

            // Transform announcements to match expected format
            return data.announcements.map(transformAnnouncement);
        },
        enabled: true,
        userId: currentUserId || null,
        dependencies: [filterKey], // Cache invalidated when filters change
    });

    const announcements = announcementsData || [];

    // Load user favorites
    React.useEffect(() => {
        if (!currentUserId) {
            setFavoriteIds(new Set());
            return;
        }

        let cancelled = false;

        const loadFavorites = async () => {
            try {
                const params = new URLSearchParams({
                    userId: String(currentUserId),
                });
                const res = await fetchWithAuth(`/api/favorites?${params.toString()}`);
                const data = await res.json();

                if (cancelled) return;

                if (res.ok && data.favorites && Array.isArray(data.favorites)) {
                    const ids = new Set<string>(data.favorites.map((f: any) => String(f.announcementId)));
                    if (!cancelled) {
                        setFavoriteIds(ids);
                    }
                } else {
                    if (!cancelled) {
                        setFavoriteIds(new Set<string>());
                    }
                }
            } catch (error) {
                console.error("Error loading favorites", error);
                if (!cancelled) {
                    setFavoriteIds(new Set());
                }
            }
        };

        loadFavorites();

        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    // search input state (controlled) - initialize from appliedFilters.keyword
    const [searchKeyword, setSearchKeyword] = React.useState<string>(() => (appliedFilters && typeof appliedFilters.keyword === 'string') ? appliedFilters.keyword : '');

    // keep local input in sync when appliedFilters changes externally
    React.useEffect(() => {
        if (appliedFilters && typeof appliedFilters.keyword === 'string') setSearchKeyword(appliedFilters.keyword);
        else setSearchKeyword('');
    }, [appliedFilters]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // merge keyword into appliedFilters (create if missing)
        const next = { ...(appliedFilters || {}), keyword: searchKeyword } as any;
        setAppliedFilters && setAppliedFilters(next);
        // ensure we are in list view
        setView('list');
    };

    // Announcements are already filtered and sorted by API
    // Just sort by favorites if no filters are applied
    const filteredAnnouncements = React.useMemo(() => {
        let list = Array.isArray(announcements) ? announcements : [];
        
        // Sort by favorites first only when no filters are applied
        if (!appliedFilters && favoriteIds.size > 0) {
            return list.sort((a: any, b: any) => {
                const aIsFavorite = favoriteIds.has(String(a.id));
                const bIsFavorite = favoriteIds.has(String(b.id));
                if (aIsFavorite && !bIsFavorite) return -1;
                if (!aIsFavorite && bIsFavorite) return 1;
                return 0;
            });
        }
        
        return list;
    }, [appliedFilters, favoriteIds, announcements]);




    return (
        <div>
            <div className={`searchHeader ${view === 'map' ? 'searchHeaderMapView' : ''}`}>
                <div className='searchHeaderActionButton' onClick={() => {
                    const newView = view === 'map' ? 'list' : 'map';
                    setView(newView);
                    // Save view to localStorage for persistence
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('proximis_searchView', newView);
                    }
                }} style={{cursor: 'pointer'}}>
                    {view === 'map' ? <FormatListBulletedOutlined /> : <MapOutlined />}
                </div>
                <Paper
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "30px",
                    px: 2,
                    py: 0.5,
                    width: "70%",
                    boxShadow: "0 1px 4px 0 rgba(0, 0, 0, 0.25);",
                    }}
                >
                    <InputBase
                    sx={{ ml: 1, flex: 1 }}
                    placeholder="Rechercher un service..."
                    inputProps={{ "aria-label": "recherche" }}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                    <IconButton type="submit" sx={{ p: "10px" }} aria-label="search">
                        <SearchOutlined />
                    </IconButton>
                </Paper>
                <div className='searchHeaderActionButton' onClick={() => {
                    // Store current view before navigating to filters
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('proximis_searchView', view);
                    }
                    setCurrentPage('filters');
                }} style={{cursor: 'pointer'}}>
                        <TuneOutlined sx={{transform: "rotate(90deg)"}}/>
                </div>
            </div>
            {/* filters is its own page now (navigated via ContentContext) */}

            {view === 'map' && (
                <AnnouncementSearchWithMapContent 
                    {...{ announcements: filteredAnnouncements, appliedFilters: appliedFilters || null } as any}
                />
            )}

            {view === 'list' && (
                <>
                    <div className="searchFilterSelectedContainer">
                        {(() => {
                            if (!appliedFilters) return <div className="searchFilterSelectedItem">Tous</div>;
                            const badges: React.ReactNode[] = [];
                            if (appliedFilters.category) {
                                // Find category title by ID
                                const categoryId = typeof appliedFilters.category === 'number' 
                                    ? appliedFilters.category 
                                    : (typeof appliedFilters.category === 'string' && !isNaN(Number(appliedFilters.category)) 
                                        ? Number(appliedFilters.category) 
                                        : null);
                                const category = categoryId ? categories.find(c => c.id === categoryId) : null;
                                const categoryLabel = category ? category.title : (typeof appliedFilters.category === 'string' ? appliedFilters.category : String(appliedFilters.category));
                                badges.push(<div key="cat" className="searchFilterSelectedItem">{categoryLabel}</div>);
                            }
                            // Only show distance badge if it's greater than 0
                            if (typeof appliedFilters.distance === 'number' && appliedFilters.distance > 0) {
                                badges.push(<div key="dist" className="searchFilterSelectedItem">≤ {appliedFilters.distance} Km</div>);
                            }
                            // Only show price badge if it's greater than 0
                            if (typeof appliedFilters.price === 'number' && appliedFilters.price > 0) {
                                badges.push(<div key="price" className="searchFilterSelectedItem">≤ {appliedFilters.price} €</div>);
                            }
                            if (appliedFilters.keyword) badges.push(<div key="kw" className="searchFilterSelectedItem">"{appliedFilters.keyword}"</div>);
                            if (Array.isArray(appliedFilters.slots)) {
                                const dayLabel = (id: number) => ({1:'Lun',2:'Mar',3:'Mer',4:'Jeu',5:'Ven',6:'Sam',7:'Dim'} as any)[id] ?? String(id);
                                appliedFilters.slots.forEach((s: any, idx: number) => {
                                    if (!s) return;
                                    const label = s.time ? `${dayLabel(s.day)} ${dayjs(s.time).format('HH:mm')}` : `${dayLabel(s.day)}`;
                                    badges.push(<div key={`slot-${idx}`} className="searchFilterSelectedItem">{label}</div>);
                                });
                            }
                            if (badges.length === 0) return <div className="searchFilterSelectedItem">Tous</div>;
                            return badges;
                        })()}
                    </div>

                    <div className='searchResultContent'>
                        {loadingAnnouncements ? (
                            <>
                                {/* Liste des skeletons */}
                                <div className='searchResultList'>
                                    {[...Array(6)].map((_, index) => (
                                        <SkeletonAnnouncementCard key={`skeleton-${index}`} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <span className='T4'>{filteredAnnouncements.length} Résultats trouvés</span>
                                {/* Liste des résultats */}
                                <div className='searchResultList'>
                                    {filteredAnnouncements.map((announcement: any) => (
                                        <AnnouncementCard 
                                            key={announcement.id}
                                            announcement={announcement}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
    </div>
  )
}

export default AnnouncementSearchPageContent