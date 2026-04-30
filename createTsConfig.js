const fs = require('fs').promises;
const path = require('path');


async function runCreateTsconfig(project) {
  try {

    // Caminho do root do projeto
    const rootDir = process.cwd();

    // Caminho do tsconfig.json no root do projeto
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    const tsconfigDPath = path.join(rootDir, 'tsconfig_d.json');
    const tsconfigProjectPath = path.join(rootDir, 'tsconfig_p.json');

    // Ler o tsconfig.json
    const data = await fs.readFile(tsconfigPath, 'utf8');

    // Parse do JSON
    const tsconfig = JSON.parse(data);

    // Extrair os paths
    const paths = normalizePaths(tsconfig.compilerOptions?.paths || {});

    // Criar o novo conteúdo do tsconfig_d.json
    const tsconfigD = {
      compilerOptions: {
        target: "es2020",
        module: "ES2020",
        esModuleInterop: true,
        outFile: "./preBuild/types/index.d.ts",
        rootDir: "./project",
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
        "project/_" + project + "_/**/*",
        "monaco.d.ts",
        "mls.d.ts"
      ],
      exclude: [
        "node_modules",
        "**/*.spec.ts",
        "l2/*.ts"
      ]
    };

    const tsconfigProject = {
      "compilerOptions": {
        "target": "es2020",
        "module": "ES2020",
        "esModuleInterop": true,
        "outDir": "./preBuild/_" + project + "_/",
        "rootDir": "./project/_" + project + "_",
        "strict": true,
        "removeComments": false,
        "noUnusedParameters": false,
        "skipLibCheck": false,
        "forceConsistentCasingInFileNames": true,
        "sourceMap": false,
        "declaration": false,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": false,
        "noImplicitAny": false,
        "strictNullChecks": false,
        "paths": paths,
        "lib": [
          "dom",
          "ES2022"
        ]
      },
      "include": [
        "project/_" + project + "_/**/*",
        "monaco.d.ts",
        "mls.d.ts"
      ],
      "exclude": [
        "node_modules",
        "**/*.spec.ts",
        "l2/*.ts"
      ]
    }

    // Escrever o tsconfig_d.json
    await fs.writeFile(tsconfigDPath, JSON.stringify(tsconfigD, null, 2), 'utf8');
    console.log('tsconfig_d.json criado com sucesso!');

    await fs.writeFile(tsconfigProjectPath, JSON.stringify(tsconfigProject, null, 2), 'utf8');
    console.log('tsconfig_p.json criado com sucesso!');

  } catch (err) {

    throw new Error('Erro runCreateTsconfig :' + err.message)

  }

}

function normalizePaths(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (key.startsWith('/_')) {
        // pega só "_102027_" sem as barras
        const name = key.replace(/^\/|\/\*$/g, ''); // "_102027_"
        return [key, [`./project/${name}/*`]];
      }
      return [key, value];
    })
  );
}


module.exports = { runCreateTsconfig };
