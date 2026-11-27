#pragma once

namespace shwezov::port {

struct TouchPoint {
    float x = 0.0f;
    float y = 0.0f;
    bool active = false;
};

struct TouchInput {
    TouchPoint points[10];
    int count = 0;

    void clear() {
        for (auto& point : points) {
            point.active = false;
        }
        count = 0;
    }

    void set(int index, float x, float y) {
        if (index < 0 || index >= 10) return;

        points[index] = {x, y, true};
        if (count < index + 1) {
            count = index + 1;
        }
    }
};

}
