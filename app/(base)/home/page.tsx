"use client";

import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useContent } from '../ContentContext';
import { useRouter } from 'next/navigation';
import { AddCircleOutlineOutlined, LightbulbCircleOutlined, Schedule, StarOutlineOutlined, Today } from '@mui/icons-material';
import announcements from '../../../data/announcements.json';
import usersData from '../../../data/users.json';
import StarsOutlined from '@mui/icons-material/StarsOutlined';
import AnnouncementCard from '../announcement/AnnouncementCard';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

export default function HomeContent() {
    const { currentPage, setCurrentPage, currentUserId, clearHistory, history, setSelectedReservationId } = useContent();
    const router = useRouter();
    const [mounted, setMounted] = React.useState(false);
    const [servicesRendered, setServicesRendered] = React.useState<number>(0);
    const [servicesReceived, setServicesReceived] = React.useState<number>(0);
    const [averageRating, setAverageRating] = React.useState<number>(0);
    const [loadingStats, setLoadingStats] = React.useState<boolean>(true);
    const [reservationToEvaluate, setReservationToEvaluate] = React.useState<{
        reservation: any;
        announcement: any;
        providerName: string;
        completedDate: string;
    } | null>(null);
    const [loadingReservationToEvaluate, setLoadingReservationToEvaluate] = React.useState<boolean>(true);
    const [recommendedAnnouncement, setRecommendedAnnouncement] = React.useState<any>(null);
    const [loadingRecommended, setLoadingRecommended] = React.useState<boolean>(true);
    const [nextReservation, setNextReservation] = React.useState<{
        reservation: any;
        announcement: any;
        providerName: string;
        formattedDate: string;
        formattedTime: string;
        relativeDate: string;
    } | null>(null);
    const [loadingNextReservation, setLoadingNextReservation] = React.useState<boolean>(true);

    // Track when component is mounted
    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        // Wait for component to mount and context to load before checking
        if (!mounted) return;
        
        // Check both context and localStorage to avoid premature redirect
        const checkUserId = () => {
            if (currentUserId != null) return;
            
            // Also check localStorage directly as fallback
            try {
                const stored = localStorage.getItem('proximis_userId');
                if (stored) return; // User is logged in, don't redirect
            } catch (e) {
                // ignore
            }
            
            // Only redirect if truly no user is logged in
            router.push('/');
        };
        
        // Small delay to allow context to load
        const timer = setTimeout(checkUserId, 100);
        return () => clearTimeout(timer);
    }, [currentUserId, router, mounted]);

    // Clear history when arriving on home page, but only if we're not coming from a navigation with history
    // This prevents clearing history when navigating back from message_chat
    React.useEffect(() => {
        if (currentPage === 'home' && history.length === 0) {
            clearHistory && clearHistory();
        }
    }, [currentPage, clearHistory, history.length]);

    // Load statistics
    React.useEffect(() => {
        if (!currentUserId) {
            setServicesRendered(0);
            setServicesReceived(0);
            setAverageRating(0);
            setLoadingStats(false);
            return;
        }

        let cancelled = false;
        setLoadingStats(true);

        const loadStats = async () => {
            try {
                // Load reservations
                const reservationsParams = new URLSearchParams({
                    userId: String(currentUserId),
                });
                const reservationsRes = await fetch(`/api/reservations?${reservationsParams.toString()}`);
                const reservationsData = await reservationsRes.json();
                const reservations = reservationsData?.reservations || (Array.isArray(reservationsData) ? reservationsData : []);

                if (cancelled) return;

                // Calculate services received (reservations where user is the client)
                const servicesReceivedCount = reservations.filter((r: any) => 
                    String(r.userId) === String(currentUserId)
                ).length;
                setServicesReceived(servicesReceivedCount);

                // Calculate services rendered (reservations where user is the provider)
                const userAnnouncements = Array.isArray(announcements) 
                    ? announcements.filter((a: any) => String(a.userId) === String(currentUserId))
                    : [];
                const userAnnouncementIds = userAnnouncements.map((a: any) => String(a.id));
                const servicesRenderedCount = reservations.filter((r: any) => 
                    userAnnouncementIds.includes(String(r.announcementId))
                ).length;
                setServicesRendered(servicesRenderedCount);

                // Calculate average rating from all user's announcements
                const allEvaluations: any[] = [];
                for (const announcement of userAnnouncements) {
                    try {
                        const evalParams = new URLSearchParams({
                            announcementId: String(announcement.id),
                        });
                        const evalRes = await fetch(`/api/evaluations?${evalParams.toString()}`);
                        const evalData = await evalRes.json();
                        
                        if (evalRes.ok && evalData?.evaluations && Array.isArray(evalData.evaluations)) {
                            allEvaluations.push(...evalData.evaluations);
                        }
                    } catch (e) {
                        console.error(`Error loading evaluations for announcement ${announcement.id}`, e);
                    }
                }

                if (cancelled) return;

                // Calculate average rating
                let avgRating = 0;
                if (allEvaluations.length > 0) {
                    const sum = allEvaluations.reduce((acc, evaluation) => {
                        const rating = typeof evaluation.rating === 'number' ? evaluation.rating : 0;
                        return acc + rating;
                    }, 0);
                    avgRating = sum / allEvaluations.length;
                }
                setAverageRating(avgRating);
            } catch (error) {
                console.error("Error loading statistics", error);
                if (!cancelled) {
                    setServicesRendered(0);
                    setServicesReceived(0);
                    setAverageRating(0);
                }
            } finally {
                if (!cancelled) {
                    setLoadingStats(false);
                }
            }
        };

        loadStats();

        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    // Load oldest reservation to evaluate
    React.useEffect(() => {
        if (!currentUserId) {
            setReservationToEvaluate(null);
            setLoadingReservationToEvaluate(false);
            return;
        }

        let cancelled = false;
        setLoadingReservationToEvaluate(true);

        const loadReservationToEvaluate = async () => {
            try {
                const params = new URLSearchParams({
                    userId: String(currentUserId),
                });
                const res = await fetch(`/api/reservations?${params.toString()}`);
                const data = await res.json();
                const reservations = data?.reservations || (Array.isArray(data) ? data : []);

                if (cancelled) return;

                // Filter reservations with status "to_evaluate"
                const toEvaluate = reservations.filter((r: any) => 
                    String(r.status) === 'to_evaluate' && String(r.userId) === String(currentUserId)
                );

                if (toEvaluate.length === 0) {
                    if (!cancelled) {
                        setReservationToEvaluate(null);
                    }
                    return;
                }

                // Sort by date (oldest first) - use reservation date, then updatedAt, then createdAt
                toEvaluate.sort((a: any, b: any) => {
                    const dateA = a.date || a.updatedAt || a.createdAt || '';
                    const dateB = b.date || b.updatedAt || b.createdAt || '';
                    // Sort ascending (oldest first)
                    return dateA.localeCompare(dateB);
                });

                // Get the oldest one (first in sorted array)
                const oldestReservation = toEvaluate[0];

                // Load announcement data
                const announcementsList = Array.isArray(announcements) ? announcements : [];
                const announcement = announcementsList.find(
                    (a: any) => String(a.id) === String(oldestReservation.announcementId)
                );

                if (!announcement) {
                    if (!cancelled) {
                        setReservationToEvaluate(null);
                    }
                    return;
                }

                // Get provider name
                const users = (usersData as any).users ?? [];
                const provider = users.find((u: any) => String(u.id) === String(announcement.userId));
                let providerName = 'Prestataire';
                if (provider) {
                    const prenom = provider.prenom || '';
                    const nom = provider.nom || '';
                    if (prenom && nom) {
                        providerName = `${prenom} ${nom.charAt(0).toUpperCase()}.`;
                    } else if (prenom) {
                        providerName = prenom;
                    } else if (nom) {
                        providerName = `${nom.charAt(0).toUpperCase()}.`;
                    } else if (provider.name) {
                        providerName = provider.name;
                    }
                }

                // Format completed date
                const completedDate = oldestReservation.updatedAt || oldestReservation.createdAt || '';
                const formattedDate = completedDate 
                    ? dayjs(completedDate).locale('fr').format('D MMM YYYY')
                    : '';

                if (!cancelled) {
                    setReservationToEvaluate({
                        reservation: oldestReservation,
                        announcement,
                        providerName,
                        completedDate: formattedDate,
                    });
                }
            } catch (error) {
                console.error("Error loading reservation to evaluate", error);
                if (!cancelled) {
                    setReservationToEvaluate(null);
                }
            } finally {
                if (!cancelled) {
                    setLoadingReservationToEvaluate(false);
                }
            }
        };

        loadReservationToEvaluate();

        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    // Load most recent favorite announcement
    React.useEffect(() => {
        if (!currentUserId) {
            setRecommendedAnnouncement(null);
            setLoadingRecommended(false);
            return;
        }

        let cancelled = false;
        setLoadingRecommended(true);

        const loadRecommendedAnnouncement = async () => {
            try {
                // Load favorites
                const favoritesParams = new URLSearchParams({
                    userId: String(currentUserId),
                });
                const favoritesRes = await fetch(`/api/favorites?${favoritesParams.toString()}`);
                const favoritesData = await favoritesRes.json();

                if (cancelled) return;

                if (!favoritesRes.ok || !favoritesData.favorites || !Array.isArray(favoritesData.favorites)) {
                    if (!cancelled) {
                        setRecommendedAnnouncement(null);
                    }
                    return;
                }

                const favoriteIds = favoritesData.favorites.map((f: any) => f.announcementId);
                
                if (favoriteIds.length === 0) {
                    if (!cancelled) {
                        setRecommendedAnnouncement(null);
                    }
                    return;
                }

                // Load announcements
                const announcementsList = Array.isArray(announcements) ? announcements : [];
                const favoriteAnnouncements = announcementsList.filter((a: any) =>
                    favoriteIds.some((favId: number | string) => String(favId) === String(a.id))
                );

                if (favoriteAnnouncements.length === 0) {
                    if (!cancelled) {
                        setRecommendedAnnouncement(null);
                    }
                    return;
                }

                // Sort by createdAt (most recent first)
                favoriteAnnouncements.sort((a: any, b: any) => {
                    const dateA = a.createdAt || '';
                    const dateB = b.createdAt || '';
                    // Sort descending (most recent first)
                    return dateB.localeCompare(dateA);
                });

                // Get the most recent one (first in sorted array)
                const mostRecent = favoriteAnnouncements[0];

                if (!cancelled) {
                    setRecommendedAnnouncement(mostRecent);
                }
            } catch (error) {
                console.error("Error loading recommended announcement", error);
                if (!cancelled) {
                    setRecommendedAnnouncement(null);
                }
            } finally {
                if (!cancelled) {
                    setLoadingRecommended(false);
                }
            }
        };

        loadRecommendedAnnouncement();

        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    // Load next reservation (closest upcoming)
    React.useEffect(() => {
        if (!currentUserId) {
            setNextReservation(null);
            setLoadingNextReservation(false);
            return;
        }

        let cancelled = false;
        setLoadingNextReservation(true);

        const loadNextReservation = async () => {
            try {
                const params = new URLSearchParams({
                    userId: String(currentUserId),
                });
                const res = await fetch(`/api/reservations?${params.toString()}`);
                const data = await res.json();
                const reservations = data?.reservations || (Array.isArray(data) ? data : []);

                if (cancelled) return;

                // Filter reservations that are upcoming (status: "reserved" or "to_pay")
                const now = dayjs();
                const upcoming = reservations.filter((r: any) => {
                    const status = r.status || 'to_pay';
                    // Only show "reserved" or "to_pay" status
                    if (status !== 'reserved' && status !== 'to_pay') return false;
                    // Check if date is in the future
                    if (!r.date) return false;
                    const reservationDate = dayjs(r.date);
                    return reservationDate.isAfter(now) || reservationDate.isSame(now, 'day');
                });

                if (upcoming.length === 0) {
                    if (!cancelled) {
                        setNextReservation(null);
                    }
                    return;
                }

                // Load announcements to get slot information
                const announcementsList = Array.isArray(announcements) ? announcements : [];
                
                // Calculate full datetime for each reservation and sort
                const reservationsWithDateTime = upcoming.map((r: any) => {
                    const announcement = announcementsList.find(
                        (a: any) => String(a.id) === String(r.announcementId)
                    );
                    if (!announcement || !announcement.slots || !announcement.slots[r.slotIndex]) {
                        return null;
                    }
                    const slot = announcement.slots[r.slotIndex];
                    const reservationDate = dayjs(r.date);
                    const slotStart = slot.start ? dayjs(slot.start) : null;
                    const fullDateTime = slotStart 
                        ? reservationDate.hour(slotStart.hour()).minute(slotStart.minute())
                        : reservationDate.startOf('day');
                    
                    return {
                        reservation: r,
                        announcement,
                        fullDateTime,
                    };
                }).filter((item: any) => item !== null);

                if (reservationsWithDateTime.length === 0) {
                    if (!cancelled) {
                        setNextReservation(null);
                    }
                    return;
                }

                // Sort by fullDateTime (closest first)
                reservationsWithDateTime.sort((a: any, b: any) => {
                    return a.fullDateTime.valueOf() - b.fullDateTime.valueOf();
                });

                // Get the closest one (first in sorted array)
                const closest = reservationsWithDateTime[0];
                const { reservation, announcement, fullDateTime } = closest;

                // Get provider name
                const users = (usersData as any).users ?? [];
                const provider = users.find((u: any) => String(u.id) === String(announcement.userId));
                let providerName = 'Prestataire';
                if (provider) {
                    const prenom = provider.prenom || '';
                    const nom = provider.nom || '';
                    if (prenom && nom) {
                        providerName = `${prenom} ${nom.charAt(0).toUpperCase()}.`;
                    } else if (prenom) {
                        providerName = prenom;
                    } else if (nom) {
                        providerName = `${nom.charAt(0).toUpperCase()}.`;
                    } else if (provider.name) {
                        providerName = provider.name;
                    }
                }

                // Format date and time
                const formattedDate = fullDateTime.locale('fr').format('D MMM YYYY');
                const formattedTime = fullDateTime.format('HH:mm');
                
                // Calculate relative date (aujourd'hui, demain, dans x jours)
                const today = dayjs().startOf('day');
                const reservationDay = fullDateTime.startOf('day');
                const diffDays = reservationDay.diff(today, 'day');
                let relativeDate = '';
                if (diffDays === 0) {
                    relativeDate = "aujourd'hui";
                } else if (diffDays === 1) {
                    relativeDate = "demain";
                } else {
                    relativeDate = `dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
                }

                if (!cancelled) {
                    setNextReservation({
                        reservation,
                        announcement,
                        providerName,
                        formattedDate,
                        formattedTime,
                        relativeDate,
                    });
                }
            } catch (error) {
                console.error("Error loading next reservation", error);
                if (!cancelled) {
                    setNextReservation(null);
                }
            } finally {
                if (!cancelled) {
                    setLoadingNextReservation(false);
                }
            }
        };

        loadNextReservation();

        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    const stats = [
        { label: "Services rendus", value: String(servicesRendered) },
        { label: "Services reçus", value: String(servicesReceived) },
        { label: "Note moyenne", value: averageRating > 0 ? averageRating.toFixed(1) : "0" },
    ]
    return (
        <>
           <div className="homeContainer">
            {/* {
                (Array.isArray(navItems) ? navItems : []).map(({ id, label, icon: Icon }) => (
                    <div
                    key={id}
                    className="homeRedirectItem"
                    >
                        <Icon style={{ color: '#ff9202', fontSize: 40 }} />
                        <span>{label}</span>
                    </div>
                ))
            } */}
                <Button 
                    fullWidth 
                    variant="contained"
                    color='secondary'
                    startIcon={<AddCircleOutlineOutlined sx={{ color: "white" }} />}
                    sx={{ borderRadius: "15px", color: 'white', textTransform: "capitalize"}}
                    onClick={() =>{
                        setCurrentPage("publish");
                    }}
                    >
                    Publier une annonce
                </Button>
                {loadingNextReservation ? (
                    <div className='nextRDV' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                        <CircularProgress size={24} sx={{ color: "#1ea792" }} />
                    </div>
                ) : nextReservation ? (
                    <div className='nextRDV'>
                        <div className='nextRDVC1'>
                            <div className='nextRDVC1Title'>
                                <Today sx={{ color: "white" }}/>
                                <span className='T1'>Prochain RDV</span>
                            </div>
                            <div className='nextRDVBadge'><span className='T6'>{nextReservation.relativeDate}</span></div>
                        </div>
                        <div className='nextRDVC2'>
                            <span className='T4'>{nextReservation.announcement.title} avec {nextReservation.providerName}</span>
                        </div>
                        <div className='nextRDVC3'>
                            <div style={{ display: 'flex', columnGap: "3px"}}>
                                <Schedule sx={{ color: "white"}}/>
                                <span className='T7'>{nextReservation.formattedDate} - {nextReservation.formattedTime}</span>
                            </div>
                        </div>
                    </div>
                ) : null}
                {loadingRecommended ? (
                    <div className='announcementsPromoted' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                        <CircularProgress size={24} sx={{ color: "#ff9202" }} />
                    </div>
                ) : recommendedAnnouncement ? (
                    <div className='announcementsPromoted'>
                        <div className='announcementsPromotedHeader'>
                            <LightbulbCircleOutlined sx={{ color: "#ff9202"}}/>
                            <span className='T2'>Annonces recommandée</span>
                        </div>
                        <AnnouncementCard announcement={recommendedAnnouncement}/>
                    </div>
                ) : null}
                {loadingReservationToEvaluate ? (
                    <div className='anouncementActionRequire' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                        <CircularProgress size={24} sx={{ color: "#ff9202" }} />
                    </div>
                ) : reservationToEvaluate ? (
                    <div className='anouncementActionRequire'>
                        <div style={{display: 'flex', alignItems: 'center', columnGap: "5px"}}>
                            <StarOutlineOutlined sx={{ color: "#ff9202"}}/>
                            <span className='T2'>Annonces à évaluer</span>
                        </div>
                        <span className='T4'>{reservationToEvaluate.announcement.title} par {reservationToEvaluate.providerName}</span>
                        {reservationToEvaluate.completedDate && (
                            <span className='T6' style={{ color: "#8c8c8c"}}>
                                Complété le {reservationToEvaluate.completedDate}
                            </span>
                        )}
                        <div 
                            className='anouncementActionRequireBtn' 
                            onClick={() => {
                                if (setCurrentPage && setSelectedReservationId) {
                                    setSelectedReservationId(reservationToEvaluate.reservation.id);
                                    setCurrentPage('evaluate');
                                }
                            }}
                        >
                            <span className='T6'>Action requise</span>
                        </div>
                    </div>
                ) : null}
                <div className='statsRecap'>
                    <div style={{display: 'flex', alignItems: 'center', columnGap: "5px"}}>
                        <StarsOutlined  sx={{ color: "#1ea792"}}/>
                        <span className='T2'>Vos statistiques</span>
                    </div>

                    <div className='statsRecapContent'>
                        {loadingStats ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '20px' }}>
                                <CircularProgress size={24} sx={{ color: "#03A689" }} />
                            </div>
                        ) : (
                            stats.map(({ label, value }) => (
                                <div key={label} className='statsRecapItem'>
                                    <span style={{color: "#03A689"}}>{value}</span>
                                    <span className='T7' style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'wrap', flex: 1 }}>{label}</span>
                                </div>
                            ))
                        )}
                    </div>
            </div>
        </div>
        </>
    );
}