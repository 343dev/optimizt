import sharp from './sharp.js';

export async function parseImageMetadata(buffer) {
	try {
		// Fast access to (uncached) image metadata without decoding any compressed pixel data.
		// This is read from the header of the input image. It does not take into consideration any operations to be applied to the output image, such as resize or rotate.
		const metadata = await sharp(buffer).metadata();
		return metadata;
	} catch {
		return {};
	}
}
