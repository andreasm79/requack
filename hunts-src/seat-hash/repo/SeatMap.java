import java.util.HashMap;
import java.util.Map;

public class SeatMap {
    private final Map<Seat, String> holders = new HashMap<>();

    public void assign(Seat seat, String student) {
        holders.put(seat, student);
    }

    public String holderOf(Seat seat) {
        return holders.get(seat);
    }

    public void moveAlong(Seat seat, int places) {
!!        seat.number += places;
    }
}
