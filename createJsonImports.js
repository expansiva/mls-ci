const fs = require('fs');
const path = require('path');
const ts = require('typescript');

async function getProjectName() {
    try {
        // Caminho para o arquivo package.json
        const packageJsonPath = './package.json'//path.resolve(__dirname, 'package.json');

        // Lê o conteúdo do arquivo package.json
        const data = await fs.promises.readFile(packageJsonPath, 'utf8');

        // Analisa o conteúdo JSON do package.json
        const packageJson = JSON.parse(data);

        // Retorna o nome do projeto
        return packageJson.name;
    } catch (error) {
        console.error('Erro ao ler o arquivo package.json:', error);
        throw error; // Lança o erro para ser tratado por quem chamou a função
    }
}

function extractImports(fileContent) {
    const sourceFile = ts.createSourceFile(
        'temp.ts', // Nome fictício, apenas para análise
        fileContent,
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TS
    );

    const imports = [];

    ts.forEachChild(sourceFile, node => {
        if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier.text;
            imports.push(moduleSpecifier);
        }
    });

    return imports;
}

async function runCreateJsonImports() {

    try {

        const prj = await getProjectName();
        const rootDir = process.cwd();
        const dirPath = path.join(rootDir, `project/_${prj}_/l2`);
        const files = await fs.promises.readdir(dirPath);
        const tsFiles = files.filter(file => file.endsWith('.ts'));

        const importsJson = {};

        for (const file of tsFiles) {
            const filePath = path.join(dirPath, file);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const imports = extractImports(fileContent);

            importsJson[file.replace('_'+prj+'_', '')] = imports;
        }

        const jsonPath = path.join(rootDir, 'preBuild/types/importsMap.json');
        await fs.promises.writeFile(jsonPath, JSON.stringify(importsJson, null, 2), 'utf8');

        console.log(`JSON criado com sucesso: ${jsonPath}`);


    } catch (error) {

        console.error(error);

    }
}

module.exports = { runCreateJsonImports }