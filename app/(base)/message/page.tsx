"use client";

import React from 'react';
import { useContent } from '../ContentContext';
import './index.css';

type Message = {
  id: string;
  name: string;
  subtitle: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  avatar: string;
  status: 'in_progress' | 'done';
};

const conversations: Message[] = [
  {
    id: 'marie',
    name: 'Marie',
    subtitle: "de l’annonce Entretien jardin",
    lastMessage:
      "Bonjour, je suis intéressé par votre annonce. Pouvez-vous me donner plus de détails sur les services que vous proposez ?",
    time: '14h32',
    unreadCount: 12,
    avatar: '/photo1.svg',
    status: 'in_progress',
  },
  {
    id: 'pierre',
    name: 'Pierre',
    subtitle: "de l’annonce Réparation plomberie",
    lastMessage: "La date de ma prestation est fixée. Pouvez-vous me confirmer votre disponibilité ?",
    time: 'Hier',
    unreadCount: 3,
    avatar: '/photo1.svg',
    status: 'in_progress',
  },
  {
    id: 'thomas',
    name: 'Thomas',
    subtitle: "de l’annonce Soutien en maths",
    lastMessage: "Merci pour votre retour, je reste disponible si besoin.",
    time: 'Hier',
    unreadCount: 0,
    avatar: '/photo1.svg',
    status: 'done',
  },
];

type MessageListItemProps = {
  item: Message;
};

function MessageListItem({ item }: MessageListItemProps) {
  const showUnread = (item.unreadCount ?? 0) > 0;

  return (
    <div className="messageItem">
      <div
        className="messageItemImage"
        style={{
          backgroundImage: `url('${item.avatar}')`,
        }}
      />
      <div className="messageItemBody">
        <div className="messageItemRow">
          <span className="T4 TBold messageItemName">{item.name}</span>
          <span className="T5 messageItemTime">{item.time}</span>
        </div>
        <span className="T6 messageItemSubtitle">{item.subtitle}</span>
        <div className="messageItemRow">
          <span className="T4 messageItemPreview" title={item.lastMessage}>
            {item.lastMessage}
          </span>
          {showUnread ? (
            <div className="notif" aria-label={`${item.unreadCount} nouveaux messages`}>
              <span className="T7">{item.unreadCount}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function MessageContent() {
  const { setHeaderTitle, setCurrentPage, setSelectedConversationId } = useContent();
  const [activeTab, setActiveTab] = React.useState<'all' | 'in_progress'>('all');

  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle('Messages');
    return () => setHeaderTitle && setHeaderTitle(null);
  }, [setHeaderTitle]);

  const filteredMessages = React.useMemo(
    () => (activeTab === 'in_progress' ? conversations.filter((m) => m.status === 'in_progress') : conversations),
    [activeTab],
  );

  return (
    <div className="messagePage">
      <div className="messageTabs">
        
        <button
          className={`messageTab ${activeTab === 'all' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('all')}
        >
          Tous
        </button>
        <button
          className={`messageTab ${activeTab === 'in_progress' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('in_progress')}
        >
          En cours
        </button>
      </div>

      <div className="messageList">
        {filteredMessages.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedConversationId && setSelectedConversationId(item.id);
              setCurrentPage("message_chat");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedConversationId && setSelectedConversationId(item.id);
                setCurrentPage("message_chat");
              }
            }}
            style={{ outline: "none" }}
          >
            <MessageListItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}