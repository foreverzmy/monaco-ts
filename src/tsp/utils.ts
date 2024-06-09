import type Monaco from 'monaco-editor';
import type { FileRecord, LayeredObject } from '../types';

export const flattenFiles = (files: LayeredObject): FileRecord => {
	const result: FileRecord = {};

	const flatten = (obj: LayeredObject, path = ''): void => {
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const fullPath = path ? `${path}/${key}` : key;
				if (typeof obj[key] === 'string') {
					result[fullPath] = obj[key] as string;
				} else {
					flatten(obj[key] as LayeredObject, fullPath);
				}
			}
		}
	};

	flatten(files);
	return result;
};

export const formatCompilerOptions = (
	options: Monaco.languages.typescript.CompilerOptions,
): Monaco.languages.typescript.CompilerOptions => {
	return {
		...options,
		lib: options.lib?.map((lib) => lib.toLocaleLowerCase()),
		moduleResolution:
			options.moduleResolution?.toString()?.toLocaleLowerCase() === 'classic'
				? 1
				: 2,
	};
};
