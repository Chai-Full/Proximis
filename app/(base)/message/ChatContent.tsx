"use client";

import React from "react";
import SendRounded from "@mui/icons-material/SendRounded";
import ImageIcon from '@mui/icons-material/Image';
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import { useContent } from "../ContentContext";
import "./index.css";
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import usersData from '../../../data/users.json';
import announcementsData from '../../../data/announcements.json';
import reservationsData from '../../../data/reservations.json';

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
        const res = await fetch(`/api/messages?${params.toString()}`);
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
          const users = (usersData as any).users ?? [];
          const otherUserId = String(data.conversation.fromUserId) === String(currentUserId)
            ? data.conversation.toUserId
            : data.conversation.fromUserId;
          const otherUser = users.find((u: any) => String(u.id) === String(otherUserId));
          
          if (otherUser) {
            const name = `${otherUser.prenom || ''} ${otherUser.nom || ''}`.trim() || otherUser.email || 'Utilisateur';
            setOtherUserName(name);
            setOtherUserAvatar(otherUser.photo || '/photo1.svg');
          }

          // Get announcement info
          const announcements = Array.isArray(announcementsData) ? announcementsData : [];
          const announcement = announcements.find((a: any) => String(a.id) === String(data.conversation.announcementId));
          if (announcement) {
            setAnnouncementTitle(announcement.title || 'Annonce');
            setReservationLocation(announcement.scope ? `${announcement.scope} km` : '');
          }

          // Get reservation info if exists
          if (data.conversation.reservationId) {
            const reservations = (reservationsData as any).reservations ?? [];
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

          // Transform messages to ChatMessage format
          const transformedMessages: ChatMessage[] = data.messages
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((msg: any) => {
              const isMe = String(msg.fromUserId) === String(currentUserId);
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
  }, [selectedConversationId, currentUserId, setSelectedConversationId]);

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

