"use client";

import React from 'react';
import { useContent } from '../ContentContext';
import './index.css';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { fetchWithAuth } from '../lib/auth';
import { Skeleton } from '../components/Skeleton';

dayjs.locale('fr');

type MessageListItem = {
  id: string;
  name: string;
  subtitle: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  avatar: string;
  status: 'in_progress' | 'done';
};

type MessageListItemProps = {
  item: MessageListItem;
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
  const { setHeaderTitle, setCurrentPage, setSelectedConversationId, history, currentUserId, currentPage } = useContent();
  const [conversations, setConversations] = React.useState<MessageListItem[]>([]);
  const [allConversations, setAllConversations] = React.useState<MessageListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'in_progress'>('all');

  React.useEffect(() => {
    setHeaderTitle && setHeaderTitle('Messages');
    return () => setHeaderTitle && setHeaderTitle(null);
  }, [setHeaderTitle]);

  // Ensure history is set to [home] when arriving, but only if we're actually on the messages page
  // Don't interfere if we're navigating from another page with history
  React.useEffect(() => {
    // Only fix history once on mount if it's empty and we're on the messages page
    if (history.length === 0 && setCurrentPage) {
      // Use a small timeout to avoid interfering with navigation from other pages
      const timer = setTimeout(() => {
        setCurrentPage('messages', ['home']);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount


  // Load conversations from API
  React.useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const loadConversations = async () => {
      try {
        const params = new URLSearchParams({
          userId: String(currentUserId),
        });
        const res = await fetchWithAuth(`/api/conversations?${params.toString()}`);
        const data = await res.json();

        console.log('Messages API Response:', { 
          currentUserId, 
          resOk: res.ok, 
          conversations: data.conversations?.length || 0,
          messages: data.messages?.length || 0,
          data 
        });

        const hasValidData = res.ok 
          && data.conversations 
          && Array.isArray(data.conversations) 
          && data.messages 
          && Array.isArray(data.messages);

        if (hasValidData) {

          // Transform conversations to MessageListItem format
          const transformedConversations: MessageListItem[] = data.conversations.map((conv: any) => {
            // Find the other user (not the current user) from enriched conversation data
            const convFromUserId = typeof conv.fromUserId === 'number' ? conv.fromUserId : Number(conv.fromUserId);
            const convToUserId = typeof conv.toUserId === 'number' ? conv.toUserId : Number(conv.toUserId);
            const currentUserIdNum = Number(currentUserId);
            
            // Determine which user is the "other" user and get their data from enriched conversation
            const isFromCurrentUser = convFromUserId === currentUserIdNum;
            const otherUserData = isFromCurrentUser ? conv.toUser : conv.fromUser;

            // Get user name and avatar from enriched data
            const userName = otherUserData
              ? `${otherUserData.prenom || ''} ${otherUserData.nom || ''}`.trim() || otherUserData.email || 'Utilisateur'
              : 'Utilisateur';
            const userAvatar = otherUserData?.photo || '/photo1.svg';

            // Get announcement title from enriched conversation data
            const announcementTitle = conv.announcement?.title || 'Annonce';

            // Get last message
            const conversationMessages = data.messages.filter((m: any) => m.conversationId === conv.id);
            const sortedMessages = conversationMessages.sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            const lastMessage = sortedMessages[0];
            const lastMessageText = lastMessage?.text || '';
            
            // Format date: DD:MM:YY
            let lastMessageTime = '';
            if (lastMessage?.createdAt) {
              const messageDate = dayjs(lastMessage.createdAt);
              lastMessageTime = messageDate.format('DD:MM:YY');
            }

            // Count unread messages (messages not read and from other user)
            const unreadCount = conversationMessages.filter((m: any) => {
              const mFromUserId = typeof m.fromUserId === 'number' ? m.fromUserId : Number(m.fromUserId);
              return !m.read && mFromUserId !== currentUserIdNum;
            }).length;

            // Determine status based on reservation if exists
            // For now, we'll use 'in_progress' if there are unread messages, 'done' otherwise
            const status: 'in_progress' | 'done' = unreadCount > 0 ? 'in_progress' : 'done';

            // Get reservation status for filtering
            const reservationStatus = conv.reservation?.status || null;

            return {
              id: conv.id,
              name: userName,
              subtitle: `de l'annonce ${announcementTitle}`,
              lastMessage: lastMessageText,
              time: lastMessageTime,
              unreadCount: unreadCount > 0 ? unreadCount : undefined,
              avatar: userAvatar,
              status,
              reservationStatus, // Add reservation status for filtering
            } as MessageListItem & { reservationStatus: string | null };
          });

          // Sort by last message time (most recent first)
          // We need to get the actual message dates for sorting
          transformedConversations.sort((a, b) => {
            const convA = data.conversations.find((c: any) => c.id === a.id);
            const convB = data.conversations.find((c: any) => c.id === b.id);
            const messagesA = data.messages.filter((m: any) => m.conversationId === a.id);
            const messagesB = data.messages.filter((m: any) => m.conversationId === b.id);
            const lastA = messagesA.sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())[0];
            const lastB = messagesB.sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())[0];
            const timeA = lastA?.createdAt ? new Date(lastA.createdAt).getTime() : 0;
            const timeB = lastB?.createdAt ? new Date(lastB.createdAt).getTime() : 0;
            return timeB - timeA;
          });

          console.log('Transformed conversations:', transformedConversations);
          setAllConversations(transformedConversations);
          setConversations(transformedConversations);
        } else {
          console.log('No conversations found or API error:', { resOk: res.ok, hasConversations: !!data.conversations, hasMessages: !!data.messages, data });
          setConversations([]);
        }
      } catch (error) {
        console.error('Error loading conversations', error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [currentUserId]);

  // Reload conversations when returning to messages page from chat
  React.useEffect(() => {
    if (currentPage === 'messages' && currentUserId) {
      const loadConversations = async () => {
        try {
          const params = new URLSearchParams({
            userId: String(currentUserId),
          });
          const res = await fetchWithAuth(`/api/conversations?${params.toString()}`);
          const data = await res.json();

          if (res.ok && data.conversations && Array.isArray(data.conversations) && data.messages && Array.isArray(data.messages)) {
            // Transform conversations to MessageListItem format
            const transformedConversations: MessageListItem[] = data.conversations.map((conv: any) => {
              const convFromUserId = typeof conv.fromUserId === 'number' ? conv.fromUserId : Number(conv.fromUserId);
              const convToUserId = typeof conv.toUserId === 'number' ? conv.toUserId : Number(conv.toUserId);
              const currentUserIdNum = Number(currentUserId);
              
              // Determine which user is the "other" user and get their data from enriched conversation
              const isFromCurrentUser = convFromUserId === currentUserIdNum;
              const otherUserData = isFromCurrentUser ? conv.toUser : conv.fromUser;

              // Get user name and avatar from enriched data
              const userName = otherUserData
                ? `${otherUserData.prenom || ''} ${otherUserData.nom || ''}`.trim() || otherUserData.email || 'Utilisateur'
                : 'Utilisateur';
              const userAvatar = otherUserData?.photo || '/photo1.svg';

              // Get announcement title from enriched conversation data
              const announcementTitle = conv.announcement?.title || 'Annonce';

              const conversationMessages = data.messages.filter((m: any) => m.conversationId === conv.id);
              const sortedMessages = conversationMessages.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              const lastMessage = sortedMessages[0];
              const lastMessageText = lastMessage?.text || '';
              
              let lastMessageTime = '';
              if (lastMessage?.createdAt) {
                const messageDate = dayjs(lastMessage.createdAt);
                lastMessageTime = messageDate.format('DD:MM:YY');
              }

              // Count unread messages (messages not read and from other user)
              const unreadCount = conversationMessages.filter((m: any) => {
                const mFromUserId = typeof m.fromUserId === 'number' ? m.fromUserId : Number(m.fromUserId);
                return !m.read && mFromUserId !== currentUserIdNum;
              }).length;

              const status: 'in_progress' | 'done' = unreadCount > 0 ? 'in_progress' : 'done';

              // Get reservation status for filtering
              const reservationStatus = conv.reservation?.status || null;

              return {
                id: conv.id,
                name: userName,
                subtitle: `de l'annonce ${announcementTitle}`,
                lastMessage: lastMessageText,
                time: lastMessageTime,
                unreadCount: unreadCount > 0 ? unreadCount : undefined,
                avatar: userAvatar,
                status,
                reservationStatus, // Add reservation status for filtering
              } as MessageListItem & { reservationStatus: string | null };
            });

            // Sort by last message time
            const messages = data.messages;
            transformedConversations.sort((a, b) => {
              const messagesA = messages.filter((m: any) => m.conversationId === a.id);
              const messagesB = messages.filter((m: any) => m.conversationId === b.id);
              const lastA = messagesA.sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())[0];
              const lastB = messagesB.sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())[0];
              const timeA = lastA?.createdAt ? new Date(lastA.createdAt).getTime() : 0;
              const timeB = lastB?.createdAt ? new Date(lastB.createdAt).getTime() : 0;
              return timeB - timeA;
            });

            setAllConversations(transformedConversations);
            setConversations(transformedConversations);
          }
        } catch (error) {
          console.error('Error reloading conversations', error);
        }
      };

      // Small delay to ensure we're back on the page
      const timer = setTimeout(() => {
        loadConversations();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage, currentUserId]);

  // Listen for read events from chat to update unread counters live
  React.useEffect(() => {
    const onMessagesRead = (ev: any) => {
      try {
        const detail = ev.detail || {};
        const convId = detail.conversationId;
        const updatedCount = Number(detail.updatedCount || 0);
        if (!convId || updatedCount <= 0) return;
        setConversations((prev) => prev.map((c) => {
          if (c.id !== convId) return c;
          const current = c.unreadCount ?? 0;
          const next = Math.max(0, current - updatedCount);
          return { ...c, unreadCount: next > 0 ? next : undefined };
        }));
      } catch (e) {
        // ignore
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('messagesRead', onMessagesRead as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('messagesRead', onMessagesRead as EventListener);
      }
    };
  }, []);

  // Filter conversations based on selected filter
  React.useEffect(() => {
    if (filter === 'in_progress') {
      // Filter to show only conversations with reservations that have status "reserved"
      const filtered = allConversations.filter((conv) => {
        const reservationStatus = (conv as any).reservationStatus;
        return reservationStatus === 'reserved';
      });
      setConversations(filtered);
    } else {
      setConversations(allConversations);
    }
  }, [filter, allConversations]);

  return (
    <div className="messagePage">
      <div className="messageTabs">
        <button
          className={`messageTab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tous
        </button>
        <button
          className={`messageTab ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          En cours
        </button>
      </div>
      <div className="messageList">
        {loading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px' }}>
                <Skeleton variant="circular" width={50} height={50} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton variant="text" width="40%" height={18} />
                    <Skeleton variant="text" width={60} height={14} />
                  </div>
                  <Skeleton variant="text" width="70%" height={14} />
                  <Skeleton variant="text" width="90%" height={14} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center" }}>Aucune conversation</div>
        ) : (
          conversations.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedConversationId && setSelectedConversationId(item.id);
                // Store in localStorage as backup
                if (typeof window !== 'undefined') {
                  localStorage.setItem('proximis_selectedConversationId', item.id);
                }
                setCurrentPage && setCurrentPage("message_chat");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedConversationId && setSelectedConversationId(item.id);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('proximis_selectedConversationId', item.id);
                  }
                  setCurrentPage && setCurrentPage("message_chat");
                }
              }}
              style={{ outline: "none" }}
            >
              <MessageListItem item={item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}