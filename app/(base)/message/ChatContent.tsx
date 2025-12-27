"use client";

import React from "react";
import SendRounded from "@mui/icons-material/SendRounded";
import ImageIcon from '@mui/icons-material/Image';
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccessTime from '@mui/icons-material/AccessTime';
import LocationOn from '@mui/icons-material/LocationOn';
import { useContent } from "../ContentContext";
import "./index.css";
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { fetchWithAuth } from '../lib/auth';

dayjs.locale('fr');

type ChatMessage = {
  id: string;
  author: "me" | "other";
  text: string;
  time: string;
  date: string; // Full date for grouping
  dateLabel: string; // Formatted date label (DD:MM:YY)
};

// Utility functions for distance calculation (copied from AnnouncementDetails.tsx)
function haversineDistanceKm(a: {lat: number, lng: number}, b: {lat: number, lng: number}) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function getUserCoords(u: any): {lat: number, lng: number} | null {
  if (!u) return null;
  const lat = u.latitude ?? u.lat ?? (u.position?.lat);
  const lng = u.longitude ?? u.lng ?? (u.position?.lng);
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
}

function buildAddress(u: any): string {
  if (!u) return '';
  const parts = [u.adresse, u.codePostal, u.ville, u.pays].filter(Boolean);
  return parts.join(' ');
}

async function geocodeAddress(address: string, country?: string): Promise<{lat: number, lng: number} | null> {
  try {
    if (!address || typeof window === 'undefined') return null;
    const query = (address + (country ? ' ' + country : '')).trim();
    const cacheKey = 'proximis_geocode_' + encodeURIComponent(query.toLowerCase());
    const ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const obj = JSON.parse(cached);
        if (obj && obj.lat != null && obj.lng != null && obj.ts && (Date.now() - obj.ts) < ttlMs) {
          return { lat: Number(obj.lat), lng: Number(obj.lng) };
        }
      }
    } catch {}

    const countryParam = country && /france|^fr$/i.test(country) ? '&countrycodes=fr' : '';
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0${countryParam}&q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'Proximis/1.0',
      },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json && json[0] && typeof json[0].lat === 'string' && typeof json[0].lon === 'string') {
      const result = { lat: Number(json[0].lat), lng: Number(json[0].lon) };
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ...result, ts: Date.now() }));
      } catch {}
      return result;
    }
    return null;
  } catch (e) {
    console.error('Geocoding error:', e);
    return null;
  }
}

export default function ChatContent() {
  const {
    selectedConversationId,
    setSelectedConversationId,
    setHeaderTitle,
    setCurrentPage,
    currentPage,
    history,
    currentUserId,
    setSelectedReservationId,
    setSelectedAnnouncementId,
    setEvaluationData,
  } = useContent();

  const [conversationData, setConversationData] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState<string>('');
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = React.useRef<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [otherUserName, setOtherUserName] = React.useState<string>('Utilisateur');
  const [otherUserAvatar, setOtherUserAvatar] = React.useState<string>('/photo1.svg');
  const [announcementTitle, setAnnouncementTitle] = React.useState<string>('Annonce');
  const [announcementPhoto, setAnnouncementPhoto] = React.useState<string>('/photo1.svg');
  const [reservationDate, setReservationDate] = React.useState<string>('');
  const [reservationTime, setReservationTime] = React.useState<string>('');
  const [reservationDay, setReservationDay] = React.useState<string>('');
  const [reservationLocation, setReservationLocation] = React.useState<string>('');
  const [statusLabel, setStatusLabel] = React.useState<string>('Réservé');
  const [statusColor, setStatusColor] = React.useState<string>('#1ea792');
  const [reservationId, setReservationId] = React.useState<number | string | null>(null);
  const [announcementId, setAnnouncementId] = React.useState<number | string | null>(null);
  const [reservationStatus, setReservationStatus] = React.useState<string>('reserved');

  // Note: we avoid loading all users/announcements here to speed up conversation load.
  // ChatContent will fetch only the specific user and announcement needed for the opened conversation.

  // Load conversation data from API
  React.useEffect(() => {
    // Try to get conversation ID from state or localStorage as fallback
    const conversationId = selectedConversationId || (typeof window !== 'undefined' ? localStorage.getItem('proximis_selectedConversationId') : null);
    
    if (!conversationId || !currentUserId) {
      setLoading(false);
      return;
    }
    
    // If we got ID from localStorage but not from state, update state
    if (!selectedConversationId && conversationId && setSelectedConversationId) {
      setSelectedConversationId(conversationId);
    }

    const loadConversation = async () => {
      try {
        const params = new URLSearchParams({
          conversationId: conversationId,
        });
        const res = await fetchWithAuth(`/api/conversations?${params.toString()}`);
        const data = await res.json();

        console.log('ChatContent API Response:', {
          conversationId,
          selectedConversationId,
          currentUserId,
          resOk: res.ok,
          hasConversation: !!data.conversation,
          hasMessages: !!data.messages,
          messagesCount: data.messages?.length || 0,
          data
        });

        if (res.ok && data.conversation && data.messages && Array.isArray(data.messages)) {
          setConversationData(data.conversation);

          // Get other user info from enriched conversation data
          const convFromUserId = typeof data.conversation.fromUserId === 'number' ? data.conversation.fromUserId : Number(data.conversation.fromUserId);
          const convToUserId = typeof data.conversation.toUserId === 'number' ? data.conversation.toUserId : Number(data.conversation.toUserId);
          const currentUserIdNum = Number(currentUserId);

          const isFromCurrentUser = convFromUserId === currentUserIdNum;
          const otherUserData = isFromCurrentUser ? data.conversation.toUser : data.conversation.fromUser;

          // Set user name and avatar from enriched data
          if (otherUserData) {
            const name = `${otherUserData.prenom || ''} ${otherUserData.nom || ''}`.trim() || otherUserData.email || 'Utilisateur';
            setOtherUserName(name);
            setOtherUserAvatar(otherUserData.photo || '/photo1.svg');
          }

          // Get announcement info from enriched conversation data
          if (data.conversation.announcement) {
            const ann = data.conversation.announcement;
            setAnnouncementTitle(ann.title || 'Annonce');
            setAnnouncementPhoto(ann.photo || '/photo1.svg');
            // Store announcement ID for navigation (used when no reservation or status is "completed" or "contacter")
            if (ann.id) {
              setAnnouncementId(ann.id);
            }
          }
          
          // Calculate distance between announcement owner and the user who reserved (other user)
          if (data.conversation.announcementOwner && otherUserData) {
            let cancelled = false;
            const computeDistance = async () => {
              setReservationLocation('');
              const owner = data.conversation.announcementOwner;
              const reservedBy = otherUserData;
              
              const directOwner = getUserCoords(owner);
              const directReservedBy = getUserCoords(reservedBy);
              let ownerCoords = directOwner;
              let reservedByCoords = directReservedBy;
              
              if (!ownerCoords) {
                const addrOwner = buildAddress(owner);
                ownerCoords = await geocodeAddress(addrOwner, owner?.pays);
              }
              if (!reservedByCoords) {
                const addrReservedBy = buildAddress(reservedBy);
                reservedByCoords = await geocodeAddress(addrReservedBy, reservedBy?.pays);
              }
              
              if (!cancelled) {
                if (ownerCoords && reservedByCoords) {
                  const distanceKm = haversineDistanceKm(reservedByCoords, ownerCoords);
                  // Convert km to meters if less than 1 km, otherwise show in km
                  if (distanceKm < 1) {
                    const meters = Math.round(distanceKm * 1000);
                    setReservationLocation(`à ${meters}m`);
                  } else {
                    setReservationLocation(`à ${distanceKm.toFixed(1)} km`);
                  }
                } else {
                  setReservationLocation('');
                }
              }
            };
            computeDistance();
          }

          // Get reservation info from enriched conversation data
          if (data.conversation.reservation) {
            const reservation = data.conversation.reservation;
            // Store reservation and announcement IDs for navigation
            if (reservation.id) {
              setReservationId(reservation.id);
            }
            if (data.conversation.announcement?.id) {
              setAnnouncementId(data.conversation.announcement.id);
            }
            
            // Format date (e.g., "15 octobre 2025")
            if (reservation.date) {
              const resDate = dayjs(reservation.date);
              setReservationDate(resDate.format('D MMMM YYYY'));
            }
            console.log("data.conversation.announcement", data.conversation.announcement);
            
            // Get slot time and day from announcement slots
            if (data.conversation.announcement && data.conversation.announcement.slots && reservation.slotIndex !== null && reservation.slotIndex !== undefined) {
              const slot = data.conversation.announcement.slots[reservation.slotIndex];
              if (slot) {
                // Get day label
                const dayId = slot.day;
                if (dayId) {
                  const dayMap: Record<number, string> = { 
                    1: 'Lundi', 
                    2: 'Mardi', 
                    3: 'Mercredi', 
                    4: 'Jeudi', 
                    5: 'Vendredi', 
                    6: 'Samedi', 
                    7: 'Dimanche' 
                  };
                  setReservationDay(dayMap[dayId] || '');
                }
                
                // Get time slot
                const start = slot.start ? dayjs(slot.start).format('HH:mm').replace(':', 'h') : '';
                const end = slot.end ? dayjs(slot.end).format('HH:mm').replace(':', 'h') : '';
                setReservationTime(start && end ? `${start} - ${end}` : '');
              }
            }

            // Set status based on reservation status
            const status = reservation.status || 'reserved';
            setReservationStatus(status);
            switch (status) {
              case 'to_pay':
                setStatusLabel('À régler');
                setStatusColor('#ffc107');
                break;
              case 'reserved':
                setStatusLabel('Réservé');
                setStatusColor('#1ea792');
                break;
              case 'to_evaluate':
                setStatusLabel('À évaluer');
                setStatusColor('#ff9800');
                break;
              case 'completed':
                setStatusLabel('Terminé');
                setStatusColor('#e0e0e0');
                break;
              default:
                setStatusLabel('Réservé');
                setStatusColor('#1ea792');
            }
          } else {
            // No reservation - set default values
            setReservationDate('');
            setReservationTime('');
            setReservationDay('');
            setReservationLocation('');
            setStatusLabel('Réservé');
            setStatusColor('#1ea792');
            setReservationStatus('contacter'); // No reservation = "Contacter" status
            // Store announcement ID if available
            if (data.conversation.announcement?.id) {
              setAnnouncementId(data.conversation.announcement.id);
            }
          }

          // Transform messages to ChatMessage format
          const transformedMessages: ChatMessage[] = data.messages
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((msg: any) => {
              const msgFromUserId = typeof msg.fromUserId === 'number' ? msg.fromUserId : Number(msg.fromUserId);
              const isMe = msgFromUserId === currentUserIdNum;
              const msgTime = dayjs(msg.createdAt);
              const now = dayjs();

              // Format time (HH:mm)
              const timeStr = msgTime.format('HH:mm');
              
              // Format date (DD:MM:YY) for grouping and display
              const dateStr = msgTime.format('YYYY-MM-DD'); // For grouping
              const dateLabel = msgTime.format('DD/MM/YY'); // For display

              return {
                id: msg.id,
                author: isMe ? 'me' : 'other',
                text: msg.text,
                time: timeStr,
                date: dateStr,
                dateLabel: dateLabel,
              };
            });

          console.log('Transformed messages:', transformedMessages);
          setMessages(transformedMessages);

          // Mark all unread messages as read when conversation is opened
          try {
            const markReadRes = await fetchWithAuth('/api/messages', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId: conversationId,
                userId: currentUserId,
              }),
            });
            
            if (markReadRes.ok) {
              const markReadData = await markReadRes.json();
              console.log('Messages marked as read:', markReadData.updatedCount);
              // Notify other parts of the UI that messages were marked as read
              try {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('messagesRead', {
                    detail: {
                      conversationId: conversationId,
                      userId: currentUserId,
                      updatedCount: Number(markReadData.updatedCount || 0),
                    }
                  }));
                }
              } catch (e) {
                // ignore
              }
            } else {
              console.warn('Failed to mark messages as read');
            }
          } catch (error) {
            console.error('Error marking messages as read:', error);
          }

          // Subscribe to SSE for real-time messages
          const connectSSE = () => {
            if (typeof window === 'undefined' || !conversationId) return;
            
            // Close existing connection
            if (eventSourceRef.current) {
              try { 
                eventSourceRef.current.close(); 
              } catch (e) {}
              eventSourceRef.current = null;
            }
            
            // Clear any pending reconnect
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            
            try {
              // EventSource doesn't support custom headers, so we pass token in URL
              const token = typeof window !== 'undefined' ? localStorage.getItem('proximis_token') : null;
              const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
              const es = new EventSource(`/api/messages/stream?conversationId=${encodeURIComponent(conversationId)}${tokenParam}`);
              
              es.onopen = () => {
                console.log('SSE connection opened');
                reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
              };
              
              es.onmessage = (ev) => {
                try {
                  // Skip keep-alive comments
                  if (ev.data.trim() === ':keep-alive' || ev.data.startsWith(':')) {
                    return;
                  }
                  
                  const parsed = JSON.parse(ev.data);
                  
                  if (parsed && parsed.type === 'message' && parsed.message) {
                    const msg = parsed.message;
                    const msgTime = dayjs(msg.createdAt);
                    const timeStr = msgTime.format('HH:mm');
                    const dateStr = msgTime.format('YYYY-MM-DD');
                    const dateLabel = msgTime.format('DD/MM/YY');
                    const isMe = Number(msg.fromUserId) === Number(currentUserId);
                    
                    // Check if message already exists to avoid duplicates
                    setMessages((prev) => {
                      const exists = prev.some(m => m.id === msg.id);
                      if (exists) return prev;
                      return [...prev, { 
                        id: msg.id, 
                        author: isMe ? 'me' : 'other', 
                        text: msg.text, 
                        time: timeStr,
                        date: dateStr,
                        dateLabel: dateLabel,
                      }];
                    });
                  } else if (parsed && parsed.type === 'connected') {
                    console.log('SSE connected to conversation:', conversationId);
                  }
                } catch (e) {
                  console.warn('Error parsing SSE message:', e);
                }
              };
              
              es.onerror = (err) => {
                console.warn('SSE error, attempting reconnect...', err);
                
                // Close the connection
                try {
                  es.close();
                } catch (e) {}
                
                // Reconnect with exponential backoff (max 30 seconds)
                const maxAttempts = 10;
                if (reconnectAttemptsRef.current < maxAttempts) {
                  reconnectAttemptsRef.current += 1;
                  const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
                  
                  reconnectTimeoutRef.current = setTimeout(() => {
                    console.log(`Reconnecting SSE (attempt ${reconnectAttemptsRef.current})...`);
                    connectSSE();
                  }, delay);
                } else {
                  console.error('Max SSE reconnect attempts reached');
                }
              };
              
              eventSourceRef.current = es;
            } catch (e) {
              console.error('Error creating SSE connection:', e);
              // Retry after a delay
              reconnectTimeoutRef.current = setTimeout(() => {
                connectSSE();
              }, 5000);
            }
          };
          
          connectSSE();
        } else {
          console.log('No conversation or messages found:', { resOk: res.ok, hasConversation: !!data.conversation, hasMessages: !!data.messages, data });
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading conversation', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [selectedConversationId, currentUserId, setSelectedConversationId]);

  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle(otherUserName);
    return () => setHeaderTitle && setHeaderTitle(null);
  }, [otherUserName, setHeaderTitle]);

  // Cleanup EventSource on unmount
  React.useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try { 
          eventSourceRef.current.close(); 
        } catch (e) {}
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    };
  }, []);

  // Ensure the selected conversation stays consistent when we navigate back
  React.useEffect(() => {
    if (!selectedConversationId && setSelectedConversationId && conversationData) {
      setSelectedConversationId(conversationData.id);
    }
  }, [conversationData, selectedConversationId, setSelectedConversationId]);

  // Ensure history is set correctly when arriving from payment
  // The payment already sets history to ['home', 'messages'], so we don't need to change it
  // Only fix history if it's completely empty (shouldn't happen with proper navigation)
  React.useEffect(() => {
    // Use a small delay to avoid interfering with navigation from payment
    if (history.length === 0 && setCurrentPage) {
      const timer = setTimeout(() => {
        setCurrentPage('message_chat', ['home', 'messages']);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle click on chat header card based on reservation status
  const handleCardClick = () => {
    const status = reservationStatus || 'reserved';
    
    switch (status) {
      case 'to_pay':
        // Navigate to payment page
        if (reservationId && setSelectedReservationId && setCurrentPage) {
          setSelectedReservationId(reservationId);
          setCurrentPage('reservation', [...history, 'message_chat']);
        }
        break;
      case 'to_evaluate':
        // Navigate to evaluation page
        if (reservationId && setSelectedReservationId && setCurrentPage) {
          setSelectedReservationId(reservationId);
          setCurrentPage('evaluate', [...history, 'message_chat']);
        }
        break;
      case 'reserved':
        // Already in conversation, do nothing (or could navigate to reservations)
        // For now, do nothing as requested
        break;
      case 'completed':
        // Navigate to announcement details
        if (announcementId && setSelectedAnnouncementId && setCurrentPage) {
          setSelectedAnnouncementId(announcementId);
          setCurrentPage('announce_details', [...history, 'message_chat']);
        }
        break;
      case 'contacter':
      default:
        // No status (Contacter) or default: Navigate to announcement details
        if (announcementId && setSelectedAnnouncementId && setCurrentPage) {
          setSelectedAnnouncementId(announcementId);
          setCurrentPage('announce_details', [...history, 'message_chat']);
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="chatPage">
        <div style={{ padding: 16, textAlign: "center" }}>Chargement de la conversation...</div>
      </div>
    );
  }

  if (!conversationData) {
    return (
      <div className="chatPage">
        <div style={{ padding: 16, textAlign: "center" }}>Conversation introuvable</div>
      </div>
    );
  }

  return (
    <div className="chatPage">
      <div 
        className="chatHeaderCard" 
        onClick={handleCardClick}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div
          className="chatHeaderAvatar"
          style={{ backgroundImage: `url('${announcementPhoto}')` }}
        />
        <div className="chatHeaderInfo">
          <div className="chatHeaderTitleRow">
            <span className="T4 TBold">{announcementTitle}</span>
            <span
              className="chatBadge"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          {reservationDay && (
            <div className="T7" style={{ marginTop: '4px' }}>
              {reservationDay}
            </div>
          )}
          {reservationTime && (
            <div className="T7" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AccessTime sx={{ fontSize: 14 }} />
              {reservationTime}
            </div>
          )}
          <div className="chatHeaderMeta" style={{ marginTop: '4px' }}>
            {reservationDate && (
              <span className="T7" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarToday sx={{ fontSize: 14 }} />
                {reservationDate}
              </span>
            )}
            {reservationLocation && (
              <span className="T7" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LocationOn sx={{ fontSize: 14 }} />
                {reservationLocation}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="chatMessages">
        {messages.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", color: "#8c8c8c" }}>
            Aucun message dans cette conversation
          </div>
        ) : (
          messages.map((message, index) => {
            // Check if we need to show a date separator
            const showDateSeparator = index === 0 || 
              (index > 0 && messages[index - 1].date !== message.date);
            
            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="chatDateSeparator">
                    <span className="T7">{message.dateLabel}</span>
                  </div>
                )}
                <div
                  className={`chatBubble ${
                    message.author === "me" ? "me" : "other"
                  }`}
                >
                  <span className="T5">{message.text}</span>
                  <span className="T7 chatTime">{message.time}</span>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="chatInputBar">
        <button className="chatIconButton" aria-label="ajouter une pièce jointe">
          <ImageIcon sx={{ color: "#FFF" }} />
        </button>
        <input
          className="chatInput"
          type="text"
          placeholder="Ecrire un message"
          aria-label="Ecrire un message"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button className="chatSendButton" aria-label="envoyer" onClick={() => handleSendMessage()}>
          <SendRounded sx={{ color: "#ffffff" }} />
        </button>
      </div>
    </div>
  );

  async function handleSendMessage() {
    if (!inputValue || inputValue.trim() === '') return;
    if (!conversationData) return;
    try {
      const payload = {
        conversationId: conversationData.id,
        fromUserId: Number(currentUserId),
        toUserId: Number(conversationData.fromUserId === Number(currentUserId) ? conversationData.toUserId : conversationData.fromUserId),
        text: inputValue.trim(),
      };
      const res = await fetchWithAuth('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = data.message;
        const msgTime = dayjs(msg.createdAt);
        const timeStr = msgTime.format('HH:mm');
        const dateStr = msgTime.format('YYYY-MM-DD');
        const dateLabel = msgTime.format('DD/MM/YY');
        setMessages((prev) => [...prev, { 
          id: msg.id, 
          author: 'me', 
          text: msg.text, 
          time: timeStr,
          date: dateStr,
          dateLabel: dateLabel,
        }]);
        setInputValue('');
      } else {
        console.error('Error sending message', await res.text());
      }
    } catch (e) {
      console.error('Error sending message', e);
    }
  }
}

