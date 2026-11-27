#include "PortCore.hpp"

#include <chrono>

namespace shwezov::port {
namespace {
double nowSeconds() {
    using clock = std::chrono::steady_clock;
    return std::chrono::duration<double>(
        clock::now().time_since_epoch()
    ).count();
}
} // namespace

void PortCore::beginFrame() {
    frameStartSeconds_ = nowSeconds();
}

FrameStats PortCore::endFrame() {
    const double elapsed = nowSeconds() - frameStartSeconds_;
    ++frameIndex_;

    FrameStats stats;
    stats.frameTimeMs = elapsed * 1000.0;
    stats.framesPerSecond = elapsed > 0.0 ? 1.0 / elapsed : 0.0;
    stats.frameIndex = frameIndex_;
    return stats;
}

} // namespace shwezov::port
