import type { Retailer } from ".";

interface YarnBase {
    id: string;
    name: string;
    image: string;
    tension: number;
}

export interface YarnSingle extends YarnBase {
    type: YarnType.Single;
    skeinLength: number;
    retailers: Retailer[];
    dummyUrl: string;
}

export interface YarnDouble extends YarnBase {
    type: YarnType.Double;
    mainYarnId: string;
    carryAlongYarnId: string;
}

export type Yarn = YarnSingle | YarnDouble;

export enum YarnType {
    Single = "single",
    Double = "double",
}
