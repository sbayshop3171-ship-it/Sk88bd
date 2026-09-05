type State = 'pending' | 'approved' | 'rejected' | 'cancelled';

const LABEL: Record<State, string> = {
    pending: 'অপেক্ষমাণ',
    approved: 'অনুমোদিত',
    rejected: 'বাতিল',
    cancelled: 'বাতিল',
};

export default function StateBadge({ state }: { state: State }) {
    return <span className={`state state--${state}`}>{LABEL[state]}</span>;
}
