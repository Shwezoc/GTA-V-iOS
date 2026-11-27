#pragma once

namespace GTAV {
    class Engine {
    public:
        bool initialize();
        void update(float deltaTime);
        void render();
    };
}
