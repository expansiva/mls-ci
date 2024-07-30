const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;;

async function runCompactSource() {

    // Caminho do root do projeto
    const rootDir = process.cwd();
    const out = path.join(rootDir, 'obj/source.zip');
    const folders = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];

    const zip = new AdmZip();

    if (fs.existsSync(out)) {
        await fsp.unlink(out);
        console.log('File source.zip deleted.');
    }

    for await (let folder of folders) {

        const folderPath = path.join(process.cwd(), folder);
        if (fs.existsSync(folderPath)) {
            zip.addLocalFolder(folderPath, folder);
        } else {
            console.error(`Folder ${folderPath} not exist.`);
        }

    }

    zip.writeZip(out);
    console.log(`Zipping source.zip completed successfully: ${out}`);

}

module.exports = { runCompactSource };