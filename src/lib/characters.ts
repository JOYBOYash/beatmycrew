import characterPlaceholders from './placeholder-images.json';

export type Character = {
  id: string;
  name: string;
  image: string;
  imageHint: string;
};

export const ROLES = ["Captain", "Vice-Captain", "Navigator", "Sniper", "Cook"] as const;
export type Role = (typeof ROLES)[number];

const characterData: { id: string; name: string }[] = [
  { id: "luffy", name: "Monkey D. Luffy" },
  { id: "zoro", name: "Roronoa Zoro" },
  { id: "nami", name: "Nami" },
  { id: "usopp", name: "Usopp" },
  { id: "sanji", name: "Sanji" },
  { id: "chopper", name: "Tony Tony Chopper" },
  { id: "robin", name: "Nico Robin" },
  { id: "franky", name: "Franky" },
  { id: "brook", name: "Brook" },
  { id: "jinbe", name: "Jinbe" },
  { id: "shanks", name: "Shanks" },
  { id: "mihawk", name: "Dracule Mihawk" },
  { id: "buggy", name: "Buggy" },
  { id: "crocodile", name: "Crocodile" },
  { id: "law", name: "Trafalgar Law" },
];

const placeholderMap = new Map(characterPlaceholders.placeholderImages.map(p => [p.id, p]));

export const ALL_CHARACTERS: Character[] = characterData.map(char => {
    const placeholder = placeholderMap.get(char.id);
    if (!placeholder) {
        throw new Error(`Placeholder for character ID '${char.id}' not found.`);
    }
    return {
        id: char.id,
        name: char.name,
        image: placeholder.imageUrl,
        imageHint: placeholder.imageHint,
    }
});

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const generateCharacterPool = (size: number = 50): Character[] => {
    let pool: Character[] = [];
    while (pool.length < size) {
        pool = [...pool, ...ALL_CHARACTERS];
    }
    return shuffleArray(pool).slice(0, size);
}
