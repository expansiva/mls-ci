import { runDownload } from './download';
import { runPreCompile } from './preCompile';
import { runCompileTs } from './compileTs';
import { runCreateFileInfo } from './createFileInfo';
import { runCompact } from './compact';
import { runCreateTsconfig } from './createTsConfig';
import { runCompactSource } from './compactSource';
import { runCallWork } from './callWork';
import { runGetOrgName } from './getOrgName';

async function runCI() {

    try{

        const { COLLAB_PROJECT, COLLAB_REPO, COLLAB_OWNER, COLLAB_BRANCH, COLLAB_DRIVER } = process.env;
        let lastModify = '';
        let orgNameInCollab = '';

        console.log('----------Start getOrgName------------------');
        orgNameInCollab = await runGetOrgName();
        console.log('----------End getOrgName------------------');

        console.log('----------Start download------------------');
        await runDownload();
        console.log('----------End download------------------');

        console.log('----------Start createTsConfig------------------');
        await runCreateTsconfig();
        console.log('----------End createTsConfig------------------');

        console.log('----------Start preCompile------------------');
        await runPreCompile();
        console.log('----------End preCompile------------------');

        console.log('----------Start compileTs------------------');
        await runCompileTs();
        console.log('----------End compileTs------------------');

        console.log('----------Start compileTs Definition------------------');
        await runCompileTs(true);
        console.log('----------End compileTs Definition------------------');

        console.log('----------Start createFileInfo------------------');
        lastModify = await runCreateFileInfo() as string;
        console.log('----------End createFileInfo------------------');

        console.log('----------Start compact------------------');
        await runCompact();
        console.log('----------End compact------------------');

        console.log('----------Start compactSource------------------');
        await runCompactSource();
        console.log('----------End compactSource------------------');

        console.log('----------Start callWork------------------');
        await runCallWork(COLLAB_PROJECT as any, orgNameInCollab, COLLAB_DRIVER as string, lastModify);
        console.log('----------End callWork------------------');


    }catch(e:any){
        console.log(e.message);
    }
    

}

module.exports = {runCI};