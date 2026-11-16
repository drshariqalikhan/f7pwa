import { CONFIG } from "./config.js";
import * as ui from "./ui.js?v=9";
import { initModel, streamAssistantReply, resetSession } from "./chatService.js?v=6";

const MODEL_LABEL = (CONFIG.modelUrl?.split("/").pop()?.split("?")[0] || "gemma-4-E2B")
    .replace(/\.litertlm$/i, "");

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
    let currentScene = 1;
    ui.showSplash();
    ui.setSplash({
        title: MODEL_LABEL,
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
            error: err?.message || "Could not load Gemma 4 E2B."
        });
    }
}

ui.setHeader({
    title: MODEL_LABEL,
    assistantName: MODEL_LABEL,
    status: "On-device (WebGPU)"
});

ui.bindEvents({
    onSend: handleSend,
    onClear: () => { startNewChat(); },
    onError: (msg) => ui.addMessage(`⚠️ ${msg}`, "bot"),
    onRetry: bootApp
});

startNewChat();
bootApp();
