import React, { useState, useEffect } from 'react';
import type { GameCustomizationOptions } from '../types';
import { STARTING_LOCATIONS } from '../locations';

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
  const [language, setLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [location, setLocation] = useState('Random');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('Random');
  const [age, setAge] = useState('');
  const [displayedLocations, setDisplayedLocations] = useState<string[]>([]);

  useEffect(() => {
    // Shuffle the array and pick 4 to display.
    const shuffled = [...STARTING_LOCATIONS].sort(() => 0.5 - Math.random());
    setDisplayedLocations(shuffled.slice(0, 4));
  }, []); // Empty dependency array means this runs only on mount


  const handleStart = () => {
    const finalLanguage = language === 'Other' ? customLanguage.trim() : language;
    onStart({
      language: finalLanguage || 'English', // Default to English if other is empty
      location,
      year: year.trim() === '' ? 'Random' : year,
      gender,
      age: age.trim() === '' ? 'Random' : age,
    });
  };

  // Determine grid columns based on whether the custom language input is visible
  const gridCols = language === 'Other' ? 'sm:grid-cols-2' : 'sm:grid-cols-2';

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
            <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
                 <div>
                    <Label htmlFor="language">Language</Label>
                    <Select id="language" name="language" value={language} onChange={e => setLanguage(e.target.value)}>
                        <option>English</option>
                        <option>Polish</option>
                        <option>German</option>
                        <option>French</option>
                        <option>Spanish</option>
                        <option>Italian</option>
                        <option>Other</option>
                    </Select>
                </div>
                {language === 'Other' && (
                    <div>
                        <Label htmlFor="customLanguage">Specify Language</Label>
                        <Input
                            id="customLanguage"
                            name="customLanguage"
                            type="text"
                            placeholder="e.g., Japanese"
                            value={customLanguage}
                            onChange={e => setCustomLanguage(e.target.value)}
                        />
                    </div>
                )}
                <div>
                    <Label htmlFor="location">Starting Location</Label>
                    <Select id="location" name="location" value={location} onChange={e => setLocation(e.target.value)}>
                        <option>Random</option>
                        {displayedLocations.map(loc => <option key={loc}>{loc}</option>)}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select id="gender" name="gender" value={gender} onChange={e => setGender(e.target.value)}>
                        <option>Random</option>
                        <option>Male</option>
                        <option>Female</option>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="year">Year (Optional)</Label>
                    <Input id="year" name="year" type="text" placeholder="e.g., 1991" value={year} onChange={e => setYear(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor="age">Age (Optional)</Label>
                    <Input id="age" name="age" type="text" placeholder="e.g., 35" value={age} onChange={e => setAge(e.target.value)} />
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