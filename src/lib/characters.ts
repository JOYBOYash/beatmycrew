import characters from './characters.json';

export type Character = {
  id: number;
  name: string;
  imageHint: string;
};

export const ROLES = ["Captain", "Vice-Captain", "Navigator", "Sniper", "Cook"] as const;
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
    [key: string]: any;
}

export const fetchAllCharacters = async (): Promise<Character[]> => {
    try {
        const chars: ApiCharacter[] = characters;
        
        // Let's take a sizeable slice of characters and map them to our simple Character type
        return chars.slice(0, 1000).map(char => ({
            id: char.id,
            name: char.name,
            imageHint: char.name, // Use name for image hint
        }));
    } catch (error) {
        console.error("Failed to load character data:", error);
        return []; // Return empty array on failure
    }
}


export const generateCharacterPool = (allCharacters: Character[], size: number = 50): Character[] => {
    if (allCharacters.length === 0) return [];
    // Shuffle the array and take a slice of the specified size
    // This ensures no duplicates in the generated pool
    return shuffleArray(allCharacters).slice(0, size);
}
