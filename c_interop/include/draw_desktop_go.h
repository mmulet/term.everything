#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C"
{
#endif
    void draw_desktop_go(void *draw_state,
                         uint8_t *texture_pixels,
                         uint32_t width,
                         uint32_t height,
                         char *status_line);
#ifdef __cplusplus
}
#endif