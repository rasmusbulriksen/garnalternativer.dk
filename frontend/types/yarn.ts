import type { SingleYarnOffer, DoubleYarnOffer } from ".";

interface YarnBase {
    id: string;
    name: string;
    image: string;
    tension: number;
}

export interface YarnSingle extends YarnBase {
    type: YarnType.Single;
    skeinLength: number;
    offers: SingleYarnOffer[];
}

export interface YarnDouble extends YarnBase {
    type: YarnType.Double;
    mainYarnId: string;
    carryAlongYarnId: string;
    offers: DoubleYarnOffer[];
}

export type Yarn = YarnSingle | YarnDouble;

export enum YarnType {
    Single = "single",
    Double = "double",
}
