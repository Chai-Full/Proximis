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
  const [loading, setLoading] = React.useState(true);
  const [otherUserName, setOtherUserName] = React.useState<string>('Utilisateur');
  const [otherUserAvatar, setOtherUserAvatar] = React.useState<string>('/photo1.svg');
  const [announcementTitle, setAnnouncementTitle] = React.useState<string>('Annonce');
  const [reservationDate, setReservationDate] = React.useState<string>('');
  const [reservationTime, setReservationTime] = React.useState<string>('');
  const [reservationLocation, setReservationLocation] = React.useState<string>('');
  const [statusLabel, setStatusLabel] = React.useState<string>('Réservé');
  const [statusColor, setStatusColor] = React.useState<string>('#1ea792');
  const [users, setUsers] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

  // Load users and announcements from MongoDB
  React.useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        // Load users
        const usersRes = await fetchWithAuth('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            if (!cancelled) setUsers(usersData.users);
          }
        }

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
      } catch (error) {
        console.error('Error loading data', error);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

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
          const convFromUserId = typeof data.conversation.fromUserId === 'number' 
            ? data.conversation.fromUserId 
            : Number(data.conversation.fromUserId);
          const convToUserId = typeof data.conversation.toUserId === 'number' 
            ? data.conversation.toUserId 
            : Number(data.conversation.toUserId);
          const currentUserIdNum = Number(currentUserId);
          
          const otherUserId = convFromUserId === currentUserIdNum
            ? convToUserId
            : convFromUserId;
          const otherUser = users.find((u: any) => Number(u.id) === Number(otherUserId));
          
          if (otherUser) {
            const name = `${otherUser.prenom || ''} ${otherUser.nom || ''}`.trim() || otherUser.email || 'Utilisateur';
            setOtherUserName(name);
            setOtherUserAvatar(otherUser.photo || '/photo1.svg');
          }

          // Get announcement info
          // Convert to numbers for comparison since MongoDB stores them as numbers
          const convAnnouncementId = typeof data.conversation.announcementId === 'number' 
            ? data.conversation.announcementId 
            : Number(data.conversation.announcementId);
          const announcement = announcements.find((a: any) => Number(a.id) === convAnnouncementId);
          if (announcement) {
            setAnnouncementTitle(announcement.title || 'Annonce');
            setReservationLocation(announcement.scope ? `${announcement.scope} km` : '');
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
                  
                  // Get slot time from announcement
                  if (announcement && announcement.slots && announcement.slots[reservation.slotIndex]) {
                    const slot = announcement.slots[reservation.slotIndex];
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
        />
        <button className="chatSendButton" aria-label="envoyer">
          <SendRounded sx={{ color: "#ffffff" }} />
        </button>
      </div>
    </div>
  );
}

