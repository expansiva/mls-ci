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

        throw new Error('Erro getPathDS :' + err.message)

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

        throw new Error('Erro getDSJson :' + err.message)

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

async function compileFiles(infoDS, globalcss, arrayTokens) {

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
        const dir = await fs.promises.opendir(pathFile);
        // Loop for await para iterar sobre todos os itens no diretório
        for await (const dirent of dir) {
            if (dirent.isFile()) {

                const filePath = path.join(pathFile, dirent.name);
                const fileContent = await fs.promises.readFile(filePath, 'utf8');
                content += fileContent + '\n';
            }
        }

        return content

    } catch (err) {

        throw new Error('Erro getStylesComponents :' + err.message)

    }

}

function replaceTokens(lessContent, tokens) {

    let newLess = lessContent;

    tokens.forEach((token) => {

        const variableName = `@${token.key};`;
        const escapedVariableName = getEscapedVariable(variableName);
        const pattern = new RegExp(escapedVariableName, 'g');
        const replacement = `var(--${token.key});`;
        newLess = newLess.replace(pattern, replacement);

        const variableName2 = `@${token.key},`;
        const escapedVariableName2 = getEscapedVariable(variableName2);
        const pattern2 = new RegExp(escapedVariableName2, 'g');
        const replacement2 = `var(--${token.key}),`;
        newLess = newLess.replace(pattern2, replacement2);

        const variableName3 = `(@${token.key}`;
        const escapedVariableName3 = getEscapedVariable(variableName3);
        const pattern3 = new RegExp(escapedVariableName3, 'g');
        const replacement3 = `(var(--${token.key})`;
        newLess = newLess.replace(pattern3, replacement3);

        const variableName4 = `@${token.key} `;
        const escapedVariableName4 = getEscapedVariable(variableName4);
        const pattern4 = new RegExp(escapedVariableName4, 'g');
        const replacement4 = `var(--${token.key}) `;
        newLess = newLess.replace(pattern4, replacement4);
    });

    return newLess;
}

function getEscapedVariable(variableName) {
    return variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runProcessCss() {

    try {

        const infoDS = await getPathDS();
        const dsJson = await getDSJson(infoDS);
        const tokens = dsJson.tokens.items ? dsJson.tokens.items : [];
        const styleGlobalName = dsJson.css.items.length > 0 ? dsJson.css.items[0].name : '';
        const lessGlobal = await getLessGlobal(infoDS, styleGlobalName);
        await compileFiles(infoDS, lessGlobal, tokens);


    } catch (err) {

        throw new Error('Erro getArrayTokens :' + err.message)

    }
}

module.exports = { runProcessCss }