#include <string.h>
#include "tls.h"

static void send_alert(int code)
{
    (void)code;
}

tls_status tls_handle_server_key_exchange(tls_session *session,
                                          const uint8_t *message, size_t length)
{
    if (length < 4)
        return TLS_PROTOCOL_ERROR;

    size_t params_len = ((size_t)message[0] << 8) | message[1];
    if (2 + params_len + 2 > length)
        return TLS_PROTOCOL_ERROR;

    const uint8_t *params = message + 2;
    const uint8_t *sig_header = params + params_len;
    size_t signature_len = ((size_t)sig_header[0] << 8) | sig_header[1];
    if (2 + params_len + 2 + signature_len != length)
        return TLS_PROTOCOL_ERROR;

    tls_status status = tls_verify_server_key_exchange(session, params, params_len,
                                                       sig_header + 2, signature_len);
    if (status != TLS_OK) {
        send_alert(51);
        return status;
    }
    return TLS_OK;
}
