import Metal
import MetalKit

final class MetalRenderer: NSObject, MTKViewDelegate {
    private let device: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let pipeline: MTLRenderPipelineState

    init?(view: MTKView) {
        guard
            let device = MTLCreateSystemDefaultDevice(),
            let queue = device.makeCommandQueue(),
            let library = device.makeDefaultLibrary(),
            let vertex = library.makeFunction(name: "vertexMain"),
            let fragment = library.makeFunction(name: "fragmentMain")
        else {
            return nil
        }

        self.device = device
        self.commandQueue = queue

        let descriptor = MTLRenderPipelineDescriptor()
        descriptor.vertexFunction = vertex
        descriptor.fragmentFunction = fragment
        descriptor.colorAttachments[0].pixelFormat = view.colorPixelFormat

        guard let state = try? device.makeRenderPipelineState(
            descriptor: descriptor
        ) else {
            return nil
        }

        self.pipeline = state
        super.init()

        view.device = device
        view.delegate = self
        view.clearColor = MTLClearColor(
            red: 0.025, green: 0.035, blue: 0.06, alpha: 1
        )
        view.preferredFramesPerSecond = 30
        view.isPaused = false
    }

    func mtkView(
        _ view: MTKView,
        drawableSizeWillChange size: CGSize
    ) {}

    func draw(in view: MTKView) {
        guard
            let descriptor = view.currentRenderPassDescriptor,
            let drawable = view.currentDrawable,
            let buffer = commandQueue.makeCommandBuffer(),
            let encoder = buffer.makeRenderCommandEncoder(
                descriptor: descriptor
            )
        else {
            return
        }

        encoder.setRenderPipelineState(pipeline)
        encoder.drawPrimitives(
            type: .triangle,
            vertexStart: 0,
            vertexCount: 3
        )
        encoder.endEncoding()

        buffer.present(drawable)
        buffer.commit()
    }
}
