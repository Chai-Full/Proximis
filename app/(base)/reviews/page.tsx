"use client";

import React, { useState, useEffect } from 'react';
import { useContent } from '../ContentContext';
import StarIcon from '@mui/icons-material/Star';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchWithAuth } from '../lib/auth';
import './index.css';

dayjs.locale('fr');
dayjs.extend(relativeTime);

type Evaluation = {
  id: number | string;
  reservationId: number | string;
  announcementId: number | string;
  userId: number | string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export default function ReviewsContent() {
  const { 
    selectedAnnouncementId, 
    setHeaderTitle, 
    goBack,
    history 
  } = useContent();
  
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState<string>('');
  const [announcementCategory, setAnnouncementCategory] = useState<string>('');
  const [usersData, setUsersData] = useState<any>({ users: [] });

  useEffect(() => {
    if (!selectedAnnouncementId) {
      goBack && goBack();
      return;
    }

    const loadReviews = async () => {
      try {
        setLoading(true);
        
        // Load evaluations for this announcement (authenticated)
        const params = new URLSearchParams({
          announcementId: String(selectedAnnouncementId),
        });
        const res = await fetchWithAuth(`/api/evaluations?${params.toString()}`);
        const data = await res.json();

        if (res.ok && data?.evaluations && Array.isArray(data.evaluations)) {
          // Sort by date (most recent first)
          const sorted = data.evaluations.sort((a: Evaluation, b: Evaluation) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setEvaluations(sorted);

          // Get provider name and category from API announcements
          const annRes = await fetchWithAuth('/api/annonces?page=1&limit=1000');
          let announcement: any = null;
          let announcements: any[] = [];
          if (annRes.ok) {
            const annData = await annRes.json();
            announcements = annData?.data?.annonces || annData?.annonces || [];
            // Try multiple field names for ID
            announcement = announcements.find(
              (a: any) => String(a.id) === String(selectedAnnouncementId)
                || String(a.idAnnonce) === String(selectedAnnouncementId)
                || String(a._id) === String(selectedAnnouncementId)
            );
          }
          
          if (announcement) {
            // Set announcement category
            setAnnouncementCategory(announcement.category || '');
            
            // Load users from API to resolve provider name
            const usersRes = await fetchWithAuth('/api/users');
            const usersJson = usersRes.ok ? await usersRes.json() : { users: [] };
            const users = usersJson?.users || [];
            setUsersData(usersJson); // Store users data for getUsername function
            const provider = users.find((u: any) => String(u.id) === String(announcement.userId));
            
            if (provider) {
              const prenom = provider.prenom || '';
              const nom = provider.nom || '';
              const name = `${prenom} ${nom}`.trim() || provider.name || 'Prestataire';
              setProviderName(name);
              
              if (setHeaderTitle) {
                setHeaderTitle(`Avis de ${name.split(' ')[0] || name}`);
              }
            } else {
              setProviderName('Prestataire');
              if (setHeaderTitle) {
                setHeaderTitle('Avis');
              }
            }
          } else {
            setProviderName('Prestataire');
            setAnnouncementCategory('');
            if (setHeaderTitle) {
              setHeaderTitle('Avis');
            }
          }
        } else {
          setEvaluations([]);
          setProviderName('Prestataire');
          setAnnouncementCategory('');
          if (setHeaderTitle) {
            setHeaderTitle('Avis');
          }
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();

    return () => {
      if (setHeaderTitle) {
        setHeaderTitle(null);
      }
    };
  }, [selectedAnnouncementId, setHeaderTitle, goBack]);

  // Calculate average rating
  const averageRating = evaluations.length > 0
    ? evaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0) / evaluations.length
    : 0;

  // Format relative time (e.g., "il y a 1 mois")
  const formatRelativeTime = (dateString: string): string => {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffMonths = now.diff(date, 'month');
    const diffDays = now.diff(date, 'day');
    
    if (diffMonths >= 1) {
      return `il y a ${diffMonths} mois`;
    } else if (diffDays >= 1) {
      return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return "aujourd'hui";
    }
  };

  // Get username in format "Prénom N."
  const getUsername = (userId: number | string): string => {
    const users = (usersData as any).users ?? [];
    const user = users.find((u: any) => String(u.id) === String(userId));
    if (user) {
      const prenom = user.prenom || '';
      const nom = user.nom || '';
      if (prenom && nom) {
        return `${prenom} ${nom.charAt(0).toUpperCase()}.`;
      } else if (prenom) {
        return prenom;
      } else if (nom) {
        return `${nom.charAt(0).toUpperCase()}.`;
      } else if (user.email) {
        const emailName = user.email.split('@')[0];
        return emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
    }
    return 'Utilisateur';
  };

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <p>Chargement des avis...</p>
      </div>
    );
  }

  return (
    <div className="reviewsContainer">
      {/* Overall Rating Section */}
      <div className="reviewsOverallRating">
        <div className="reviewsRatingNumber">{averageRating.toFixed(1)}</div>
        <div className="reviewsRatingStars">
          {[1, 2, 3, 4, 5].map((value) => (
            <StarIcon
              key={value}
              sx={{
                fontSize: 24,
                color: value <= Math.round(averageRating) ? '#FFE135' : '#E0E0E0',
              }}
            />
          ))}
        </div>
        <div className="reviewsRatingCount">
          Basée sur {evaluations.length} avis
        </div>
      </div>

      {/* Announcement Category Section */}
      {announcementCategory && (
        <div className="reviewsCategoryBanner">
          Avis pour cette annonce : <span className="reviewsCategoryBold">{announcementCategory}</span>
        </div>
      )}

      {/* Individual Reviews */}
      <div className="reviewsList">
        {evaluations.length === 0 ? (
          <div className="reviewsEmpty">
            <p>Aucun avis pour le moment</p>
          </div>
        ) : (
          evaluations.map((evaluation) => (
            <div key={evaluation.id} className="reviewCard">
              <div className="reviewHeader">
                <div className="reviewUsername">{getUsername(evaluation.userId)}</div>
                <div className="reviewStars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <StarIcon
                      key={value}
                      sx={{
                        fontSize: 18,
                        color: value <= evaluation.rating ? '#FFE135' : '#E0E0E0',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="reviewComment">
                {evaluation.comment}
              </div>
              <div className="reviewDate">
                {formatRelativeTime(evaluation.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

