import { CONFIG } from "./config.js";
import * as ui from "./ui.js?v=14";
import { initModel, streamAssistantReply, resetSession, unloadEngine } from "./chatService.js?v=14";

const STORAGE_KEY_SETTINGS = "gemma_pwa_settings_v2";

const DEFAULTS = {
    modelUrl: CONFIG.modelUrl,
    visionBackend: "CPU",
    audioBackend: "CPU",
    systemPrompt: CONFIG.systemPrompt || "You are a helpful and concise assistant.",
    maxOutputTokens: CONFIG.maxOutputTokens || 2048,
    temperature: CONFIG.temperature ?? 0.7
};

// Set baseline defaults
CONFIG.visionBackend = DEFAULTS.visionBackend;
CONFIG.audioBackend = DEFAULTS.audioBackend;

// Load persisted settings
try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || "{}");
    if(saved.modelUrl) CONFIG.modelUrl = saved.modelUrl;
    if(saved.visionBackend) CONFIG.visionBackend = saved.visionBackend;
    if(saved.audioBackend) CONFIG.audioBackend = saved.audioBackend;
    if(saved.systemPrompt !== undefined) CONFIG.systemPrompt = saved.systemPrompt;
    if(saved.maxOutputTokens) CONFIG.maxOutputTokens = saved.maxOutputTokens;
    if(saved.temperature !== undefined) CONFIG.temperature = saved.temperature;
}catch(_){}

function getModelLabel(url = CONFIG.modelUrl){
    return (url.split("/").pop()?.split("?")[0] || "gemma-4-E2B")
        .replace(/\.litertlm$/i, "");
}

const GEMMA_GREETINGS = [
    "Hey there! I'm Gemma—ready whenever you are. What's on your mind today?",
    "Hello! Gemma here, running right on your device. Ask me anything or share a photo or voice note.",
    "Hi! Good to see you. I'm Gemma—what shall we explore together?",
    "Hey! Gemma's shop is open for business. Type a prompt, drop an image, or record a quick voice note!",
    "Hello from Gemma! Everything here runs locally on your device—how can I help today?",
    "Hi there! I'm Gemma, warmed up and ready to chat. What are we working on?"
];

let lastGreetingIdx = -1;

function getRandomGreeting(){
    let idx;
    do{
        idx = Math.floor(Math.random() * GEMMA_GREETINGS.length);
    }while(idx === lastGreetingIdx && GEMMA_GREETINGS.length > 1);
    lastGreetingIdx = idx;
    return GEMMA_GREETINGS[idx];
}

async function startNewChat(){
    await resetSession();
    ui.hideTyping();
    ui.setBusy(false, "On-device (WebGPU)");
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
        ui.addMessage(`⚠️ ${err.message}`, "bot");
        console.error(err);
    }finally{
        ui.setBusy(false, "On-device (WebGPU)");
    }
}

function sceneFromProgress(progress, currentScene){
    if(typeof progress === "number"){
        if(progress < 25) return 1;
        if(progress < 50) return 2;
        if(progress < 75) return 3;
        return 4;
    }
    return currentScene;
}

async function bootApp(){
    const label = getModelLabel();
    ui.setHeader({
        title: label,
        assistantName: label,
        status: "On-device (WebGPU)"
    });

    let currentScene = 1;
    ui.showSplash();
    ui.setSplash({
        title: label,
        status: "Starting up...",
        progress: null,
        scene: currentScene,
        error: null
    });

    const sceneTimer = setInterval(() => {
        if(currentScene < 4){
            currentScene += 1;
            ui.setSplash({ scene: currentScene });
        }
    }, 1400);

    try{
        await initModel((status, progress) => {
            if(typeof progress === "number"){
                currentScene = sceneFromProgress(progress, currentScene);
            }
            ui.setSplash({ status, progress, scene: currentScene });
        });

        clearInterval(sceneTimer);
        ui.setSplash({ status: "Ready!", progress: 100, scene: 5 });
        setTimeout(() => ui.hideSplash(), 1450);
    }catch(err){
        clearInterval(sceneTimer);
        console.error(err);
        ui.setSplash({
            status: "Initialization failed",
            progress: 0,
            error: err?.message || "Could not load model."
        });
    }
}

async function handleSaveSettings(newSettings){
    const engineNeedsReboot =
        newSettings.modelUrl !== CONFIG.modelUrl ||
        newSettings.visionBackend !== CONFIG.visionBackend ||
        newSettings.audioBackend !== CONFIG.audioBackend;

    CONFIG.modelUrl = newSettings.modelUrl;
    CONFIG.visionBackend = newSettings.visionBackend;
    CONFIG.audioBackend = newSettings.audioBackend;
    CONFIG.systemPrompt = newSettings.systemPrompt;
    CONFIG.maxOutputTokens = newSettings.maxOutputTokens;
    CONFIG.temperature = newSettings.temperature;

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(CONFIG));

    if(engineNeedsReboot){
        ui.setBusy(true, "Reloading model...");
        await unloadEngine();
        await bootApp();
        await startNewChat();
    }else{
        await resetSession();
        ui.setBusy(false, "On-device (WebGPU)");
    }
}

async function handleResetSettings(){
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    ui.closeSettingsModal();

    CONFIG.modelUrl = DEFAULTS.modelUrl;
    CONFIG.visionBackend = DEFAULTS.visionBackend;
    CONFIG.audioBackend = DEFAULTS.audioBackend;
    CONFIG.systemPrompt = DEFAULTS.systemPrompt;
    CONFIG.maxOutputTokens = DEFAULTS.maxOutputTokens;
    CONFIG.temperature = DEFAULTS.temperature;

    ui.setBusy(true, "Resetting settings...");
    await unloadEngine();
    await bootApp();
    await startNewChat();
}

ui.bindEvents({
    onSend: handleSend,
    onClear: () => { startNewChat(); },
    onError: (msg) => ui.addMessage(`⚠️ ${msg}`, "bot"),
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
