
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { createInitialCharacterPrompt, createSystemInstruction, GAME_STATE_SCHEMA, createUITranslationsPrompt, createItemTranslationPrompt } from '../constants';
import type { Character, GeminiResponse, GameCustomizationOptions, UITranslations, Trait, Item } from '../types';

function parseJsonResponse<T,>(jsonString: string): T {
    try {
        const cleanedString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanedString);
    } catch (error) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error("Received malformed data from the Oracle.");
    }
}

interface CharacterGenData {
    name: string;
    archetype: string;
    background: string;
    advantages: Trait[];
    disadvantages: Trait[];
    inventory: Item[];
    portraitPrompt: string;
    location: string;
    year: string;
}


export async function createCharacterAndGame(options: GameCustomizationOptions): Promise<{
    newCharacter: Character,
    firstResponse: GeminiResponse,
    chat: Chat,
}> {
    // Initialize the AI client here, at the time of the request, to avoid race conditions with environment variable injection.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    // 1. Generate Character Details (in English) and UI Translations in parallel
    const characterGenPrompt = createInitialCharacterPrompt(options);
    const translationsPrompt = createUITranslationsPrompt(options.language);

    const [characterGenResponse, translationsResponse] = await Promise.all([
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: characterGenPrompt,
            config: { responseMimeType: 'application/json' },
        }),
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: translationsPrompt,
            config: { responseMimeType: 'application/json' },
        })
    ]);
    
    const characterData = parseJsonResponse<CharacterGenData>(characterGenResponse.text);
    const uiTranslations = parseJsonResponse<UITranslations>(translationsResponse.text);

    // 2. If a non-English language is selected, translate the generated items.
    if (options.language.toLowerCase().trim() !== 'english') {
        const itemsToTranslate = [
            ...characterData.advantages.map(a => a.text),
            ...characterData.disadvantages.map(d => d.text),
            ...characterData.inventory.map(i => i.text)
        ];

        if (itemsToTranslate.length > 0) {
            const itemTranslationPrompt = createItemTranslationPrompt(itemsToTranslate, options.language);
            const itemTranslationResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: itemTranslationPrompt,
                config: { responseMimeType: 'application/json' },
            });

            const translatedData = parseJsonResponse<{ translations: string[] }>(itemTranslationResponse.text);

            if (translatedData.translations && translatedData.translations.length === itemsToTranslate.length) {
                let currentIdx = 0;
                characterData.advantages.forEach(a => { a.text = translatedData.translations[currentIdx++]; });
                characterData.disadvantages.forEach(d => { d.text = translatedData.translations[currentIdx++]; });
                characterData.inventory.forEach(i => { i.text = translatedData.translations[currentIdx++]; });
            } else {
                console.warn("Translation mapping failed due to mismatched lengths. Falling back to English items.");
            }
        }
    }


    // 3. Generate Character Portrait
    const imageUrl = await generateImageFromPrompt(characterData.portraitPrompt);
    
    const newCharacter: Character = {
        ...characterData,
        portrait: imageUrl,
        stability: 10,
        maxStability: 10,
        uiTranslations,
        gameSettings: {
            location: characterData.location,
            year: characterData.year
        }
    };
    
    // 4. Initialize Chat and get the first story segment
    const systemInstruction = createSystemInstruction(options.language);
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: GAME_STATE_SCHEMA,
        },
    });

    const firstTurnPrompt = `Start the game in ${newCharacter.gameSettings.year} at ${newCharacter.gameSettings.location}. My character is ${newCharacter.name}, ${newCharacter.archetype}. Their background is: ${newCharacter.background}. Plunge them immediately into a mysterious and unsettling situation that is directly related to their background or one of their advantages/disadvantages. Avoid generic starting locations like an office or library unless it is explicitly part of the character's background.`;
    const firstResponseRaw: GenerateContentResponse = await chat.sendMessage({ message: firstTurnPrompt });

    const firstResponse = parseJsonResponse<GeminiResponse>(firstResponseRaw.text);
    
    return { newCharacter, firstResponse, chat };
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }

    const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
}

export async function editImageFromPrompt(base64ImageData: string, prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: 'image/jpeg', // The original is a JPEG
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                // Edited images are often returned as PNGs
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
    }

    throw new Error("Image editing failed, no image data returned in the response.");
}


export async function continueGame(chat: Chat, playerChoice: string): Promise<GeminiResponse> {
    const response = await chat.sendMessage({ message: playerChoice });
    return parseJsonResponse<GeminiResponse>(response.text);
}