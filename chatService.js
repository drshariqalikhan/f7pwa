import { CONFIG } from "./config.js";

let conversationHistory = [];

export async function initModel(onProgress) {
    if (onProgress) {
        onProgress("Connecting to OpenRouter...", 25);
        await new Promise((r) => setTimeout(r, 200));
        onProgress("Checking model availability...", 65);
        await new Promise((r) => setTimeout(r, 200));
        onProgress("Ready!", 100);
    }
    return true;
}

export async function resetSession() {
    conversationHistory = [];
}

export async function unloadEngine() {
    conversationHistory = [];
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function streamAssistantReply(text, onChunk, onStatus, { image, audio } = {}) {
    onStatus?.("Preparing request...");

    const userParts = [];
    if (text) {
        userParts.push({ type: "text", text });
    }
    if (image) {
        const dataUrl = await fileToBase64(image);
        userParts.push({
            type: "image_url",
            image_url: { url: dataUrl }
        });
    }
    if (audio) {
        userParts.push({
            type: "text",
            text: "[Note: The user recorded and attached a voice message]"
        });
    }

    const userContent = userParts.length === 1 && userParts[0].type === "text"
        ? userParts[0].text
        : userParts;

    conversationHistory.push({ role: "user", content: userContent });

    const messages = [
        ...(CONFIG.systemPrompt ? [{ role: "system", content: CONFIG.systemPrompt }] : []),
        ...conversationHistory
    ];

    const apiKey = CONFIG.apiKey || localStorage.getItem("openrouter_api_key") || "";

    const headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin || "http://localhost",
        "X-Title": CONFIG.appTitle || "Framework7 Chat"
    };

    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const payload = {
        model: CONFIG.model || "openrouter/free",
        messages,
        temperature: CONFIG.temperature ?? 0.7,
        max_tokens: CONFIG.maxOutputTokens ?? 1024,
        stream: true
    };

    onStatus?.("Waiting for response...");

    const response = await fetch(CONFIG.apiUrl || "https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        let errMsg = `OpenRouter HTTP ${response.status}`;
        try {
            const errJson = JSON.parse(errText);
            if (errJson.error?.message) errMsg += `: ${errJson.error.message}`;
            else errMsg += `: ${errText}`;
        } catch (_) {
            errMsg += `: ${errText}`;
        }
        throw new Error(errMsg);
    }

    onStatus?.("Streaming reply...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullReply = "";
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") break;

            try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || "";
                if (delta) {
                    fullReply += delta;
                    onChunk?.(delta);
                }
            } catch (_) {}
        }
    }

    if (fullReply) {
        conversationHistory.push({ role: "assistant", content: fullReply });
    }

    return fullReply;
}
