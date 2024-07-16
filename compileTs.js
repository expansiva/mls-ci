const { exec } = require('child_process');
const path = require('path');

async function runCompileTs(isDefinition = false) {
    return new Promise((resolve, reject) => {

        // Caminho para o arquivo de configuração tsconfig.json
        const tsConfigPath = isDefinition ? './tsconfig_d.json' : './tsconfig.json'; //path.resolve(__dirname, 'tsconfig.json');

        // Comando para executar o TypeScript Compiler (tsc)
        const command = `tsc -p ${tsConfigPath}`;

        // Executa o comando shell
        exec(command, (error, stdout, stderr) => {
            
            if (stderr) {
                console.error(`Saída de erro ao compilar TypeScript: ${stderr}`);
                reject(new Error(stderr));
                return;
            }
            console.log(`Compilação TypeScript bem-sucedida:\n${stdout}`);
            resolve(stdout);
        });
    });
}


module.exports = {runCompileTs}