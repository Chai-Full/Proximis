"use client";

import React from "react";
import SendRounded from "@mui/icons-material/SendRounded";
import ImageIcon from '@mui/icons-material/Image';
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import { useContent } from "../ContentContext";
import "./index.css";

type ChatMessage = {
  id: string;
  author: "me" | "other";
  text: string;
  time: string;
};

type Conversation = {
  id: string;
  name: string;
  announcementTitle: string;
  date: string;
  time: string;
  location: string;
  statusLabel: string;
  statusColor: string;
  avatar: string;
  messages: ChatMessage[];
};

const conversations: Conversation[] = [
  {
    id: "marie",
    name: "Marie",
    announcementTitle: "Entretien jardin",
    date: "15 octobre 2025",
    time: "14h00 - 16h00",
    location: "Paris 15ème",
    statusLabel: "Réservé",
    statusColor: "#1ea792",
    avatar: "/photo1.svg",
    messages: [
      {
        id: "m1",
        author: "me",
        text: "Bonjour, je suis intéressé par votre service",
        time: "14h20",
      },
      {
        id: "m2",
        author: "other",
        text: "Bonjour ! Avec plaisir. Quand seriez-vous disponible ?",
        time: "14h22",
      },
      {
        id: "m3",
        author: "me",
        text: "Demain après-midi",
        time: "14h25",
      },
      {
        id: "m4",
        author: "other",
        text: "Parfait ! 14h ça vous va ?",
        time: "14h28",
      },
      {
        id: "m5",
        author: "me",
        text: "Oui parfait à demain !",
        time: "14h30",
      },
    ],
  },
];

export default function ChatContent() {
  const {
    selectedConversationId,
    setSelectedConversationId,
    setHeaderTitle,
  } = useContent();

  const conversation = React.useMemo(() => {
    const fallback = conversations[0];
    if (!selectedConversationId) return fallback;
    return conversations.find((c) => c.id === selectedConversationId) ?? fallback;
  }, [selectedConversationId]);

  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle(conversation.name);
    return () => setHeaderTitle && setHeaderTitle(null);
  }, [conversation.name, setHeaderTitle]);

  // Ensure the selected conversation stays consistent when we navigate back
  React.useEffect(() => {
    if (!selectedConversationId && setSelectedConversationId) {
      setSelectedConversationId(conversation.id);
    }
  }, [conversation.id, selectedConversationId, setSelectedConversationId]);

  return (
    <div className="chatPage">
      <div className="chatHeaderCard">
        <div
          className="chatHeaderAvatar"
          style={{ backgroundImage: `url('${conversation.avatar}')` }}
        />
        <div className="chatHeaderInfo">
          <div className="chatHeaderTitleRow">
            <span className="T4 TBold">{conversation.announcementTitle}</span>
            <span
              className="chatBadge"
              style={{ color: conversation.statusColor }}
            >
              {conversation.statusLabel}
            </span>
          </div>
          <div className="chatHeaderMeta">
            <span className="T7">{conversation.date}</span>
            <span className="T7">• {conversation.time}</span>
            <span className="T7">• {conversation.location}</span>
          </div>
        </div>
      </div>

      <div className="chatMessages">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`chatBubble ${
              message.author === "me" ? "me" : "other"
            }`}
          >
            <span className="T5">{message.text}</span>
            <span className="T7 chatTime">{message.time}</span>
          </div>
        ))}
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

