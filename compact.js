const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '../..');
const sourceDir = path.join(projectRoot, 'preBuild');
const outputZip = path.join(projectRoot, 'compiled.zip');

function moveAndOverwriteFile(src, destDir, dest) {

    console.info(src)
    console.info(destDir)
    console.info(dest)
    if (!src || !destDir || !dest) {
        console.error('Um ou mais caminhos não estão definidos.');
        return;
    }


    // Verificar se a pasta de destino existe
    if (!fs.existsSync(destDir)) {
        // Criar a pasta de destino se ela não existir
        fs.mkdirSync(destDir);
    }

    // Mover o arquivo e sobrescrever se necessário
    fs.rename(src, dest, (err) => {
        if (err) {
            // Se houver um erro, pode ser porque o arquivo já existe
            if (err.code === 'EXDEV') {
                // Para sistemas de arquivos diferentes, usar cópia e remoção
                fs.copyFile(src, dest, (copyErr) => {
                    if (copyErr) throw copyErr;
                    fs.unlink(src, (unlinkErr) => {
                        if (unlinkErr) throw unlinkErr;
                        console.log(`${src} foi movido e sobrescrito com sucesso para ${dest}`);
                    });
                });
            } else if (err.code === 'EEXIST') {
                // Se o arquivo já existir, sobrescrever
                fs.copyFile(src, dest, (copyErr) => {
                    if (copyErr) throw copyErr;
                    fs.unlink(src, (unlinkErr) => {
                        if (unlinkErr) throw unlinkErr;
                        console.log(`${src} foi movido e sobrescrito com sucesso para ${dest}`);
                    });
                });
            } else {
                // Outros erros
                throw err;
            }
        } else {
            console.log(`${src} foi movido com sucesso para ${dest}`);
        }
    });
}

async function runCompact() {

    const source = sourceDir;
    const out = outputZip;
    const zip = new AdmZip();

    const addDirectory = (dir, basePath) => {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                addDirectory(fullPath, path.join(basePath, item));
            } else {
                zip.addLocalFile(fullPath, basePath);
            }
        });
    };

    addDirectory(source, '');
    zip.writeZip(out);
    console.log(`Zipping completed successfully: ${out}`);
    
    const destinationDir = path.join(projectRoot, 'obj');
    const destinationPath = path.join(destinationDir, 'compiled.zip');

    moveAndOverwriteFile(outputZip, destinationDir, destinationPath);
    
}

module.exports = {runCompact};