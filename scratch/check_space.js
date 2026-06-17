const fs = require('fs');
const path = require('path');

function getFolderSize(dirPath) {
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        totalSize += getFolderSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (e) {
    // 에러 발생 시 무시 (권한 등)
  }
  return totalSize;
}

const targetDir = path.resolve(__dirname, '..');
console.log(`Analyzing directory: ${targetDir}\n`);

const children = fs.readdirSync(targetDir);
const folderSizes = [];

for (const child of children) {
  const childPath = path.join(targetDir, child);
  const stats = fs.statSync(childPath);
  if (stats.isDirectory()) {
    const sizeBytes = getFolderSize(childPath);
    folderSizes.push({
      name: child,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
    });
  } else {
    folderSizes.push({
      name: child,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(6),
    });
  }
}

// 용량 순으로 정렬
folderSizes.sort((a, b) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB));

console.log('--- Folder/File Size Breakdown ---');
folderSizes.forEach(item => {
  console.log(`${item.name.padEnd(25)}: ${item.sizeMB} MB`);
});
