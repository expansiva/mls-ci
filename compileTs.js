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
            /*if (error) {
                console.error(`Erro ao compilar TypeScript: ${error}`);
                reject(error);
                return;
            }*/
            if (stderr) {
                console.error(`Saída de erro ao compilar TypeScript: ${stderr}`);
                reject(new Error(stderr));
                return;
            }
            console.log(`Compilação TypeScript bem-sucedida:\n${stdout}`);
            resolve(stdout);
        });
    });

    /*return new Promise((resolve, reject) => {
        // Caminho para o arquivo de configuração tsconfig.json
        const tsConfigPath = isDefinition ? './tsconfig_d.json' : './tsconfig.json'; //path.resolve(__dirname, 'tsconfig.json');

        // Comando para executar o TypeScript Compiler (tsc)
        const command = `tsc -p ${tsConfigPath}`;

        // Array para armazenar os arquivos compilados
        let compiledFiles = [];

        // Executa o comando shell
        const childProcess = exec(command);

        // Captura a saída padrão (stdout) do processo
        childProcess.stdout.on('data', (data) => {
            // Verifica se a linha contém um arquivo compilado
            const match = data.match(/^(.+)\.tsx?/);
            if (match) {
                compiledFiles.push(match[1]);
            }
            // Log padrão do TypeScript
            console.log(data);
        });

        // Captura erros de execução
        childProcess.on('error', (error) => {
            console.error(`Erro ao executar comando: ${error}`);
            reject(error);
        });

        // Ao finalizar a execução do comando
        childProcess.on('exit', (code, signal) => {
            if (code === 0) {
                console.log('Compilação TypeScript concluída com sucesso!');
                console.log('Arquivos compilados:');
                console.log(compiledFiles);
                resolve();
            } else {
                console.error(`Processo de compilação terminou com código ${code} e sinal ${signal}`);
                reject(new Error(`Processo de compilação terminou com código ${code} e sinal ${signal}`));
            }
        });
    });*/
}


module.exports = {runCompileTs}