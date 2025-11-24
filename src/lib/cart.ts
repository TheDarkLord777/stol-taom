export type CartItem = {
    id: string; // unique cart id
    menuItemId: string;
    name: string;
    restaurantId?: string;
    price?: string;
    ingredients?: Array<{ id?: string; name: string }>;
    quantity: number;
    addedAt: number;
    // client-side tracking
    clientItemId?: string;
    status?: "pending" | "synced";
    serverId?: string;
};

const KEY = "app:cart:v1";

export function readCart(): CartItem[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        return JSON.parse(raw) as CartItem[];
    } catch {
        return [];
    }
}

export function writeCart(items: CartItem[]) {
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
        // ignore
    }
}

export function addToCart(item: Omit<CartItem, "id" | "addedAt">) {
    const existing = readCart();
    const newItem: CartItem = {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        addedAt: Date.now(),
        ...item,
    };
    // naive merge: just append as a new line item
    const next = [...existing, newItem];
    writeCart(next);
    return newItem;
}

export function clearCart() {
    try {
        localStorage.removeItem(KEY);
    } catch { }
}

export function cartCount() {
    return readCart().reduce((s, it) => s + it.quantity, 0);
}

// ----- Pending queue & offline sync helpers -----

const PENDING_KEY = "app:cart:pending:v1";

export type PendingItem = {
    clientItemId: string;
    menuItemId: string;
    name: string;
    price?: string;
    ingredients?: Array<{ id?: string; name: string }>;
    quantity: number;
    createdAt: number;
};

export const generateClientId = () => `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export function getPendingQueue(): PendingItem[] {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as PendingItem[];
    } catch {
        return [];
    }
}

export function setPendingQueue(queue: PendingItem[]) {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    } catch { }
}

export function addPending(item: PendingItem) {
    const q = getPendingQueue();
    q.push(item);
    setPendingQueue(q);
}

export function removePending(clientItemId: string) {
    const q = getPendingQueue().filter((p) => p.clientItemId !== clientItemId);
    setPendingQueue(q);
}

function markLocalCartItemAsSynced(clientItemId: string, serverId?: string) {
    const cart = readCart();
    const next = cart.map((ci) =>
        ci.clientItemId === clientItemId
            ? ({ ...ci, status: "synced" as const, serverId } as CartItem)
            : ci,
    ) as CartItem[];
    writeCart(next);
}

async function syncPendingItem(p: PendingItem) {
    try {
        const res = await fetch("/api/cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ ...p, clientId: p.clientItemId }),
        });
        if (!res.ok) {
            // If unauthorized, stop trying now (will retry on login)
            if (res.status === 401) return false;
            return false;
        }
        const data = await res.json().catch(() => ({}));
        // mark local as synced and remove pending
        markLocalCartItemAsSynced(p.clientItemId, data?.item?.id ?? undefined);
        removePending(p.clientItemId);
        return true;
    } catch (e) {
        return false;
    }
}

export async function enqueueAndTrySync(payload: {
    menuItemId: string;
    name: string;
    price?: string;
    ingredients?: Array<{ id?: string; name: string }>;
    quantity?: number;
}) {
    const clientItemId = generateClientId();
    const pending: PendingItem = {
        clientItemId,
        menuItemId: payload.menuItemId,
        name: payload.name,
        price: payload.price,
        ingredients: payload.ingredients,
        quantity: payload.quantity ?? 1,
        createdAt: Date.now(),
    };

    // add to pending queue
    addPending(pending);

    // optimistic UI: add to main cart with pending status
    addToCart({
        menuItemId: pending.menuItemId,
        name: pending.name,
        price: pending.price,
        ingredients: pending.ingredients,
        quantity: pending.quantity,
        clientItemId: pending.clientItemId,
        status: "pending",
    } as any);

    // try to sync immediately
    const ok = await syncPendingItem(pending);
    if (!ok) {
        // will retry later (on online/focus)
        return { clientItemId, synced: false };
    }
    return { clientItemId, synced: true };
}

export async function flushPending() {
    const pending = getPendingQueue();
    for (const p of pending.slice()) {
        const ok = await syncPendingItem(p);
        if (!ok) break; // stop on network error
    }
}

// auto-flush when back online or on focus
if (typeof window !== "undefined") {
    window.addEventListener("online", () => void flushPending());
    window.addEventListener("focus", () => void flushPending());
}

