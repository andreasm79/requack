package smars.router;

public class ParentOrder {
    private final String symbol;
    private final long quantity;
    private final int flags;
    private long filled;

    public ParentOrder(String symbol, long quantity, int flags) {
        this.symbol = symbol;
        this.quantity = quantity;
        this.flags = flags;
    }

    public int flags() {
        return flags;
    }

    public boolean isFilled() {
        return filled >= quantity;
    }

    public long remaining() {
        return quantity - filled;
    }

    void recordFill(long shares) {
        filled += shares;
    }

    public ChildOrder nextChild(long size) {
        return new ChildOrder(this, symbol, Math.min(size, remaining()));
    }
}
