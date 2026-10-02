import { LuMessageSquare, LuTrash2 } from "react-icons/lu";

function SidebarLink({
    text,
    onClick,
    onDelete,
    disabled,
    isActive
}) {
    return (
        <div className={`sidebar-conversation${isActive ? " sidebar-conversation-active" : ""}`} >
            <button
                className="sidebar-link"
                onClick={onClick}
                title={text}
                disabled={disabled}
            >
                <LuMessageSquare className="sidebar-link-icon" />
                <span className="sidebar-link-text">{text}</span>
            </button>

            <button
                className="conversation-delete"
                onClick={onDelete}
                disabled={disabled}
                aria-label={`Delete conversation: ${text}`}
                title="Delete conversation"
            >
                <LuTrash2 aria-hidden="true" />
            </button>
        </div>
    );
}

export default SidebarLink;