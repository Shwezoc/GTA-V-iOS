#pragma once
#include <cstdint>
namespace shwezov::port {
struct GameTime {
 double deltaSeconds{0.0};
 double totalSeconds{0.0};
 std::uint64_t frameIndex{0};
};
class GameLoop final {
public:
 void reset();
 GameTime tick();
private:
 double previousTime_{0.0};
 double totalTime_{0.0};
 std::uint64_t frame_{0};
};
}
