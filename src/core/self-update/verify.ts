import crypto from 'node:crypto';
import fs from 'node:fs';
import axios from 'axios';
import { getReleaseAsset } from '../../services/github/assets';

export function assertExpectedSha256(bytes:Buffer, expectedValue:unknown):void{
    if(typeof expectedValue!=='string' || !/^[a-f0-9]{64}$/i.test(expectedValue.trim())){
        throw new Error('Missing or invalid signed release checksum metadata');
    }
    const digest=crypto.createHash('sha256').update(bytes).digest();
    const expected=Buffer.from(expectedValue.trim(),'hex');
    if(expected.length!==digest.length || !crypto.timingSafeEqual(expected,digest)){
        throw new Error('Downloaded update checksum mismatch');
    }
}

/** A checksum is necessary but not sufficient; signature verification remains a release gate. */
export async function verifyBinary(filePath:string,version:string):Promise<void>{
    const url=await getReleaseAsset(version,'checksum');
    if(!url) throw new Error('Missing checksum asset: update rejected');
    if(!url.startsWith('https://')) throw new Error('Checksum source must use HTTPS');
    const response=await axios.get<string>(url,{timeout:10_000,responseType:'text'});
    const bytes=fs.readFileSync(filePath);
    assertExpectedSha256(bytes,response.data);
}
