// WebGPU port of upstream native_resolve_compute.comp for rgba16float destinations.
//
// This is a real renderer-shader adaptation, not a standalone scene or a playable game.
// Resource indices are replaced by explicit per-dispatch bindings because WebGPU does not
// expose Vulkan's unbounded non-uniform descriptor arrays. Push constants become a uniform buffer.
// Other destination formats require their own storage-texture pipeline variants.

struct ResolveParams {
    source_origin: vec2<i32>,
    dest_origin: vec2<i32>,
    size: vec2<u32>,
    scale: f32,
    mode: u32,
};

@group(0) @binding(0)
var source_texture: texture_2d<f32>;

@group(0) @binding(1)
var destination_texture: texture_storage_2d<rgba16float, write>;

@group(0) @binding(2)
var<uniform> params: ResolveParams;

// Xenos 7e3 (3-bit exponent, 7-bit mantissa, [0, 31.875]) from float.
fn float32_to_7e3(value: f32) -> u32 {
    if (!(value > 0.0)) {
        return 0u;
    }
    if (value >= 31.875) {
        return 0x3FFu;
    }

    var bits = bitcast<u32>(value);
    if (bits < 0x3E800000u) {
        bits = (0x800000u | (bits & 0x7FFFFFu)) >> (125u - (bits >> 23u));
    } else {
        bits = bits + 0xC2000000u;
    }

    return ((bits + 0x7FFFu + ((bits >> 16u) & 1u)) >> 16u) & 0x3FFu;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.xy;
    if (id.x >= params.size.x || id.y >= params.size.y) {
        return;
    }

    var value = textureLoad(
        source_texture,
        params.source_origin + vec2<i32>(id),
        0
    ) * params.scale;

    if (params.mode == 1u) {
        value = vec4<f32>(
            f32(float32_to_7e3(value.r)) / 1023.0,
            f32(float32_to_7e3(value.g)) / 1023.0,
            f32(float32_to_7e3(value.b)) / 1023.0,
            clamp(value.a, 0.0, 1.0)
        );
    }

    textureStore(
        destination_texture,
        params.dest_origin + vec2<i32>(id),
        value
    );
}
