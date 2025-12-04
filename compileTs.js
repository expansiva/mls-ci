const { exec } = require('child_process');
const fs = require('fs').promises;
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

async function fixFileDefinition() {
    // Expressão Regular para encontrar importações incorretas:
    // Padrão: from ' seguido por uma barra inicial (opcional) e .js' no final.
    // Captura os grupos:
    // $1: from '
    // $2: o caminho do módulo limpo
    // $3: ' (aspa final)
    const regex = /(from\s*['"])\/?(.*?)\.js(['"])/g;
    const projectRoot = path.resolve(__dirname, '../..');
    const filePath = path.join(projectRoot, 'preBuild/types/index.d.ts');


    try {


        console.log(`Lendo o arquivo: ${filePath}`);

        // 1. LER O CONTEÚDO DO ARQUIVO
        let content = await fs.readFile(filePath, 'utf8');

        // 2. APLICAR A SUBSTITUIÇÃO
        const fixedContent = content.replace(regex, '$1$2$3');

        // Verificar se houve alguma alteração antes de salvar
        if (content === fixedContent) {
            console.log(' Nenhuma correção necessária. O arquivo já está formatado corretamente.');
            return;
        }

        // 3. SALVAR O CONTEÚDO CORRIGIDO
        await fs.writeFile(filePath, fixedContent, 'utf8');

        console.log('✨ Arquivo corrigido e salvo com sucesso!');
        console.log(`Corrigido ${content.split('\n').length - fixedContent.split('\n').length} importações.`);

    } catch (error) {
        console.error(` Erro ao processar o arquivo ${filePath}:`, error.message);
        // Em um ambiente de produção, talvez seja melhor lançar o erro novamente: throw error;
    }
}


module.exports = { runCompileTs, fixFileDefinition }