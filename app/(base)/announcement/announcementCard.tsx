"use client";
import LocationOn from '@mui/icons-material/LocationOn';
import Star from '@mui/icons-material/Star';
import React, { useState, useEffect } from 'react'
import './index.css';
import { useContent } from '../ContentContext';
import { getDayLabels } from '@/lib/daylabel';
import { fetchWithAuth } from '../lib/auth';

export type Announcement = {
    scope?: number;
    id: number | string;
    title: string;
    price?: number;
    photo?: string | null;
    slots?: { day: number; start?: string | null; end?: string | null }[];
    isAvailable?: boolean;
    category?: string;
    userId?: number | string;
    userCreateur?: number | string | { idUser: number | string };
};

interface AnnouncementCardProps {
    announcement: Announcement;
    profilPage?: boolean;
}

const AnnouncementCard = ({ announcement, profilPage=false }: AnnouncementCardProps) => {
  const { id, title, price, photo, slots, category } = announcement;
  const { setCurrentPage, setSelectedAnnouncementId, currentUserId } = useContent();
  const [averageRating, setAverageRating] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [author, setAuthor] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load average rating from evaluations
  useEffect(() => {
    if (!id) {
      setAverageRating(0);
      return;
    }

    let cancelled = false;

    const loadRating = async () => {
      try {
        const params = new URLSearchParams({
          announcementId: String(id),
        });
        const res = await fetchWithAuth(`/api/evaluations?${params.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data?.evaluations && Array.isArray(data.evaluations)) {
          const evaluations = data.evaluations;
          
          if (evaluations.length > 0) {
            const avg = evaluations.reduce((sum: number, evaluation: any) => {
              const rating = typeof evaluation.rating === 'number' ? evaluation.rating : 0;
              return sum + rating;
            }, 0) / evaluations.length;
            if (!cancelled) {
              setAverageRating(avg);
            }
          } else {
            if (!cancelled) {
              setAverageRating(0);
            }
          }
        } else {
          if (!cancelled) {
            setAverageRating(0);
          }
        }
      } catch (error) {
        console.error('Error loading rating for announcement', id, error);
        if (!cancelled) {
          setAverageRating(0);
        }
      }
    };

    loadRating();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayRating = averageRating > 0 ? averageRating.toFixed(1) : '0';

  // Load author and current user for distance calculation
  useEffect(() => {
    if (!id || !currentUserId) {
      setAuthor(null);
      setCurrentUser(null);
      setDistanceKm(null);
      return;
    }

    let cancelled = false;

    const loadUsers = async () => {
      try {
        const usersRes = await fetchWithAuth('/api/users');
        if (usersRes.ok && !cancelled) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            const annUserId = announcement.userId || (announcement as any).userCreateur?.idUser || (announcement as any).userCreateur;
            const annUserIdNum = typeof annUserId === 'number' ? annUserId : Number(annUserId);
            const foundAuthor = usersData.users.find((u: any) => Number(u.id) === annUserIdNum) || null;
            const foundCurrent = currentUserId != null ? usersData.users.find((u: any) => Number(u.id) === Number(currentUserId)) || null : null;
            if (!cancelled) {
              setAuthor(foundAuthor);
              setCurrentUser(foundCurrent);
            }
          }
        }
      } catch (error) {
        console.error('Error loading users for distance calculation', error);
        if (!cancelled) {
          setAuthor(null);
          setCurrentUser(null);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [id, currentUserId, announcement.userId, (announcement as any).userCreateur]);

  // Compute distance between current user and announcement author (same logic as AnnouncementDetails)
  useEffect(() => {
    let cancelled = false;
    const computeDistance = async () => {
      setDistanceKm(null);
      if (!author || !currentUser) return;
      
      const getUserCoords = (u: any): {lat: number, lng: number} | null => {
        if (!u) return null;
        const lat = u.latitude ?? u.lat ?? (u.position?.lat);
        const lng = u.longitude ?? u.lng ?? (u.position?.lng);
        if (typeof lat === 'number' && typeof lng === 'number') {
          return { lat, lng };
        }
        return null;
      };

      const buildAddress = (u: any): string => {
        if (!u) return '';
        const parts = [u.adresse, u.codePostal, u.ville, u.pays].filter(Boolean);
        return parts.join(' ');
      };

      const haversineDistanceKm = (a: {lat: number, lng: number}, b: {lat: number, lng: number}) => {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371; // km
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
      };

      const geocodeAddress = async (address: string, country?: string): Promise<{lat: number, lng: number} | null> => {
        try {
          if (!address || typeof window === 'undefined') return null;
          const query = (address + (country ? ' ' + country : '')).trim();
          const cacheKey = 'proximis_geocode_' + encodeURIComponent(query.toLowerCase());
          const ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const obj = JSON.parse(cached);
              if (obj && obj.lat != null && obj.lng != null && obj.ts && (Date.now() - obj.ts) < ttlMs) {
                return { lat: Number(obj.lat), lng: Number(obj.lng) };
              }
            }
          } catch {}

          const countryParam = country && /france|^fr$/i.test(country) ? '&countrycodes=fr' : '';
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0${countryParam}&q=${encodeURIComponent(query)}`;
          const resp = await fetch(url, {
            headers: {
              'Accept-Language': 'fr',
            },
          });
          if (!resp.ok) return null;
          const arr = await resp.json();
          if (Array.isArray(arr) && arr.length > 0 && arr[0]?.lat && arr[0]?.lon) {
            const lat = parseFloat(arr[0].lat);
            const lng = parseFloat(arr[0].lon);
            try { localStorage.setItem(cacheKey, JSON.stringify({ lat, lng, ts: Date.now() })); } catch {}
            return { lat, lng };
          }
          return null;
        } catch {
          return null;
        }
      };

      const directAuthor = getUserCoords(author);
      const directCurrent = getUserCoords(currentUser);
      let a = directAuthor;
      let c = directCurrent;
      if (!a) {
        const addrA = buildAddress(author);
        a = await geocodeAddress(addrA, author?.pays);
      }
      if (!c) {
        const addrC = buildAddress(currentUser);
        c = await geocodeAddress(addrC, currentUser?.pays);
      }
      if (!cancelled) {
        if (a && c) {
          setDistanceKm(haversineDistanceKm(c, a));
        } else {
          setDistanceKm(null);
        }
      }
    };
    computeDistance();
    return () => { cancelled = true; };
  }, [author, currentUser]);

    return (
        <div
            className={'announcementCard' + (profilPage && announcement.isAvailable ? ' active' : profilPage && !announcement.isAvailable ? ' deactive' : '')}
            role="button"
            tabIndex={0}
            onClick={() => {
                setSelectedAnnouncementId && setSelectedAnnouncementId(id);
                setCurrentPage && setCurrentPage('announce_details');
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedAnnouncementId && setSelectedAnnouncementId(id); setCurrentPage && setCurrentPage('announce_details'); } }}
            style={{ cursor: 'pointer' }}
        >
        <div className='announcementCardTop'>
            <div
                className='announcementCardImage'
                aria-label={photo ? title : 'no image'}
                style={{
                    backgroundImage: photo && !String(photo).startsWith('/uploads/') ? `url("${String(photo)}")` : `url('/photo1.svg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                }}
            />
            <div className='announcementCardContent'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <span
                        className='T5'
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, maxWidth: '100%' }}
                    >
                        {title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                        <Star sx={{ color: "#FFE135" }} />
                        <span className='T5'>{displayRating}</span>
                    </div>
                </div>
                <div className='announcementAvailability'>
                    {getDayLabels(slots).length === 0 && <div><span className='T6'>Aucun créneau</span></div>}
                    {getDayLabels(slots).map((day) => (
                        <div className={(profilPage && !announcement.isAvailable ? ' deactive' : '')} key={day}>
                            <span className='T6'>{day}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: "#1ea792" }}>
                    <div>
                        <LocationOn sx={{ color: "#8c8c8c"}}/>
                        <span className='T6' style={{color: "#8c8c8c"}}>
                          {distanceKm != null ? `à ${distanceKm.toFixed(1)} km` : (announcement.scope != null ? `à ${announcement.scope} km` : '- km')}
                        </span>
                    </div>
                    <span className={'T4' + (profilPage && !announcement.isAvailable ? ' deactiveGray' : '')}>{price ? `${price} €/h` : '—'}</span>
                </div>
            </div>
        </div>
        {profilPage && <>
            <div className={'separator' + (profilPage && !announcement.isAvailable ? ' deactive' : '')}></div>
            <div className='announcementCardFooter'>
                <div className={'category' + (profilPage && !announcement.isAvailable ? ' deactive' : '')}> {category}</div>
                <span className={'T7 availability' + (profilPage && !announcement.isAvailable ? ' deactive' : '')}>{announcement.isAvailable ? 'Disponible' : 'Clôturé'}</span>
            </div>
        </>}
        
    </div>
  )
}

export default AnnouncementCard