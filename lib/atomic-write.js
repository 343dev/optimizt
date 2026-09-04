import fs from 'node:fs/promises';
import path from 'node:path';

import writeFileAtomic from 'write-file-atomic';

export async function atomicWrite(filePath, data) {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	let stat;
	try {
		stat = await fs.stat(filePath);
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}

	const options = {
		fsync: true,
		mode: stat?.mode,
		chown: stat ? { gid: stat.gid, uid: stat.uid } : undefined,
	};
	try {
		await writeFileAtomic(filePath, data, options);
	} catch (error) {
		if (!options.chown || !['EACCES', 'EPERM'].includes(error.code)) throw error;
		await writeFileAtomic(filePath, data, { fsync: true, mode: options.mode });
	}
}
