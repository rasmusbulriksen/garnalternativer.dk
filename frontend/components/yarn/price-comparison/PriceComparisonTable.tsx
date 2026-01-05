import { Yarn, YarnType } from "@/types/yarn";
import PriceComparisonTableSingle from "@/components/yarn/price-comparison/PriceComparisonTableSingle";
import PriceComparisonTableDouble from "@/components/yarn/price-comparison/PriceComparisonTableDouble";

interface Props {
    yarn: Yarn;
    metersRequired: number;
}

export default function PriceComparisonTable({ yarn, metersRequired }: Props) {
    
    return (
        <div>
            {yarn.type === YarnType.Single ? (
                <PriceComparisonTableSingle yarn={yarn} offers={yarn.offers} metersRequired={metersRequired} />
            ) : (
                <PriceComparisonTableDouble yarn={yarn} offers={yarn.offers} metersRequired={metersRequired} />
            )}
        </div>
    );
}