export const f7App = new Framework7({
    el: "#app",
    theme: "ios"
});

const BOT_ICON_URL = "./icons/android/mipmap-xhdpi/ic_launcher.png";

const splashScreen = document.getElementById("splashScreen");
const splashTitle = document.getElementById("splashTitle");
const splashStage = document.getElementById("splashStage");
const splashStory = document.getElementById("splashStory");
const splashEmoji = document.getElementById("splashEmoji");
const splashHeadline = document.getElementById("splashHeadline");
const openSignStage = document.getElementById("openSignStage");
const splashStatus = document.getElementById("splashStatus");
const splashProgressFill = document.getElementById("splashProgressFill");
const splashError = document.getElementById("splashError");
const splashRetryBtn = document.getElementById("splashRetryBtn");
const splashSettingsBtn = document.getElementById("splashSettingsBtn");

const settingsModal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const modelUrlInput = document.getElementById("modelUrlInput");
const visionBackendSelect = document.getElementById("visionBackendSelect");
const audioBackendSelect = document.getElementById("audioBackendSelect");
const systemPromptInput = document.getElementById("systemPromptInput");
const maxTokensInput = document.getElementById("maxTokensInput");
const tempInput = document.getElementById("tempInput");
const tempVal = document.getElementById("tempVal");
const saveModelBtn = document.getElementById("saveModelBtn");
const resetModelBtn = document.getElementById("resetModelBtn");
const presetBtns = document.querySelectorAll(".preset-btn");

const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const imageBtn = document.getElementById("imageBtn");
const imageInput = document.getElementById("imageInput");
const micBtn = document.getElementById("micBtn");
const attachmentPreview = document.getElementById("attachmentPreview");
const statusText = document.getElementById("statusText");
const assistantNameEl = document.getElementById("assistantName");
const clearBtn = document.getElementById("clearBtn");

const SCENE_TEXT = {
    1: { emoji: "☀️", text: "Gemma is waking up..." },
    2: { emoji: "🪥", text: "Brushing her teeth..." },
    3: { emoji: "🥐", text: "Having breakfast..." },
    4: { emoji: "🚴‍♀️", text: "Cycling to work..." }
};

let isBusy = false;
let pendingImage = null;
let pendingAudio = null;
let activeUrls = [];
let splashGoneTimer = null;
let lastScene = null;

let mediaRecorder = null;
let micStream = null;
let audioChunks = [];
let recTimer = null;
let recSeconds = 0;

function formatTime(date = new Date()){
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(sec){
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
}

function resizeInput(){
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 110) + "px";
}

function updateControls(){
    const isRecording = mediaRecorder?.state === "recording";
    const hasContent =
        chatInput.value.trim().length > 0 ||
        pendingImage !== null ||
        pendingAudio !== null;

    sendBtn.disabled = isBusy || isRecording || !hasContent;
    imageBtn.disabled = isBusy || isRecording;
    micBtn.disabled = isBusy;
}

function renderPreviewBar(){
    attachmentPreview.innerHTML = "";

    if(!pendingImage && !pendingAudio){
        attachmentPreview.hidden = true;
        updateControls();
        return;
    }

    attachmentPreview.hidden = false;

    if(pendingImage){
        const pill = document.createElement("div");
        pill.className = "preview-pill";

        const img = document.createElement("img");
        img.className = "preview-thumb";
        img.src = pendingImage.url;
        img.alt = "Attached image";

        const label = document.createElement("span");
        label.className = "preview-label";
        label.textContent = pendingImage.name;

        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "preview-remove";
        rm.textContent = "✕";
        rm.setAttribute("aria-label", "Remove image");
        rm.addEventListener("click", () => {
            URL.revokeObjectURL(pendingImage.url);
            pendingImage = null;
            imageInput.value = "";
            renderPreviewBar();
        });

        pill.append(img, label, rm);
        attachmentPreview.appendChild(pill);
    }

    if(pendingAudio){
        const pill = document.createElement("div");
        pill.className = "preview-pill";

        const badge = document.createElement("div");
        badge.className = "preview-audio-badge";
        badge.textContent = "🎙️";

        const label = document.createElement("span");
        label.className = "preview-label";
        label.textContent = `Voice (${formatDuration(pendingAudio.durationSec)})`;

        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "preview-remove";
        rm.textContent = "✕";
        rm.setAttribute("aria-label", "Remove audio");
        rm.addEventListener("click", () => {
            URL.revokeObjectURL(pendingAudio.url);
            pendingAudio = null;
            renderPreviewBar();
        });

        pill.append(badge, label, rm);
        attachmentPreview.appendChild(pill);
    }

    updateControls();
}

function stopMicStream(){
    if(recTimer){
        clearInterval(recTimer);
        recTimer = null;
    }
    if(micStream){
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    micBtn.classList.remove("recording");
    chatInput.placeholder = "Message...";
}

function createBotBadge(){
    const badge = document.createElement("img");
    badge.className = "bot-badge";
    badge.src = BOT_ICON_URL;
    badge.alt = "Gemma";
    return badge;
}

export function setSplash({ title, status, progress, scene, error }){
    if(title) splashTitle.textContent = title;
    if(status !== undefined) splashStatus.textContent = status;

    if(scene !== undefined && scene !== lastScene){
        lastScene = scene;
        splashStage.dataset.scene = String(scene);

        if(scene === 5){
            splashStory.hidden = true;
            openSignStage.hidden = false;
        }else{
            openSignStage.hidden = true;
            splashStory.hidden = false;
            const info = SCENE_TEXT[scene] || SCENE_TEXT[1];
            splashEmoji.textContent = info.emoji;
            splashHeadline.textContent = info.text;
            splashHeadline.classList.remove("animate-in");
            void splashHeadline.offsetWidth;
            splashHeadline.classList.add("animate-in");
        }
    }

    if(typeof progress === "number"){
        splashProgressFill.classList.remove("indeterminate");
        splashProgressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }else if(progress === null){
        splashProgressFill.classList.add("indeterminate");
    }

    if(error){
        splashError.textContent = error;
        splashError.hidden = false;
        splashRetryBtn.hidden = false;
    }else if(error === null){
        splashError.textContent = "";
        splashError.hidden = true;
        splashRetryBtn.hidden = true;
    }
}

export function showSplash(){
    if(splashGoneTimer){
        clearTimeout(splashGoneTimer);
        splashGoneTimer = null;
    }
    lastScene = null;
    splashScreen.classList.remove("gone");
    requestAnimationFrame(() => {
        splashScreen.classList.remove("hidden");
        splashScreen.setAttribute("aria-hidden", "false");
    });
}

export function hideSplash(){
    splashScreen.classList.add("hidden");
    splashScreen.setAttribute("aria-hidden", "true");
    splashGoneTimer = setTimeout(() => {
        splashScreen.classList.add("gone");
    }, 420);
}

export function openSettingsModal(config){
    modelUrlInput.value = config.modelUrl || "";
    visionBackendSelect.value = config.visionBackend || "CPU";
    audioBackendSelect.value = config.audioBackend || "CPU";
    systemPromptInput.value = config.systemPrompt || "";
    maxTokensInput.value = config.maxOutputTokens || 2048;
    tempInput.value = config.temperature ?? 0.7;
    tempVal.textContent = tempInput.value;
    settingsModal.hidden = false;
}

export function closeSettingsModal(){
    settingsModal.hidden = true;
}

export function scrollToBottom(){
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function setHeader({ title, assistantName, status }){
    if(title){
        document.title = title;
        splashTitle.textContent = title;
    }
    if(assistantName) assistantNameEl.textContent = assistantName;
    if(status) statusText.textContent = status;
}

export function setBusy(busy, statusLabel){
    isBusy = busy;
    statusText.textContent = statusLabel || (busy ? "Typing..." : "Online");
    updateControls();
}

export function clearMessages(){
    if(mediaRecorder?.state === "recording"){
        mediaRecorder.stop();
    }
    stopMicStream();

    if(pendingImage){
        URL.revokeObjectURL(pendingImage.url);
        pendingImage = null;
    }
    if(pendingAudio){
        URL.revokeObjectURL(pendingAudio.url);
        pendingAudio = null;
    }
    activeUrls.forEach(u => URL.revokeObjectURL(u));
    activeUrls = [];

    imageInput.value = "";
    renderPreviewBar();
    chatMessages.innerHTML = "";
}

export function addDayDivider(label){
    const divider = document.createElement("div");
    divider.className = "day-divider";
    divider.textContent = label;
    chatMessages.appendChild(divider);
}

export function addMessage(content, sender, timestamp){
    const payload = typeof content === "string" ? { text: content } : content;

    const row = document.createElement("div");
    row.className = `msg-row ${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if(sender === "bot"){
        bubble.appendChild(createBotBadge());
    }

    if(payload.imageUrl){
        const img = document.createElement("img");
        img.className = "bubble-img";
        img.src = payload.imageUrl;
        img.alt = "Sent image";
        bubble.appendChild(img);
        activeUrls.push(payload.imageUrl);
    }

    if(payload.audioUrl){
        const audio = document.createElement("audio");
        audio.className = "bubble-audio";
        audio.controls = true;
        audio.src = payload.audioUrl;
        bubble.appendChild(audio);
        activeUrls.push(payload.audioUrl);
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = payload.text || "";
    if(payload.text || sender === "bot"){
        bubble.appendChild(textSpan);
    }

    const time = document.createElement("div");
    time.className = "msg-time";
    time.textContent = timestamp || formatTime();

    row.appendChild(bubble);
    row.appendChild(time);
    chatMessages.appendChild(row);
    scrollToBottom();

    return textSpan;
}

export function addSuggestions(labels, onSelect){
    removeSuggestions();
    const chips = document.createElement("div");
    chips.className = "suggestions";
    chips.id = "starterChips";

    labels.forEach(label => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip-btn";
        btn.textContent = label;
        btn.addEventListener("click", () => onSelect(label));
        chips.appendChild(btn);
    });

    chatMessages.appendChild(chips);
    scrollToBottom();
}

export function removeSuggestions(){
    const chips = document.getElementById("starterChips");
    if(chips) chips.remove();
}

export function showTyping(){
    if(document.getElementById("typingIndicator")) return;

    const row = document.createElement("div");
    row.className = "msg-row bot";
    row.id = "typingIndicator";

    const bubble = document.createElement("div");
    bubble.className = "bubble typing-bubble";
    bubble.appendChild(createBotBadge());
    bubble.insertAdjacentHTML("beforeend", `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `);

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollToBottom();
}

export function hideTyping(){
    const el = document.getElementById("typingIndicator");
    if(el) el.remove();
}

export function bindEvents({ onSend, onClear, onError, onRetry, onOpenSettings, onSaveSettings, onResetSettings }){
    function submitCurrentInput(){
        const text = chatInput.value.trim();
        if(isBusy || mediaRecorder?.state === "recording") return;
        if(!text && !pendingImage && !pendingAudio) return;

        const payload = {
            text,
            image: pendingImage?.file || null,
            imageUrl: pendingImage?.url || null,
            audio: pendingAudio?.blob || null,
            audioUrl: pendingAudio?.url || null
        };

        chatInput.value = "";
        resizeInput();
        pendingImage = null;
        pendingAudio = null;
        imageInput.value = "";
        renderPreviewBar();

        onSend(payload);
    }

    chatInput.addEventListener("input", () => {
        resizeInput();
        updateControls();
    });

    chatInput.addEventListener("keydown", (e) => {
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            submitCurrentInput();
        }
    });

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitCurrentInput();
    });

    imageBtn.addEventListener("click", () => {
        if(!isBusy) imageInput.click();
    });

    imageInput.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        if(!file) return;

        if(pendingImage) URL.revokeObjectURL(pendingImage.url);
        pendingImage = {
            file,
            url: URL.createObjectURL(file),
            name: file.name || "Image"
        };
        renderPreviewBar();
    });

    micBtn.addEventListener("click", async () => {
        if(isBusy) return;

        if(mediaRecorder?.state === "recording"){
            mediaRecorder.stop();
            return;
        }

        if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined"){
            onError?.("Voice recording is not supported in this browser.");
            return;
        }

        try{
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/mp4"
            ].find(t => MediaRecorder.isTypeSupported?.(t));

            mediaRecorder = mimeType
                ? new MediaRecorder(micStream, { mimeType })
                : new MediaRecorder(micStream);

            audioChunks = [];
            recSeconds = 0;

            mediaRecorder.ondataavailable = (e) => {
                if(e.data?.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const durationSec = Math.max(1, recSeconds);
                const type = mediaRecorder?.mimeType || "audio/webm";
                stopMicStream();

                if(audioChunks.length > 0){
                    const blob = new Blob(audioChunks, { type });
                    if(pendingAudio) URL.revokeObjectURL(pendingAudio.url);
                    pendingAudio = {
                        blob,
                        url: URL.createObjectURL(blob),
                        durationSec
                    };
                    renderPreviewBar();
                }else{
                    updateControls();
                }
            };

            mediaRecorder.start();
            micBtn.classList.add("recording");
            chatInput.placeholder = "Recording 0:00... tap mic to stop";
            updateControls();

            recTimer = setInterval(() => {
                recSeconds += 1;
                chatInput.placeholder = `Recording ${formatDuration(recSeconds)}... tap mic to stop`;
            }, 1000);
        }catch(err){
            stopMicStream();
            updateControls();
            onError?.("Microphone access was denied or unavailable.");
        }
    });

    clearBtn.addEventListener("click", () => {
        onClear();
    });

    splashRetryBtn.addEventListener("click", () => {
        onRetry?.();
    });

    // GEAR CLICK HANDLERS (Navbar and Splash Screen)
    settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onOpenSettings?.();
    });

    splashSettingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        onOpenSettings?.();
    });

    closeSettingsBtn.addEventListener("click", () => {
        closeSettingsModal();
    });

    settingsModal.addEventListener("click", (e) => {
        if(e.target === settingsModal) closeSettingsModal();
    });

    tempInput.addEventListener("input", () => {
        tempVal.textContent = tempInput.value;
    });

    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const preset = btn.dataset.preset;
            if(preset === "gpu"){
                modelUrlInput.value = "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-gpu.litertlm";
                visionBackendSelect.value = "CPU";
                audioBackendSelect.value = "CPU";
            }else if(preset === "web"){
                modelUrlInput.value = "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm";
                visionBackendSelect.value = "OFF";
                audioBackendSelect.value = "OFF";
            }
        });
    });

    saveModelBtn.addEventListener("click", () => {
        const modelUrl = modelUrlInput.value.trim();
        const visionBackend = visionBackendSelect.value;
        const audioBackend = audioBackendSelect.value;
        const systemPrompt = systemPromptInput.value.trim();
        const maxOutputTokens = parseInt(maxTokensInput.value, 10) || 2048;
        const temperature = parseFloat(tempInput.value) || 0.7;

        if(!modelUrl){
            onError?.("Model URL cannot be empty.");
            return;
        }

        closeSettingsModal();
        onSaveSettings?.({ modelUrl, visionBackend, audioBackend, systemPrompt, maxOutputTokens, temperature });
    });

    resetModelBtn.addEventListener("click", () => {
        onResetSettings?.();
    });
}
