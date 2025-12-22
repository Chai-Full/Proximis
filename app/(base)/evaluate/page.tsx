"use client";

import React, { useState, useEffect } from 'react';
import { useContent } from '../ContentContext';
import { TextField, Button } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Notification from '../components/Notification';
import { fetchWithAuth } from '../lib/auth';
import { clearCache } from '../lib/useCachedData';
import './index.css';

export default function EvaluateContent() {
  const { 
    selectedReservationId, 
    evaluationData,
    setEvaluationData,
    setHeaderTitle, 
    setCurrentPage, 
    goBack, 
    currentUserId,
    history 
  } = useContent();
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true); // For initial data loading
  const [submitting, setSubmitting] = useState(false); // For form submission
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

    // If we have evaluation data from home page, use it directly
    if (evaluationData && evaluationData.reservation && evaluationData.announcement) {
      setReservation(evaluationData.reservation);
      setAnnouncement(evaluationData.announcement);
      setProviderName(evaluationData.providerName || 'Prestataire');
      
      // Set header title with announcement title
      const announcementTitle = evaluationData.announcement.title || evaluationData.announcement.nomAnnonce || 'Évaluation';
      if (setHeaderTitle) {
        setHeaderTitle(announcementTitle);
      }
      
      setLoadingData(false);
      
      // Clear evaluation data after using it
      if (setEvaluationData) {
        setEvaluationData(null);
      }
      
      return () => {
        if (setHeaderTitle) {
          setHeaderTitle(null);
        }
      };
    }

    // Otherwise, load from API (fallback for direct navigation)
    let cancelled = false;
    setLoadingData(true);

    const loadData = async () => {
      try {
        // Load reservation directly by ID
        const params = new URLSearchParams({ id: String(selectedReservationId) });
        const res = await fetchWithAuth(`/api/reservations?${params.toString()}`);
        
        if (cancelled) return;
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        const reservations = data?.reservations || data || [];
        const foundReservation = reservations.find((r: any) => String(r.id) === String(selectedReservationId));
        
        if (cancelled) return;
        
        if (!foundReservation) {
          setNotification({
            open: true,
            message: 'Réservation introuvable',
            severity: 'error'
          });
          setTimeout(() => goBack && goBack(), 2000);
          setLoadingData(false);
          return;
        }

        setReservation(foundReservation);

        // Load announcement directly by ID
        try {
          const announcementId = foundReservation.announcementId;
          const announcementRes = await fetchWithAuth(`/api/announcements/${announcementId}`);
          
          if (cancelled) return;
          
          if (announcementRes.ok) {
            const announcementData = await announcementRes.json();
            const foundAnnouncement = announcementData?.ok && announcementData?.announcement 
              ? announcementData.announcement 
              : null;

            if (cancelled) return;

            if (!foundAnnouncement) {
              setNotification({
                open: true,
                message: 'Annonce introuvable',
                severity: 'error'
              });
              setLoadingData(false);
              return;
            }

            setAnnouncement(foundAnnouncement);

            // Set header title with announcement title
            const announcementTitle = foundAnnouncement.title || foundAnnouncement.nomAnnonce || 'Évaluation';
            if (setHeaderTitle) {
              setHeaderTitle(announcementTitle);
            }

            // Get provider name (owner of the announcement)
            const providerUserId = foundAnnouncement.userId || foundAnnouncement.userCreateur?.idUser || foundAnnouncement.userCreateur;
            if (providerUserId) {
              const usersRes = await fetchWithAuth('/api/users');
              if (usersRes.ok && !cancelled) {
                const usersData = await usersRes.json();
                const users = usersData?.users || [];
                
                const provider = users.find((u: any) => String(u.id) === String(providerUserId));
                
                if (provider && !cancelled) {
                  const prenom = provider.prenom || '';
                  const nom = provider.nom || '';
                  const name = `${prenom} ${nom}`.trim() || provider.name || 'Prestataire';
                  setProviderName(name);
                } else if (!cancelled) {
                  setProviderName('Prestataire');
                }
              }
            } else if (!cancelled) {
              setProviderName('Prestataire');
            }
          } else {
            if (!cancelled) {
              setNotification({
                open: true,
                message: 'Erreur lors du chargement de l\'annonce',
                severity: 'error'
              });
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error loading announcement:', error);
            setNotification({
              open: true,
              message: 'Erreur lors du chargement de l\'annonce',
              severity: 'error'
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading reservation data:', error);
          setNotification({
            open: true,
            message: 'Erreur lors du chargement des données: ' + String(error),
            severity: 'error'
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      if (setHeaderTitle) {
        setHeaderTitle(null);
      }
    };
  }, [selectedReservationId, evaluationData, currentUserId, setHeaderTitle, goBack, setEvaluationData]);

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

    setSubmitting(true);

    try {
      // Prepare robust payload: support various announcement id fields and fallback to localStorage for userId
      const announcementId = announcement?.id ?? announcement?.idAnnonce ?? announcement?._id ?? null;
      const storedUserId = typeof window !== 'undefined' ? window.localStorage.getItem('proximis_userId') : null;
      const userIdToSend = currentUserId ?? (storedUserId ? Number(storedUserId) : null);

      if (!announcementId) {
        setNotification({ open: true, message: 'Identifiant de l\'annonce manquant', severity: 'error' });
        setSubmitting(false);
        return;
      }
      if (!userIdToSend) {
        setNotification({ open: true, message: 'Utilisateur non authentifié', severity: 'error' });
        setSubmitting(false);
        return;
      }

      // Submit evaluation
      const response = await fetchWithAuth('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedReservationId,
          announcementId,
          rating: Number(rating),
          comment: comment.trim(),
          userId: userIdToSend,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.ok) {
        // The API automatically updates the reservation status to "completed"
        // Invalidate cache for next-to-evaluate to refresh home page data
        clearCache('home_next_to_evaluate');
        clearCache('home_stats'); // Also invalidate stats as they might change
        
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
        const errorMessage = data?.error || 'Erreur lors de l\'enregistrement de l\'évaluation';
        setNotification({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
        
        // If already evaluated, navigate back after showing error
        if (response.status === 400 && errorMessage.includes('déjà été évaluée')) {
          setTimeout(() => {
            goBack && goBack();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setNotification({
        open: true,
        message: 'Erreur serveur',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData || !reservation || !announcement) {
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
            disabled={submitting || rating === 0 || !comment.trim()}
            className="evaluateSubmitButton"
            sx={{
              textTransform: 'none',
              borderRadius: '50px',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Enregistrement...' : 'Evaluer'}
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

