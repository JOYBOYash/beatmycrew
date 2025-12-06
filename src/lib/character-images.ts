
const nameAliasMap: Record<string, string> = {
    "Carue": "Karoo",
};

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
      return 'https://placehold.co/400x600/F4D03F/000000?text=No+Image';
    }
  } catch (error) {
    console.error(`Fetch failed for ${name}:`, error);
    return 'https://placehold.co/400x600/E63946/FFFFFF?text=Error';
  }
}
