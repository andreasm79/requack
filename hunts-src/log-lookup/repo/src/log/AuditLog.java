package app.log;

public final class AuditLog {
    private final String name;
    private final Interpolator interpolator = new Interpolator();
    private final LogShipper shipper = LogShipper.shared();

    private AuditLog(String name) {
        this.name = name;
    }

    public static AuditLog forClass(Class<?> type) {
        return new AuditLog(type.getSimpleName());
    }

    public void info(String pattern, Object... args) {
        write("INFO", pattern, args);
    }

    public void warn(String pattern, Object... args) {
        write("WARN", pattern, args);
    }

    private void write(String level, String pattern, Object... args) {
        String message = format(pattern, args);
!!        String line = interpolator.resolve(level + " [" + name + "] " + message);
        shipper.ship(line);
    }

    static String format(String pattern, Object... args) {
        StringBuilder out = new StringBuilder();
        int next = 0;
        for (int i = 0; i < pattern.length(); i++) {
            if (pattern.startsWith("{}", i) && next < args.length) {
                out.append(args[next++]);
                i++;
            } else {
                out.append(pattern.charAt(i));
            }
        }
        return out.toString();
    }
}
