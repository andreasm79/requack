package app.log;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AuditLogTest {
    @Test
    void fillsPlaceholdersInOrder() {
        assertEquals("a=1 b=2", AuditLog.format("a={} b={}", 1, 2));
    }

    @Test
    void leavesExtraPlaceholdersAlone() {
        assertEquals("only 1 {}", AuditLog.format("only {} {}", 1));
    }

    @Test
    void resolvesSystemProperties() {
        System.setProperty("app.name", "members-portal");
        assertEquals("members-portal", new Interpolator().resolve("${sys:app.name}"));
    }
}
