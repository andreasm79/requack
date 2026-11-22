#ifndef BADGE_H
#define BADGE_H

typedef struct {
    char name[48];
    char society[32];
} badge_t;

void make_badge(badge_t *badge, const char *name, const char *society);

#endif
