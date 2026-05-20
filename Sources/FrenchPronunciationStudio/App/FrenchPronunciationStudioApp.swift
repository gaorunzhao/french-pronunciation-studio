import AppKit
import SwiftUI

@main
@MainActor
enum FrenchPronunciationStudioApplication {
    private static let lifecycleDelegate = FrenchPronunciationStudioLifecycleDelegate()
    private static let modelManager = KokoroModelManager()
    private static let speechService = SpeechService()
    private static var window: NSWindow?

    static func main() {
        UserDefaults.standard.set(false, forKey: "NSQuitAlwaysKeepsWindows")

        let app = NSApplication.shared
        app.setActivationPolicy(.regular)
        app.delegate = lifecycleDelegate
        app.finishLaunching()

        createMainWindow()
        modelManager.refresh()
        app.activate(ignoringOtherApps: true)
        app.run()
    }

    private static func createMainWindow() {
        let rootView = WebAppContainerView()
            .environmentObject(modelManager)
            .environmentObject(speechService)

        let hostingView = NSHostingView(rootView: rootView)
        hostingView.frame = NSRect(x: 0, y: 0, width: 1060, height: 720)

        let mainWindow = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1060, height: 720),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        mainWindow.title = "French Pronunciation Studio"
        mainWindow.minSize = NSSize(width: 960, height: 640)
        mainWindow.contentMinSize = NSSize(width: 960, height: 640)
        mainWindow.contentView = hostingView
        mainWindow.center()
        mainWindow.makeKeyAndOrderFront(nil)

        window = mainWindow
    }
}

@MainActor
final class FrenchPronunciationStudioLifecycleDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
