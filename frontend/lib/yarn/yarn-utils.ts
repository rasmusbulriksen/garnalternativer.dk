import type { SingleYarnOffer, DoubleYarnOffer } from "@/types";
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

export function getYarnOffers(yarn: Yarn): SingleYarnOffer[] | DoubleYarnOffer[] {
    if (yarn.type === "single") {
        return yarn.offers;
    } else {
        return yarn.offers;
    }
}

