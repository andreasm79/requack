CC ?= cc
CFLAGS ?= -std=c11 -O2 -Iinclude -Isrc

SRC = src/hash.c src/sha256_compress.c src/verify.c src/key_exchange.c src/handshake.c

libtls.a: $(SRC:.c=.o)
	ar rcs $@ $^

test: libtls.a tests/test_handshake.c
	$(CC) $(CFLAGS) -Itests tests/test_handshake.c libtls.a -o tests/run
	./tests/run

clean:
	rm -f src/*.o libtls.a tests/run
