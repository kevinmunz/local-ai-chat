import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import { LuTrash2, LuCopy, LuCheck } from "react-icons/lu";

function Message({
    role,
    timeStamp,
    text,
    profilePicture,
    onDelete,
    disabled
}) {

    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    useEffect(() => {
        return () => clearTimeout(copyTimeoutRef.current);
    }, []);


    const copyMessage = async () => {
        try {
            await navigator.clipboard.writeText(text);

            setCopied(true);

            clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to copy message:", error);
            alert("Could not copy the message. Please try again.");
        }
    };

    return (
        <div className={`message-${role}`}>
            <div className="message-info">
                <div className="message-ts">
                    {timeStamp}
                </div>
                {onDelete && (
                    <button
                        className="message-delete"
                        onClick={onDelete}
                        disabled={disabled}
                        aria-label="Delete message"
                        title="Delete message"
                    >
                        <LuTrash2 aria-hidden="true" />
                    </button>
                )}
                <button
                    className="message-copy"
                    onClick={copyMessage}
                    aria-label={copied ? "Copied!" : "Copy message"}
                    title={copied ? "Copied!" : "Copy message"}
                >
                    {copied
                        ? <LuCheck aria-hidden="true" />
                        : <LuCopy aria-hidden="true" />}
                </button>
                <div className="message-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text}
                    </ReactMarkdown>
                </div>
                <img className="pfp" src={profilePicture} alt="" />
            </div>
        </div>
    );
}

export default Message;
