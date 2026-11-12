// legibility.swift
// Finds every line of text in a video's frames (or a still) with Apple's Vision text recogniser and measures how well
// it stands out: the WCAG contrast ratio between the text's ink and the ground right around it. A caption the same
// colour as its background fails here before anyone has to squint at it on a phone. macOS 13+, no dependencies.
//
//   swift legibility.swift <video|image> [--every 0.5] [--min 4.5] [--min-height 34] [--json out.json]
//
// It samples a frame every --every seconds, finds text lines, and for each line takes the luminance of its pixels:
// the darkest 15 % and the lightest 15 % are the two sides (ink and ground, whichever way round), and their WCAG
// ratio is the line's contrast. Lines under --min (default 4.5, WCAG AA for text) are listed and the exit status is
// 1. It measures word by word, so one accent-coloured word in an otherwise black caption still fails. Words under
// --min-height px tall (default 34, in a 1080-wide frame) are not checked: that is app UI detail inside a device, whose
// colours the app owns, not our captions. Single letters are skipped.

import AVFoundation
import AppKit
import Foundation
import Vision

struct Line: Codable { let at: Double; let text: String; let ratio: Double; let box: [Int] }

func luminance(_ r: UInt8, _ g: UInt8, _ b: UInt8) -> Double {
  func channel(_ v: UInt8) -> Double {
    let c = Double(v) / 255
    return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

func bitmap(_ image: CGImage) -> (data: [UInt8], width: Int, height: Int) {
  let width = image.width, height = image.height
  var data = [UInt8](repeating: 0, count: width * height * 4)
  let context = CGContext(data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                          space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return (data, width, height)
}

var minHeight = 34.0

func lines(in image: CGImage, at time: Double) -> [Line] {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  try? VNImageRequestHandler(cgImage: image).perform([request])
  let (data, width, height) = bitmap(image)
  let scale = 1080.0 / Double(width)
  var found: [Line] = []
  for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    // Word by word: a caption whose last word is in an accent colour ("Does it count?") must not pass on the
    // strength of its black words.
    var boxes: [(String, CGRect)] = []
    candidate.string.enumerateSubstrings(in: candidate.string.startIndex..., options: .byWords) { word, range, _, _ in
      guard let word, let box = try? candidate.boundingBox(for: range)?.boundingBox else { return }
      boxes.append((word, box))
    }
    for (text, b) in boxes {
    guard text.count >= 2 else { continue }
    let x0 = max(0, Int(b.minX * Double(width))), x1 = min(width - 1, Int(b.maxX * Double(width)))
    let y0 = max(0, Int((1 - b.maxY) * Double(height))), y1 = min(height - 1, Int((1 - b.minY) * Double(height)))
    if Double(y1 - y0) * scale < minHeight || x1 <= x0 { continue }
    var values: [Double] = []
    values.reserveCapacity((x1 - x0) * (y1 - y0))
    for y in y0...y1 { for x in x0...x1 {
      let i = (y * width + x) * 4
      values.append(luminance(data[i], data[i + 1], data[i + 2]))
    } }
    values.sort()
    let n = values.count, k = max(1, n * 15 / 100)
    let dark = values[0..<k].reduce(0, +) / Double(k), light = values[(n - k)..<n].reduce(0, +) / Double(k)
    let ratio = (light + 0.05) / (dark + 0.05)
    found.append(Line(at: time, text: text, ratio: (ratio * 100).rounded() / 100,
                      box: [Int(Double(x0) * scale), Int(Double(y0) * scale), Int(Double(x1) * scale), Int(Double(y1) * scale)]))
    }
  }
  return found
}

var args = Array(CommandLine.arguments.dropFirst())
func option(_ name: String) -> String? {
  guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
  let value = args[i + 1]; args.removeSubrange(i...(i + 1)); return value
}
let every = Double(option("--every") ?? "0.5") ?? 0.5
let minimum = Double(option("--min") ?? "4.5") ?? 4.5
let jsonOut = option("--json")
minHeight = Double(option("--min-height") ?? "34") ?? 34
guard let path = args.first else {
  FileHandle.standardError.write("usage: swift legibility.swift <video|image> [--every 0.5] [--min 4.5] [--min-height 34] [--json out.json]\n".data(using: .utf8)!)
  exit(2)
}
let url = URL(fileURLWithPath: path)
var all: [Line] = []
if let image = NSImage(contentsOf: url), ["png", "jpg", "jpeg"].contains(url.pathExtension.lowercased()),
   let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) {
  all = lines(in: cg, at: 0)
} else {
  let asset = AVURLAsset(url: url)
  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  let duration = CMTimeGetSeconds(asset.duration)
  var t = 0.0
  while t < duration {
    if let frame = try? generator.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) {
      all += lines(in: frame, at: (t * 100).rounded() / 100)
    }
    t += every
  }
}
let failing = all.filter { $0.ratio < minimum }
// One report line per distinct text, at its worst moment.
var worst: [String: Line] = [:]
for line in failing where (worst[line.text]?.ratio ?? .infinity) > line.ratio { worst[line.text] = line }
for line in worst.values.sorted(by: { $0.at < $1.at }) {
  print(String(format: "FAIL %5.2fs  %.2f:1  \"%@\"  at x%d y%d", line.at, line.ratio, line.text, line.box[0], line.box[1]))
}
print("\(all.count) words checked, \(worst.count) distinct words under \(minimum):1")
if let jsonOut {
  let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
  try? encoder.encode(all).write(to: URL(fileURLWithPath: jsonOut))
}
exit(failing.isEmpty ? 0 : 1)
