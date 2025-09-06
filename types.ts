export interface Trait {
  text: string;
  icon: string; // Keyword for an icon
}

export interface Item {
  text: string;
  icon: string; // Keyword for an icon
}

export interface UITranslations {
  stability: string;
  traits: string;
  advantages: string;
  disadvantages: string;
  inventory: string;
  setting: string;
  location: string;
  year: string;
}

export interface Character {
  name: string;
  archetype: string;
  background: string;
  portrait: string; // base64 image data
  portraitPrompt: string;
  advantages: Trait[];
  disadvantages: Trait[];
  inventory: Item[];
  stability: number;
  maxStability: number;
  uiTranslations: UITranslations;
  gameSettings: {
    location: string;
    year: string;
  };
}

export interface Choice {
  id: number;
  text: string;
}

export interface StorySegment {
  id: number;
  text: string;
  isPlayerChoice?: boolean;
}

export interface CharacterUpdate {
  stabilityChange?: number;
  newItem?: string;
  removeItem?: string;
  statusEffect?: string;
}

export interface GeminiResponse {
  storyText: string;
  choices: Choice[];
  characterUpdate: CharacterUpdate;
  isGameOver: boolean;
  gameOverText: string | null;
}

export type GameStage = 'start' | 'loading' | 'playing' | 'gameover' | 'error';

export interface GameCustomizationOptions {
  language: string;
  location: string;
  year: string;
  gender: string;
  age: string;
}