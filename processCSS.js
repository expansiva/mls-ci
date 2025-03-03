const fs = require('fs');
const less = require('less');
const path = require('path');

const rootDir = process.cwd();
const MLS_GETDEFAULTDESIGNSYSTEM = '[[mls_getDefaultDesignSystem]]';

// Função para compilar e minificar o arquivo LESS e obter o conteúdo CSS
async function compileAndMinifyLess(lessContent) {
    try {

        const output = await less.render(lessContent, { compress: true });

        // Retorna o conteúdo CSS minificado
        return output.css;

    } catch (error) {
        console.error('Error compile LESS:', error);
        throw error;
    }
}


async function getPathDS() {
    try {

        // Caminho do root do projeto
        const rootDir = process.cwd();

        // Caminho do tsconfig.json no root do projeto
        const pathDS = path.join(rootDir, 'l3/ds');
        const dir = await getFirstSubdirectory(pathDS);
        const path2 = path.join(rootDir, 'l3/ds/' + dir);

        return { path: path2, name: dir };

    } catch (err) {

        console.log('Erro getPathDS :' + err.message)
        return undefined;

    }

}

async function getFirstSubdirectory(dirPath) {
    try {
        // Lê o conteúdo do diretório
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });

        // Filtra apenas os subdiretórios
        const subdirectories = files.filter(file => file.isDirectory()).map(dir => dir.name);

        // Retorna o nome do primeiro subdiretório
        if (subdirectories.length > 0) {
            return subdirectories[0];
        } else {
            throw new Error('No subdirectories found');
        }
    } catch (error) {
        console.error('Erro ao obter o primeiro subdiretório:', error);
        throw error;
    }
}


async function getDSJson(infoDS) {
    try {

        // Caminho do root do projeto

        const pathFile = infoDS.path + '/' + infoDS.name + '.json';
        const data = await fs.promises.readFile(pathFile, 'utf8');

        // Parse do JSON
        const jsonDS = JSON.parse(data);

        return jsonDS;

    } catch (err) {

        console.log('Erro getDSJson :' + err.message);
        return undefined;

    }

}

async function getLessGlobal(infoDS, name) {
    try {

        // Caminho do root do projeto

        const pathFile = infoDS.path + '/css/' + name + '.less';
        const data = await fs.promises.readFile(pathFile, 'utf8');

        return data;

    } catch (err) {

        throw new Error('Erro getLessGlobal :' + err.message)

    }

}

/*async function compileFiles(infoDS, globalcss, arrayTokens) {

    try {

        // Caminho do root do projeto

        const pathFiles = path.join(rootDir, 'preBuild/l2');
        const dir = await fs.promises.opendir(pathFiles);

        // Loop for await para iterar sobre todos os itens no diretório
        for await (const dirent of dir) {
            if (dirent.isFile()) {

                const filePath = path.join(pathFiles, dirent.name);
                let fileContent = await fs.promises.readFile(filePath, 'utf8');
                if (fileContent.indexOf(MLS_GETDEFAULTDESIGNSYSTEM) < 0) continue;
                const nameComponent = dirent.name.replace(/_/g, '-');
                const pathComponent = infoDS.path + '/components/' + nameComponent.replace('.js', '') + '/styles';
                const fileExist = await directoryExists(pathComponent);
                if(!fileExist) continue;
                const content = await getStylesComponents(pathComponent);
                const allLess = [globalcss, content].join('\n');
                const newLess = replaceTokens(allLess, arrayTokens);
                let retCSS = await compileAndMinifyLess(newLess);
                const tag = convertFileNameToTag(dirent.name.replace('.js', ''));
                retCSS = getCssWithoutTag(retCSS, tag);
                fileContent = fileContent.replace(MLS_GETDEFAULTDESIGNSYSTEM, retCSS);
                await fs.promises.writeFile(filePath, fileContent, 'utf8');

            }
        }

    } catch (err) {

        throw new Error('Erro compileFiles :' + err.message)

    }

}*/

async function compileFiles(infoDS, arrayTokens, project) {

    try {

        // Caminho do root do projeto

        const pathFiles = path.join(rootDir, 'preBuild/l2');
        const dir = await fs.promises.opendir(pathFiles);

        // Loop for await para iterar sobre todos os itens no diretório
        for await (const dirent of dir) {
            if (dirent.isFile()) {

                if(dirent.name.indexOf('_100554_processCssLit') >= 0) continue;

                const filePath = path.join(pathFiles, dirent.name);
                
                let fileContent = await fs.promises.readFile(filePath, 'utf8');
                const projectRoot = path.join(__dirname, '../..'); // Ajuste conforme necessário
                const nameComponent = dirent.name.replace('_'+project+'_', '');
                const pathComponent = projectRoot + '/l2/' + nameComponent.replace('.js', '.less');
                console.log(pathComponent);
                const fileExist = await directoryExists(pathComponent);
                if(!fileExist) continue;
                const content = await getStylesComponents(pathComponent);
                const allLess = content;
                const newLess = replaceTokens(allLess, arrayTokens);
                let retCSS = await compileAndMinifyLess(newLess);
   
                if (fileContent.indexOf(MLS_GETDEFAULTDESIGNSYSTEM) < 0){ 
                    fileContent = await addCssWithOutShadowRoot(fileContent, retCSS);
                }else{
                    const tag = convertFileNameToTag(dirent.name.replace('.js', ''));
                    retCSS = getCssWithoutTag(retCSS, tag);
                    fileContent = fileContent.replace(MLS_GETDEFAULTDESIGNSYSTEM, retCSS);
                }
                
                await fs.promises.writeFile(filePath, fileContent, 'utf8');

            }
        }

    } catch (err) {

        throw new Error('Erro compileFiles :' + err.message)

    }

}

async function addCssWithOutShadowRoot(code, css){

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

function getCssWithoutTag(css, tag) {
    const originalString = css;
    const regex = /(\w+-\d+)\.(\w+)\s+/;
    let modifiedString = originalString.replace(regex, ':host(.$2) ');
    const searchString = tag;
    const replacementString = '';
    modifiedString = modifiedString.replace(new RegExp(searchString, "g"), replacementString);
    modifiedString = replaceBackTicks(modifiedString);
    // modifiedString = decodeString(modifiedString)
    return modifiedString;
}

function replaceBackTicks(originalString) {
    const stringWithSingleQuotes = originalString.replace(/`/g, "'");
    return stringWithSingleQuotes;
}

function convertFileNameToTag(widget) {
    const regex = /_([0-9]+)_?(.*)/;
    const match = widget.match(regex);
    if (match) {
        const [, number, rest] = match;
        const convertedSrc = rest.replace(/([A-Z])/g, '-$1').toLowerCase();
        widget = `${convertedSrc}-${number}`;
    }

    if (widget.startsWith('-')) widget = widget.substring(1) // santiago
    return widget;
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

    let newLess = lessContent;

    const thema = tokens[0];

    const allTokens = { ...thema.color, ...thema.typography, ...thema.global };
    Object.keys(allTokens).forEach((key) => {

        const variableName5 = `@${key}, `;
        const escapedVariableName5 = getEscapedVariable(variableName5);
        const pattern5 = new RegExp(`${escapedVariableName5}\\s*([^;]+);`, 'g');
        const replacement5 = `var(--${key}, $1);`;
        newLess = newLess.replace(pattern5, replacement5);

        const variableName = `@${key};`;
        const escapedVariableName = getEscapedVariable(variableName);
        const pattern = new RegExp(escapedVariableName, 'g');
        const replacement = `var(--${key});`;
        newLess = newLess.replace(pattern, replacement);

        const variableName2 = `@${key},`;
        const escapedVariableName2 = getEscapedVariable(variableName2);
        const pattern2 = new RegExp(escapedVariableName2, 'g');
        const replacement2 = `var(--${key}),`;
        newLess = newLess.replace(pattern2, replacement2);

        const variableName3 = `(@${key}`;
        const escapedVariableName3 = getEscapedVariable(variableName3);
        const pattern3 = new RegExp(escapedVariableName3, 'g');
        const replacement3 = `(var(--${key})`;
        newLess = newLess.replace(pattern3, replacement3);

        const variableName4 = `@${key} `;
        const escapedVariableName4 = getEscapedVariable(variableName4);
        const pattern4 = new RegExp(escapedVariableName4, 'g');
        const replacement4 = `var(--${key}) `;
        newLess = newLess.replace(pattern4, replacement4);
    });

    return newLess;
}

function getEscapedVariable(variableName) {
    return variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runProcessCss(project) {

    try {

        /* const infoDS = await getPathDS();
        if(!infoDS) return;
        const dsJson = await getDSJson(infoDS);
        if(!dsJson) return;
        const tokens = dsJson.tokens.items ? dsJson.tokens.items : [];
        const styleGlobalName = dsJson.css.items.length > 0 ? dsJson.css.items[0].name : '';
        const lessGlobal = await getLessGlobal(infoDS, styleGlobalName);
        await compileFiles(infoDS, lessGlobal, tokens);*/

        const infoDS = await getPathDS();
        if (!infoDS) return;
        const dsJson = await getDSJson(infoDS);
        if (!dsJson) return;
        const tokens = dsJson.tokens.items ? dsJson.tokens.items : [];
        await compileFiles(infoDS, tokens, project);


    } catch (err) {

        throw new Error('Erro getArrayTokens :' + err.message)

    }
}

module.exports = { runProcessCss }
