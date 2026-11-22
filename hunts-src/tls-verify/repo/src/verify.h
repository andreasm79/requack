#ifndef VERIFY_H
#define VERIFY_H

#include <stddef.h>
#include <stdint.h>
#include "tls.h"

tls_status rsa_verify(const uint8_t *key, size_t key_len,
                      const uint8_t *digest, size_t digest_len,
                      const uint8_t *signature, size_t signature_len);

#endif
