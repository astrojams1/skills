// app-standard: more-apps
// MoreApps.swift
// The shared "More apps" row (references/standards.md in the app-release skill): the owner's other live apps, each with
// its icon, name, one line and a link to its App Store page. Copy this file into the app unchanged, then generate the
// list beside it from the shared catalogue (the app sites' profiles and Apple's lookup), from the app repository:
//
//   node <skills>/skills/app-release/scripts/more-apps.mjs write --swift <folder>/MoreAppsCatalog.swift
//
// Put the row on the settings or about screen, near the feedback control, inside a List or Form:
//
//   Section { MoreAppsLink() }          // a "More apps" row that opens the list
//   // or, where there is room, the rows themselves:
//   MoreAppsSection()
//
// In a game it goes on the settings or menu screen, never over play. A tap opens the app's App Store page through
// openURL: apps.apple.com links open the App Store app on iPhone, iPad and Mac, with no StoreKit sheet to host.
// Nothing is sent and nothing is counted by the app: the list and the icons are bundled, so it works offline and never
// shows a broken row. Apple's App Analytics counts the downloads it brings as "App referrer: <this bundle id>".

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// A namespace for the list. The entries come from the generated MoreAppsCatalog.swift.
enum MoreApps {
    struct App: Identifiable, Equatable {
        /// The app's id in the shared catalogue (marketing/apps/<id>.json in astrojams1/app-sites).
        let id: String
        let name: String
        let subtitle: String
        let appStoreId: String
        let bundleId: String
        /// A small JPEG of the app icon, base64, bundled so the row needs no network.
        let iconJPEGBase64: String

        /// The App Store page. Opens the App Store app on Apple devices.
        var storeURL: URL { URL(string: "https://apps.apple.com/app/id" + appStoreId)! }
    }

    /// The apps to show: the generated list, never this app itself.
    static func apps(ownBundleId: String? = Bundle.main.bundleIdentifier) -> [App] {
        catalog.filter { $0.bundleId != ownBundleId }
    }

    static func icon(_ app: App) -> Image? {
        guard let data = Data(base64Encoded: app.iconJPEGBase64) else { return nil }
        #if canImport(UIKit)
        return UIImage(data: data).map { Image(uiImage: $0) }
        #elseif canImport(AppKit)
        return NSImage(data: data).map { Image(nsImage: $0) }
        #else
        return nil
        #endif
    }
}

/// One app: icon, name, one line. The whole row is the link.
struct MoreAppsRow: View {
    let app: MoreApps.App
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button { openURL(app.storeURL) } label: {
            HStack(spacing: 12) {
                Group {
                    if let icon = MoreApps.icon(app) { icon.resizable().interpolation(.high) }
                    else { Color.secondary.opacity(0.2) }
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(app.name).foregroundStyle(.primary)
                    Text(app.subtitle).font(.footnote).foregroundStyle(.secondary).lineLimit(2)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.forward.app").foregroundStyle(.secondary).accessibilityHidden(true)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(app.name + ", " + app.subtitle))
        .accessibilityHint(Text("Opens the App Store"))
        .accessibilityIdentifier("more-apps-" + app.id)
    }
}

/// The rows under a "More apps" header, for a List or Form. Shows nothing when the list is empty.
struct MoreAppsSection: View {
    var title = "More apps"
    var body: some View {
        let apps = MoreApps.apps()
        if !apps.isEmpty {
            Section(header: Text(title)) {
                ForEach(apps) { MoreAppsRow(app: $0) }
            }
        }
    }
}

/// A single "More apps" row that opens the list, for a settings screen with little room.
struct MoreAppsLink: View {
    var title = "More apps"
    var body: some View {
        if !MoreApps.apps().isEmpty {
            NavigationLink {
                List { ForEach(MoreApps.apps()) { MoreAppsRow(app: $0) } }
                    .navigationTitle(title)
            } label: {
                Label(title, systemImage: "square.grid.2x2")
            }
            .accessibilityIdentifier("more-apps")
        }
    }
}
