import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { createInitialCharacterPrompt, createSystemInstruction, GAME_STATE_SCHEMA, createUITranslationsPrompt } from '../constants';
import type { Character, GeminiResponse, GameCustomizationOptions, UITranslations, Trait, Item } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
    // 1. Generate Character Details and UI Translations in parallel
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


    // 2. Generate Character Portrait
    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Photorealistic, gritty, noir-style portrait. ${characterData.portraitPrompt}`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });

    const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    
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
    
    // 3. Initialize Chat and get the first story segment
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


export async function continueGame(chat: Chat, playerChoice: string): Promise<GeminiResponse> {
    const response = await chat.sendMessage({ message: playerChoice });
    return parseJsonResponse<GeminiResponse>(response.text);
}