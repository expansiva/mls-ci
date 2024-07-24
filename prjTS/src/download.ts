import fs from 'fs';
import fetch from 'node-fetch';

async function downloadFile(url:string, path:string):Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const fileStream = fs.createWriteStream(path);
    return await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on('error', err => {
            reject(err);
        });
        fileStream.on('finish', function() {
            resolve('');
        });
        fileStream.on('error', function(err) {
            reject(err);
        });
    });

}

async function fetchJson(url:string) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao baixar o arquivo JSON:', error);
    }
}

export async function runDownload(){
    try {

        const json = await fetchJson('https://s3.amazonaws.com/www.collab.codes/latest.json');
        console.log('Get version files');

        const urlMonaco = `https://collab.codes/monaco/${json.monaco}/monaco.d.ts`;
        const urlMls = `https://collab.codes/libs/${json.libs}/mls.d.ts`;

        await downloadFile(urlMonaco, './monaco.d.ts');
        console.log('Get monaco definition');
        
        await downloadFile(urlMls, './mls.d.ts');
        console.log('Get lib definition');

    } catch (error:any) {
        throw new Error('Erro dowloads files:'+ error.message)
    }
}

