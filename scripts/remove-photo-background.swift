import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("\(message)\n".utf8))
    exit(1)
}

guard CommandLine.arguments.count == 3 else {
    fail("Usage: remove-photo-background.swift <input-image> <output.png>")
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let inputImage = CIImage(
    contentsOf: inputURL,
    options: [.applyOrientationProperty: true]
) else {
    fail("Unable to read \(inputURL.path)")
}

let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8

do {
    try VNImageRequestHandler(ciImage: inputImage).perform([request])
} catch {
    fail("Person segmentation failed: \(error.localizedDescription)")
}

guard let maskBuffer = request.results?.first?.pixelBuffer else {
    fail("Person segmentation returned no mask")
}

let rawMask = CIImage(cvPixelBuffer: maskBuffer)
let scaleX = inputImage.extent.width / rawMask.extent.width
let scaleY = inputImage.extent.height / rawMask.extent.height
let mask = rawMask.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))

let filter = CIFilter.blendWithMask()
filter.inputImage = inputImage
filter.backgroundImage = CIImage(color: .clear).cropped(to: inputImage.extent)
filter.maskImage = mask

guard
    let outputImage = filter.outputImage?.cropped(to: inputImage.extent),
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
    let rendered = CIContext().createCGImage(
        outputImage,
        from: outputImage.extent,
        format: .RGBA8,
        colorSpace: colorSpace
    ),
    let destination = CGImageDestinationCreateWithURL(
        outputURL as CFURL,
        UTType.png.identifier as CFString,
        1,
        nil
    )
else {
    fail("Unable to render the transparent PNG")
}

CGImageDestinationAddImage(destination, rendered, nil)
guard CGImageDestinationFinalize(destination) else {
    fail("Unable to write \(outputURL.path)")
}
