import { fileManager } from './index';

setTimeout(async () => {
  const projects = await fileManager.getProjects();
  console.log('projects', projects);

  await fileManager.deleteProject('test');
  await fileManager.deleteProject('test2');

  await fileManager.newProject('test', [{
    filepath: '/a.json',
    content: JSON.stringify({ a: 123 })
  }]);

  await fileManager.newProject('test2', [{
    filepath: '/a.json',
    content: JSON.stringify({ a: 123 })
  }]);

  await fileManager.newOrUpdateFile({
    project: 'test',
    filepath: '/b.json',
    content: JSON.stringify({ b: '123' })
  });

  await fileManager.newOrUpdateFile({
    project: 'test2',
    filepath: '/a.json',
    content: JSON.stringify({ a: 456 })
  });

  const testFiles = await fileManager.geProjectFiles('test');
  console.log('test files', testFiles);

  const test2Files = await fileManager.geProjectFiles('test2');
  console.log('test2 files', test2Files);

  await fileManager.deleteFile('test', '/b.json');

  const files2 = await fileManager.geProjectFiles('test');
  console.log('files2', files2);


  const test2Files2 = await fileManager.geProjectFiles('test2');
  console.log('test2 files2', test2Files2);
}, 100);
