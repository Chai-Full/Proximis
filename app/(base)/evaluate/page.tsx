"use client";

import React, { useState, useEffect } from 'react';
import { useContent } from '../ContentContext';
import { TextField, Button } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Notification from '../components/Notification';
import { fetchWithAuth } from '../lib/auth';
import './index.css';

export default function EvaluateContent() {
  const { 
    selectedReservationId, 
    setHeaderTitle, 
    setCurrentPage, 
    goBack, 
    currentUserId,
    history 
  } = useContent();
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const [reservation, setReservation] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [providerName, setProviderName] = useState<string>('');

  // Load reservation and announcement data
  useEffect(() => {
    if (!selectedReservationId) {
      // If no reservation selected, go back
      goBack && goBack();
      return;
    }

    const loadData = async () => {
      try {
        // Load reservation from API or data
        const params = new URLSearchParams({ userId: String(currentUserId || '') });
        const res = await fetch(`/api/reservations?${params.toString()}`);
        const data = await res.json();
        
        const reservations = data?.reservations || data || [];
        const foundReservation = reservations.find((r: any) => String(r.id) === String(selectedReservationId));
        
        if (!foundReservation) {
          setNotification({
            open: true,
            message: 'Réservation introuvable',
            severity: 'error'
          });
          setTimeout(() => goBack && goBack(), 2000);
          return;
        }

        setReservation(foundReservation);

        // Find announcement
        const announcements = Array.isArray(announcementsData) ? announcementsData : [];
        const foundAnnouncement = announcements.find(
          (a: any) => String(a.id) === String(foundReservation.announcementId)
        );

        if (!foundAnnouncement) {
          setNotification({
            open: true,
            message: 'Annonce introuvable',
            severity: 'error'
          });
          return;
        }

        setAnnouncement(foundAnnouncement);

        // Get provider name (owner of the announcement)
        const users = (usersData as any).users ?? [];
        const provider = users.find((u: any) => String(u.id) === String(foundAnnouncement.userId));
        
        if (provider) {
          const prenom = provider.prenom || '';
          const nom = provider.nom || '';
          const name = `${prenom} ${nom}`.trim() || provider.name || 'Prestataire';
          setProviderName(name);
          
          // Set header title with provider name
          if (setHeaderTitle) {
            setHeaderTitle(`Evaluer ${name.split(' ')[0] || name}`);
          }
        } else {
          setProviderName('Prestataire');
          if (setHeaderTitle) {
            setHeaderTitle('Evaluer');
          }
        }
      } catch (error) {
        console.error('Error loading reservation data:', error);
        setNotification({
          open: true,
          message: 'Erreur lors du chargement des données',
          severity: 'error'
        });
      }
    };

    loadData();

    return () => {
      if (setHeaderTitle) {
        setHeaderTitle(null);
      }
    };
  }, [selectedReservationId, currentUserId, setHeaderTitle, goBack]);

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleSubmit = async () => {
    // Validation
    if (rating === 0) {
      setNotification({
        open: true,
        message: 'Veuillez sélectionner une note',
        severity: 'warning'
      });
      return;
    }

    if (!comment.trim()) {
      setNotification({
        open: true,
        message: 'Veuillez laisser un commentaire',
        severity: 'warning'
      });
      return;
    }

    if (!selectedReservationId || !announcement) {
      setNotification({
        open: true,
        message: 'Données manquantes',
        severity: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      // Submit evaluation
      const response = await fetchWithAuth('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedReservationId,
          announcementId: announcement.id,
          rating,
          comment: comment.trim(),
          userId: currentUserId,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.ok) {
        // The API automatically updates the reservation status to "completed"
        setNotification({
          open: true,
          message: 'Évaluation enregistrée avec succès',
          severity: 'success'
        });

        // Navigate back after success
        setTimeout(() => {
          goBack && goBack();
        }, 1500);
      } else {
        setNotification({
          open: true,
          message: data?.error || 'Erreur lors de l\'enregistrement de l\'évaluation',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setNotification({
        open: true,
        message: 'Erreur serveur',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!reservation || !announcement) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="evaluateContainer">
      <div className="evaluateContent">
        <span className="T2">Laisser un avis</span>
        <div className="evaluateForm">
          {/* Star Rating */}
          <div className="evaluateStarsContainer">
            <div className="evaluateStars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="starButton"
                  onClick={() => handleStarClick(value)}
                  aria-label={`Noter ${value} étoile${value > 1 ? 's' : ''}`}
                >
                  {value <= rating ? (
                    <StarIcon sx={{ fontSize: 40, color: '#FFE135' }} />
                  ) : (
                    <StarBorderIcon sx={{ fontSize: 40, color: '#FFE135' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Field */}
          <div className="evaluateCommentContainer">
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Partager votre expérience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              variant="outlined"
              className="evaluateCommentField"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || rating === 0 || !comment.trim()}
            className="evaluateSubmitButton"
            sx={{
              textTransform: 'none',
              borderRadius: '50px',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {loading ? 'Enregistrement...' : 'Evaluer'}
          </Button>
        </div>
      </div>

      <Notification
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        severity={notification.severity}
        message={notification.message}
      />
    </div>
  );
}

