import { Retailer } from "@/types";
import { Yarn, YarnType } from "@/types/yarn";
import PriceComparisonTableSingle from "@/components/yarn/price-comparison/PriceComparisonTableSingle";
import PriceComparisonTableDouble from "@/components/yarn/price-comparison/PriceComparisonTableDouble";

interface Props {
    yarn: Yarn;
    retailers: Retailer[];
    metersRequired: number;
}

export default function PriceComparisonTable({ yarn, retailers, metersRequired }: Props) {
    
    return (
        <div>
            {yarn.type === YarnType.Single ? (
                <PriceComparisonTableSingle yarn={yarn} retailers={retailers} metersRequired={metersRequired} />
            ) : (
                <PriceComparisonTableDouble yarn={yarn} retailers={retailers} metersRequired={metersRequired} />
            )}
        </div>
    );
}