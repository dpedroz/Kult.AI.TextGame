
import { useState, useCallback, useRef } from 'react';
import type { Character, Choice, StorySegment, GameStage, GeminiResponse, GameCustomizationOptions } from '../types';
import { createCharacterAndGame, continueGame, generateImageFromPrompt, editImageFromPrompt } from '../services/geminiService';
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
  const [finalImage, setFinalImage] = useState<string | null>(null);

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
    if (!chatRef.current || !character || gameState !== 'playing') return;

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
      
      let finalStability = character.stability;
      if (response.characterUpdate.stabilityChange) {
          finalStability = Math.max(0, Math.min(character.maxStability, character.stability + response.characterUpdate.stabilityChange));
      }
      setCharacter(prev => {
        if (!prev) return null;
        return { ...prev, stability: finalStability };
      });

      const nextStorySegment: StorySegment = { id: Date.now() + 1, text: response.storyText };
      if (response.characterUpdate.statusEffect) {
        nextStorySegment.text += `\n\n*${response.characterUpdate.statusEffect}*`;
      }
      setStoryLog(prev => [...prev, nextStorySegment]);

      if (response.isGameOver || finalStability <= 0) {
        setGameState('gameover');
        setCurrentChoices([]);
        const gameOverText = response.isGameOver ? response.gameOverText : "Your mind shatters. The Illusion collapses around you into a vortex of screaming madness. You are lost.";
        setStoryLog(prev => [...prev, { id: Date.now() + 2, text: `\n--- ${gameOverText} ---`}]);
        
        if (response.finalPortraitPrompt) {
            try {
                // Keep the original portrait, but generate a new, final one based on it.
                const originalPortraitBase64 = character.portrait.split(',')[1];
                if (originalPortraitBase64) {
                    const editedImageUrl = await editImageFromPrompt(originalPortraitBase64, response.finalPortraitPrompt);
                    setFinalImage(editedImageUrl);
                }
            } catch (err) {
                console.error("Failed to generate final portrait:", err);
                // Silently fail, don't break the app. No final image will be shown.
            }
        }
      } else {
        setCurrentChoices(response.choices);
        setGameState('playing');
      }

    } catch (err) {
      handleApiError(err, 'story progression');
    }
  }, [gameState, character]);

  return { gameState, character, storyLog, currentChoices, error, startGame, makeChoice, isRetrying, finalImage };
};