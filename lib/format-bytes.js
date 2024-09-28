const SIZES = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
const DECIMALS = 3;
const K = 1024;
const LOG_K = Math.log(K);

export function formatBytes(bytes) {
	if (bytes === 0) {
		return '0 Bytes';
	}

	const index = Math.floor(Math.log(bytes) / LOG_K);
	const value = Number.parseFloat((bytes / (K ** index)).toFixed(DECIMALS)); // Use parseFloat to show "1 KB" instead of "1.000 KB"

	return `${value} ${SIZES[index]}`;
}
