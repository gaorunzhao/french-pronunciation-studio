// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "FrenchPronunciationStudio",
    platforms: [
        .macOS(.v15)
    ],
    products: [
        .executable(
            name: "FrenchPronunciationStudio",
            targets: ["FrenchPronunciationStudio"]
        ),
        .executable(
            name: "StudioCoreChecks",
            targets: ["StudioCoreChecks"]
        ),
        .library(
            name: "StudioCore",
            targets: ["StudioCore"]
        )
    ],
    targets: [
        .target(name: "StudioCore"),
        .executableTarget(
            name: "FrenchPronunciationStudio",
            dependencies: ["StudioCore"]
        ),
        .executableTarget(
            name: "StudioCoreChecks",
            dependencies: ["StudioCore"]
        )
    ]
)
