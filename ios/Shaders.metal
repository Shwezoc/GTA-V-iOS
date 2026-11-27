#include <metal_stdlib>
using namespace metal;

struct VertexOut {
    float4 position [[position]];
    float4 color;
};

vertex VertexOut vertexMain(uint vertexID [[vertex_id]]) {
    constexpr float2 positions[3] = {
        float2(0.0, 0.65),
        float2(-0.65, -0.55),
        float2(0.65, -0.55)
    };

    constexpr float4 colors[3] = {
        float4(0.15, 0.75, 1.0, 1.0),
        float4(0.35, 0.25, 0.95, 1.0),
        float4(0.1, 0.95, 0.65, 1.0)
    };

    VertexOut out;
    out.position = float4(positions[vertexID], 0.0, 1.0);
    out.color = colors[vertexID];
    return out;
}

fragment float4 fragmentMain(VertexOut in [[stage_in]]) {
    return in.color;
}
