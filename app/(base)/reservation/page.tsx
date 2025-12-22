"use client";
import React from 'react'
import { useContent } from '../ContentContext';
import { fetchWithAuth } from '../lib/auth';
import dayjs from 'dayjs';
import { Button, TextField } from '@mui/material';
import Notification from '../components/Notification';
import './index.css';

function Reservation() {
  const { selectedReservationId, setSelectedReservationId, setCurrentPage, setHeaderTitle, currentUserId, goBack, setSelectedConversationId, history } = useContent();
  const [reservation, setReservation] = React.useState<any>(null);
  const [announcement, setAnnouncement] = React.useState<any>(null);
  const [author, setAuthor] = React.useState<any>(null);
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle('Paiement');
    return () => setHeaderTitle && setHeaderTitle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Load reservation and related data from MongoDB
  React.useEffect(() => {
    console.log('Reservation page - selectedReservationId:', selectedReservationId);
    console.log('Reservation page - currentUserId:', currentUserId);
    
    if (!selectedReservationId || !currentUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        // Load the reservation directly by ID (more reliable than filtering all reservations)
        // Retry logic in case the reservation was just created and isn't immediately available
        let foundReservation = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!foundReservation && attempts < maxAttempts && !cancelled) {
          // Don't filter by userId when searching by id - id should be unique
          // We'll verify ownership after fetching
          console.log(`Attempt ${attempts + 1} to load reservation ${selectedReservationId}`);
          const reservationRes = await fetchWithAuth(`/api/reservations?id=${selectedReservationId}`);
          console.log('Reservation API response status:', reservationRes.status);
          if (reservationRes.ok) {
            const reservationData = await reservationRes.json();
            console.log('Reservation API data:', reservationData);
            if (reservationData?.reservations && Array.isArray(reservationData.reservations)) {
              // Should only return one reservation when filtering by id
              foundReservation = reservationData.reservations.find(
                (r: any) => String(r.id) === String(selectedReservationId)
              ) || reservationData.reservations[0];
              
              // Security check: verify that the current user owns this reservation
              if (foundReservation && currentUserId && String(foundReservation.userId) !== String(currentUserId)) {
                console.warn('User does not own this reservation');
                foundReservation = null;
              }
            }
          }
          
          if (!foundReservation && attempts < maxAttempts - 1) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 200 * (attempts + 1)));
          }
          attempts++;
        }
        
        if (!cancelled && foundReservation) {
          setReservation(foundReservation);

          // Load announcement and users in parallel for better performance
          const [announcementRes, usersRes] = await Promise.all([
            fetchWithAuth(`/api/annonces/${foundReservation.announcementId}`),
            fetchWithAuth('/api/users')
          ]);

          // Process announcement data
          if (announcementRes.ok) {
            const announcementData = await announcementRes.json();
            console.log('Announcement API response:', announcementData);
            if (announcementData?.success && announcementData?.data) {
              const a = announcementData.data;
              console.log('Announcement userCreateur:', a.userCreateur);
              const transformed = {
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
              };
              console.log('Transformed announcement userId:', transformed.userId);
              if (!cancelled) setAnnouncement(transformed);

              // Process users data and find author
              if (usersRes.ok) {
                const usersData = await usersRes.json();
                console.log('Users data count:', usersData?.users?.length);
                if (usersData?.users && Array.isArray(usersData.users)) {
                  if (!cancelled) {
                    setUsers(usersData.users);
                    const foundAuthor = usersData.users.find((u: any) => Number(u.id) === Number(transformed.userId));
                    console.log('Looking for author with userId:', transformed.userId, 'Found:', foundAuthor);
                    if (foundAuthor) {
                      setAuthor(foundAuthor);
                    } else {
                      console.warn('Author not found for userId:', transformed.userId);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading reservation data', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedReservationId, currentUserId]);

  // Redirect to home if no reservation selected
  React.useEffect(() => {
    if (!selectedReservationId && setCurrentPage) {
      console.warn('No reservation selected, redirecting to home');
      setCurrentPage('home');
    }
  }, [selectedReservationId, setCurrentPage]);

  // Compute slot, formattedDate, and totalToPay BEFORE any conditional returns
  // This ensures hooks are always called in the same order
  const slot = React.useMemo(() => {
    if (!announcement?.slots || !Array.isArray(announcement.slots) || reservation?.slotIndex === undefined) {
      return null;
    }
    return announcement.slots[reservation.slotIndex] || null;
  }, [announcement?.slots, reservation?.slotIndex]);

  const formattedDate = React.useMemo(() => {
    return reservation?.date ? dayjs(reservation.date).format('DD.MM.YY') : '--/--/----';
  }, [reservation?.date]);

  // Compute total to pay: hourly price * duration (rounded to nearest 0.5 hour)
  const totalToPay = React.useMemo(() => {
    const hourly = Number(announcement?.price ?? 0) || 0;
    if (!slot || !slot.start || !slot.end) return hourly;
    const start = dayjs(slot.start);
    const end = dayjs(slot.end);
    if (!start.isValid() || !end.isValid()) return hourly;
    const minutes = Math.max(0, end.diff(start, 'minute'));
    const hours = minutes / 60;
    const roundedHalf = Math.round(hours * 2) / 2; // nearest 0.5h
    const effectiveHours = roundedHalf > 0 ? roundedHalf : (hours > 0 ? 0.5 : 0);
    return Math.max(0, effectiveHours * hourly);
  }, [announcement?.price, slot]);

  // Now we can do conditional returns AFTER all hooks
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        padding: 16 
      }}>
        Chargement...
      </div>
    );
  }

  if (!selectedReservationId || !reservation) {
    return <div style={{ padding: 16 }}>Aucune réservation trouvée. Retournez à la recherche.</div>;
  }

  if (!announcement) {
    return <div style={{ padding: 16 }}>Annonce introuvable.</div>;
  }
  

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', rowGap: 16 }}>
        <div className='recapContainer'>
            <span className='T2 TSemibold'>Récapitulatif</span>
            <div className='recapContainerItem'>
                <span>Service</span>
                <span>{announcement ? announcement.title : 'N/A'}</span>
            </div>
            <div className='recapContainerItem'>
                <span>Prestataire</span>
                <span>{author ? author.prenom + ' ' + author.nom : 'N/A'}</span>
            </div>
            <div className='recapContainerItem'>
                <span>Date</span>
                <span>{formattedDate}</span>
            </div>
            <div className='separator'></div>
            <div style={{display: "flex", justifyContent: "space-between"}}>
                <span className='T2 TSemibold'>Total</span>
              <span className='T2 ' style={{color: "var(--primary)"}}>{Number.isFinite(totalToPay) ? totalToPay : 'N/A'} €</span>
            </div>
        </div>
        <div className='paymentInfo'>
            <span className='T2 TSemibold'>Informations de paiement</span>
            <div className='paymentInfoItem'>
                <label>Nom sur la carte</label>
                <TextField
                    id="nameOnCard"
                    fullWidth
                    variant="outlined"
                    type="text"
                    sx={{ mb: 2, backgroundColor: "#F0F0F0", borderRadius: "25px" }}
                    disabled
                    defaultValue={author ? author.prenom + ' ' + author.nom : ''    }
                />
            </div>
            <div className='paymentInfoItem'>
                <label>Numéro de carte</label>
                <TextField
                    id="cardNumber"
                    fullWidth
                    variant="outlined"
                    type="text"
                    sx={{ mb: 2, backgroundColor: "#F0F0F0", borderRadius: "25px" }}
                    disabled
                    defaultValue={'**** **** **** 1234'}
                />
            </div>
            <div style={{display: "flex", justifyContent: "space-between", columnGap: 16}}>
                <div className='paymentInfoItem'>
                    <label>Date d'expiration</label>
                    <TextField
                        id="expirationDate"
                        fullWidth
                        variant="outlined"
                        type="text"
                        sx={{ mb: 2, backgroundColor: "#F0F0F0", borderRadius: "25px" }}
                        disabled
                        defaultValue={'08/28'}
                    />
                </div>
                <div className='paymentInfoItem'>
                    <label>CVV</label>
                    <TextField
                        id="cardNumber"
                        fullWidth
                        variant="outlined"
                        type="text"
                        sx={{ mb: 2, backgroundColor: "#F0F0F0", borderRadius: "25px" }}
                        disabled
                        defaultValue={'123'}
                    />
                </div>
            </div>
        </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexDirection: 'column', justifyContent: 'center' }}>
        <PaymentButton
          reservation={reservation}
          announcement={announcement}
          setSelectedReservationId={setSelectedReservationId}
          currentUserId={currentUserId}
          author={author}
          users={users}
          formattedDate={formattedDate}
          setCurrentPage={setCurrentPage}
          setSelectedConversationId={setSelectedConversationId}
        />
        <div className='secureBadge'>
            Paiement sécurisé. Vos informations sont cryptées et protégées.
        </div>
      </div>
      {/* Notification managed inside PaymentButton via global Notification component */}
    </div>
  )
}

function PaymentButton({ reservation, announcement, setSelectedReservationId, currentUserId, author, users, formattedDate, setCurrentPage, setSelectedConversationId }: any) {
  const [loading, setLoading] = React.useState(false);
  // Use function to initialize state to avoid hydration issues
  const [open, setOpen] = React.useState(() => false);
  const [message, setMessage] = React.useState('');
  const [severity, setSeverity] = React.useState<'success'|'warning'|'error'|'info'>('info');

  // Calculate button total using useMemo to avoid hydration issues
  const buttonTotal = React.useMemo(() => {
    if (!announcement || !reservation) return 0;
    const hourly = Number(announcement?.price ?? 0) || 0;
    const s = announcement?.slots && reservation?.slotIndex !== undefined ? announcement.slots[reservation.slotIndex] : null;
    let total = hourly;
    if (s && s.start && s.end) {
      const start = dayjs(s.start);
      const end = dayjs(s.end);
      if (start.isValid() && end.isValid()) {
        const minutes = Math.max(0, end.diff(start, 'minute'));
        const hours = minutes / 60;
        const roundedHalf = Math.round(hours * 2) / 2;
        const effectiveHours = roundedHalf > 0 ? roundedHalf : (hours > 0 ? 0.5 : 0);
        total = Math.max(0, effectiveHours * hourly);
      }
    }
    return total;
  }, [announcement, reservation]);

  async function handlePay() {
    if (!reservation || !announcement) {
      setSeverity('warning');
      setMessage('Aucune réservation à enregistrer.');
      setOpen(true);
      return;
    }
    
    if (!currentUserId) {
      setSeverity('warning');
      setMessage('Vous devez être connecté pour effectuer une réservation.');
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Update reservation status from "to_pay" to "reserved"
      const updateRes = await fetchWithAuth('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservation.id, status: 'reserved' }),
      });
      
      const updateData = await updateRes.json();
      console.log('Update reservation response:', { status: updateRes.status, ok: updateRes.ok, data: updateData });
      
      if (updateRes.ok) {
        // Payment update successful
        if (announcement) {
          // Get current user name
          const currentUser = users.find((u: any) => String(u.id) === String(currentUserId));
          const currentUserName = currentUser 
            ? `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim() || currentUser.name || "Utilisateur"
            : "Utilisateur";
          
          // Create message to the announcement owner
          const authorName = author ? (author.prenom || author.nom || "Prestataire") : "Prestataire";
          const messageText = `Bonjour ${authorName}, j'ai réservé et payé votre service "${announcement.title}" pour le ${formattedDate}.`;
          
          const messageRes = await fetchWithAuth('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromUserId: currentUserId,
              toUserId: announcement.userId,
              announcementId: announcement.id,
              reservationId: reservation.id,
              initialMessage: messageText,
            }),
          });
          
          const messageData = await messageRes.json();
          console.log('Message creation response:', { status: messageRes.status, ok: messageRes.ok, data: messageData });
          
          if (messageRes.ok && messageData?.ok) {
            // Clear reservation ID
            setSelectedReservationId && setSelectedReservationId(null);
            
            // Show success message
            setSeverity('success');
            setMessage('Paiement validé ! Redirection vers vos réservations...');
            setOpen(true);
            
            // Navigate to my_announcements with reservations view, clear history
            setTimeout(() => {
              if (typeof window !== "undefined") {
                localStorage.setItem("proximis_myAnnouncements_view", "reservations");
              }
              if (setCurrentPage) {
                setCurrentPage('my_announcements');
              }
            }, 1500);
          } else {
            // Message creation failed but payment is ok
            console.error('Message creation failed:', messageData);
            setSeverity('warning');
            setMessage(`Paiement validé. ${messageData?.error ? `Erreur lors de l'envoi du message: ${messageData.error}` : 'Impossible d\'envoyer le message automatique.'}`);
            setOpen(true);
            setSelectedReservationId && setSelectedReservationId(null);
            setTimeout(() => {
              if (typeof window !== "undefined") {
                localStorage.setItem("proximis_myAnnouncements_view", "reservations");
              }
              if (setCurrentPage) {
                setCurrentPage('my_announcements');
              }
            }, 2000);
          }
        } else {
          // No announcement data, but payment succeeded
          setSeverity('success');
          setMessage('Paiement validé !');
          setOpen(true);
          setSelectedReservationId && setSelectedReservationId(null);
          setTimeout(() => {
            if (typeof window !== "undefined") {
              localStorage.setItem("proximis_myAnnouncements_view", "reservations");
            }
            if (setCurrentPage) {
              setCurrentPage('my_announcements');
            }
          }, 1500);
        }
      } else {
        // Payment update failed
        setSeverity('error');
        setMessage('Erreur lors de la mise à jour du statut de paiement.');
        setOpen(true);
      }
    } catch (err) {
      console.error(err);
      setSeverity('error');
      setMessage('Erreur serveur.');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button fullWidth variant="contained" sx={{ textTransform: 'none' }} onClick={handlePay} disabled={loading}>
        {`Payer ${Number.isFinite(buttonTotal) ? buttonTotal : 'N/A'} €`}
      </Button>
      <Notification open={open} onClose={() => setOpen(false)} severity={severity} message={message} />
    </>
  );
}

export default Reservation