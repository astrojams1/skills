// app-standard: first-launch
// FirstLaunch.swift
// The shared first-launch count (references/standards.md in the app-release skill): on the first open after install
// the app sends one anonymous event, so downloads show within minutes instead of after Apple's one to two day lag.
// Copy this file into the app unchanged and call it once when the app starts:
//
//   SwiftUI:      .task { FirstLaunch.report(app: "<catalogue id>") }   on the root view
//   UIKit/AppKit: FirstLaunch.report(app: "<catalogue id>")              in didFinishLaunching
//
// The catalogue id is the app's id in astrojams1/app-sites marketing/apps/<id>.json (hanzi-cards, nametag, plenty...).
//
// What is sent: the catalogue id, the app version, the platform (ios, ipados, macos, visionos) and the install
// channel (store, testflight or debug). Nothing else: no IDFA, no IDFV, no device name or model, no locale and no
// identifier of any kind, so the server cannot tell two installs apart. It keeps only a daily count per app, version,
// platform and channel; the request's IP address is read by no code and stored nowhere. App Privacy: Usage Data >
// Product Interaction, not linked to the user, not used for tracking, purpose Analytics (the privacy manifest
// declares the same).
//
// Never in the way: it runs after launch at background priority, a failure is silent, and the flag that stops repeats
// is set only after the server has answered, so a failed send is tried again on a later launch. UI tests and debug
// runs (any launch argument starting -uiTest) skip it unless the launch argument -firstLaunchSend is given.

import Foundation
#if canImport(StoreKit)
import StoreKit
#endif
#if canImport(UIKit)
import UIKit
#endif

/// A namespace: never made, only called.
enum FirstLaunch {
    static let endpoint = URL(string: "https://astrojams-apps.vercel.app/api/launch")!
    static let storageKey = "app-standard.first-launch.sent"

    /// The event, and the only data the request carries.
    struct Event: Codable, Equatable {
        var app: String
        var version: String
        var platform: String
        var channel: String
    }

    /// Whether this install still has to report: nothing has been accepted yet.
    static func isDue(_ defaults: UserDefaults = .standard) -> Bool {
        !defaults.bool(forKey: storageKey)
    }

    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
    }

    @MainActor static var platform: String {
        #if os(visionOS)
        return "visionos"
        #elseif os(macOS) || targetEnvironment(macCatalyst)
        return "macos"
        #elseif canImport(UIKit)
        if ProcessInfo.processInfo.isiOSAppOnMac { return "macos" }
        return UIDevice.current.userInterfaceIdiom == .pad ? "ipados" : "ios"
        #else
        return "ios"
        #endif
    }

    /// The JSON body for one event.
    static func body(_ event: Event) -> Data {
        (try? JSONEncoder().encode(event)) ?? Data()
    }

    /// Reports the first open once. Returns at once; the work runs in the background.
    static func report(app: String, defaults: UserDefaults = .standard, session: URLSession = .shared) {
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains(where: { $0.hasPrefix("-uiTest") }) && !arguments.contains("-firstLaunchSend") { return }
        #if DEBUG
        if !arguments.contains("-firstLaunchSend") { return }
        #endif
        guard isDue(defaults) else { return }
        let suite = Defaults(defaults)
        // A forced send (checking the standard) is always debug, so it never counts as an install.
        let forced = arguments.contains("-firstLaunchSend")
        Task.detached(priority: .background) {
            let event = Event(app: app, version: appVersion, platform: await platform, channel: forced ? "debug" : await channel())
            if await send(event, session: session) { suite.defaults.set(true, forKey: storageKey) }
        }
    }

    /// UserDefaults is thread-safe; this lets the background task carry it under strict concurrency checking.
    private struct Defaults: @unchecked Sendable {
        let defaults: UserDefaults
        init(_ defaults: UserDefaults) { self.defaults = defaults }
    }

    /// Sends one event. True when the server took it (any 2xx) or refused it for good (4xx), so it is not sent again.
    static func send(_ event: Event, session: URLSession = .shared) async -> Bool {
        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpShouldHandleCookies = false
        request.httpBody = body(event)
        guard let (_, response) = try? await session.data(for: request),
              let code = (response as? HTTPURLResponse)?.statusCode else { return false }
        return (200..<500).contains(code) && code != 429 && code != 408
    }

    /// store, testflight or debug: where this copy of the app came from, so the count can be set beside Apple's.
    static func channel() async -> String {
        #if DEBUG || targetEnvironment(simulator)
        return "debug"
        #else
        #if canImport(StoreKit)
        if #available(iOS 16.0, macOS 13.0, tvOS 16.0, visionOS 1.0, *) {
            if let result = try? await AppTransaction.shared {
                switch result {
                case .verified(let transaction), .unverified(let transaction, _):
                    switch transaction.environment {
                    case .production: return "store"
                    case .sandbox: return "testflight"
                    default: return "debug"
                    }
                }
            }
        }
        #endif
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" ? "testflight" : "store"
        #endif
    }
}
