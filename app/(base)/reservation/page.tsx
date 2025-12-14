import React from 'react'
import { useContent } from '../ContentContext';
import { fetchWithAuth } from '../lib/auth';
import dayjs from 'dayjs';
import { Button, TextField } from '@mui/material';
import Notification from '../components/Notification';
import './index.css';

function Reservation() {
  const { reservationDraft, setReservationDraft, setCurrentPage, setHeaderTitle, currentUserId, goBack, setSelectedConversationId, history, selectedAnnouncementId, setSelectedAnnouncementId } = useContent();
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle('Paiement');
    console.log("connected user id : ", currentUserId);
    
    // Ensure we have history - if coming from announce_details, add it to history if not present
    // Only fix history once on mount to avoid infinite loops
    if (history.length === 0 && selectedAnnouncementId) {
      // If no history but we have a selected announcement, ensure we can go back
      setCurrentPage && setCurrentPage('reservation', ['announce_details']);
    }
    
    return () => setHeaderTitle && setHeaderTitle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Load announcements and users from MongoDB
  React.useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        // Load announcements
        const announcementsRes = await fetchWithAuth('/api/annonces?page=1&limit=1000');
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          if (announcementsData?.success && announcementsData?.data?.annonces) {
            const transformed = announcementsData.data.annonces.map((a: any) => ({
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
            if (!cancelled) setAnnouncements(transformed);
          }
        }

        // Load users
        const usersRes = await fetchWithAuth('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            if (!cancelled) setUsers(usersData.users);
          }
        }
      } catch (error) {
        console.error('Error loading data', error);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  React.useEffect(() => {
    console.log('Reservation page - reservationDraft:', reservationDraft);
    console.log('Reservation page - announcementsList length:', announcements.length);
  }, [reservationDraft, announcements.length]);

  if (!reservationDraft) {
    return <div style={{ padding: 16 }}>Aucune réservation en cours. Retournez à la recherche.</div>;
  }

  const announcement = announcements.find((a: any) => String(a.id) === String(reservationDraft.announcementId));
  const slot = announcement && Array.isArray(announcement.slots) ? announcement.slots[reservationDraft.slotIndex] : null;
  const author = announcement ? users.find((u: any) => Number(u.id) === Number(announcement.userId)) : null;
  
  React.useEffect(() => {
    console.log('Reservation page - announcement found:', !!announcement);
    console.log('Reservation page - author found:', !!author);
  }, [announcement, author]);

  function formatTime(iso?: string | null) {
    if (!iso) return '--:--';
    try { return dayjs(iso).format('HH:mm'); } catch { return String(iso); }
  }

  const formattedDate = slot ? (reservationDraft?.date ? dayjs(reservationDraft.date).format('YYYY.MM.DD') : '--/--/----') : '--/--/----';
  

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
                <span className='T2 TSemibold'>Récapitulatif</span>
                <span className='T2 ' style={{color: "var(--primary)"}}>{announcement ? announcement.price : 'N/A'} €</span>
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
          announcement={announcement}
          reservationDraft={reservationDraft}
          setReservationDraft={setReservationDraft}
          goBack={goBack}
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

function PaymentButton({ announcement, reservationDraft, setReservationDraft, goBack, currentUserId, author, users, formattedDate, setCurrentPage, setSelectedConversationId }: any) {
  const [loading, setLoading] = React.useState(false);
  // Use function to initialize state to avoid hydration issues
  const [open, setOpen] = React.useState(() => false);
  const [message, setMessage] = React.useState('');
  const [severity, setSeverity] = React.useState<'success'|'warning'|'error'|'info'>('info');

  async function handlePay() {
    console.log('test de reser idUser ',  currentUserId);
    console.log('reservationDraft:', reservationDraft);
    console.log('announcement:', announcement);
    console.log('author:', author);
    
    if (!reservationDraft || !announcement) {
      setSeverity('warning');
      setMessage('Aucune réservation à enregistrer.');
      setOpen(true);
      return;
    }
    
    if (!reservationDraft.date) {
      setSeverity('warning');
      setMessage('Date de réservation manquante. Veuillez retourner à la page précédente et sélectionner une date.');
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
      // First, create the reservation with status "to_pay" (A régler)
      const res = await fetchWithAuth('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: reservationDraft.announcementId, slotIndex: reservationDraft.slotIndex, userId: currentUserId, date: reservationDraft.date }),
      });
      const data = await res.json();
      if (res.ok && data?.ok && data?.reservation) {
        // After successful creation, update status to "reserved" (payment validated)
        const updateRes = await fetchWithAuth('/api/reservations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.reservation.id, status: 'reserved' }),
        });
        
        if (updateRes.ok && announcement && author) {
          // Get current user name
          const currentUser = users.find((u: any) => String(u.id) === String(currentUserId));
          const currentUserName = currentUser 
            ? `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim() || currentUser.name || "Utilisateur"
            : "Utilisateur";
          
          // Create message to the announcement owner
          const authorName = author.prenom || author.nom || "Prestataire";
          // Format date properly for the message
          const messageDate = reservationDraft?.date ? dayjs(reservationDraft.date).format('DD/MM/YYYY') : formattedDate;
          const messageText = `Bonjour ${authorName}, j'ai réservé et payé votre service "${announcement.title}" pour le ${messageDate}.`;
          
          console.log('Creating message with:', {
            fromUserId: currentUserId,
            toUserId: announcement.userId,
            announcementId: announcement.id,
            reservationId: data.reservation.id,
            initialMessage: messageText,
          });
          
          const messageRes = await fetchWithAuth('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromUserId: currentUserId,
              toUserId: announcement.userId,
              announcementId: announcement.id,
              reservationId: data.reservation.id,
              initialMessage: messageText,
            }),
          });
          
          const messageData = await messageRes.json();
          console.log('Message API response:', { resOk: messageRes.ok, messageData });
          
          if (messageRes.ok && messageData?.ok && messageData?.conversation) {
            console.log('Message created successfully, conversation ID:', messageData.conversation.id);
            
            // Clear reservation draft
            setReservationDraft && setReservationDraft(null);
            
            // Set the conversation ID first
            setSelectedConversationId && setSelectedConversationId(messageData.conversation.id);
            
            // Store in localStorage as fallback
            if (typeof window !== 'undefined') {
              localStorage.setItem('proximis_selectedConversationId', messageData.conversation.id);
            }
            
            // Show success message
            setSeverity('success');
            setMessage('Réservation enregistrée et payée. Redirection vers la conversation...');
            setOpen(true);
            
            // Navigate to chat directly with history [home, messages] so back goes to messages, then home
            // Use a slightly longer timeout to ensure state updates are complete
            setTimeout(() => {
              console.log('Navigating to chat page with conversation ID:', messageData.conversation.id);
              if (setCurrentPage) {
                setCurrentPage('message_chat', ['home', 'messages']);
              }
            }, 1500);
          } else {
            // Message creation failed but reservation is ok
            console.error('Message creation failed:', messageData);
            setSeverity('warning');
            setMessage(`Réservation enregistrée et payée. ${messageData?.error ? `Erreur lors de l'envoi du message: ${messageData.error}` : 'Impossible d\'envoyer le message automatique.'}`);
            setOpen(true);
            setReservationDraft && setReservationDraft(null);
            setTimeout(() => {
              goBack && goBack();
            }, 2000);
          }
        } else if (updateRes.ok) {
          // Status updated but couldn't create message (missing data)
          setSeverity('success');
          setMessage('Réservation enregistrée et payée.');
          setOpen(true);
          setReservationDraft && setReservationDraft(null);
          setTimeout(() => {
            goBack && goBack();
          }, 700);
        } else {
          // Reservation created but status update failed
          setSeverity('warning');
          setMessage('Réservation enregistrée mais erreur lors de la mise à jour du statut.');
          setOpen(true);
          setReservationDraft && setReservationDraft(null);
          setTimeout(() => {
            goBack && goBack();
          }, 700);
        }
      } else if (res.status === 409) {
        // duplicate reservation
        setSeverity('warning');
        setMessage('Vous avez déjà réservé ce créneau.');
        setOpen(true);
      } else {
        console.error('Save reservation failed', data);
        setSeverity('error');
        setMessage('Impossible d\'enregistrer la réservation. Réessayez.');
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
        Payer {announcement ? announcement.price : 'N/A'} €
      </Button>
      <Notification open={open} onClose={() => setOpen(false)} severity={severity} message={message} />
    </>
  );
}

export default Reservation