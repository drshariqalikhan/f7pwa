export const CONFIG = {
    appTitle: "Gemma 4 On-Device",
    assistantName: "Gemma 4 E2B",
    avatarText: "G4",
    welcomeMessage: "👋 Hi! Send a message to load Gemma 4 E2B locally in your browser via WebGPU.",
    starterChips: [
        "Explain quantum computing simply",
        "Write a short haiku",
        "Summarize how on-device AI works"
    ],
    // Web-optimized Gemma 4 E2B model (~2.34 GB)
    // modelUrl: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm",
    modelUrl: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-gpu.litertlm",
    systemPrompt: "You are a helpful and concise assistant.",
    maxNumTokens: 8192,
    maxOutputTokens: 2048,
    temperature: 0.7
};