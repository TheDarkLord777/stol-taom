"use client";
import React from 'react';
import Link from 'next/link';

export default function ManagementIndex() {
    const [restaurants, setRestaurants] = React.useState<any[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        let mounted = true;
        fetch('/api/restaurants')
            .then((r) => r.json())
            .then((j) => { if (mounted) setRestaurants(j.items || j || []); })
            .catch(() => { if (mounted) setRestaurants([]); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    return (
        <main className="p-6 mx-auto max-w-4xl">
            <h1 className="text-2xl font-bold mb-4">Management Access</h1>
            <p className="mb-4 text-sm text-gray-600">Choose your restaurant and sign in as a manager to access its management page.</p>
            {loading ? <div>Loading...</div> : (
                <div className="space-y-3">
                    {restaurants && restaurants.length > 0 ? restaurants.map((r) => (
                        <div key={r.id} className="p-3 border rounded flex items-center justify-between">
                            <div>
                                <div className="font-medium">{r.name}</div>
                                <div className="text-xs text-gray-500">id: {r.id}</div>
                            </div>
                            <div>
                                <Link href={`/management/restaurant/${r.id}`} className="text-sm text-blue-600">Manage</Link>
                            </div>
                        </div>
                    )) : <div>No restaurants</div>}
                </div>
            )}
        </main>
    );
}
