import { Command } from 'commander';
import fs from 'node:fs/promises';
import { SignedAgentManifest, verifySignedAgentBinary } from '../../core/agent/signed-update';

/**
 * This CLI can VERIFY an artifact only. An isolated Windows SCM acceptance test
 * and separately approved trusted public key are required before live updates.
 */
export const update=new Command('update')
    .description('Inspect a signed update offline; installation remains disabled')
    .option('--verify-only <binary>','Verify a local binary without installing or changing services')
    .option('--manifest <file>','Local signed-update manifest JSON')
    .option('--trusted-key <file>','Operator-approved, independently provisioned Ed25519 PEM public key')
    .action(async(options:{
        verifyOnly?:string;manifest?:string;trustedKey?:string
    })=>{
        try {
            if(!options.verifyOnly){
                throw new Error('Live Windows update remains disabled pending SCM acceptance');
            }
            if(!options.manifest || !options.trustedKey) {
                throw new Error('--manifest and --trusted-key are required with --verify-only');
            }
            const [binaryFile,manifestFile,publicKeyFile]=await Promise.all([
                fs.stat(options.verifyOnly),fs.stat(options.manifest),fs.stat(options.trustedKey)
            ]);
            if(!binaryFile.isFile() || binaryFile.size<1 || binaryFile.size>250*1024*1024 ||
                !manifestFile.isFile() || manifestFile.size<2 || manifestFile.size>32*1024 ||
                !publicKeyFile.isFile() || publicKeyFile.size<30 || publicKeyFile.size>16*1024) {
                throw new Error('Invalid update verification inputs');
            }
            const [binary,manifestText,publicKey]=await Promise.all([
                fs.readFile(options.verifyOnly),fs.readFile(options.manifest,'utf8'),
                fs.readFile(options.trustedKey,'utf8')
            ]);
            const parsed=JSON.parse(manifestText) as SignedAgentManifest;
            verifySignedAgentBinary(binary,parsed,publicKey);
            console.log('Signature and checksum VALID (verification only; no service changes).');
            console.log('Trust requires independent approval of the supplied public key.');
        } catch(error) {
            console.error('Update verification refused:',
                error instanceof Error?error.message:'Unknown verification failure');
            process.exitCode=1;
        }
    });
