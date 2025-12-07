import type { YarnSingle, YarnDouble, Yarn } from "@/types/yarn";
import yarnSinglesData from "@/data/yarn-singles.json";
import yarnDoublesData from "@/data/yarn-doubles.json";

const yarnSingles = yarnSinglesData as YarnSingle[];
const yarnDoubles = yarnDoublesData as YarnDouble[];

export function getYarnSingleByIdOrThrow(id: string): YarnSingle {
    const yarn = yarnSingles.find((yarn) => yarn.id === id);
    if (!yarn) {
        throw new Error(`Yarn not found: ${id}`);
    }   
    return yarn;
}

export function getYarnDoubleByIdOrThrow(id: string): YarnDouble {
    const yarn = yarnDoubles.find((yarn) => yarn.id === id);
    if (!yarn) {
        throw new Error(`Yarn not found: ${id}`);
    }
    return yarn;
}

export function getAllYarnSinglesOrThrow(): YarnSingle[] {
    if (yarnSingles.length === 0) {
        throw new Error("No yarns found");
    }
    return yarnSingles;
}

export function getAllYarnDoublesOrThrow(): YarnDouble[] {
    if (yarnDoubles.length === 0) {
        throw new Error("No yarns found");
    }
    return yarnDoubles;
}

export function getAllYarnsOrThrow(): Yarn[] {
    if (yarnSingles.length === 0 && yarnDoubles.length === 0) {
        throw new Error("No yarns found");
    }
    return [...yarnSingles, ...yarnDoubles];
}

// Fake delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Async version with fake delay for demo/loading state
export async function getAllYarnsAsync(): Promise<Yarn[]> {
    await delay(1000); // 1 second artificial delay
    return getAllYarnsOrThrow();
}

