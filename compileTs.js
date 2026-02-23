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

/* ============================
   LISTAR TODOS OS .ts
============================ */
async function findAllTsFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...await findAllTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            results.push(fullPath);
        }
    }

    return results;
}

/* ============================
   EXTRAI enhancement DA 1ª LINHA
============================ */
function extractEnhancementFromFirstLine(source) {
    const firstLine = source ? source.split('\n')[0] || '' : '';
    const match = firstLine.match(/enhancement\s*=\s*"([^"]+)"/);
    if (!match) return null;

    const value = match[1];
    if (!/_enhancement/i.test(value)) return null;
    return value;
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
   RESOLVE CAMINHO DO JS FINAL
============================ */
function resolveJsOutputPath(tsPath) {
    const projectRoot = path.resolve(__dirname, '../..');

    const relative = path.relative(
        path.join(projectRoot, 'project'),
        tsPath
    );

    return path.join(
        projectRoot,
        'preBuild',
        relative.replace(/\.ts$/, '.js')
    );
}

function resolveJsOutputPathOtherProject(tsPath) {
    const projectRoot = path.resolve(__dirname, '../..');

    const relative = path.relative(
        path.join(projectRoot, 'project'),
        tsPath
    );

    return path.join(
        projectRoot,
        'otherProjectCompiled',
        relative.replace(/\.ts$/, '.js')
    );
}

/* ============================
   COMPILA 1 ARQUIVO COM ESBUILD
============================ */
async function compileSingleFileToDisk(tsFilePath) {
    const jsPath = resolveJsOutputPath(tsFilePath);
    await fs.mkdir(path.dirname(jsPath), { recursive: true });

    await esbuild.build({
        entryPoints: [tsFilePath],
        outfile: jsPath,
        bundle: false,                 // mantém imports
        platform: 'node',
        format: 'esm',
        target: 'es2022',
        sourcemap: false,
        resolveExtensions: ['.ts', '.js'],
        tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
        legalComments: 'inline'


    });

    console.log(`✅ Compilado: ${path.basename(tsFilePath)} -> ${jsPath}`);
}

async function compileEnhancementToDisk(tsFilePath) {
    const jsPath = resolveJsOutputPath(tsFilePath);
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

async function compileEnhancementOtherProjectToDisk(tsFilePath) {
    const jsPath = resolveJsOutputPathOtherProject(tsFilePath);
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

/* ============================
   COMPILA TS TEMP (RETORNA JS)
============================ */

async function compileSingleFileToString(tsFilePath) {

    const tsSource = await fs.readFile(tsFilePath, 'utf8');
    const firstLine = tsSource.split('\n')[0];

    const result = await esbuild.build({
        entryPoints: [tsFilePath],
        bundle: false,
        write: false,
        platform: 'node',
        format: 'esm',
        target: 'es2022',
        resolveExtensions: ['.ts', '.js'],
        tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
    });

    let js = result.outputFiles[0].text;

    // 👇 Reinjeta se for diretiva mls
    if (firstLine.startsWith('/// <mls')) {
        js = firstLine + '\n' + js;
    }

    return js;
}

/* ============================
   LOADER DO ENHANCEMENT
============================ */
async function loadEnhancement(project, enhancementName) {
    if (enhancementCache.has(enhancementName)) {
        return enhancementCache.get(enhancementName);
    }

    const projectRoot = path.resolve(__dirname, '../..');
    const infoFile = parseFilePath(enhancementName);
    let enhancementPath = '';

    if (infoFile.project !== `_${project}_`) {
        await compileEnhancementOtherProjectToDisk(path.join(projectRoot, 'project', infoFile.project , 'l2', infoFile.folder || '', infoFile.file + '.ts'));

        enhancementPath = path.join(
            projectRoot,
            'otherProjectCompiled',
            infoFile.project,
            'l2',
            infoFile.folder || '',
            infoFile.file + '.js'
        );
    } else {

        enhancementPath = path.join(
            projectRoot,
            'preBuild',
            infoFile.project,
            'l2',
            infoFile.folder || '',
            infoFile.file + '.js'
        );
    }

    const mod = await require(enhancementPath);
    enhancementCache.set(enhancementName, mod);
    return mod;
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
   BUILDALL FINAL
============================ */
async function runBuildAll(project) {
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'project/_' + project + '_/');

    await moveMlsPackagesToProject();

    const allTsFiles = await findAllTsFiles(srcDir);

    const enhancementFiles = allTsFiles.filter(f =>
        path.basename(f).includes('enhancement') && !f.endsWith('.defs.ts') && !f.endsWith('.test.ts')
    );

    const normalFiles = [];
    allTsFiles.forEach(element => {
        if (!path.basename(element).includes('enhancement')) {
            normalFiles.push(element);
        } else if (path.basename(element).includes('enhancement') && (element.endsWith('.defs.ts') || element.endsWith('.test.ts'))) {
            normalFiles.push(element);
        }
    });


    if (enhancementFiles.length) {
        await compileOnlyEnhancement(enhancementFiles);
    }

    await compileOnlyNormalFiles(normalFiles, project);
    console.log('🎉 Build completo com sucesso!');
}

async function compileOnlyEnhancement(enhancementFiles) {
    console.log(`⚙️ Compilando ${enhancementFiles.length} enhancements...`);

    for (const filePath of enhancementFiles) {
        await compileEnhancementToDisk(filePath);
    }
}


async function compileOnlyNormalFiles(normalFiles, project) {

    // 1️⃣ Separa designSystem dos demais
    const designSystemFiles = normalFiles.filter(f =>
        path.basename(f).toLowerCase().includes('designsystem')
    );

    const otherFiles = normalFiles.filter(f =>
        !path.basename(f).toLowerCase().includes('designsystem')
    );

    // 2️⃣ Compila designSystem primeiro
    for (const filePath of designSystemFiles) {
        await compileNormalFile(filePath, project);
    }

    // 3️⃣ Depois compila o resto
    for (const filePath of otherFiles) {
        await compileNormalFile(filePath, project);
    }
}

async function compileNormalFile(filePath, project) {


    let tsSource = await fs.readFile(filePath, 'utf8');
    const enhancementName = extractEnhancementFromFirstLine(tsSource);

    if (!enhancementName) {
        await compileSingleFileToDisk(filePath);
        return;
    }

    let finalJs;
    let jsOutput = '';

    console.log(`✨ Compilando ${path.basename(filePath)} com enhancement ${enhancementName}...`);
    const enhancement = await loadEnhancement(project, enhancementName);

    jsOutput = await compileSingleFileToString(filePath);
    const sourceLess = await getLessFile(filePath);
    const sourceTokens = filePath.includes('designSystem') ? '[]' : await getTokensFileDesignSystem(project);
    finalJs = enhancement.onAfterCompileAction ? await enhancement.onAfterCompileAction(jsOutput, tsSource, {sourceLess, sourceTokens}) : jsOutput;

    const jsPath = resolveJsOutputPath(filePath);
    await fs.mkdir(path.dirname(jsPath), { recursive: true });
    await fs.writeFile(jsPath, finalJs, 'utf8');

}

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

async function directoryExists(directoryPath) {
    try {
        return fsr.existsSync(directoryPath);
    } catch (error) {
        return false;
    }
}

/* ============================
   Definition de runCompileTs
============================ */

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


module.exports = { runCompileTs, fixFileDefinition, runBuildAll }
