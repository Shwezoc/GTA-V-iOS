#pragma once

#include <cstdint>

namespace shwezov::port {

struct FrameStats {
    double frameTimeMs{0.0};
    double framesPerSecond{0.0};
    std::uint64_t frameIndex{0};
};

class PortCore final {
public:
    PortCore() = default;

    void beginFrame();
    FrameStats endFrame();

    const char* name() const noexcept {
        return "Shwezov GTA V iOS Port Core";
    }

private:
    std::uint64_t frameIndex_{0};
    double frameStartSeconds_{0.0};
};

} // namespace shwezov::port
