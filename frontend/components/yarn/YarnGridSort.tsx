import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";

interface Props {
    direction: 'asc' | 'desc';
    changeDirection: (direction: 'asc' | 'desc') => void;
}

export default function YarnGridSort({ direction, changeDirection }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setOpen(!open)}
                className="border rounded px-3 py-1 flex items-center gap-2"
            >
                {direction === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                {direction === 'asc' ? 'Price Asc' : 'Price Desc'}
            </button>

            {open && (
                <div className="absolute mt-2 border rounded bg-white shadow w-full z-10">
                    <button
                        onClick={() => { changeDirection('asc'); setOpen(false); }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 w-full text-left"
                    >
                        <ArrowUpIcon className="w-4 h-4" />
                        Price Asc
                    </button>
                    <button
                        onClick={() => { changeDirection('desc'); setOpen(false); }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 w-full text-left"
                    >
                        <ArrowDownIcon className="w-4 h-4" />
                        Price Desc
                    </button>
                </div>
            )}
        </div>
    );
}

