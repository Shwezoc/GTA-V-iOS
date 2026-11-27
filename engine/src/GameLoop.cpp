#include "GameLoop.hpp"
#include <chrono>

namespace shwezov::port {

namespace {
double currentTime() {
    using clock = std::chrono::steady_clock;
    return std::chrono::duration<double>(
        clock::now().time_since_epoch()
    ).count();
}
}

void GameLoop::reset() {
    previousTime_ = currentTime();
    totalTime_ = 0.0;
    frame_ = 0;
}

GameTime GameLoop::tick() {
    const double now = currentTime();

    if (previousTime_ == 0.0) {
        reset();
        return {};
    }

    double delta = now - previousTime_;
    previousTime_ = now;

    if (delta > 0.1) {
        delta = 0.1;
    }

    totalTime_ += delta;
    ++frame_;

    return {delta, totalTime_, frame_};
}

}
