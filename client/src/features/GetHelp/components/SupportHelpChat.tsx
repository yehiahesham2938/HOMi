import React, { useCallback, useEffect, useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { messageService, type MessageDto } from '../../../services/message.service';
import authService from '../../../services/auth.service';
import '../pages/GetHelp.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const SupportHelpChat: React.FC<Props> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<MessageDto[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const myId = authService.getCurrentUser()?.user?.id as string | undefined;

    const loadThread = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const thread = await messageService.getSupportThread();
            setConversationId(thread.conversation.id);
            setMessages(thread.messages);
            await messageService.markConversationRead(thread.conversation.id);
        } catch {
            setError('Could not load support chat. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            void loadThread();
        }
    }, [isOpen, loadThread]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setError(null);
        try {
            const { userMessage, autoReply } = await messageService.sendSupportMessage(text);
            setInput('');
            setMessages((prev) => [...prev, userMessage, ...(autoReply ? [autoReply] : [])]);
            if (conversationId) {
                await messageService.markConversationRead(conversationId);
            }
        } catch {
            setError('Failed to send. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="support-chat-overlay" role="dialog" aria-modal="true" aria-labelledby="support-chat-title">
            <button type="button" className="support-chat-backdrop" aria-label="Close chat" onClick={onClose} />
            <div className="support-chat-panel">
                <header className="support-chat-header">
                    <div>
                        <h2 id="support-chat-title">HOMi Support</h2>
                        <p className="support-chat-sub">We typically reply within 24 hours</p>
                    </div>
                    <button type="button" className="support-chat-close" onClick={onClose} aria-label="Close">
                        <X size={22} />
                    </button>
                </header>

                <div className="support-chat-messages">
                    {loading ? (
                        <div className="support-chat-loading">
                            <Loader2 className="support-chat-spin" size={28} />
                            <span>Loading conversation…</span>
                        </div>
                    ) : (
                        messages.map((m) => {
                            const mine = myId && m.senderId === myId;
                            return (
                                <div
                                    key={m.id}
                                    className={`support-chat-bubble ${mine ? 'support-chat-bubble--mine' : 'support-chat-bubble--them'}`}
                                >
                                    <p>{m.body}</p>
                                    <time dateTime={m.createdAt}>
                                        {new Date(m.createdAt).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </time>
                                </div>
                            );
                        })
                    )}
                </div>

                {error ? <p className="support-chat-error">{error}</p> : null}

                <footer className="support-chat-input-row">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message…"
                        rows={2}
                        disabled={loading || sending}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="support-chat-send"
                        disabled={loading || sending || !input.trim()}
                        onClick={() => void send()}
                        aria-label="Send message"
                    >
                        {sending ? <Loader2 className="support-chat-spin" size={22} /> : <Send size={22} />}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SupportHelpChat;
