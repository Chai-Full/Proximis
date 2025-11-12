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
import announcements from '../../../data/announcements.json';
import AnnouncementCard from '../announcement/AnnouncementCard';
import MapOutlined from '@mui/icons-material/MapOutlined';


function AnnouncementSearchPageContent() {
    const [view, setView] = React.useState<'list' | 'map'>('list');
    const { setCurrentPage, appliedFilters, setAppliedFilters } = useContent();

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

    // apply filters to announcements
    const filteredAnnouncements = React.useMemo(() => {
        const list = Array.isArray(announcements) ? announcements : [];
        if (!appliedFilters) return list;

        const hasKeyword = typeof appliedFilters.keyword === 'string' && appliedFilters.keyword.trim() !== '';
        const hasCategory = typeof appliedFilters.category === 'string' && appliedFilters.category !== '';
        const hasPrice = typeof appliedFilters.price === 'number';
        const hasDistance = typeof appliedFilters.distance === 'number';
        const hasSlots = Array.isArray(appliedFilters.slots) && appliedFilters.slots.length > 0;

        if (!hasKeyword && !hasCategory && !hasPrice && !hasDistance && !hasSlots) return list;

        const scored: Array<any> = [];

        for (const a of list) {
            let matchKeyword = false;
            let matchCategory = false;
            let matchPrice = false;
            let matchDistance = false;
            let matchSlots = false;

            if (hasKeyword) {
            const kw = appliedFilters.keyword!.toLowerCase();
            matchKeyword =
                (a.title || '').toLowerCase().includes(kw) ||
                (a.description || '').toLowerCase().includes(kw);
            }

            if (hasCategory) {
            matchCategory = a.category === appliedFilters.category;
            }

            if (hasPrice) {
            matchPrice = typeof a.price === 'number' && a.price >= (appliedFilters.price as number);
            }

            if (hasDistance) {
            matchDistance = typeof a.scope === 'number' && a.scope >= (appliedFilters.distance as number);
            }

            if (hasSlots) {
            matchSlots = appliedFilters.slots!.some((fs: any) => {
                if (!fs || fs.time == null) return false;
                const ft = dayjs(fs.time);
                return (Array.isArray(a.slots) ? a.slots : []).some((aslot: any) => {
                if (aslot.day !== fs.day) return false;
                const start = dayjs(aslot.start);
                const end = dayjs(aslot.end);
                const ftMinutes = ft.hour() * 60 + ft.minute();
                const startMinutes = start.hour() * 60 + start.minute();
                const endMinutes = end.hour() * 60 + end.minute();
                return ftMinutes >= startMinutes && ftMinutes <= endMinutes;
                });
            });
            }

            //  Étape cruciale : priorité aux filtres numériques
            // Si l’utilisateur a mis un prix ou une distance, il faut que l’annonce respecte au moins un des deux
            if (hasPrice || hasDistance) {
            if (
                (hasPrice && hasDistance && !matchPrice && !matchDistance) ||
                (hasPrice && !hasDistance && !matchPrice) ||
                (hasDistance && !hasPrice && !matchDistance)
            ) {
                continue; //  exclure cette annonce
            }
            }

            //  à ce stade, l’annonce respecte au moins un critère pertinent
            const score = [
            hasKeyword && matchKeyword,
            hasCategory && matchCategory,
            hasPrice && matchPrice,
            hasDistance && matchDistance,
            hasSlots && matchSlots,
            ].filter(Boolean).length;

            scored.push({ item: a, _score: score });
        }

        // tri : plus de correspondances en premier, puis distance croissante, puis prix croissant
        scored.sort((x, y) => {
            if (y._score !== x._score) return y._score - x._score;
            const ax = typeof x.item.scope === 'number' ? x.item.scope : Infinity;
            const ay = typeof y.item.scope === 'number' ? y.item.scope : Infinity;
            if (ax !== ay) return ax - ay;
            const px = typeof x.item.price === 'number' ? x.item.price : Infinity;
            const py = typeof y.item.price === 'number' ? y.item.price : Infinity;
            return px - py;
        });

        return scored.map(s => s.item);
    }, [appliedFilters]);




    return (
        <div>
            <div className='searchHeader'>
                <div className='searchHeaderActionButton' onClick={() => {/*setView(view === 'map' ? 'list' : 'map')*/}} style={{cursor: 'pointer'}}>
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
                    boxShadow: "none",
                    }}
                >
                    <InputBase
                    sx={{ ml: 1, flex: 1 }}
                    placeholder="Mot clé..."
                    inputProps={{ "aria-label": "recherche" }}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                    <IconButton type="submit" sx={{ p: "10px" }} aria-label="search">
                        <SearchOutlined />
                    </IconButton>
                </Paper>
                <div className='searchHeaderActionButton' onClick={() => setCurrentPage('filters')} style={{cursor: 'pointer'}}>
                        <TuneOutlined sx={{transform: "rotate(90deg)"}}/>
                </div>
            </div>
            {/* filters is its own page now (navigated via ContentContext) */}

            {view === 'map' && (
                <div style={{ padding: 16 }}>
                    <AnnouncementSearchWithMapContent />
                </div>
            )}

            {view === 'list' && (
                <>
                    <div className="searchFilterSelectedContainer">
                        {(() => {
                            if (!appliedFilters) return <div className="searchFilterSelectedItem">Tous</div>;
                            const badges: React.ReactNode[] = [];
                            if (appliedFilters.category) badges.push(<div key="cat" className="searchFilterSelectedItem">{appliedFilters.category}</div>);
                            if (typeof appliedFilters.distance === 'number') badges.push(<div key="dist" className="searchFilterSelectedItem">{appliedFilters.distance} Km</div>);
                            if (typeof appliedFilters.price === 'number') badges.push(<div key="price" className="searchFilterSelectedItem">≥ {appliedFilters.price} €</div>);
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
                    </div>
                </>
            )}
    </div>
  )
}

export default AnnouncementSearchPageContent