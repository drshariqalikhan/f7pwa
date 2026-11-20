export const DEFAULTS = {
    appTitle: "OpenRouter AI Assistant",
    assistantName: "openrouter/free",
    avatarText: "AI",
    welcomeMessage: "👋 Hi! Ready to chat via OpenRouter. Ask anything or attach a photo!",
    starterChips: [
        "Explain quantum computing simply",
        "Write a short haiku",
        "Summarize how on-device AI works"
    ],
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/free",
    apiKey: "",
    systemPrompt: "You are a helpful and concise assistant.",
    maxOutputTokens: 1024,
    temperature: 0.7
};

export const STORAGE_KEY_SETTINGS = "f7pwa_settings_openrouter";

const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || "{}");

export const CONFIG = {
    ...DEFAULTS,
    ...savedSettings
};
