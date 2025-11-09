"use client";
import LocationOn from '@mui/icons-material/LocationOn';
import Star from '@mui/icons-material/Star';
import React from 'react'
import './index.css';
import Image from 'next/image';
import { useContent } from '../ContentContext';
import { getDayLabels } from '@/lib/daylabel';

export type Announcement = {
    id: number | string;
    title: string;
    price?: number;
    photo?: string | null;
    slots?: { day: number; start?: string | null; end?: string | null }[];
};

interface AnnouncementCardProps {
    announcement: Announcement;
}

const AnnouncementCard = ({ announcement }: AnnouncementCardProps) => {
  const { id, title, price, photo, slots } = announcement;

  

    const { setCurrentPage, setSelectedAnnouncementId } = useContent();

    return (
        <div
            className='announcementCard'
            role="button"
            tabIndex={0}
            onClick={() => {
                setSelectedAnnouncementId && setSelectedAnnouncementId(id);
                setCurrentPage && setCurrentPage('announce_details');
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedAnnouncementId && setSelectedAnnouncementId(id); setCurrentPage && setCurrentPage('announce_details'); } }}
            style={{ cursor: 'pointer' }}
        >
        <div
            className='announcementCardImage'
            aria-label={photo ? title : 'no image'}
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
                    <span className='T5'>5</span>
                </div>
            </div>
            <div className='announcementAvailability'>
                {getDayLabels(slots).length === 0 && <div><span className='T6'>Aucun créneau</span></div>}
                {getDayLabels(slots).map((day) => (
                    <div key={day}>
                        <span className='T6'>{day}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <LocationOn sx={{ color: "#8c8c8c"}}/>
                    <span className='T6' style={{color: "#8c8c8c"}}>à 3km</span>
                </div>
                <span className='T4'>{price ? `${price} €/h` : '—'}</span>
            </div>
        </div>
    </div>
  )
}

export default AnnouncementCard