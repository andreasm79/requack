#ifndef TLS_H
#define TLS_H

#include <stddef.h>
#include <stdint.h>

typedef int tls_status;

#define TLS_OK 0
#define TLS_BAD_SIGNATURE -1
#define TLS_HASH_ERROR -2
#define TLS_PROTOCOL_ERROR -3

typedef struct {
    uint8_t client_random[32];
    uint8_t server_random[32];
    const uint8_t *server_public_key;
    size_t server_public_key_len;
} tls_session;

tls_status tls_verify_server_key_exchange(tls_session *session,
                                          const uint8_t *params, size_t params_len,
                                          const uint8_t *signature, size_t signature_len);

tls_status tls_handle_server_key_exchange(tls_session *session,
                                          const uint8_t *message, size_t length);

#endif
