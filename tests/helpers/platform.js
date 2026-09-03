// Platform conditions used to skip tests whose semantics a platform cannot offer.
export const isWindows = process.platform === 'win32';
export const isPrivileged = process.getuid?.() === 0;
