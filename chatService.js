import { CONFIG } from "./config.js";

const LITERT_LM_CDN = "https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm";
const CACHE_FILENAME = CONFIG.modelUrl.split("/").pop().split("?")[0] || "model.litertlm";

let engine = null;
let conversation = null;
let initPromise = null;
let SamplerTypeRef = null;

async function imageFileToJpegBlob(file, maxSide = 768){
    const url = URL.createObjectURL(file);
    try{
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Could not decode image."));
            el.src = url;
        });

        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);

        return await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error("Could not encode JPEG image.")),
                "image/jpeg",
                0.88
            );
        });
    }finally{
        URL.revokeObjectURL(url);
    }
}

async function audioBlobToWavBlob(blob, targetRate = 16000){
    const arrayBuf = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    try{
        const decoded = await ctx.decodeAudioData(arrayBuf);
        const frameCount = Math.max(1, Math.ceil(decoded.duration * targetRate));
        const offline = new OfflineAudioContext(1, frameCount, targetRate);
        const src = offline.createBufferSource();
        src.buffer = decoded;
        src.connect(offline.destination);
        src.start(0);
        const rendered = await offline.startRendering();
        const samples = rendered.getChannelData(0);

        const wavBuf = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(wavBuf);
        const writeStr = (off, str) => {
            for(let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
        };

        writeStr(0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        writeStr(8, "WAVE");
        writeStr(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, targetRate, true);
        view.setUint32(28, targetRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, "data");
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for(let i = 0; i < samples.length; i++, offset += 2){
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        return new Blob([wavBuf], { type: "audio/wav" });
    }finally{
        await ctx.close().catch(() => {});
    }
}

async function getOrDownloadModel(url, onStatus){
    if(!navigator.storage?.getDirectory){
        onStatus?.("Streaming model...", null);
        return url;
    }

    const root = await navigator.storage.getDirectory();
    const okName = `${CACHE_FILENAME}.ok`;

    try{
        await root.getFileHandle(okName);
        const fileHandle = await root.getFileHandle(CACHE_FILENAME);
        const file = await fileHandle.getFile();
        const magic = await file.slice(0, 8).text();
        if(file.size > 0 && magic === "LITERTLM"){
            onStatus?.("Loading saved model from device...", null);
            return file;
        }
        await root.removeEntry(okName).catch(() => {});
        await root.removeEntry(CACHE_FILENAME).catch(() => {});
    }catch(_){}

    onStatus?.("Downloading model 0%...", 0);
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "";
    if(!res.ok || !res.body || contentType.includes("text/html")){
        throw new Error(`Invalid model response (HTTP ${res.status}, ${contentType || "no type"})`);
    }

    const total = Number(res.headers.get("content-length")) || 0;
    const fileHandle = await root.getFileHandle(CACHE_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    const reader = res.body.getReader();

    let received = 0;
    try{
        while(true){
            const { done, value } = await reader.read();
            if(done) break;
            await writable.write(value);
            received += value.byteLength;

            if(total > 0){
                const pct = Math.min(99, Math.round((received / total) * 100));
                onStatus?.(`Downloading model ${pct}%...`, pct);
            }else{
                const mb = (received / (1024 * 1024)).toFixed(0);
                onStatus?.(`Downloading model (${mb} MB)...`, null);
            }
        }
        await writable.close();

        const file = await fileHandle.getFile();
        const magic = await file.slice(0, 8).text();
        if(magic !== "LITERTLM"){
            throw new Error(`Not a valid .litertlm file (header="${magic}", size=${file.size} bytes)`);
        }

        const okHandle = await root.getFileHandle(okName, { create: true });
        const okWritable = await okHandle.createWritable();
        await okWritable.write("ok");
        await okWritable.close();

        return file;
    }catch(err){
        await writable.abort().catch(() => {});
        await root.removeEntry(okName).catch(() => {});
        await root.removeEntry(CACHE_FILENAME).catch(() => {});
        throw err;
    }
}

async function createFreshConversation(){
    if(!engine) return null;

    return await engine.createConversation({
        filterChannelContentFromKvCache: true,
        preface: {
            messages: [
                { role: "system", content: CONFIG.systemPrompt }
            ]
        },
        sessionConfig: {
            maxOutputTokens: CONFIG.maxOutputTokens,
            samplerParams: {
                type: SamplerTypeRef.TOP_P,
                temperature: CONFIG.temperature,
                p: 0.9,
                k: 40
            }
        }
    });
}

export async function initModel(onStatus){
    if(engine && conversation) return { engine, conversation };

    if(!initPromise){
        initPromise = (async () => {
            onStatus?.("Loading LiteRT-LM runtime...", null);
            const { Engine, SamplerType, Backend } = await import(LITERT_LM_CDN);
            SamplerTypeRef = SamplerType;

            if(!engine){
                const modelSource = await getOrDownloadModel(CONFIG.modelUrl, onStatus);
                onStatus?.("Initializing WebGPU & encoders...", null);
                engine = await Engine.create({
                    model: modelSource,
                    backend: Backend.GPU_ARTISAN,
                    visionBackend: Backend.CPU,
                    audioBackend: Backend.CPU,
                    mainExecutorSettings: {
                        maxNumTokens: CONFIG.maxNumTokens,
                        maxNumImages: 2
                    }
                });
            }

            onStatus?.("Starting session...", null);
            conversation = await createFreshConversation();
            onStatus?.("Ready", 100);
            return { engine, conversation };
        })();
    }

    try{
        return await initPromise;
    }catch(err){
        initPromise = null;
        throw err;
    }
}

export async function streamAssistantReply(userText, onChunk, onStatus, attachments = {}){
    const session = await initModel(onStatus);

    if(attachments.image && session.engine.settings.visionBackend === undefined){
        throw new Error(
            `Vision executor was not enabled by WASM (settings=${JSON.stringify(session.engine.settings)}).`
        );
    }
    if(attachments.audio && session.engine.settings.audioBackend === undefined){
        throw new Error(
            `Audio executor was not enabled by WASM (settings=${JSON.stringify(session.engine.settings)}).`
        );
    }

    const parts = [];
    if(attachments.image){
        onStatus?.("Preparing image...");
        const jpegBlob = await imageFileToJpegBlob(attachments.image);
        parts.push({ type: "image", data: jpegBlob });
    }
    if(attachments.audio){
        onStatus?.("Preparing audio...");
        const wavBlob = await audioBlobToWavBlob(attachments.audio);
        parts.push({ type: "audio", data: wavBlob });
    }
    if(userText){
        parts.push({ type: "text", text: userText });
    }

    onStatus?.("Generating...");
    const message = {
        role: "user",
        content: (attachments.image || attachments.audio) ? parts : userText
    };

    const stream = session.conversation.sendMessageStreaming(message);

    let fullText = "";
    for await (const chunk of stream){
        for(const item of chunk.content ?? []){
            if((item.type === "text" || item.type === undefined) && item.text){
                fullText += item.text;
                onChunk?.(item.text, fullText);
            }
        }
    }

    return fullText;
}

export async function resetSession(){
    if(conversation){
        try{
            conversation.cancel?.();
        }catch(_){}
        conversation = null;
    }
    if(engine){
        conversation = await createFreshConversation();
    }
}
