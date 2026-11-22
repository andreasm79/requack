package smars.strategies;

import smars.router.ExecutionHandler;
import smars.router.ParentOrder;
import smars.router.Venue;

public class RlpStrategy extends BaseStrategy {
    private static final long MAX_CHILD = 500;

    public RlpStrategy(Venue venue, ExecutionHandler executions) {
        super(venue, executions);
    }

    @Override
    public void route(ParentOrder parent) {
        send(parent.nextChild(MAX_CHILD).toVenue("NYSE-RLP"));
    }
}
