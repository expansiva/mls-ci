const fs = require('fs').promises;
const path = require('path');

async function runCreateTsconfig() {
  try {

    // Caminho do root do projeto
    const rootDir = process.cwd();

    // Caminho do tsconfig.json no root do projeto
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    const tsconfigDPath = path.join(rootDir, 'tsconfig_d.json');
  
    // Ler o tsconfig.json
    const data = await fs.readFile(tsconfigPath, 'utf8');
    
    // Parse do JSON
    const tsconfig = JSON.parse(data);
    
    // Extrair os paths
    const paths = tsconfig.compilerOptions?.paths || {};
    
    // Criar o novo conteúdo do tsconfig_d.json
    const tsconfigD = {
            compilerOptions: {
            target: "es2022",
            module: "ES2022",
            esModuleInterop: true,
            outFile: "./preBuild/types/index.d.ts",
            rootDir: "./prel2",
            strict: false,
            removeComments: false,
            noUnusedParameters: false,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            sourceMap: false,
            experimentalDecorators: true,
            emitDecoratorMetadata: false,
            noImplicitAny: false,
            strictNullChecks: false,
            declaration: true,
            declarationMap: false,
            emitDeclarationOnly: true,
            paths: paths,
            noEmitOnError: false,
            lib: [
                "dom",
                "ES2022"
            ]
        },
        include: [
            "prel2/**/*",
            "monaco.d.ts",
            "mls.d.ts"
        ],
        exclude: [
            "node_modules",
            "**/*.spec.ts",
            "l2/*.ts"
        ]
    };
    
    // Escrever o tsconfig_d.json
    await fs.writeFile(tsconfigDPath, JSON.stringify(tsconfigD, null, 2), 'utf8');
    console.log('tsconfig_d.json criado com sucesso!');

  } catch (err) {
 
    throw new Error('Erro runCreateTsconfig :'+ err.message)

  }

}

module.exports = {runCreateTsconfig};
