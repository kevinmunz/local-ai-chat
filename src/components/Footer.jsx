import { useState } from "react";

function Footer({ onSend, isBusy }) {

    const [inputText, setInputText] = useState("");

    function sendMessage() {
        if (isBusy || !inputText.trim()) return;

        onSend(inputText.trim());
        setInputText("");
    }

    return (
        <div className="chat-footer">
            <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="chat-input"
                type="text"
                aria-label="Message"
                placeholder="Write a message..."
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        sendMessage();
                    }
                }}
            />
            <button
                onClick={sendMessage}
                className="send-button"
                disabled={isBusy}
            >
                {isBusy ? "Loading..." : "Send"}
            </button>
        </div>
    );


}

export default Footer;
