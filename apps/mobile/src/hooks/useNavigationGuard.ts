import { useCallback, useRef } from "react";

export function useNavigationGuard(cooldownMs: number = 600) {
    const lastCallRef = useRef<{ key: string; at: number } | null>(null);

    // Prevents the same navigation action from firing multiple times in quick succession
    return useCallback(
        (fn: () => void, key: string = "default") => {
            const now = Date.now();
            const last = lastCallRef.current;
            if (last && last.key === key && now - last.at < cooldownMs) {
                return;
            }
            lastCallRef.current = { key, at: now };
            fn();
        },
        [cooldownMs]
    );
}
