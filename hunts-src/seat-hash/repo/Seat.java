import java.util.Objects;

public class Seat {
    final char row;
    int number;

    public Seat(char row, int number) {
        this.row = row;
        this.number = number;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Seat)) {
            return false;
        }
        Seat seat = (Seat) other;
        return row == seat.row && number == seat.number;
    }

    @Override
    public int hashCode() {
        return Objects.hash(row, number);
    }
}
