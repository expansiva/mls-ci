import fetch from 'node-fetch';

export async function runCallWork(project:number, orgName:string, driver:string, lastModify:string) {

    try {

        const collabToken = process.env.COLLAB_TOKEN; // secret configured in the gitHub or gitLab Actions secrets
        console.log('Secret:' + collabToken +' prj:'+project+' orgName:'+orgName +' lastModify:'+lastModify);
        if (!collabToken) return false;

        if(!project || !orgName || !lastModify){
            console.log('Undefined parameters in runCallWork');
            return false;
        }

        const BRAND = driver;//'GitHub';
        const response = await fetch('https://collab.codes/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "onProjectUpdated",
                project:+project,
                orgName,
                projectDriver: BRAND,
                lastModify, // ex: "2024-07-18T19:07:22.238Z"
                secret: collabToken,
            })
        });
        if (!response.ok){ 
            const msg = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, msg: ${msg}`);
        }
        console.log('Ok to call update work');
        return true;

    } catch (e:any) {
        console.log(e.message)
    }

}
