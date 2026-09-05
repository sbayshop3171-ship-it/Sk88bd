/**
 * Small JSON helper for the endpoints that are not page visits.
 *
 * Inertia's own router owns navigation; the Aviator round loop needs plain
 * fetch calls that return data without re-rendering the page, so those go
 * through here. Laravel's CSRF token comes from the meta tag in app.blade.php.
 */
export async function postJson<T>(url: string, body: unknown = {}): Promise<T> {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': token,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new HttpError(
            (data as { message?: string }).message ?? 'কিছু একটা সমস্যা হয়েছে',
            res.status,
            data,
        );
    }

    return data as T;
}

export class HttpError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: unknown,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}
