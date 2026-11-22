package app.log;

import java.util.ArrayList;
import java.util.List;

public final class LogShipper {
    private static final LogShipper SHARED = new LogShipper(Settings.load());

    private final Settings settings;
    private final List<String> batch = new ArrayList<>();

    private LogShipper(Settings settings) {
        this.settings = settings;
    }

    public static LogShipper shared() {
        return SHARED;
    }

    public synchronized void ship(String line) {
        batch.add(line);
        if (batch.size() >= settings.batchSize()) {
            Http.postLines(settings.endpoint(), batch);
            batch.clear();
        }
    }
}
