// client/src/features/Messages/pages/Messages.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../components/global/header';
import LandlordSidebar from '../../../components/global/Landlord/sidebar';
import TenantSidebar from '../../../components/global/Tenant/sidebar';
import MaintenanceSideBar from '../../Maintenance/MaintenanceProvider/SideBar/MaintenanceSideBar';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import { authService } from '../../../services/auth.service';
import { messageService, type ConversationDto, type MessageDto } from '../../../services/message.service';
import { socketService, type ConversationReadEvent, type ConversationUpdatedEvent } from '../../../services/socket.service';
import './Messages.css';

const upsertMessage = (items: MessageDto[], incoming: MessageDto): MessageDto[] => {
  const exists = items.some((item) => item.id === incoming.id);
  if (exists) {
    return items;
  }
  return [...items, incoming].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

const sortConversationsByRecent = (items: ConversationDto[]): ConversationDto[] => {
  return [...items].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
};

const updateConversationFromIncoming = (
  items: ConversationDto[],
  event: ConversationUpdatedEvent,
  currentUserId: string | null,
  activeConversationId: string | null
): ConversationDto[] => {
  const updated = items.map((conversation) => {
    if (conversation.id !== event.conversationId) {
      return conversation;
    }

    const isIncoming = event.message.senderId !== currentUserId;
    const isActive = conversation.id === activeConversationId;

    return {
      ...conversation,
      lastMessage: event.message,
      lastMessageAt: event.lastMessageAt,
      unreadCount: isIncoming && !isActive ? conversation.unreadCount + 1 : conversation.unreadCount,
    };
  });

  return sortConversationsByRecent(updated);
};

const markConversationUnreadAsZero = (items: ConversationDto[], conversationId: string): ConversationDto[] => {
  return items.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }
    return { ...conversation, unreadCount: 0 };
  });
};

const updateConversationFromSentMessage = (
  items: ConversationDto[],
  conversationId: string,
  message: MessageDto
): ConversationDto[] => {
  const updated = items.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }

    return {
      ...conversation,
      lastMessage: message,
      lastMessageAt: message.createdAt,
    };
  });

  return sortConversationsByRecent(updated);
};

const markIncomingMessagesAsRead = (items: MessageDto[], currentUserId: string | null): MessageDto[] => {
  return items.map((message) => {
    if (message.senderId === currentUserId || message.readAt) {
      return message;
    }
    return { ...message, readAt: new Date().toISOString() };
  });
};

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? null) as
    | {
        conversationId?: string;
        participantId?: string;
        propertyId?: string;
      }
    | null;
  const preferredConversationId = locationState?.conversationId ?? null;
  const participantIdFromState = locationState?.participantId ?? null;
  const propertyIdFromState = locationState?.propertyId;

  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.user?.id ?? null;
  const userRole = currentUser?.user?.role;

  const SidebarComponent = userRole === 'TENANT'
    ? TenantSidebar
    : userRole === 'MAINTENANCE_PROVIDER'
      ? MaintenanceSideBar
      : LandlordSidebar;

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [draft, setDraft] = useState('');
  const selectedConversationRef = useRef<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    setIsConversationsLoading(true);
    try {
      const response = await messageService.listConversations({ page: 1, limit: 50 });
      const loadedConversations = response.data;
      setConversations(loadedConversations);

      setSelectedConversationId((current) => {
        if (
          preferredConversationId &&
          loadedConversations.some((conversation) => conversation.id === preferredConversationId)
        ) {
          return preferredConversationId;
        }

        if (current && loadedConversations.some((conversation) => conversation.id === current)) {
          return current;
        }
        return loadedConversations[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
      setSelectedConversationId(null);
    } finally {
      setIsConversationsLoading(false);
    }
  }, [preferredConversationId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /** Open (or resume) a DM when navigation only included tenant id (e.g. catch path from property / rental flows). */
  useEffect(() => {
    if (preferredConversationId || !participantIdFromState) {
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await messageService.startConversation({
          participantId: participantIdFromState,
          propertyId: propertyIdFromState,
        });
        if (cancelled) return;
        navigate('/messages', {
          replace: true,
          state: {
            conversationId: response.data.id,
            participantId: participantIdFromState,
            propertyId: propertyIdFromState,
          },
        });
      } catch (error) {
        console.error('Failed to bootstrap conversation from participant id:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, participantIdFromState, preferredConversationId, propertyIdFromState]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [refreshNonce, selectedConversationId]);

  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) {
      return undefined;
    }

    const handleConversationUpdated = (event: ConversationUpdatedEvent) => {
      setConversations((current) =>
        updateConversationFromIncoming(current, event, currentUserId, selectedConversationRef.current)
      );

      if (event.conversationId === selectedConversationRef.current) {
        setMessages((current) => upsertMessage(current, event.message));
      }
    };

    const handleConversationRead = (event: ConversationReadEvent) => {
      if (event.conversationId !== selectedConversationRef.current) {
        return;
      }

      setMessages((current) => markIncomingMessagesAsRead(current, currentUserId));
    };

    socketService.onConversationUpdated(handleConversationUpdated);
    socketService.onConversationRead(handleConversationRead);

    return () => {
      socketService.offConversationUpdated(handleConversationUpdated);
      socketService.offConversationRead(handleConversationRead);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return undefined;
    }

    socketService.joinConversation(selectedConversationId);

    return () => {
      socketService.leaveConversation(selectedConversationId);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setIsMessagesLoading(true);
      try {
        const response = await messageService.getConversationMessages(selectedConversationId, { page: 1, limit: 100 });
        if (!cancelled) {
          setMessages(response.data);
          setConversations((current) => markConversationUnreadAsZero(current, selectedConversationId));
        }
        await messageService.markConversationRead(selectedConversationId);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load messages:', error);
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setIsMessagesLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  const handleSendMessage = useCallback(async () => {
    if (!selectedConversationId) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    setDraft('');

    try {
      const response = await messageService.sendMessage(selectedConversationId, trimmed);
      const newMessage = response.data;

      setMessages((current) => upsertMessage(current, newMessage));
      setConversations((current) => updateConversationFromSentMessage(current, selectedConversationId, newMessage));
    } catch (error) {
      console.error('Failed to send message:', error);
      setDraft(trimmed);
    }
  }, [draft, selectedConversationId]);

  const handleRefreshConversation = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  const handleCreateConversation = useCallback(() => {
    navigate('/browse-properties');
  }, [navigate]);

  return (
    <div className="messages-page-layout">
      <SidebarComponent />
      <div className="messages-main-content">
        <Header />
        <div className="messages-hub-container">
          <ChatSidebar
            conversations={conversations}
            activeId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onCreateConversation={userRole === 'TENANT' ? handleCreateConversation : undefined}
            isLoading={isConversationsLoading}
          />
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            currentUserId={currentUserId}
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSendMessage}
            onRefreshConversation={handleRefreshConversation}
            onClearDraft={() => setDraft('')}
            isLoading={isMessagesLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Messages;