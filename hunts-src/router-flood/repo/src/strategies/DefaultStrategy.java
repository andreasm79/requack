package smars.strategies;

import smars.router.ExecutionHandler;
import smars.router.ParentOrder;
import smars.router.Venue;

public class DefaultStrategy extends BaseStrategy {
    private static final long CHILD_SIZE = 200;

    public DefaultStrategy(Venue venue, ExecutionHandler executions) {
        super(venue, executions);
    }

    @Override
    public void route(ParentOrder parent) {
        send(parent.nextChild(CHILD_SIZE));
    }
}
