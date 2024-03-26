export default function getPlural(number_, one, many) {
	return Math.abs(number_) === 1 ? one : many;
}
