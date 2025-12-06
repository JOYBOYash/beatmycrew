
import aliases from './aliases.json';

const nameAliasMap: Record<string, string> = aliases;

export async function getCharImage(name: string): Promise<string> {
  const officialName = nameAliasMap[name] || name;
  const encodedName = encodeURIComponent(officialName.replace(/\./g, '.'));
  const apiUrl = `https://onepiece.fandom.com/api.php?action=query&format=json&prop=pageimages&titles=${encodedName}&pithumbsize=400&origin=*`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const data = await response.json();
    const pages = data.query.pages;
    const page = Object.values(pages)[0] as any;
    
    if (page.thumbnail) {
      return page.thumbnail.source;
    } else {
      console.warn(`No image for ${name}`);
      return '/bmc_logo.png';
    }
  } catch (error) {
    console.error(`Fetch failed for ${name}:`, error);
    return '/bmc_logo.png';
  }
}
