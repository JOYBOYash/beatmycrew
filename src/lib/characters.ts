
import characters from './characters.json';

export type Character = {
  id: number;
  name: string;
  description: string;
  imageHint: string;
};

export const ROLES = ["Captain", "Vice-Captain", "Navigator", "Sniper", "Cook", "Doctor", "Shipwright", "Combatant"] as const;
export type Role = (typeof ROLES)[number];

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

type ApiCharacter = {
    id: number;
    name: string;
    description?: string;
    [key: string]: any;
}

export const fetchAllCharacters = async (): Promise<Character[]> => {
    try {
        const chars: ApiCharacter[] = characters;
        
        return chars.map(char => ({
            id: char.id,
            name: char.name,
            description: char.description || "A mysterious figure from the world of One Piece.",
            imageHint: char.name, 
        }));
    } catch (error) {
        console.error("Failed to load character data:", error);
        return []; 
    }
}


export const generateCharacterPool = (allCharacters: Character[], size: number = 50): Character[] => {
    if (allCharacters.length === 0) return [];
    return shuffleArray(allCharacters).slice(0, size);
}
