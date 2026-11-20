import { CONFIG, DEFAULTS, STORAGE_KEY_SETTINGS } from "./config.js";
import { initModel, streamAssistantReply, resetSession, unloadEngine } from "./chatService.js";
import * as ui from "./ui.js";

function getModelLabel(){
    return CONFIG.model || "openrouter/free";
}

const BOT_GREETINGS = [
    "Hey there! Ready whenever you are. What's on your mind today?",
    "Hello! Connected to OpenRouter. Ask me anything or share a photo or voice note.",
    "Hi! Good to see you. What shall we explore together?",
    "Hello! Type a prompt, drop an image, or record a quick note!",
    "Hi there! All warmed up and ready to chat. What are we working on?"
];

let lastGreetingIdx = -1;

function getRandomGreeting(){
    let idx;
    do{
        idx = Math.floor(Math.random() * BOT_GREETINGS.length);
    }while(idx === lastGreetingIdx && BOT_GREETINGS.length > 1);
    lastGreetingIdx = idx;
    return BOT_GREETINGS[idx];
}

async function startNewChat(){
    await resetSession();
    ui.hideTyping();
    ui.setBusy(false, "Online (OpenRouter)");
    ui.clearMessages();
    ui.addDayDivider("Today");
    ui.addMessage(getRandomGreeting(), "bot");
    ui.addSuggestions(CONFIG.starterChips, handleSend);
}

async function handleSend(payload){
    const data = typeof payload === "string" ? { text: payload } : payload;
    const { text = "", image = null, imageUrl = null, audio = null, audioUrl = null } = data;

    ui.removeSuggestions();
    ui.addMessage({ text, imageUrl, audioUrl }, "user");

    ui.setBusy(true, "Generating...");
    ui.showTyping();

    let botBubble = null;

    try{
        const fullReply = await streamAssistantReply(
            text,
            (chunkText) => {
                if(!botBubble){
                    ui.hideTyping();
                    botBubble = ui.addMessage("", "bot");
                }
                botBubble.textContent += chunkText;
                ui.scrollToBottom();
            },
            (status) => {
                ui.setBusy(true, status);
            },
            { image, audio }
        );

        ui.hideTyping();
        if(!botBubble){
            ui.addMessage(fullReply || "(No text returned)", "bot");
        }
    }catch(err){
        ui.hideTyping();
        ui.addMessage(`⚠️  ${err.message}`, "bot");
        console.error(err);
    }finally{
        ui.setBusy(false, "Online (OpenRouter)");
    }
}

async function bootApp(){
    const label = getModelLabel();
    ui.setHeader({
        title: label,
        assistantName: label,
        status: "Online (OpenRouter)"
    });

    ui.showSplash();
    ui.setSplash({
        title: label,
        status: "Connecting...",
        progress: 25,
        scene: 1,
        error: null
    });

    try{
        await initModel((status, progress) => {
            const scene = progress < 40 ? 1 : (progress < 80 ? 3 : 5);
            ui.setSplash({ status, progress, scene });
        });

        ui.setSplash({ status: "Ready!", progress: 100, scene: 5 });
        setTimeout(() => ui.hideSplash(), 800);
    }catch(err){
        console.error(err);
        ui.setSplash({
            status: "Initialization failed",
            progress: 0,
            error: err?.message || "Could not connect to OpenRouter."
        });
    }
}

async function handleSaveSettings(newSettings){
    CONFIG.model = newSettings.model;
    CONFIG.apiKey = newSettings.apiKey;
    CONFIG.systemPrompt = newSettings.systemPrompt;
    CONFIG.maxOutputTokens = newSettings.maxOutputTokens;
    CONFIG.temperature = newSettings.temperature;

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(CONFIG));
    if(newSettings.apiKey){
        localStorage.setItem("openrouter_api_key", newSettings.apiKey);
    }

    ui.setBusy(true, "Updating settings...");
    await unloadEngine();
    await bootApp();
    await startNewChat();
}

async function handleResetSettings(){
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem("openrouter_api_key");
    ui.closeSettingsModal();

    Object.assign(CONFIG, DEFAULTS);

    ui.setBusy(true, "Resetting settings...");
    await unloadEngine();
    await bootApp();
    await startNewChat();
}

ui.bindEvents({
    onSend: handleSend,
    onClear: () => { startNewChat(); },
    onError: (msg) => ui.addMessage(`⚠️  ${msg}`, "bot"),
    onRetry: bootApp,
    onOpenSettings: () => ui.openSettingsModal(CONFIG),
    onSaveSettings: handleSaveSettings,
    onResetSettings: handleResetSettings
});

startNewChat();
bootApp();

if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
    });
}
