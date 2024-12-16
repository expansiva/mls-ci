import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// Função para percorrer recursivamente diretórios e coletar arquivos
async function getAllFiles(dirPath:string, arrayOfFiles:string[] = []) {
    const files = await fs.promises.readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isDirectory() && !['node_modules', 'prel2', 'preBuild', '.git', '.github', 'build', 'dist', 'mls-ci'].includes(file)) {

            await getAllFiles(filePath, arrayOfFiles);
        } else if (stat.isFile() && (filePath.indexOf("\\l") >= 0 || filePath.indexOf("/l") >= 0)) {
            console.log(`file: ${filePath} `);
            arrayOfFiles.push(filePath);
        } else if (stat.isFile() && ['package.json', 'README.md', 'readme.md', 'tsconfig.json'].includes(file)){
            const f = path.join(dirPath, 'l0\\' + file);
            console.log(`file: ${f} `);
            arrayOfFiles.push(f);
        }
    }

    return arrayOfFiles;
}

// Função para obter a versão do arquivo usando 'git log -1'
function getFileVersion() {
    return new Promise((resolve, reject) => {
        exec(`git log -1 --pretty=format:"%H"`, (err, stdout, stderr) => {
            if (err) {
                reject(`Error getting version for file ${filePath}: ${stderr}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

function getFilesOID(commit) {
    return new Promise((resolve, reject) => {
        const command = `git ls-tree --full-name -r ${commit}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error executing command: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Command error: ${stderr}`);
                return;
            }
            const lines = stdout.trim().split('\n');
            
            const ret = [];
            lines.forEach((l)=>{

                const parts = l.split(" ");
                const info = parts[2] ? parts[2].split(/\t/) : 'not found';

                ret.push({
                    file: info[1] ? info[1] : 'not found',
                    version: info[0] ? info[0] : 'not found'
                })

            });
            resolve(ret); 
        });
    });
}

function getDateCommit(filePath) {
    return new Promise((resolve, reject) => {
        exec(`git log -1 --format="%aI" -- ${filePath}`, (err, stdout, stderr) => {
            if (err) {
                reject(`Error getting version for file ${filePath}: ${stderr}`);
                return;
            }
           console.log(`filePath:${filePath} stdout:${stdout}`);
            resolve(stdout.trim());
        });
    });
} 

function configDateLastModifyFiles(files) {

    const objVerify = [];

    files.forEach((item) => {

        if (!item.ShortPath.startsWith('l2') || item.ShortPath.indexOf('.html') >= 0) return;
        const parts = item.ShortPath.split(/\\|\//); 
        const namewithext = parts[parts.length - 1]; 
        const name = namewithext.split('.')[0];
        const ists = namewithext.indexOf('.ts') >= 0;
        const conter = `${name}.${ists ? 'less' : 'ts'}`;

        if(objVerify.includes(name)) return;

        const f = files.find((iff) => iff.ShortPath.indexOf(conter) >=0);
        if(!f) return;
        const data1 = new Date(item.jsUpdated_at);
        const data2 = new Date(f.jsUpdated_at);

        if(data1 > data2) f.jsUpdated_at = item.jsUpdated_at
        else if (data1 < data2) item.jsUpdated_at = f.jsUpdated_at;

        objVerify.push(name);

    });

    return files;

}

async function runCreateFileInfo() {

    try {

        const projectRoot = path.join(__dirname, '../..'); // Ajuste conforme necessário
        const allFiles = await getAllFiles(projectRoot);
        
        const versionCompile = await getFileVersion();
        const files = await getFilesOID(versionCompile);
       
        let fileInfos = [];

        for await (file of allFiles) {

            const relativePath = path.relative(projectRoot, file);
            const stat = await fs.promises.stat(file.replace('l0/', ''));
           
            const f = files.find((i) => {
                return i.file === relativePath.replace('l0/', '').replace(/\\/g, '/')
            });
            let versionRef =  f ? f.version : 'notfound';
            let update_at = await getDateCommit(relativePath.replace('l0/', ''));
            update_at = new Date(update_at).toISOString();

            fileInfos.push(
                {
                    ShortPath: relativePath,
                    versionRef,
                    Length: stat.size,
                    update_at
                }
            )

        }
        
        const lastModify = new Date();

        //fileInfos = configDateLastModifyFiles(fileInfos);

        const js = {
            lastModified: lastModify.toISOString(),
            files: fileInfos
        }

        // Escrever as informações no arquivo fileinfos.json
        const outputPath = path.join(projectRoot, 'preBuild/fileinfos.json');
        await fs.promises.writeFile(outputPath, JSON.stringify(js, null, 2));

        console.log(`File information has been written to ${outputPath}`);

        return lastModify.toISOString();

    } catch (error) {

        console.error(error);

    }
} 
