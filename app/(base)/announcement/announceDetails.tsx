"use client";
import React, { useEffect } from 'react';
import { useContent } from '../ContentContext';
import announcements from '../../../data/announcements.json';
import { ChatBubbleOutlineOutlined, CheckBoxOutlined, FmdGoodOutlined, LocationOn, ModeOutlined, StarOutlined } from '@mui/icons-material';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import { getDayLabels } from '@/lib/daylabel';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Button } from '@mui/material';
import Star from '@mui/icons-material/Star';

export default function AnnounceDetails() {
  const { selectedAnnouncementId, setHeaderTitle } = useContent();

  useEffect(() => {
    console.log('AnnounceDetails selectedAnnouncementId:', selectedAnnouncementId);
  }, [selectedAnnouncementId]);

  const announcement = (announcements as any[]).find(a => String(a.id) === String(selectedAnnouncementId));

  // set header title to announcement title while on this page
  useEffect(() => {
    if (announcement && setHeaderTitle) {
      setHeaderTitle(String(announcement.title ?? 'Annonce'));
      return () => setHeaderTitle && setHeaderTitle(null);
    }
    // ensure headerTitle cleared if announcement missing
    setHeaderTitle && setHeaderTitle(null);
    return () => {};
  }, [announcement, setHeaderTitle]);

  if (!announcement) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Annonce introuvable</h2>
        <p>ID: {String(selectedAnnouncementId)}</p>
      </div>
    );
  }

  console.log("announce : ", announcement);
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  function formatTime(iso?: string | null) {
    if (!iso) return '--:--';
    try {
      return dayjs(iso).format('HH:mm');
    } catch (e) {
      return String(iso);
    }
  }

  function dayNumberToLabel(n?: number) {
    const map: Record<number, string> = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche' };
    if (!n) return '';
    return map[n] ?? String(n);
  }
  return (
    <div className='announceDEtails'>
      <div className='announceDEtailsHeader'
        style={{
          backgroundImage: announcement.photo ? `url("${String(announcement.photo)}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        }}
      >
        <div className='actionButtons'>
          <div style={{ backgroundColor: "#47474772", borderRadius: 7, display: 'flex', alignItems: 'center', height: 40, width: 40, justifyContent: 'center', cursor: 'pointer'}}>
            <StarOutlined sx={{ color: "#FFFFFF", fontSize: 32, cursor: 'pointer' }} />
          </div>
          <div style={{ backgroundColor: "#47474772", borderRadius: 7, display: 'flex', alignItems: 'center', height: 40, width: 40, justifyContent: 'center', cursor: 'pointer'}}>
            <ModeOutlined sx={{ color: "#FFFFFF", fontSize: 32, cursor: 'pointer' }} />
          </div>
        </div>
        <div className='publicationTime'>
            <span className='T6'>
              Publiée il y a 5 min...
            </span>
          </div>
      </div>
      <div className='announceDEtailsContent'>
        <span className='T6 announcementStatus' style={{ textAlign: "right"}}>
          Disponible
        </span>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <div className='TSemibold' style={{display: "flex", columnGap: 8, alignItems: "center", color: '#545454', cursor: 'pointer'}}>
            <div className='announceDEtailsNameLogo'>
              M
            </div>
            <span className='T6'>
              Par Marie D.
            </span>
          </div>
          <span className='T4 TMedium announcementPrice'>
            {announcement.price ? `${announcement.price} € / h` : 'Prix non renseigné'}
          </span>
        </div>
        <div className='announceScope'>
          <FmdGoodOutlined sx={{ color: "#8c8c8c"}}/>
          <span className='T6' style={{ color: "#8c8c8c"}}>à {announcement.scope}km</span>

        </div>
        <div className='announcementDescription'>
          <span className='T4'>
            Description
          </span>
          <div className='annoucementCategory'>
            {announcement.category}
          </div>
          <p className='T6'>
            {announcement.description}
          </p>
        </div>
        <div className='announcementAvailabilities'>
          <span className='T4'>
            Disponibilité
          </span>
          <div className='announcementAvailabilityOptions'>
            {getDayLabels(announcement.slots).length === 0 && <div><span className='T6'>Aucun créneau disponible</span></div>}
            {getDayLabels(announcement.slots).map((day) => (
                <div key={day} className='announcementAvailabilityOption'>
                    <span className='T6'>{day}</span>
                </div>
            ))}
          </div>
        </div>
        <div className='actionSection'>
          <Button 
            variant="outlined"
            fullWidth
            sx={{
              textTransform: "capitalize",
              fontWeight: 600,
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
            }}
            startIcon={
              <ChatBubbleOutlineOutlined />
            }
            >
            Contacter
          </Button>
          <Button 
            variant="contained"
            fullWidth
            sx={{
              textTransform: "capitalize",
              fontWeight: 600,
            }}
            startIcon={
              <CheckBoxOutlined />
            }
            >
            Réserver
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
              <Star sx={{ color: "#FFE135" }} />
              <span className='T4' style={{color:"#545454"}}>5 - 3 Avis</span>
          </div>
          <Button 
            variant="outlined"
            fullWidth
            sx={{
              fontWeight: 600,
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
              color: "#8C8C8C",
              borderColor: "#8C8C8C",
              textTransform: "none"
            }}
            >
            Voir tous les avis
          </Button>
        </div>
      </div>
    </div>
  );
}
