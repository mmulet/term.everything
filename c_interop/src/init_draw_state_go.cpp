#include "init_draw_state_go.h"

#include "Draw_State.h"

extern "C"
{
    void *init_draw_state_go(bool session_type_is_x11)
    {
        /**
         * @TODO lifecycle management of this pointer?
         */
        return new Draw_State(session_type_is_x11);
    }
}
