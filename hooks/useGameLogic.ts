import { useState, useCallback, useRef } from 'react';
import type { Character, Choice, StorySegment, GameStage, GeminiResponse, GameCustomizationOptions } from '../types';
import { createCharacterAndGame, continueGame } from '../services/geminiService';
import type { Chat } from '@google/genai';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameStage>('start');
  const [character, setCharacter] = useState<Character | null>(null);
  const [storyLog, setStoryLog] = useState<StorySegment[]>([]);
  const [currentChoices, setCurrentChoices] = useState<Choice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const chatRef = useRef<Chat | null>(null);

  const handleApiError = (err: unknown, context: string) => {
    console.error(`Error during ${context}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown horror has occurred.';
    setError(`The connection to the Oracle has been severed. ${errorMessage}`);
    setGameState('error');
  };

  const startGame = useCallback(async (options: GameCustomizationOptions) => {
    setGameState('loading');
    setError(null);

    try {
      const { newCharacter, firstResponse, chat } = await createCharacterAndGame(options);
      chatRef.current = chat;
      
      setCharacter(newCharacter);

      setStoryLog([{ id: Date.now(), text: firstResponse.storyText }]);
      setCurrentChoices(firstResponse.choices);
      setGameState('playing');
    } catch (err) {
      handleApiError(err, 'game initialization');
    }
  }, []);

  const makeChoice = useCallback(async (choice: Choice) => {
    if (!chatRef.current || gameState !== 'playing') return;

    setGameState('loading');
    setStoryLog(prev => [
      ...prev, 
      { id: Date.now(), text: choice.text, isPlayerChoice: true }
    ]);

    try {
      const response: GeminiResponse = await continueGame(chatRef.current, choice.text);
      
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

  return { gameState, character, storyLog, currentChoices, error, startGame, makeChoice };
};