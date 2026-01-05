import type { YarnSingle, YarnDouble, Yarn } from "@/types/yarn";
import yarnDoublesData from "@/data/yarn-doubles.json";
import yarnSinglesData from "@/data/yarn-singles.json";

// Backend API URL - defaults to port 3001 to avoid conflict with Next.js
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';

// Cache for yarns fetched from backend
let cachedYarnSingles: YarnSingle[] | null = null;

// Fallback to JSON data if backend yarns aren't available
const fallbackYarnSingles = yarnSinglesData as YarnSingle[];

// Fetch yarns from backend API
async function fetchYarnsFromBackend(): Promise<YarnSingle[]> {
    try {
        const response = await fetch(`${BACKEND_API_URL}/yarns`);
        if (!response.ok) {
            throw new Error(`Failed to fetch yarns: ${response.statusText}`);
        }
        const data = await response.json();
        return data as YarnSingle[];
    } catch (error) {
        console.error('Error fetching yarns from backend:', error);
        // Return empty array - will fall back to JSON files in getYarnSingles
        return [];
    }
}

// Get yarn singles from backend (with caching), fallback to JSON if backend unavailable
async function getYarnSingles(): Promise<YarnSingle[]> {
    if (cachedYarnSingles === null) {
        const backendYarns = await fetchYarnsFromBackend();
        // If backend returned yarns, use them; otherwise fall back to JSON
        if (backendYarns.length > 0) {
            cachedYarnSingles = backendYarns;
        } else {
            console.warn('Backend returned no yarns, using JSON fallback');
            cachedYarnSingles = fallbackYarnSingles;
        }
    }
    return cachedYarnSingles;
}

// Clear cache (useful for development/testing)
export function clearYarnCache(): void {
    cachedYarnSingles = null;
}

const yarnDoubles = yarnDoublesData as YarnDouble[];

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
    const yarn = yarnDoubles.find((yarn) => yarn.id === id);
    if (!yarn) {
        throw new Error(`Yarn not found: ${id}`);
    }
    return yarn;
}

export async function getAllYarnSinglesOrThrow(): Promise<YarnSingle[]> {
    const yarns = await getYarnSingles();
    if (yarns.length === 0) {
        throw new Error("No yarns found");
    }
    return yarns;
}

export function getAllYarnDoublesOrThrow(): YarnDouble[] {
    if (yarnDoubles.length === 0) {
        throw new Error("No yarns found");
    }
    return yarnDoubles;
}

export async function getAllYarnsOrThrow(): Promise<Yarn[]> {
    const singles = await getYarnSingles();
    if (singles.length === 0 && yarnDoubles.length === 0) {
        throw new Error("No yarns found");
    }
    return [...singles, ...yarnDoubles];
}

// Async version that fetches from backend
export async function getAllYarnsAsync(): Promise<Yarn[]> {
    const singles = await getYarnSingles();
    return [...singles, ...yarnDoubles];
}

