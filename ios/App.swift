import SwiftUI
import UIKit
import MetalKit

@main
struct ShwezovGTAVApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        ZStack {
            MetalGameView()
            TouchHandler()
        }
        .ignoresSafeArea()
    }
}

struct MetalGameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero)
        context.coordinator.renderer = MetalRenderer(view: view)
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {}

    final class Coordinator {
        var renderer: MetalRenderer?
    }
}
