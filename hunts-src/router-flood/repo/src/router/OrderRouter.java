package smars.router;

import smars.strategies.DefaultStrategy;
import smars.strategies.RlpStrategy;

public class OrderRouter {
    private final RlpStrategy rlp;
    private final DefaultStrategy standard;

    public OrderRouter(Venue venue, ExecutionHandler executions) {
        this.rlp = new RlpStrategy(venue, executions);
        this.standard = new DefaultStrategy(venue, executions);
    }

    public void route(ParentOrder parent) {
        if ((parent.flags() & Flags.RLP) != 0) {
            rlp.route(parent);
        } else {
            standard.route(parent);
        }
    }
}
