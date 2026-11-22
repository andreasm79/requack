package smars.router;

public class OrderRouter {
    private final Venue venue;
    private final StandardRouter standard;

    public OrderRouter(Venue venue) {
        this.venue = venue;
        this.standard = new StandardRouter(venue);
    }

    public void route(ParentOrder parent) {
        if ((parent.flags() & 0x08) != 0) {
            powerPeg(parent);
        } else {
            standard.route(parent);
        }
    }

    private void powerPeg(ParentOrder parent) {
!!        while (!parent.isFilled()) {
            venue.send(parent.nextChild(100));
        }
    }
}
