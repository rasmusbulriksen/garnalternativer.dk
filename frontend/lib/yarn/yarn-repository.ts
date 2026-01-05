import type { YarnSingle, YarnDouble, Yarn } from "@/types/yarn";
import yarnDoublesData from "@/data/yarn-doubles.json";
import yarnSinglesData from "@/data/yarn-singles.json";

// Backend API URL - defaults to port 3001 to avoid conflict with Next.js
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';

// Cache for yarns fetched from backend
let cachedYarns: Yarn[] | null = null;
let cachedYarnSingles: YarnSingle[] | null = null;
let cachedYarnDoubles: YarnDouble[] | null = null;

// Fallback to JSON data if backend yarns aren't available
const fallbackYarnSingles = yarnSinglesData as YarnSingle[];
const fallbackYarnDoubles = yarnDoublesData as YarnDouble[];

// Fetch yarns from backend API (returns both single and double yarns)
async function fetchYarnsFromBackend(): Promise<Yarn[]> {
    try {
        const response = await fetch(`${BACKEND_API_URL}/yarns`);
        if (!response.ok) {
            throw new Error(`Failed to fetch yarns: ${response.statusText}`);
        }
        const data = await response.json();
        return data as Yarn[];
    } catch (error) {
        console.error('Error fetching yarns from backend:', error);
        // Return empty array - will fall back to JSON files
        return [];
    }
}

// Get all yarns from backend (with caching), fallback to JSON if backend unavailable
async function getAllYarnsFromBackend(): Promise<Yarn[]> {
    if (cachedYarns === null) {
        const backendYarns = await fetchYarnsFromBackend();
        // If backend returned yarns, use them; otherwise fall back to JSON
        if (backendYarns.length > 0) {
            cachedYarns = backendYarns;
            // Separate into singles and doubles for easier lookup
            cachedYarnSingles = backendYarns.filter((y): y is YarnSingle => y.type === 'single');
            cachedYarnDoubles = backendYarns.filter((y): y is YarnDouble => y.type === 'double');
        } else {
            console.warn('Backend returned no yarns, using JSON fallback');
            cachedYarns = [...fallbackYarnSingles, ...fallbackYarnDoubles];
            cachedYarnSingles = fallbackYarnSingles;
            cachedYarnDoubles = fallbackYarnDoubles;
        }
    }
    return cachedYarns;
}

// Get yarn singles from backend (with caching), fallback to JSON if backend unavailable
async function getYarnSingles(): Promise<YarnSingle[]> {
    if (cachedYarnSingles === null) {
        await getAllYarnsFromBackend();
    }
    return cachedYarnSingles || [];
}

// Clear cache (useful for development/testing)
export function clearYarnCache(): void {
    cachedYarns = null;
    cachedYarnSingles = null;
    cachedYarnDoubles = null;
}

export function getYarnSingleByIdOrThrow(id: string): YarnSingle {
    // First, try to find in backend cache
    if (cachedYarnSingles !== null) {
        const yarn = cachedYarnSingles.find((yarn) => yarn.id === id);
        if (yarn) {
            return yarn;
        }
    }
    
    // Fallback to JSON data if not found in backend (useful for double yarns that reference yarns not yet in DB)
    const fallbackYarn = fallbackYarnSingles.find((yarn) => yarn.id === id);
    if (fallbackYarn) {
        return fallbackYarn;
    }
    
    // If still not found, throw error
    throw new Error(`Yarn not found: ${id}. Make sure the yarn exists in the database or JSON files.`);
}

export function getYarnDoubleByIdOrThrow(id: string): YarnDouble {
    // First, try to find in backend cache
    if (cachedYarnDoubles !== null) {
        const yarn = cachedYarnDoubles.find((yarn) => yarn.id === id);
        if (yarn) {
            return yarn;
        }
    }
    
    // Fallback to JSON data
    const fallbackYarn = fallbackYarnDoubles.find((yarn) => yarn.id === id);
    if (fallbackYarn) {
        return fallbackYarn;
    }
    
    throw new Error(`Yarn not found: ${id}`);
}

export async function getAllYarnSinglesOrThrow(): Promise<YarnSingle[]> {
    const yarns = await getYarnSingles();
    if (yarns.length === 0) {
        throw new Error("No yarns found");
    }
    return yarns;
}

export async function getAllYarnDoublesOrThrow(): Promise<YarnDouble[]> {
    if (cachedYarnDoubles === null) {
        await getAllYarnsFromBackend();
    }
    const doubles = cachedYarnDoubles || [];
    if (doubles.length === 0) {
        throw new Error("No yarns found");
    }
    return doubles;
}

export async function getAllYarnsOrThrow(): Promise<Yarn[]> {
    const allYarns = await getAllYarnsFromBackend();
    if (allYarns.length === 0) {
        throw new Error("No yarns found");
    }
    return allYarns;
}

// Async version that fetches from backend
export async function getAllYarnsAsync(): Promise<Yarn[]> {
    return await getAllYarnsFromBackend();
}


