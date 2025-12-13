"use client";
import LocationOn from '@mui/icons-material/LocationOn';
import Star from '@mui/icons-material/Star';
import React, { useState, useEffect } from 'react'
import './index.css';
import { useContent } from '../ContentContext';
import { getDayLabels } from '@/lib/daylabel';

export type Announcement = {
    scope?: number;
    id: number | string;
    title: string;
    price?: number;
    photo?: string | null;
    slots?: { day: number; start?: string | null; end?: string | null }[];
    isAvailable?: boolean;
    category?: string;
};

interface AnnouncementCardProps {
    announcement: Announcement;
    profilPage?: boolean;
}

const AnnouncementCard = ({ announcement, profilPage=false }: AnnouncementCardProps) => {
  const { id, title, price, photo, slots, category } = announcement;
  const { setCurrentPage, setSelectedAnnouncementId } = useContent();
  const [averageRating, setAverageRating] = useState<number>(0);

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
        const res = await fetch(`/api/evaluations?${params.toString()}`);
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
                    backgroundImage: photo ? `url("${String(photo)}")` : `url('/photo1.svg')`,
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
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
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
                        <span className='T6' style={{color: "#8c8c8c"}}>à {announcement.scope}km</span>
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