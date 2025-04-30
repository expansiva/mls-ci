const fs = require('fs');
const less = require('less');
const path = require('path');
const { tmpdir } = require('os');

const rootDir = process.cwd();

async function compileAndMinifyLess(lessContent) {
    try {

        const output = await less.render(lessContent, { compress: true });
        return output.css;

    } catch (error) {
        console.error('Error compile LESS:', error);
        throw error;
    }
}


async function requireFromMemory(filePath) {
    try {
        // Lê o conteúdo do arquivo
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');

        // Converte múltiplos "export const <name> =" para "exports.<name> ="
        const modifiedContent = fileContent.replace(/export\s+const\s+(\w+)\s*=/g, 'exports.$1 =');

        // Cria um arquivo temporário
        const tempFilePath = path.join(tmpdir(), `temp_module_${Date.now()}.js`);
        await fs.promises.writeFile(tempFilePath, modifiedContent, 'utf-8');

        // Carrega o módulo usando require
        const requiredModule = require(tempFilePath);

        // Remove o arquivo temporário
        fs.unlink(tempFilePath, (err) => {
            if (err) console.error('Erro ao remover o arquivo temporário:', err);
        });

        return requiredModule;
    } catch (error) {
        console.error('Erro ao processar o arquivo:', error);
    }
}

async function getTokensFileDesignSystem(project) {

    const projectRoot = path.join(__dirname, '../..');
    const fileDsName = 'designSystem.js';
    const pathComponent = path.join(projectRoot, `/preBuild/l2/_${project}_${fileDsName}`);

    try {
        const tokens = (await requireFromMemory(pathComponent)).tokens;
        return tokens;
    } catch (error) {
        return [];
    }

}


async function compileFiles(arrayTokens, project) {

    try {

        const pathFiles = path.join(rootDir, 'preBuild/l2');
        const dir = await fs.promises.opendir(pathFiles);

        for await (const dirent of dir) {
            if (dirent.isFile()) {

                if (dirent.name.indexOf('_100554_processCssLit') >= 0) continue;

                const filePath = path.join(pathFiles, dirent.name);

                let fileContent = await fs.promises.readFile(filePath, 'utf8');
                const projectRoot = path.join(__dirname, '../..');
                const nameComponent = dirent.name.replace('_' + project + '_', '');
                const pathComponent = projectRoot + '/l2/' + nameComponent.replace('.js', '.less');
                console.log(pathComponent);

                const fileExist = await directoryExists(pathComponent);
                if (!fileExist) continue;
                const content = await getStylesComponents(pathComponent);
                const allLess = removeTokensFromSource(content);
                const newLess = replaceTokens(allLess, arrayTokens);
                const tokensLess = await getTokensLess(arrayTokens);
                const joinLess = newLess + '\n\n' + tokensLess;
                let retCSS = await compileAndMinifyLess(joinLess);
                fileContent = await addCssWithOutShadowRoot(fileContent, retCSS);
                await fs.promises.writeFile(filePath, fileContent, 'utf8');

            }
        }

    } catch (err) {

        throw new Error('Erro compileFiles :' + err.message)

    }

}

function removeTokensFromSource(src) {
    const regex = /\/\/Start Less Tokens[\s\S]*?\/\/End Less Tokens/g;
    return src.replace(regex, '');
}

async function getTokensLess(tokens) {
    // {"primary-color": '#red'}  => "@primary-color: red;"

    if (tokens.length === 0) return '';

    const tokenByTheme = tokens[0];

    if (!tokenByTheme) throw new Error(`no find tokens default`);
    let tokensLess = '';

    tokensLess += Object.keys(tokenByTheme.color).map((key) => {
        let token = '';
        if (!key.startsWith('_dark-')) token = `@${key}: ${tokenByTheme.color[key]};`
        return token;
    }).filter((item) => !!item).join('\n')
    tokensLess += '\n' + Object.keys(tokenByTheme.typography).map((key) => `@${key}: ${tokenByTheme.typography[key]};`).join('\n');
    tokensLess += '\n' + Object.keys(tokenByTheme.global).map((key) => `@${key}: ${tokenByTheme.global[key]};`).join('\n');
    return tokensLess;
}

async function addCssWithOutShadowRoot(code, css) {

    try {

        const lineToAdd = `if(this.loadStyle) this.loadStyle(\`${css}\`);`
        const lines = code.split('\n');
        let insideClass = false;
        let constructorIndex = -1;
        let superIndex = -1;
        let lineAlreadyExists = false;

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();

            if (trimmedLine.includes('class ') && trimmedLine.includes(' extends ')) {
                insideClass = true;
            }

            if (insideClass && trimmedLine.startsWith('constructor(')) {
                constructorIndex = i;

                for (let j = constructorIndex + 1; j < lines.length; j++) {
                    if (lines[j].trim().startsWith('super(')) {
                        superIndex = j;

                        if (lines[j + 1] && lines[j + 1].trim() === lineToAdd.trim()) {
                            lineAlreadyExists = true;
                        }
                        break;
                    }
                }

                break;
            }

        }

        if (constructorIndex !== -1) {
            if (!lineAlreadyExists) {
                lines.splice(superIndex + 1, 0, `        ${lineToAdd}`);
            }
        } else {
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().includes('class ') && lines[i].includes(' extends ')) {
                    lines.splice(i + 1, 0, `    constructor() {`, `        super();`, `        ${lineToAdd}`, `    }`);
                    break;
                }
            }
        }

        return lines.join('\n');

    } catch (err) {

        throw new Error('Erro addCssWithOutShadowRoot :' + err.message)

    }

}

async function directoryExists(directoryPath) {
    try {
        await fs.promises.access(directoryPath, fs.constants.F_OK);
        return true;
    } catch (error) {
        return false;
    }
}

async function getStylesComponents(pathFile) {

    try {
        let content = '';
        const fileContent = await fs.promises.readFile(pathFile, 'utf8');
        content += fileContent + '\n';
        return content
    } catch (err) {
        throw new Error('Erro getStylesComponents :' + err.message)
    }

}

function replaceTokens(lessContent, tokens) {
    
    const lessTokens = new Set(Object.keys(tokens));

    return lessContent.replace(/@([a-zA-Z0-9-_]+)/g, (match, token, offset, fullText) => {
        if (!lessTokens.has(token)) {
            return match;
        }

        const beforeText = fullText.slice(0, offset);
        const insideMediaQuery = /@media\s*\([^{}]*$/.test(beforeText);

        const lessFunctions = [
            "lighten", "darken", "saturate", "desaturate", "fadein", "fadeout", "fade",
            "spin", "mix", "tint", "shade", "contrast", "ceil", "floor", "round", "abs",
            "sqrt", "pow", "mod", "min", "max", "escape", "e", "unit", "convert",
            "extract", "length"
        ];

        const insideLessFunction = new RegExp(`(${lessFunctions.join("|")})\\s*\\([^()]*$`, "i").test(beforeText);

        if (insideMediaQuery || insideLessFunction) {
            return match;
        }

        return `var(--${token})`;
    });
}

async function runProcessCss(project) {

    try {
        
        const tokens = await getTokensFileDesignSystem(project)
        await compileFiles(tokens, project);

    } catch (err) {

        throw new Error('Erro getArrayTokens :' + err.message)

    }
}

module.exports = { runProcessCss }
