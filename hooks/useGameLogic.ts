
import { useState, useCallback, useRef } from 'react';
import type { Character, Choice, StorySegment, GameStage, GeminiResponse, GameCustomizationOptions } from '../types';
import { createCharacterAndGame, continueGame } from '../services/geminiService';
import type { Chat } from '@google/genai';

async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry: (attempt: number, error: Error) => void,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        onRetry(i + 1, lastError);
        // Exponential backoff
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameStage>('start');
  const [character, setCharacter] = useState<Character | null>(null);
  const [storyLog, setStoryLog] = useState<StorySegment[]>([]);
  const [currentChoices, setCurrentChoices] = useState<Choice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const chatRef = useRef<Chat | null>(null);

  const handleApiError = (err: unknown, context: string) => {
    console.error(`Error during ${context}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown horror has occurred.';
    setError(`The connection to the Oracle has been severed. ${errorMessage}`);
    setGameState('error');
    setIsRetrying(false);
  };

  const startGame = useCallback(async (options: GameCustomizationOptions) => {
    setGameState('loading');
    setError(null);
    setIsRetrying(false);

    const onRetry = (attempt: number, error: Error) => {
      console.warn(`Attempt ${attempt} failed for startGame:`, error);
      setIsRetrying(true);
    };

    try {
      const { newCharacter, firstResponse, chat } = await withRetry(
        () => createCharacterAndGame(options),
        onRetry
      );
      chatRef.current = chat;
      
      setCharacter(newCharacter);

      setStoryLog([{ id: Date.now(), text: firstResponse.storyText }]);
      setCurrentChoices(firstResponse.choices);
      setGameState('playing');
      setIsRetrying(false);
    } catch (err) {
      handleApiError(err, 'game initialization');
    }
  }, []);

  const makeChoice = useCallback(async (choiceText: string) => {
    if (!chatRef.current || gameState !== 'playing') return;

    setGameState('loading');
    setCurrentChoices([]);
    setStoryLog(prev => [
      ...prev, 
      { id: Date.now(), text: choiceText, isPlayerChoice: true }
    ]);
    setIsRetrying(false);
    
    const onRetry = (attempt: number, error: Error) => {
      console.warn(`Attempt ${attempt} failed for makeChoice:`, error);
      setIsRetrying(true);
    };

    try {
      const response: GeminiResponse = await withRetry(
          () => continueGame(chatRef.current!, choiceText),
          onRetry
      );

      setIsRetrying(false);
      
      setCharacter(prev => {
        if (!prev) return null;
        const newChar = { ...prev };
        
        // Update stability
        if (response.characterUpdate.stabilityChange) {
            newChar.stability = Math.max(0, Math.min(newChar.maxStability, newChar.stability + response.characterUpdate.stabilityChange));
        }
        // Add new item - this part of the logic might need to be updated since inventory is an object array now.
        // For simplicity, this demo won't handle adding/removing items from the new structure, but a real implementation would need to.
        // if (response.characterUpdate.newItem && !newChar.inventory.find(i => i.text === response.characterUpdate.newItem)) {
        //     newChar.inventory = [...newChar.inventory, { text: response.characterUpdate.newItem, icon: 'item' }];
        // }
        // // Remove item
        // if (response.characterUpdate.removeItem) {
        //     newChar.inventory = newChar.inventory.filter(item => item.text !== response.characterUpdate.removeItem);
        // }

        return newChar;
      });

      const nextStorySegment: StorySegment = { id: Date.now() + 1, text: response.storyText };
      if (response.characterUpdate.statusEffect) {
        nextStorySegment.text += `\n\n*${response.characterUpdate.statusEffect}*`;
      }
      setStoryLog(prev => [...prev, nextStorySegment]);

      if (response.isGameOver || (character && character.stability <= 0)) {
        setGameState('gameover');
        setCurrentChoices([]);
        const gameOverText = response.isGameOver ? response.gameOverText : "Your mind shatters. The Illusion collapses around you into a vortex of screaming madness. You are lost.";
        setStoryLog(prev => [...prev, { id: Date.now() + 2, text: `\n--- ${gameOverText} ---`}])
      } else {
        setCurrentChoices(response.choices);
        setGameState('playing');
      }

    } catch (err) {
      handleApiError(err, 'story progression');
    }
  }, [gameState, character]);

  return { gameState, character, storyLog, currentChoices, error, startGame, makeChoice, isRetrying };
};