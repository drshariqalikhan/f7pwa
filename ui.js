export const f7App = new Framework7({
    el: "#app",
    theme: "ios"
});

const splashScreen = document.getElementById("splashScreen");
const splashAvatar = document.getElementById("splashAvatar");
const splashTitle = document.getElementById("splashTitle");
const splashStatus = document.getElementById("splashStatus");
const splashProgressFill = document.getElementById("splashProgressFill");
const splashError = document.getElementById("splashError");
const splashRetryBtn = document.getElementById("splashRetryBtn");

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
const avatarTextEl = document.getElementById("avatarText");
const clearBtn = document.getElementById("clearBtn");

let isBusy = false;
let pendingImage = null;
let pendingAudio = null;
let activeUrls = [];

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

export function setSplash({ title, avatarText, status, progress, error }){
    if(title) splashTitle.textContent = title;
    if(avatarText) splashAvatar.textContent = avatarText;
    if(status !== undefined) splashStatus.textContent = status;

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
    splashScreen.classList.remove("hidden");
    splashScreen.setAttribute("aria-hidden", "false");
}

export function hideSplash(){
    splashScreen.classList.add("hidden");
    splashScreen.setAttribute("aria-hidden", "true");
}

export function scrollToBottom(){
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function setHeader({ title, assistantName, avatarText, status }){
    if(title){
        document.title = title;
        splashTitle.textContent = title;
    }
    if(assistantName) assistantNameEl.textContent = assistantName;
    if(avatarText){
        avatarTextEl.textContent = avatarText;
        splashAvatar.textContent = avatarText;
    }
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

    let textTarget = bubble;
    if(payload.imageUrl || payload.audioUrl){
        if(payload.text){
            textTarget = document.createElement("span");
            textTarget.textContent = payload.text;
            bubble.appendChild(textTarget);
        }
    }else{
        bubble.textContent = payload.text || "";
    }

    const time = document.createElement("div");
    time.className = "msg-time";
    time.textContent = timestamp || formatTime();

    row.appendChild(bubble);
    row.appendChild(time);
    chatMessages.appendChild(row);
    scrollToBottom();

    return textTarget;
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
    bubble.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollToBottom();
}

export function hideTyping(){
    const el = document.getElementById("typingIndicator");
    if(el) el.remove();
}

export function bindEvents({ onSend, onClear, onError, onRetry }){
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
}
