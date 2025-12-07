import type { Retailer } from "@/types";
import type { Yarn, YarnSingle, YarnType } from "@/types/yarn";
import { getYarnSingleByIdOrThrow } from "./yarn-repository";

export function getYarnSinglePriceForRetailer(yarn: YarnSingle, retailer: Retailer): number {
    return yarn.retailers.find(r => r.name === retailer.name)?.price ?? 0;
}

export function getLowestUnitPriceAvailable(yarn: Yarn): number {
    if (yarn.type === "single") {
        // YarnSingle is an easy lookup into yarn.retailers
        return yarn.retailers.reduce((min, retailer) => Math.min(min, retailer.price), Infinity);
    } else {
        // YarnDouble requires:
        // 1. Lookup main yarn
        const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
        if (!mainYarn) {
            throw new Error(`MainYarn not found: ${yarn.mainYarnId}`);
        }
        // 2. Lookup carry along yarn
        const carryAlongYarn = getYarnSingleByIdOrThrow(yarn.carryAlongYarnId);
        if (!carryAlongYarn) {
            throw new Error(`CarryAlongYarn not found: ${yarn.carryAlongYarnId}`);
        }

        // 3. Recursively call getLowestUnitPriceAvailable for both yarns and add the results
        return getLowestUnitPriceAvailable(mainYarn) + getLowestUnitPriceAvailable(carryAlongYarn);

    }
}

export function calculateTotalPriceForRetailer(yarn: Yarn, metersRequired: number, retailer: Retailer): number {
    if (yarn.type === "single") {
        const skeinsNeeded = Math.ceil(metersRequired / yarn.skeinLength);
        return getYarnSinglePriceForRetailer(yarn, yarn.retailers[0]) * skeinsNeeded;
    } else {
        const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
        if (!mainYarn) {
            throw new Error(`MainYarn not found: ${yarn.mainYarnId}`);
        }

        const carryAlongYarn = getYarnSingleByIdOrThrow(yarn.carryAlongYarnId);
        if (!carryAlongYarn) {
            throw new Error(`CarryAlongYarn not found: ${yarn.carryAlongYarnId}`);
        }

        const mainYarnSkeinsNeeded = Math.ceil(metersRequired / mainYarn.skeinLength);
        const carryAlongYarnSkeinsNeeded = Math.ceil(metersRequired / carryAlongYarn.skeinLength);

        const mainYarnTotalPrice = getYarnSinglePriceForRetailer(mainYarn, retailer);
        const carryAlongYarnTotalPrice = getYarnSinglePriceForRetailer(carryAlongYarn, retailer);

        return (mainYarnTotalPrice * mainYarnSkeinsNeeded) + (carryAlongYarnTotalPrice * carryAlongYarnSkeinsNeeded);
    }
}

export function getLowestTotalPriceAvailable(yarn: Yarn, metersRequired: number): number {
    if (yarn.type === "single") {
        return getLowestUnitPriceAvailable(yarn) * Math.ceil(metersRequired / yarn.skeinLength);
    } else {
        const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
        if (!mainYarn) {
            throw new Error(`MainYarn not found: ${yarn.mainYarnId}`);
        }

        const carryAlongYarn = getYarnSingleByIdOrThrow(yarn.carryAlongYarnId);
        if (!carryAlongYarn) {
            throw new Error(`CarryAlongYarn not found: ${yarn.carryAlongYarnId}`);
        }

        const mainYarnTotalPrice = getLowestUnitPriceAvailable(mainYarn) * Math.ceil(metersRequired / mainYarn.skeinLength);
        const carryAlongYarnTotalPrice = getLowestUnitPriceAvailable(carryAlongYarn) * Math.ceil(metersRequired / carryAlongYarn.skeinLength);

        return mainYarnTotalPrice + carryAlongYarnTotalPrice;
    }
}

