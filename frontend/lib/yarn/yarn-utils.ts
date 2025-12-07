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
        const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
        const carryAlongYarn = getYarnSingleByIdOrThrow(yarn.carryAlongYarnId);
        if (!mainYarn) {
            throw new Error(`MainYarn not found: ${yarn.mainYarnId}`);
        }
        if (!carryAlongYarn) {
            throw new Error(`CarryAlongYarn not found: ${yarn.carryAlongYarnId}`);
        }

        // Find the retailers that sell BOTH yarns (no customers want to pay for shipping twice - especially not in Jutland, Denmark. Lol.)
        return mainYarn.retailers.filter((retailer) => 
            carryAlongYarn.retailers.some((c) => c.name === retailer.name)
        );
    }
}

