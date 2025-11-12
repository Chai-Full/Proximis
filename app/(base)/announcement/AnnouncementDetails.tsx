"use client";
import React, { useEffect } from 'react';
import { useContent } from '../ContentContext';
import announcements from '../../../data/announcements.json';
import usersData from '../../../data/users.json';
import { ChatBubbleOutlineOutlined, CheckBoxOutlined, FmdGoodOutlined, ModeOutlined, StarOutlined } from '@mui/icons-material';
import Radio from '@mui/material/Radio';
import { getDayLabelById } from '@/lib/daylabel';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Button } from '@mui/material';
import Notification from '../components/Notification';
import Star from '@mui/icons-material/Star';

export default function AnnounceDetails() {
  const { selectedAnnouncementId, setHeaderTitle, setSelectedProfileId, setCurrentPage, setReservationDraft } = useContent();

  useEffect(() => {
    console.log('AnnounceDetails selectedAnnouncementId:', selectedAnnouncementId);
  }, [selectedAnnouncementId]);

  const announcement = (announcements as any[]).find(a => String(a.id) === String(selectedAnnouncementId));
  const users = (usersData as any).users ?? [];
  const author = announcement ? users.find((u: any) => String(u.id) === String(announcement.userId)) : null;

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
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success'|'warning'|'error'|'info' }>({ open: false, message: '', severity: 'info' });

  function formatTime(iso?: string | null) {
    if (!iso) return '--:--';
    try {
      return dayjs(iso).format('HH:mm');
    } catch (e) {
      return String(iso);
    }
  }

  return (
    <>
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
          <div
            className='TSemibold'
            style={{display: "flex", columnGap: 8, alignItems: "center", color: '#545454', cursor: 'pointer'}}
            onClick={() => {
              const authorId = author ? Number(author.id) : null;
              setSelectedProfileId && setSelectedProfileId(authorId);
              setCurrentPage && setCurrentPage('profil');
            }}
          >
            <div className='announceDEtailsNameLogo'>
              {String(((author?.prenom ?? author?.nom) || 'U').charAt(0) || 'U')}
            </div>
            <span className='T6'>
              Par {author ? `${author.prenom} ${author.nom}` : 'Utilisateur'}
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
          {/* <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar  readOnly/>
          </LocalizationProvider> */}
          <div className='announcementAvailabilityOptions'>
            {announcement.slots.length === 0 && <div><span className='T6'>Aucun créneau disponible</span></div>}
            {announcement.slots.map((day:any, index:number) => (
                <div className='announcementAvailabilityOptionsItem' key={index}>
                  <div className='announcementAvailabilityOption'>
                    <span className='T6'>{getDayLabelById(day.day)}</span>
                  </div>
                    <Radio
                      checked={String(selectedSlot) === String(index)}
                      onChange={() => setSelectedSlot(String(index))}
                      inputProps={{
                        'aria-label': `slot-${index}`,
                      }}
                    />
                  <div>
                    <span className='T6' style={{color: "#545454"}}>{formatTime(day.start)} - {formatTime(day.end)}</span>
                  </div>

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
            onClick={() => {
              if (selectedSlot === null) {
                // user must choose a slot first -> show warning notification
                setNotification({ open: true, message: 'Veuillez sélectionner un créneau avant de réserver.', severity: 'warning' });
                return;
              }
              const idx = Number(selectedSlot);
              const slot = announcement.slots && announcement.slots[idx] ? announcement.slots[idx] : null;
              console.log('Réserver le créneau sélectionné :', slot);
              // store reservation draft in context and navigate to reservation page
              setReservationDraft && setReservationDraft({ announcementId: announcement.id, slotIndex: idx });
              setCurrentPage && setCurrentPage('reservation');
            }}
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
    <Notification open={notification.open} onClose={() => setNotification(prev => ({ ...prev, open: false }))} severity={notification.severity} message={notification.message} />
    </>
  );
}
