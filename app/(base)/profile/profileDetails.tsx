"use client";
import React, { useEffect } from 'react';
import { useContent } from '../ContentContext';
import usersData from '../../../data/users.json';
import './index.css';
import Star from '@mui/icons-material/Star';
import announcementsData from '../../../data/announcements.json';
import AnnouncementCard from '../announcement/AnnouncementCard';


export default function ProfileDetails() {
  const { selectedProfileId, setHeaderTitle } = useContent();
  const users = (usersData as any).users ?? [];
  const user = selectedProfileId ? users.find((u: any) => Number(u.id) === Number(selectedProfileId)) : null;

  useEffect(() => {
    if (user && setHeaderTitle) {
      setHeaderTitle(`Profil de ${user.prenom} ${user.nom}`);
      return () => setHeaderTitle && setHeaderTitle(null);
    }
    setHeaderTitle && setHeaderTitle(null);
    return () => {};
  }, [user, setHeaderTitle]);

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Profil introuvable</h2>
      </div>
    );
  }

  const fullName = `${user.prenom} ${user.nom}`.trim();

  return (
    <div className='announceProfile'>
      <div className='announceProfileHeader'>
          <div
            className='avatar'
          >
            <img
              src={`/api/profile/photo?userId=${encodeURIComponent(String(user.id))}`}
              alt={fullName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* initiales (prend les deux premières lettres des mots du nom) */}
            <span style={{ position: 'absolute', userSelect: 'none' }}>
              {fullName
            .split(/\s+/)
            .map((n) => n[0] || '')
            .slice(0, 2)
            .join('')
            .toUpperCase()}
            </span>
          </div>
          <div className='nameNotes'>
            <span className='T4'>
                {fullName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                    <Star sx={{ color: "#FFE135" }} />
                    <span className='T5'>4,9 <span style={{color: "#8c8c8c"}}> (23 avis)</span></span>
                </div>
          </div>
        </div>
        <div className='announceProfileContentAvailable'>
          <span className='T3'>
            Annonces disponibles ({announcementsData.slice(0, 2).length})
          </span>
          <div className='announceProfileContentAvailableList'>
                {(() => {
                  if (announcementsData.length === 0) {
                    return <div className="empty">Aucune annonce disponible</div>;
                  }
                  console.log("annonces listées : ", announcementsData.slice(0, 2));
                  
                  return announcementsData.slice(0, 2).map((ann: any) => (
                    <AnnouncementCard key={ann.id} announcement={ann} profilPage={true}/>
                  ));
                })()}
          </div> 
        </div>
        <div className='announceProfileContentClosed'>
          <span className='T3'>
            Annonces clôturées (2)
          </span>
          <div className='announceProfileContentClosedList'>
                {(() => {
                  if (announcementsData.length === 0) {
                    return <div className="empty">Aucune annonce disponible</div>;
                  }
                  return announcementsData.slice(2, 4).map((ann: any) => (
                    <AnnouncementCard key={ann.id} announcement={ann} profilPage={true} />
                  ));
                })()}
          </div> 
        </div>
    </div>
  );
}
