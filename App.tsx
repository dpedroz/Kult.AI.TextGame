
import React from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import LoadingIndicator from './components/LoadingIndicator';

const App: React.FC = () => {
  const { gameState, character, storyLog, currentChoices, error, startGame, makeChoice } = useGameLogic();

  const renderContent = () => {
    if (gameState === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center text-red-400 p-8">
          <h2 className="text-3xl font-bold mb-4">An Unspeakable Error Occurred</h2>
          <p className="text-lg font-serif mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
          >
            Refresh the Veil
          </button>
        </div>
      );
    }

    if (gameState === 'start') {
      return <StartScreen onStart={startGame} />;
    }
    
    if (gameState === 'loading' && !character) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center">
                <LoadingIndicator />
                <p className="text-lg font-serif mt-4 animate-pulse">Awakening from the Lie...</p>
            </div>
        )
    }

    return (
      <GameScreen
        character={character}
        storyLog={storyLog}
        choices={currentChoices}
        onChoiceSelected={makeChoice}
        isLoading={gameState === 'loading'}
      />
    );
  };

  return <div className="min-h-screen bg-gray-900">{renderContent()}</div>;
};

export default App;
