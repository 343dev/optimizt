module.exports = {
	optimize: {
		jpeg: {
			// https://sharp.pixelplumbing.com/api-output#jpeg
			lossy: {
				quality: 80, // quality, integer 1-100
				progressive: true, // use progressive (interlace) scan
				chromaSubsampling: '4:2:0', // set to '4:4:4' to prevent chroma subsampling otherwise defaults to '4:2:0' chroma subsampling
				optimizeCoding: true, // optimise Huffman coding tables
				mozjpeg: false, // use mozjpeg defaults, equivalent to { trellisQuantisation: true, overshootDeringing: true, optimiseScans: true, quantisationTable: 3 }
				trellisQuantisation: false, // apply trellis quantisation
				overshootDeringing: false, // apply overshoot deringing
				optimizeScans: false, // optimise progressive scans, forces progressive
				quantizationTable: 0, // quantization table to use, integer 0-8
			},
			// https://github.com/google/guetzli
			lossless: {
				quality: 90, // visual quality to aim for, expressed as a JPEG quality value; should be >= 84, otherwise the output will have noticeable artifacts
				memlimit: 6000, // memory limit in MB; guetzli will fail if unable to stay under the limit
				nomemlimit: false, // do not limit memory usage
			},
		},

		// https://sharp.pixelplumbing.com/api-output#png
		png: {
			lossy: {
				progressive: false, // use progressive (interlace) scan
				compressionLevel: 9, // zlib compression level, 0 (fastest, largest) to 9 (slowest, smallest)
				adaptiveFiltering: false, // use adaptive row filtering
				palette: true, // quantise to a palette-based image with alpha transparency support
				quality: 100, // use the lowest number of colours needed to achieve given quality, sets palette to true
				effort: 7, // CPU effort, between 1 (fastest) and 10 (slowest), sets palette to true
				colors: 256, // maximum number of palette entries, sets palette to true
				dither: 1.0, // level of Floyd-Steinberg error diffusion, sets palette to true
			},
			lossless: {
				progressive: false,
				compressionLevel: 9,
				adaptiveFiltering: true,
				palette: false,
				quality: 100,
				effort: 10,
				colors: 256,
				dither: 1.0,
			},
		},

		// http://www.lcdf.org/gifsicle/man.html
		gif: {
			lossy: {
				optimize: 3, // attempt to shrink the file sizes of GIF animations; higher levels take longer, but may have better results; there are currently three levels
				careful: false, // write larger GIFs that avoid bugs in other programs
				colors: 256, // reduce the number of distinct colors to num or less; must be between 2 and 256
				lossy: 100, // alter image colors to shrink output file size at the cost of artifacts and noise
			},
			lossless: {
				optimize: 0,
				careful: true,
				colors: 256,
				lossy: 0,
			},
		},

		// https://github.com/svg/svgo#configuration
		svg: {
			multipass: true,
			js2svg: {
				pretty: true,
				indent: 2,
			},
			plugins: [
				{
					name: 'preset-default',
					params: {
						overrides: {
							removeViewBox: false,
						},
					},
				},
				'cleanupListOfValues',
				'convertStyleToAttrs',
				'reusePaths',
			],
		},
	},

	convert: {
		// https://sharp.pixelplumbing.com/api-output#avif
		avif: {
			lossy: {
				quality: 64, // quality, integer 1-100
				lossless: false, // use lossless compression
				effort: 4, // CPU effort, between 0 (fastest) and 9 (slowest)
				chromaSubsampling: '4:4:4', // set to '4:2:0' to use chroma subsampling
			},
			lossless: {
				quality: 100,
				lossless: true,
				effort: 9,
				chromaSubsampling: '4:4:4',
			},
		},

		// https://sharp.pixelplumbing.com/api-output#webp
		webp: {
			lossy: {
				quality: 82, // quality, integer 1-100
				alphaQuality: 82, // quality of alpha layer, integer 0-100
				lossless: false, // use lossless compression mode
				nearLossless: false, // use near_lossless compression mode
				smartSubsample: false, // use high quality chroma subsampling
				preset: 'default', // named preset for preprocessing/filtering, one of: default, photo, picture, drawing, icon, text
				effort: 4, // CPU effort, between 0 (fastest) and 6 (slowest)
				minSize: true, // prevent use of animation key frames to minimise file size (slow)
				mixed: false, // allow mixture of lossy and lossless animation frames (slow)
			},
			lossless: {
				quality: 100,
				alphaQuality: 100,
				lossless: true,
				nearLossless: false,
				smartSubsample: false,
				preset: 'default',
				effort: 6,
				minSize: false,
				mixed: false,
			},
		},
	},
};
