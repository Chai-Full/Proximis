import React from 'react'
import { useContent } from '../ContentContext';
import announcements from '../../../data/announcements.json';
import usersData from '../../../data/users.json';
import dayjs from 'dayjs';
import { Button, TextField } from '@mui/material';
import Notification from '../components/Notification';
import './index.css';

function Reservation() {
  const { reservationDraft, setReservationDraft, setCurrentPage, setHeaderTitle, currentUserId, goBack } = useContent();
  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle('Paiement');
    console.log("connected user id : ", currentUserId);
    return () => setHeaderTitle && setHeaderTitle(null);
  }, [setHeaderTitle]);
  const announcementsList = Array.isArray(announcements) ? announcements : [];

  if (!reservationDraft) {
    return <div style={{ padding: 16 }}>Aucune réservation en cours. Retournez à la recherche.</div>;
  }

  const announcement = announcementsList.find(a => String(a.id) === String(reservationDraft.announcementId));
  const slot = announcement && Array.isArray(announcement.slots) ? announcement.slots[reservationDraft.slotIndex] : null;
  const users = (usersData as any).users ?? [];
    const author = announcement ? users.find((u: any) => String(u.id) === String(announcement.userId)) : null;

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
        />
        <div className='secureBadge'>
            Paiement sécurisé. Vos informations sont cryptées et protégées.
        </div>
      </div>
      {/* Notification managed inside PaymentButton via global Notification component */}
    </div>
  )
}

function PaymentButton({ announcement, reservationDraft, setReservationDraft, goBack, currentUserId }: any) {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [severity, setSeverity] = React.useState<'success'|'warning'|'error'|'info'>('info');

  async function handlePay() {
    console.log('test de reser idUser ',  currentUserId);
    
    if (!reservationDraft || !announcement) {
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
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: reservationDraft.announcementId, slotIndex: reservationDraft.slotIndex, userId: currentUserId, date: reservationDraft.date }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setSeverity('success');
        setMessage('Réservation enregistrée.');
        setOpen(true);
        // clear draft and return to previous page so the user sees the notification briefly
        setReservationDraft && setReservationDraft(null);
        setTimeout(() => {
          goBack && goBack();
        }, 700);
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