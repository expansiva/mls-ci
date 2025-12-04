const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

async function getProjectName() {
    try {
        // Caminho para o arquivo package.json
        const packageJsonPath = './package.json'//path.resolve(__dirname, 'package.json');

        // Lê o conteúdo do arquivo package.json
        const data = await fsp.readFile(packageJsonPath, 'utf8');

        // Analisa o conteúdo JSON do package.json
        const packageJson = JSON.parse(data);

        // Retorna o nome do projeto
        return packageJson.name;
    } catch (error) {
        console.error('Erro ao ler o arquivo package.json:', error);
        throw error; // Lança o erro para ser tratado por quem chamou a função
    }
}

async function deleteAllFilesInDirectory(directoryPath) {
    try {
        const files = await fs.promises.readdir(directoryPath);

        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile()) {
                await fs.promises.unlink(filePath);
            } else if (stat.isDirectory()) {
                // Recursively delete files in subdirectories (optional)
                await deleteAllFilesInDirectory(filePath);
            }
        }

        console.log(`All files in directory ${directoryPath} have been deleted.`);
    } catch (err) {
        console.error(`Error deleting files in directory ${directoryPath}:`, err);
    }
}

async function runPreCompile() {

    try {

        let prefix = await getProjectName();
        prefix = `_${prefix}_`;
        console.log('Get prj name:', prefix);

        const projectRoot = path.resolve(__dirname, '../..');
        const srcDir = path.join(projectRoot, 'l2');
        const destDir = path.join(projectRoot, 'project'+'/'+prefix+'/l2');

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        await deleteAllFilesInDirectory(destDir);
        await copyTsFilesRecursively(srcDir, destDir, 'l2');

        /*const projectRoot = path.resolve(__dirname, '../..');
        const srcDir = path.join(projectRoot, 'l2');
        const destDir = path.join(projectRoot, 'prel2');

        let prefix = await getProjectName();
        prefix = `_${prefix}_`;
        console.log('Get prj name');

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        await deleteAllFilesInDirectory(destDir);
        await copyTsFilesRecursively(srcDir, destDir, prefix);*/

    } catch (error) {
        throw new Error('Erro runPreCompile:' + error.message)
    }
}

async function copyTsFilesRecursively(srcDir, destDir, prefix) {
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            await fs.promises.mkdir(destPath, { recursive: true });
            await copyTsFilesRecursively(srcPath, destPath, prefix);
        } else if (entry.name.endsWith('.ts')) {
            //const renamedDest = path.join(destDir, prefix + entry.name);
            const renamedDest = path.join(destDir, entry.name);
            await fs.promises.copyFile(srcPath, renamedDest);
            console.log(`Copied: ${srcPath} -> ${renamedDest}`);
        }
    }
}


module.exports = {runPreCompile};

