// app-preview.swift
// Makes and checks App Store app previews on the owner's Mac with AVFoundation alone (no ffmpeg). `render` cuts
// native simulator recordings into a preview at an accepted resolution: constant frame rate, H.264, a silent stereo
// AAC track, optional captions in the app's own font and an optional device frame on a brand background. `check`
// reads a finished file against Apple's preview specification. `sheet` draws a contact sheet of frames so a person
// (or agent) can look at the cut before it is uploaded. Run with `swift app-preview.swift <command> …`.
//
//   swift app-preview.swift render <spec.json>
//   swift app-preview.swift check <preview.mov> [previewType]
//   swift app-preview.swift sheet <video> <out.png> [frames=12] [from=0] [to=end]
//   swift app-preview.swift frame <video> <seconds> <out.png>     (one full-size frame, e.g. to choose the poster frame)
//
// A render spec (paths relative to the spec file):
// {
//   "output": "preview.mov", "size": [886, 1920], "fps": 30, "bitrate": 10000000,
//   "background": "#EDE3FA", "crossfade": 0.3,
//   "font": "fonts/Nunito-Bold.ttf", "noteFont": "fonts/Nunito-Regular.ttf",
//   "caption": { "size": 70, "lineHeight": 84, "baseline": 138, "color": "#291834", "accent": "#6A32C9", "tracking": -1,
//                "noteSize": 30, "noteBaseline": 262, "noteColor": "#62576A" },
//   "screen": { "x": 88, "y": 300, "width": 710, "height": 1544, "radius": 80, "bezel": 16, "bezelColor": "#291834", "shadow": 0.22 },
//   (YouTube Shorts only: App Review rejects an App Store preview in a device frame, Guideline 2.3.4. `check` says so.)
//   "clips": [ { "file": "take1.mov", "from": 1.2, "to": 4.6, "speed": 1 } ],
//   "captions": [ { "from": 0, "to": 4.2, "lines": ["Food tracking for", "the [whole family.]"] },
//                 { "from": 26, "to": 29, "lines": ["…"], "note": "Sign in with Apple or Google to start." } ]
// }
// Without "screen" the recording fills the frame (aspect fill). Text in [brackets] takes the accent colour. A caption's
// optional note is a smaller line under it, for what Apple asks previews to disclose (sign-in, purchases).
//
// The same render makes a vertical Short (size [1080, 1920]; see the youtube-shorts skill for the safe zone):
//   a clip's "shift" moves the device up (negative) or down in pixels, eased in from the previous clip's over "move"
//   seconds (default 0.6), so each scene's subject sits in the safe box; "fade": { "top": [470, 420], "bottom":
//   [1460, 1520] } blends the background over the picture from the first y to solid at the second, so the device
//   passes under captions and YouTube's controls without showing an edge; caption "centerX" centres captions off the
//   frame's middle (480 for the Shorts safe box). A clip's "zoom" scales the device about "focus" ([x, y] as fractions
//   of the screen, default the centre) for a punch-in on a result; a clip's own "move" overrides the spec's (0.25 for
//   a snappy punch). A caption may set its own "size", "lineHeight", "baseline" and "color", "box": "#FFFFFF" for a
//   rounded box behind each line (legible over moving video), and "pop": true to spring in. Soundtrack:
//   youtube-shorts' soundtrack.mjs.

import AVFoundation
import CoreGraphics
import CoreImage
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Failure: Error, CustomStringConvertible { let description: String }

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

// MARK: Apple's specification

// Accepted portrait and landscape sizes per preview type, from Apple's App preview specifications. A type that is
// missing here is checked for everything but its size.
let previewSizes: [String: [[Int]]] = [
  "IPHONE_67": [[886, 1920], [1920, 886]],
  "IPHONE_65": [[886, 1920], [1920, 886]],
  "IPHONE_61": [[886, 1920], [1920, 886]],
  "IPHONE_58": [[886, 1920], [1920, 886]],
  "IPHONE_55": [[1080, 1920], [1920, 1080]],
  "IPHONE_47": [[750, 1334], [1334, 750]],
  "IPHONE_40": [[1080, 1920], [1920, 1080]],
  "IPAD_PRO_3GEN_129": [[1200, 1600], [1600, 1200]],
  "IPAD_PRO_3GEN_11": [[1200, 1600], [1600, 1200]],
  "IPAD_PRO_129": [[1200, 1600], [1600, 1200], [900, 1200], [1200, 900]],
  "IPAD_105": [[1200, 1600], [1600, 1200]],
  "IPAD_97": [[900, 1200], [1200, 900]],
  "DESKTOP": [[1920, 1080]],
  "APPLE_TV": [[1920, 1080]],
]
let durationRange = 15.0...30.0
let maxFrameRate = 30.0
let maxBytes = 500 * 1024 * 1024

// MARK: Spec

struct Clip: Decodable {
  let file: String; let from: Double; let to: Double; let speed: Double?
  let shift: Double?; let zoom: Double?; let focus: [Double]?; let move: Double?
}
struct Caption: Decodable {
  let from: Double; let to: Double; let lines: [String]; let note: String?
  let size: Double?; let lineHeight: Double?; let baseline: Double?; let color: String?; let box: String?; let pop: Bool?
  let noteBaseline: Double?
}
struct CaptionStyle: Decodable {
  let size: Double; let lineHeight: Double; let baseline: Double
  let color: String; let accent: String?; let tracking: Double?
  let noteSize: Double?; let noteBaseline: Double?; let noteColor: String?; let centerX: Double?
}
struct Screen: Decodable {
  let x: Double; let y: Double; let width: Double; let height: Double; let radius: Double
  let bezel: Double?; let bezelColor: String?; let shadow: Double?
}
struct Fade: Decodable { let top: [Double]?; let bottom: [Double]? }
struct Spec: Decodable {
  let output: String; let size: [Int]; let fps: Int?; let bitrate: Int?
  let background: String?; let crossfade: Double?; let font: String?; let noteFont: String?
  let caption: CaptionStyle?; let screen: Screen?; let move: Double?; let fade: Fade?
  let clips: [Clip]; let captions: [Caption]?
}

func color(_ hex: String, alpha: CGFloat = 1) -> CGColor {
  let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
  return CGColor(srgbRed: CGFloat((value >> 16) & 255) / 255, green: CGFloat((value >> 8) & 255) / 255,
                 blue: CGFloat(value & 255) / 255, alpha: alpha)
}

let sRGB = CGColorSpace(name: CGColorSpace.sRGB)!
let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue

func canvas(_ width: Int, _ height: Int) -> CGContext {
  CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: sRGB, bitmapInfo: bitmapInfo)!
}

// MARK: Captions

// captionImage draws a caption's lines, centred, into a transparent full-width strip. Brackets mark accent text.
// A caption may override the style's size, line height, baseline and colour, and set `box` to draw each line on a
// rounded box of that colour (the usual look for text over moving video).
func captionImage(_ caption: Caption, style: CaptionStyle, font: CTFont, noteFont: CTFont?, width: Int) -> CGImage {
  let size = caption.size ?? style.size, lineHeight = caption.lineHeight ?? style.lineHeight, baseline = caption.baseline ?? style.baseline
  let font = size == style.size ? font : CTFontCreateCopyWithAttributes(font, CGFloat(size), nil, nil)
  // A caption placed on its own keeps its note under it; otherwise the style's note line applies.
  let noteBaseline = caption.noteBaseline ?? (caption.baseline != nil ? baseline + lineHeight * Double(caption.lines.count) : nil)
    ?? style.noteBaseline ?? (baseline + lineHeight * Double(caption.lines.count))
  let height = Int(max(baseline + lineHeight * Double(caption.lines.count), noteBaseline) + size)
  let context = canvas(width, height)
  func draw(_ text: NSAttributedString, baselineFromTop: Double, box: String? = nil) {
    let line = CTLineCreateWithAttributedString(text)
    let lineWidth = CTLineGetTypographicBounds(line, nil, nil, nil)
    let x = (style.centerX ?? Double(width) / 2) - lineWidth / 2, y = Double(height) - baselineFromTop
    if let box {
      let pad = size * 0.32
      context.setFillColor(color(box))
      context.addPath(roundedRect(CGRect(x: x - pad, y: y - size * 0.34, width: lineWidth + pad * 2, height: size * 1.3), CGFloat(size * 0.28)))
      context.fillPath()
    }
    context.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(line, context)
  }
  for (index, line) in caption.lines.enumerated() {
    let text = NSMutableAttributedString()
    var accent = false
    for (part, piece) in line.components(separatedBy: CharacterSet(charactersIn: "[]")).enumerated() {
      if part > 0 { accent.toggle() }
      if piece.isEmpty { continue }
      let tint = accent ? (style.accent ?? style.color) : (caption.color ?? style.color)
      text.append(NSAttributedString(string: piece, attributes: [
        kCTFontAttributeName as NSAttributedString.Key: font,
        kCTForegroundColorAttributeName as NSAttributedString.Key: color(tint),
        kCTKernAttributeName as NSAttributedString.Key: style.tracking ?? 0,
      ]))
    }
    draw(text, baselineFromTop: baseline + lineHeight * Double(index), box: caption.box)
  }
  if let note = caption.note {
    let face = CTFontCreateCopyWithAttributes(noteFont ?? font, CGFloat(style.noteSize ?? style.size * 0.45), nil, nil)
    draw(NSAttributedString(string: note, attributes: [
      kCTFontAttributeName as NSAttributedString.Key: face,
      kCTForegroundColorAttributeName as NSAttributedString.Key: color(style.noteColor ?? style.color),
    ]), baselineFromTop: noteBaseline, box: caption.box)
  }
  return context.makeImage()!
}

// MARK: Frames

// FrameSource reads one clip's decoded frames in order and answers "the frame on screen at source time t" for a
// simulator recording, which only writes a frame when the screen changes.
final class FrameSource {
  let reader: AVAssetReader
  let output: AVAssetReaderTrackOutput
  let images = CIContext(options: [.workingColorSpace: sRGB, .outputColorSpace: sRGB])
  var current: CGImage?
  var pending: (CMTime, CGImage)?

  init(url: URL, from: Double, to: Double) async throws {
    let asset = AVURLAsset(url: url)
    guard let track = try await asset.loadTracks(withMediaType: .video).first else { throw Failure(description: url.lastPathComponent + " has no video track") }
    reader = try AVAssetReader(asset: asset)
    // Start early: the frame showing at `from` may have been written seconds before it.
    let start = max(0, from - 5)
    reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), end: CMTime(seconds: to + 0.5, preferredTimescale: 600))
    output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    output.alwaysCopiesSampleData = false
    reader.add(output)
    guard reader.startReading() else { throw Failure(description: "Cannot read " + url.lastPathComponent + ": " + String(describing: reader.error)) }
  }

  func next() -> (CMTime, CGImage)? {
    guard let sample = output.copyNextSampleBuffer(), let buffer = CMSampleBufferGetImageBuffer(sample) else { return nil }
    let image = images.createCGImage(CIImage(cvPixelBuffer: buffer), from: CGRect(x: 0, y: 0, width: CVPixelBufferGetWidth(buffer), height: CVPixelBufferGetHeight(buffer)))!
    return (CMSampleBufferGetPresentationTimeStamp(sample), image)
  }

  func frame(at seconds: Double) -> CGImage? {
    while true {
      if pending == nil { pending = next() }
      guard let (time, image) = pending else { return current }
      if time.seconds > seconds + 0.0001 { return current ?? image }
      current = image
      pending = nil
    }
  }
}

// MARK: Render

func roundedRect(_ rect: CGRect, _ radius: CGFloat) -> CGPath {
  CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
}

// aspectFill places an image of one size over a rectangle, cropping the overflow evenly.
func aspectFill(_ image: CGImage, in rect: CGRect) -> CGRect {
  let scale = max(rect.width / CGFloat(image.width), rect.height / CGFloat(image.height))
  let size = CGSize(width: CGFloat(image.width) * scale, height: CGFloat(image.height) * scale)
  return CGRect(x: rect.midX - size.width / 2, y: rect.midY - size.height / 2, width: size.width, height: size.height)
}

func ease(_ t: Double) -> Double { 1 - pow(1 - min(max(t, 0), 1), 3) }

func render(_ specPath: String) async throws {
  let specURL = URL(fileURLWithPath: specPath)
  let base = specURL.deletingLastPathComponent()
  let spec = try JSONDecoder().decode(Spec.self, from: Data(contentsOf: specURL))
  let resolve = { (path: String) in path.hasPrefix("/") ? URL(fileURLWithPath: path) : base.appendingPathComponent(path) }
  let width = spec.size[0], height = spec.size[1]
  let fps = spec.fps ?? 30
  if Double(fps) > maxFrameRate { throw Failure(description: "App previews run at 30 fps or less") }
  let crossfade = spec.crossfade ?? 0

  // Output timeline: each clip in turn, its length divided by its speed.
  var starts: [Double] = []
  var total = 0.0
  for clip in spec.clips {
    starts.append(total)
    total += (clip.to - clip.from) / (clip.speed ?? 1)
  }
  if !durationRange.contains(total) { print("warning: the cut runs \(String(format: "%.2f", total)) s; App Store previews run 15 to 30 s") }

  func loadFont(_ path: String?) throws -> CTFont? {
    guard let path else { return nil }
    guard let descriptors = CTFontManagerCreateFontDescriptorsFromURL(resolve(path) as CFURL) as? [CTFontDescriptor], let first = descriptors.first else { throw Failure(description: "Cannot read font " + path) }
    return CTFontCreateWithFontDescriptor(first, CGFloat(spec.caption?.size ?? 64), nil)
  }
  let font = try loadFont(spec.font)
  let noteFont = try loadFont(spec.noteFont)
  let captions: [(Caption, CGImage)] = try (spec.captions ?? []).map { caption in
    guard let style = spec.caption else { throw Failure(description: "Captions need a caption style") }
    let face = font ?? CTFontCreateUIFontForLanguage(.system, CGFloat(style.size), nil)!
    return (caption, captionImage(caption, style: style, font: face, noteFont: noteFont, width: width))
  }

  // Everything that never moves (background, frame shadow, bezel) is drawn once.
  let backdrop = canvas(width, height)
  // The device frame is drawn with every frame, since a clip's framing moves it: `shift` moves it up or down and
  // `zoom` scales it about `focus`, a point of the screen given as fractions of its width and height that stays put.
  struct Framing { var shift = 0.0, zoom = 1.0, fx = 0.5, fy = 0.5 }
  func framing(_ clip: Clip) -> Framing {
    Framing(shift: clip.shift ?? 0, zoom: clip.zoom ?? 1, fx: clip.focus?.first ?? 0.5, fy: clip.focus?.last ?? 0.5)
  }
  func screenRect(_ f: Framing) -> CGRect {
    guard let screen = spec.screen else { return CGRect(x: 0, y: 0, width: width, height: height) }
    let w = screen.width * f.zoom, h = screen.height * f.zoom
    let x = screen.x + f.fx * screen.width * (1 - f.zoom)
    let top = screen.y + f.shift + f.fy * screen.height * (1 - f.zoom)
    // Spec coordinates run from the top; Core Graphics runs from the bottom.
    return CGRect(x: x, y: Double(height) - top - h, width: w, height: h)
  }
  func drawDevice(_ context: CGContext, _ rect: CGRect) {
    guard let screen = spec.screen else { return }
    let bezel = CGFloat(screen.bezel ?? 0)
    context.saveGState()
    context.setShadow(offset: CGSize(width: 0, height: -22), blur: 60, color: CGColor(gray: 0, alpha: CGFloat(screen.shadow ?? 0.22)))
    context.setFillColor(color(screen.bezelColor ?? "#000000"))
    let scale = rect.width / CGFloat(screen.width)
    context.addPath(roundedRect(rect.insetBy(dx: -bezel * scale, dy: -bezel * scale), (CGFloat(screen.radius) + bezel) * scale))
    context.fillPath()
    context.restoreGState()
    context.addPath(roundedRect(rect, CGFloat(screen.radius) * scale))
    context.clip()
  }
  // A clip's framing eases in from the previous clip's over its `move` seconds (default the spec's, 0.6), like a
  // camera following the action; a short move is a punch-in.
  func framing(clip index: Int, local: Double) -> Framing {
    let target = framing(spec.clips[index])
    guard index > 0 else { return target }
    let previous = framing(spec.clips[index - 1])
    let p = min(max(local / (spec.clips[index].move ?? spec.move ?? 0.6), 0), 1)
    let k = p < 0.5 ? 4 * p * p * p : 1 - pow(-2 * p + 2, 3) / 2
    func mix(_ a: Double, _ b: Double) -> Double { a + (b - a) * k }
    return Framing(shift: mix(previous.shift, target.shift), zoom: mix(previous.zoom, target.zoom),
                   fx: mix(previous.fx, target.fx), fy: mix(previous.fy, target.fy))
  }
  // Fades blend the background over the top and bottom of the picture, so a device can pass under the captions and
  // YouTube's controls without showing an edge. Each is [y where the fade starts, y where it is solid], from the top.
  let background = color(spec.background ?? "#000000")
  let fade = CGGradient(colorsSpace: sRGB, colors: [background.copy(alpha: 0)!, background] as CFArray, locations: [0, 1])!
  func drawFades(_ context: CGContext) {
    for band in [spec.fade?.top, spec.fade?.bottom].compactMap({ $0 }) where band.count == 2 {
      let start = CGPoint(x: 0, y: Double(height) - band[0]), end = CGPoint(x: 0, y: Double(height) - band[1])
      context.drawLinearGradient(fade, start: start, end: end, options: [.drawsAfterEndLocation])
    }
  }
  backdrop.setFillColor(background)
  backdrop.fill(CGRect(x: 0, y: 0, width: width, height: height))
  let backdropImage = backdrop.makeImage()!

  let outputURL = resolve(spec.output)
  try? FileManager.default.removeItem(at: outputURL)
  let writer = try AVAssetWriter(outputURL: outputURL, fileType: outputURL.pathExtension == "mp4" ? .mp4 : .mov)
  let video = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
    AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: spec.bitrate ?? 10_000_000,
                                      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                      AVVideoExpectedSourceFrameRateKey: fps, AVVideoMaxKeyFrameIntervalKey: fps],
  ])
  video.expectsMediaDataInRealTime = false
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
  ])
  // Apple lists stereo AAC for previews; a silent track keeps every upload path happy and costs a few kilobytes.
  let sampleRate = 48_000
  let audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [
    AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: sampleRate, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 256_000,
  ])
  audio.expectsMediaDataInRealTime = false
  writer.add(video)
  writer.add(audio)
  guard writer.startWriting() else { throw Failure(description: "Cannot write " + outputURL.path + ": " + String(describing: writer.error)) }
  writer.startSession(atSourceTime: .zero)

  var pcm = AudioStreamBasicDescription(mSampleRate: Float64(sampleRate), mFormatID: kAudioFormatLinearPCM,
    mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked, mBytesPerPacket: 4, mFramesPerPacket: 1,
    mBytesPerFrame: 4, mChannelsPerFrame: 2, mBitsPerChannel: 16, mReserved: 0)
  var audioFormat: CMAudioFormatDescription?
  CMAudioFormatDescriptionCreate(allocator: nil, asbd: &pcm, layoutSize: 0, layout: nil, magicCookieSize: 0, magicCookie: nil, extensions: nil, formatDescriptionOut: &audioFormat)
  // The writer interleaves its inputs, so silence runs up to a second ahead of the video and is only appended while
  // the audio input will take it; waiting on one input while starving the other deadlocks the writer.
  var audioWritten = 0
  var audioFinished = false
  let audioEnd = Int(total * Double(sampleRate))
  func silence(until seconds: Double) {
    let target = min(audioEnd, Int(seconds * Double(sampleRate)))
    while audioWritten < target && audio.isReadyForMoreMediaData {
      let count = min(target - audioWritten, sampleRate / 10)
      var block: CMBlockBuffer?
      CMBlockBufferCreateWithMemoryBlock(allocator: nil, memoryBlock: nil, blockLength: count * 4, blockAllocator: nil, customBlockSource: nil,
                                         offsetToData: 0, dataLength: count * 4, flags: kCMBlockBufferAssureMemoryNowFlag, blockBufferOut: &block)
      CMBlockBufferFillDataBytes(with: 0, blockBuffer: block!, offsetIntoDestination: 0, dataLength: count * 4)
      var sample: CMSampleBuffer?
      CMAudioSampleBufferCreateReadyWithPacketDescriptions(allocator: nil, dataBuffer: block!, formatDescription: audioFormat!, sampleCount: count,
        presentationTimeStamp: CMTime(value: CMTimeValue(audioWritten), timescale: CMTimeScale(sampleRate)), packetDescriptions: nil, sampleBufferOut: &sample)
      audio.append(sample!)
      audioWritten += count
    }
    // Once the silence is complete the writer must not wait for more of it before taking the last frames.
    if audioWritten == audioEnd && !audioFinished {
      audio.markAsFinished()
      audioFinished = true
    }
  }

  // settle waits a moment for an input to take more data, and stops instead of waiting forever when the writer failed.
  func settle(_ waited: inout Int) throws {
    if writer.status == .failed { throw Failure(description: "Writing failed: " + String(describing: writer.error)) }
    waited += 1
    if waited > 20_000 { throw Failure(description: "The writer stopped taking data at \(audioWritten) audio samples") }
    usleep(1000)
  }

  let frames = Int((total * Double(fps)).rounded())
  var clipIndex = -1
  var source: FrameSource?
  var outgoing: CGImage?
  var latest: CGImage?
  for index in 0..<frames {
    let t = Double(index) / Double(fps)
    let wanted = max(0, (starts.lastIndex { $0 <= t + 0.000001 }) ?? 0)
    if wanted != clipIndex {
      outgoing = latest
      clipIndex = wanted
      let clip = spec.clips[clipIndex]
      source = try await FrameSource(url: resolve(clip.file), from: clip.from, to: clip.to)
    }
    let clip = spec.clips[clipIndex]
    let local = t - starts[clipIndex]
    guard let frame = source!.frame(at: clip.from + local * (clip.speed ?? 1)) else { throw Failure(description: "No frame in " + clip.file + " at \(clip.from)") }
    latest = frame

    var pixelBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pixelBuffer)
    let buffer = pixelBuffer!
    CVPixelBufferLockBaseAddress(buffer, [])
    let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8,
                            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: sRGB, bitmapInfo: bitmapInfo)!
    context.interpolationQuality = .high
    context.draw(backdropImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    let rect = screenRect(framing(clip: clipIndex, local: local))
    context.saveGState()
    drawDevice(context, rect)
    context.draw(frame, in: aspectFill(frame, in: rect))
    // A cut dissolves from the previous clip's last frame over the first `crossfade` seconds of the next.
    if let previous = outgoing, crossfade > 0, local < crossfade {
      context.setAlpha(CGFloat(1 - ease(local / crossfade)))
      context.draw(previous, in: aspectFill(previous, in: rect))
      context.setAlpha(1)
    }
    context.restoreGState()
    drawFades(context)
    // Captions rise 12 px as they fade in (0.35 s) and fade out over the last 0.25 s. A `pop` caption instead
    // springs up from 60% size about its centre in 0.25 s, overshooting a little.
    for (caption, image) in captions where t >= caption.from && t < caption.to {
      let leave = min(1, max(0, (caption.to - t) / 0.25))
      var frame = CGRect(x: 0, y: Double(height - image.height), width: Double(image.width), height: Double(image.height))
      if caption.pop == true {
        let p = min(1, (t - caption.from) / 0.25), c = 1.70158
        let scale = 0.6 + 0.4 * (1 + (c + 1) * pow(p - 1, 3) + c * pow(p - 1, 2))
        let centre = CGPoint(x: (spec.caption?.centerX ?? Double(width) / 2), y: frame.midY)
        frame = CGRect(x: centre.x - (centre.x - frame.minX) * scale, y: centre.y - frame.height / 2 * scale,
                       width: frame.width * scale, height: frame.height * scale)
        context.setAlpha(CGFloat(min(1, p * 3) * leave))
      } else {
        let appear = ease((t - caption.from) / 0.35)
        context.setAlpha(CGFloat(appear * leave))
        frame.origin.y -= (1 - appear) * 12
      }
      context.draw(image, in: frame)
      context.setAlpha(1)
    }
    CVPixelBufferUnlockBaseAddress(buffer, [])
    var waited = 0
    while !video.isReadyForMoreMediaData {
      silence(until: t + 1)
      try settle(&waited)
    }
    adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: CMTimeScale(fps)))
    silence(until: t + 1)
  }
  video.markAsFinished()
  var waited = 0
  while !audioFinished {
    silence(until: total)
    if !audioFinished { try settle(&waited) }
  }
  await writer.finishWriting()
  if writer.status != .completed { throw Failure(description: "Writing failed: " + String(describing: writer.error)) }
  print("wrote \(outputURL.path): \(frames) frames, \(String(format: "%.2f", total)) s at \(fps) fps, \(width)x\(height)")
}

// MARK: Check

func fourCC(_ code: FourCharCode) -> String {
  String(bytes: [24, 16, 8, 0].map { UInt8((code >> $0) & 255) }, encoding: .ascii) ?? String(code)
}

func check(_ path: String, type: String?) async throws {
  let url = URL(fileURLWithPath: path)
  let asset = AVURLAsset(url: url)
  var problems: [String] = []
  var facts: [String: Any] = [:]
  let bytes = (try FileManager.default.attributesOfItem(atPath: path)[.size] as? Int) ?? 0
  facts["bytes"] = bytes
  if bytes > maxBytes { problems.append("larger than 500 MB") }
  if !["mov", "m4v", "mp4"].contains(url.pathExtension.lowercased()) { problems.append("container must be .mov, .m4v or .mp4") }
  let duration = try await asset.load(.duration).seconds
  facts["seconds"] = (duration * 100).rounded() / 100
  if !durationRange.contains(duration) { problems.append(String(format: "runs %.2f s; previews run 15 to 30 s", duration)) }
  guard let video = try await asset.loadTracks(withMediaType: .video).first else { throw Failure(description: "no video track") }
  let size = try await video.load(.naturalSize)
  let rate = Double(try await video.load(.nominalFrameRate))
  let minFrame = try await video.load(.minFrameDuration).seconds
  facts["size"] = [Int(size.width), Int(size.height)]
  facts["fps"] = (rate * 100).rounded() / 100
  if rate > maxFrameRate + 0.01 || (minFrame > 0 && 1 / minFrame > maxFrameRate + 0.5) { problems.append("frame rate above 30 fps") }
  if let format = try await video.load(.formatDescriptions).first {
    let codec = fourCC(CMFormatDescriptionGetMediaSubType(format))
    facts["codec"] = codec
    if !["avc1", "apch", "hvc1"].contains(codec) { problems.append("video codec " + codec + " is not H.264 or ProRes 422 HQ") }
    if codec == "hvc1" { problems.append("HEVC is not listed for previews; use H.264 or ProRes 422 HQ") }
  }
  facts["megabitsPerSecond"] = ((Double(try await video.load(.estimatedDataRate)) / 1_000_000) * 10).rounded() / 10
  if let type {
    if let sizes = previewSizes[type] {
      if !sizes.contains([Int(size.width), Int(size.height)]) { problems.append("\(Int(size.width))x\(Int(size.height)) is not accepted for \(type) (\(sizes.map { "\($0[0])x\($0[1])" }.joined(separator: ", ")))") }
    } else {
      problems.append("no size table for \(type); check Apple's current specification")
    }
  }
  if let audio = try await asset.loadTracks(withMediaType: .audio).first, let format = try await audio.load(.formatDescriptions).first,
     let description = CMAudioFormatDescriptionGetStreamBasicDescription(format)?.pointee {
    facts["audio"] = ["format": fourCC(description.mFormatID), "channels": Int(description.mChannelsPerFrame), "hz": Int(description.mSampleRate)]
    if description.mFormatID != kAudioFormatMPEG4AAC { problems.append("audio is not AAC") }
    if description.mChannelsPerFrame != 2 { problems.append("audio is not stereo") }
    if ![44_100, 48_000].contains(Int(description.mSampleRate)) { problems.append("audio sample rate is not 44.1 or 48 kHz") }
  } else {
    problems.append("no audio track; add a stereo AAC track (silent is fine)")
  }
  if try await framed(asset) {
    problems.append("the border is one flat colour in every frame: a device frame or background band. App Review rejects App Store previews that are not full-screen captures of the app (Guideline 2.3.4); render without \"screen\"")
  }
  facts["problems"] = problems
  let json = try JSONSerialization.data(withJSONObject: facts, options: [.sortedKeys])
  print(String(data: json, encoding: .utf8)!)
  if !problems.isEmpty { exit(2) }
}

// framed says whether every sampled frame has the same flat colour all round its edge, which a full-screen capture
// never does (its status bar and content reach the edges) and a device frame on a background always does.
func framed(_ asset: AVURLAsset) async throws -> Bool {
  let duration = try await asset.load(.duration).seconds
  let generator = AVAssetImageGenerator(asset: asset)
  generator.maximumSize = CGSize(width: 120, height: 260)
  var reference: [UInt8]? = nil
  for index in 0..<6 {
    let image = try await generator.image(at: CMTime(seconds: duration * (Double(index) + 0.5) / 6, preferredTimescale: 600)).image
    let width = image.width, height = image.height
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let context = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: sRGB,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    var ring: [(Int, Int)] = []
    for x in 0..<width { ring.append((x, 1)); ring.append((x, height - 2)) }
    for y in 0..<height { ring.append((1, y)); ring.append((width - 2, y)) }
    for (x, y) in ring {
      let at = (y * width + x) * 4
      let pixel = Array(pixels[at..<at + 3])
      guard let base = reference else { reference = pixel; continue }
      if zip(pixel, base).contains(where: { abs(Int($0) - Int($1)) > 12 }) { return false }
    }
  }
  return true
}

// MARK: Contact sheet

func sheet(_ path: String, out: String, count: Int, from: Double?, to: Double?) async throws {
  let asset = AVURLAsset(url: URL(fileURLWithPath: path))
  let duration = try await asset.load(.duration).seconds
  let start = from ?? 0, end = min(to ?? duration, duration)
  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  generator.maximumSize = CGSize(width: 300, height: 650)
  var images: [(Double, CGImage)] = []
  for index in 0..<count {
    let t = start + (end - start) * Double(index) / Double(max(count - 1, 1))
    let image = try await generator.image(at: CMTime(seconds: min(t, end - 0.01), preferredTimescale: 600)).image
    images.append((t, image))
  }
  let columns = min(6, count), rows = (count + columns - 1) / columns
  let cell = CGSize(width: CGFloat(images[0].1.width), height: CGFloat(images[0].1.height) + 30)
  let context = canvas(Int(cell.width) * columns, Int(cell.height) * rows)
  context.setFillColor(CGColor(gray: 1, alpha: 1))
  context.fill(CGRect(x: 0, y: 0, width: context.width, height: context.height))
  let label = CTFontCreateUIFontForLanguage(.system, 20, nil)!
  for (index, (t, image)) in images.enumerated() {
    let x = CGFloat(index % columns) * cell.width
    let y = CGFloat(rows - 1 - index / columns) * cell.height
    context.draw(image, in: CGRect(x: x, y: y + 30, width: CGFloat(image.width), height: CGFloat(image.height)))
    let text = NSAttributedString(string: String(format: "%.2f s", t), attributes: [kCTFontAttributeName as NSAttributedString.Key: label])
    context.textPosition = CGPoint(x: x + 8, y: y + 8)
    CTLineDraw(CTLineCreateWithAttributedString(text), context)
  }
  let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(destination, context.makeImage()!, nil)
  CGImageDestinationFinalize(destination)
  print("wrote \(out): \(count) frames from \(String(format: "%.2f", start)) to \(String(format: "%.2f", end)) s")
}

// frame saves one full-size frame, so the poster frame and caption sharpness can be judged at real size.
func frame(_ path: String, at seconds: Double, out: String) async throws {
  let generator = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: path)))
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  let image = try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image
  let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(destination, image, nil)
  CGImageDestinationFinalize(destination)
  print("wrote \(out): \(image.width)x\(image.height) at \(seconds) s")
}

// MARK: Main

let arguments = CommandLine.arguments
do {
  switch arguments.count > 1 ? arguments[1] : "" {
  case "render" where arguments.count > 2: try await render(arguments[2])
  case "check" where arguments.count > 2: try await check(arguments[2], type: arguments.count > 3 ? arguments[3] : nil)
  case "frame" where arguments.count > 4: try await frame(arguments[2], at: Double(arguments[3]) ?? 0, out: arguments[4])
  case "sheet" where arguments.count > 3:
    try await sheet(arguments[2], out: arguments[3], count: arguments.count > 4 ? Int(arguments[4]) ?? 12 : 12,
                    from: arguments.count > 5 ? Double(arguments[5]) : nil, to: arguments.count > 6 ? Double(arguments[6]) : nil)
  default: fail("Usage: swift app-preview.swift render <spec.json> | check <preview> [previewType] | sheet <video> <out.png> [frames] [from] [to] | frame <video> <seconds> <out.png>")
  }
} catch {
  fail(String(describing: error))
}
