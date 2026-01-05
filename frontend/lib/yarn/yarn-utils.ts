import type { Retailer } from "@/types";
import type { Yarn } from "@/types/yarn";
import { getYarnSingleByIdOrThrow } from "./yarn-repository";

export function getYarnSkeinLength(yarn: Yarn): number {
    if (yarn.type === "single") {
        return yarn.skeinLength;
    } else {
        const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
        if (!mainYarn) {
            throw new Error(`MainYarn not found: ${yarn.mainYarnId}`);
        }

        return mainYarn.skeinLength;
    }
}

export function getYarnRetailers(yarn: Yarn): Retailer[] {
    if (yarn.type === "single") {
        return yarn.retailers;
    } else {
        // For double yarns, use the retailers directly from the yarn object
        // These retailers already have mainYarnUrl and carryAlongYarnUrl set by the backend API
        return yarn.retailers;
    }
}

