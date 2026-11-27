import SwiftUI
import UIKit

struct TouchHandler: UIViewRepresentable {
    func makeUIView(context: Context) -> TouchView {
        let view = TouchView()
        view.backgroundColor = .clear
        view.isMultipleTouchEnabled = true
        return view
    }

    func updateUIView(_ view: TouchView, context: Context) {}

    final class TouchView: UIView {
        private var touchIDs: [ObjectIdentifier: Int] = [:]

        private func updateTouches(_ touches: Set<UITouch>, ended: Bool) {
            for touch in touches {
                let key = ObjectIdentifier(touch)

                if ended {
                    if let index = touchIDs.removeValue(forKey: key) {
                        GameTouchEnded(Int32(index))
                    }
                    continue
                }

                let index: Int
                if let existing = touchIDs[key] {
                    index = existing
                } else {
                    let used = Set(touchIDs.values)
                    guard let free = (0..<10).first(where: { !used.contains($0) }) else {
                        continue
                    }
                    index = free
                    touchIDs[key] = index
                }

                let point = touch.location(in: self)
                let x = Float(point.x / max(bounds.width, 1))
                let y = Float(point.y / max(bounds.height, 1))

                if touch.phase == .began {
                    GameTouchBegan(Int32(index), x, y)
                } else {
                    GameTouchMoved(Int32(index), x, y)
                }
            }
        }

        override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
            updateTouches(touches, ended: false)
        }

        override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
            updateTouches(touches, ended: false)
        }

        override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
            updateTouches(touches, ended: true)
        }

        override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
            updateTouches(touches, ended: true)
        }
    }
}
