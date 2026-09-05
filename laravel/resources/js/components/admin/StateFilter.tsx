import { Link } from '@inertiajs/react';

const STATES: [string, string][] = [
    ['pending', 'অপেক্ষমাণ'],
    ['approved', 'অনুমোদিত'],
    ['rejected', 'বাতিল'],
    ['all', 'সব'],
];

export default function StateFilter({ base, active }: { base: string; active: string }) {
    return (
        <div className="adm__filters">
            {STATES.map(([value, label]) => (
                <Link
                    key={value}
                    href={`${base}?state=${value}`}
                    className={value === active ? 'on' : undefined}
                >
                    {label}
                </Link>
            ))}
        </div>
    );
}
