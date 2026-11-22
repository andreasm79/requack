#ifndef HASH_H
#define HASH_H

#include <stddef.h>
#include <stdint.h>
#include "tls.h"

typedef struct {
    uint32_t state[8];
    uint64_t length;
    uint8_t buffer[64];
} sha256_ctx;

tls_status sha256_init(sha256_ctx *ctx);
tls_status sha256_update(sha256_ctx *ctx, const uint8_t *data, size_t len);
tls_status sha256_final(sha256_ctx *ctx, uint8_t out[32]);
void sha256_wipe(sha256_ctx *ctx);

#endif
