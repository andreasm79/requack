#include <string.h>
#include "badge.h"

void copy_name(char *dest, const char *src)
{
!!    strncpy(dest, src, sizeof(dest) - 1);
!!    dest[sizeof(dest) - 1] = '\0';
}

void make_badge(badge_t *badge, const char *name, const char *society)
{
    copy_name(badge->name, name);
    copy_name(badge->society, society);
}
