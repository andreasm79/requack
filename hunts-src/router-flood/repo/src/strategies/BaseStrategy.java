package smars.strategies;

import smars.router.ChildOrder;
import smars.router.ExecutionHandler;
import smars.router.ParentOrder;
import smars.router.Venue;

public abstract class BaseStrategy {
    protected final Venue venue;
    private final ExecutionHandler executions;

    protected BaseStrategy(Venue venue, ExecutionHandler executions) {
        this.venue = venue;
        this.executions = executions;
    }

    public abstract void route(ParentOrder parent);

    protected void send(ChildOrder child) {
        executions.watch(child);
        venue.send(child);
    }
}
