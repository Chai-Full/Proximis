"use client";

import React from "react";
import SendRounded from "@mui/icons-material/SendRounded";
import ImageIcon from '@mui/icons-material/Image';
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
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
};

export default function ChatContent() {
  const {
    selectedConversationId,
    setSelectedConversationId,
    setHeaderTitle,
    setCurrentPage,
    currentPage,
    history,
    currentUserId,
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
  const [conversationAnnouncement, setConversationAnnouncement] = React.useState<any>(null);
  const [reservationDate, setReservationDate] = React.useState<string>('');
  const [reservationTime, setReservationTime] = React.useState<string>('');
  const [reservationLocation, setReservationLocation] = React.useState<string>('');
  const [statusLabel, setStatusLabel] = React.useState<string>('Réservé');
  const [statusColor, setStatusColor] = React.useState<string>('#1ea792');
  const [users, setUsers] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

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

          // Get other user info
          // Convert to numbers for comparison since MongoDB stores them as numbers
            const convFromUserId = typeof data.conversation.fromUserId === 'number' ? data.conversation.fromUserId : Number(data.conversation.fromUserId);
            const convToUserId = typeof data.conversation.toUserId === 'number' ? data.conversation.toUserId : Number(data.conversation.toUserId);
            const currentUserIdNum = Number(currentUserId);

            const otherUserId = convFromUserId === currentUserIdNum ? convToUserId : convFromUserId;

            // Fetch only the other user and the announcement in parallel to speed up load
            try {
              const userPromise = fetchWithAuth(`/api/users?userId=${encodeURIComponent(String(otherUserId))}`);
              const annId = data.conversation.announcementId;
              const annPromise = annId ? fetchWithAuth(`/api/annonces?announcementId=${encodeURIComponent(String(annId))}`) : Promise.resolve({ ok: false } as Response);

              const [userRes, annRes] = await Promise.all([userPromise, annPromise]);

              if (userRes.ok) {
                const userData = await userRes.json();
                const u = userData.user || null;
                if (u) {
                  const name = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email || 'Utilisateur';
                  setOtherUserName(name);
                  setOtherUserAvatar(u.photo || '/photo1.svg');
                }
              }

              if (annRes.ok) {
                const annData = await annRes.json();
                const ann = (annData?.data?.annonces && annData.data.annonces[0]) || null;
                if (ann) {
                  setAnnouncementTitle(ann.nomAnnonce || ann.nomAnnonce || 'Annonce');
                  setReservationLocation(ann.lieuAnnonce ? `${ann.lieuAnnonce} km` : '');
                  setConversationAnnouncement(ann);
                }
              }
            } catch (e) {
              console.error('Error fetching user/announcement for conversation', e);
            }

          // Get reservation info if exists
          if (data.conversation.reservationId) {
            // Load reservation from API
            try {
              const reservationParams = new URLSearchParams({
                reservationId: String(data.conversation.reservationId),
              });
              const reservationRes = await fetchWithAuth(`/api/reservations?${reservationParams.toString()}`);
              if (reservationRes.ok) {
                const reservationData = await reservationRes.json();
                const reservations = reservationData?.reservations || (Array.isArray(reservationData) ? reservationData : []);
                const reservation = reservations.find((r: any) => String(r.id) === String(data.conversation.reservationId));
                if (reservation) {
                  const resDate = dayjs(reservation.date);
                  setReservationDate(resDate.format('D MMMM YYYY'));
                  
                  // Get slot time from conversation announcement
                  if (conversationAnnouncement && conversationAnnouncement.slots && conversationAnnouncement.slots[reservation.slotIndex]) {
                    const slot = conversationAnnouncement.slots[reservation.slotIndex];
                    const start = slot.start ? dayjs(slot.start).format('HH:mm') : '';
                    const end = slot.end ? dayjs(slot.end).format('HH:mm') : '';
                    setReservationTime(start && end ? `${start} - ${end}` : '');
                  }

                  // Set status based on reservation status
                  const status = reservation.status || 'reserved';
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
                }
              }
            } catch (error) {
              console.error('Error loading reservation', error);
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
              const diffDays = now.diff(msgTime, 'day');

              let timeStr = '';
              if (diffDays === 0) {
                timeStr = msgTime.format('HH:mm');
              } else if (diffDays === 1) {
                timeStr = 'Hier ' + msgTime.format('HH:mm');
              } else if (diffDays < 7) {
                timeStr = msgTime.format('ddd HH:mm');
              } else {
                timeStr = msgTime.format('D MMM HH:mm');
              }

              return {
                id: msg.id,
                author: isMe ? 'me' : 'other',
                text: msg.text,
                time: timeStr,
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
              const es = new EventSource(`/api/messages/stream?conversationId=${encodeURIComponent(conversationId)}`);
              
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
                    const now = dayjs(msg.createdAt);
                    const timeStr = now.format('HH:mm');
                    const isMe = Number(msg.fromUserId) === Number(currentUserId);
                    
                    // Check if message already exists to avoid duplicates
                    setMessages((prev) => {
                      const exists = prev.some(m => m.id === msg.id);
                      if (exists) return prev;
                      return [...prev, { id: msg.id, author: isMe ? 'me' : 'other', text: msg.text, time: timeStr }];
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
  }, [selectedConversationId, currentUserId, setSelectedConversationId, users, announcements]);

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
      <div className="chatHeaderCard">
        <div
          className="chatHeaderAvatar"
          style={{ backgroundImage: `url('${otherUserAvatar}')` }}
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
          <div className="chatHeaderMeta">
            {reservationDate && <span className="T7">{reservationDate}</span>}
            {reservationTime && <span className="T7">• {reservationTime}</span>}
            {reservationLocation && <span className="T7">• {reservationLocation}</span>}
          </div>
        </div>
      </div>

      <div className="chatMessages">
        {messages.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", color: "#8c8c8c" }}>
            Aucun message dans cette conversation
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chatBubble ${
                message.author === "me" ? "me" : "other"
              }`}
            >
              <span className="T5">{message.text}</span>
              <span className="T7 chatTime">{message.time}</span>
            </div>
          ))
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
        const now = dayjs(msg.createdAt).format('HH:mm');
        setMessages((prev) => [...prev, { id: msg.id, author: 'me', text: msg.text, time: now }]);
        setInputValue('');
      } else {
        console.error('Error sending message', await res.text());
      }
    } catch (e) {
      console.error('Error sending message', e);
    }
  }
}

