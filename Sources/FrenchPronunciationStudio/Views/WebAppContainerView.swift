import SwiftUI

struct WebAppContainerView: View {
    @EnvironmentObject private var modelManager: KokoroModelManager
    @EnvironmentObject private var speechService: SpeechService

    var body: some View {
        WebAppView(modelManager: modelManager, speechService: speechService)
            .background(Color.white)
    }
}
