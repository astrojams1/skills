// app-standard: feedback
// FeedbackButton.swift
// The shared Send Feedback control (references/standards.md in the app-release skill). Copy this file into the app,
// set `address` to feedback.email in app-release.config.json, and put FeedbackButton() on the settings or about screen,
// behind the parental gate in a Kids Category app. It sends nothing itself: the user's own mail app does, if they choose.

import Foundation
#if canImport(MessageUI)
import MessageUI
import SwiftUI
#endif

/// The email every app opens. Its footer holds these six facts and nothing else: no identifiers, account data or logs.
struct FeedbackMessage {
    static let address = "astrojams1@gmail.com"

    let appName: String
    let version: String
    let build: String
    let osVersion: String
    let deviceModel: String
    let locale: String

    var subject: String { "[\(appName) feedback] \(version) (\(build))" }

    /// Empty lines for the user to write in, then the footer.
    var body: String {
        "\n\n\n-- \nApp: \(appName)\nVersion: \(version)\nBuild: \(build)\nOS: \(osVersion)\nDevice: \(deviceModel)\nLocale: \(locale)\n"
    }

    var mailtoURL: URL? {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = Self.address
        components.queryItems = [
            URLQueryItem(name: "subject", value: subject),
            URLQueryItem(name: "body", value: body.replacingOccurrences(of: "\n", with: "\r\n")),
        ]
        return components.url
    }
}

#if canImport(MessageUI)
extension FeedbackMessage {
    @MainActor static var current: FeedbackMessage {
        let info = Bundle.main.infoDictionary ?? [:]
        let device = UIDevice.current
        return FeedbackMessage(
            appName: info["CFBundleDisplayName"] as? String ?? info["CFBundleName"] as? String ?? "App",
            version: info["CFBundleShortVersionString"] as? String ?? "?",
            build: info["CFBundleVersion"] as? String ?? "?",
            osVersion: "\(device.systemName) \(device.systemVersion)",
            deviceModel: modelIdentifier,
            locale: Locale.current.identifier
        )
    }

    /// The hardware model, such as iPhone17,3: UIDevice.model says only "iPhone".
    private static var modelIdentifier: String {
        if let simulated = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return simulated }
        var system = utsname()
        uname(&system)
        return withUnsafeBytes(of: &system.machine) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
    }
}

/// Mail's composer where an account is set up, else a mailto: link, else the address with a Copy button.
struct FeedbackButton: View {
    @Environment(\.openURL) private var openURL
    @State private var composing = false
    @State private var showingAddress = false

    var body: some View {
        Button("Send Feedback") {
            let message = FeedbackMessage.current
            if MFMailComposeViewController.canSendMail() {
                composing = true
            } else if let url = message.mailtoURL {
                openURL(url) { opened in showingAddress = !opened }
            } else {
                showingAddress = true
            }
        }
        .sheet(isPresented: $composing) {
            FeedbackComposer(message: .current).ignoresSafeArea()
        }
        .alert("Send Feedback", isPresented: $showingAddress) {
            Button("Copy") { UIPasteboard.general.string = FeedbackMessage.address }
            Button("Done", role: .cancel) {}
        } message: {
            Text(verbatim: FeedbackMessage.address)
        }
    }
}

private struct FeedbackComposer: UIViewControllerRepresentable {
    let message: FeedbackMessage
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator { Coordinator(dismiss: dismiss) }

    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let composer = MFMailComposeViewController()
        composer.mailComposeDelegate = context.coordinator
        composer.setToRecipients([FeedbackMessage.address])
        composer.setSubject(message.subject)
        composer.setMessageBody(message.body, isHTML: false)
        return composer
    }

    func updateUIViewController(_ composer: MFMailComposeViewController, context: Context) {}

    final class Coordinator: NSObject, MFMailComposeViewControllerDelegate {
        private let dismiss: DismissAction

        init(dismiss: DismissAction) { self.dismiss = dismiss }

        func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
            let dismiss = dismiss
            Task { @MainActor in dismiss() }
        }
    }
}
#endif
