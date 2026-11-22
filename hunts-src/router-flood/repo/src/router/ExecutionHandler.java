package smars.router;

import java.util.HashMap;
import java.util.Map;

public class ExecutionHandler {
    private final Map<String, ChildOrder> open = new HashMap<>();

    public void watch(ChildOrder child) {
        open.put(child.id(), child);
    }

    public void onExecution(String childId, long shares) {
        ChildOrder child = open.remove(childId);
        if (child != null) {
            child.parent().recordFill(shares);
        }
    }
}
