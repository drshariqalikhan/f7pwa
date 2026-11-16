import { CONFIG } from "./config.js";
import * as ui from "./ui.js?v=6";
import { initModel, streamAssistantReply, resetSession } from "./chatService.js?v=6";

async function startNewChat(){
    await resetSession();
    ui.hideTyping();
    ui.setBusy(false, "On-device (WebGPU)");
    ui.clearMessages();
    ui.addDayDivider("Today");
    ui.addMessage(CONFIG.welcomeMessage, "bot");
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

async function bootApp(){
    ui.showSplash();
    ui.setSplash({
        title: CONFIG.appTitle,
        avatarText: CONFIG.avatarText,
        status: "Starting up...",
        progress: null,
        error: null
    });

    try{
        await initModel((status, progress) => {
            ui.setSplash({ status, progress });
        });
        ui.setSplash({ status: "Ready!", progress: 100 });
        setTimeout(() => ui.hideSplash(), 250);
    }catch(err){
        console.error(err);
        ui.setSplash({
            status: "Initialization failed",
            progress: 0,
            error: err?.message || "Could not load Gemma 4 E2B."
        });
    }
}

ui.setHeader({
    title: CONFIG.appTitle,
    assistantName: CONFIG.assistantName,
    avatarText: CONFIG.avatarText,
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
