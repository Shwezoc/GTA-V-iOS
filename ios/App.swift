import SwiftUI
import UIKit
import SceneKit

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
        ZStack(alignment: .topLeading) {
            SceneKitGameView()
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 5) {
                Text("SHWEZOV • 3D PORT TEST")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .tracking(1.5)
                Text("MICHAEL — PROXY CHARACTER")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.65))
            }
            .foregroundColor(.white)
            .padding(.top, 54)
            .padding(.leading, 20)
            .allowsHitTesting(false)
        }
        .preferredColorScheme(.dark)
    }
}

struct SceneKitGameView: UIViewRepresentable {
    func makeUIView(context: Context) -> SCNView {
        let view = SCNView(frame: .zero)
        view.scene = PortTestScene.makeScene()
        view.backgroundColor = UIColor(red: 0.025, green: 0.035, blue: 0.06, alpha: 1)
        view.antialiasingMode = .multisampling4X
        view.preferredFramesPerSecond = 30
        view.rendersContinuously = true
        view.allowsCameraControl = true
        view.defaultCameraController.maximumVerticalAngle = 78
        view.defaultCameraController.minimumVerticalAngle = 8
        return view
    }

    func updateUIView(_ view: SCNView, context: Context) {}
}

private enum PortTestScene {
    static func material(_ color: UIColor, roughness: CGFloat = 0.82) -> SCNMaterial {
        let material = SCNMaterial()
        material.diffuse.contents = color
        material.roughness.contents = roughness
        material.lightingModel = .physicallyBased
        return material
    }

    static func makeScene() -> SCNScene {
        let scene = SCNScene()
        scene.background.contents = UIColor(red: 0.025, green: 0.035, blue: 0.06, alpha: 1)

        let camera = SCNCamera()
        camera.zFar = 250
        camera.fieldOfView = 62
        let cameraNode = SCNNode()
        cameraNode.camera = camera
        cameraNode.position = SCNVector3(0, 3.0, 7.2)
        cameraNode.eulerAngles = SCNVector3(-0.23, 0, 0)
        scene.rootNode.addChildNode(cameraNode)

        let ambient = SCNLight()
        ambient.type = .ambient
        ambient.intensity = 520
        ambient.color = UIColor(white: 0.72, alpha: 1)
        let ambientNode = SCNNode()
        ambientNode.light = ambient
        scene.rootNode.addChildNode(ambientNode)

        let sun = SCNLight()
        sun.type = .directional
        sun.intensity = 1050
        sun.color = UIColor(white: 1, alpha: 1)
        let sunNode = SCNNode()
        sunNode.light = sun
        sunNode.eulerAngles = SCNVector3(-0.9, 0.55, 0)
        scene.rootNode.addChildNode(sunNode)

        let ground = SCNPlane(width: 100, height: 100)
        ground.materials = [material(UIColor(red: 0.12, green: 0.15, blue: 0.16, alpha: 1))]
        let groundNode = SCNNode(geometry: ground)
        groundNode.eulerAngles.x = -.pi / 2
        groundNode.position.y = -0.025
        scene.rootNode.addChildNode(groundNode)

        let road = SCNBox(width: 11, height: 0.025, length: 90, chamferRadius: 0)
        road.materials = [material(UIColor(red: 0.055, green: 0.065, blue: 0.075, alpha: 1))]
        let roadNode = SCNNode(geometry: road)
        roadNode.position = SCNVector3(0, 0, -13)
        scene.rootNode.addChildNode(roadNode)

        for side in [-1.0, 1.0] {
            let stripe = SCNBox(width: 0.07, height: 0.03, length: 70, chamferRadius: 0)
            stripe.materials = [material(UIColor(red: 0.72, green: 0.72, blue: 0.62, alpha: 1))]
            let stripeNode = SCNNode(geometry: stripe)
            stripeNode.position = SCNVector3(Float(side * 4.8), 0.025, -13)
            scene.rootNode.addChildNode(stripeNode)
        }

        addDistantBuildings(to: scene)
        addProxyCharacter(to: scene)
        return scene
    }

    private static func addDistantBuildings(to scene: SCNScene) {
        let heights: [CGFloat] = [4, 7, 5, 9, 6, 4, 8]
        for index in 0..<heights.count {
            let height = heights[index]
            let box = SCNBox(width: 2.8, height: height, length: 2.5, chamferRadius: 0.04)
            box.materials = [material(UIColor(red: 0.12, green: 0.15, blue: 0.20, alpha: 1))]
            let node = SCNNode(geometry: box)
            let side: Float = index.isMultiple(of: 2) ? -1 : 1
            node.position = SCNVector3(side * Float(8 + index % 3), Float(height / 2), Float(-17 - index * 4))
            scene.rootNode.addChildNode(node)
        }
    }

    private static func addProxyCharacter(to scene: SCNScene) {
        let root = SCNNode()
        root.position = SCNVector3(0, 0.06, 0)
        scene.rootNode.addChildNode(root)

        let jacket = material(UIColor(red: 0.12, green: 0.15, blue: 0.19, alpha: 1))
        let pants = material(UIColor(red: 0.10, green: 0.16, blue: 0.24, alpha: 1))
        let skin = material(UIColor(red: 0.66, green: 0.47, blue: 0.34, alpha: 1))
        let shoes = material(UIColor(red: 0.035, green: 0.04, blue: 0.045, alpha: 1))

        let torso = SCNCapsule(capRadius: 0.25, height: 0.82)
        torso.materials = [jacket]
        let torsoNode = SCNNode(geometry: torso)
        torsoNode.position = SCNVector3(0, 1.34, 0)
        root.addChildNode(torsoNode)

        let head = SCNSphere(radius: 0.18)
        head.segmentCount = 18
        head.materials = [skin]
        let headNode = SCNNode(geometry: head)
        headNode.position = SCNVector3(0, 1.94, 0)
        root.addChildNode(headNode)

        let leftLeg = makeLimb(radius: 0.105, height: 0.72, material: pants)
        leftLeg.position = SCNVector3(-0.14, 0.53, 0)
        leftLeg.pivot = SCNMatrix4MakeTranslation(0, 0.34, 0)
        root.addChildNode(leftLeg)

        let rightLeg = makeLimb(radius: 0.105, height: 0.72, material: pants)
        rightLeg.position = SCNVector3(0.14, 0.53, 0)
        rightLeg.pivot = SCNMatrix4MakeTranslation(0, 0.34, 0)
        root.addChildNode(rightLeg)

        let leftArm = makeLimb(radius: 0.085, height: 0.68, material: jacket)
        leftArm.position = SCNVector3(-0.34, 1.36, 0)
        leftArm.pivot = SCNMatrix4MakeTranslation(0, 0.29, 0)
        root.addChildNode(leftArm)

        let rightArm = makeLimb(radius: 0.085, height: 0.68, material: jacket)
        rightArm.position = SCNVector3(0.34, 1.36, 0)
        rightArm.pivot = SCNMatrix4MakeTranslation(0, 0.29, 0)
        root.addChildNode(rightArm)

        for x: Float in [-0.14, 0.14] {
            let shoe = SCNBox(width: 0.19, height: 0.10, length: 0.31, chamferRadius: 0.035)
            shoe.materials = [shoes]
            let shoeNode = SCNNode(geometry: shoe)
            shoeNode.position = SCNVector3(x, 0.07, -0.055)
            root.addChildNode(shoeNode)
        }

        let walk = SCNAction.customAction(duration: 0.9) { node, elapsed in
            let phase = Double(elapsed) / 0.9 * Double.pi * 2
            leftLeg.eulerAngles.x = Float(sin(phase) * 0.42)
            rightLeg.eulerAngles.x = Float(-sin(phase) * 0.42)
            leftArm.eulerAngles.x = Float(-sin(phase) * 0.30)
            rightArm.eulerAngles.x = Float(sin(phase) * 0.30)
            node.position.y = 0.06 + Float(abs(sin(phase * 2)) * 0.025)
        }
        root.runAction(SCNAction.repeatForever(walk))
    }

    private static func makeLimb(radius: CGFloat, height: CGFloat, material: SCNMaterial) -> SCNNode {
        let geometry = SCNCapsule(capRadius: radius, height: height)
        geometry.materials = [material]
        return SCNNode(geometry: geometry)
    }
}
