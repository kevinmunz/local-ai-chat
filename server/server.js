import express from "express";
import cors from "cors";
import db from "./database.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
const model = "qwen3:4b";

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.post("/api/conversations", (request, response) => {
    try {
        const title = request.body?.title ?? "New Conversation";
        if (typeof title !== "string" || !title.trim()) {
            return response.status(400).json({ error: "Title must be a non-empty text." });
        }

        const result = db.prepare(`
            INSERT INTO conversations (title)
            VALUES (?)`)
            .run(title);

        response.json({
            id: result.lastInsertRowid,
            title: title
        });
    } catch (error) {
        console.error("Failed to create conversation:", error);

        response.status(500).json({
            error: "Could not create the conversation. Please try again."
        });
    }
});

app.post("/api/chat", async (request, response) => {
    let savedUserMessage = null;

    try {
        const { conversationId, message } = request.body ?? {};

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return response.status(400).json({
                error: "Invalid conversation ID."
            });
        }

        if (typeof message !== "string" || message.trim().length === 0) {
            return response.status(400).json({
                error: "Message must be a non-empty text."
            });
        }

        if (!db.prepare("SELECT id FROM conversations WHERE id = ?").get(conversationId)) {
            return response.status(404).json({ error: "Conversation not found." });
        }

        savedUserMessage = db.prepare(`
            INSERT INTO messages (conversation_id, role, content)
            VALUES (?, ?, ?)
            RETURNING id, created_at`)
            .get(conversationId, "user", message);

        const history = db.prepare(`
            SELECT role, content
            FROM messages
            WHERE conversation_id = ?
            AND role IN ('user', 'assistant')
            ORDER BY id ASC`)
            .all(conversationId);

        const ollamaResponse = await fetch(new URL("/api/chat", ollamaUrl), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages: history,
                stream: false
            })
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama returned status ${ollamaResponse.status}`);
        }

        const ollamaData = await ollamaResponse.json();
        const assistantMessage = ollamaData.message.content;
        if (typeof assistantMessage !== "string") {
            throw new Error("Ollama returned an invalid message.");
        }

        const savedAssistantMessage = db.prepare(`
            INSERT INTO messages (conversation_id, role, content)
            VALUES (?, ?, ?)
            RETURNING id, created_at`)
            .get(conversationId, "assistant", assistantMessage);

        response.json({
            message: assistantMessage,
            userMessage: savedUserMessage,
            assistantMessage: savedAssistantMessage
        });
    } catch (error) {
        console.error("Failed to process message:", error);

        const notice = "Could not complete the response. Please try again.";
        response.status(500).json({
            error: notice,
            userMessage: savedUserMessage
        });
    }
});

app.get("/api/conversations", (request, response) => {
    try {
        const conversations = db.prepare(`
            SELECT id, title, created_at
            FROM conversations
            ORDER BY id DESC`)
            .all();

        response.json(conversations);
    } catch (error) {
        console.error("Failed to retrieve conversations:", error);

        response.status(500).json({
            error: "Could not retrieve conversations."
        });
    }
});

app.get("/api/conversations/:id/messages", (request, response) => {
    try {
        const conversationId = Number(request.params.id);

        if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
            return response.status(400).json({
                error: "Invalid conversation ID."
            });
        }

        const messages = db.prepare(`
            SELECT id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            AND role IN ('user', 'assistant')
            ORDER BY id ASC`)
            .all(conversationId);

        response.json(messages);
    } catch (error) {
        console.error("Failed to load messages:", error);

        response.status(500).json({
            error: "Could not retrieve messages."
        });
    }
});

app.delete("/api/conversations/:id", (request, response) => {
    const conversationId = Number(request.params.id);

    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
        return response.status(400).json({
            error: "Invalid conversation ID."
        });
    }

    try {
        const deleteConversation = db.transaction((id) => {
            db.prepare(`
                DELETE FROM messages
                WHERE conversation_id = ?
            `).run(id);

            return db.prepare(`
                DELETE FROM conversations
                WHERE id = ?
            `).run(id);
        });

        const result = deleteConversation(conversationId);

        if (result.changes === 0) {
            return response.status(404).json({
                error: "Conversation not found."
            });
        }

        response.json({
            message: "Conversation deleted."
        });
    } catch (error) {
        console.error("Failed to delete conversation:", error);

        response.status(500).json({
            error: "Could not delete the conversation."
        });
    }
});

app.delete(
    "/api/conversations/:conversationId/messages/:messageId",
    (request, response) => {
        const conversationId = Number(request.params.conversationId);
        const messageId = Number(request.params.messageId);

        if (
            !Number.isSafeInteger(conversationId) ||
            conversationId <= 0 ||
            !Number.isSafeInteger(messageId) ||
            messageId <= 0
        ) {
            return response.status(400).json({
                error: "Invalid conversation or message ID."
            });
        }

        try {
            const result = db.prepare(`
                DELETE FROM messages
                WHERE id = ? AND conversation_id = ?
            `).run(messageId, conversationId);

            if (result.changes === 0) {
                return response.status(404).json({
                    error: "Message not found."
                });
            }

            response.json({
                message: "Message deleted."
            });
        } catch (error) {
            console.error("Failed to delete message:", error);

            response.status(500).json({
                error: "Could not delete the message."
            });
        }
    }
);

app.listen(port, host, () => {
    console.log(`Local AI Chat backend running at http://localhost:${port}`);
});
