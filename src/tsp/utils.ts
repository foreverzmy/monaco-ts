import type Monaco from 'monaco-editor';
import type { FileRecord, LayeredObject } from '../types';

export function dirname(path: string): string {
	// 替换反斜杠为斜杠，统一处理路径分隔符
	path = path.replace(/\\/g, '/');

	// 找到最后一个斜杠的位置
	const lastSlashIndex = path.lastIndexOf('/');

	// 如果找不到斜杠，说明没有目录，返回当前路径
	if (lastSlashIndex === -1) {
		return '.';
	}

	// 如果路径中只有一个斜杠，并且在第一个位置，返回斜杠
	if (lastSlashIndex === 0) {
		return '/';
	}

	// 否则返回最后一个斜杠之前的部分
	return path.substring(0, lastSlashIndex);
}

export function join(...paths: string[]): string {
	// 将所有路径用斜杠分隔符连接
	const joinedPath = paths.join('/').replace(/\\/g, '/');

	// 规范化路径
	const parts = joinedPath.split('/').reduce((acc, part) => {
		if (part === '' && acc.length > 0) return acc;
		if (part === '.' || part === '') return acc;
		if (part === '..') {
			if (acc.length > 0 && acc[acc.length - 1] !== '..') {
				acc.pop();
			} else {
				acc.push(part);
			}
		} else {
			acc.push(part);
		}
		return acc;
	}, [] as string[]);

	// 如果路径是绝对路径，确保结果也为绝对路径
	const result = parts.join('/');
	return joinedPath.startsWith('/') ? `/${result}` : result;
}

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

export const formatCompilerOptions = (options: Monaco.languages.typescript.CompilerOptions): Monaco.languages.typescript.CompilerOptions => { 
	return {
		...options,
		lib: options.lib?.map(lib => lib.toLocaleLowerCase()),
	}
}