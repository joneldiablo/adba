const pkg = require('./package.json');
const fs = require('fs');

let vArr = pkg.version.split('.');
const tmp = vArr.pop().split('-');
const sufix = tmp.pop();
let v = parseInt(tmp[0]);
vArr.push(++v);
pkg.version = [vArr.join('.'), sufix].join('-');
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
console.log(pkg.version);
