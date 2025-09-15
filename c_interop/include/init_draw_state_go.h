#pragma once

#include <stdbool.h>

#ifdef __cplusplus
extern "C"
{
#endif

    void *init_draw_state_go(bool session_type_is_x11);

    #ifdef __cplusplus
}
#endif