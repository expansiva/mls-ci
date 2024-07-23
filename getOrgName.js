const fs = require('fs').promises;
const path = require('path');

async function checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

async function runGetOrgName() {
  
    try {

    // Caminho do root do projeto
    const rootDir = process.cwd();

    // Caminho do project.json no root do projeto
    const configPath = path.join(rootDir, 'l5/project.json');

    if (!await checkFileExists(configPath)) {
        console.log(`File not found ${configPath}`);
        return '';
    } 
  
    // Ler o project.json
    const data = await fs.readFile(configPath, 'utf8');
    
    // Parse do JSON
    const info = JSON.parse(data);
    const ret = info.orgName ? info.orgName : ''
    
    console.log(`OrgName in project.json: ${ret}`);
    return ret;
    

  } catch (err) {
 
    throw new Error('Erro runGetOrgName :'+ err.message)

  }

}

module.exports = {runGetOrgName};