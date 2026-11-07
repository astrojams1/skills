// On-device transcription with Apple's SpeechAnalyzer. Audio never leaves the Mac.
// Build:  swiftc -O -parse-as-library transcribe.swift -o <bin>
// Usage:  <bin> <audio-file> <transcript.txt> [locale, default en_US]
import AVFoundation
import Foundation
import Speech

func stamp(_ seconds: Double) -> String {
    let s = Int(seconds)
    return String(format: "%02d:%02d:%02d", s / 3600, s / 60 % 60, s % 60)
}

@main
struct Transcribe {
    static func main() async {
        let args = CommandLine.arguments
        guard args.count >= 3 else {
            FileHandle.standardError.write(Data("usage: transcribe <audio> <out.txt> [locale]\n".utf8))
            exit(2)
        }
        do {
            try await run(audio: args[1], out: args[2], locale: args.count > 3 ? args[3] : "en_US")
        } catch {
            FileHandle.standardError.write(Data("transcribe failed: \(error)\n".utf8))
            exit(1)
        }
    }

    static func run(audio: String, out: String, locale id: String) async throws {
        let locale = Locale(identifier: id)
        let transcriber = SpeechTranscriber(
            locale: locale, transcriptionOptions: [], reportingOptions: [],
            attributeOptions: [.audioTimeRange])
        if let install = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
            try await install.downloadAndInstall()
        }
        let analyzer = SpeechAnalyzer(modules: [transcriber])
        let file = try AVAudioFile(forReading: URL(fileURLWithPath: audio))

        let collect = Task { () -> [String] in
            var lines: [String] = []
            for try await result in transcriber.results {
                let text = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
                if text.isEmpty { continue }
                let start = result.text.runs.compactMap { $0.audioTimeRange?.start.seconds }.first ?? 0
                lines.append("[\(stamp(start))] \(text)")
            }
            return lines
        }
        if let last = try await analyzer.analyzeSequence(from: file) {
            try await analyzer.finalizeAndFinish(through: last)
        } else {
            await analyzer.cancelAndFinishNow()
        }
        let lines = try await collect.value
        let body = lines.joined(separator: "\n") + "\n"
        FileManager.default.createFile(
            atPath: out, contents: Data(body.utf8), attributes: [.posixPermissions: 0o600])
        print("segments=\(lines.count) seconds=\(Int(Double(file.length) / file.processingFormat.sampleRate))")
    }
}
