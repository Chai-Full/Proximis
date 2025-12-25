"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useContent } from '../ContentContext';
import AnnouncementCard from '../announcement/announcementCard';
import usersData from '../../../data/users.json';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import dayjs from 'dayjs';
import { fetchWithAuth } from '../lib/auth';
import './map.css';

interface AnnouncementWithLocation {
  announcement: any;
  user: any;
  position: { lat: number; lng: number } | null;
}

interface AnnouncementSearchWithMapContentProps {
  announcements: any[];
  appliedFilters: any;
}

// Component for search radius circle
function CircleOverlay({ center, radius }: { center: { lat: number; lng: number }; radius: number }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (!map || typeof window === 'undefined' || !window.google || !window.google.maps) return;
    
    const circle = new window.google.maps.Circle({
      center: center,
      radius: radius,
      fillColor: '#FF0000',
      fillOpacity: 0.2,
      strokeColor: '#FF0000',
      strokeOpacity: 0.5,
      strokeWeight: 2,
      map: map,
    });
    
    return () => {
      circle.setMap(null);
    };
  }, [map, center, radius]);
  
  return null;
}

function MapContent({ 
  announcementsWithLocation, 
  userPosition, 
  searchRadius,
  selectedIndex,
  onMarkerClick 
}: {
  announcementsWithLocation: AnnouncementWithLocation[];
  userPosition: { lat: number; lng: number } | null;
  searchRadius: number | null;
  selectedIndex: number;
  onMarkerClick: (index: number) => void;
}) {
  const map = useMap();
  const validLocations = announcementsWithLocation.filter(a => a.position !== null);
  
  // Map selectedIndex (from all announcements) to validLocations index
  const getValidIndex = (index: number) => {
    let validCount = 0;
    for (let i = 0; i < announcementsWithLocation.length; i++) {
      if (announcementsWithLocation[i].position !== null) {
        if (validCount === index) {
          return i; // Return original index
        }
        validCount++;
      }
    }
    return -1;
  };

  const selectedOriginalIndex = getValidIndex(selectedIndex);
  const selectedAnnouncement = selectedOriginalIndex >= 0 ? announcementsWithLocation[selectedOriginalIndex] : null;

  // Center map on selected announcement or user position
  useEffect(() => {
    if (!map) return;
    
    if (selectedAnnouncement && selectedAnnouncement.position) {
      map.setCenter(selectedAnnouncement.position);
      map.setZoom(14);
    } else if (userPosition) {
      map.setCenter(userPosition);
      map.setZoom(12);
    }
  }, [map, selectedAnnouncement, userPosition]);

  // Hide map type control (Map/Satellite selector)
  useEffect(() => {
    if (!map || typeof window === 'undefined') return;
    
    const hideMapTypeControl = () => {
      // Hide using CSS selectors
      const mapTypeControls = document.querySelectorAll('.gm-style-mtc, .gm-style .gm-style-mtc, div[role="button"][title*="Satellite"], div[role="button"][title*="Map"]');
      mapTypeControls.forEach((control) => {
        (control as HTMLElement).style.display = 'none';
      });
    };

    // Hide immediately and also after a short delay (in case controls load asynchronously)
    hideMapTypeControl();
    const timer = setTimeout(hideMapTypeControl, 500);
    const timer2 = setTimeout(hideMapTypeControl, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [map]);

  return (
    <>
      {/* User position marker (orange with face) */}
      {userPosition && (
        <Marker
          position={userPosition}
          icon={{
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#FF9800" stroke="white" stroke-width="2"/>
                <circle cx="15" cy="17" r="2" fill="white"/>
                <circle cx="25" cy="17" r="2" fill="white"/>
                <path d="M 15 23 Q 20 26 25 23" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
            `),
            scaledSize: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Size(40, 40) : undefined,
            anchor: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Point(20, 20) : undefined,
          }}
        />
      )}

      {/* Search radius circle */}
      {searchRadius && userPosition && <CircleOverlay center={userPosition} radius={searchRadius * 1000} />}

      {/* Announcement markers */}
      {announcementsWithLocation.map((item, originalIndex) => {
        if (!item.position) return null;
        
        // Find the valid index for this announcement
        let validIndex = 0;
        for (let i = 0; i < originalIndex; i++) {
          if (announcementsWithLocation[i].position !== null) {
            validIndex++;
          }
        }
        
        const isSelected = validIndex === selectedIndex;
        const isFavorite = false; // You can add favorite logic here if needed
        
        // Different colors: red for selected, grey for others
        const markerColor = isSelected ? '#FF0000' : '#808080';
        
        return (
          <Marker
            key={item.announcement.id}
            position={item.position}
            onClick={() => onMarkerClick(validIndex)}
            icon={{
              url: `data:image/svg+xml;base64,${btoa(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C7.163 0 0 7.163 0 16c0 11.045 16 32 16 32s16-20.955 16-32C32 7.163 24.837 0 16 0z" fill="${markerColor}"/>
                  <circle cx="16" cy="16" r="8" fill="white"/>
                </svg>
              `)}`,
              scaledSize: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Size(32, 32) : undefined,
              anchor: typeof window !== 'undefined' && window.google?.maps ? new window.google.maps.Point(16, 32) : undefined,
            }}
          />
        );
      })}
    </>
  );
}

function AnnouncementSearchWithMapContent({ announcements, appliedFilters }: AnnouncementSearchWithMapContentProps) {
  const [categories, setCategories] = React.useState<Array<{ id: number; title: string; image: string }>>([]);

  // Load categories from API
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchWithAuth('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);
  const { currentUserId, setSelectedAnnouncementId, setCurrentPage } = useContent();
  const [announcementsWithLocation, setAnnouncementsWithLocation] = useState<AnnouncementWithLocation[]>([]);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const users = (usersData as any).users ?? [];
  const currentUser = currentUserId ? users.find((u: any) => String(u.id) === String(currentUserId)) : null;

  // Get search radius from filters
  const searchRadius = appliedFilters?.distance || null;

  // Geocode user's address
  useEffect(() => {
    if (!currentUser || !currentUser.adresse || !currentUser.codePostal) {
      setUserPosition(null);
      return;
    }

    let cancelled = false;

    const performGeocoding = () => {
      if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
        // Retry after a short delay
        setTimeout(performGeocoding, 200);
        return;
      }

      if (cancelled) return;

      const geocoder = new window.google.maps.Geocoder();
      const address = `${currentUser.adresse}, ${currentUser.codePostal}, France`;

      geocoder.geocode({ address }, (results, status) => {
        if (cancelled) return;
        
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          setUserPosition({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          console.warn('Geocoding failed for user address:', status);
          setUserPosition(null);
        }
      });
    };

    performGeocoding();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Geocode announcements
  useEffect(() => {
    if (announcements.length === 0) {
      setAnnouncementsWithLocation([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setGeocodingError(null);

    // Wait for Google Maps to be available
    const performGeocoding = () => {
      if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
        // Retry after a short delay
        setTimeout(performGeocoding, 200);
        return;
      }

      if (cancelled) return;

      const geocoder = new window.google.maps.Geocoder();
      const geocodePromises: Promise<AnnouncementWithLocation>[] = [];

      announcements.forEach((announcement) => {
        const user = users.find((u: any) => String(u.id) === String(announcement.userId));
        
        if (!user || !user.adresse || !user.codePostal) {
          geocodePromises.push(
            Promise.resolve({
              announcement,
              user: user || null,
              position: null,
            })
          );
          return;
        }

        const address = `${user.adresse}, ${user.codePostal}, France`;
        
        const promise = new Promise<AnnouncementWithLocation>((resolve) => {
          geocoder.geocode({ address }, (results, status) => {
            if (cancelled) {
              resolve({ announcement, user, position: null });
              return;
            }

            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              resolve({
                announcement,
                user,
                position: {
                  lat: location.lat(),
                  lng: location.lng(),
                },
              });
            } else {
              console.warn(`Geocoding failed for announcement ${announcement.id}:`, status);
              resolve({ announcement, user, position: null });
            }
          });
        });

        geocodePromises.push(promise);
      });

      Promise.all(geocodePromises).then((results) => {
        if (!cancelled) {
          setAnnouncementsWithLocation(results);
          setSelectedIndex(0); // Reset to first announcement
          setLoading(false);
        }
      }).catch((error) => {
        if (!cancelled) {
          console.error('Error geocoding announcements:', error);
          setGeocodingError('Erreur lors du chargement des positions');
          setLoading(false);
        }
      });
    };

    performGeocoding();

    return () => {
      cancelled = true;
    };
  }, [announcements, users]);

  const validLocations = announcementsWithLocation.filter(a => a.position !== null);

  const handleMarkerClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : validLocations.length - 1));
  }, [validLocations.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < validLocations.length - 1 ? prev + 1 : 0));
  }, [validLocations.length]);

  const handleCardClick = useCallback(() => {
    const selected = validLocations[selectedIndex];
    if (selected && setSelectedAnnouncementId && setCurrentPage) {
      setSelectedAnnouncementId(selected.announcement.id);
      setCurrentPage('announce_details');
    }
  }, [selectedIndex, validLocations, setSelectedAnnouncementId, setCurrentPage]);

  const selectedAnnouncement = validLocations[selectedIndex];

  // Default center (Lyon, France)
  const defaultCenter = { lat: 45.764043, lng: 4.835659 };
  const center = useMemo(() => {
    if (validLocations.length === 0) {
      return userPosition || defaultCenter;
    }
    const selected = validLocations[selectedIndex];
    if (selected && selected.position) {
      return selected.position;
    }
    return defaultCenter;
  }, [validLocations, selectedIndex, userPosition]);

  if (!process.env.NEXT_PUBLIC_GG_API_KEY) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <p>Clé API Google Maps manquante</p>
      </div>
    );
  }

  // Generate filter badges (same logic as list view)
  const filterBadges = useMemo(() => {
    if (!appliedFilters) return [<div key="all" className="searchFilterSelectedItem">Tous</div>];
    const badges: React.ReactNode[] = [];
    if (appliedFilters.category) {
      // Find category title by ID
      const categoryId = typeof appliedFilters.category === 'number' 
        ? appliedFilters.category 
        : (typeof appliedFilters.category === 'string' && !isNaN(Number(appliedFilters.category)) 
            ? Number(appliedFilters.category) 
            : null);
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const categoryLabel = category ? category.title : (typeof appliedFilters.category === 'string' ? appliedFilters.category : String(appliedFilters.category));
      badges.push(<div key="cat" className="searchFilterSelectedItem">{categoryLabel}</div>);
    }
    // Only show distance badge if it's greater than 0
    if (typeof appliedFilters.distance === 'number' && appliedFilters.distance > 0) {
      badges.push(<div key="dist" className="searchFilterSelectedItem">≤ {appliedFilters.distance} Km</div>);
    }
    // Only show price badge if it's greater than 0
    if (typeof appliedFilters.price === 'number' && appliedFilters.price > 0) {
      badges.push(<div key="price" className="searchFilterSelectedItem">≤ {appliedFilters.price} €</div>);
    }
    if (appliedFilters.keyword) badges.push(<div key="kw" className="searchFilterSelectedItem">"{appliedFilters.keyword}"</div>);
    if (Array.isArray(appliedFilters.slots)) {
      const dayLabel = (id: number) => ({1:'Lun',2:'Mar',3:'Mer',4:'Jeu',5:'Ven',6:'Sam',7:'Dim'} as any)[id] ?? String(id);
      appliedFilters.slots.forEach((s: any, idx: number) => {
        if (!s) return;
        const label = s.time ? `${dayLabel(s.day)} ${dayjs(s.time).format('HH:mm')}` : `${dayLabel(s.day)}`;
        badges.push(<div key={`slot-${idx}`} className="searchFilterSelectedItem">{label}</div>);
      });
    }
    if (badges.length === 0) return [<div key="all" className="searchFilterSelectedItem">Tous</div>];
    return badges;
  }, [appliedFilters, categories]);

  return (
    <div className="mapSearchContainer">
      {/* Filter badges (same as list view) */}
      <div className="searchFilterSelectedWithMapContainer">
        {filterBadges}
      </div>

      {/* Map */}
      <div className="mapSearchMapContainer">
        {geocodingError ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            backgroundColor: '#f5f5f5'
          }}>
            <p>{geocodingError}</p>
          </div>
        ) : (
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GG_API_KEY}>
            <Map
              defaultCenter={center}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              {!loading && (
                <MapContent
                  announcementsWithLocation={announcementsWithLocation}
                  userPosition={userPosition}
                  searchRadius={searchRadius}
                  selectedIndex={selectedIndex}
                  onMarkerClick={handleMarkerClick}
                />
              )}
              {loading && (
                <div style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  <p>Chargement des positions...</p>
                </div>
              )}
            </Map>
          </APIProvider>
        )}
      </div>

      {/* Announcement card at bottom */}
      {selectedAnnouncement && !loading && (
        <div className="mapSearchCardContainer">
          <button 
            className="mapSearchNavButton mapSearchNavButtonLeft"
            onClick={handlePrevious}
            aria-label="Annonce précédente"
          >
            <ChevronLeft sx={{ fontSize: 24, color: 'white' }} />
          </button>
          
          <div className="mapSearchCard" onClick={handleCardClick}>
            <AnnouncementCard announcement={selectedAnnouncement.announcement} />
          </div>
          
          <button 
            className="mapSearchNavButton mapSearchNavButtonRight"
            onClick={handleNext}
            aria-label="Annonce suivante"
          >
            <ChevronRight sx={{ fontSize: 24, color: 'white' }} />
          </button>
        </div>
      )}
    </div>
  );
}

export default AnnouncementSearchWithMapContent;
