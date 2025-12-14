"use client";
import React from 'react';
import { useContent } from '../ContentContext';
import AnnouncementCard from './announcementCard';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/auth';
import dayjs from 'dayjs';
import { Typography } from '@mui/material';
import { Skeleton, SkeletonAnnouncementCard, SkeletonReservationCard } from '../components/Skeleton';

export default function AnnouncementContent (){
  const { currentUserId } = useContent();
  const [reservations, setReservations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'reserved'|'authored'>('reserved');

  useEffect(() => {
    if (!currentUserId) {
      setReservations([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ userId: String(currentUserId) });
        const res = await fetchWithAuth('/api/reservations?' + params.toString());
        const json = await res.json();
        console.log('Reservations API response:', { resOk: res.ok, json, reservationsCount: json?.reservations?.length });
        if (!mounted) return;
        if (res.ok && json?.reservations) {
          console.log('Setting reservations:', json.reservations);
          setReservations(json.reservations || []);
        } else if (res.ok && Array.isArray(json)) {
          console.log('Setting reservations (array format):', json);
          setReservations(json as any[]);
        } else {
          console.log('No reservations found, setting empty array');
          setReservations([]);
        }
      } catch (e) {
        console.error('Could not load reservations', e);
        if (mounted) setReservations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentUserId]);

  if (!currentUserId) {
    return <div style={{ padding: 16 }}><Typography variant="h6">Connectez-vous pour voir vos réservations</Typography></div>;
  }

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Skeleton variant="rectangular" width="50%" height={40} style={{ borderRadius: '25px' }} />
          <Skeleton variant="rectangular" width="50%" height={40} style={{ borderRadius: '25px' }} />
        </div>
        <SkeletonReservationCard />
        <SkeletonReservationCard />
        <SkeletonReservationCard />
      </div>
    );
  }
  
  // Load announcements from API
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth('/api/annonces?page=1&limit=1000');
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.data?.annonces) {
            const transformed = data.data.annonces.map((a: any) => ({
              id: a.idAnnonce,
              title: a.nomAnnonce,
              category: a.typeAnnonce,
              scope: a.lieuAnnonce,
              price: a.prixAnnonce,
              description: a.descAnnonce,
              userId: a.userCreateur?.idUser,
              createdAt: a.datePublication,
              photo: a.photos?.[0]?.urlPhoto,
              slots: a.creneaux?.map((c: any) => ({
                start: c.dateDebut,
                end: c.dateFin,
                estReserve: c.estReserve,
              })) || [],
            }));
            if (!cancelled) setAnnouncementsList(transformed);
          }
        }
      } catch (e) {
        console.error('Error loading announcements', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserId]);

  // authored announcements by current user
  const authored = announcementsList.filter((a: any) => String(a.userId) === String(currentUserId));

  
  const noReservations = !reservations || reservations.length === 0;
  console.log('Render check:', { reservations, reservationsLength: reservations?.length, noReservations, mode, loading });

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div onClick={() => setMode('reserved')} style={{ flex: 1, padding: 12, borderRadius: 25, cursor: 'pointer', background: mode === 'reserved' ? 'var(--primary)' : 'var(--card-bg)', color: mode === 'reserved' ? '#fff' : 'inherit', textAlign: 'center' }}>
          Réservations
        </div>
        <div onClick={() => setMode('authored')} style={{ flex: 1, padding: 12, borderRadius: 25, cursor: 'pointer', background: mode === 'authored' ? 'var(--primary)' : 'var(--card-bg)', color: mode === 'authored' ? '#fff' : 'inherit', textAlign: 'center' }}>
          Mes annonces
        </div>
      </div>

      {mode === 'reserved' && (
        <>
          <Typography variant="h6">Mes réservations</Typography>
          {reservations && reservations.length > 0 ? (
            reservations.map((r: any) => {
              const ann = announcementsList.find((a: any) => String(a.id) === String(r.announcementId));
              const slot = ann && Array.isArray(ann.slots) ? ann.slots[r.slotIndex] : null;
              return (
                <div key={r.id} style={{ borderRadius: 8, padding: 8, background: 'var(--card-bg, #fff)' }}>
                  <AnnouncementCard announcement={ann ?? { id: r.announcementId, title: 'Annonce supprimée' }} profilPage={false} />
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 14 }}><strong>Date:</strong> {r.date ? dayjs(r.date).format('YYYY.MM.DD') : (r.createdAt ? dayjs(r.createdAt).format('YYYY.MM.DD') : '-') }</div>
                    <div style={{ fontSize: 14 }}><strong>Créneau:</strong> {slot ? `${dayjs(slot.start).format('HH:mm')} - ${dayjs(slot.end).format('HH:mm')}` : '—'}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: 8 }}><Typography>Vous n'avez aucune réservation.</Typography></div>
          )}
        </>
      )}

      {mode === 'authored' && (
        <>
          <Typography variant="h6">Annonces publiées par vous</Typography>
          {authored.length === 0 && <div style={{ padding: 8 }}><Typography>Vous n'avez pas publié d'annonce.</Typography></div>}
          {authored.map((ann: any) => (
              <AnnouncementCard announcement={ann} profilPage={false} />
          ))}
        </>
      )}
    </div>
  );
}


