#include <string.h>
#include "hash.h"

tls_status sha256_init(sha256_ctx *ctx)
{
    static const uint32_t initial[8] = {
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    };
    if (ctx == NULL)
        return TLS_HASH_ERROR;
    memcpy(ctx->state, initial, sizeof initial);
    ctx->length = 0;
    return TLS_OK;
}

tls_status sha256_update(sha256_ctx *ctx, const uint8_t *data, size_t len)
{
    if (ctx == NULL || (data == NULL && len > 0))
        return TLS_HASH_ERROR;
    for (size_t i = 0; i < len; i++) {
        ctx->buffer[ctx->length % 64] = data[i];
        ctx->length++;
        if (ctx->length % 64 == 0)
            sha256_compress(ctx->state, ctx->buffer);
    }
    return TLS_OK;
}

void sha256_wipe(sha256_ctx *ctx)
{
    memset(ctx, 0, sizeof *ctx);
}
