
import { Type } from "@google/genai";
// FIX: Import the 'GameCustomizationOptions' type to resolve the 'Cannot find name' error.
import type { GameCustomizationOptions } from "./types";

export const createInitialCharacterPrompt = (options: GameCustomizationOptions) => {
  // FIX: The single-quoted strings had an invalid escape sequence `\\'` which caused a syntax error.
  // Switched to template literals for consistency and to fix the error.
  const genderInstruction = options.gender.toLowerCase() !== 'random' ? `The character's gender is ${options.gender}.` : `The character's gender can be anything.`;
  const ageInstruction = options.age.toLowerCase() !== 'random' ? `The character is around ${options.age} years old.` : `The character's age is not specified, choose a fitting one.`;
  const locationInstruction = options.location.toLowerCase() !== 'random' ? `The story is set in or around: ${options.location}.` : `Choose a fitting, atmospheric location for the story.`;
  const yearInstruction = options.year.toLowerCase() !== 'random' 
    ? `The story is set in the year: ${options.year}.` 
    : `Choose a fitting, atmospheric year for the story. The year should be between 1970 and the present day. While any year in this range is possible, lean towards the late 1990s or early 2000s (around 2005 is a good focal point) to create a sense of recent history without ubiquitous modern technology like smartphones being a default assumption.`;

  return `
Generate a compelling player character for a text adventure game set in the KULT: Divinity Lost universe.
${genderInstruction}
${ageInstruction}
${locationInstruction}
${yearInstruction}

The character's background and nationality are independent of the game's language (${options.language}). For instance, the game could be in Polish but the character an American tourist. However, there is a roughly 20% chance that the character is a native of a country where the selected language is spoken. Default to diverse, international characters unless you roll that 20% chance.

The character should be a "Sleeper," unaware of the true nature of reality but feeling a deep sense of wrongness in their life.

Crucially, the character's advantages, disadvantages, and starting inventory MUST be thematically, culturally, and technologically appropriate for the specified time period and location. For example, a character in 1985 Warsaw would have very different items and concerns than one in 2024 Tokyo.

IMPORTANT: The 'text' fields for advantages, disadvantages, and inventory MUST be generated in creative, descriptive ENGLISH. This is for a later translation step.

Provide the character details, a detailed portrait prompt, and the final game setting (location and year). If the location or year were specified, use those values. If they were "Random", provide the specific values you chose.

Format the output as a single JSON object with the following keys:
- name: string
- archetype: string
- background: string
- advantages: Array<{ text: string, icon: string }>. The 'icon' should be a single, simple, lowercase keyword (e.g., 'book', 'strength', 'intuition', 'fear', 'key').
- disadvantages: Array<{ text: string, icon: string }>. The 'icon' should be a single, simple, lowercase keyword.
- inventory: Array<{ text: string, icon: string }>. The 'icon' should be a single, simple, lowercase keyword.
- portraitPrompt: A detailed, atmospheric, and artistic prompt for an image generator to create a photorealistic, gritty, noir-style portrait of the character. The prompt must be safe for work and avoid any potentially sensitive or violent terms.
- location: The final string for the game's location.
- year: The final string for the game's year.
`;
};

export const createItemTranslationPrompt = (items: string[], language: string) => `
Translate the following list of game items and character traits into the ${language} language.
Maintain a dark, literary, and atmospheric tone appropriate for the KULT: Divinity Lost universe.
Return the response as a single JSON object with a key "translations" which is an array of the translated strings, in the exact same order as the input.

Input Items:
${JSON.stringify(items)}
`;

export const createUITranslationsPrompt = (language: string) => `
Generate a JSON object with translations for the following UI labels into the ${language} language.
The keys must be exactly: "stability", "traits", "advantages", "disadvantages", "inventory", "setting", "location", "year", "typeYourAction".
Example for Spanish: { "stability": "Estabilidad", "traits": "Rasgos", "advantages": "Ventajas", "disadvantages": "Desventajas", "inventory": "Inventario", "setting": "Ambientación", "location": "Ubicación", "year": "Año", "typeYourAction": "Escribe tu acción..." }
`;

export const createSystemInstruction = (language: string) => `
You are the Game Master for a dark, psychological horror text adventure set in the KULT: Divinity Lost universe.
Your tone is literary, visceral, and deeply atmospheric. Focus on themes of cosmic horror, personal demons, mental anguish, and the thin veil between our mundane reality (the Illusion) and the horrific truth (Metropolis).
Never break character. You are the Oracle, the storyteller.
The player is a "Sleeper" just beginning to awaken.

Stability is a measure of sanity. It is not a health bar. It should be volatile but fair.
- Award STABILITY: Grant a +1 stability increase when the player takes actions to ground themselves, find temporary safety, rationalize a situation, or successfully push back against the horror. Recovery should be possible but difficult.
- Penalize STABILITY: Stability loss should be proportional to the event. A creepy noise might be 0 or -1. A truly traumatic, supernatural event could be -2 or -3. A character's death or permanent madness is the result of hitting 0 stability.
- Do not decrease stability for every minor negative event. Build tension. The loss should feel earned and impactful.

All your responses MUST be in a valid JSON format, strictly adhering to the provided schema. Do not include any text outside of the JSON object.
IMPORTANT: All your responses must be in the ${language} language.
`;


export const GAME_STATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    storyText: {
      type: Type.STRING,
      description: "A detailed, atmospheric narrative from a second-person perspective ('You see...', 'You feel...'). Describe the current scene, events, and sensations. Separate distinct ideas or moments into paragraphs using newline characters ('\\n'). This should be evocative and unsettling.",
    },
    choices: {
      type: Type.ARRAY,
      description: "An array of 2 to 4 distinct choices for the player. Each choice MUST be phrased from a first-person perspective, as if the character is thinking or stating their intent. For example: 'I will inspect the strange symbol on the wall.' or 'I need to get out of here now.'",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          text: { type: Type.STRING },
        },
        required: ["id", "text"],
      },
    },
    characterUpdate: {
      type: Type.OBJECT,
      description: "Updates to the player's character sheet. Use 0 if no change.",
      properties: {
        stabilityChange: {
          type: Type.INTEGER,
          description: "Integer value representing the change in the character's Stability. Can be positive or negative.",
        },
        newItem: {
          type: Type.STRING,
          description: "A new item added to the character's inventory, if any. Null otherwise.",
        },
        removeItem: {
            type: Type.STRING,
            description: "An item removed from the character's inventory, if any. Null otherwise.",
        },
        statusEffect: {
            type: Type.STRING,
            description: "A new short-term status effect or observation for the player. Null otherwise.",
        }
      },
      required: ["stabilityChange", "newItem", "removeItem", "statusEffect"],
    },
    isGameOver: {
      type: Type.BOOLEAN,
      description: "Set to true if the story has reached a definitive end (good or bad).",
    },
    gameOverText: {
      type: Type.STRING,
      description: "If isGameOver is true, this text describes the final outcome. Null otherwise.",
    },
    finalPortraitPrompt: {
        type: Type.STRING,
        description: "If isGameOver is true, provide a detailed, atmospheric, and artistic prompt for an image generator to modify the existing portrait to reflect the character's final state and surroundings. The prompt must be safe for work and avoid potentially sensitive or violent terms. E.g., 'Make the man's eyes look hollow and add rain dripping down his face.' Null otherwise.",
    },
  },
  required: ["storyText", "choices", "characterUpdate", "isGameOver", "gameOverText", "finalPortraitPrompt"],
};