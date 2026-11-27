#include "TouchInput.hpp"
#include "TouchBridge.h"

namespace {
shwezov::port::TouchInput input;
}

extern "C" {

void GameTouchBegan(int index, float x, float y) {
    input.set(index, x, y);
}

void GameTouchMoved(int index, float x, float y) {
    input.set(index, x, y);
}

void GameTouchEnded(int index) {
    if (index < 0 || index >= 10) return;

    input.points[index].active = false;
    input.count = 0;

    for (int i = 0; i < 10; ++i) {
        if (input.points[i].active) {
            input.count = i + 1;
        }
    }
}

}
}
}
}
