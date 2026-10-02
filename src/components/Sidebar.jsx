import { LuHeart } from "react-icons/lu";
import SidebarLink from "./SidebarLink";

function Sidebar({
    isSidebarOpen,
    theme,
    onThemeChange,
    conversations,
    conversationId,
    isBusy,
    onNewConversation,
    onOpenConversation,
    onDeleteConversation
}) {
    return (
        <nav
            id="conversation-sidebar"
            className={`sidebar${isSidebarOpen ? " sidebar-open" : ""}`}
            aria-label="Conversations"
        >

            <h1 className="sidebar-title">Local AI Chat</h1>
            <p className="sidebar-label" id="theme-label">Theme</p>

            <select
                className="sidebar-select"
                aria-labelledby="theme-label"
                value={theme}
                onChange={(event) => onThemeChange(event.target.value)}
            >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>

            <button
                className="sidebar-link"
                onClick={onNewConversation}
                disabled={isBusy}
            >
                <LuHeart className="sidebar-link-icon" />
                New Conversation
            </button>
            <p className="sidebar-label">Conversations</p>

            {conversations.map((conversation) => (
                <SidebarLink
                    key={conversation.id}
                    text={conversation.title}
                    onClick={() => onOpenConversation(conversation.id)}
                    onDelete={() => onDeleteConversation(conversation.id)}
                    disabled={isBusy}
                    isActive={conversation.id === conversationId}
                />
            ))}


        </nav>
    );
}

export default Sidebar;
