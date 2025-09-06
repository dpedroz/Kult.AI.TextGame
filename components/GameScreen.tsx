
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Character, Choice, StorySegment } from '../types';
import CharacterSheet from './CharacterSheet';
import LoadingIndicator from './LoadingIndicator';
import { SpeakerWaveIcon, StopCircleIcon } from './Icon';

interface GameScreenProps {
  character: Character | null;
  storyLog: StorySegment[];
  choices: Choice[];
  onChoiceSelected: (choiceText: string) => void;
  isLoading: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({ character, storyLog, choices, onChoiceSelected, isLoading }) => {
  const storyEndRef = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingSegmentId, setPlayingSegmentId] = useState<number | null>(null);
  const [customChoice, setCustomChoice] = useState('');

  // Populate voices when they are loaded by the browser
  useEffect(() => {
    const handleVoicesChanged = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged(); // Initial call for browsers that load voices upfront
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.speechSynthesis.cancel(); // Clean up on unmount
    };
  }, []);

  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyLog]);

  const handlePlayToggle = useCallback((segment: StorySegment) => {
    if (playingSegmentId === segment.id) {
      // If clicked segment is already playing, stop it
      window.speechSynthesis.cancel();
      setPlayingSegmentId(null);
    } else {
      // Stop any currently playing speech before starting a new one
      window.speechSynthesis.cancel();
      
      // Remove status effect text for cleaner speech
      const cleanText = segment.text.replace(/\n\n\*.*\*/, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Select a voice that fits the theme
      const preferredVoices = [
        'Google UK English Male', // A common, deep voice
        'Daniel', // Often the UK default on Apple devices
        'Microsoft David - English (United States)', // Common on Windows
      ];
      let selectedVoice = voices.find(voice => preferredVoices.includes(voice.name) && voice.lang.startsWith('en'));
      
      if (!selectedVoice) {
        // Fallback to the first available English voice
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Adjust parameters for a more narrative, dark tone
      utterance.pitch = 0.8;
      utterance.rate = 0.9;
      utterance.volume = 1;
      
      utterance.onstart = () => {
        setPlayingSegmentId(segment.id);
      };
      
      utterance.onend = () => {
        setPlayingSegmentId(null);
      };
      
      utterance.onerror = () => {
        console.error("An error occurred during speech synthesis.");
        setPlayingSegmentId(null);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  }, [playingSegmentId, voices]);
  
  const handleCustomChoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customChoice.trim() && !isLoading) {
        onChoiceSelected(customChoice.trim());
        setCustomChoice('');
    }
  };

  if (!character) {
    return null; // or a loading state
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <CharacterSheet character={character} />
      </div>

      <div className="md:col-span-2 bg-black/30 rounded-lg p-6 border border-gray-800 flex flex-col min-h-[80vh]">
        <div className="flex-grow overflow-y-auto pr-2">
          {storyLog.map((segment) => (
            <div key={segment.id} className="mb-6">
              {segment.isPlayerChoice ? (
                 <p className="font-serif italic text-lg text-red-400/80 border-l-2 border-red-500/50 pl-4">
                    {segment.text}
                 </p>
              ) : (
                <div className="flex items-start gap-2 group">
                    <p className="flex-grow font-serif text-lg leading-relaxed whitespace-pre-wrap">{segment.text}</p>
                    <button 
                        onClick={() => handlePlayToggle(segment)}
                        className="flex-shrink-0 mt-1 p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-800/50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label={playingSegmentId === segment.id ? "Stop narration" : "Play narration"}
                    >
                        {playingSegmentId === segment.id ? (
                            <StopCircleIcon className="w-5 h-5 animate-pulse text-red-400" />
                        ) : (
                            <SpeakerWaveIcon className="w-5 h-5" />
                        )}
                    </button>
                </div>
              )}
            </div>
          ))}
          <div ref={storyEndRef} />
        </div>

        <div className="mt-auto pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingIndicator />
              <p className="ml-4 text-gray-400 animate-pulse">The Oracle is contemplating...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => onChoiceSelected(choice.text)}
                    className="w-full text-left p-4 bg-gray-800 hover:bg-red-900/50 border border-gray-700 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isLoading}
                  >
                    <span className="font-semibold">{choice.text}</span>
                  </button>
                ))}
              </div>
              <form onSubmit={handleCustomChoiceSubmit} className="mt-4 flex gap-2">
                  <input
                      type="text"
                      value={customChoice}
                      onChange={(e) => setCustomChoice(e.target.value)}
                      placeholder={character.uiTranslations.typeYourAction || 'Type your action...'}
                      className="flex-grow px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-300 disabled:opacity-50"
                      disabled={isLoading}
                  />
                  <button 
                      type="submit"
                      className="px-6 py-2 bg-gray-700 hover:bg-red-800 text-white font-bold rounded-lg border border-gray-600 hover:border-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || !customChoice.trim()}
                  >
                      Submit
                  </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;