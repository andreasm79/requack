#include <assert.h>
#include <stdio.h>
#include "tls.h"
#include "fixtures.h"

static void accepts_valid_server(void)
{
    tls_session session = fixture_session();
    tls_status status = tls_handle_server_key_exchange(&session,
                                                       FIXTURE_SKE, FIXTURE_SKE_LEN);
    assert(status == TLS_OK);
}

static void rejects_truncated_message(void)
{
    tls_session session = fixture_session();
    assert(tls_handle_server_key_exchange(&session, FIXTURE_SKE, 3) == TLS_PROTOCOL_ERROR);
}

int main(void)
{
    accepts_valid_server();
    rejects_truncated_message();
    puts("all tests passed");
    return 0;
}
