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
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

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
            // Find the other user (not the current user)
            // Convert to numbers for comparison since MongoDB stores them as numbers
            const convFromUserId = typeof conv.fromUserId === 'number' ? conv.fromUserId : Number(conv.fromUserId);
            const convToUserId = typeof conv.toUserId === 'number' ? conv.toUserId : Number(conv.toUserId);
            const currentUserIdNum = Number(currentUserId);
            
            const otherUserId = convFromUserId === currentUserIdNum 
              ? convToUserId 
              : convFromUserId;
            const otherUser = users.find((u: any) => Number(u.id) === Number(otherUserId));

            // Get user name and avatar
            const userName = otherUser 
              ? `${otherUser.prenom || ''} ${otherUser.nom || ''}`.trim() || otherUser.email || 'Utilisateur'
              : 'Utilisateur';
            const userAvatar = otherUser?.photo || '/photo1.svg';

            // Get announcement title for subtitle
            // Convert to numbers for comparison since MongoDB stores them as numbers
            const convAnnouncementId = typeof conv.announcementId === 'number' ? conv.announcementId : Number(conv.announcementId);
            const announcement = announcements.find((a: any) => Number(a.id) === convAnnouncementId);
            const announcementTitle = announcement?.title || 'Annonce';

            // Get last message
            const conversationMessages = data.messages.filter((m: any) => m.conversationId === conv.id);
            const sortedMessages = conversationMessages.sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            const lastMessage = sortedMessages[0];
            const lastMessageText = lastMessage?.text || '';
            
            // Format time: "HH:mm" if today, "Hier" if yesterday, or date if older
            let lastMessageTime = '';
            if (lastMessage?.createdAt) {
              const messageDate = dayjs(lastMessage.createdAt);
              const now = dayjs();
              const diffDays = now.diff(messageDate, 'day');
              
              if (diffDays === 0) {
                lastMessageTime = messageDate.format('HH:mm');
              } else if (diffDays === 1) {
                lastMessageTime = 'Hier';
              } else if (diffDays < 7) {
                lastMessageTime = messageDate.format('ddd');
              } else {
                lastMessageTime = messageDate.format('D MMM');
              }
            }

            // Count unread messages (messages not read and from other user)
            const unreadCount = conversationMessages.filter((m: any) => {
              const mFromUserId = typeof m.fromUserId === 'number' ? m.fromUserId : Number(m.fromUserId);
              return !m.read && mFromUserId !== currentUserIdNum;
            }).length;

            // Determine status based on reservation if exists
            // For now, we'll use 'in_progress' if there are unread messages, 'done' otherwise
            const status: 'in_progress' | 'done' = unreadCount > 0 ? 'in_progress' : 'done';

            return {
              id: conv.id,
              name: userName,
              subtitle: `de l'annonce ${announcementTitle}`,
              lastMessage: lastMessageText,
              time: lastMessageTime,
              unreadCount: unreadCount > 0 ? unreadCount : undefined,
              avatar: userAvatar,
              status,
            };
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
  }, [currentUserId, users, announcements]);

  // Reload conversations when returning to messages page from chat
  React.useEffect(() => {
    if (currentPage === 'messages' && currentUserId && users.length > 0 && announcements.length > 0) {
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
              
              const otherUserId = convFromUserId === currentUserIdNum 
                ? convToUserId
                : convFromUserId;
              const otherUser = users.find((u: any) => Number(u.id) === Number(otherUserId));

              const userName = otherUser 
                ? `${otherUser.prenom || ''} ${otherUser.nom || ''}`.trim() || otherUser.email || 'Utilisateur'
                : 'Utilisateur';
              const userAvatar = otherUser?.photo || '/photo1.svg';

              const convAnnouncementId = typeof conv.announcementId === 'number' ? conv.announcementId : Number(conv.announcementId);
              const announcement = announcements.find((a: any) => Number(a.id) === convAnnouncementId);
              const announcementTitle = announcement?.title || 'Annonce';

              const conversationMessages = data.messages.filter((m: any) => m.conversationId === conv.id);
              const sortedMessages = conversationMessages.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              const lastMessage = sortedMessages[0];
              const lastMessageText = lastMessage?.text || '';
              
              let lastMessageTime = '';
              if (lastMessage?.createdAt) {
                const messageDate = dayjs(lastMessage.createdAt);
                const now = dayjs();
                const diffDays = now.diff(messageDate, 'day');
                
                if (diffDays === 0) {
                  lastMessageTime = messageDate.format('HH:mm');
                } else if (diffDays === 1) {
                  lastMessageTime = 'Hier';
                } else if (diffDays < 7) {
                  lastMessageTime = messageDate.format('ddd');
                } else {
                  lastMessageTime = messageDate.format('D MMM');
                }
              }

              // Count unread messages (messages not read and from other user)
              const unreadCount = conversationMessages.filter((m: any) => {
                const mFromUserId = typeof m.fromUserId === 'number' ? m.fromUserId : Number(m.fromUserId);
                return !m.read && mFromUserId !== currentUserIdNum;
              }).length;

              const status: 'in_progress' | 'done' = unreadCount > 0 ? 'in_progress' : 'done';

              return {
                id: conv.id,
                name: userName,
                subtitle: `de l'annonce ${announcementTitle}`,
                lastMessage: lastMessageText,
                time: lastMessageTime,
                unreadCount: unreadCount > 0 ? unreadCount : undefined,
                avatar: userAvatar,
                status,
              };
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
  }, [currentPage, currentUserId, users, announcements]);

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

  return (
    <div className="messagePage">
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