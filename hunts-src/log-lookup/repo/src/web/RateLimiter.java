package app.web;

import java.util.HashMap;
import java.util.Map;

public class RateLimiter {
    private static final int LIMIT = 10;
    private static final long WINDOW_MS = 60_000;

    private final Map<String, long[]> windows = new HashMap<>();

    public synchronized boolean allow(String ip) {
        long now = System.currentTimeMillis();
        long[] window = windows.getOrDefault(ip, new long[] {now, 0});
        if (now - window[0] > WINDOW_MS) {
            window = new long[] {now, 0};
        }
        window[1]++;
        windows.put(ip, window);
        return window[1] <= LIMIT;
    }
}
