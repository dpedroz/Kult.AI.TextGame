import React from 'react';
import type { Character } from '../types';
import { 
    UserIcon, ShieldCheckIcon, ShieldExclamationIcon, BriefcaseIcon, HeartIcon,
    MapPinIcon, CalendarDaysIcon, KeyIcon, BookOpenIcon, BoltIcon, QuestionMarkCircleIcon 
} from './Icon';

interface CharacterSheetProps {
  character: Character;
}

const getIconComponent = (keyword: string): React.FC<React.SVGProps<SVGSVGElement>> => {
    const sanitizedKeyword = keyword ? keyword.toLowerCase().trim() : '';

    switch(sanitizedKeyword) {
        case 'strength':
        case 'power':
        case 'strong':
        case 'might':
        case 'energy':
        case 'bolt':
            return BoltIcon;
        case 'book':
        case 'knowledge':
        case 'lore':
        case 'academic':
        case 'journal':
            return BookOpenIcon;
        case 'key':
        case 'lock':
        case 'secret':
        case 'access':
            return KeyIcon;
        case 'advantage':
            return ShieldCheckIcon;
        case 'disadvantage':
        case 'fear':
        case 'phobia':
            return ShieldExclamationIcon;
        case 'item':
        case 'object':
            return BriefcaseIcon;
        case 'location':
        case 'map':
        case 'pin':
            return MapPinIcon;
        case 'time':
        case 'year':
        case 'date':
        case 'calendar':
            return CalendarDaysIcon;
        default:
            return QuestionMarkCircleIcon;
    }
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 sticky top-4 h-max">
      <div className="flex flex-col items-center">
        <img
          src={character.portrait}
          alt="Character Portrait"
          className="w-40 h-40 rounded-full border-2 border-gray-600 object-cover mb-4 shadow-lg"
        />
        <h2 className="text-2xl font-bold text-red-400 font-serif">{character.name}</h2>
        <p className="text-sm text-gray-400 italic mb-4">{character.archetype}</p>
      </div>
      
      <div className="space-y-4">
        <div>
            <h3 className="flex items-center text-lg font-semibold mb-2 text-gray-200">
                <HeartIcon className="w-5 h-5 mr-2 text-red-500" />
                {character.uiTranslations.stability}
            </h3>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-red-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{width: `${(character.stability / character.maxStability) * 100}%`}}>
                </div>
            </div>
            <p className="text-center text-sm mt-1 text-gray-400">{character.stability} / {character.maxStability}</p>
        </div>

        <div>
          <h3 className="flex items-center text-lg font-semibold mb-2 text-gray-200">
            <UserIcon className="w-5 h-5 mr-2" />
            {character.uiTranslations.traits}
          </h3>
          <ul className="text-sm space-y-1">
            {character.advantages.map((adv, index) => {
              const IconComponent = getIconComponent(adv.icon || 'advantage');
              return (
              <li key={`adv-${index}`} className="flex items-start">
                <IconComponent className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" /> {adv.text}
              </li>
            )})}
            {character.disadvantages.map((dis, index) => {
                const IconComponent = getIconComponent(dis.icon || 'disadvantage');
                return (
                <li key={`dis-${index}`} className="flex items-start">
                    <IconComponent className="w-4 h-4 mr-2 text-yellow-400 mt-0.5 flex-shrink-0" /> {dis.text}
                </li>
            )})}
          </ul>
        </div>

        <div>
          <h3 className="flex items-center text-lg font-semibold mb-2 text-gray-200">
            <BriefcaseIcon className="w-5 h-5 mr-2" />
            {character.uiTranslations.inventory}
          </h3>
          {character.inventory.length > 0 ? (
            <ul className="text-sm space-y-1 text-gray-300">
              {character.inventory.map((item, index) => {
                const IconComponent = getIconComponent(item.icon || 'item');
                return (
                    <li key={`item-${index}`} className="flex items-start">
                        <IconComponent className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" /> {item.text}
                    </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">Nothing but lint.</p>
          )}
        </div>
        
        <div>
          <h3 className="flex items-center text-lg font-semibold mb-2 text-gray-200 border-t border-gray-700 pt-4">
            {character.uiTranslations.setting}
          </h3>
           <ul className="text-sm space-y-1 text-gray-300">
              <li className="flex items-start">
                  <MapPinIcon className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" /> {character.gameSettings.location}
              </li>
              <li className="flex items-start">
                  <CalendarDaysIcon className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" /> {character.gameSettings.year}
              </li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;