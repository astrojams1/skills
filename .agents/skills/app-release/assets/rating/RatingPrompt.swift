// app-standard: rating
// RatingPrompt.swift
// The shared "ask for a rating" rule (references/standards.md in the app-release skill). Copy this file into the app
// and call it right after a good moment: a finished round, a saved entry, a completed set. Never at launch, in the
// middle of a task or after an error. In a Kids Category app, call it only from a screen behind the parental gate.
//
// SwiftUI:
//   @Environment(\.requestReview) private var requestReview
//   ...
//   if RatingPrompt.goodMoment() { requestReview() }
//
// Elsewhere (UIKit, SpriteKit, a view model): RatingPrompt.askIfDue()
//
// Only the system's own prompt is used. There is no screen of the app's own in front of it and no reward for rating
// (App Review Guideline 5.6.1). Apple decides whether the prompt appears and shows it at most three times in 365 days.
// Nothing leaves the device: the counts live in UserDefaults.

import Foundation
#if canImport(StoreKit) && canImport(UIKit)
import StoreKit
import UIKit
#endif

/// When the app may ask. Pure values in and out, so the rule is unit tested without the store.
struct RatingPolicy {
    /// Good moments needed before the first ask.
    var momentsNeeded = 3
    /// Different days those moments must fall on.
    var daysNeeded = 2
    /// Days to wait after an ask before asking again, and then only in a newer version.
    var daysBetweenAsks = 90

    struct State: Codable, Equatable {
        var moments = 0
        /// Distinct days (yyyy-MM-dd, the device's calendar) with a good moment, oldest first.
        var days: [String] = []
        var lastAsk: Date?
        var lastAskVersion: String?
    }

    static func day(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// The state after one more good moment.
    func recording(_ state: State, at now: Date, calendar: Calendar = .current) -> State {
        var next = state
        next.moments += 1
        let today = RatingPolicy.day(now, calendar: calendar)
        if !next.days.contains(today) { next.days.append(today) }
        if next.days.count > daysNeeded { next.days.removeFirst(next.days.count - daysNeeded) }
        return next
    }

    /// Whether to ask now: enough good moments on enough days, never twice for one version, never within the wait.
    func shouldAsk(_ state: State, version: String, at now: Date) -> Bool {
        guard state.moments >= momentsNeeded, state.days.count >= daysNeeded else { return false }
        if state.lastAskVersion == version { return false }
        if let last = state.lastAsk, now.timeIntervalSince(last) < Double(daysBetweenAsks) * 86_400 { return false }
        return true
    }

    /// The state after asking: the count starts again, so the next ask also follows fresh good moments.
    func asked(_ state: State, version: String, at now: Date) -> State {
        State(moments: 0, days: [], lastAsk: now, lastAskVersion: version)
    }
}

/// A namespace: never made, only called.
struct RatingPrompt {
    private init() {}
    static let storageKey = "app-standard.rating.state"

    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
    }

    /// Records a good moment. Returns true when the app should call the system prompt now.
    @discardableResult
    static func goodMoment(policy: RatingPolicy = RatingPolicy(), defaults: UserDefaults = .standard,
                           version: String = RatingPrompt.appVersion, now: Date = Date()) -> Bool {
        var state = load(defaults)
        state = policy.recording(state, at: now)
        let ask = policy.shouldAsk(state, version: version, at: now)
        if ask { state = policy.asked(state, version: version, at: now) }
        save(state, defaults)
        return ask
    }

    static func load(_ defaults: UserDefaults) -> RatingPolicy.State {
        guard let data = defaults.data(forKey: storageKey),
              let state = try? JSONDecoder().decode(RatingPolicy.State.self, from: data) else { return RatingPolicy.State() }
        return state
    }

    static func save(_ state: RatingPolicy.State, _ defaults: UserDefaults) {
        if let data = try? JSONEncoder().encode(state) { defaults.set(data, forKey: storageKey) }
    }

    #if canImport(StoreKit) && canImport(UIKit) && !os(watchOS) && !os(tvOS)
    /// Records a good moment and, when one is due, asks through the system prompt in the front window scene.
    @available(iOS 16.0, *)
    @MainActor
    static func askIfDue(policy: RatingPolicy = RatingPolicy()) {
        guard goodMoment(policy: policy) else { return }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) else { return }
        AppStore.requestReview(in: scene)
    }
    #endif
}
