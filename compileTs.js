const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const esbuild = require('esbuild');
const fsr = require('fs');
const { tmpdir } = require('os');


/* ============================
   CACHE DE ENHANCEMENTS
============================ */
const enhancementCache = new Map();


async function runCompileTs(project, isDefinition = false) {

    if(project == '100554' && !isDefinition) await moveMlsPackagesToProject();
    await runCompileTsAllFiles(isDefinition);
    if(project == '100554' && !isDefinition) await runBuildEnhancement(project);
}

async function runBuildEnhancement(project) {

    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'preBuild/');
    await processDirectory(project, srcDir);

}

async function processDirectory(project, dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await processDirectory(project, fullPath); // recursivo
        } else if (entry.isFile()) {
            await processFile(project, fullPath);
        }
    }
}

async function processFile(project, filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const tsSource = await fs.readFile(filePath.replace('preBuild', 'project').replace('.js', '.ts'), 'utf8');

        if (!content) return;

        const lines = content.split(/\r?\n/);
        const firstLine = lines[0]?.trim();

        if (!firstLine?.startsWith('/// <mls ') || filePath.includes('designSystem') || filePath.includes('enhancement')) {
            return; // não começa com a diretiva, ignora
        }

        // Extrai o atributo enhancement
        const enhancementMatch = firstLine.match(/enhancement="([^"]*)"/);

        if (!enhancementMatch) return;

        const enhancementValue = enhancementMatch[1];

        if (!enhancementValue || enhancementValue === '_blank') {
            return; // ignora se vazio ou _blank
        }

        const enhancementModule = await loadEnhancement(enhancementValue);
        const sourceLess = await getLessFile(filePath);
        const sourceTokens =  await getTokensFileDesignSystem(project);
        const newSource = enhancementModule.onAfterCompileAction ? await enhancementModule.onAfterCompileAction(content, tsSource, {sourceLess, sourceTokens}) : content;


        if (newSource && newSource !== content) {
            await fs.writeFile(filePath, newSource, 'utf8');
        }

    } catch (err) {
        console.error(`Erro ao processar ${filePath}:`, err);
    }
}

/* ============================
   GET DESIGN SYSTEM TOKENS
============================ */

const designSystemTokensCache = new Map();
async function getTokensFileDesignSystem(project) {

    // ✅ 1️⃣ Verifica cache primeiro
    if (designSystemTokensCache.has(project)) {
        return designSystemTokensCache.get(project);
    }

    const projectRoot = path.join(__dirname, '../..');
    const fileDsName = 'designSystem.js';

    const pathComponent = path.join(
        projectRoot,
        `preBuild/_${project}_/l2/${fileDsName}`
    );

    try {
        const tokens = (await requireFromMemory(pathComponent)).tokens;
        const stringified = JSON.stringify(tokens);

        // ✅ 2️⃣ Salva no cache
        designSystemTokensCache.set(project, stringified);

        return stringified;
    } catch (error) {

        // ✅ Cache também o fallback
        designSystemTokensCache.set(project, '[]');

        return '[]';
    }
}

async function requireFromMemory(filePath) {
    try {
        // Lê o conteúdo do arquivo
        const fileContent = await fsr.promises.readFile(filePath, 'utf-8');

        // Converte múltiplos "export const <name> =" para "exports.<name> ="
        const modifiedContent = fileContent.replace(/export\s+const\s+(\w+)\s*=/g, 'exports.$1 =');

        // Cria um arquivo temporário
        const tempFilePath = path.join(tmpdir(), `temp_module_${Date.now()}.js`);
        await fsr.promises.writeFile(tempFilePath, modifiedContent, 'utf-8');

        // Carrega o módulo usando require
        const requiredModule = require(tempFilePath);

        // Remove o arquivo temporário
        fsr.unlink(tempFilePath, (err) => {
            if (err) console.error('Erro ao remover o arquivo temporário:', err);
        });

        return requiredModule;
    } catch (error) {
        console.error('Erro ao processar o arquivo:', error);
    }
}

/* ============================
   GET LESS FILE
============================ */

async function getLessFile(filePath) {
    const projectRoot = path.join(__dirname, '../..');
    const fileName = path.basename(filePath);
    const lessName = fileName.replace(/\.(ts|js)$/, '.less');
    const pathComponent = path.join(projectRoot, 'l2', lessName);

    const fileExist = await directoryExists(pathComponent);
    console.log('Procurando arquivo LESS em' + fileExist, pathComponent);
    if (!fileExist) {
        return '';
    }

    const fileContent = await fs.readFile(pathComponent, 'utf8');
    return fileContent + '\n';
}

async function directoryExists(directoryPath) {
    try {
        return fsr.existsSync(directoryPath);
    } catch (error) {
        return false;
    }
}

/* ============================
   LOADER DO ENHANCEMENT
============================ */

async function loadEnhancement(enhancementName) {
    if (enhancementCache.has(enhancementName)) {
        return enhancementCache.get(enhancementName);
    }

    const projectRoot = path.resolve(__dirname, '../..');
    const infoFile = parseFilePath(enhancementName);
    let enhancementPath = '';


    await compileEnhancementProjectToDisk(path.join(projectRoot, 'project', infoFile.project, 'l2', infoFile.folder || '', infoFile.file + '.ts'));

    enhancementPath = path.join(
        projectRoot,
        'enhancementProjectCompiled',
        infoFile.project,
        'l2',
        infoFile.folder || '',
        infoFile.file + '.js'
    );


    //const mod = await require(enhancementPath);
    const { pathToFileURL } = require('url');
    const mod = await import(pathToFileURL(enhancementPath).href);
    enhancementCache.set(enhancementName, mod);
    return mod;
}

/* ============================
   PARSE PATH _100554_/foo/bar.ts
============================ */
function parseFilePath(fullPath) {
    const match = fullPath.match(/^(_\d+_)\/?(.*)/);
    if (!match) return { project: "", folder: "", file: fullPath };

    const project = match[1];
    const rest = match[2] || "";
    const parts = rest.split('/');
    const file = parts.pop() || "";
    const folder = parts.join('/');

    return { project, folder, file };
}

/* ============================
   COMPILA 1 ARQUIVO COM ESBUILD
============================ */

async function compileEnhancementProjectToDisk(tsFilePath) {

    const jsPath = resolveJsOutputPathEnhancementProject(tsFilePath);
    await fs.mkdir(path.dirname(jsPath), { recursive: true });

    await esbuild.build({
        entryPoints: [tsFilePath],
        outfile: jsPath,
        bundle: true,                // ✅ EMBUTE TUDO
        platform: 'node',
        format: 'esm',
        target: 'es2022',
        tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
        sourcemap: false,
        external: [],                // garante que nada fique de fora
        treeShaking: true,
        resolveExtensions: ['.ts', '.js'],
        logLevel: 'silent',
        legalComments: 'inline'
    });

    console.log(`🔥 Compilado (enhancement): ${path.basename(tsFilePath)} -> ${jsPath}`);
}

function resolveJsOutputPathEnhancementProject(tsPath) {
    const projectRoot = path.resolve(__dirname, '../..');

    const relative = path.relative(
        path.join(projectRoot, 'project'),
        tsPath
    );

    return path.join(
        projectRoot,
        'enhancementProjectCompiled',
        relative.replace(/\.ts$/, '.js')
    );
}


/* ============================
   MOVE FOLDER
============================ */

async function moveMlsPackagesToProject() {
    const projectRoot = path.resolve(__dirname, '../..');
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    const projectPath = path.join(projectRoot, 'project');

    console.log('🔎 Procurando pacotes mls-* em node_modules...');

    const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true });

    const mlsFolders = entries.filter(
        entry => entry.isDirectory() && entry.name.startsWith('mls-') && entry.name !== 'mls-ci'
    );

    if (!mlsFolders.length) {
        console.log('ℹ️ Nenhum pacote mls-* encontrado.');
        return;
    }

    for (const folder of mlsFolders) {
        const originalName = folder.name; // mls-102027
        const match = originalName.match(/^mls-(\d+)$/);

        if (!match) {
            console.log(`⚠️ Ignorando ${originalName} (formato inválido)`);
            continue;
        }

        const numericPart = match[1]; // 102027
        const newFolderName = `_${numericPart}_`;

        const sourcePath = path.join(nodeModulesPath, originalName);
        const destinationPath = path.join(projectPath, newFolderName);

        try {
            // Remove destino se já existir (para evitar erro)
            await fs.rm(destinationPath, { recursive: true, force: true });

            await fs.rename(sourcePath, destinationPath);

            console.log(`✅ ${originalName} → project/${newFolderName}`);
        } catch (err) {
            console.error(`❌ Erro ao mover ${originalName}:`, err.message);
        }
    }

    console.log('🚀 Movimento concluído!');
}


/* ============================
   COMPILE TYPESCRIPT
============================ */


async function runCompileTsAllFiles(isDefinition = false) { // runCompileTs
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
