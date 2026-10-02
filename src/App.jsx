import "./App.css";
import botPfp from "./assets/bot.jpg";
import userPfp from "./assets/user.jpg";
import { Fragment, useState, useEffect, useLayoutEffect, useRef } from "react";
import axios from "./utils/api";
import Sidebar from "./components/Sidebar";
import Message from "./components/Message";
import Footer from "./components/Footer";
import { formatMessageTime, formatMessageDate } from "./utils/date";
import { createErrorNotice } from "./utils/chat";

function App() {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("local-ai-chat-theme") === "dark" ? "dark" : "light";
        } catch (error) {
            console.error("Failed to load theme preference:", error);
            return "light";
        }
    });

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;

        try {
            localStorage.setItem("local-ai-chat-theme", theme);
        } catch (error) {
            console.error("Failed to save theme preference:", error);
        }
    }, [theme]);

    const [conversationId, setConversationId] = useState(null);
    const [isBusy, setIsBusy] = useState(false);
    const [conversations, setConversations] = useState([]);
    const messagesEndRef = useRef(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });
    }, [messages]);

    useEffect(() => {
        let cancelled = false;

        const loadConversations = async () => {
            try {
                const response = await axios.get(
                    "/api/conversations"
                );

                if (!cancelled) setConversations(response.data);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load conversations:", error);
                const notice = createErrorNotice("Could not load the conversation list. Please try reloading the page.");
                setMessages(prev => [...prev, notice]);
            }
        };

        loadConversations();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isSidebarOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsSidebarOpen(false);
                document.getElementById("sidebar-toggle")?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSidebarOpen]);

    const addMessage = async (message) => {
        if (isBusy) return;
        setIsBusy(true);

        const typingId = crypto.randomUUID();
        const userMessageId = crypto.randomUUID();

        try {
            let currentConversationId = conversationId;

            if (conversationId === null) {
                const conversationResponse = await axios.post(
                    "/api/conversations",
                    { title: message }
                );

                currentConversationId = conversationResponse.data.id;
                setConversationId(currentConversationId);

                setConversations(prev => [
                    conversationResponse.data,
                    ...prev
                ]);
            }

            setMessages(prev => [
                ...prev,
                {
                    id: userMessageId,
                    role: "sender",
                    text: message,
                    profilePicture: userPfp,
                    timeStamp: "",
                    createdAt: new Date().toISOString()
                },
                {
                    id: typingId,
                    role: "receiver",
                    text: "Typing...",
                    profilePicture: botPfp,
                    timeStamp: "",
                    createdAt: new Date().toISOString()
                }
            ]);

            const response = await axios.post("/api/chat", {
                conversationId: currentConversationId,
                message: message
            });

            const { message: content, userMessage, assistantMessage } = response.data;

            setMessages(prev => [
                ...prev
                    .filter(item => item.id !== typingId)
                    .map(item =>
                        item.id === userMessageId
                            ? {
                                ...item,
                                id: userMessage.id,
                                timeStamp: formatMessageTime(userMessage.created_at),
                                createdAt: userMessage.created_at.replace(" ", "T") + "Z"
                            }
                            : item
                    ),
                {
                    id: assistantMessage.id,
                    role: "receiver",
                    text: content,
                    profilePicture: botPfp,
                    timeStamp: formatMessageTime(assistantMessage.created_at),
                    createdAt: assistantMessage.created_at.replace(" ", "T") + "Z"
                }
            ]);
        } catch (error) {
            console.error("Failed to send message:", error);

            const userMessage = error.response?.data?.userMessage;

            const notice = createErrorNotice(
                error.response?.data?.error
                    || "Could not connect to the server. Please try again."
            );

            setMessages(prev => [
                ...prev
                    .filter(item => item.id !== typingId)
                    .map(item =>
                        item.id === userMessageId && userMessage
                            ? {
                                ...item,
                                id: userMessage.id,
                                timeStamp: formatMessageTime(userMessage.created_at),
                                createdAt: userMessage.created_at.replace(" ", "T") + "Z"
                            }
                            : item
                    ),
                notice
            ]);
        } finally {
            setIsBusy(false);
        }
    };

    const startNewConversation = () => {
        if (isBusy) return;

        setConversationId(null);
        setMessages([]);

        setIsSidebarOpen(false);
    };

    const openConversation = async (id) => {
        if (isBusy) return;

        setIsBusy(true);

        try {
            const response = await axios.get(
                `/api/conversations/${id}/messages`
            );

            const loadedMessages = response.data.map((message) => ({
                id: message.id,
                role: message.role === "user" ? "sender" : "receiver",
                text: message.content,
                profilePicture: message.role === "user" ? userPfp : botPfp,
                timeStamp: formatMessageTime(message.created_at),
                createdAt: message.created_at.replace(" ", "T") + "Z",
            }));

            setMessages(loadedMessages);
            setConversationId(id);

            setIsSidebarOpen(false);
        } catch (error) {
            console.error("Failed to open conversation:", error);
            const notice = createErrorNotice("Could not open the selected conversation. Please try again.");
            setMessages(prev => [...prev, notice]);
            setIsSidebarOpen(false);
        } finally {
            setIsBusy(false);
        }
    };

    const deleteConversation = async (id) => {
        if (isBusy) return;

        const confirmed = window.confirm(
            "Delete this conversation and all its messages?"
        );

        if (!confirmed) return;

        setIsBusy(true);

        try {
            await axios.delete(
                `/api/conversations/${id}`
            );

            setConversations(prev =>
                prev.filter(conversation => conversation.id !== id)
            );

            if (conversationId === id) {
                setConversationId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error("Failed to delete conversation:", error);
            const notice = createErrorNotice("Could not delete the selected conversation. Please try again.");
            setMessages(prev => [...prev, notice]);
            setIsSidebarOpen(false);
        } finally {
            setIsBusy(false);
        }
    };

    const deleteMessage = async (messageId) => {
        if (isBusy) return;

        const isSaved = Number.isSafeInteger(messageId);

        const confirmed = window.confirm(
            isSaved
                ? "Delete this message permanently?"
                : "Remove this message from the current view?"
        );

        if (!confirmed) return;

        if (!isSaved) {
            setMessages(prev =>
                prev.filter(message => message.id !== messageId)
            );
            return;
        }

        setIsBusy(true);

        try {
            await axios.delete(
                `/api/conversations/${conversationId}/messages/${messageId}`
            );

            setMessages(prev =>
                prev.filter(message => message.id !== messageId)
            );
        } catch (error) {
            console.error("Failed to delete message:", error);
            const notice = createErrorNotice("Could not delete the message. Please try again.");
            setMessages(prev => [...prev, notice]);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="app-layout">

            <header className="mobile-header">
                <button
                    id="sidebar-toggle"
                    className="menu-toggle"
                    onClick={() => setIsSidebarOpen(prev => !prev)}
                    aria-expanded={isSidebarOpen}
                    aria-controls="conversation-sidebar"
                >
                    {isSidebarOpen ? "Close menu" : "Menu"}
                </button>
                <span>Local AI Chat</span>
            </header>

            {isSidebarOpen && (
                <button
                    className="sidebar-backdrop"
                    aria-label="Close menu"
                    onClick={() => {
                        setIsSidebarOpen(false);
                        document.getElementById("sidebar-toggle")?.focus();
                    }}
                />
            )}

            <Sidebar
                isSidebarOpen={isSidebarOpen}
                theme={theme}
                onThemeChange={setTheme}
                conversations={conversations}
                conversationId={conversationId}
                isBusy={isBusy}
                onNewConversation={startNewConversation}
                onOpenConversation={openConversation}
                onDeleteConversation={deleteConversation}
            />

            <div className="chat-container">
                <div className={`chat-box${messages.length === 0 ? " chat-box-empty" : ""}`}>
                    {messages.length === 0 && (
                        <div className="chat-empty">
                            <h2>What do you want to talk about?</h2>
                            <p>Write a message to start a conversation with Local AI Chat.</p>
                        </div>
                    )}
                    {messages.map((message, index) => {
                        const previousMessage = messages[index - 1];
                        const dateLabel = formatMessageDate(message.createdAt);

                        const showDate =
                            !previousMessage ||
                            dateLabel !== formatMessageDate(previousMessage.createdAt);

                        return (
                            <Fragment key={message.id}>
                                {showDate && (
                                    <div className="chat-date">
                                        {dateLabel}
                                    </div>
                                )}
                                {message.role === "app" ? (
                                    <div className="message-app" role="alert">
                                        <div className="message-text">{message.text}</div>
                                    </div>
                                ) : (
                                    <Message
                                        role={message.role}
                                        timeStamp={message.timeStamp}
                                        text={message.text}
                                        profilePicture={message.profilePicture}
                                        onDelete={() => deleteMessage(message.id)}
                                        disabled={isBusy}
                                    />
                                )}
                            </Fragment>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <Footer onSend={addMessage} isBusy={isBusy} />
            </div>
        </div>
    );
}

export default App;

