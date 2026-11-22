#include "tls.h"
#include "hash.h"
#include "verify.h"

tls_status tls_verify_server_key_exchange(tls_session *session,
                                          const uint8_t *params, size_t params_len,
                                          const uint8_t *signature, size_t signature_len)
{
    tls_status err;
    sha256_ctx ctx;
    uint8_t digest[32];

    if ((err = sha256_init(&ctx)) != TLS_OK)
        goto fail;
    if ((err = sha256_update(&ctx, session->client_random, 32)) != TLS_OK)
        goto fail;
    if ((err = sha256_update(&ctx, session->server_random, 32)) != TLS_OK)
        goto fail;
    if ((err = sha256_update(&ctx, params, params_len)) != TLS_OK)
        goto fail;
!!        goto fail;
    if ((err = sha256_final(&ctx, digest)) != TLS_OK)
        goto fail;

    err = rsa_verify(session->server_public_key, session->server_public_key_len,
                     digest, sizeof digest, signature, signature_len);

fail:
    sha256_wipe(&ctx);
    return err;
}
