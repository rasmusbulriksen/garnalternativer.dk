import type { Yarn } from "@/types/yarn";
import { getYarnSingleByIdOrThrow } from "./yarn-repository";

export function getLowestUnitPriceAvailable(yarn: Yarn): number {
    if (yarn.type === "single") {
        // Find the lowest price from all offers
        if (yarn.offers.length === 0) {
            return Infinity;
        }
        return yarn.offers.reduce((min, offer) => Math.min(min, offer.price), Infinity);
    } else {
        // For double yarns, find the lowest combined price from offers
        if (yarn.offers.length === 0) {
            return Infinity;
        }
        return yarn.offers.reduce((min, offer) => Math.min(min, offer.combinedPrice), Infinity);
    }
}

export function getLowestTotalPriceAvailable(yarn: Yarn, metersRequired: number): number {
    if (yarn.type === "single") {
        const lowestUnitPrice = getLowestUnitPriceAvailable(yarn);
        if (lowestUnitPrice === Infinity) {
            return Infinity;
        }
        const skeinsNeeded = Math.ceil(metersRequired / yarn.skeinLength);
        return lowestUnitPrice * skeinsNeeded;
    } else {
        // For double yarns, find the lowest total price from offers
        if (yarn.offers.length === 0) {
            return Infinity;
        }
        
        const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
        const carryAlongYarn = getYarnSingleByIdOrThrow(yarn.carryAlongYarnId);
        // 
        const mainYarnSkeinsNeeded = Math.ceil(metersRequired / mainYarn.skeinLength);
        const carryAlongYarnSkeinsNeeded = Math.ceil(metersRequired / carryAlongYarn.skeinLength);
        
        // Calculate total price for each offer and find the minimum
        return yarn.offers.reduce((min, offer) => {
            const totalPrice = (offer.mainYarn.price * mainYarnSkeinsNeeded) + 
                              (offer.carryAlongYarn.price * carryAlongYarnSkeinsNeeded);
            return Math.min(min, totalPrice);
        }, Infinity);
    }
}

