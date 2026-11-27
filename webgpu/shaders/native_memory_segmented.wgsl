// WebGPU adaptation of upstream gtav/src/native/shaders/native_memory.hlsl.
//
// Vulkan's 64-bit device address and vk::RawBufferStore are replaced by a storage-buffer binding.
// The host binds the guest-memory segment that owns the write range; destination_base_byte is
// relative to that bound segment. The host must select the correct segment and keep writes in range.
// This shader is a porting prototype and is not yet wired into the GTAV renderer.

struct MemoryParams {
    width: u32,
    height: u32,
    pitch_blocks: u32,
    destination_base_byte: u32,
    bpp_log2: u32,
    mode: u32,
    scale: f32,
    _padding: u32,
};

@group(0) @binding(0)
var source_texture: texture_2d<f32>;

@group(0) @binding(1)
var<storage, read_write> destination_words: array<u32>;

@group(0) @binding(2)
var<uniform> params: MemoryParams;

fn tiled_offset_2d(x: u32, y: u32, pitch: u32, bpp_log2: u32) -> u32 {
    let aligned_pitch = (pitch + 31u) & ~31u;
    let macro_offset =
        ((x >> 5u) + (y >> 5u) * (aligned_pitch >> 5u)) << (bpp_log2 + 7u);
    let micro = ((x & 7u) + ((y & 0xEu) << 2u)) << bpp_log2;
    let offset =
        macro_offset +
        ((micro & ~0xFu) << 1u) +
        (micro & 0xFu) +
        ((y & 1u) << 4u);

    return
        ((offset & ~0x1FFu) << 3u) +
        ((y & 16u) << 7u) +
        ((offset & 0x1C0u) << 2u) +
        (((((y & 8u) >> 2u) + (x >> 3u)) & 3u) << 6u) +
        (offset & 0x3Fu);
}

fn swap_endian(input: u32, endian: u32) -> u32 {
    var value = input;
    if (endian == 1u || endian == 2u) {
        value = ((value & 0x00FF00FFu) << 8u) | ((value >> 8u) & 0x00FF00FFu);
    }
    if (endian == 2u || endian == 3u) {
        value = (value << 16u) | (value >> 16u);
    }
    return value;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.xy;
    if (id.x >= params.width || id.y >= params.height) {
        return;
    }

    var texel = vec2<i32>(id);
    if (params.scale != 1.0) {
        texel = vec2<i32>((vec2<f32>(id) + vec2<f32>(0.5)) * params.scale);
    }
    let sampled = textureLoad(source_texture, texel, 0);

    let is_linear = ((params.mode >> 16u) & 1u) != 0u;
    let pitch = (params.pitch_blocks + 31u) & ~31u;
    var byte_offset: u32;
    if (is_linear) {
        byte_offset = (id.y * pitch + id.x) << params.bpp_log2;
    } else {
        byte_offset = tiled_offset_2d(id.x, id.y, params.pitch_blocks, params.bpp_log2);
    }
    byte_offset = byte_offset + params.destination_base_byte;

    let word_index = byte_offset >> 2u;
    let packing_mode = params.mode & 0xFFu;
    let endian = (params.mode >> 8u) & 3u;
    let words_required = select(1u, 2u, packing_mode == 0u);
    if (word_index + words_required > arrayLength(&destination_words)) {
        return;
    }

    if (packing_mode == 0u) {
        let low = pack2x16float(sampled.xy);
        let high = pack2x16float(sampled.zw);
        destination_words[word_index] = swap_endian(low, endian);
        destination_words[word_index + 1u] = swap_endian(high, endian);
    } else if (packing_mode == 1u) {
        let bytes = vec4<u32>(round(clamp(sampled, vec4<f32>(0.0), vec4<f32>(1.0)) * 255.0));
        let packed = bytes.x | (bytes.y << 8u) | (bytes.z << 16u) | (bytes.w << 24u);
        destination_words[word_index] = swap_endian(packed, endian);
    } else if (packing_mode == 2u) {
        destination_words[word_index] = swap_endian(bitcast<u32>(sampled.x), endian);
    } else {
        destination_words[word_index] = swap_endian(pack2x16float(sampled.xy), endian);
    }
}
