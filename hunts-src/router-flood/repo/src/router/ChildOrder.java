package smars.router;

import java.util.UUID;

public class ChildOrder {
    private final String id = UUID.randomUUID().toString();
    private final ParentOrder parent;
    private final String symbol;
    private final long shares;
    private String venue = "SMART";

    ChildOrder(ParentOrder parent, String symbol, long shares) {
        this.parent = parent;
        this.symbol = symbol;
        this.shares = shares;
    }

    public ChildOrder toVenue(String venue) {
        this.venue = venue;
        return this;
    }

    public String id() {
        return id;
    }

    public ParentOrder parent() {
        return parent;
    }

    public String describe() {
        return venue + " " + symbol + " x" + shares;
    }
}
