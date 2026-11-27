#include "PortCore.hpp"
#include "GameLoop.hpp"

namespace shwezov::port {

struct EngineState {
    PortCore core;
    GameLoop gameLoop;

    void initialize() {
        gameLoop.reset();
    }

    GameTime update() {
        core.beginFrame();
        GameTime time = gameLoop.tick();
        core.endFrame();
        return time;
    }
};

}
