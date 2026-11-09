const {spawn} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const children = [
  spawn(process.execPath, ['--watch', 'backend/src/app.js'], {cwd: root, stdio: 'inherit'}),
  spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'], {cwd: path.join(root, 'frontend'), stdio: 'inherit'})
];
const stop = () => children.forEach(child => child.kill());
process.on('SIGINT', stop); process.on('SIGTERM', stop);
children.forEach(child => {child.on('error', error => {console.error(error.message); stop(); process.exitCode = 1;}); child.on('exit', code => {if (code) {stop(); process.exitCode = code;}});});
