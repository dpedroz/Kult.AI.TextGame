import React, { useState } from 'react';
import type { GameCustomizationOptions } from '../types';

interface StartScreenProps {
  onStart: (options: GameCustomizationOptions) => void;
}

const Label: React.FC<{htmlFor: string; children: React.ReactNode}> = ({htmlFor, children}) => (
    <label htmlFor={htmlFor} className="block mb-1 text-sm font-medium text-gray-400">{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-300" />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 text-gray-300 appearance-none" />
);


const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [options, setOptions] = useState<GameCustomizationOptions>({
    language: 'English',
    location: 'Random',
    year: '',
    gender: 'Random',
    age: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOptions(prev => ({...prev, [name]: value}));
  };

  const handleStart = () => {
    onStart({
      ...options,
      year: options.year.trim() === '' ? 'Random' : options.year,
      age: options.age.trim() === '' ? 'Random' : options.age,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 sm:p-8 bg-gray-900">
      <div className="absolute inset-0 bg-black/50 z-0"></div>
      <div className="relative z-10 max-w-2xl w-full">
        <h1 className="text-5xl md:text-7xl font-bold text-red-500 font-serif tracking-wider mb-2 animate-pulse-slow">
          KULT
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 font-serif mb-6">
          The AI Oracle
        </p>
        <p className="text-gray-400 mb-8 leading-relaxed">
          The world you know is a lie. Before you awaken, define the vessel for your descent. The Oracle awaits your choices.
        </p>
        
        <div className="bg-black/20 border border-gray-800 rounded-lg p-6 space-y-4 text-left mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="language">Language</Label>
                    <Input 
                        id="language" 
                        name="language" 
                        type="text" 
                        placeholder="e.g., English" 
                        value={options.language} 
                        onChange={handleInputChange} 
                    />
                </div>
                <div>
                    <Label htmlFor="location">Starting Location</Label>
                    <Select id="location" name="location" value={options.location} onChange={handleInputChange}>
                        <option>Random</option>
                        <option>A rain-slicked Berlin alley</option>
                        <option>A forgotten ward in a New Orleans hospital</option>
                        <option>A secluded cabin in the Swedish wilderness</option>
                        <option>A neon-drenched Tokyo backstreet</option>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select id="gender" name="gender" value={options.gender} onChange={handleInputChange}>
                        <option>Random</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-binary</option>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="year">Year (Optional)</Label>
                    <Input id="year" name="year" type="text" placeholder="e.g., 1991" value={options.year} onChange={handleInputChange} />
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor="age">Age (Optional)</Label>
                    <Input id="age" name="age" type="text" placeholder="e.g., 35" value={options.age} onChange={handleInputChange} />
                </div>
            </div>
        </div>

        <button
          onClick={handleStart}
          className="px-8 py-3 bg-gray-800 hover:bg-red-800 text-white font-bold text-lg rounded-lg border border-gray-700 hover:border-red-700 transition-all duration-300 shadow-lg hover:shadow-red-500/20 transform hover:scale-105"
        >
          Begin Your Descent
        </button>
      </div>
    </div>
  );
};

export default StartScreen;